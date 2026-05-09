import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, getSessions, addSession, touchSession, getSession, removeSession, initPipeline, getPipeline, getCheckpoints, addCheckpoint, setAgentModel, getAgentConfig, createPipelineRun, getPipelineRun, setRunTaskName, updateRunGateEnteredAt, completeRun, abortRun } from '../src/engine/db.js';

describe('Sessions CRUD', () => {
  let db;
  const testSid = 'test_session_' + Date.now();

  beforeEach(() => {
    db = openDb();
  });

  it('addSession 创建会话', () => {
    addSession(db, testSid, 'claude', 'member');
    const s = getSession(db, testSid);
    expect(s).toBeTruthy();
    expect(s.platform).toBe('claude');
    expect(s.status).toBe('active');
  });

  it('getSessions 返回所有会话', () => {
    const sessions = getSessions(db);
    expect(sessions.length).toBeGreaterThanOrEqual(1);
    const found = sessions.find(s => s.id === testSid);
    expect(found).toBeTruthy();
  });

  it('touchSession 更新活动时间', () => {
    const before = getSession(db, testSid).last_heartbeat;
    touchSession(db, testSid);
    const after = getSession(db, testSid).last_heartbeat;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('removeSession 删除会话', () => {
    removeSession(db, testSid);
    expect(getSession(db, testSid)).toBeUndefined();
  });
});

describe('Pipeline CRUD', () => {
  let db;
  const testSid = 'test_pipeline_' + Date.now();

  beforeEach(() => {
    db = openDb();
    addSession(db, testSid, 'claude', 'member');
  });

  it('initPipeline 创建流水线', () => {
    initPipeline(db, testSid, 'test-project', 'full');
    const p = getPipeline(db, testSid);
    expect(p).toBeTruthy();
    expect(p.project).toBe('test-project');
    expect(p.current_gate).toBe('Gate A');
  });

  it('无 sessionId 时 getPipeline 返回 null', () => {
    expect(getPipeline(db, null)).toBeNull();
    expect(getPipeline(db, '')).toBeNull();
  });
});

describe('Checkpoints', () => {
  let db;
  const testSid = 'test_cp_' + Date.now();

  beforeEach(() => {
    db = openDb();
    addSession(db, testSid, 'claude', 'member');
  });

  it('addCheckpoint + getCheckpoints', () => {
    addCheckpoint(db, 'Gate A', 'Gate B', testSid);
    const cps = getCheckpoints(db, 'Gate A', testSid);
    expect(cps).toHaveLength(1);
    expect(cps[0].advance_to).toBe('Gate B');
  });

  it('无 sessionId 返回空数组', () => {
    expect(getCheckpoints(db, 'Gate A', null)).toEqual([]);
  });
});

describe('Agent Config', () => {
  let db;

  beforeEach(() => {
    db = openDb();
  });

  it('setAgentModel + getAgentConfig', () => {
    setAgentModel(db, 'test-agent', 'claude-sonnet-4-6', 'high');
    const cfg = getAgentConfig(db);
    expect(cfg['test-agent']).toBeTruthy();
    expect(cfg['test-agent'].model).toBe('claude-sonnet-4-6');
    expect(cfg['test-agent'].effort).toBe('high');
  });
});

describe('Pipeline Run Task Name', () => {
  let db;
  const testSid = 'test_taskname_' + Date.now();

  beforeEach(() => {
    db = openDb();
    addSession(db, testSid, 'claude', 'member');
  });

  it('设置有效任务名返回 ok: true', () => {
    const runId = createPipelineRun(db, testSid, 'test-project');
    const result = setRunTaskName(db, runId, '给web增加归档功能');
    expect(result.ok).toBe(true);
    expect(result.task_name).toBe('给web增加归档功能');
    expect(result.error).toBeUndefined();

    // 验证数据库持久化
    const run = getPipelineRun(db, runId);
    expect(run.task_name).toBe('给web增加归档功能');
  });

  it('空字符串清除任务名为 null', () => {
    const runId = createPipelineRun(db, testSid, 'test-project');
    setRunTaskName(db, runId, '初始任务名');
    const result = setRunTaskName(db, runId, '');
    expect(result.ok).toBe(true);
    expect(result.task_name).toBeNull();

    const run = getPipelineRun(db, runId);
    expect(run.task_name).toBeNull();
  });

  it('纯空白字符串视为清除', () => {
    const runId = createPipelineRun(db, testSid, 'test-project');
    setRunTaskName(db, runId, '任务X');
    const result = setRunTaskName(db, runId, '   ');
    expect(result.ok).toBe(true);
    expect(result.task_name).toBeNull();
  });

  it('不存在的 runId 返回错误', () => {
    const result = setRunTaskName(db, 'run_nonexistent', 'test');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not found');
    expect(result.task_name).toBeNull();
  });

  it('空 runId 返回错误', () => {
    const result = setRunTaskName(db, '', 'test');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('runId required');
    expect(result.task_name).toBeNull();
  });

  it('更新已有任务名覆盖旧值', () => {
    const runId = createPipelineRun(db, testSid, 'test-project');
    setRunTaskName(db, runId, '旧任务名');
    const result = setRunTaskName(db, runId, '新任务名');
    expect(result.ok).toBe(true);
    expect(result.task_name).toBe('新任务名');

    const run = getPipelineRun(db, runId);
    expect(run.task_name).toBe('新任务名');
  });
});

// ================================================================
// TASK-001: Gate 进入时间记录与耗时计算
// ================================================================
describe('TASK-001 Gate Duration Stats', () => {
  let db;
  const testSid = 'test_duration_' + Date.now();

  beforeEach(() => {
    db = openDb();
    addSession(db, testSid, 'claude', 'member');
  });

  /** 辅助: 查询表的列信息 */
  function tableColumns(tableName) {
    return db.prepare(`PRAGMA table_info('${tableName}')`).all();
  }

  // AC1: pipeline_runs 表存在 gate_entered_at 列，默认 NULL
  it('pipeline_runs 表存在 gate_entered_at 列', () => {
    const cols = tableColumns('pipeline_runs');
    const col = cols.find(c => c.name === 'gate_entered_at');
    expect(col).toBeTruthy();
    // ALTER TABLE ADD COLUMN 默认 nullable，dflt_value 为 null
  });

  // AC2: checkpoints 表存在 duration_seconds 列，默认 NULL
  it('checkpoints 表存在 duration_seconds 列', () => {
    const cols = tableColumns('checkpoints');
    const col = cols.find(c => c.name === 'duration_seconds');
    expect(col).toBeTruthy();
  });

  // AC3: 迁移脚本重复执行不报错（try/catch 包裹）
  it('迁移脚本重复执行不报错', () => {
    // 再次 openDb 会触发 initSchema → 再次尝试 ALTER TABLE
    const db2 = openDb();
    const cols = tableColumns.call({ db: db2 }, 'pipeline_runs');
    expect(cols.find(c => c.name === 'gate_entered_at')).toBeTruthy();
  });

  // AC4: 迁移脚本为已有 checkpoints 回填 duration_seconds
  it('迁移脚本回填已有 checkpoints 的 duration_seconds', () => {
    // 手动插入两条 checkpoint 模拟既有数据（不含 duration_seconds）
    const now = new Date();
    const past = new Date(now.getTime() - 120_000); // 2分钟前
    const older = new Date(now.getTime() - 300_000); // 5分钟前

    db.prepare(`INSERT INTO checkpoints (session_id, gate, passed_at, advance_to)
      VALUES (?, 'Gate A', ?, 'Gate B')`).run(testSid, older.toISOString());
    db.prepare(`INSERT INTO checkpoints (session_id, gate, passed_at, advance_to)
      VALUES (?, 'Gate B', ?, 'Gate C')`).run(testSid, past.toISOString());

    // 重新 openDb 触发迁移回填
    const db2 = openDb();
    const cps = db2.prepare(
      'SELECT * FROM checkpoints WHERE session_id=? ORDER BY passed_at'
    ).all(testSid);

    expect(cps).toHaveLength(2);
    // 第一条 checkpoint（Gate A）：无上一个 checkpoint，duration 应为 NULL
    expect(cps[0].duration_seconds).toBeNull();
    // 第二条 checkpoint（Gate B）：duration = 300 - 120 = 180 秒
    expect(cps[1].duration_seconds).toBe(180);
  });

  // AC5: createPipelineRun 创建时 gate_entered_at = started_at
  it('createPipelineRun 创建时写入 gate_entered_at', () => {
    const runId = createPipelineRun(db, testSid, 'test-project');
    const run = getPipelineRun(db, runId);
    expect(run.gate_entered_at).toBeTruthy();
    expect(run.gate_entered_at).toBe(run.started_at);
  });

  // AC6 前半: addCheckpoint 传入 durationSeconds 时写入
  it('addCheckpoint 传入 durationSeconds 时写入 duration_seconds', () => {
    addCheckpoint(db, 'Gate A', 'Gate B', testSid, 120);
    const cps = getCheckpoints(db, 'Gate A', testSid);
    expect(cps).toHaveLength(1);
    expect(cps[0].duration_seconds).toBe(120);
  });

  // 向后兼容: addCheckpoint 不传 durationSeconds 时 duration_seconds 为 NULL
  it('addCheckpoint 不传 durationSeconds 时 duration_seconds 为 NULL', () => {
    addCheckpoint(db, 'Gate A', 'Gate B', testSid);
    const cps = getCheckpoints(db, 'Gate A', testSid);
    expect(cps).toHaveLength(1);
    expect(cps[0].duration_seconds).toBeNull();
  });

  // updateRunGateEnteredAt: 更新 run 的 gate_entered_at
  it('updateRunGateEnteredAt 更新 Gate 进入时间', () => {
    const runId = createPipelineRun(db, testSid, 'test-project');
    const before = getPipelineRun(db, runId).gate_entered_at;
    expect(before).toBeTruthy();

    // 等待一小段时间确保时间戳不同
    const newTime = new Date(Date.now() + 5000).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    updateRunGateEnteredAt(db, runId, newTime);
    const after = getPipelineRun(db, runId).gate_entered_at;
    expect(after).toBe(newTime);
  });
});

// ================================================================
// TASK-002: 任务总耗时计算
// ================================================================
describe('TASK-002 Total Duration Calculation', () => {
  let db;
  const testSid = 'test_total_duration_' + Date.now();

  beforeEach(() => {
    db = openDb();
    addSession(db, testSid, 'claude', 'member');
  });

  /** 辅助: 查询表的列信息 */
  function tableColumns(tableName) {
    return db.prepare(`PRAGMA table_info('${tableName}')`).all();
  }

  // AC1: pipeline_runs 表存在 total_duration_seconds 列，默认 NULL
  it('pipeline_runs 表存在 total_duration_seconds 列', () => {
    const cols = tableColumns('pipeline_runs');
    const col = cols.find(c => c.name === 'total_duration_seconds');
    expect(col).toBeTruthy();
  });

  // AC2: 迁移脚本重复执行不报错（try/catch 包裹）
  it('迁移脚本重复执行不报错', () => {
    const db2 = openDb();
    const cols = tableColumns.call({ db: db2 }, 'pipeline_runs');
    expect(cols.find(c => c.name === 'total_duration_seconds')).toBeTruthy();
  });

  // AC3: 迁移脚本回填已完成 run 的 total_duration_seconds
  it('迁移脚本回填已完成 run 的 total_duration_seconds', () => {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 600_000);
    const bid = 'run_backfill_completed_' + testSid;

    // 直接插入一个已完成但无 total_duration_seconds 的 run
    db.prepare(`INSERT INTO pipeline_runs (id, session_id, project, pipeline_type, current_gate, status, started_at, completed_at)
      VALUES (?, ?, 'test', 'full', 'Gate A', 'completed', ?, ?)`).run(
      bid, testSid, tenMinutesAgo.toISOString(), now.toISOString()
    );

    // 重新 openDb 触发迁移回填
    const db2 = openDb();
    const run = db2.prepare('SELECT * FROM pipeline_runs WHERE id=?').get(bid);
    if (!run) throw new Error('Expected backfill run not found');
    // julianday 存在毫秒级精度差异，使用容差范围
    expect(run.total_duration_seconds).toBeGreaterThanOrEqual(599);
    expect(run.total_duration_seconds).toBeLessThanOrEqual(600);
  });

  // AC3 补充: 回填已中止 run
  it('迁移脚本回填已中止 run 的 total_duration_seconds', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 300_000);
    const bid = 'run_backfill_aborted_' + testSid;

    db.prepare(`INSERT INTO pipeline_runs (id, session_id, project, pipeline_type, current_gate, status, started_at, completed_at)
      VALUES (?, ?, 'test', 'full', 'Gate A', 'aborted', ?, ?)`).run(
      bid, testSid, fiveMinutesAgo.toISOString(), now.toISOString()
    );

    const db2 = openDb();
    const run = db2.prepare('SELECT * FROM pipeline_runs WHERE id=?').get(bid);
    if (!run) throw new Error('Expected backfill run not found');
    // julianday 存在毫秒级精度差异，使用容差范围
    expect(run.total_duration_seconds).toBeGreaterThanOrEqual(299);
    expect(run.total_duration_seconds).toBeLessThanOrEqual(300);
  });

  // AC4: completeRun 执行后 total_duration_seconds > 0
  it('completeRun 执行后 total_duration_seconds > 0', () => {
    const runId = createPipelineRun(db, testSid, 'test-project');
    // 将 started_at 设为 2 秒前，确保 julianday 差值经 CAST 后 > 0
    db.prepare("UPDATE pipeline_runs SET started_at=datetime('now', '-2 seconds') WHERE id=?").run(runId);
    completeRun(db, runId);
    const run = getPipelineRun(db, runId);
    expect(run.status).toBe('completed');
    expect(run.completed_at).toBeTruthy();
    expect(run.total_duration_seconds).toBeGreaterThanOrEqual(1);
  });

  // AC5: abortRun 执行后 total_duration_seconds > 0
  it('abortRun 执行后 total_duration_seconds > 0', () => {
    const runId = createPipelineRun(db, testSid, 'test-project');
    // 将 started_at 设为 2 秒前，确保 julianday 差值经 CAST 后 > 0
    db.prepare("UPDATE pipeline_runs SET started_at=datetime('now', '-2 seconds') WHERE id=?").run(runId);
    abortRun(db, runId);
    const run = getPipelineRun(db, runId);
    expect(run.status).toBe('aborted');
    expect(run.completed_at).toBeTruthy();
    expect(run.total_duration_seconds).toBeGreaterThanOrEqual(1);
  });

  // AC6: completed_at 为 NULL 时 total_duration_seconds 保持 NULL（不报错）
  it('active run 的 completed_at 为 NULL 时 total_duration_seconds 保持 NULL', () => {
    const runId = createPipelineRun(db, testSid, 'test-project');
    const run = getPipelineRun(db, runId);
    expect(run.completed_at).toBeNull();
    // 未完成时不应计算 total_duration_seconds
    expect(run.total_duration_seconds).toBeNull();
  });

  // AC7: TASK-001 的 10 个验收标准全部保持通过
  // （TASK-001 测试位于上方 describe block，运行全量测试即验证）
});
