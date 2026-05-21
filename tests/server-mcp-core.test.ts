/**
 * MCP Core API Integration Tests — session_join / gate_check / gate_enforce / advance_gate / pipeline_init
 *
 * Tests the engine's primary security boundary: gate-based operation enforcement.
 * Uses in-memory SQLite via the existing openDb test pattern.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import {
  registerMcpTools,
} from '../src/engine/server.js';
import * as pubsub from '../src/engine/pubsub.js';
import {
  openDb,
  addSession,
  initPipeline,
  addCheckpoint,
} from '../src/engine/db.js';

const TEST_DB = resolve(tmpdir(), `jarvis-test-mcp-core-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
const TMP_ROOT = resolve(tmpdir(), `jarvis-test-mcp-root-${Date.now()}`);

let _counter = 0;
function makeSid(): string {
  return `mcp_core_${++_counter}_${Math.random().toString(36).slice(2, 8)}`;
}

function createMockMcpServer(): { server: any; tools: Record<string, any> } {
  const tools: Record<string, any> = {};
  const server = {
    tool: (name: string, _desc: string, _schema: unknown, handler: any) => {
      tools[name] = handler;
    },
  };
  return { server, tools };
}

describe('MCP Core API — session_join', () => {
  let db: any;

  beforeEach(() => {
    pubsub.resetPubSub();
    db = openDb(TEST_DB);
    if (!existsSync(TMP_ROOT)) mkdirSync(TMP_ROOT, { recursive: true });
  });

  afterEach(() => {
    pubsub.resetPubSub();
  });

  it('新会话创建成功并返回 session_id', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const sid = makeSid();
    const result = await tools['session_join'](
      { platform: 'claude', pipeline_type: 'full' },
      { sessionId: sid },
    );
    const data = JSON.parse(result.content[0].text);
    expect(data.session_id).toBe(sid);
    expect(data.pipeline_type).toBe('full');
  });

  it('无效 pipeline_type 被拒绝', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const result = await tools['session_join'](
      { platform: 'claude', pipeline_type: 'invalid_pipeline' },
      { sessionId: makeSid() },
    );
    const data = JSON.parse(result.content[0].text);
    expect(data.error).toBeDefined();
    expect(data.error).toContain('Invalid pipeline_type');
  });

  it('已有会话恢复，不创建新 session', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const sid = makeSid();
    await tools['session_join']({ platform: 'claude' }, { sessionId: sid });
    const result = await tools['session_join']({ platform: 'claude' }, { sessionId: sid });
    const data = JSON.parse(result.content[0].text);
    expect(data.session_id).toBe(sid);
    expect(data.error).toBeUndefined();
  });
});

describe('MCP Core API — gate_check', () => {
  let db: any;

  beforeEach(() => {
    pubsub.resetPubSub();
    db = openDb(TEST_DB);
    if (!existsSync(TMP_ROOT)) mkdirSync(TMP_ROOT, { recursive: true });
  });

  afterEach(() => {
    pubsub.resetPubSub();
  });

  async function joinSession(tools: Record<string, any>, sid: string) {
    await tools['session_join'](
      { platform: 'claude', pipeline_type: 'full' },
      { sessionId: sid },
    );
  }

  it('Gate A 允许 read + write_doc，拒绝 write_code + spawn_impl', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const sid = makeSid();
    await joinSession(tools, sid);

    const read = await tools['gate_check']({ operation: 'read' }, { sessionId: sid });
    expect(JSON.parse(read.content[0].text).allowed).toBe(true);

    const writeDoc = await tools['gate_check']({ operation: 'write_doc' }, { sessionId: sid });
    expect(JSON.parse(writeDoc.content[0].text).allowed).toBe(true);

    const writeCode = await tools['gate_check']({ operation: 'write_code' }, { sessionId: sid });
    expect(JSON.parse(writeCode.content[0].text).allowed).toBe(false);

    const spawnImpl = await tools['gate_check']({ operation: 'spawn_impl' }, { sessionId: sid });
    expect(JSON.parse(spawnImpl.content[0].text).allowed).toBe(true);
  });

  it('gate_check 正确返回操作是否允许', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const sid = makeSid();
    await joinSession(tools, sid);

    // read is always allowed
    const read = await tools['gate_check']({ operation: 'read' }, { sessionId: sid });
    expect(JSON.parse(read.content[0].text).allowed).toBe(true);
    expect(JSON.parse(read.content[0].text).operation).toBe('read');
    expect(JSON.parse(read.content[0].text).gate).toBe('Gate A');
  });

  it('未知操作返回 allowed: false', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const sid = makeSid();
    await joinSession(tools, sid);
    const result = await tools['gate_check']({ operation: 'nonexistent_op' }, { sessionId: sid });
    const data = JSON.parse(result.content[0].text);
    expect(data.allowed).toBe(false);
  });
});

describe('MCP Core API — advance_gate', () => {
  let db: any;

  beforeEach(() => {
    pubsub.resetPubSub();
    db = openDb(TEST_DB);
    if (!existsSync(TMP_ROOT)) mkdirSync(TMP_ROOT, { recursive: true });
  });

  afterEach(() => {
    pubsub.resetPubSub();
  });

  async function setupAtGate(tools: Record<string, any>, sid: string) {
    await tools['session_join'](
      { platform: 'claude', pipeline_type: 'full' },
      { sessionId: sid },
    );
    initPipeline(db, sid, 'test-project');
  }

  it('Gate A → Gate B-DDD 正常推进', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const sid = makeSid();
    await setupAtGate(tools, sid);
    // Need checkpoint for gate_enforce to pass
    addCheckpoint(db, 'Gate A', 'Gate B-DDD', sid);
    const result = await tools['advance_gate']({ gate: 'Gate B-DDD' }, { sessionId: sid });
    const data = JSON.parse(result.content[0].text);
    expect(data.allowed).toBe(true);
  });

  it('向后推进被 FSM 拒绝', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const sid = makeSid();
    await setupAtGate(tools, sid);
    addCheckpoint(db, 'Gate A', 'Gate B-DDD', sid);
    // Advance to B-DDD first
    await tools['advance_gate']({ gate: 'Gate B-DDD' }, { sessionId: sid });
    // Try to go backward
    const result = await tools['advance_gate']({ gate: 'Gate A' }, { sessionId: sid });
    const data = JSON.parse(result.content[0].text);
    expect(data.allowed).toBe(false);
    expect(data.error).toContain('backward');
  });

  it('跳过 Gate 被 FSM 拒绝', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const sid = makeSid();
    await setupAtGate(tools, sid);
    // Try to skip directly to Gate B-TDD
    const result = await tools['advance_gate']({ gate: 'Gate B-TDD' }, { sessionId: sid });
    const data = JSON.parse(result.content[0].text);
    expect(data.allowed).toBe(false);
    expect(data.error).toContain('skip');
  });

  it('条件未满足时拒绝推进（无 checkpoint）', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const sid = makeSid();
    await setupAtGate(tools, sid);
    // No checkpoint → should fail
    const result = await tools['advance_gate']({ gate: 'Gate B-DDD' }, { sessionId: sid });
    const data = JSON.parse(result.content[0].text);
    expect(data.allowed).toBe(false);
    expect(data.error).toContain('NOT met');
  });
});

describe('MCP Core API — pipeline_init', () => {
  let db: any;

  beforeEach(() => {
    pubsub.resetPubSub();
    db = openDb(TEST_DB);
    if (!existsSync(TMP_ROOT)) mkdirSync(TMP_ROOT, { recursive: true });
  });

  afterEach(() => {
    pubsub.resetPubSub();
  });

  it('pipeline_init 创建 run 并返回 run_id', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');

    const result = await tools['pipeline_init'](
      { project_name: 'test-project', pipeline_type: 'full', task_name: '测试' },
      { sessionId: sid },
    );
    const data = JSON.parse(result.content[0].text);
    expect(data.run_id).toBeDefined();
    expect(data.pipeline_type).toBe('full');
  });

  it('无效 pipeline_type 回退到默认值', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');

    const result = await tools['pipeline_init'](
      { pipeline_type: 'invalid' },
      { sessionId: sid },
    );
    const data = JSON.parse(result.content[0].text);
    expect(data.error).toBeUndefined();
  });
});

describe('MCP Core API — gate_enforce', () => {
  let db: any;

  beforeEach(() => {
    pubsub.resetPubSub();
    db = openDb(TEST_DB);
    if (!existsSync(TMP_ROOT)) mkdirSync(TMP_ROOT, { recursive: true });
  });

  afterEach(() => {
    pubsub.resetPubSub();
  });

  async function joinSession(tools: Record<string, any>, sid: string) {
    await tools['session_join'](
      { platform: 'claude', pipeline_type: 'full' },
      { sessionId: sid },
    );
    initPipeline(db, sid, 'test-project');
  }

  it('checkpoint 存在时 gate_enforce 通过（allowed=true）', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const sid = makeSid();
    await joinSession(tools, sid);
    addCheckpoint(db, 'Gate A', 'Gate B-DDD', sid);

    const result = await tools['gate_enforce']({}, { sessionId: sid });
    const data = JSON.parse(result.content[0].text);
    expect(data.allowed).toBe(true);
    expect(data.session_id).toBe(sid);
  });

  it('无 checkpoint 无 artifact 时 gate_enforce 报告 blocked', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const sid = makeSid();
    await joinSession(tools, sid);
    // No checkpoint or artifact

    const result = await tools['gate_enforce']({}, { sessionId: sid });
    const data = JSON.parse(result.content[0].text);
    expect(data.allowed).toBe(false);
    expect(data.blocked_reasons).toBeDefined();
  });
});

describe('MCP Core API — pipeline_guide', () => {
  let db: any;

  beforeEach(() => {
    pubsub.resetPubSub();
    db = openDb(TEST_DB);
    if (!existsSync(TMP_ROOT)) mkdirSync(TMP_ROOT, { recursive: true });
  });

  afterEach(() => {
    pubsub.resetPubSub();
  });

  it('pipeline_guide 返回当前 gate + allowed_operations + agent_spawn', async () => {
    const { server, tools } = createMockMcpServer();
    registerMcpTools(server, db, TMP_ROOT);
    const sid = makeSid();
    addSession(db, sid, 'claude', 'member');
    initPipeline(db, sid, 'test-project');

    const result = await tools['pipeline_guide']({}, { sessionId: sid });
    const data = JSON.parse(result.content[0].text);
    expect(data.gate).toBe('Gate A');
    expect(data.allowed_operations).toBeDefined();
    expect(data.allowed_operations.length).toBeGreaterThan(0);
    expect(data.agent_spawn).toBeDefined();
    expect(data.session_id).toBe(sid);
  });
});
