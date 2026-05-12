/**
 * TASK-002: SSE Payload 扩展 + 事件驱动广播 — TDD 单元测试
 *
 * 测试范围:
 *   1. broadcastSSE() payload 包含 5 个字段: sessions, count, connected_platforms, pipeline, pipeline_runs
 *   2. connected_platforms 结构与 /api/status 一致（仅 claude 平台）
 *   3. pipeline 和 pipeline_runs 对应最新活跃 session
 *   4. 事件驱动：emit 事件后 500ms 去抖窗口内至少广播一次
 *   5. maxWait=2000ms：持续事件流在 2000ms 内强制广播
 *   6. 8s 兜底定时器与事件驱动广播共存（不互斥）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Hono } from 'hono';
import {
  setupApiRoutes,
  broadcastSSE,
  sseClients,
  stopSSEBroadcast,
} from '../src/web/routes.js';
import { emitEvent, resetPubSub } from '../src/engine/pubsub.js';
import {
  openDb,
  addSession,
  createPipelineRun,
  initPipeline,
} from '../src/engine/db.js';

const TEST_DB = resolve(tmpdir(), `jarvis-test-sse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);

let _counter = 0;
function makeSid(): string {
  return `sid_sse_${++_counter}_${Math.random().toString(36).slice(2, 8)}`;
}
function makeRunId(): string {
  return `run_sse_${++_counter}_${Math.random().toString(36).slice(2, 8)}`;
}

function mockSSEClient(): { client: any; getCaptured: () => any } {
  let capturedData: any = null;
  const client = {
    stream: null as any,
    db: null as any,
    root: '',
    aborted: false,
    writeSSE: async (data: any) => { capturedData = data; },
    sleep: async (_ms: number) => {},
  };
  return {
    client,
    getCaptured: () => capturedData,
  };
}

describe('TASK-002: SSE Payload + Event-Driven Broadcast', () => {
  let app: any;
  let db: any;
  let sid: string;
  let runId: string;

  beforeEach(() => {
    resetPubSub();
    // 先用真实时间初始化 DB（createPipelineRun 内部用 Date.now() 生成 ID）
    db = openDb(TEST_DB);
    sid = makeSid();
    runId = makeRunId();
    addSession(db, sid, 'claude', 'member');
    createPipelineRun(db, sid, 'test-project');
    initPipeline(db, sid, 'test-project');
    stopSSEBroadcast?.();

    // DB 就绪后启用 fake timers
    vi.useFakeTimers();

    app = new Hono();
    setupApiRoutes(app, db, process.cwd());
  });

  afterEach(() => {
    sseClients.length = 0;
    stopSSEBroadcast();
    resetPubSub();
    vi.useRealTimers();
  });

  // ──────────────────────────────────────────────────────────────
  // Test 1: broadcastSSE payload 包含 5 个字段
  // ──────────────────────────────────────────────────────────────
  it('1 | broadcastSSE() payload 包含 sessions, count, connected_platforms, pipeline, pipeline_runs', () => {
    const { client, getCaptured } = mockSSEClient();
    sseClients.push(client);

    broadcastSSE();

    const captured = getCaptured();
    expect(captured).not.toBeNull();
    const parsed = JSON.parse(captured.data);
    expect(parsed).toHaveProperty('sessions');
    expect(parsed).toHaveProperty('count');
    expect(parsed).toHaveProperty('connected_platforms');
    expect(parsed).toHaveProperty('pipeline');
    expect(parsed).toHaveProperty('pipeline_runs');
    // 原有字段仍正确
    expect(Array.isArray(parsed.sessions)).toBe(true);
    expect(parsed.count).toBeGreaterThanOrEqual(1);
  });

  // ──────────────────────────────────────────────────────────────
  // Test 2: connected_platforms 结构正确
  // ──────────────────────────────────────────────────────────────
  it('2 | connected_platforms 包含 claude 平台且结构匹配 /api/status', () => {
    const { client, getCaptured } = mockSSEClient();
    sseClients.push(client);

    broadcastSSE();

    const captured = getCaptured();
    const parsed = JSON.parse(captured.data);
    const cp = parsed.connected_platforms;
    expect(cp).toHaveProperty('claude');
    expect(cp.claude).toHaveProperty('connected');
    expect(cp.claude).toHaveProperty('active_sessions');
    expect(cp.claude).toHaveProperty('total_sessions');
    expect(typeof cp.claude.connected).toBe('boolean');
    expect(typeof cp.claude.active_sessions).toBe('number');
    expect(typeof cp.claude.total_sessions).toBe('number');
  });

  // ──────────────────────────────────────────────────────────────
  // Test 3: pipeline 和 pipeline_runs 包含最新 session 数据
  // ──────────────────────────────────────────────────────────────
  it('3 | pipeline 和 pipeline_runs 对应最新活跃 session', () => {
    // 创建第二个更新 session
    const sid2 = makeSid();
    addSession(db, sid2, 'claude', 'member');
    createPipelineRun(db, sid2, 'test-project');
    initPipeline(db, sid2, 'test-project');

    const { client, getCaptured } = mockSSEClient();
    sseClients.push(client);

    broadcastSSE();

    const captured = getCaptured();
    const parsed = JSON.parse(captured.data);

    // pipeline 应有当前 session 数据
    expect(parsed.pipeline).not.toBeNull();
    // 至少包含 session_id 或 pipeline_type
    // getPipeline 返回 { current_gate, pipeline_type }
    expect(parsed.pipeline).toHaveProperty('pipeline_type');
    expect(parsed.pipeline).toHaveProperty('current_gate');

    // pipeline_runs 应为数组
    expect(Array.isArray(parsed.pipeline_runs)).toBe(true);
    // 至少有一条 run
    expect(parsed.pipeline_runs.length).toBeGreaterThanOrEqual(1);
  });

  // ──────────────────────────────────────────────────────────────
  // Test 4: 事件驱动广播 — 去抖 500ms
  // ──────────────────────────────────────────────────────────────
  it('4 | 事件驱动：emit 事件后 500ms 去抖窗口内至少广播一次', async () => {
    const { client, getCaptured } = mockSSEClient();
    sseClients.push(client);

    // 初始无广播
    expect(getCaptured()).toBeNull();

    // 发射事件
    emitEvent('session:changed', { sessionId: sid, action: 'join' });

    // 400ms 后（未到 500ms 去抖），不应广播
    await vi.advanceTimersByTimeAsync(400);
    expect(getCaptured()).toBeNull();

    // 再前进 200ms（总 600ms，已过 500ms 去抖），应已广播
    await vi.advanceTimersByTimeAsync(200);
    expect(getCaptured()).not.toBeNull();
    const parsed = JSON.parse(getCaptured().data);
    expect(parsed).toHaveProperty('sessions');
    expect(parsed).toHaveProperty('connected_platforms');
    expect(parsed).toHaveProperty('pipeline');
    expect(parsed).toHaveProperty('pipeline_runs');
  });

  // ──────────────────────────────────────────────────────────────
  // Test 5: maxWait=2000ms — 持续事件流强制广播
  // ──────────────────────────────────────────────────────────────
  it('5 | maxWait=2000ms：持续事件流在 2000ms 内强制广播', async () => {
    const { client, getCaptured } = mockSSEClient();
    sseClients.push(client);

    // 连续发射事件（模拟高频变更）
    emitEvent('session:changed', { sessionId: sid, action: 'join' });

    // 每隔 300ms 发射一次，防止去抖 500ms 触发，但 maxWait 应保证 2000ms 内触发
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(300);
      emitEvent('run:changed', { runId, sessionId: sid, action: 'update' });
    }

    // 总耗时 1800ms（6 * 300ms），maxWait=2000ms 尚未到达
    // 但下一次 advance 后，maxWait 应触发
    expect(getCaptured()).toBeNull();

    // 前进至 2100ms 总耗时，maxWait（2000ms 自首次事件）应已触发
    await vi.advanceTimersByTimeAsync(300);
    expect(getCaptured()).not.toBeNull();
    const parsed = JSON.parse(getCaptured().data);
    expect(parsed).toHaveProperty('sessions');
    expect(parsed).toHaveProperty('connected_platforms');
  });

  // ──────────────────────────────────────────────────────────────
  // Test 6: 多种事件类型均触发广播
  // ──────────────────────────────────────────────────────────────
  it('6 | 四种 PubSub 事件类型均能触发去抖广播', async () => {
    const { client, getCaptured } = mockSSEClient();
    sseClients.push(client);

    const types = ['session:changed', 'run:changed', 'gate:advanced', 'agent:event'] as const;

    for (const type of types) {
      const prev = getCaptured();
      emitEvent(type, { sessionId: sid, runId } as any);
      await vi.advanceTimersByTimeAsync(600);
      expect(getCaptured()).not.toBe(prev);
    }
  });

  // ──────────────────────────────────────────────────────────────
  // Test 7: 8s 兜底定时器仍在工作
  // ──────────────────────────────────────────────────────────────
  it('7 | 8s 兜底定时器与事件驱动广播共存', async () => {
    const { client, getCaptured } = mockSSEClient();
    sseClients.push(client);

    // 不发射事件，8s 后兜底应触发
    expect(getCaptured()).toBeNull();
    await vi.advanceTimersByTimeAsync(8500);
    expect(getCaptured()).not.toBeNull();
    const parsed = JSON.parse(getCaptured().data);
    expect(parsed).toHaveProperty('sessions');
    expect(parsed).toHaveProperty('connected_platforms');
  });
});
