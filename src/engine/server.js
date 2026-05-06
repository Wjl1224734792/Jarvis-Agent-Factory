import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { openDb, getPipeline, initPipeline as dbInitPipeline, getCheckpoints, addCheckpoint, updatePipelineGate, getSessions, getSession, addSession, heartbeatSession, removeSession, updateSessionRole, cleanupStaleSessions, getOldestSession, getLeader, getAgentConfig, setAgentModel } from './db.js';
import { GATES, GATE_CHECKS, GATE_DIRS, AGENT_LIST, AVAILABLE_MODELS, findGateArtifacts, formatGateDisplay } from './gates.js';
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

  // ---- Session helpers ----
  function requireLeader(sid) {
    cleanupStaleSessions(db, SESSION_TIMEOUT);
    const s = getSession(db, sid);
    if (!s) return { error: 'Session not registered.' };
    if (s.role !== 'leader') return { error: `Write lock held by ${getLeader(db)?.id || '?'}. You are observer.` };
    return null;
  }
  function electLeader() {
    const l = getLeader(db); if (l) return l.id;
    const o = getOldestSession(db); if (o) { updateSessionRole(db, o.id, 'leader'); return o.id; }
    return null;
  }
  setInterval(() => { if (cleanupStaleSessions(db, SESSION_TIMEOUT).length) electLeader(); }, 30_000);

  // ---- MCP Tools ----
  server.tool('session_join', '注册会话。第一个=leader，后续=observer。', { platform: z.enum(['claude','opencode','codex','other']).optional() },
    async ({ platform }, extra) => {
      const sid = extra?.sessionId || `s${Date.now()}`;
      const existing = getSession(db, sid);
      if (existing) { heartbeatSession(db, sid); return resp({ session_id: sid, role: existing.role, leader: getLeader(db)?.id }); }
      const role = getSessions(db).length === 0 ? 'leader' : 'observer';
      addSession(db, sid, platform || 'unknown', role);
      return resp({ session_id: sid, role, leader: getLeader(db)?.id, message: role === 'leader' ? '🔑 Leader.' : '👁 Observer.' });
    });
  server.tool('session_heartbeat', '心跳保活。', {}, async (_args, extra) => {
    if (!getSession(db, extra?.sessionId)) return resp({ error: 'Session not found.' });
    heartbeatSession(db, extra.sessionId); return resp({ ok: true });
  });
  server.tool('session_list', '列出活跃会话。', {}, async () => {
    cleanupStaleSessions(db, SESSION_TIMEOUT); electLeader();
    return resp({ sessions: getSessions(db).map(s => ({ id: s.id, role: s.role, platform: s.platform, leader: s.id === getLeader(db)?.id })), leader: getLeader(db)?.id });
  });
  server.tool('session_leave', '离开会话。', {}, async (_args, extra) => {
    const s = getSession(db, extra?.sessionId); if (!s) return resp({ ok: true });
    const wasLeader = s.role === 'leader'; removeSession(db, extra.sessionId);
    return resp({ ok: true, lock_transferred: wasLeader ? electLeader() : null });
  });

  server.tool('pipeline_init', '【需Leader】初始化流水线。', { project_name: z.string().optional() },
    async ({ project_name }, extra) => {
      const lk = requireLeader(extra?.sessionId); if (lk) return resp(lk);
      dbInitPipeline(db, project_name || root, extra?.sessionId);
      return resp({ ok: true, message: 'Pipeline initialized. Next: Gate A', state: getPipeline(db) });
    });
  server.tool('pipeline_status', '流水线状态。', {},
    async () => {
      const p = getPipeline(db); const docs = join(root, 'docs');
      const gates = GATES.map(g => { const cp = getCheckpoints(db, g); return { gate: g, passed: cp.length > 0, checkpoints: cp, artifacts: findGateArtifacts(docs, g), requirement: GATE_CHECKS[g]?.check || '' }; });
      const current = gates.find(g => !g.passed)?.gate || 'Complete';
      return resp({ project: root, mode: p?.mode || 'strict', current_gate: current, completed: gates.filter(g => g.passed).map(g => g.gate), gates, sessions: { active: getSessions(db).length, leader: getLeader(db)?.id }, _display: formatGateDisplay(gates, current) });
    });
  server.tool('gate_enforce', '【硬约束】验证Gate条件。', { gate: z.enum(GATES).optional() },
    async ({ gate }) => {
      const target = gate || getPipeline(db)?.current_gate || 'Gate A';
      const artifacts = findGateArtifacts(join(root, 'docs'), target);
      const checkpoints = getCheckpoints(db, target);
      const allowed = artifacts.length > 0 || checkpoints.length > 0;
      return resp(allowed ? { gate: target, allowed: true, message: `✅ ${target} — proceed.` } : { gate: target, allowed: false, blocked_reasons: [artifacts.length ? '' : `No artifacts in docs/${GATE_DIRS[target]}/`].filter(Boolean), action_required: GATE_CHECKS[target]?.check || '' });
    });
  server.tool('advance_gate', '【硬约束·需Leader】推进Gate。', { gate: z.enum(GATES) },
    async ({ gate }, extra) => {
      const lk = requireLeader(extra?.sessionId); if (lk) return resp(lk);
      const p = getPipeline(db); const cur = p?.current_gate || 'Gate A';
      const ci = GATES.indexOf(cur), ti = GATES.indexOf(gate);
      if (ti <= ci) return resp({ allowed: false, error: `FSM blocked: Cannot move backward.` });
      if (ti > ci + 1) return resp({ allowed: false, error: `FSM blocked: Cannot skip gates. Next: ${GATES[ci + 1]}` });
      const artifacts = findGateArtifacts(join(root, 'docs'), cur);
      const cps = getCheckpoints(db, cur);
      if (artifacts.length === 0 && cps.length === 0) return resp({ allowed: false, error: `${cur} conditions NOT met.` });
      addCheckpoint(db, cur, gate, extra?.sessionId);
      updatePipelineGate(db, gate);
      return resp({ allowed: true, previous_gate: cur, current_gate: gate, next: GATES[ti + 1] || 'Complete', message: GATES[ti + 1] ? `Next: ${GATES[ti + 1]}` : '🎉 Complete!' });
    });
  server.tool('report_status', '流水线完整报告。', {},
    async () => {
      const gates = GATES.map(g => ({ gate: g, passed: getCheckpoints(db, g).length > 0, artifacts: findGateArtifacts(join(root, 'docs'), g) }));
      const completed = gates.filter(g => g.passed).length;
      return resp({ project: root, progress: `${completed}/${GATES.length}`, current: gates.find(g => !g.passed)?.gate || 'Complete' });
    });
  server.tool('agent_config', 'Agent模型配置。', { agent_id: z.string().optional(), model: z.string().optional() },
    async ({ agent_id, model }) => {
      if (agent_id && model) {
        if (!AVAILABLE_MODELS.includes(model)) return resp({ error: 'Unknown model.' });
        setAgentModel(db, agent_id, model); return resp({ ok: true, agent_id, model });
      }
      const cfg = getAgentConfig(db);
      return resp({ agents: AGENT_LIST.map(a => ({ id: a.id, name: a.name, role: a.role, model: cfg[a.id] || a.defaultModel })), available_models: AVAILABLE_MODELS });
    });

  // ---- Transport + Web ----
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
  app.post('/mcp', async (req, res) => { try { await transport.handleRequest(req, res, req.body); } catch (e) { res.status(500).json({ error: e.message }); } });
  app.get('/mcp/sse', async (req, res) => { await transport.handleRequest(req, res, undefined); });
  await server.connect(transport);

  setupWebRoutes(app, db, root, dashboard);

  app.listen(port, () => {
    console.log(`🧠 Jarvis Engine v${readPkgVersion()} — http://localhost:${port}`);
    if (dashboard) console.log(`   Web: http://localhost:${port}/dashboard`);
    console.log(`   API: http://localhost:${port}/api/pipeline`);
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
