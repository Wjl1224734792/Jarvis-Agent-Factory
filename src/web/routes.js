import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';
import { getPipeline, getCheckpoints, addCheckpoint, updatePipelineGate, getSessions, getAllPipelines, getAgentConfig, setAgentModel } from '../engine/db.js';
import { GATES, GATE_CHECKS, GATE_DIRS, AGENT_LIST, AVAILABLE_MODELS, findGateArtifacts, formatGateDisplay } from '../engine/gates.js';
import { getPlatformModels } from '../engine/agent-registry.js';
import { syncAgentFile } from '../engine/agent-fs.js';

/** 按平台分组可用模型 */
const PLATFORM_MODELS = getPlatformModels();

export function setupWebRoutes(app, db, root, dashboard) {
  // Health
  app.get('/health', (_req, res) => res.json({ status: 'ok', version: readVersion() }));

  // ---- REST API (hooks + dashboard) ----
  // 所有会话的合并流水线视图（Dashboard 用）
  app.get('/api/pipeline', (_req, res) => {
    const sessions = getSessions(db);
    const sessionList = sessions.map(s => {
      const p = getPipeline(db, s.id);
      const gates = GATES.map(g => ({ gate: g, passed: getCheckpoints(db, g, s.id).length > 0, artifacts: findGateArtifacts(getDocsDir(root), g) }));
      const current = gates.find(g => !g.passed)?.gate || 'Complete';
      return { session_id: s.id, platform: s.platform, current_gate: current, completed: gates.filter(g => g.passed).map(g => g.gate), gates, _display: formatGateDisplay(gates, current) };
    });
    res.json({ sessions: sessionList, active_count: sessions.length });
  });

  app.get('/api/gate/:gate/enforce', (req, res) => {
    const gate = req.params.gate.replace(/_/g, ' ');
    const artifacts = findGateArtifacts(getDocsDir(root), gate);
    const sid = req.query.session_id || (getSessions(db)[0]?.id);
    const checkpoints = getCheckpoints(db, gate, sid);
    const allowed = artifacts.length > 0 || checkpoints.length > 0;
    res.json({ gate, allowed, artifacts, checkpoints: checkpoints.map(c => c.passed_at), session_id: sid, ...(allowed ? {} : { blocked: true, required: GATE_CHECKS[gate]?.check || '' }) });
  });

  app.post('/api/gate/advance', (req, res) => {
    const sid = req.body.session_id || (getSessions(db)[0]?.id);
    const pstate = getPipeline(db, sid);
    const currentGate = pstate?.current_gate || 'Gate A';
    const currentIdx = GATES.indexOf(currentGate); const targetIdx = currentIdx + 1;
    if (targetIdx >= GATES.length) return res.json({ allowed: false, error: 'Pipeline complete' });
    const targetGate = GATES[targetIdx];
    const artifacts = findGateArtifacts(getDocsDir(root), currentGate);
    const checkpoints = getCheckpoints(db, currentGate, sid);
    if (artifacts.length === 0 && checkpoints.length === 0) return res.json({ allowed: false, error: `Gate ${currentGate} conditions NOT met` });
    addCheckpoint(db, currentGate, targetGate, sid);
    updatePipelineGate(db, sid, targetGate);
    res.json({ allowed: true, session_id: sid, previous: currentGate, current: targetGate, next: GATES[targetIdx + 1] || 'Complete' });
  });

  app.get('/api/sessions', (_req, res) => {
    const sessions = getSessions(db).map(s => {
      const p = getPipeline(db, s.id);
      return { id: s.id, platform: s.platform, role: s.role, gate: p?.current_gate || '?', heartbeat: s.last_heartbeat };
    });
    res.json({ sessions, count: sessions.length });
  });

  const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

  app.get('/api/agents', (req, res) => {
    const cfg = getAgentConfig(db);
    const platform = req.query.platform;
    const search = (req.query.search || '').toLowerCase();
    let list = AGENT_LIST.map(a => {
      const c = cfg[a.id];
      return { ...a, model: c?.model || a.defaultModel, effort: c?.effort || a.defaultEffort || 'high', is_custom: !!c };
    });
    if (platform) list = list.filter(a => a.platform === platform);
    if (search) list = list.filter(a => a.name.toLowerCase().includes(search) || a.id.toLowerCase().includes(search) || a.role.toLowerCase().includes(search));
    res.json({
      agents: list,
      available_models: AVAILABLE_MODELS,
      available_efforts: EFFORTS,
      platforms: [...new Set(AGENT_LIST.map(a=>a.platform))],
      platform_models: PLATFORM_MODELS,
      total_count: AGENT_LIST.length,
    });
  });

  app.post('/api/agents', (req, res) => {
    const { agent_id, model, effort } = req.body;
    if (!agent_id || !model) return res.status(400).json({ error: 'agent_id and model required' });
    if (effort && !EFFORTS.includes(effort)) return res.status(400).json({ error: `Unknown effort. Valid: ${EFFORTS.join(', ')}` });

    const agent = AGENT_LIST.find(a => a.id === agent_id);
    if (agent) {
      const validModels = PLATFORM_MODELS[agent.platform] || [];
      if (validModels.length > 0 && !validModels.includes(model)) {
        console.log(`  ⚠️  ${agent_id}: 自定义模型 "${model}"（不在 ${agent.platform} 预设列表中）`);
      }
    }

    setAgentModel(db, agent_id, model, effort || 'high');
    const fileSynced = syncAgentFile(root, agent_id, model, effort || 'high');
    res.json({ ok: true, agent_id, model, effort: effort || 'high', file_synced: fileSynced });
  });

  // ---- SSE ----
  const sseClients = new Set();
  app.get('/api/events', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    sseClients.add(res); req.on('close', () => sseClients.delete(res));
  });
  setInterval(() => {
    if (sseClients.size === 0) return;
    const sessions = getSessions(db);
    const data = JSON.stringify({ sessions: sessions.map(s => ({ id: s.id, platform: s.platform, role: s.role, gate: getPipeline(db, s.id)?.current_gate || '?' })), count: sessions.length });
    for (const c of sseClients) c.write(`data: ${data}\n\n`);
  }, 8000);

  // ---- Dashboard ----
  if (dashboard) {
    app.get('/dashboard', (_req, res) => res.type('html').send(readFileSync(resolve(import.meta.dirname, 'views', 'pipeline.html'), 'utf-8')));
    app.get('/agents', (_req, res) => res.type('html').send(readFileSync(resolve(import.meta.dirname, 'views', 'agents.html'), 'utf-8')));
  }
}

function getDocsDir(root) { return resolve(root, 'docs'); }
function readVersion() { try { return JSON.parse(readFileSync(resolve(import.meta.dirname, '..', '..', 'package.json'), 'utf-8')).version; } catch { return '?.?.?'; } }
