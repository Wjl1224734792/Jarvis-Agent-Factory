/**
 * TASK-005: 所有 DB 写操作注入事件 emit — server.ts 单元测试
 *
 * 测试范围:
 *   1. session_join (新会话) → session:changed + run:changed
 *   2. session_join (恢复创建新run) → session:changed + run:changed
 *   3. session_leave → session:changed
 *   4. advance_gate → gate:advanced
 *   5. advance_gate (last gate) → gate:advanced + run:changed
 *   6. gate_jump → gate:advanced
 *   7. pipeline_init → run:changed
 *   8. session_set_name → run:changed
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  registerMcpTools,
} from '../src/engine/server.js';
import * as pubsub from '../src/engine/pubsub.js';
import {
  openDb,
  addSession,
  createPipelineRun,
  initPipeline,
  addCheckpoint,
} from '../src/engine/db.js';

const TEST_DB = resolve(tmpdir(), `jarvis-test-server-emit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);

let _counter = 0;
function makeSid(): string {
  return `srv_emit_${++_counter}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 创建 mock McpServer 用于测试工具注册
 * 返回 { server, tools } 其中 tools 按名称索引工具处理器
 */
type ToolHandler = (_params: Record<string, unknown>, _extra?: { sessionId?: string }) => Promise<{ content: Array<{ type: string; text?: string }> }>;

function createMockMcpServer(): { server: any; tools: Record<string, ToolHandler> } {
  const tools: Record<string, ToolHandler> = {} as Record<string, ToolHandler>;
  const server = {
    tool: (name: string, _desc: string, _schema: unknown, handler: ToolHandler) => {
      tools[name] = handler;
    },
  };
  return { server, tools };
}

describe('TASK-005: server.ts MCP 写操作 emitEvent', () => {
  let db: any;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pubsub.resetPubSub();
    db = openDb(TEST_DB);
    emitSpy = vi.spyOn(pubsub, 'emitEvent').mockImplementation(() => {});
  });

  afterEach(() => {
    emitSpy.mockRestore();
    pubsub.resetPubSub();
  });

  // ──────────────────────────────────────────────────────────
  // 1. session_join (新会话)
  // ──────────────────────────────────────────────────────────
  it('1 | session_join 新会话 emit session:changed + run:changed', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, '/tmp');
    const handler = tools['session_join'];

    const result = await handler(
      { platform: 'claude', pipeline_type: 'full' },
      { sessionId: makeSid() },
    );

    const text = JSON.parse(result.content[0].text!);
    expect(text.session_id).toBeDefined();
    // 新会话 → session:changed + run:changed
    expect(emitSpy).toHaveBeenCalledWith('session:changed', {
      sessionId: expect.any(String),
      action: 'join',
    });
    expect(emitSpy).toHaveBeenCalledWith('run:changed', {
      runId: expect.any(String),
      sessionId: expect.any(String),
      action: 'create',
    });
    expect(emitSpy).toHaveBeenCalledTimes(2);
  });

  // ──────────────────────────────────────────────────────────
  // 2. session_join (恢复创建新run)
  // ──────────────────────────────────────────────────────────
  it('2 | session_join 恢复并创建新 run emit session:changed + run:changed', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, '/tmp');
    const sid = makeSid();

    // 先创建旧会话，但不创建 run（模拟旧会话无活跃 run）
    addSession(db, sid, 'claude', 'member');

    const handler = tools['session_join'];
    const result = await handler(
      { platform: 'claude', pipeline_type: 'full' },
      { sessionId: sid },
    );

    const text = JSON.parse(result.content[0].text!);
    expect(text.session_id).toBe(sid);
    // 恢复会话 + 创建新 run → 两个事件
    expect(emitSpy).toHaveBeenCalledWith('session:changed', {
      sessionId: sid,
      action: 'join',
    });
    expect(emitSpy).toHaveBeenCalledWith('run:changed', {
      runId: expect.any(String),
      sessionId: sid,
      action: 'create',
    });
    expect(emitSpy).toHaveBeenCalledTimes(2);
  });

  // ──────────────────────────────────────────────────────────
  // 3. session_leave → session:changed
  // ──────────────────────────────────────────────────────────
  it('3 | session_leave emit session:changed', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, '/tmp');
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');

    const handler = tools['session_leave'];
    await handler({}, { sessionId: sid });

    expect(emitSpy).toHaveBeenCalledWith('session:changed', {
      sessionId: sid,
      action: 'leave',
    });
  });

  // ──────────────────────────────────────────────────────────
  // 4. advance_gate → gate:advanced
  // ──────────────────────────────────────────────────────────
  it('4 | advance_gate emit gate:advanced', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, '/tmp');
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');
    const runId = createPipelineRun(db, sid, 'test-project');
    initPipeline(db, sid, 'test-project');
    // 从 Gate A → Gate B-DDD 推进需要 Gate A 的 checkpoint
    addCheckpoint(db, 'Gate A', 'Gate B-DDD', sid);

    const handler = tools['advance_gate'];
    const result = await handler(
      { gate: 'Gate B-DDD', run_id: runId },
      { sessionId: sid },
    );

    // 验证推进成功
    const text = JSON.parse(result.content[0].text!);
    expect(text.allowed).toBe(true);

    expect(emitSpy).toHaveBeenCalledWith('gate:advanced', {
      sessionId: sid,
      runId: expect.any(String),
      gate: 'Gate B-DDD',
      previousGate: 'Gate A',
    });
  });

  // ──────────────────────────────────────────────────────────
  // 5. advance_gate (last gate) → gate:advanced + run:changed
  // ──────────────────────────────────────────────────────────
  it('5 | advance_gate 最后一个 Gate 额外 emit run:changed complete', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, '/tmp');
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');
    const runId = createPipelineRun(db, sid, 'test-project');
    initPipeline(db, sid, 'test-project');

    // full 模式 gates: Gate A, Gate B-DDD, Gate B-BDD, Gate B-TDD, Gate B1,
    //   Gate C, Gate C-impl, Gate C1, Gate C1.5, Gate C2, Gate D, Gate E
    // 最后一个 Gate 是 Gate E，前一 gate 是 Gate D
    // 添加所有已通过 Gate 的 checkpoints（从 A → D）
    const gateList = [
      'Gate A', 'Gate B-DDD', 'Gate B-BDD', 'Gate B-TDD', 'Gate B1',
      'Gate C', 'Gate C-impl', 'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D',
    ];
    for (let i = 0; i < gateList.length; i++) {
      const nextGate = gateList[i + 1] || 'Gate E';
      addCheckpoint(db, gateList[i], nextGate, sid);
    }

    // 将 pipeline 设为 Gate D
    db.prepare('UPDATE pipeline SET current_gate=? WHERE session_id=?').run('Gate D', sid);

    const handler = tools['advance_gate'];
    const result = await handler(
      { gate: 'Gate E', run_id: runId },
      { sessionId: sid },
    );

    // 验证推进成功
    const text = JSON.parse(result.content[0].text!);
    expect(text.allowed).toBe(true);

    // gate:advanced 必然调用
    expect(emitSpy).toHaveBeenCalledWith('gate:advanced', {
      sessionId: sid,
      runId: expect.any(String),
      gate: 'Gate E',
      previousGate: 'Gate D',
    });

    // run:changed with action 'complete' 也应调用（Gate E 是最后一个 Gate）
    expect(emitSpy).toHaveBeenCalledWith('run:changed', {
      runId: expect.any(String),
      sessionId: sid,
      action: 'complete',
    });
  });

  // ──────────────────────────────────────────────────────────
  // 6. gate_jump → gate:advanced
  // ──────────────────────────────────────────────────────────
  it('6 | gate_jump emit gate:advanced', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, '/tmp');
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');
    const runId = createPipelineRun(db, sid, 'test-project');
    // lite 模式允许 gate_jump
    initPipeline(db, sid, 'test-project', 'lite');

    const handler = tools['gate_jump'];
    await handler(
      { gate: 'Gate C', run_id: runId },
      { sessionId: sid },
    );

    expect(emitSpy).toHaveBeenCalledWith('gate:advanced', {
      sessionId: sid,
      runId: expect.any(String),
      gate: 'Gate C',
      previousGate: 'Gate A',
    });
  });

  // ──────────────────────────────────────────────────────────
  // 7. pipeline_init → run:changed
  // ──────────────────────────────────────────────────────────
  it('7 | pipeline_init emit run:changed with action create', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, '/tmp');
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');

    const handler = tools['pipeline_init'];
    await handler(
      { project_name: 'test-project', pipeline_type: 'full' },
      { sessionId: sid },
    );

    expect(emitSpy).toHaveBeenCalledWith('run:changed', {
      runId: expect.any(String),
      sessionId: sid,
      action: 'create',
    });
  });

  // ──────────────────────────────────────────────────────────
  // 8. session_set_name → run:changed
  // ──────────────────────────────────────────────────────────
  it('8 | session_set_name emit run:changed with action rename', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, '/tmp');
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');
    const runId = createPipelineRun(db, sid, 'test-project');
    initPipeline(db, sid, 'test-project');

    const handler = tools['session_set_name'];
    await handler(
      { name: '新名称' },
      { sessionId: sid },
    );

    expect(emitSpy).toHaveBeenCalledWith('run:changed', {
      runId,
      sessionId: sid,
      action: 'rename',
    });
  });
});
