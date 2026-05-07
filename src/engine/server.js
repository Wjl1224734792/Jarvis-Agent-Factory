import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { openDb, getPipeline, initPipeline, getCheckpoints, addCheckpoint, updatePipelineGate, getSessions, getSession, addSession, heartbeatSession, removeSession, cleanupStaleSessions, getAllPipelines, getAgentConfig, setAgentModel } from './db.js';
import { GATES, GATE_CHECKS, GATE_DIRS, AGENT_LIST, findGateArtifacts, formatGateDisplay } from './gates.js';
import { setupWebRoutes } from '../web/routes.js';

const PID_FILE = resolve(homedir(), '.jarvis', 'engine.pid');
const DEFAULT_PORT = 3456;
const SESSION_TIMEOUT = 120_000;

export async function startEngine({ port = DEFAULT_PORT, dashboard = false, projectRoot = '.' } = {}) {
  const root = resolve(projectRoot);
  const pidDir = resolve(homedir(), '.jarvis');
  if (!existsSync(pidDir)) mkdirSync(pidDir, { recursive: true });
  writeFileSync(PID_FILE, String(process.pid));

  const app = express();
  app.use(express.json());

  const server = new McpServer({ name: 'jarvis-engine', version: readPkgVersion() });
  const db = openDb(root);

  // 心跳保活
  setInterval(() => { cleanupStaleSessions(db, SESSION_TIMEOUT); }, 30_000);

  // ---- MCP Tools ----
  server.tool('session_join', '注册会话。每个会话独立流水线状态。', { platform: z.enum(['claude','opencode','codex','other']).optional() },
    async ({ platform }, extra) => {
      const sid = extra?.sessionId || `s${Date.now()}`;
      const existing = getSession(db, sid);
      if (existing) {
        heartbeatSession(db, sid);
        const p = getPipeline(db, sid);
        return resp({ session_id: sid, platform: existing.platform, gate: p?.current_gate || 'Gate A', project: p?.project || root });
      }
      addSession(db, sid, platform || 'unknown', 'member');
      // 为新 session 自动初始化独立 pipeline
      initPipeline(db, sid, root);
      return resp({ session_id: sid, platform: platform || 'unknown', gate: 'Gate A', project: root, message: '🆕 新会话已初始化，独立流水线已就绪。' });
    });
  server.tool('session_heartbeat', '心跳保活。', {}, async (_args, extra) => {
    const sid = extra?.sessionId;
    if (!sid || !getSession(db, sid)) return resp({ error: 'Session not found.' });
    heartbeatSession(db, sid); return resp({ ok: true });
  });
  server.tool('session_list', '列出所有活跃会话。', {}, async () => {
    cleanupStaleSessions(db, SESSION_TIMEOUT);
    const sessions = getSessions(db).map(s => {
      const p = getPipeline(db, s.id);
      return { id: s.id, platform: s.platform, role: s.role, gate: p?.current_gate || '?', heartbeat: s.last_heartbeat };
    });
    return resp({ sessions, count: sessions.length });
  });
  server.tool('session_leave', '离开会话。', {}, async (_args, extra) => {
    const sid = extra?.sessionId;
    if (!sid || !getSession(db, sid)) return resp({ ok: true });
    removeSession(db, sid);
    return resp({ ok: true, message: 'Session removed.' });
  });

  server.tool('pipeline_init', '【会话隔离】初始化当前会话流水线。', { project_name: z.string().optional() },
    async ({ project_name }, extra) => {
      const sid = extra?.sessionId || 'legacy';
      initPipeline(db, sid, project_name || root);
      return resp({ ok: true, session_id: sid, message: 'Pipeline initialized. Next: Gate A', state: getPipeline(db, sid) });
    });
  server.tool('pipeline_status', '【会话隔离】当前会话流水线状态。', {},
    async (_args, extra) => {
      const sid = extra?.sessionId || 'legacy';
      const p = getPipeline(db, sid);
      const docs = join(root, 'docs');
      const gates = GATES.map(g => {
        const cp = getCheckpoints(db, g, sid);
        return { gate: g, passed: cp.length > 0, checkpoints: cp, artifacts: findGateArtifacts(docs, g), requirement: GATE_CHECKS[g]?.check || '' };
      });
      const current = gates.find(g => !g.passed)?.gate || 'Complete';
      return resp({
        session_id: sid, project: root, current_gate: current,
        completed: gates.filter(g => g.passed).map(g => g.gate), gates,
        all_sessions: getSessions(db).map(s => ({ id: s.id, gate: getPipeline(db, s.id)?.current_gate || '?' })),
        _display: formatGateDisplay(gates, current)
      });
    });
  server.tool('gate_enforce', '【会话隔离·硬约束】验证Gate条件。', { gate: z.enum(GATES).optional() },
    async ({ gate }, extra) => {
      const sid = extra?.sessionId || 'legacy';
      const target = gate || getPipeline(db, sid)?.current_gate || 'Gate A';
      const artifacts = findGateArtifacts(join(root, 'docs'), target);
      const checkpoints = getCheckpoints(db, target, sid);
      const allowed = artifacts.length > 0 || checkpoints.length > 0;
      return resp(allowed
        ? { gate: target, allowed: true, session_id: sid, message: `✅ ${target} — proceed.` }
        : { gate: target, allowed: false, session_id: sid, blocked_reasons: [artifacts.length ? '' : `No artifacts in docs/${GATE_DIRS[target]}/`].filter(Boolean), action_required: GATE_CHECKS[target]?.check || '' });
    });
  server.tool('advance_gate', '【会话隔离·硬约束】推进Gate。', { gate: z.enum(GATES) },
    async ({ gate }, extra) => {
      const sid = extra?.sessionId || 'legacy';
      const p = getPipeline(db, sid);
      const cur = p?.current_gate || 'Gate A';
      const ci = GATES.indexOf(cur), ti = GATES.indexOf(gate);
      if (ti <= ci) return resp({ allowed: false, error: `FSM blocked: Cannot move backward. Current: ${cur}` });
      if (ti > ci + 1) return resp({ allowed: false, error: `FSM blocked: Cannot skip gates. Next: ${GATES[ci + 1]}` });
      const artifacts = findGateArtifacts(join(root, 'docs'), cur);
      const cps = getCheckpoints(db, cur, sid);
      if (artifacts.length === 0 && cps.length === 0) return resp({ allowed: false, error: `${cur} conditions NOT met.` });
      addCheckpoint(db, cur, gate, sid);
      updatePipelineGate(db, sid, gate);
      return resp({ allowed: true, session_id: sid, previous_gate: cur, current_gate: gate, next: GATES[ti + 1] || 'Complete', message: GATES[ti + 1] ? `Next: ${GATES[ti + 1]}` : '🎉 Complete!' });
    });
  server.tool('report_status', '【会话隔离】流水线完整报告。', {},
    async (_args, extra) => {
      const sid = extra?.sessionId || 'legacy';
      const gates = GATES.map(g => ({ gate: g, passed: getCheckpoints(db, g, sid).length > 0, artifacts: findGateArtifacts(join(root, 'docs'), g) }));
      const completed = gates.filter(g => g.passed).length;
      return resp({ session_id: sid, project: root, progress: `${completed}/${GATES.length}`, current: gates.find(g => !g.passed)?.gate || 'Complete' });
    });
  const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
  server.tool('agent_config', 'Agent模型+思考等级配置。', { agent_id: z.string().optional(), model: z.string().optional(), effort: z.string().optional() },
    async ({ agent_id, model, effort }) => {
      if (agent_id && model) {
        setAgentModel(db, agent_id, model, effort || 'high');
        return resp({ ok: true, agent_id, model, effort: effort || 'high' });
      }
      const cfg = getAgentConfig(db);
      return resp({ agents: AGENT_LIST.map(a => {
        const c = cfg[a.id];
        return { id: a.id, name: a.name, role: a.role, platform: a.platform, model: c?.model || a.defaultModel, effort: c?.effort || a.defaultEffort || 'high', is_custom: !!c };
      }), available_models: [...new Set(AGENT_LIST.map(a=>a.defaultModel).filter(Boolean))], available_efforts: EFFORTS });
    });

  // ---- Transport + Web ----
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
  // SSE 握手：兼容 Claude Code (type=http) 和 OpenCode (type=remote) 两种客户端
  // StreamableHTTPServerTransport 通过 handleRequest 内部判断 GET/POST 自动处理 SSE 升级
  app.get('/mcp/sse', async (req, res) => { await transport.handleRequest(req, res, undefined); });
  app.get('/mcp', async (req, res) => { await transport.handleRequest(req, res, undefined); });
  app.post('/mcp', async (req, res) => { try { await transport.handleRequest(req, res, req.body); } catch (e) { res.status(500).json({ error: e.message }); } });
  // 额外 SSE 端点（部分客户端直接在 URL 上发起 GET）
  app.delete('/mcp', async (req, res) => { try { await transport.handleRequest(req, res, req.body); } catch (e) { res.status(500).json({ error: e.message }); } });
  await server.connect(transport);

  setupWebRoutes(app, db, root, dashboard);

  app.listen(port, () => {
    console.log(`🧠 Jarvis Engine v${readPkgVersion()} — http://localhost:${port}`);
    if (dashboard) console.log(`   Web: http://localhost:${port}/dashboard`);
    console.log(`   API: http://localhost:${port}/api/pipeline`);
    console.log(`   MCP: http://localhost:${port}/mcp`);
    console.log(`   会话隔离模式 — 每窗口独立流水线`);
  });
}

function resp(obj) { return { content: [{ type: 'text', text: JSON.stringify(obj) }] }; }

export function stopEngine() {
  if (!existsSync(PID_FILE)) { console.log('No running engine found.'); return; }
  const pid = readFileSync(PID_FILE, 'utf-8').trim();
  try { process.kill(Number(pid), 'SIGTERM'); try { require('node:fs').unlinkSync(PID_FILE); } catch {}; console.log(`Engine stopped (PID ${pid}).`); }
  catch { console.log(`Engine not running (stale PID ${pid}).`); try { require('node:fs').unlinkSync(PID_FILE); } catch {} }
}

export function engineStatus() {
  if (!existsSync(PID_FILE)) { console.log('Engine: not running'); return false; }
  const pid = readFileSync(PID_FILE, 'utf-8').trim();
  try { process.kill(Number(pid), 0); console.log(`Engine: running (PID ${pid})`); return true; }
  catch { console.log(`Engine: not running (stale PID ${pid})`); try { require('node:fs').unlinkSync(PID_FILE); } catch {}; return false; }
}

function readPkgVersion() { try { return JSON.parse(readFileSync(resolve(import.meta.dirname, '..', '..', 'package.json'), 'utf-8')).version; } catch { return '?.?.?'; } }
