import { existsSync, readFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { streamSSE } from 'hono/streaming';
import { getPipeline, getCheckpoints, addCheckpoint, updatePipelineGate, getSessions, getAgentConfig, setAgentModel, resumeSession, markStaleSessions, getSessionRuns, setRunTaskName, getActiveRun, archiveRun, unarchiveRun, getArchivedRuns, deleteRun, deleteSession, pinRun, unpinRun, insertArtifact, updateRunGate, updateRunGateEnteredAt, getPipelineRun, getArtifactsByRun, getArtifactsByRunAndGate } from '../engine/db.js';
import { GATE_CHECKS, GATE_DIRS, findSessionGateArtifacts, formatGateDisplay, getPipelineGates, getPipelineName, DEFAULT_PIPELINE, getAvailableModels } from '../engine/gates.js';
import { getAgentList, getPlatformModels, getCategories, getAgentsByPlatform, getPlatforms, scanAllProjectAgents, getAgentModelValues } from '../engine/agent-registry.js';
import { syncAgentFile } from '../engine/agent-fs.js';
import { getPubSub, emitEvent, incrementBroadcastCount } from '../engine/pubsub.js';
import type { PubSubEventType } from '../engine/pubsub.js';
import { listWikiPages, readWikiPage } from '../engine/wiki-store.js';
import { readPackageVersion } from '../shared/package-version.js';
import { parseFrontmatter } from '../shared/markdown-utils.js';

const SESSION_TIMEOUT = 7_200_000; // 2小时无活动 → inactive


type SSEClient = { stream: any; db: any; root: string; aborted: boolean; writeSSE: (_data: any) => Promise<void>; sleep: (_ms: number) => Promise<void> };

/** SSE 客户端集合：存储 { stream, db, root } 引用 */
export let sseClients: SSEClient[] = [];
let sseDbRef: any = null;
let _sseTimer: ReturnType<typeof setInterval> | null = null;
/** SSE 广播锁：防止并发广播时的竞态条件 */
let _broadcasting = false;
// TASK-002: 事件驱动广播去抖状态
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
let _debounceStart = 0;
const DEBOUNCE_DELAY = 500;
const MAX_WAIT = 2000;

/**
 * 停止 SSE 广播（清理定时器和去抖状态，测试隔离用）
 */
export function stopSSEBroadcast(): void {
  if (_sseTimer) { clearInterval(_sseTimer); _sseTimer = null; }
  if (_debounceTimer) { clearTimeout(_debounceTimer); _debounceTimer = null; }
  _debounceStart = 0;
}

/**
 * 去抖广播处理器：500ms 去抖，maxWait=2000ms 上限
 * 被 PubSub 事件触发，聚合多次事件为一次广播
 */
function _debouncedBroadcast(): void {
  const now = Date.now();

  if (!_debounceStart) {
    _debounceStart = now;
  }

  if (_debounceTimer) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }

  const elapsed = now - _debounceStart;
  const safeDelay = Math.min(DEBOUNCE_DELAY, MAX_WAIT - elapsed);

  if (safeDelay <= 0) {
    // maxWait 已达，立即广播
    _debounceStart = 0;
    broadcastSSE();
    return;
  }

  _debounceTimer = setTimeout(() => {
    _debounceStart = 0;
    _debounceTimer = null;
    broadcastSSE();
  }, safeDelay);
}

/**
 * 初始化 PubSub 事件监听（去抖广播）
 * 四种事件类型均触发去抖广播
 */
function _initPubSubListeners(): void {
  const ee = getPubSub();
  const eventTypes: PubSubEventType[] = [
    'session:changed', 'run:changed', 'gate:advanced', 'agent:event',
  ];
  for (const type of eventTypes) {
    // 先移除再注册，避免重复监听
    ee.off(type, _debouncedBroadcast);
    ee.on(type, _debouncedBroadcast);
  }
}

/**
 * 向所有 SSE 客户端广播最新会话数据
 * 由外部 setInterval 或 PubSub 事件驱动调用
 */
export function broadcastSSE() {
  if (_broadcasting) return; // 跳过并发广播
  _broadcasting = true;
  try {
  incrementBroadcastCount();
  if (sseClients.length === 0) return;
  const sessions = getSessions(sseDbRef);
  // TASK-002: 计算连接平台状态（仅 claude）
  const activeMap: Record<string, number> = {};
  for (const s of sessions) {
    activeMap[s.platform] = (activeMap[s.platform] || 0) + (s.status === 'active' ? 1 : 0);
  }
  const connectedPlatforms: Record<string, any> = {};
  for (const p of ['claude']) {
    const active = activeMap[p] || 0;
    const total = sessions.filter(s => s.platform === p).length;
    connectedPlatforms[p] = {
      connected: active > 0,
      active_sessions: active,
      total_sessions: total,
    };
  }

  // TASK-002: 查找最新活跃 session 用于 pipeline 上下文
  let latestSession: any = null;
  let latestTime = 0;
  for (const s of sessions) {
    const t = s.latest_run_started_at ? new Date(s.latest_run_started_at).getTime() : 0;
    if (t >= latestTime) {
      latestTime = t;
      latestSession = s;
    }
  }
  const pipeline = latestSession ? (getPipeline(sseDbRef, latestSession.id) ?? null) : null;
  const pipelineRuns = latestSession
    ? getSessionRuns(sseDbRef, latestSession.id).map(r => ({
        ...r,
        total_duration_display:
          r.total_duration_seconds != null ? formatDuration(r.total_duration_seconds) : null,
      }))
    : [];

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
    connected_platforms: connectedPlatforms,
    pipeline,
    pipeline_runs: pipelineRuns,
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
  } finally {
    _broadcasting = false;
  }
}

export function setupApiRoutes(app, db, root) {
  // 保存 SSE db 引用
  sseDbRef = db;

  // TASK-002: 初始化 PubSub 事件监听（去抖广播）
  _initPubSubListeners();

  // Health
  app.get('/health', (c) => c.json({ status: 'ok', version: readVersion() }));

  // Dashboard 数据统计
  app.get('/api/dashboard-stats', (c) => {
    markStaleSessions(db, SESSION_TIMEOUT);
    const allSessions = getSessions(db);
    const activeSessions = allSessions.filter(s => s.status === 'active');
    const inactiveSessions = allSessions.filter(s => s.status === 'inactive');

    // Pipeline 统计
    const pipelineTypeCounts: Record<string, number> = {};
    for (const s of allSessions) {
      const p = getPipeline(db, s.id);
      const pt = p?.pipeline_type || 'full';
      pipelineTypeCounts[pt] = (pipelineTypeCounts[pt] || 0) + 1;
    }

    // Run 统计
    const runStats = db.prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status='aborted' THEN 1 ELSE 0 END) as aborted, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM pipeline_runs"
    ).get();

    // Agent 配置统计
    const agentCfg = getAgentConfig(db);
    const configuredAgents = Object.keys(agentCfg).length;

    // Gate 分布
    const gateDistribution: Record<string, number> = {};
    for (const s of allSessions) {
      const p = getPipeline(db, s.id);
      const g = p?.current_gate || '?';
      gateDistribution[g] = (gateDistribution[g] || 0) + 1;
    }

    return c.json({
      sessions: { total: allSessions.length, active: activeSessions.length, inactive: inactiveSessions.length },
      runs: runStats || { total: 0, completed: 0, aborted: 0, active: 0 },
      pipelines: pipelineTypeCounts,
      gate_distribution: gateDistribution,
      configured_agents: configuredAgents,
      project: root.split(/[\\/]/).filter(Boolean).pop() || 'unknown',
      timestamp: new Date().toISOString(),
    });
  });

  // 引擎状态 + MCP 平台接入信息
  app.get('/api/status', (c) => {
    markStaleSessions(db, SESSION_TIMEOUT);
    const allSessions = getSessions(db);
    const activeMap = {};
    for (const s of allSessions) {
      activeMap[s.platform] = (activeMap[s.platform] || 0) + (s.status === 'active' ? 1 : 0);
    }
    const connectedPlatforms = {};
    for (const p of ['claude']) {
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
          artifacts: findSessionGateArtifacts(getArtifactsDir(root), g, s.id, db, run?.id),
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
    const artifacts = sid ? findSessionGateArtifacts(getArtifactsDir(root), gate, sid, db, run?.id) : [];
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
    const artifacts = findSessionGateArtifacts(getArtifactsDir(root), currentGate, sid, db, run?.id);
    const checkpoints = getCheckpoints(db, currentGate, sid);
    if (artifacts.length === 0 && checkpoints.length === 0) {
      return c.json({ allowed: false, error: `Gate ${currentGate} conditions NOT met` });
    }
    // TASK-003: 计算当前 Gate 耗时（进入时间 → 现在），与 MCP advance_gate 保持一致
    let durationSeconds: number | null = null;
    if (run) {
      const enteredRow = db.prepare("SELECT strftime('%s', gate_entered_at) AS entered_epoch FROM pipeline_runs WHERE id=?").get(run.id);
      if (enteredRow?.entered_epoch) {
        const enteredEpoch = Number(enteredRow.entered_epoch);
        durationSeconds = Math.floor(Date.now() / 1000) - enteredEpoch;
      }
    }
    addCheckpoint(db, currentGate, targetGate, sid, durationSeconds ?? undefined);
    updatePipelineGate(db, sid, targetGate);
    // TASK-003: 同步更新 pipeline_runs 中的 current_gate 和新 Gate 进入时间
    if (run) {
      updateRunGate(db, run.id, targetGate);
      updateRunGateEnteredAt(db, run.id, new Date().toISOString());
    }
    // 扫描当前 Gate 产物目录，写入 artifacts 表（失败不阻塞推进）
    if (run) {
      try {
        const gateSubdir = GATE_DIRS[currentGate];
        if (gateSubdir) {
          const dateDir = run.started_at?.slice(0, 10) || null;
          // 优先扫描日期目录 .jarvis/{dateDir}/{gateSubdir}/
          if (dateDir) {
            const dateArtifactDir = join(getArtifactsDir(root), dateDir, gateSubdir);
            if (existsSync(dateArtifactDir)) {
              const mdFiles = readdirSync(dateArtifactDir).filter(f => f.endsWith('.md'));
              for (const f of mdFiles) {
                insertArtifact(db, run.id, currentGate, `${dateDir}/${gateSubdir}/${f}`);
              }
            }
          }
        }
      } catch (e) {
        console.warn(`[artifact-scan] 扫描 ${currentGate} 产物失败:`, String(e));
      }
    }
    // TASK-005: 发布 Gate 推进事件
    emitEvent('gate:advanced', { sessionId: sid, runId: run?.id, gate: targetGate, previousGate: currentGate });
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
    // TASK-005: 发布 session 变更事件
    emitEvent('session:changed', { sessionId: sid, action: 'resume' });
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
    const run = getPipelineRun(db, runId);
    const result = setRunTaskName(db, runId, taskName);
    if (!result.ok) return c.json(result, 404);
    // TASK-005: 发布 run 变更事件
    emitEvent('run:changed', { runId, sessionId: run?.session_id, action: 'rename' });
    return c.json(result);
  });

  // ---- Run 归档 API ----

  /** 归档 run */
  app.post('/api/pipeline-runs/:id/archive', (c) => {
    const runId = c.req.param('id');
    const run = getPipelineRun(db, runId);
    const result = archiveRun(db, runId);
    if (!result.ok) return c.json({ ok: false, error: `Run not found: ${runId}` }, 404);
    // TASK-005: 发布 run 变更事件
    emitEvent('run:changed', { runId, sessionId: run?.session_id, action: 'archive' });
    return c.json({ ok: true });
  });

  /** 取消归档 run */
  app.post('/api/pipeline-runs/:id/unarchive', (c) => {
    const runId = c.req.param('id');
    const run = getPipelineRun(db, runId);
    const result = unarchiveRun(db, runId);
    if (!result.ok) return c.json({ ok: false, error: `Run not found: ${runId}` }, 404);
    // TASK-005: 发布 run 变更事件
    emitEvent('run:changed', { runId, sessionId: run?.session_id, action: 'unarchive' });
    return c.json({ ok: true });
  });

  // ---- Run 置顶 API ----

  /** 置顶 run */
  app.post('/api/pipeline-runs/:id/pin', (c) => {
    const runId = c.req.param('id');
    const run = getPipelineRun(db, runId);
    const result = pinRun(db, runId);
    if (!result.ok) return c.json({ ok: false, error: `Run not found: ${runId}` }, 404);
    // TASK-005: 发布 run 变更事件
    emitEvent('run:changed', { runId, sessionId: run?.session_id, action: 'pin' });
    return c.json({ ok: true });
  });

  /** 取消置顶 run */
  app.post('/api/pipeline-runs/:id/unpin', (c) => {
    const runId = c.req.param('id');
    const run = getPipelineRun(db, runId);
    const result = unpinRun(db, runId);
    if (!result.ok) return c.json({ ok: false, error: `Run not found: ${runId}` }, 404);
    // TASK-005: 发布 run 变更事件
    emitEvent('run:changed', { runId, sessionId: run?.session_id, action: 'unpin' });
    return c.json({ ok: true });
  });

  /** 获取 run 详情（含 gates + 文档列表） */
  app.get('/api/pipeline-runs/:id/detail', (c) => {
    const runId = c.req.param('id');
    const run = getPipelineRun(db, runId);
    if (!run) return c.json({ error: 'Run not found' }, 404);

    const pt = run.pipeline_type || DEFAULT_PIPELINE;
    const gateList = getPipelineGates(pt);
    const gates = gateList.map(g => {
      const cpList = getCheckpoints(db, g, run.session_id);
      const cp = cpList.length > 0 ? cpList[0] : null;
      const arts = getArtifactsByRunAndGate(db, runId, g);
      return {
        gate: g,
        passed: cp !== null,
        passed_at: cp?.passed_at || null,
        duration_seconds: cp?.duration_seconds ?? null,
        duration_display: cp?.duration_seconds != null ? formatDuration(cp.duration_seconds) : null,
        artifacts: arts.map(a => ({
          filepath: a.filepath,
          created_at: a.created_at,
        })),
      };
    });

    const allDocs = getArtifactsByRun(db, runId);
    const events = db.prepare ? db.prepare('SELECT * FROM session_events WHERE run_id=? ORDER BY created_at DESC LIMIT 20').all(runId) : [];

    return c.json({
      run: {
        ...run,
        total_duration_display: run.total_duration_seconds != null ? formatDuration(run.total_duration_seconds) : null,
      },
      gates,
      documents: allDocs.map(a => ({
        filepath: a.filepath,
        gate: a.gate,
        created_at: a.created_at,
      })),
      events: events || [],
      pipeline_name: getPipelineName(pt),
      pipeline_type: pt,
    });
  });

  /** 获取所有已归档 run */
  app.get('/api/pipeline-runs/archived', (c) => {
    const runs = getArchivedRuns(db);
    return c.json({ runs, count: runs.length });
  });

  /** 硬删除 run（若该 session 无其他 run 则同时删除 session） */
  app.delete('/api/pipeline-runs/:id', (c) => {
    const runId = c.req.param('id');
    const run = getPipelineRun(db, runId);
    const result = deleteRun(db, runId);
    if (!result.ok) return c.json({ ok: false, error: `Run not found: ${runId}` }, 404);
    // TASK-005: 发布 run 删除事件（在 deleteRun 前捕获 sessionId）
    if (run?.session_id) {
      emitEvent('run:changed', { runId, sessionId: run.session_id, action: 'delete' });
    }
    broadcastSSE();  // 立即广播，避免等 8 秒 SSE 周期
    return c.json({ ok: true });
  });

  /** 硬删除 session 及其所有关联数据（级联） */
  app.delete('/api/sessions/:id', (c) => {
    const sessionId = c.req.param('id');
    const result = deleteSession(db, sessionId);
    if (!result.ok) return c.json({ ok: false, error: 'Session not found' }, 404);
    // TASK-005: 发布 session 变更事件
    emitEvent('session:changed', { sessionId, action: 'delete' });
    broadcastSSE();  // 立即广播更新
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
      available_models: getAvailableModels(),
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

  // ---- Jarvis 产物读取 ----
  app.get('/api/jarvis/:filepath{.*}', (c) => {
    const filepath = decodeURIComponent(c.req.param('filepath'));
    const sessionId = c.req.query('session_id');

    // 拒绝空路径
    if (!filepath || filepath === '/') {
      return c.json({ error: 'File path required' }, 400);
    }

    // 路径遍历防护（优先级高于文件扩展名检查）
    const docsDir = resolve(root, '.jarvis');
    const resolvedPath = resolve(docsDir, filepath);
    if (!resolvedPath.startsWith(docsDir)) {
      return c.json({ error: 'Path traversal not allowed' }, 400);
    }

    // 拒绝非 .md 文件
    if (!filepath.endsWith('.md')) {
      return c.json({ error: 'Only .md files allowed' }, 400);
    }

    // 会话隔离：验证文件属于该会话的产物记录
    if (sessionId) {
      const runs = getSessionRuns(db, sessionId);
      if (runs.length > 0) {
        const artifact = runs
          .flatMap(r => (getArtifactsByRun(db, r.id) as { filepath: string }[]))
          .find(a => a.filepath === filepath);
        if (!artifact) {
          console.warn(`[jarvis-api] 403: ${filepath} not in session ${sessionId} artifacts`);
          return c.json({ error: 'File not registered to this session' }, 403);
        }
      }
    }

    // 文件存在性检查
    if (!existsSync(resolvedPath)) {
      console.warn(`[jarvis-api] 404: ${resolvedPath} (filepath: ${filepath})`);
      return c.json({ error: 'File not found' }, 404);
    }

    const content = readFileSync(resolvedPath, 'utf-8');
    return c.text(content, 200, { 'Content-Type': 'text/plain; charset=utf-8' });
  });

  // ---- Commands API（TASK-CM-001 双源读取 + 内置模板兜底）----
  app.get('/api/commands', (c) => {
    const projectDir = resolve(root, '.claude', 'commands');
    const globalDir = resolve(homedir(), '.claude', 'commands');

    // 从单个目录读取所有 .md 指令文件
    function readCommandsFromDir(dir: string) {
      let files: string[];
      try {
        files = readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'AGENTS.md' && f !== 'CLAUDE.md' && f !== 'README.md');
      } catch (e) {
        console.warn(`[commands] 读取 ${dir} 失败:`, (e as Error).message);
        return [];
      }
      const results: { name: string; description: string; argumentHint: string; pipelineType: string; category: string }[] = [];
      for (const file of files) {
        try {
          const content = readFileSync(join(dir, file), 'utf-8');
          const { meta: fm } = parseFrontmatter(content);
          const name = file.slice(0, -3);
          results.push({
            name,
            description: (fm.description as string) || '',
            argumentHint: (fm['argument-hint'] as string) || '',
            pipelineType: inferPipelineType(content),
            category: inferCategory(name),
          });
        } catch (e) {
          console.warn(`[commands] 跳过 ${file}:`, String(e));
        }
      }
      return results;
    }

    const projectCommands = readCommandsFromDir(projectDir);
    let globalCommands = readCommandsFromDir(globalDir);

    // 同名去重：项目优先，全局排除被项目覆盖的指令
    if (projectCommands.length > 0 && globalCommands.length > 0) {
      const projectNames = new Set(projectCommands.map(c => c.name));
      globalCommands = globalCommands.filter(c => !projectNames.has(c.name));
    }

    // 兜底逻辑：双源均为空时读取内置模板目录
    if (projectCommands.length === 0 && globalCommands.length === 0) {
      const builtinDir = resolve(import.meta.dirname, '..', '..', 'src', 'templates', 'platforms', 'claude', 'commands');
      globalCommands = readCommandsFromDir(builtinDir);
    }

    // 按 name 字母序排列
    projectCommands.sort((a, b) => a.name.localeCompare(b.name));
    globalCommands.sort((a, b) => a.name.localeCompare(b.name));

    // 项目名称取项目根目录名
    const projectName = root.split(/[\\/]/).filter(Boolean).pop() || 'unknown';

    return c.json({
      project: { name: projectName, commands: projectCommands },
      global: { commands: globalCommands },
    });
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

  // ── RepoWiki API ─────────────────────────────

  app.get('/api/wiki/pages', (c) => {
    const project = c.req.query('project') || undefined;
    const pages = listWikiPages(root, project);
    return c.json({ pages, count: pages.length, project: project || null });
  });

  app.get('/api/projects', (c) => {
    const pipeline = db.prepare('SELECT DISTINCT project FROM pipeline WHERE project IS NOT NULL AND project != ? ORDER BY project').all(root) as { project: string }[];
    const runs = db.prepare('SELECT DISTINCT project FROM pipeline_runs WHERE project IS NOT NULL AND project != ? ORDER BY project').all(root) as { project: string }[];
    const projects = [...new Set([...pipeline.map(r => r.project), ...runs.map(r => r.project)])].sort();
    return c.json({ projects, count: projects.length });
  });

  app.get('/api/wiki/page/:slug', (c) => {
    const slug = c.req.param('slug');
    const page = readWikiPage(root, slug);
    if (!page) return c.json({ error: `Page "${slug}" not found` }, 404);
    return c.json(page);
  });

  // ── 产物同步 API ─────────────────────────────────────────

  /** 列出所有日期目录下的 requirements 文件 */
  app.get('/api/artifacts/requirements', (c) => {
    const jarvisDir = getArtifactsDir(root);
    const results: { date: string; files: string[] }[] = [];
    try {
      if (existsSync(jarvisDir)) {
        const dateDirs = readdirSync(jarvisDir, { withFileTypes: true })
          .filter(d => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
          .sort((a, b) => b.name.localeCompare(a.name)); // 最新日期在前
        for (const dd of dateDirs) {
          const reqDir = join(jarvisDir, dd.name, 'requirements');
          if (existsSync(reqDir)) {
            const files = readdirSync(reqDir)
              .filter(f => f.endsWith('.md'))
              .sort();
            if (files.length > 0) {
              results.push({ date: dd.name, files });
            }
          }
        }
      }
    } catch (e) {
      return c.json({ error: String(e) }, 500);
    }
    return c.json({ requirements: results, count: results.reduce((s, r) => s + r.files.length, 0) });
  });

  /** 同步 requirements 从日期目录到扁平 .jarvis/requirements/ 目录 */
  app.post('/api/artifacts/sync', (c) => {
    const from = c.req.query('from'); // 可选：指定日期目录，如 2026-05-22
    const jarvisDir = getArtifactsDir(root);
    const flatDir = join(jarvisDir, 'requirements');
    if (!existsSync(flatDir)) {
      mkdirSync(flatDir, { recursive: true });
    }
    const synced: string[] = [];
    try {
      if (existsSync(jarvisDir)) {
        const dateDirs = readdirSync(jarvisDir, { withFileTypes: true })
          .filter(d => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name) && (!from || d.name === from));
        for (const dd of dateDirs) {
          const reqDir = join(jarvisDir, dd.name, 'requirements');
          if (!existsSync(reqDir)) continue;
          const mdFiles = readdirSync(reqDir).filter(f => f.endsWith('.md'));
          for (const f of mdFiles) {
            const src = join(reqDir, f);
            const dest = join(flatDir, f);
            copyFileSync(src, dest);
            synced.push(`${dd.name}/requirements/${f}`);
          }
        }
      }
    } catch (e) {
      return c.json({ error: String(e) }, 500);
    }
    // 触发 SSE 广播
    emitEvent('session:changed', { action: 'sync-requirements', synced });
    return c.json({ ok: true, synced, count: synced.length, flatDir: '.jarvis/requirements/' });
  });
}

function getArtifactsDir(root) { return resolve(root, '.jarvis'); }

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

function readVersion() { return readPackageVersion(import.meta.dirname); }

/**
 * 根据指令内容推断 pipeline 类型
 * @param content 指令文件完整内容
 * @returns pipeline 类型
 */
function inferPipelineType(content: string): string {
  const lower = content.toLowerCase();
  // Check specific pipeline types FIRST (narrow keyword match), then generic (may appear in any template)
  if (lower.includes('name: auto')) return 'lite';
  if (lower.includes('pipeline_type: "simplify"') || (lower.includes('simplify') && lower.includes('s0'))) return 'simplify';
  if (lower.includes('pipeline_type: "trace"') || (lower.includes('trace') && lower.includes('t0'))) return 'trace';
  if (lower.includes('pipeline_type: "improve"') || (lower.includes('improve') && lower.includes('im0'))) return 'improve';
  if (lower.includes('pipeline_type: "ask"') || (lower.includes('session_join') && lower.includes('pipeline_type: "ask"'))) return 'ask';
  if (lower.includes('pipeline_type: "research"') || (lower.includes('research') && lower.includes('rs0'))) return 'research';
  if (lower.includes('pipeline_type: "release"') || (lower.includes('release') && lower.includes('rl0'))) return 'release';
  if (lower.includes('pipeline_type: "refactor"') || (lower.includes('refactor') && lower.includes('r1'))) return 'refactor';
  if (lower.includes('pipeline_type: "hotfix"') || (lower.includes('hotfix') && lower.includes('h0'))) return 'hotfix';
  if (lower.includes('pipeline_type: "migrate"') || (lower.includes('migrate') && lower.includes('m1'))) return 'migrate';
  if (lower.includes('pipeline_type: "evaluate"') || (lower.includes('evaluate') && lower.includes('e0'))) return 'evaluate';
  if (lower.includes('pipeline_type: "debug"') || (lower.includes('debug') && lower.includes('d0'))) return 'debug';
  if (lower.includes('pipeline_type: "lite"') || (lower.includes('auto') && lower.includes('pipeline_type'))) return 'lite';
  // Generic fallbacks (broader keyword matching, may catch false positives)
  if (lower.includes('frontend')) return 'frontend';
  if (lower.includes('backend')) return 'backend';
  if (lower.includes('jarvis-lite') || lower.includes('auto') || lower.includes('lite')) return 'lite';
  if (lower.includes('refactor')) return 'refactor';
  if (lower.includes('hotfix')) return 'hotfix';
  if (lower.includes('migrate')) return 'migrate';
  if (lower.includes('evaluate')) return 'evaluate';
  if (lower.includes('debug')) return 'debug';
  if (lower.includes('simplify')) return 'simplify';
  if (lower.includes('trace')) return 'trace';
  if (lower.includes('improve')) return 'improve';
  if (lower.includes('research')) return 'research';
  if (lower.includes('release')) return 'release';
  if (lower.includes('session_join') && lower.includes('pipeline_type')) return 'ask';
  return 'full';
}

/**
 * 根据指令文件名推断分类
 * @param name 指令文件名（不含扩展名）
 * @returns 分类标签
 */
function inferCategory(name: string): string {
  if (/^test-/.test(name)) return 'test';
  if (/refactor/.test(name)) return 'refactor';
  if (/hotfix/.test(name)) return 'hotfix';
  if (/migrate/.test(name)) return 'migrate';
  if (/evaluate/.test(name)) return 'evaluate';
  if (/^debug/.test(name) || /bug/.test(name)) return 'debug';
  if (/simplify/.test(name)) return 'simplification';
  if (/trace/.test(name)) return 'trace';
  if (/improve/.test(name)) return 'improvement';
  if (/ask/.test(name)) return 'requirements';
  if (/review/.test(name)) return 'review';
  if (/architect/.test(name)) return 'architecture';
  if (/^task-/.test(name)) return 'task';
  if (/android|ios|flutter|expo|taro/.test(name)) return 'platform';
  return 'development';
}
