import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DatabaseSync } from 'node:sqlite';
import { appendFileSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from 'node:path';
import type { ToolContext } from './types.js';
import {
  getSession, addSession, getSessions, touchSession, removeSession, markStaleSessions,
  migrateSession, getPipeline, initPipeline, getActiveRun, getResumeData,
  createPipelineRun, setRunTaskName, abortRun, logSessionEvent, addWorkingMemory,
} from '../db.js';
import { DEFAULT_PIPELINE } from '../gates.js';
import { emitEvent } from '../pubsub.js';
import { VALID_PIPELINE_TYPES, sessionGates } from './shared.js';
import { getSessionContextSummary, cleanExpiredMemories } from '../session-archive.js';
import { getPriorityContextForInjection } from './memory-tools.js';
import { clearRunFileClaims } from './file-claim-tools.js';

const SESSION_TIMEOUT = 7_200_000; // 2小时无心跳→inactive（与 server.ts/routes.ts 统一）

export function registerSessionTools(server: McpServer, db: DatabaseSync, root: string, ctx: ToolContext) {
  server.tool('session_join',
    '注册/恢复会话。每个会话独立流水线状态。支持 resume_session_id 恢复旧会话，pipeline_type 指定流水线类型（full/frontend/backend）。',
    {
      platform: z.enum(['claude', 'other']).optional(),
      resume_session_id: z.string().optional(),
      pipeline_type: z.string().optional(),
      task_name: z.string().optional(),
    },
    async ({ platform, resume_session_id, pipeline_type, task_name }, extra) => {
      // 即使 extra.sessionId 相同（如同项目路径），每次 session_join 也生成唯一 session ID
      const sid = extra?.sessionId ? `${extra.sessionId}-${Date.now().toString(36)}` : `s${Date.now()}`;
      ctx.setLastSessionId(sid);
      // 写入 PID 文件供 hook 进程定位当前会话
      try {
        mkdirSync(join(root, '.jarvis'), { recursive: true });
        appendFileSync(join(root, '.jarvis', '.session-pid'), `${process.pid}:${sid}:${Date.now()}\n`);
      } catch { /* 写入失败不阻塞 session_join */ }
      const pt = pipeline_type || DEFAULT_PIPELINE;
      if (!VALID_PIPELINE_TYPES.includes(pt)) {
        return ctx.resp({ error: `Invalid pipeline_type: ${pt}. Valid: ${VALID_PIPELINE_TYPES.join(', ')}` });
      }
      if (resume_session_id) {
        const old = getSession(db, resume_session_id);
        if (old) {
          migrateSession(db, resume_session_id, sid);
          removeSession(db, resume_session_id);
        }
      }
      cleanExpiredMemories(db);
      // 清理超过7天无活动的僵尸session
      db.prepare("DELETE FROM sessions WHERE status='inactive' AND last_heartbeat < datetime('now', '-7 days')").run();
      markStaleSessions(db, SESSION_TIMEOUT);
      const archiveSummary = getSessionContextSummary(db, root);
      const priorityNotes = getPriorityContextForInjection(root);
      const contextSummary = [archiveSummary, priorityNotes ? `## 永久优先上下文\n${priorityNotes}` : null]
        .filter(Boolean).join('\n\n') || null;
      const existing = getSession(db, sid);
      if (existing) {
        touchSession(db, sid);
        const p = getPipeline(db, sid);
        const activeRun = getActiveRun(db, sid);
        const resumeData = activeRun ? getResumeData(db, activeRun.id) : null;
        if (resumeData && activeRun) {
          emitEvent('session:changed', { sessionId: sid, action: 'rejoin' });
          logSessionEvent(db, sid, 'session_join', { runId: activeRun.id, detail: 'rejoined (resume data available)' });
          const gateList = sessionGates(db, sid);
          return ctx.resp({
            session_id: sid, platform: existing.platform,
            gate: p?.current_gate || 'Gate A',
            pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE,
            project: p?.project || root,
            run_id: activeRun.id,
            resumed: true,
            can_resume: true,
            resume_task_name: resumeData.taskName || null,
            resume_gate: resumeData.gate || p?.current_gate,
            resume_checkpoints: resumeData.checkpoints || [],
            gate_sequence: gateList,
            context_summary: contextSummary,
            message: `\u{1F504} 欢迎回来！检测到未完成任务「${resumeData.taskName || '(未知)'}」— 当前 Gate: ${resumeData.gate || p?.current_gate}。调用 pipeline_resume 继续，或 start_fresh=true 开始新任务。`,
          });
        }
        if (activeRun) {
          db.prepare("UPDATE pipeline_runs SET archived=1, status='completed', completed_at=datetime('now') WHERE id=?")
            .run(activeRun.id);
          logSessionEvent(db, sid, 'run_archived', { runId: activeRun.id, detail: 'auto-archived on new task' });
          emitEvent('run:changed', { runId: activeRun.id, sessionId: sid, action: 'archive' });
        }
        const runId = createPipelineRun(db, sid, p?.project || root, p?.pipeline_type || pt);
        const proj = (p?.project || root || '').split(/[\\/]/).filter(Boolean).pop() || 'project';
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        setRunTaskName(db, runId, task_name || `${proj} · ${mm}-${dd}`);
        emitEvent('session:changed', { sessionId: sid, action: 'join' });
        emitEvent('run:changed', { runId, sessionId: sid, action: 'create' });
        logSessionEvent(db, sid, 'session_join', { runId, detail: activeRun ? 'new task (old archived)' : 'new session' });
        return ctx.resp({
          session_id: sid, platform: existing.platform,
          gate: p?.current_gate || 'Gate A',
          pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE,
          project: p?.project || root, run_id: runId, resumed: false,
          context_summary: contextSummary,
        });
      }
      addSession(db, sid, platform || 'unknown', 'member');
      if (!getPipeline(db, sid)) initPipeline(db, sid, root, pt);
      const p = getPipeline(db, sid);
      const runId = createPipelineRun(db, sid, p?.project || root, p?.pipeline_type || pt);
      const proj = (p?.project || root || '').split(/[\\/]/).filter(Boolean).pop() || 'project';
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setRunTaskName(db, runId, task_name || `${proj} · ${mm}-${dd}`);
      emitEvent('session:changed', { sessionId: sid, action: 'join' });
      emitEvent('run:changed', { runId, sessionId: sid, action: 'create' });
      logSessionEvent(db, sid, 'session_join', { runId, detail: 'new session' });
      addWorkingMemory(db, sid, `会话初始化 — pipeline: ${pt}`, { category: 'progress', ttlDays: 7 });
      return ctx.resp({
        session_id: sid, platform: platform || 'unknown',
        gate: p?.current_gate || 'Gate A',
        pipeline_type: pt, project: p?.project || root, run_id: runId,
        message: '\u{1F195} 新会话已初始化，独立流水线已就绪。',
        resumed: !!resume_session_id,
        context_summary: contextSummary,
      });
    });

  server.tool('session_heartbeat', '心跳保活——活动追踪模式下仅标记当前会话活跃。',
    { session_id: z.string().optional().describe('可选：显式指定会话ID，stdio模式下用于精确定位会话') },
    async ({ session_id }, extra) => {
      const sid = session_id || ctx.resolveSid(extra);
      return ctx.resp({ ok: true, session_id: sid || 'unknown' });
    });

  server.tool('session_list', '列出所有会话（含活跃和休眠）。', {}, async () => {
    markStaleSessions(db, SESSION_TIMEOUT);
    const sessions = getSessions(db).map(s => {
      const p = getPipeline(db, s.id);
      return {
        id: s.id, platform: s.platform, role: s.role,
        gate: p?.current_gate || '?',
        pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE,
        heartbeat: s.last_heartbeat, status: s.status,
      };
    });
    return ctx.resp({ sessions, count: sessions.length });
  });

  server.tool('session_leave', '离开会话。', {},
    async (_args, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid || !getSession(db, sid)) return ctx.resp({ ok: true });
      const activeRuns = db.prepare(
        "SELECT id, task_name, current_gate FROM pipeline_runs WHERE session_id=? AND status='active'"
      ).all(sid) as any[];
      const abortedIds: string[] = [];
      for (const r of activeRuns) {
        abortRun(db, r.id);
        clearRunFileClaims(r.id);
        abortedIds.push(r.id);
        emitEvent('run:changed', { runId: r.id, sessionId: sid, action: 'cancel' });
        logSessionEvent(db, sid, 'run_aborted', {
          runId: r.id,
          detail: `auto-aborted on session leave at ${r.current_gate || '?'} — task: ${r.task_name || '(unnamed)'}`,
        });
      }
      removeSession(db, sid);
      // 清理 PID 文件中当前进程的条目
      try {
        const pidFile = join(root, '.jarvis', '.session-pid');
        const content = readFileSync(pidFile, 'utf8');
        const lines = content.split('\n').filter(line => {
          const parts = line.split(':');
          return parts[0] !== String(process.pid) && line.trim();
        });
        writeFileSync(pidFile, lines.join('\n') + (lines.length > 0 ? '\n' : ''));
      } catch { /* best effort */ }
      emitEvent('session:changed', { sessionId: sid, action: 'leave' });
      logSessionEvent(db, sid, 'session_leave', { detail: 'session left' });
      return ctx.resp({
        ok: true,
        message: 'Session removed.',
        runs_aborted: abortedIds.length,
        ...(abortedIds.length > 0 ? { aborted_run_ids: abortedIds } : {}),
      });
    });

  server.tool('session_set_name',
    '设置当前流水线运行的任务名称。空字符串清除名称。',
    {
      name: z.string().describe('任务名称（如"给web增加归档功能"），空字符串清除名称'),
    },
    async ({ name }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ ok: false, error: 'session_id required. Call session_join first.' });
      const run = getActiveRun(db, sid);
      if (!run) return ctx.resp({ ok: false, error: 'No active pipeline run found. Call pipeline_init first.' });
      const result = setRunTaskName(db, run.id, name);
      emitEvent('run:changed', { runId: run.id, sessionId: sid, action: 'rename' });
      return ctx.resp(result);
    });
}
