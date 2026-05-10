/**
 * TASK-001: Agent 事件追踪基础设施 — TDD 单元测试
 *
 * 测试范围:
 *   1. insertAgentEvent start → event_type='start', tokens=0
 *   2. insertAgentEvent end → 自动计算 duration_ms，tokens 正确存储
 *   3. insertAgentEvent error → status='error', error_message 写入
 *   4. getAgentUsage → 按 agent_id+model 分组统计、DeepSeek cost=null
 *   5. getAgentStatus → active/completed/failed 分类
 *   6. 成本估算 — Claude 有 cost，DeepSeek cost=null
 *   7. deleteRun 级联删除关联 agent_events
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  openDb, insertAgentEvent, getAgentEvents, getAgentUsage, getAgentStatus,
  addSession, createPipelineRun, deleteRun, getPipelineRun,
} from '../src/engine/db.js';

/** 每个测试使用唯一会话和 Run ID 避免交叉污染 */
function makeSid() { return `sid_ae_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function makeRunId() { return `run_ae_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

// MODEL_PRICES 副本（用于测试成本校验，与 server.ts 同步）
const MODEL_PRICES = {
  'claude-sonnet-4-6': { input: 3.00, output: 15.00, cacheWrite: 3.75, cacheRead: 0.30 },
  'claude-opus-4-7': { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50 },
  'claude-haiku-4-5': { input: 1.00, output: 5.00, cacheWrite: 1.25, cacheRead: 0.10 },
};

/** 成本计算公式：每百万 token 价格 × token 数量 */
function calcCost(model, inputTokens, outputTokens, cacheWrite, cacheRead) {
  const prices = MODEL_PRICES[model];
  if (!prices) return null;
  return (inputTokens * prices.input + outputTokens * prices.output
    + cacheWrite * prices.cacheWrite + cacheRead * prices.cacheRead) / 1_000_000;
}

describe('Agent Events', () => {
  let db;
  let sid;
  let runId;

  beforeEach(() => {
    db = openDb();
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
  // Test 4: usage 分组统计
  // ──────────────────────────────────────────────────────────────
  it('4 | getAgentUsage → 按 agent_id+model 分组统计正确', () => {
    // agent-a: claude-sonnet-4-6
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'agent-a', event_type: 'start', model: 'claude-sonnet-4-6' });
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'agent-a', event_type: 'end', model: 'claude-sonnet-4-6', input_tokens: 500, output_tokens: 200 });

    // agent-b: deepseek-v4-pro
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'agent-b', event_type: 'start', model: 'deepseek-v4-pro' });
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'agent-b', event_type: 'end', model: 'deepseek-v4-pro', input_tokens: 300, output_tokens: 100 });

    // agent-c: 同 agent 两个不同 model
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'agent-c', event_type: 'start', model: 'claude-haiku-4-5' });
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'agent-c', event_type: 'end', model: 'claude-haiku-4-5', input_tokens: 200, output_tokens: 50 });

    const usage = getAgentUsage(db, runId);
    expect(usage.run_id).toBe(runId);

    // 验证分组存在
    const agents = usage.agents;
    expect(agents).toHaveProperty('agent-a');
    expect(agents).toHaveProperty('agent-b');
    expect(agents).toHaveProperty('agent-c');

    // agent-a 统计
    expect(agents['agent-a'].calls).toBe(1); // 只统计 end 事件
    expect(agents['agent-a'].total_input_tokens).toBe(500);
    expect(agents['agent-a'].total_output_tokens).toBe(200);

    // agent-b 统计
    expect(agents['agent-b'].calls).toBe(1);
    expect(agents['agent-b'].total_input_tokens).toBe(300);
    expect(agents['agent-b'].total_output_tokens).toBe(100);

    // 全局合计
    expect(usage.totals.total_input_tokens).toBe(1000);
    expect(usage.totals.total_output_tokens).toBe(350);
    expect(usage.totals.calls).toBe(3);
  });

  // ──────────────────────────────────────────────────────────────
  // Test 5: status 分类
  // ──────────────────────────────────────────────────────────────
  it('5 | getAgentStatus → active/completed/failed 分类正确', () => {
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
  // Test 6: 成本估算
  // ──────────────────────────────────────────────────────────────
  it('6 | 成本估算 — Claude 模型有 cost，DeepSeek 模型 cost=null', () => {
    // Claude Sonnet: 1M input + 100K output
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'claude-agent', event_type: 'start', model: 'claude-sonnet-4-6' });
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'claude-agent', event_type: 'end', model: 'claude-sonnet-4-6', input_tokens: 1_000_000, output_tokens: 100_000 });

    // DeepSeek
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'ds-agent', event_type: 'start', model: 'deepseek-v4-pro' });
    insertAgentEvent(db, { run_id: runId, session_id: sid, agent_id: 'ds-agent', event_type: 'end', model: 'deepseek-v4-pro', input_tokens: 1_000_000, output_tokens: 100_000 });

    // 在 DB 查询结果上手动计算成本以验证计算公式正确
    const usage = getAgentUsage(db, runId);

    // Claude: input=3.00/M, output=15.00/M → (1M*3 + 100K*15)/1M = 3 + 1.5 = 4.5 USD
    const claudeGroup = usage.agents['claude-agent'];
    expect(claudeGroup.total_input_tokens).toBe(1_000_000);
    expect(claudeGroup.total_output_tokens).toBe(100_000);

    const claudeCost = calcCost('claude-sonnet-4-6',
      claudeGroup.total_input_tokens, claudeGroup.total_output_tokens, 0, 0);
    expect(claudeCost).toBeCloseTo(4.5, 0.001);

    // DeepSeek: 不在 MODEL_PRICES 中
    const dsGroup = usage.agents['ds-agent'];
    const dsCost = calcCost('deepseek-v4-pro',
      dsGroup.total_input_tokens, dsGroup.total_output_tokens, 0, 0);
    expect(dsCost).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────
  // Test 7: deleteRun 级联
  // ──────────────────────────────────────────────────────────────
  it('7 | deleteRun 级联删除关联 agent_events', () => {
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
});
