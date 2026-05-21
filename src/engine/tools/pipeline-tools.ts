import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { ToolContext } from './types.js';
import {
  getPipeline, initPipeline, getCheckpoints, addCheckpoint, updatePipelineGate,
  getActiveRun, createPipelineRun, setRunTaskName, updateRunGate, updateRunGateEnteredAt,
  insertArtifact, completeRun, abortRun, saveResumeData, getResumeData,
  updateSessionMetadata, logSessionEvent, getSession, removeSession,
} from '../db.js';
import {
  GATE_CHECKS, GATE_DIRS, PIPELINE_DEFS, DEFAULT_PIPELINE,
  getPipelineGates, getPipelineName, findSessionGateArtifacts, formatGateDisplay,
} from '../gates.js';
import { emitEvent } from '../pubsub.js';
import { VALID_PIPELINE_TYPES, sessionGates } from './shared.js';

export function registerPipelineTools(server: McpServer, db: DatabaseSync, root: string, ctx: ToolContext) {
  server.tool('pipeline_init', '【会话隔离】初始化当前会话流水线。',
    { project_name: z.string().optional(), pipeline_type: z.string().optional(), task_name: z.string().optional().describe('任务名称，用于Web面板标题显示') },
    async ({ project_name, pipeline_type, task_name }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ error: 'session_id required. Call session_join first.' });
      const pt = (pipeline_type && VALID_PIPELINE_TYPES.includes(pipeline_type)) ? pipeline_type : DEFAULT_PIPELINE;
      const runId = createPipelineRun(db, sid, project_name || root, pt);
      initPipeline(db, sid, project_name || root, pt);
      emitEvent('run:changed', { runId, sessionId: sid, action: 'create' });
      updateRunGateEnteredAt(db, runId, new Date().toISOString());
      if (task_name) {
        setRunTaskName(db, runId, task_name);
      } else {
        const effectiveProject = project_name || root;
        const projectShortName = effectiveProject.split(/[\\/]/).filter(Boolean).pop() || effectiveProject;
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const defaultTaskName = `${projectShortName} 流水线任务 · ${mm}-${dd}`;
        setRunTaskName(db, runId, defaultTaskName);
      }
      return ctx.resp({
        ok: true, session_id: sid, run_id: runId, pipeline_type: pt,
        message: 'New pipeline run created. Next: Gate A',
        state: getPipeline(db, sid),
      });
    });

  server.tool('pipeline_status', '【会话隔离】当前会话流水线状态。',
    { run_id: z.string().optional() },
    async ({ run_id }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ error: 'session_id required. Call session_join first.' });
      const p = getPipeline(db, sid);
      const pt = p?.pipeline_type || DEFAULT_PIPELINE;
      const gateList = getPipelineGates(pt);
      const docs = join(root, '.jarvis');
      const runId = run_id || getActiveRun(db, sid)?.id;
      const gates = gateList.map(g => {
        const cp = getCheckpoints(db, g, sid);
        return {
          gate: g, passed: cp.length > 0, checkpoints: cp,
          artifacts: findSessionGateArtifacts(docs, g, sid, db, runId),
          requirement: GATE_CHECKS[g]?.check || '',
        };
      });
      const current = gates.find(g => !g.passed)?.gate || 'Complete';
      return ctx.resp({
        session_id: sid, project: root, pipeline_type: pt,
        pipeline_name: getPipelineName(pt),
        current_gate: current,
        completed: gates.filter(g => g.passed).map(g => g.gate),
        gates,
        run_id: runId,
        all_sessions: (db.prepare('SELECT id, platform, role, last_heartbeat, status FROM sessions').all() as any[]).map((s: any) => ({
          id: s.id, gate: getPipeline(db, s.id)?.current_gate || '?',
        })),
        _display: formatGateDisplay(gates, current),
      });
    });

  server.tool('gate_enforce', '【会话隔离·硬约束】验证Gate条件。',
    { gate: z.string().optional(), run_id: z.string().optional() },
    async ({ gate, run_id }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ error: 'session_id required. Call session_join first.' });
      const runId = run_id || getActiveRun(db, sid)?.id;
      const gateList = sessionGates(db, sid);
      const target = gate || getPipeline(db, sid)?.current_gate || gateList[0];
      const artifacts = findSessionGateArtifacts(join(root, '.jarvis'), target, sid, db, runId);
      const checkpoints = getCheckpoints(db, target, sid);
      const allowed = artifacts.length > 0 || checkpoints.length > 0;
      return ctx.resp(allowed
        ? { gate: target, allowed: true, session_id: sid, run_id: runId, message: `${target} — proceed.` }
        : {
            gate: target, allowed: false, session_id: sid, run_id: runId,
            blocked_reasons: [artifacts.length ? '' : `No artifacts in .jarvis/${GATE_DIRS[target] || '?'}/`].filter(Boolean),
            action_required: GATE_CHECKS[target]?.check || '',
          });
    });

  server.tool('advance_gate', '【会话隔离·硬约束】推进Gate。推进任意 Gate 时可传入 task_name 设置会话标题。',
    { gate: z.string(), run_id: z.string().optional(), task_name: z.string().optional().describe('任务名称，设置Web面板显示的会话标题') },
    async ({ gate, run_id, task_name }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ error: 'session_id required. Call session_join first.' });
      const runId = run_id || getActiveRun(db, sid)?.id;
      if (task_name && runId) {
        setRunTaskName(db, runId, task_name);
      }
      const p = getPipeline(db, sid);
      const gateList = sessionGates(db, sid);
      const cur = p?.current_gate || gateList[0];
      const ci = gateList.indexOf(cur), ti = gateList.indexOf(gate);
      if (ti === -1) return ctx.resp({ allowed: false, error: `Unknown gate: ${gate}. Valid gates for this pipeline: ${gateList.join(', ')}` });
      if (ti <= ci) return ctx.resp({ allowed: false, error: `FSM blocked: Cannot move backward. Current: ${cur}` });
      if (ti > ci + 1) return ctx.resp({ allowed: false, error: `FSM blocked: Cannot skip gates. Next: ${gateList[ci + 1]}` });
      const artifacts = findSessionGateArtifacts(join(root, '.jarvis'), cur, sid, db, runId);
      const cps = getCheckpoints(db, cur, sid);
      if (artifacts.length === 0 && cps.length === 0) return ctx.resp({ allowed: false, error: `${cur} conditions NOT met.` });
      if (runId) {
        try {
          const gateSubdir = GATE_DIRS[cur];
          if (gateSubdir) {
            const run = db.prepare('SELECT started_at FROM pipeline_runs WHERE id=?').get(runId) as { started_at: string } | undefined;
            const dateDir = run?.started_at?.slice(0, 10) || null;
            if (dateDir) {
              const artifactDir = join(root, '.jarvis', dateDir, gateSubdir);
              if (existsSync(artifactDir)) {
                const mdFiles = readdirSync(artifactDir).filter(f => f.endsWith('.md'));
                for (const f of mdFiles) {
                  insertArtifact(db, runId, cur, `${dateDir}/${gateSubdir}/${f}`);
                }
              }
            }
            const flatDir = join(root, '.jarvis', gateSubdir);
            if (existsSync(flatDir)) {
              const mdFiles = readdirSync(flatDir).filter(f => f.endsWith('.md'));
              for (const f of mdFiles) {
                insertArtifact(db, runId, cur, `${gateSubdir}/${f}`);
              }
            }
          }
        } catch (e) {
          console.warn(`[artifact-scan] 扫描 ${cur} 产物失败:`, String(e));
        }
      }
      let durationSeconds: number | null = null;
      if (runId) {
        const enteredRow = db.prepare("SELECT strftime('%s', gate_entered_at) AS entered_epoch FROM pipeline_runs WHERE id=?").get(runId);
        if (enteredRow?.entered_epoch) {
          const enteredEpoch = Number(enteredRow.entered_epoch);
          durationSeconds = Math.floor(Date.now() / 1000) - enteredEpoch;
        }
      }
      addCheckpoint(db, cur, gate, sid, durationSeconds ?? undefined);
      updatePipelineGate(db, sid, gate);
      if (runId) {
        const allCheckpoints = getCheckpoints(db, undefined, sid);
        saveResumeData(db, runId, {
          gate,
          gateList,
          taskName: task_name || null,
          checkpoints: allCheckpoints.map(c => ({ gate: c.gate, passedAt: c.passed_at, duration: c.duration_seconds })),
          savedAt: new Date().toISOString(),
        });
        updateSessionMetadata(db, sid, {
          lastGate: gate,
          lastRunId: runId,
          lastActive: new Date().toISOString(),
        });
      }
      if (runId) {
        updateRunGate(db, runId, gate);
        updateRunGateEnteredAt(db, runId, new Date().toISOString());
      }
      const isLastGate = ti === gateList.length - 1;
      if (isLastGate) {
        addCheckpoint(db, gate, 'Complete', sid, undefined);
        if (runId) {
          completeRun(db, runId);
        }
      }
      emitEvent('gate:advanced', { sessionId: sid, runId, gate, previousGate: cur });
      logSessionEvent(db, sid, 'gate_advance', { runId, gate, detail: cur + ' -> ' + gate });
      if (isLastGate && runId) {
        emitEvent('run:changed', { runId, sessionId: sid, action: 'complete' });
      }
      return ctx.resp({
        allowed: true, session_id: sid, run_id: runId, previous_gate: cur, current_gate: gate,
        next: gateList[ti + 1] || 'Complete',
        message: gateList[ti + 1] ? `Next: ${gateList[ti + 1]}` : 'Complete!',
        duration_seconds: durationSeconds ?? null,
      });
    });

  server.tool('pipeline_resume',
    '【会话恢复】加载指定 run 的恢复数据，支持跨会话继续任务。返回上次保存的 Gate 位置、checkpoint 历史、任务名称等信息。',
    { run_id: z.string().describe('要恢复的 pipeline run ID') },
    async ({ run_id }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ error: 'session_id required. Call session_join first.' });
      const data = getResumeData(db, run_id);
      if (!data) return ctx.resp({ ok: false, error: `No resume data found for run: ${run_id}`, resumed: false });
      if (data.gate) {
        updatePipelineGate(db, sid, data.gate as string);
      }
      const p = getPipeline(db, sid);
      const gateList = sessionGates(db, sid);
      return ctx.resp({
        ok: true,
        resumed: true,
        run_id,
        gate: p?.current_gate || data.gate || 'Gate A',
        task_name: data.taskName || null,
        checkpoints: data.checkpoints || [],
        saved_at: data.savedAt || null,
        pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE,
        gate_sequence: gateList,
        message: `\u{1F504} 已恢复任务「${data.taskName || '(未知)'}」— 当前 Gate: ${data.gate || 'Gate A'}，已完成 ${(data.checkpoints as unknown[] || []).length} 个 checkpoint。`,
      });
    });

  server.tool('gate_jump',
    '【lite模式·入口跳转】跳过无关Gate直接进入目标Gate。仅当pipeline_type为lite时可用。跳转时可传入 task_name 设置会话标题。',
    { gate: z.string().describe('目标Gate，如 Gate C / Gate D / Gate E'), run_id: z.string().optional(), task_name: z.string().optional().describe('任务名称，设置Web面板显示的会话标题') },
    async ({ gate, run_id, task_name }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ error: 'session_id required. Call session_join first.' });
      const runId = run_id || getActiveRun(db, sid)?.id;
      if (task_name && runId) {
        setRunTaskName(db, runId, task_name);
      }
      const p = getPipeline(db, sid);
      const pt = p?.pipeline_type || DEFAULT_PIPELINE;
      const def = PIPELINE_DEFS[pt];
      if (!def?.allow_jump) return ctx.resp({ allowed: false, error: `gate_jump 仅在 lite/ask/improve 模式可用。当前: ${pt}` });
      const gateList = sessionGates(db, sid);
      const ti = gateList.indexOf(gate);
      if (ti === -1) return ctx.resp({ allowed: false, error: `未知 Gate: ${gate}。有效: ${gateList.join(', ')}` });
      const previousGate = p?.current_gate;
      updatePipelineGate(db, sid, gate);
      if (runId) {
        updateRunGate(db, runId, gate);
        updateRunGateEnteredAt(db, runId, new Date().toISOString());
      }
      emitEvent('gate:advanced', { sessionId: sid, runId, gate, previousGate });
      return ctx.resp({
        allowed: true, session_id: sid, run_id: runId, pipeline_type: pt, entry_gate: gate,
        message: `已跳转至 ${gate}，跳过了 ${gateList.slice(0, ti).join(', ')}。剩余: ${gateList.slice(ti).join(' → ')}`,
      });
    });

  server.tool('pipeline_cancel',
    '【会话隔离】取消当前流水线运行。中止活跃 run，清理恢复数据。可选同时离开会话。',
    {
      run_id: z.string().optional().describe('要取消的 run ID，默认当前活跃 run'),
      leave_session: z.boolean().optional().describe('是否同时离开会话，默认 false'),
    },
    async ({ run_id, leave_session }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ error: 'session_id required. Call session_join first.' });
      const runId = run_id || getActiveRun(db, sid)?.id;
      if (!runId) return ctx.resp({ ok: false, error: 'No active pipeline run to cancel.' });
      const previousStatus = db.prepare('SELECT status, current_gate, task_name FROM pipeline_runs WHERE id=?').get(runId) as any;
      if (!previousStatus) return ctx.resp({ ok: false, error: `Run ${runId} not found.` });
      if (previousStatus.status !== 'active') {
        return ctx.resp({ ok: false, error: `Run ${runId} is already ${previousStatus.status}.` });
      }
      abortRun(db, runId);
      emitEvent('run:changed', { runId, sessionId: sid, action: 'cancel' });
      logSessionEvent(db, sid, 'pipeline_cancel', {
        runId,
        detail: `cancelled at ${previousStatus.current_gate || '?'} — task: ${previousStatus.task_name || '(unnamed)'}`,
      });
      if (leave_session) {
        removeSession(db, sid);
        emitEvent('session:changed', { sessionId: sid, action: 'leave' });
        logSessionEvent(db, sid, 'session_leave', { detail: 'session left after cancellation' });
      }
      return ctx.resp({
        ok: true,
        cancelled: true,
        run_id: runId,
        session_id: sid,
        was_at_gate: previousStatus.current_gate,
        task_name: previousStatus.task_name || null,
        session_left: !!leave_session,
        message: leave_session
          ? `\u{1F6AB} 已取消 run「${previousStatus.task_name || '(未命名)'}」并离开会话。`
          : `\u{1F6AB} 已取消 run「${previousStatus.task_name || '(未命名)'}」，会话仍保留。调用 pipeline_init 开始新任务。`,
      });
    });

  server.tool('report_status', '【会话隔离】流水线完整报告。',
    { run_id: z.string().optional() },
    async ({ run_id }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ error: 'session_id required. Call session_join first.' });
      const runId = run_id || getActiveRun(db, sid)?.id;
      const gateList = sessionGates(db, sid);
      const gates = gateList.map(g => ({
        gate: g, passed: getCheckpoints(db, g, sid).length > 0,
        artifacts: findSessionGateArtifacts(join(root, '.jarvis'), g, sid, db, runId),
      }));
      const completed = gates.filter(g => g.passed).length;
      return ctx.resp({
        session_id: sid, project: root, run_id: runId,
        pipeline_type: getPipeline(db, sid)?.pipeline_type || DEFAULT_PIPELINE,
        progress: `${completed}/${gateList.length}`,
        current: gates.find(g => !g.passed)?.gate || 'Complete',
      });
    });
}
