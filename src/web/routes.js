import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';
import { streamSSE } from 'hono/streaming';
import { getPipeline, getCheckpoints, addCheckpoint, updatePipelineGate, getSessions, getAllPipelines, getAgentConfig, setAgentModel, resumeSession, markStaleSessions, getSessionRuns } from '../engine/db.js';
import { GATES, GATE_CHECKS, GATE_DIRS, AGENT_LIST, AVAILABLE_MODELS, findGateArtifacts, formatGateDisplay, getPipelineGates, getPipelineName, DEFAULT_PIPELINE } from '../engine/gates.js';
import { getAgentList, getPlatformModels, getCategories, getAgentsByPlatform, getPlatforms } from '../engine/agent-registry.js';
import { syncAgentFile } from '../engine/agent-fs.js';

const SESSION_TIMEOUT = 7_200_000; // 2小时无活动 → inactive

/** 按平台分组可用模型 */
const PLATFORM_MODELS = getPlatformModels();

/** SSE 客户端集合：存储 { stream, db, root } 引用 */
let sseClients = [];
let sseDbRef = null;
let sseRootRef = null;
let _sseTimer = null;

/**
 * 向所有 SSE 客户端广播最新会话数据
 * 由外部 setInterval 调用
 */
export function broadcastSSE() {
  if (sseClients.length === 0) return;
  const sessions = getSessions(sseDbRef);
  const data = JSON.stringify({
    sessions: sessions.map(s => {
      const p = getPipeline(sseDbRef, s.id);
      return {
        id: s.id,
        platform: s.platform,
        role: s.role,
        gate: p?.current_gate || '?',
        pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE,
        status: s.status,
      };
    }),
    count: sessions.length,
  });
  const stale = [];
  for (const client of sseClients) {
    try {
      client.writeSSE({ data }).catch(() => stale.push(client));
    } catch { stale.push(client); }
  }
  if (stale.length > 0) {
    sseClients = sseClients.filter(c => !stale.includes(c));
  }
}

export function setupApiRoutes(app, db, root) {
  // 保存 SSE 引用
  sseDbRef = db;
  sseRootRef = root;

  // Health
  app.get('/health', (c) => c.json({ status: 'ok', version: readVersion() }));

  // 引擎状态 + MCP 平台接入信息
  app.get('/api/status', (c) => {
    markStaleSessions(db, SESSION_TIMEOUT);
    const allSessions = getSessions(db);
    const activeMap = {};
    for (const s of allSessions) {
      activeMap[s.platform] = (activeMap[s.platform] || 0) + (s.status === 'active' ? 1 : 0);
    }
    const connectedPlatforms = {};
    for (const p of ['claude', 'opencode', 'codex']) {
      const active = activeMap[p] || 0;
      const total = allSessions.filter(s => s.platform === p).length;
      connectedPlatforms[p] = {
        connected: active > 0,
        active_sessions: active,
        total_sessions: total,
      };
    }
    return c.json({
      status: 'ok',
      version: readVersion(),
      connected_platforms: connectedPlatforms,
      total_sessions: allSessions.length,
      platforms: getPlatforms(),
    });
  });

  // ---- REST API (hooks + dashboard) ----
  // 所有会话的合并流水线视图（Dashboard 用）
  app.get('/api/pipeline', (c) => {
    const sessions = getSessions(db);
    const sessionList = sessions.map(s => {
      const p = getPipeline(db, s.id);
      const pt = p?.pipeline_type || DEFAULT_PIPELINE;
      const gateList = getPipelineGates(pt);
      const gates = gateList.map(g => ({
        gate: g,
        passed: getCheckpoints(db, g, s.id).length > 0,
        artifacts: findGateArtifacts(getDocsDir(root), g),
      }));
      const current = gates.find(g => !g.passed)?.gate || 'Complete';
      return {
        session_id: s.id,
        platform: s.platform,
        status: s.status,
        pipeline_type: pt,
        pipeline_name: getPipelineName(pt),
        current_gate: current,
        completed: gates.filter(g => g.passed).map(g => g.gate),
        gates,
        _display: formatGateDisplay(gates, current),
      };
    });
    return c.json({ sessions: sessionList, active_count: sessions.length });
  });

  app.get('/api/gate/:gate/enforce', (c) => {
    const gate = c.req.param('gate').replace(/_/g, ' ');
    const artifacts = findGateArtifacts(getDocsDir(root), gate);
    const sid = c.req.query('session_id');
    if (!sid) return c.json({ error: 'session_id query parameter required' }, 400);
    const checkpoints = getCheckpoints(db, gate, sid);
    const allowed = artifacts.length > 0 || checkpoints.length > 0;
    return c.json({
      gate,
      allowed,
      artifacts,
      checkpoints: checkpoints.map(cp => cp.passed_at),
      session_id: sid,
      ...(allowed ? {} : { blocked: true, required: GATE_CHECKS[gate]?.check || '' }),
    });
  });

  app.post('/api/gate/advance', async (c) => {
    const body = await c.req.json();
    const sid = body.session_id;
    if (!sid) return c.json({ error: 'session_id required in request body' }, 400);
    const pstate = getPipeline(db, sid);
    const pt = pstate?.pipeline_type || DEFAULT_PIPELINE;
    const gateList = getPipelineGates(pt);
    const currentGate = pstate?.current_gate || gateList[0];
    const currentIdx = gateList.indexOf(currentGate);
    const targetIdx = currentIdx + 1;
    if (targetIdx >= gateList.length) {
      return c.json({ allowed: false, error: 'Pipeline complete' });
    }
    const targetGate = gateList[targetIdx];
    const artifacts = findGateArtifacts(getDocsDir(root), currentGate);
    const checkpoints = getCheckpoints(db, currentGate, sid);
    if (artifacts.length === 0 && checkpoints.length === 0) {
      return c.json({ allowed: false, error: `Gate ${currentGate} conditions NOT met` });
    }
    addCheckpoint(db, currentGate, targetGate, sid);
    updatePipelineGate(db, sid, targetGate);
    return c.json({
      allowed: true,
      session_id: sid,
      pipeline_type: pt,
      previous: currentGate,
      current: targetGate,
      next: gateList[targetIdx + 1] || 'Complete',
    });
  });

  app.get('/api/sessions', (c) => {
    markStaleSessions(db, SESSION_TIMEOUT);
    const sessions = getSessions(db).map(s => {
      const p = getPipeline(db, s.id);
      return {
        id: s.id,
        platform: s.platform,
        role: s.role,
        gate: p?.current_gate || '?',
        pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE,
        heartbeat: s.last_heartbeat,
        status: s.status,
      };
    });
    return c.json({ sessions, count: sessions.length });
  });

  // 手动恢复 inactive 会话
  app.post('/api/sessions/:id/resume', (c) => {
    const sid = c.req.param('id');
    const s = getSessions(db).find(s => s.id === sid);
    if (!s) return c.json({ error: 'Session not found' }, 404);
    resumeSession(db, sid);
    const p = getPipeline(db, sid);
    return c.json({ ok: true, session_id: sid, status: 'active', gate: p?.current_gate || '?' });
  });

  // Session Model B: 查询 session 的所有 pipeline runs
  app.get('/api/pipeline-runs', (c) => {
    const sessionId = c.req.query('session_id');
    if (!sessionId) return c.json({ error: 'session_id query parameter required' }, 400);
    const runs = getSessionRuns(db, sessionId);
    return c.json({ runs, count: runs.length, session_id: sessionId });
  });

  const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

  app.get('/api/agents', (c) => {
    const cfg = getAgentConfig(db);
    const platform = c.req.query('platform');
    const category = c.req.query('category');
    const search = (c.req.query('search') || '').toLowerCase();
    // 每次请求动态扫描模板目录，不依赖缓存
    const agentList = getAgentList(true);
    const platformModels = getPlatformModels(true);
    let list = agentList.map(a => {
      const ac = cfg[a.id];
      return {
        ...a,
        model: ac?.model || a.defaultModel,
        effort: ac?.effort || a.defaultEffort || 'high',
        is_custom: !!ac,
      };
    });
    if (platform) list = list.filter(a => a.platform === platform);
    if (category && category !== '全部') list = list.filter(a => a.category === category);
    if (search) list = list.filter(a => a.name.toLowerCase().includes(search) || a.id.toLowerCase().includes(search) || a.role.toLowerCase().includes(search));
    return c.json({
      agents: list,
      available_models: [...AVAILABLE_MODELS],
      available_efforts: EFFORTS,
      platforms: [...new Set(agentList.map(a => a.platform))],
      platform_models: platformModels,
      categories: getCategories(),
      total_count: agentList.length,
    });
  });

  app.post('/api/agents', async (c) => {
    const body = await c.req.json();
    const { agent_id, model, effort } = body;
    if (!agent_id || !model) return c.json({ error: 'agent_id and model required' }, 400);
    if (effort && !EFFORTS.includes(effort)) {
      return c.json({ error: `Unknown effort. Valid: ${EFFORTS.join(', ')}` }, 400);
    }

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
    return c.json({ ok: true, agent_id, model, effort: effort || 'high', file_synced: fileSynced });
  });

  // ---- 平台信息 ----
  app.get('/api/platforms', (c) => {
    const platforms = getPlatforms();
    const models = getPlatformModels(true);
    const summary = {};
    for (const p of platforms) {
      const agents = getAgentsByPlatform(p, true);
      summary[p] = {
        agent_count: agents.length,
        available_models: models[p] || [],
        template_dir: `src/templates/platforms/${p}/`,
      };
    }
    return c.json({ platforms: summary, supported: platforms, total_agents: getAgentList(true).length });
  });

  // ---- SSE 事件流 ----
  app.get('/api/events', (c) => {
    return streamSSE(c, async (stream) => {
      const client = stream;
      sseClients.push(client);
      // 发送初始连接确认
      await client.writeSSE({ data: JSON.stringify({ connected: true }) });
      // 保活：每 8 秒检查一次，由 broadcastSSE 负责推送数据
      while (!client.aborted) {
        try { await client.sleep(8000); } catch { break; }
      }
      // 清理
      sseClients = sseClients.filter(c => c !== client);
    });
  });

  // 启动 SSE 广播定时器（每 8 秒推送一次会话数据）
  if (_sseTimer) clearInterval(_sseTimer);
  _sseTimer = setInterval(() => { broadcastSSE(); }, 8000);
}

function getDocsDir(root) { return resolve(root, 'docs'); }

/** 从 package.json 读取版本号 */
function readVersion() {
  try {
    return JSON.parse(readFileSync(resolve(import.meta.dirname, '..', '..', 'package.json'), 'utf-8')).version;
  } catch {
    return '?.?.?';
  }
}
