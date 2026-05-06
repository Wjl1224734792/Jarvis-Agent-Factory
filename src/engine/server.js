import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { openDb, getPipeline, updatePipelineGate, initPipeline as dbInitPipeline, getCheckpoints, addCheckpoint, getSessions, getSession, addSession, heartbeatSession, removeSession, updateSessionRole, cleanupStaleSessions, getOldestSession, getLeader, getAgentConfig, setAgentModel } from './db.js';

const PID_FILE = resolve(homedir(), '.jarvis', 'engine.pid');
const DEFAULT_PORT = 3456;
const SESSION_TIMEOUT = 120_000;
const GATES = ['Gate A', 'Gate B', 'Gate C', 'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D', 'Gate E'];
const GATE_DIRS = { 'Gate A':'requirements','Gate B':'tasks','Gate C':'plans','Gate C1':'implementation','Gate C1.5':'implementation','Gate C2':'testing','Gate D':'review','Gate E':'shipping' };
const GATE_CHECKS = { 'Gate A':{check:'至少1个需求文档，含REQ-XXX编号'},'Gate B':{check:'每个TASK-XXX映射至少1个REQ-XXX'},'Gate C':{check:'计划文档含parallel_batches+Execution Packet'},'Gate C1':{check:'Lint+Type-check+Build+Deps Audit全部通过'},'Gate C1.5':{check:'页面/组件视觉验证截图证据已附'},'Gate C2':{check:'单元/集成/E2E/浏览器测试全部通过，API契约验证通过'},'Gate D':{check:'review-qa评审通过，REQ追踪矩阵完整'},'Gate E':{check:'安全审计+上线检查清单+回滚预案就绪'} };

export async function startEngine({ port = DEFAULT_PORT, dashboard = false, projectRoot = '.' } = {}) {
  const root = resolve(projectRoot);
  const pidDir = resolve(homedir(), '.jarvis');
  if (!existsSync(pidDir)) mkdirSync(pidDir, { recursive: true });
  writeFileSync(PID_FILE, String(process.pid));

  const app = express();
  app.use(express.json());

  const server = new McpServer({ name: 'jarvis-engine', version: readPkgVersion() });

  // ---- Database (SQLite) ----
  const db = openDb(root);

  // ---- Session Manager (SQLite-backed) ----
  function requireLeader(sessionId) {
    cleanupStaleSessions(db, SESSION_TIMEOUT);
    const s = getSession(db, sessionId);
    if (!s) return { error: 'Session not registered. Call session_join first.' };
    if (s.role !== 'leader') {
      const leader = getLeader(db);
      return { error: `Write lock held by session ${leader?.id || '?'}. You are observer (read-only).` };
    }
    return null;
  }
  function electLeader() {
    const leader = getLeader(db);
    if (leader) return leader.id;
    const oldest = getOldestSession(db);
    if (oldest) { updateSessionRole(db, oldest.id, 'leader'); return oldest.id; }
    return null;
  }
  // Heartbeat cleanup every 30s
  setInterval(() => {
    const stale = cleanupStaleSessions(db, SESSION_TIMEOUT);
    if (stale.length) electLeader();
  }, 30_000);

  // ---- Pipeline state machine (SQLite-backed) ----
  function readPipeline() { return getPipeline(db); }
  function writePipeline(state) {
    updatePipelineGate(db, state.current_gate);
  }

  // ==============================
  // TOOLS
  // ==============================

  // --- Session management (SQLite) ---
  server.tool('session_join', '注册会话。第一个=leader🔑，后续=observer👁。SQLite持久化，引擎重启不丢。',
    { platform: z.enum(['claude','opencode','codex','other']).optional() },
    async ({ platform }, extra) => {
      const sid = extra?.sessionId || `s${Date.now()}`;
      const existing = getSession(db, sid);
      if (existing) { heartbeatSession(db, sid); const leader = getLeader(db); return { content: [{ type: 'text', text: JSON.stringify({ session_id: sid, role: existing.role, leader: leader?.id, active_sessions: getSessions(db).length }) }] }; }
      const role = getSessions(db).length === 0 ? 'leader' : 'observer';
      addSession(db, sid, platform || 'unknown', role);
      const leader = getLeader(db);
      return { content: [{ type: 'text', text: JSON.stringify({ session_id: sid, role, leader: leader?.id, active_sessions: getSessions(db).length, message: role==='leader'?'🔑 Leader — write access granted.':'👁 Observer — read-only.' }) }] };
    }
  );
  server.tool('session_heartbeat', '心跳保活。60s一次，超时自动清理。', {}, async (_args, extra) => {
    const sid = extra?.sessionId; if (!sid || !getSession(db, sid)) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Session not found.' }) }] };
    heartbeatSession(db, sid); return { content: [{ type: 'text', text: JSON.stringify({ ok: true, session_id: sid }) }] };
  });
  server.tool('session_list', '列出所有活跃会话。', {}, async () => {
    cleanupStaleSessions(db, SESSION_TIMEOUT); electLeader();
    const leader = getLeader(db);
    const list = getSessions(db).map(s => ({ session_id: s.id, platform: s.platform, role: s.role, leader: s.id===leader?.id, last_heartbeat_ago: `${Math.round((Date.now()-s.last_heartbeat)/1000)}s` }));
    return { content: [{ type: 'text', text: JSON.stringify({ active_sessions: list.length, leader_session: leader?.id, sessions: list }) }] };
  });
  server.tool('session_leave', '主动离开。leader离开自动移交锁。', {}, async (_args, extra) => {
    const sid = extra?.sessionId; if (!sid || !getSession(db, sid)) return { content: [{ type: 'text', text: JSON.stringify({ ok: true }) }] };
    const wasLeader = getSession(db, sid)?.role === 'leader';
    removeSession(db, sid);
    const newLeader = wasLeader ? electLeader() : null;
    return { content: [{ type: 'text', text: JSON.stringify({ ok: true, lock_transferred: newLeader ? `→ ${newLeader}` : null }) }] };
  });

  // --- Pipeline management ---

  // Tool: pipeline_init — DB-backed
  server.tool('pipeline_init', '【硬约束·需Leader】初始化流水线。SQLite持久化。',
    { project_name: z.string().optional() },
    async ({ project_name }, extra) => {
      const lockErr = requireLeader(extra?.sessionId); if (lockErr) return { content: [{ type: 'text', text: JSON.stringify(lockErr) }] };
      dbInitPipeline(db, project_name || root, extra?.sessionId);
      const state = readPipeline();
      return { content: [{ type: 'text', text: JSON.stringify({ ok: true, message: 'Pipeline initialized (SQLite). Next: Gate A', state }) }] };
    }
  );

  // Tool: pipeline_status
  server.tool(
    'pipeline_status',
    '完整流水线状态：当前 Gate、已完成 Gate、产物文件、Gate 检查点时间戳。同时读取硬状态 pipeline.json。',
    {},
    async () => {
      const pstate = readPipeline();
      const gates = GATES.map(gate => {
        const checkpoints = readCheckpointsDb( gate);
        return { gate, passed: checkpoints.length > 0, checkpoints, artifacts: findGateArtifacts(join(root, 'docs'), gate), requirement: GATE_CHECKS[gate]?.check || '' };
      });
      const current = pstate?.current_gate || (gates.find(g => !g.passed)?.gate || 'Gate A');
      const allSessions = getSessions(db); const leader = getLeader(db);
      const sessionInfo = { active_sessions: allSessions.length, leader: leader?.id, sessions: allSessions.map(s => ({ id: s.id, role: s.role, platform: s.platform, alive_s: Math.round((Date.now()-s.last_heartbeat)/1000) })) };
      return {
        content: [{ type: 'text', text: JSON.stringify({
          project: root,
          mode: pstate?.mode || 'soft',
          current_gate: current,
          completed: gates.filter(g => g.passed).map(g => g.gate),
          gates,
          sessions: sessionInfo,
          _display: formatGateDisplay(gates, current),
        }, null, 2) }],
      };
    }
  );

  // Tool: gate_enforce — HARD constraint
  server.tool(
    'gate_enforce',
    '【硬约束】验证当前 Gate 的通过条件。返回 allowed=true 才可以 proceed。allowed=false 时必须先完成条件再重试。不可绕过。',
    { gate: z.enum(GATES).optional().describe('要检查的 Gate（默认当前 Gate）') },
    async ({ gate }) => {
      const pstate = readPipeline();
      const targetGate = gate || pstate?.current_gate || 'Gate A';
      const artifacts = findGateArtifacts(join(root, 'docs'), targetGate);
      const checkpoints = readCheckpointsDb( targetGate);
      const requirement = GATE_CHECKS[targetGate];

      // Hard check: must have artifacts and/or checkpoints
      const hasArtifacts = artifacts.length > 0;
      const hasCheckpoint = checkpoints.length > 0;
      const allowed = hasArtifacts || hasCheckpoint;

      const reasons = [];
      if (!hasArtifacts) reasons.push(`No artifacts found in docs/${GATE_DIRS[targetGate] || '?'}/`);
      if (!hasCheckpoint) reasons.push(`No checkpoint recorded for ${targetGate}`);

      return {
        content: [{ type: 'text', text: JSON.stringify({
          gate: targetGate,
          allowed,
          enforced: true,
          requirement: requirement?.check || '',
          check_results: { artifacts_found: artifacts, checkpoints_found: checkpoints.map(c => c.passed_at) },
          ...(allowed ? { message: `✅ ${targetGate} conditions met — proceed to next gate` } : { blocked_reasons: reasons, action_required: requirement?.check || 'Complete gate requirements' }),
        }, null, 2) }],
      };
    }
  );

  // Tool: advance_gate — FSM enforced + leader check
  server.tool(
    'advance_gate',
    '【硬约束·需Leader】推进到下一个 Gate。仅 leader 会话可调用，observer 被拒绝。非顺序推进被 FSM 拒绝。',
    { gate: z.enum(GATES).describe('要推进到的 Gate 名称') },
    async ({ gate }, extra) => {
      const lockErr = requireLeader(extra?.sessionId); if (lockErr) return { content: [{ type: 'text', text: JSON.stringify(lockErr) }] };
      const pstate = readPipeline();
      const currentGate = pstate?.current_gate || 'Gate A';
      const currentIdx = GATES.indexOf(currentGate);
      const targetIdx = GATES.indexOf(gate);

      if (targetIdx === -1) return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown gate: ${gate}` }) }] };

      // FSM: only allow current gate → next gate (no skipping)
      if (targetIdx <= currentIdx) {
        return { content: [{ type: 'text', text: JSON.stringify({ allowed: false, error: `FSM blocked: Cannot move backward or stay. Current: ${currentGate}, Requested: ${gate}` }) }] };
      }
      if (targetIdx > currentIdx + 1) {
        return { content: [{ type: 'text', text: JSON.stringify({ allowed: false, error: `FSM blocked: Cannot skip gates. Current: ${currentGate}, Requested: ${gate}. Must advance to ${GATES[currentIdx + 1]} first.` }) }] };
      }

      // Enforce: must pass current gate
      const artifacts = findGateArtifacts(join(root, 'docs'), currentGate);
      const checkpoints = readCheckpointsDb( currentGate);
      if (artifacts.length === 0 && checkpoints.length === 0) {
        return { content: [{ type: 'text', text: JSON.stringify({ allowed: false, error: `FSM blocked: ${currentGate} conditions NOT met. Run gate_enforce first. Required: ${GATE_CHECKS[currentGate]?.check}` }) }] };
      }

      // Allowed — advance (SQLite)
      addCheckpoint(db, currentGate, gate, extra?.sessionId);
      updatePipelineGate(db, gate);

      const nextGate = GATES[targetIdx + 1];
      return {
        content: [{ type: 'text', text: JSON.stringify({
          allowed: true,
          previous_gate: currentGate, marked_passed_at: new Date().toISOString(),
          current_gate: gate, next: nextGate || 'Pipeline Complete',
          message: nextGate ? `Next: ${nextGate}` : '🎉 All gates passed! Move to Gate E: Release.',
        }, null, 2) }],
      };
    }
  );

  // Tool: report_status
  server.tool(
    'report_status',
    '流水线完整报告：Gate 进度、测试结果、契约验证结果、产物链接',
    {},
    async () => {
      const gates = GATES.map(gate => ({
        gate,
        passed: readCheckpointsDb( gate).length > 0,
        artifacts: findGateArtifacts(join(root, 'docs'), gate),
      }));
      const completed = gates.filter(g => g.passed).length;
      const total = gates.length;
      const reports = {};
      for (const gate of gates) {
        if (gate.passed) {
          reports[gate.gate] = {
            artifacts: gate.artifacts,
            checkpoints: readCheckpointsDb( gate.gate),
          };
        }
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({
          project: root,
          progress: `${completed}/${total} (${Math.round(completed/total*100)}%)`,
          current: gates.find(g => !g.passed)?.gate || 'All gates passed',
          reports,
          _summary: `${completed}/${total} gates passed. Current: ${gates.find(g => !g.passed)?.gate || 'Complete'}`,
        }, null, 2) }],
      };
    }
  );

  // ==============================
  // RESOURCES
  // ==============================

  // requirements://list + requirements://{reqId}
  server.resource('requirements_list', 'requirements://list', {
    name: 'Requirements', description: '所有 REQ-XXX 需求文档列表', mimeType: 'text/markdown',
  }, async () => ({ contents: [{ uri: 'requirements://list', text: listMarkdownFiles(join(root, 'docs', 'requirements'), 'Requirements'), mimeType: 'text/markdown' }] }));

  server.resource('requirement_detail', 'requirements://{reqId}', {
    name: 'Requirement Detail', description: '指定需求完整内容', mimeType: 'text/markdown',
  }, async (uri) => ({ contents: [{ uri: uri.href, text: findDocByReq(join(root, 'docs', 'requirements'), uri.pathname.split('/').pop()), mimeType: 'text/markdown' }] }));

  // tasks://list + tasks://{taskId}
  server.resource('tasks_list', 'tasks://list', {
    name: 'Tasks', description: '所有 TASK-XXX 任务文档列表', mimeType: 'text/markdown',
  }, async () => ({ contents: [{ uri: 'tasks://list', text: listMarkdownFiles(join(root, 'docs', 'tasks'), 'Tasks'), mimeType: 'text/markdown' }] }));

  server.resource('task_detail', 'tasks://{taskId}', {
    name: 'Task Detail', description: '指定任务完整内容', mimeType: 'text/markdown',
  }, async (uri) => ({ contents: [{ uri: uri.href, text: findDocByReq(join(root, 'docs', 'tasks'), uri.pathname.split('/').pop()), mimeType: 'text/markdown' }] }));

  // plans://list + plans://{planFile}
  server.resource('plans_list', 'plans://list', {
    name: 'Plans', description: '执行计划文档列表', mimeType: 'text/markdown',
  }, async () => ({ contents: [{ uri: 'plans://list', text: listMarkdownFiles(join(root, 'docs', 'plans'), 'Plans'), mimeType: 'text/markdown' }] }));

  server.resource('plan_detail', 'plans://{planFile}', {
    name: 'Plan Detail', description: '指定计划完整内容', mimeType: 'text/markdown',
  }, async (uri) => {
    const file = decodeURIComponent(uri.pathname.split('/').pop());
    const p = join(root, 'docs', 'plans', file + (file.endsWith('.md') ? '' : '.md'));
    const text = existsSync(p) ? readFileSync(p, 'utf-8') : `# ${file} — Not Found`;
    return { contents: [{ uri: uri.href, text, mimeType: 'text/markdown' }] };
  });

  // reports://{gate} — gate-level report summary
  server.resource('gate_report', 'reports://{gate}', {
    name: 'Gate Report', description: '指定 Gate 的产物文件摘要', mimeType: 'text/markdown',
  }, async (uri) => {
    const gate = decodeURIComponent(uri.pathname.split('/').pop()).replace(/_/g, ' ');
    const artifacts = findGateArtifacts(join(root, 'docs'), gate);
    const checkpoints = readCheckpointsDb( gate);
    const text = `# ${gate} Report\n\n**Passed:** ${checkpoints.length > 0}\n**Checkpoints:** ${checkpoints.map(c => c.passed_at).join(', ') || 'none'}\n\n**Artifacts:**\n${artifacts.map(a => `- ${a}`).join('\n') || 'none'}`;
    return { contents: [{ uri: uri.href, text, mimeType: 'text/markdown' }] };
  });

  // ==============================
  // TRANSPORT
  // ==============================
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
  app.post('/mcp', async (req, res) => { try { await transport.handleRequest(req, res, req.body); } catch (e) { res.status(500).json({ error: e.message }); } });
  app.get('/mcp/sse', async (req, res) => { await transport.handleRequest(req, res, undefined); });
  await server.connect(transport);

  // ---- Health ----
  app.get('/health', (_req, res) => res.json({ status: 'ok', version: readPkgVersion(), tools: ['pipeline_init', 'pipeline_status', 'gate_enforce', 'advance_gate', 'report_status'] }));

  // ---- REST API (for hooks, bypasses MCP transport) ----
  app.get('/api/pipeline', (_req, res) => {
    const p = readPipeline(); const gates = GATES.map(g => ({ gate: g, passed: getCheckpoints(db, g).length > 0, artifacts: findGateArtifacts(join(root, 'docs'), g) }));
    const current = gates.find(g => !g.passed)?.gate || 'Complete';
    res.json({ current_gate: current, completed: gates.filter(g => g.passed).map(g => g.gate), gates, _display: formatGateDisplay(gates, current) });
  });
  app.get('/api/gate/:gate/enforce', (req, res) => {
    const gate = req.params.gate.replace(/_/g, ' ');
    const artifacts = findGateArtifacts(join(root, 'docs'), gate);
    const checkpoints = getCheckpoints(db, gate);
    const allowed = artifacts.length > 0 || checkpoints.length > 0;
    res.json({ gate, allowed, artifacts, checkpoints: checkpoints.map(c => c.passed_at), ...(allowed ? {} : { blocked: true, required: GATE_CHECKS[gate]?.check || '' }) });
  });
  app.post('/api/gate/advance', (req, res) => {
    const pstate = readPipeline(); const currentGate = pstate?.current_gate || 'Gate A';
    const currentIdx = GATES.indexOf(currentGate); const targetIdx = currentIdx + 1;
    if (targetIdx >= GATES.length) return res.json({ allowed: false, error: 'Pipeline complete' });
    const targetGate = GATES[targetIdx];
    const artifacts = findGateArtifacts(join(root, 'docs'), currentGate);
    const checkpoints = getCheckpoints(db, currentGate);
    if (artifacts.length === 0 && checkpoints.length === 0) return res.json({ allowed: false, error: `Gate ${currentGate} conditions NOT met` });
    addCheckpoint(db, currentGate, targetGate, 'hook');
    updatePipelineGate(db, targetGate);
    res.json({ allowed: true, previous: currentGate, current: targetGate, next: GATES[targetIdx + 1] || 'Complete' });
  });
  app.get('/api/sessions', (_req, res) => {
    const leader = getLeader(db);
    res.json({ sessions: getSessions(db).map(s => ({ id: s.id, role: s.role, platform: s.platform, leader: s.id === leader?.id })), leader: leader?.id });
  });

  // ---- Agent Model Config (SQLite) ----
  const AVAILABLE_MODELS = [
    'deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek/deepseek-v4-pro', 'deepseek/deepseek-v4-flash',
    'gpt-5.5', 'gpt-5.4', 'gpt-5.3-codex', 'gpt-5.3-codex-spark', 'gpt-5.4-mini', 'gpt-5.2',
    'claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5',
  ];

  const AGENT_LIST = [
    { id:'jarvis', name:'Jarvis', role:'编排中枢', icon:'brain', defaultModel:'deepseek-v4-pro' },
    { id:'frontend-implementer', name:'Frontend', role:'前端全栈', icon:'layout', defaultModel:'deepseek-v4-pro' },
    { id:'frontend-ui-worker', name:'UI Worker', role:'UI/样式', icon:'palette', defaultModel:'deepseek-v4-flash' },
    { id:'frontend-state-worker', name:'State Worker', role:'状态/数据', icon:'database', defaultModel:'deepseek-v4-flash' },
    { id:'frontend-test-worker', name:'Frontend Test', role:'前端测试', icon:'test', defaultModel:'deepseek-v4-flash' },
    { id:'backend-implementer', name:'Backend', role:'后端全栈', icon:'server', defaultModel:'deepseek-v4-pro' },
    { id:'backend-api-worker', name:'API Worker', role:'API/路由', icon:'route', defaultModel:'deepseek-v4-flash' },
    { id:'backend-service-worker', name:'Service Worker', role:'业务逻辑', icon:'cog', defaultModel:'deepseek-v4-flash' },
    { id:'backend-data-worker', name:'Data Worker', role:'数据层', icon:'table', defaultModel:'deepseek-v4-flash' },
    { id:'backend-test-worker', name:'Backend Test', role:'后端测试', icon:'test', defaultModel:'deepseek-v4-flash' },
    { id:'browser-test-worker', name:'Browser Test', role:'浏览器测试', icon:'globe', defaultModel:'deepseek-v4-flash' },
    { id:'e2e-test-worker', name:'E2E Test', role:'端到端测试', icon:'play', defaultModel:'deepseek-v4-flash' },
    { id:'api-docs-worker', name:'API Docs', role:'API文档', icon:'file', defaultModel:'deepseek-v4-flash' },
    { id:'planner', name:'Planner', role:'执行规划', icon:'map', defaultModel:'deepseek-v4-pro' },
    { id:'task-design', name:'Task Design', role:'任务分解', icon:'list', defaultModel:'deepseek-v4-pro' },
    { id:'security-auditor', name:'Security', role:'安全审计', icon:'shield', defaultModel:'deepseek-v4-pro' },
    { id:'review-qa', name:'Review QA', role:'评审', icon:'eye', defaultModel:'deepseek-v4-pro' },
  ];

  // REST: agent config (SQLite)
  app.get('/api/agents', (_req, res) => {
    const cfg = getAgentConfig(db);
    const list = AGENT_LIST.map(a => ({ ...a, model: cfg[a.id] || a.defaultModel, is_custom: !!cfg[a.id] }));
    res.json({ agents: list, available_models: AVAILABLE_MODELS });
  });
  app.post('/api/agents', (req, res) => {
    const { agent_id, model } = req.body;
    if (!agent_id || !model) return res.status(400).json({ error: 'agent_id and model required' });
    if (!AVAILABLE_MODELS.includes(model)) return res.status(400).json({ error: `Unknown model. Available: ${AVAILABLE_MODELS.join(', ')}` });
    setAgentModel(db, agent_id, model);
    res.json({ ok: true, agent_id, model });
  });

  // MCP: agent_config (SQLite)
  server.tool('agent_config', '配置子Agent模型（SQLite持久化）。', {
    agent_id: z.string().optional(), model: z.string().optional(),
  }, async ({ agent_id, model }) => {
    const cfg = getAgentConfig(db);
    if (agent_id && model) {
      if (!AVAILABLE_MODELS.includes(model)) return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown model. Available: ${AVAILABLE_MODELS.join(', ')}` }) }] };
      setAgentModel(db, agent_id, model);
      return { content: [{ type: 'text', text: JSON.stringify({ ok: true, agent_id, model }) }] };
    }
    const list = AGENT_LIST.map(a => ({ id: a.id, name: a.name, role: a.role, model: cfg[a.id] || a.defaultModel, is_custom: !!cfg[a.id] }));
    return { content: [{ type: 'text', text: JSON.stringify({ agents: list, available_models: AVAILABLE_MODELS }) }] };
  });

  // ---- SSE ----
  const sseClients = new Set();
  app.get('/api/events', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    sseClients.add(res); req.on('close', () => sseClients.delete(res));
  });
  setInterval(() => {
    if (sseClients.size === 0) return;
    const checkpoints = getCheckpoints(db);
    const cpGateMap = {}; for (const c of checkpoints) cpGateMap[c.gate] = c;
    const gates = GATES.map(g => ({ gate: g, passed: !!cpGateMap[g], checkpoints: cpGateMap[g] ? [cpGateMap[g]] : [], artifacts: findGateArtifacts(join(root, 'docs'), g), requirement: GATE_CHECKS[g]?.check || '' }));
    const current = gates.find(g => !g.passed)?.gate || 'Complete';
    const completed = gates.filter(g => g.passed).map(g => g.gate);
    const pct = Math.round(completed.length / gates.length * 100);
    const data = JSON.stringify({ project: root, current_gate: current, completed, progress: pct, gates, _display: formatGateDisplay(gates, current) });
    for (const c of sseClients) c.write(`data: ${data}\n\n`);
  }, 8000);

  // ---- Dashboard ----
  if (dashboard) {
    app.get('/dashboard', (_req, res) => res.type('html').send(readFileSync(resolve(import.meta.dirname, 'dashboard.html'), 'utf-8')));
    app.get('/agents', (_req, res) => res.type('html').send(readFileSync(resolve(import.meta.dirname, 'agents.html'), 'utf-8')));
  }

  app.listen(port, () => {
    console.log(`🧠 Jarvis Engine v${readPkgVersion()} — http://localhost:${port}`);
    console.log(`   MCP:  POST http://localhost:${port}/mcp`);
    if (dashboard) console.log(`   Web:  http://localhost:${port}/dashboard`);
  });
}

// ==============================
// HELPERS
// ==============================

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
function readCheckpointsDb(gate) { return getCheckpoints(db, gate); }

function findGateArtifacts(docsDir, gate) {
  const subdir = GATE_DIRS[gate]; if (!subdir) return [];
  const dir = join(docsDir, subdir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.md')).slice(0, 5);
}

function listMarkdownFiles(dir, title) {
  if (!existsSync(dir)) return `# ${title}\n\nNo documents found.`;
  const files = readdirSync(dir).filter(f => f.endsWith('.md'));
  if (files.length === 0) return `# ${title}\n\nEmpty.`;
  return `# ${title}\n\n${files.map(f => `- ${f}`).join('\n')}`;
}

function findDocByReq(dir, reqId) {
  if (!existsSync(dir)) return `# ${reqId} — Not Found`;
  for (const f of readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const c = readFileSync(join(dir, f), 'utf-8');
    if (c.includes(reqId)) return c;
  }
  return `# ${reqId} — Not Found`;
}

function formatGateDisplay(gates, current) {
  return gates.map(g => `${g.passed ? '✅' : g.gate === current ? '🔵' : '⏳'} ${g.gate}${g.passed && g.checkpoints.length ? ` (${g.checkpoints[0].passed_at?.slice(0,10)})` : ''}`).join(' → ');
}
