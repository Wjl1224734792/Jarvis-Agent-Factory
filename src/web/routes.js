import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';
import { getPipeline, getCheckpoints, addCheckpoint, updatePipelineGate, getSessions, getAllPipelines, getAgentConfig, setAgentModel, resumeSession, markStaleSessions } from '../engine/db.js';
import { GATES, GATE_CHECKS, GATE_DIRS, AGENT_LIST, AVAILABLE_MODELS, findGateArtifacts, formatGateDisplay, getPipelineGates, getPipelineName, DEFAULT_PIPELINE } from '../engine/gates.js';
import { getAgentList, getPlatformModels, getCategories, getAgentsByPlatform, getPlatforms } from '../engine/agent-registry.js';
import { syncAgentFile } from '../engine/agent-fs.js';

/** 按平台分组可用模型 */
const PLATFORM_MODELS = getPlatformModels();

export function setupApiRoutes(app, db, root) {
  // Health
  app.get('/health', (_req, res) => res.json({ status: 'ok', version: readVersion() }));

  // 引擎状态 + MCP 平台接入信息
  app.get('/api/status', (_req, res) => {
    markStaleSessions(db, 600_000);
    const sessions = getSessions(db, 'active');
    const connectedPlatforms = {};
    for (const p of ['claude', 'opencode', 'codex']) {
      const platformSessions = sessions.filter(s => s.platform === p);
      connectedPlatforms[p] = {
        connected: platformSessions.length > 0,
        active_sessions: platformSessions.length,
      };
    }
    res.json({
      status: 'ok',
      version: readVersion(),
      connected_platforms: connectedPlatforms,
      total_sessions: sessions.length,
      platforms: getPlatforms(),
    });
  });

  // ---- REST API (hooks + dashboard) ----
  // 所有会话的合并流水线视图（Dashboard 用）
  app.get('/api/pipeline', (_req, res) => {
    const sessions = getSessions(db, 'active');
    const sessionList = sessions.map(s => {
      const p = getPipeline(db, s.id);
      const pt = p?.pipeline_type || DEFAULT_PIPELINE;
      const gateList = getPipelineGates(pt);
      const gates = gateList.map(g => ({ gate: g, passed: getCheckpoints(db, g, s.id).length > 0, artifacts: findGateArtifacts(getDocsDir(root), g) }));
      const current = gates.find(g => !g.passed)?.gate || 'Complete';
      return { session_id: s.id, platform: s.platform, status: s.status, pipeline_type: pt, pipeline_name: getPipelineName(pt), current_gate: current, completed: gates.filter(g => g.passed).map(g => g.gate), gates, _display: formatGateDisplay(gates, current) };
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
    const pt = pstate?.pipeline_type || DEFAULT_PIPELINE;
    const gateList = getPipelineGates(pt);
    const currentGate = pstate?.current_gate || gateList[0];
    const currentIdx = gateList.indexOf(currentGate); const targetIdx = currentIdx + 1;
    if (targetIdx >= gateList.length) return res.json({ allowed: false, error: 'Pipeline complete' });
    const targetGate = gateList[targetIdx];
    const artifacts = findGateArtifacts(getDocsDir(root), currentGate);
    const checkpoints = getCheckpoints(db, currentGate, sid);
    if (artifacts.length === 0 && checkpoints.length === 0) return res.json({ allowed: false, error: `Gate ${currentGate} conditions NOT met` });
    addCheckpoint(db, currentGate, targetGate, sid);
    updatePipelineGate(db, sid, targetGate);
    res.json({ allowed: true, session_id: sid, pipeline_type: pt, previous: currentGate, current: targetGate, next: gateList[targetIdx + 1] || 'Complete' });
  });

  app.get('/api/sessions', (_req, res) => {
    markStaleSessions(db, 600_000);
    const sessions = getSessions(db).map(s => {
      const p = getPipeline(db, s.id);
      return { id: s.id, platform: s.platform, role: s.role, gate: p?.current_gate || '?', pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE, heartbeat: s.last_heartbeat, status: s.status };
    });
    res.json({ sessions, count: sessions.length });
  });

  // 手动恢复 inactive 会话
  app.post('/api/sessions/:id/resume', (req, res) => {
    const sid = req.params.id;
    const s = getSessions(db).find(s => s.id === sid);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    resumeSession(db, sid);
    const p = getPipeline(db, sid);
    res.json({ ok: true, session_id: sid, status: 'active', gate: p?.current_gate || '?' });
  });

  const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

  app.get('/api/agents', (req, res) => {
    const cfg = getAgentConfig(db);
    const platform = req.query.platform;
    const category = req.query.category;
    const search = (req.query.search || '').toLowerCase();
    // 每次请求动态扫描模板目录，不依赖缓存
    const agentList = getAgentList(true);
    const platformModels = getPlatformModels(true);
    let list = agentList.map(a => {
      const c = cfg[a.id];
      return { ...a, model: c?.model || a.defaultModel, effort: c?.effort || a.defaultEffort || 'high', is_custom: !!c };
    });
    if (platform) list = list.filter(a => a.platform === platform);
    if (category && category !== '全部') list = list.filter(a => a.category === category);
    if (search) list = list.filter(a => a.name.toLowerCase().includes(search) || a.id.toLowerCase().includes(search) || a.role.toLowerCase().includes(search));
    res.json({
      agents: list,
      available_models: [...AVAILABLE_MODELS],
      available_efforts: EFFORTS,
      platforms: [...new Set(agentList.map(a=>a.platform))],
      platform_models: platformModels,
      categories: getCategories(),
      total_count: agentList.length,
    });
  });

  app.post('/api/agents', (req, res) => {
    const { agent_id, model, effort } = req.body;
    if (!agent_id || !model) return res.status(400).json({ error: 'agent_id and model required' });
    if (effort && !EFFORTS.includes(effort)) return res.status(400).json({ error: `Unknown effort. Valid: ${EFFORTS.join(', ')}` });

    const agent = getAgentList().find(a => a.id === agent_id);
    if (agent) {
      const pModels = getPlatformModels();
      const validModels = pModels[agent.platform] || [];
      if (validModels.length > 0 && !validModels.includes(model)) {
        console.log(`  ⚠️  ${agent_id}: 自定义模型 "${model}"（不在 ${agent.platform} 预设列表中）`);
      }
    }

    setAgentModel(db, agent_id, model, effort || 'high');
    const fileSynced = syncAgentFile(root, agent_id, model, effort || 'high');
    res.json({ ok: true, agent_id, model, effort: effort || 'high', file_synced: fileSynced });
  });

  // ---- 平台信息 ----
  app.get('/api/platforms', (_req, res) => {
    const platforms = getPlatforms();
    const models = getPlatformModels(true);
    const summary = {};
    for (const p of platforms) {
      const agents = getAgentsByPlatform(p, true);
      summary[p] = { agent_count: agents.length, available_models: models[p] || [], template_dir: `src/templates/platforms/${p}/` };
    }
    res.json({ platforms: summary, supported: platforms, total_agents: getAgentList(true).length });
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
    const data = JSON.stringify({ sessions: sessions.map(s => {
        const p = getPipeline(db, s.id);
        return { id: s.id, platform: s.platform, role: s.role, gate: p?.current_gate || '?', pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE, status: s.status };
      }), count: sessions.length });
    for (const c of sseClients) c.write(`data: ${data}\n\n`);
  }, 8000);
}

function getDocsDir(root) { return resolve(root, 'docs'); }
function readVersion() { try { return JSON.parse(readFileSync(resolve(import.meta.dirname, '..', '..', 'package.json'), 'utf-8')).version; } catch { return '?.?.?'; } }
