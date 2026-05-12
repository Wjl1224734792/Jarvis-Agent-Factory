/**
 * TASK-002: Agent 数据查询 REST API — TDD 单元测试
 *
 * 测试范围:
 *   1. GET /api/agent-status → 正确分类 active/completed/failed
 *   2. GET /api/agent-events → 返回事件列表，可选 agent_id 过滤
 *   3. POST /api/agent-event → 写入事件，返回 id
 *   4. SSE broadcast 数据包含 agent_status 字段
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Hono } from 'hono';
import { setupApiRoutes, broadcastSSE, sseClients } from '../src/web/routes.js';
import {
  openDb, addSession, createPipelineRun, insertAgentEvent,
  getAgentEvents,
} from '../src/engine/db.js';

/** 每个测试文件独立数据库 */
const TEST_DB = resolve(tmpdir(), `jarvis-test-api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);

/** 每个测试使用唯一会话和 Run ID 避免交叉污染 */
function makeSid() {
  return `sid_api_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function makeRunId() {
  return `run_api_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

describe('Agent API Endpoints', () => {
  let app;
  let db;
  let sid;
  let runId;

  beforeEach(() => {
    db = openDb(TEST_DB);
    sid = makeSid();
    runId = makeRunId();
    addSession(db, sid, 'claude', 'member');

    // 插入测试数据
    // agent-a: completed（start + end）
    insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'agent-a',
      event_type: 'start', model: 'claude-sonnet-4-6',
    });
    insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'agent-a',
      event_type: 'end', model: 'claude-sonnet-4-6',
      input_tokens: 500, output_tokens: 200,
    });
    // agent-b: active（仅 start）
    insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'agent-b',
      event_type: 'start', model: 'deepseek-v4-pro',
    });
    // agent-c: failed（start + error）
    insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'agent-c',
      event_type: 'start',
    });
    insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'agent-c',
      event_type: 'error', error_message: 'timeout',
    });

    app = new Hono();
    setupApiRoutes(app, db, process.cwd());
  });

  afterEach(() => {
    // 清理 SSE 客户端，避免跨测试干扰
    sseClients.splice(0, sseClients.length);
  });

  // ──────────────────────────────────────────────────────────────
  // Test 1: GET /api/agent-status
  // ──────────────────────────────────────────────────────────────
  it('1 | GET /api/agent-status 正确分类 active/completed/failed', async () => {
    const res = await app.request(`/api/agent-status?run_id=${runId}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.run_id).toBe(runId);
    expect(body.active).toContain('agent-b');
    expect(body.completed).toContain('agent-a');
    expect(body.failed).toContain('agent-c');

    // 交叉验证
    expect(body.completed).not.toContain('agent-b');
    expect(body.active).not.toContain('agent-a');
    expect(body.failed).not.toContain('agent-a');

    // 不存在的 run_id 返回空数组
    const res2 = await app.request('/api/agent-status?run_id=nonexistent');
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.active).toEqual([]);
    expect(body2.completed).toEqual([]);
    expect(body2.failed).toEqual([]);
  });

  // ──────────────────────────────────────────────────────────────
  // Test 3: GET /api/agent-events
  // ──────────────────────────────────────────────────────────────
  it('2 | GET /api/agent-events 返回事件列表，支持 agent_id 过滤', async () => {
    const res = await app.request(`/api/agent-events?run_id=${runId}&agent_id=agent-a`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('events');
    expect(body.events).toHaveLength(2);
    expect(body.events[0].agent_id).toBe('agent-a');
    expect(body.events[0].event_type).toBe('start');
    expect(body.events[1].agent_id).toBe('agent-a');
    expect(body.events[1].event_type).toBe('end');

    // 不传 agent_id 返回全部事件
    const res2 = await app.request(`/api/agent-events?run_id=${runId}`);
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.events).toHaveLength(5); // start+end for agent-a, start for agent-b, start+error for agent-c

    // 不传 run_id 返回 400
    const res3 = await app.request('/api/agent-events');
    expect(res3.status).toBe(400);
    const body3 = await res3.json();
    expect(body3).toHaveProperty('error');
  });

  // ──────────────────────────────────────────────────────────────
  // Test 4: POST /api/agent-event
  // ──────────────────────────────────────────────────────────────
  it('3 | POST /api/agent-event 写入事件，返回 id', async () => {
    const realRunId = createPipelineRun(db, sid, 'test-project');
    const res = await app.request('/api/agent-event', {
      method: 'POST',
      body: JSON.stringify({
        event: 'start',
        agent_id: 'test-agent-post',
        run_id: realRunId,
        session_id: sid,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBeGreaterThan(0);
    expect(body).toHaveProperty('total_tokens');

    // 验证已写入
    const events = getAgentEvents(db, realRunId, 'test-agent-post');
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('start');

    // 缺少必填字段返回 400
    const res2 = await app.request('/api/agent-event', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res2.status).toBe(400);
    const body2 = await res2.json();
    expect(body2).toHaveProperty('error');
  });

  // ──────────────────────────────────────────────────────────────
  // Test 5: SSE agent_status
  // ──────────────────────────────────────────────────────────────
  it('4 | SSE 广播数据包含 agent_status 字段', () => {
    // 创建 pipeline_run 让 getActiveRun 能找到
    const testRunId = createPipelineRun(db, sid, 'test-project');
    // 为这个 run 插入事件
    insertAgentEvent(db, {
      run_id: testRunId, session_id: sid, agent_id: 'sse-agent-1',
      event_type: 'start',
    });
    insertAgentEvent(db, {
      run_id: testRunId, session_id: sid, agent_id: 'sse-agent-2',
      event_type: 'start',
    });
    insertAgentEvent(db, {
      run_id: testRunId, session_id: sid, agent_id: 'sse-agent-2',
      event_type: 'end',
    });

    // 注入 mock SSE 客户端
    let capturedData: any = null;
    const mockClient = {
      stream: null as any,
      db: null as any,
      root: '',
      aborted: false,
      writeSSE: async (data: any) => { capturedData = data; },
      sleep: async (_ms: number) => {},
    };
    sseClients.push(mockClient);

    broadcastSSE();

    expect(capturedData).toBeTruthy();
    const parsed = JSON.parse(capturedData.data);
    expect(parsed.sessions.length).toBeGreaterThanOrEqual(1);
    // 找到当前测试的 session 验证 agent_status
    const sessionData = parsed.sessions.find((s: any) => s.id === sid);
    expect(sessionData).toBeTruthy();
    expect(sessionData).toHaveProperty('agent_status');
    expect(sessionData.agent_status).not.toBeNull();
    expect(sessionData.agent_status.active).toContain('sse-agent-1');
    expect(sessionData.agent_status.active).not.toContain('sse-agent-2');
    expect(sessionData.agent_status.recent_completed).toBeInstanceOf(Array);
    // sse-agent-2 的 end 事件应在 recent_completed 中
    const completedIds = sessionData.agent_status.recent_completed.map(
      (item: any) => item.agent_id,
    );
    expect(completedIds).toContain('sse-agent-2');
  });
});
