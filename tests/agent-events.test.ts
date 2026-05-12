/**
 * TASK-001: Agent 事件追踪基础设施 — TDD 单元测试
 *
 * 测试范围:
 *   1. insertAgentEvent start → event_type='start', tokens=0
 *   2. insertAgentEvent end → 自动计算 duration_ms，tokens 正确存储
 *   3. insertAgentEvent error → status='error', error_message 写入
 *   4. getAgentStatus → active/completed/failed 分类
 *   5. deleteRun 级联删除关联 agent_events
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  openDb, insertAgentEvent, checkAgentEventDuplicate,
  getAgentEvents, getAgentStatus,
  addSession, createPipelineRun, deleteRun, getPipelineRun,
} from '../src/engine/db.js';

/** 为每个测试文件创建独立数据库，避免 CI 并行锁定 */
function testDbPath() {
  const fname = `jarvis-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`;
  return resolve(tmpdir(), fname);
}
const TEST_DB = testDbPath();

/** 每个测试使用唯一会话和 Run ID 避免交叉污染 */
function makeSid() { return `sid_ae_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function makeRunId() { return `run_ae_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

describe('Agent Events', () => {
  let db;
  let sid;
  let runId;

  beforeEach(() => {
    db = openDb(TEST_DB);
    sid = makeSid();
    runId = makeRunId();
    addSession(db, sid, 'claude', 'member');
  });

  /** 辅助：查询 agent_events 表的列信息 */
  function tableColumns(tableName) {
    return db.prepare(`PRAGMA table_info('${tableName}')`).all();
  }

  // ──────────────────────────────────────────────────────────────
  // Schema 验证
  // ──────────────────────────────────────────────────────────────
  it('agent_events 表存在且包含所有必要列 + 索引', () => {
    const cols = tableColumns('agent_events');
    const colNames = cols.map(c => c.name);

    ['id', 'run_id', 'session_id', 'agent_id', 'event_type', 'model',
      'status', 'input_tokens', 'output_tokens', 'cache_creation_input_tokens',
      'cache_read_input_tokens', 'error_message', 'started_at', 'ended_at',
      'duration_ms', 'created_at'].forEach(c => {
      expect(colNames).toContain(c);
    });

    // total_tokens 是 VIRTUAL 列，不出现在 PRAGMA table_info 中（SQLite behavior）
    // 但可以通过 INSERT + SELECT 验证
    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='agent_events'"
    ).all();
    const idxNames = indexes.map(i => i.name);
    expect(idxNames).toContain('idx_agent_events_run');
    expect(idxNames).toContain('idx_agent_events_lookup');
  });

  // ──────────────────────────────────────────────────────────────
  // Test 1: start 写入
  // ──────────────────────────────────────────────────────────────
  it('1 | insertAgentEvent start → DB 记录 event_type=start, tokens=0', () => {
    const result = insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'test-agent-1',
      event_type: 'start',
    });
    expect(result.id).toBeGreaterThan(0);
    expect(result.total_tokens).toBe(0);

    const events = getAgentEvents(db, runId);
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('start');
    expect(events[0].agent_id).toBe('test-agent-1');
    expect(events[0].session_id).toBe(sid);
    expect(events[0].input_tokens).toBe(0);
    expect(events[0].output_tokens).toBe(0);
    expect(events[0].status).toBeNull();
    expect(events[0].duration_ms).toBeNull();
    expect(events[0].error_message).toBeNull();
    // created_at 自动填充
    expect(events[0].created_at).toBeTruthy();
  });

  // ──────────────────────────────────────────────────────────────
  // Test 2: end 计算 duration_ms
  // ──────────────────────────────────────────────────────────────
  it('2 | insertAgentEvent end → 自动计算 duration_ms，tokens 正确存储', () => {
    // 先写入 start 事件
    insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'test-agent-2',
      event_type: 'start', model: 'claude-sonnet-4-6',
    });

    // 等待至少 1ms 确保 duration > 0
    const endResult = insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'test-agent-2',
      event_type: 'end', model: 'claude-sonnet-4-6',
      input_tokens: 1000, output_tokens: 500,
    });
    expect(endResult.id).toBeGreaterThan(0);

    const events = getAgentEvents(db, runId);
    const startEvent = events.find(e => e.event_type === 'start');
    const endEvent = events.find(e => e.event_type === 'end');

    expect(startEvent).toBeTruthy();
    expect(endEvent).toBeTruthy();
    expect(endEvent.input_tokens).toBe(1000);
    expect(endEvent.output_tokens).toBe(500);
    expect(endEvent.status).toBe('success');
    expect(endEvent.duration_ms).toBeGreaterThanOrEqual(0);
    expect(endEvent.started_at).toBeTruthy();
    expect(endEvent.ended_at).toBeTruthy();
    // total_tokens VIRTUAL 列验证
    expect(endEvent.total_tokens).toBe(1500);
  });

  // ──────────────────────────────────────────────────────────────
  // Test 3: error 写入
  // ──────────────────────────────────────────────────────────────
  it('3 | insertAgentEvent error → status=error, error_message 写入', () => {
    insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'test-agent-3',
      event_type: 'start',
    });

    const result = insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'test-agent-3',
      event_type: 'error', error_message: 'Connection timeout',
    });
    expect(result.id).toBeGreaterThan(0);

    const events = getAgentEvents(db, runId);
    const errEvent = events.find(e => e.event_type === 'error');
    expect(errEvent).toBeTruthy();
    expect(errEvent.status).toBe('error');
    expect(errEvent.error_message).toBe('Connection timeout');
    // error 事件也会计算 duration_ms
    expect(errEvent.duration_ms).toBeGreaterThanOrEqual(0);
  });

  // ──────────────────────────────────────────────────────────────
  // Test 4: status 分类
  // ──────────────────────────────────────────────────────────────
  it('4 | getAgentStatus → active/completed/failed 分类正确', () => {
    // active: 只有 start，没有 end/error
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'active-agent', event_type: 'start' });
    // completed: start + end
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'completed-agent', event_type: 'start' });
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'completed-agent', event_type: 'end' });
    // failed: start + error
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'failed-agent', event_type: 'start' });
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'failed-agent', event_type: 'error', error_message: 'timeout' });

    const status = getAgentStatus(db, runId);
    expect(status.run_id).toBe(runId);
    expect(status.active).toContain('active-agent');
    expect(status.completed).toContain('completed-agent');
    expect(status.failed).toContain('failed-agent');

    // 交叉验证：active-agent 不在 completed/failed 中
    expect(status.completed).not.toContain('active-agent');
    expect(status.failed).not.toContain('active-agent');
  });

  // ──────────────────────────────────────────────────────────────
  // Test 5: deleteRun 级联
  // ──────────────────────────────────────────────────────────────
  it('5 | deleteRun 级联删除关联 agent_events', () => {
    const realRunId = createPipelineRun(db, sid, 'test-project');
    insertAgentEvent(db, { run_id: realRunId, session_id: sid, agent_id: 'test-agent-7', event_type: 'start' });
    expect(getAgentEvents(db, realRunId)).toHaveLength(1);

    const delResult = deleteRun(db, realRunId);
    expect(delResult.ok).toBe(true);

    // pipeline_runs 记录已删除
    expect(getPipelineRun(db, realRunId)).toBeUndefined();
    // agent_events 也应级联删除
    const eventsAfter = getAgentEvents(db, realRunId);
    expect(eventsAfter).toHaveLength(0);
  });

  // ──────────────────────────────────────────────────────────────
  // VIRTUAL 列 total_tokens 验证
  // ──────────────────────────────────────────────────────────────
  it('VIRTUAL total_tokens 列自动计算 input+output+cache 总和', () => {
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'test-vt', event_type: 'start' });
    insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'test-vt',
      event_type: 'end',
      input_tokens: 100, output_tokens: 200,
      cache_creation_input_tokens: 50, cache_read_input_tokens: 30,
    });

    const events = getAgentEvents(db, runId);
    const endEvent = events.find(e => e.event_type === 'end');
    // 100 + 200 + 50 + 30 = 380
    expect(endEvent.total_tokens).toBe(380);
  });

  // ──────────────────────────────────────────────────────────────
  // TASK-002: 去重测试
  // ──────────────────────────────────────────────────────────────
  it('6 | 去重：重复 start 事件被检测为 duplicate', () => {
    const r1 = insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'dedup-start-agent',
      event_type: 'start',
    });
    expect(r1.id).toBeGreaterThan(0);

    const dup = checkAgentEventDuplicate(db, runId, 'dedup-start-agent', 'start');
    expect(dup.duplicate).toBe(true);
    expect(dup.id).toBe(r1.id);
    expect(dup.total_tokens).toBe(0);
  });

  it('7 | 去重：start→end 后 start 允许新的 start（Agent 重启场景）', () => {
    insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'restart-agent',
      event_type: 'start',
    });
    insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'restart-agent',
      event_type: 'end', input_tokens: 100, output_tokens: 50,
    });

    // end 之后新的 start 应该允许
    const dup = checkAgentEventDuplicate(db, runId, 'restart-agent', 'start');
    expect(dup.duplicate).toBe(false);
  });

  it('8 | 去重：重复 end 事件被检测为 duplicate', () => {
    insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'dedup-end-agent',
      event_type: 'start',
    });
    const r2 = insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'dedup-end-agent',
      event_type: 'end', input_tokens: 200, output_tokens: 100,
    });

    const dup = checkAgentEventDuplicate(db, runId, 'dedup-end-agent', 'end');
    expect(dup.duplicate).toBe(true);
    expect(dup.id).toBe(r2.id);
    expect(dup.total_tokens).toBe(300);
  });

  it('9 | 去重：重复 error 事件被检测为 duplicate', () => {
    insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'dedup-err-agent',
      event_type: 'start',
    });
    const r3 = insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'dedup-err-agent',
      event_type: 'error', error_message: 'timeout',
    });

    const dup = checkAgentEventDuplicate(db, runId, 'dedup-err-agent', 'error');
    expect(dup.duplicate).toBe(true);
    expect(dup.id).toBe(r3.id);
    expect(dup.total_tokens).toBe(0);
  });

  it('10 | 去重：新 agent 首次 start 不重复', () => {
    const dup = checkAgentEventDuplicate(db, runId, 'fresh-agent', 'start');
    expect(dup.duplicate).toBe(false);
  });

  it('11 | 去重：start→error 后 start 允许新的 start', () => {
    insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'err-restart-agent',
      event_type: 'start',
    });
    insertAgentEvent(db, {
      run_id: runId, session_id: sid, agent_id: 'err-restart-agent',
      event_type: 'error', error_message: 'crash',
    });

    // error 之后新的 start 应该允许
    const dup = checkAgentEventDuplicate(db, runId, 'err-restart-agent', 'start');
    expect(dup.duplicate).toBe(false);
  });
});
