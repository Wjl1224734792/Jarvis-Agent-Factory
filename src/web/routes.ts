import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { streamSSE } from 'hono/streaming';
import { getPipeline, getCheckpoints, addCheckpoint, updatePipelineGate, getSessions, getAgentConfig, setAgentModel, resumeSession, markStaleSessions, getSessionRuns, setRunTaskName, getActiveRun, archiveRun, unarchiveRun, getArchivedRuns, deleteRun, pinRun, unpinRun, insertArtifact } from '../engine/db.js';
import { GATE_CHECKS, AVAILABLE_MODELS, GATE_DIRS, findSessionGateArtifacts, formatGateDisplay, getPipelineGates, getPipelineName, DEFAULT_PIPELINE } from '../engine/gates.js';
import { getAgentList, getPlatformModels, getCategories, getAgentsByPlatform, getPlatforms, scanAllProjectAgents } from '../engine/agent-registry.js';
import { syncAgentFile } from '../engine/agent-fs.js';

const SESSION_TIMEOUT = 7_200_000; // 2小时无活动 → inactive


type SSEClient = { stream: any; db: any; root: string; aborted: boolean; writeSSE: (_data: any) => Promise<void>; sleep: (_ms: number) => Promise<void> };

/** SSE 客户端集合：存储 { stream, db, root } 引用 */
let sseClients: SSEClient[] = [];
let sseDbRef: any = null;
let _sseTimer: ReturnType<typeof setInterval> | null = null;

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
      const run = getActiveRun(sseDbRef, s.id);
      return {
        id: s.id,
        platform: s.platform,
        role: s.role,
        gate: p?.current_gate || '?',
        pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE,
        status: s.status,
        task_name: run?.task_name || null,
        run_id: run?.id || null,
        pinned: run?.pinned || 0,
        heartbeat: s.last_heartbeat || null,
        latest_run_started_at: s.latest_run_started_at || null,
      };
    }),
    count: sessions.length,
  });
  const stale: SSEClient[] = [];
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
  // 保存 SSE db 引用
  sseDbRef = db;

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
      const run = getActiveRun(db, s.id);
      // 根据 pipeline 状态的 current_gate 确定当前 Gate 在序列中的位置
      const currentGate = p?.current_gate;
      let currentIdx = currentGate != null ? gateList.indexOf(currentGate) : -1;
      if (currentIdx < 0) currentIdx = gateList.length; // 无当前 Gate（已完成等），全部视为已过 Gate
      const gates = gateList.map((g, idx) => {
        const cpList = getCheckpoints(db, g, s.id);
        const cp = cpList.length > 0 ? cpList[0] : null;
        // 按 Gate 在序列中的位置分情形计算 entered_at
        let enteredAt;
        if (idx === 0) {
          // Gate A（首个 Gate）：使用 run.started_at
          enteredAt = run?.started_at || null;
        } else if (idx > 0 && idx < currentIdx) {
          // 已通过的后续 Gate：使用前一个 Gate 的 checkpoint.passed_at 作为近似进入时间
          const prevCpList = getCheckpoints(db, gateList[idx - 1], s.id);
          const prevCp = prevCpList.length > 0 ? prevCpList[0] : null;
          enteredAt = prevCp?.passed_at || null;
        } else if (idx === currentIdx) {
          // 当前 Gate：使用 run.gate_entered_at
          enteredAt = run?.gate_entered_at || null;
        } else {
          // 未到达的 Gate：null
          enteredAt = null;
        }
        return {
          gate: g,
          passed: cp !== null,
          artifacts: findSessionGateArtifacts(getDocsDir(root), g, s.id, db, run?.id),
          entered_at: enteredAt,
          duration_seconds: cp?.duration_seconds ?? null,
          duration_display: cp?.duration_seconds != null ? formatDuration(cp.duration_seconds) : null,
        };
      });
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
    const sid = c.req.query('session_id');
    const run = getActiveRun(db, sid);
    const artifacts = sid ? findSessionGateArtifacts(getDocsDir(root), gate, sid, db, run?.id) : [];
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
    const run = getActiveRun(db, sid);
    const artifacts = findSessionGateArtifacts(getDocsDir(root), currentGate, sid, db, run?.id);
    const checkpoints = getCheckpoints(db, currentGate, sid);
    if (artifacts.length === 0 && checkpoints.length === 0) {
      return c.json({ allowed: false, error: `Gate ${currentGate} conditions NOT met` });
    }
    addCheckpoint(db, currentGate, targetGate, sid);
    updatePipelineGate(db, sid, targetGate);
    // 扫描当前 Gate 产物目录，写入 artifacts 表（失败不阻塞推进）
    if (run) {
      try {
        const gateSubdir = GATE_DIRS[currentGate];
        if (gateSubdir) {
          const artifactDir = join(getDocsDir(root), gateSubdir);
          if (existsSync(artifactDir)) {
            const mdFiles = readdirSync(artifactDir).filter(f => f.endsWith('.md'));
            for (const f of mdFiles) {
              insertArtifact(db, run.id, currentGate, `${gateSubdir}/${f}`);
            }
          }
        }
      } catch (e) {
        console.warn(`[artifact-scan] 扫描 ${currentGate} 产物失败:`, e.message);
      }
    }
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
      const run = getActiveRun(db, s.id);
      return {
        id: s.id,
        platform: s.platform,
        role: s.role,
        gate: p?.current_gate || '?',
        pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE,
        heartbeat: s.last_heartbeat,
        status: s.status,
        task_name: run?.task_name || null,
        run_id: run?.id || null,
        pinned: run?.pinned || 0,
        latest_run_started_at: s.latest_run_started_at || null,
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
    const runsWithDuration = runs.map(r => ({
      ...r,
      total_duration_display: r.total_duration_seconds != null ? formatDuration(r.total_duration_seconds) : null,
    }));
    return c.json({ runs: runsWithDuration, count: runsWithDuration.length, session_id: sessionId });
  });

  // Session Model B: 设置/清除 pipeline run 的任务名
  app.patch('/api/pipeline-runs/:id/name', async (c) => {
    const runId = c.req.param('id');
    const body = await c.req.json();
    const taskName = typeof body.task_name === 'string' ? body.task_name : '';
    const result = setRunTaskName(db, runId, taskName);
    if (!result.ok) return c.json(result, 404);
    return c.json(result);
  });

  // ---- Run 归档 API ----

  /** 归档 run */
  app.post('/api/pipeline-runs/:id/archive', (c) => {
    const runId = c.req.param('id');
    const result = archiveRun(db, runId);
    if (!result.ok) return c.json({ ok: false, error: `Run not found: ${runId}` }, 404);
    return c.json({ ok: true });
  });

  /** 取消归档 run */
  app.post('/api/pipeline-runs/:id/unarchive', (c) => {
    const runId = c.req.param('id');
    const result = unarchiveRun(db, runId);
    if (!result.ok) return c.json({ ok: false, error: `Run not found: ${runId}` }, 404);
    return c.json({ ok: true });
  });

  // ---- Run 置顶 API ----

  /** 置顶 run */
  app.post('/api/pipeline-runs/:id/pin', (c) => {
    const runId = c.req.param('id');
    const result = pinRun(db, runId);
    if (!result.ok) return c.json({ ok: false, error: `Run not found: ${runId}` }, 404);
    return c.json({ ok: true });
  });

  /** 取消置顶 run */
  app.post('/api/pipeline-runs/:id/unpin', (c) => {
    const runId = c.req.param('id');
    const result = unpinRun(db, runId);
    if (!result.ok) return c.json({ ok: false, error: `Run not found: ${runId}` }, 404);
    return c.json({ ok: true });
  });

  /** 获取所有已归档 run */
  app.get('/api/pipeline-runs/archived', (c) => {
    const runs = getArchivedRuns(db);
    return c.json({ runs, count: runs.length });
  });

  /** 硬删除 run */
  app.delete('/api/pipeline-runs/:id', (c) => {
    const runId = c.req.param('id');
    const result = deleteRun(db, runId);
    if (!result.ok) return c.json({ ok: false, error: `Run not found: ${runId}` }, 404);
    return c.json({ ok: true });
  });

  const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

  app.get('/api/agents', (c) => {
    const cfg = getAgentConfig(db);
    const platform = c.req.query('platform');
    const category = c.req.query('category');
    const source = c.req.query('source'); // template | global | project
    const search = (c.req.query('search') || '').toLowerCase();
    // 模板默认 + 全局用户配置
    const agentList = getAgentList(true, root);
    // 所有已激活项目的项目级智能体
    const projectAgents = scanAllProjectAgents(db);
    // 合并：模板+全局 去重后合并项目级
    const projectIds = new Set(projectAgents.map(a => a.id));
    const baseList = agentList.filter(a => !projectIds.has(a.id));
    const allAgents = [...baseList, ...projectAgents];

    const platformModels = getPlatformModels(true);
    let list = allAgents.map(a => {
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
    if (source) list = list.filter(a => (a.source || 'template') === source);
    if (search) list = list.filter(a => a.name.toLowerCase().includes(search) || a.id.toLowerCase().includes(search) || a.role.toLowerCase().includes(search));
    // 统计各来源数量
    const sourceCounts: Record<string, number> = { '模板默认': 0, '全局配置': 0 };
    for (const a of allAgents) {
      const cat = a.category || '模板默认';
      sourceCounts[cat] = (sourceCounts[cat] || 0) + 1;
    }
    // 项目名称（从项目根目录提取）
    const projectName = ((root || '').split(/[\\/]/).filter(Boolean).pop() || 'unknown');
    return c.json({
      agents: list,
      available_models: [...AVAILABLE_MODELS],
      available_efforts: EFFORTS,
      platforms: [...new Set(allAgents.map(a => a.platform))],
      platform_models: platformModels,
      categories: getCategories(db),
      total_count: allAgents.length,
      source_counts: sourceCounts,
      project_name: projectName,
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

  // ---- Docs 读取 ----
  app.get('/api/docs/:filepath{.*}', (c) => {
    const filepath = decodeURIComponent(c.req.param('filepath'));

    // 拒绝空路径
    if (!filepath || filepath === '/') {
      return c.json({ error: 'File path required' }, 400);
    }

    // 路径遍历防护（优先级高于文件扩展名检查）
    const docsDir = resolve(root, 'docs');
    const resolvedPath = resolve(docsDir, filepath);
    if (!resolvedPath.startsWith(docsDir)) {
      return c.json({ error: 'Path traversal not allowed' }, 400);
    }

    // 拒绝非 .md 文件
    if (!filepath.endsWith('.md')) {
      return c.json({ error: 'Only .md files allowed' }, 400);
    }

    // 文件存在性检查
    if (!existsSync(resolvedPath)) {
      return c.json({ error: 'File not found' }, 404);
    }

    const content = readFileSync(resolvedPath, 'utf-8');
    return c.text(content, 200, { 'Content-Type': 'text/plain; charset=utf-8' });
  });

  // ---- SSE 事件流 ----
  app.get('/api/events', (c) => {
    return streamSSE(c, async (stream) => {
      const client = stream as unknown as SSEClient;
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

/**
 * 将秒数格式化为人类可读的中文持续时间字符串
 * @param {number|null|undefined} seconds
 * @returns {string|null}
 * @example formatDuration(3661) => "1小时1分1秒"
 * @example formatDuration(30) => "30秒"
 * @example formatDuration(null) => null
 */
function formatDuration(seconds) {
  if (seconds == null || seconds < 0) return null;
  const s = Math.floor(seconds);
  if (s < 60) return `${s}秒`;
  const minutes = Math.floor(s / 60);
  const secs = s % 60;
  if (minutes < 60) {
    return secs > 0 ? `${minutes}分${secs}秒` : `${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  let result = `${hours}小时`;
  if (mins > 0) result += `${mins}分`;
  if (secs > 0) result += `${secs}秒`;
  return result;
}

/** 从 package.json 读取版本号 */
function readVersion() {
  try {
    return JSON.parse(readFileSync(resolve(import.meta.dirname, '..', '..', 'package.json'), 'utf-8')).version;
  } catch {
    return '?.?.?';
  }
}
