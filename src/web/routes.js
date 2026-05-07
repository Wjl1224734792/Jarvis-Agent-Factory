import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';
import { getPipeline, getCheckpoints, addCheckpoint, updatePipelineGate, getSessions, getLeader, getAgentConfig, setAgentModel } from '../engine/db.js';
import { GATES, GATE_CHECKS, GATE_DIRS, AGENT_LIST, AVAILABLE_MODELS, findGateArtifacts, formatGateDisplay } from '../engine/gates.js';

/** 按平台分组可用模型（Claude 无前缀，OpenCode 带 provider/ 前缀，Codex 用 GPT 系列） */
const PLATFORM_MODELS = {
  claude:   AVAILABLE_MODELS.filter(m => !m.includes('/') && !m.startsWith('gpt-') && !m.startsWith('claude-')),
  opencode: AVAILABLE_MODELS.filter(m => m.includes('/')),
  codex:    AVAILABLE_MODELS.filter(m => m.startsWith('gpt-')),
};
import { syncAgentFile } from '../engine/agent-fs.js';

export function setupWebRoutes(app, db, root, dashboard) {
  // Health
  app.get('/health', (_req, res) => res.json({ status: 'ok', version: readVersion() }));

  // ---- REST API (hooks + dashboard) ----
  app.get('/api/pipeline', (_req, res) => {
    const p = getPipeline(db); const gates = GATES.map(g => ({ gate: g, passed: getCheckpoints(db, g).length > 0, artifacts: findGateArtifacts(getDocsDir(root), g) }));
    const current = gates.find(g => !g.passed)?.gate || 'Complete';
    res.json({ current_gate: current, completed: gates.filter(g => g.passed).map(g => g.gate), gates, _display: formatGateDisplay(gates, current) });
  });

  app.get('/api/gate/:gate/enforce', (req, res) => {
    const gate = req.params.gate.replace(/_/g, ' ');
    const artifacts = findGateArtifacts(getDocsDir(root), gate);
    const checkpoints = getCheckpoints(db, gate);
    const allowed = artifacts.length > 0 || checkpoints.length > 0;
    res.json({ gate, allowed, artifacts, checkpoints: checkpoints.map(c => c.passed_at), ...(allowed ? {} : { blocked: true, required: GATE_CHECKS[gate]?.check || '' }) });
  });

  app.post('/api/gate/advance', (req, res) => {
    const pstate = getPipeline(db); const currentGate = pstate?.current_gate || 'Gate A';
    const currentIdx = GATES.indexOf(currentGate); const targetIdx = currentIdx + 1;
    if (targetIdx >= GATES.length) return res.json({ allowed: false, error: 'Pipeline complete' });
    const targetGate = GATES[targetIdx];
    const artifacts = findGateArtifacts(getDocsDir(root), currentGate);
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

  const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

  app.get('/api/agents', (req, res) => {
    const cfg = getAgentConfig(db);
    const platform = req.query.platform;
    let list = AGENT_LIST.map(a => {
      const c = cfg[a.id];
      return { ...a, model: c?.model || a.defaultModel, effort: c?.effort || a.defaultEffort || 'high', is_custom: !!c };
    });
    if (platform) list = list.filter(a => a.platform === platform);
    res.json({ agents: list, available_models: AVAILABLE_MODELS, available_efforts: EFFORTS, platforms: [...new Set(AGENT_LIST.map(a=>a.platform))], platform_models: PLATFORM_MODELS });
  });

  app.post('/api/agents', (req, res) => {
    const { agent_id, model, effort } = req.body;
    if (!agent_id || !model) return res.status(400).json({ error: 'agent_id and model required' });
    if (effort && !EFFORTS.includes(effort)) return res.status(400).json({ error: `Unknown effort. Valid: ${EFFORTS.join(', ')}` });

    // 查找 agent 所属平台，校验模型格式
    const agent = AGENT_LIST.find(a => a.id === agent_id);
    if (agent) {
      const validModels = PLATFORM_MODELS[agent.platform] || AVAILABLE_MODELS;
      if (validModels.length > 0 && !validModels.includes(model)) {
        // 自定义模型允许，但给提示
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
    const checkpoints = getCheckpoints(db);
    const cpGateMap = {}; for (const c of checkpoints) cpGateMap[c.gate] = c;
    const gates = GATES.map(g => ({ gate: g, passed: !!cpGateMap[g], checkpoints: cpGateMap[g] ? [cpGateMap[g]] : [], artifacts: findGateArtifacts(getDocsDir(root), g), requirement: GATE_CHECKS[g]?.check || '' }));
    const current = gates.find(g => !g.passed)?.gate || 'Complete';
    const completed = gates.filter(g => g.passed).map(g => g.gate);
    const pct = Math.round(completed.length / gates.length * 100);
    const data = JSON.stringify({ project: root, current_gate: current, completed, progress: pct, gates, _display: formatGateDisplay(gates, current) });
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
