/**
 * TASK-005: 所有 DB 写操作注入事件 emit — routes.ts 单元测试
 *
 * 测试范围:
 *   1. POST /api/gate/advance → gate:advanced
 *   2. POST /api/pipeline-runs/:id/archive → run:changed
 *   3. POST /api/pipeline-runs/:id/unarchive → run:changed
 *   4. POST /api/pipeline-runs/:id/pin → run:changed
 *   5. POST /api/pipeline-runs/:id/unpin → run:changed
 *   6. DELETE /api/pipeline-runs/:id → run:changed
 *   7. DELETE /api/sessions/:id → session:changed
 *   8. POST /api/sessions/:id/resume → session:changed
 *   9. POST /api/agent-event → agent:event (仅非重复)
 *  10. PATCH /api/pipeline-runs/:id/name → run:changed
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Hono } from 'hono';
import {
  setupApiRoutes,
  stopSSEBroadcast,
} from '../src/web/routes.js';
import * as pubsub from '../src/engine/pubsub.js';
import {
  openDb,
  addSession,
  createPipelineRun,
  initPipeline,
  addCheckpoint,
} from '../src/engine/db.js';

const TEST_DB = resolve(tmpdir(), `jarvis-test-routes-emit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);

let _counter = 0;
function makeSid(): string {
  return `sid_emit_${++_counter}_${Math.random().toString(36).slice(2, 8)}`;
}

describe('TASK-005: routes.ts 写操作 emitEvent', () => {
  let app: any;
  let db: any;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pubsub.resetPubSub();
    db = openDb(TEST_DB);
    stopSSEBroadcast?.();
    app = new Hono();
    setupApiRoutes(app, db, process.cwd());
    emitSpy = vi.spyOn(pubsub, 'emitEvent').mockImplementation(() => {});
  });

  afterEach(() => {
    emitSpy.mockRestore();
    pubsub.resetPubSub();
    stopSSEBroadcast();
  });

  // ──────────────────────────────────────────────────────────
  // 1. POST /api/gate/advance → gate:advanced
  // ──────────────────────────────────────────────────────────
  it('1 | POST /api/gate/advance emit gate:advanced', async () => {
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');
    createPipelineRun(db, sid, 'test-project');
    initPipeline(db, sid, 'test-project');
    // 添加 checkpoint 使 Gate A 条件满足
    addCheckpoint(db, 'Gate A', 'Gate B', sid);

    const res = await app.request('/api/gate/advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sid }),
    });

    expect(res.status).toBe(200);
    expect(emitSpy).toHaveBeenCalledWith('gate:advanced', {
      sessionId: sid,
      runId: expect.any(String),
      gate: 'Gate B-DDD',
      previousGate: 'Gate A',
    });
  });

  // ──────────────────────────────────────────────────────────
  // 2. POST /api/pipeline-runs/:id/archive → run:changed
  // ──────────────────────────────────────────────────────────
  it('2 | POST /api/pipeline-runs/:id/archive emit run:changed', async () => {
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');
    const runId = createPipelineRun(db, sid, 'test-project');

    const res = await app.request(`/api/pipeline-runs/${runId}/archive`, { method: 'POST' });

    expect(res.status).toBe(200);
    expect(emitSpy).toHaveBeenCalledWith('run:changed', {
      runId,
      sessionId: sid,
      action: 'archive',
    });
  });

  // ──────────────────────────────────────────────────────────
  // 3. POST /api/pipeline-runs/:id/unarchive → run:changed
  // ──────────────────────────────────────────────────────────
  it('3 | POST /api/pipeline-runs/:id/unarchive emit run:changed', async () => {
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');
    const runId = createPipelineRun(db, sid, 'test-project');

    const res = await app.request(`/api/pipeline-runs/${runId}/unarchive`, { method: 'POST' });

    expect(res.status).toBe(200);
    expect(emitSpy).toHaveBeenCalledWith('run:changed', {
      runId,
      sessionId: sid,
      action: 'unarchive',
    });
  });

  // ──────────────────────────────────────────────────────────
  // 4. POST /api/pipeline-runs/:id/pin → run:changed
  // ──────────────────────────────────────────────────────────
  it('4 | POST /api/pipeline-runs/:id/pin emit run:changed', async () => {
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');
    const runId = createPipelineRun(db, sid, 'test-project');

    const res = await app.request(`/api/pipeline-runs/${runId}/pin`, { method: 'POST' });

    expect(res.status).toBe(200);
    expect(emitSpy).toHaveBeenCalledWith('run:changed', {
      runId,
      sessionId: sid,
      action: 'pin',
    });
  });

  // ──────────────────────────────────────────────────────────
  // 5. POST /api/pipeline-runs/:id/unpin → run:changed
  // ──────────────────────────────────────────────────────────
  it('5 | POST /api/pipeline-runs/:id/unpin emit run:changed', async () => {
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');
    const runId = createPipelineRun(db, sid, 'test-project');

    const res = await app.request(`/api/pipeline-runs/${runId}/unpin`, { method: 'POST' });

    expect(res.status).toBe(200);
    expect(emitSpy).toHaveBeenCalledWith('run:changed', {
      runId,
      sessionId: sid,
      action: 'unpin',
    });
  });

  // ──────────────────────────────────────────────────────────
  // 6. DELETE /api/pipeline-runs/:id → run:changed
  // ──────────────────────────────────────────────────────────
  it('6 | DELETE /api/pipeline-runs/:id emit run:changed', async () => {
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');
    const runId = createPipelineRun(db, sid, 'test-project');

    const res = await app.request(`/api/pipeline-runs/${runId}`, { method: 'DELETE' });

    expect(res.status).toBe(200);
    expect(emitSpy).toHaveBeenCalledWith('run:changed', {
      runId,
      sessionId: sid,
      action: 'delete',
    });
  });

  // ──────────────────────────────────────────────────────────
  // 7. DELETE /api/sessions/:id → session:changed
  // ──────────────────────────────────────────────────────────
  it('7 | DELETE /api/sessions/:id emit session:changed', async () => {
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');

    const res = await app.request(`/api/sessions/${sid}`, { method: 'DELETE' });

    expect(res.status).toBe(200);
    expect(emitSpy).toHaveBeenCalledWith('session:changed', {
      sessionId: sid,
      action: 'delete',
    });
  });

  // ──────────────────────────────────────────────────────────
  // 8. POST /api/sessions/:id/resume → session:changed
  // ──────────────────────────────────────────────────────────
  it('8 | POST /api/sessions/:id/resume emit session:changed', async () => {
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');

    const res = await app.request(`/api/sessions/${sid}/resume`, { method: 'POST' });

    expect(res.status).toBe(200);
    expect(emitSpy).toHaveBeenCalledWith('session:changed', {
      sessionId: sid,
      action: 'resume',
    });
  });

  // ──────────────────────────────────────────────────────────
  // 9. POST /api/agent-event → agent:event (仅非重复)
  // ──────────────────────────────────────────────────────────
  it('9 | POST /api/agent-event emit agent:event when non-duplicate', async () => {
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');
    const runId = createPipelineRun(db, sid, 'test-project');

    const res = await app.request('/api/agent-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'start',
        agent_id: 'agent-1',
        run_id: runId,
        session_id: sid,
      }),
    });

    expect(res.status).toBe(200);
    expect(emitSpy).toHaveBeenCalledWith('agent:event', {
      runId: runId,
      sessionId: sid,
      agentId: 'agent-1',
      eventType: 'start',
    });
  });

  it('9b | POST /api/agent-event 重复时 NOT emit agent:event', async () => {
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');
    const runId = createPipelineRun(db, sid, 'test-project');

    // 第一次发送 start 事件
    await app.request('/api/agent-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'start',
        agent_id: 'agent-dup',
        run_id: runId,
        session_id: sid,
      }),
    });

    // 清除第一次调用的记录
    emitSpy.mockClear();

    // 第二次发送相同 start 事件（应被去重）
    const res2 = await app.request('/api/agent-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'start',
        agent_id: 'agent-dup',
        run_id: runId,
        session_id: sid,
      }),
    });

    const body2 = await res2.json();
    expect(body2.duplicate).toBe(true);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 10. PATCH /api/pipeline-runs/:id/name → run:changed
  // ──────────────────────────────────────────────────────────
  it('10 | PATCH /api/pipeline-runs/:id/name emit run:changed', async () => {
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');
    const runId = createPipelineRun(db, sid, 'test-project');

    const res = await app.request(`/api/pipeline-runs/${runId}/name`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_name: '新任务名' }),
    });

    expect(res.status).toBe(200);
    expect(emitSpy).toHaveBeenCalledWith('run:changed', {
      runId,
      sessionId: sid,
      action: 'rename',
    });
  });
});
