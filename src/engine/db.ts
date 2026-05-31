import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';

/** 数据库连接类型，等价于 node:sqlite 的 DatabaseSync */
type DbConn = DatabaseSync;

// ── 数据库记录类型（从 initSchema 的 CREATE TABLE 语句推导） ──────────────

interface PipelineRecord {
  session_id: string;
  project: string;
  current_gate: string;
  pipeline_type: string;
  started_at: string;
  updated_at: string;
}

interface CheckpointRecord {
  id: number;
  session_id: string;
  gate: string;
  passed_at: string;
  advance_to: string | null;
  duration_seconds?: number | null;
  violations?: string | null;
  quality_profile_source?: string | null;
}

interface SessionRecord {
  id: string;
  platform: string;
  role: string;
  status: string;
  created_at: number;
  last_heartbeat: number;
  metadata?: string | null;
  /** 由 getSessions 查询动态添加，非物理列 */
  latest_run_started_at?: string | null;
}

interface AgentModelRecord {
  agent_id: string;
  model: string;
  effort: string;
  updated_at: string;
}

interface PipelineRunRecord {
  id: string;
  session_id: string;
  project: string;
  pipeline_type: string;
  current_gate: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  task_name?: string | null;
  archived?: number;
  pinned?: number;
  gate_entered_at?: string | null;
  total_duration_seconds?: number | null;
  resume_data?: string | null;
}

interface ArtifactRecord {
  id: number;
  run_id: string;
  gate: string;
  filepath: string;
  created_at: string;
}

interface SessionEventRecord {
  id: number;
  session_id: string;
  run_id: string | null;
  event_type: string;
  gate: string | null;
  detail: string | null;
  created_at: string;
}

interface FlowSkillRecord {
  id: string;
  name: string;
  description: string;
  pipeline_type: string;
  gate_sequence: string;
  agent_spawns: string;
  skill_loads: string;
  source_session_id: string;
  created_at: string;
}

interface WorkingMemoryRecord {
  id: number;
  session_id: string;
  run_id: string | null;
  category: string;
  content: string;
  created_at: string;
  expires_at: string | null;
}

interface SessionContextRecord {
  id: number;
  session_id: string;
  run_id: string | null;
  summary: string;
  key_decisions: string | null;
  pending_items: string | null;
  created_at: string;
}

// ── 数据库迁移版本追踪 ─────────────────────────────────────────────

/** 迁移列表：按版本号升序排列，只执行 version > currentVersion 的迁移 */
const MIGRATIONS: Array<{version: number; sql: string}> = [
  { version: 1,  sql: "ALTER TABLE agent_models ADD COLUMN effort TEXT NOT NULL DEFAULT 'high'" },
  { version: 2,  sql: "ALTER TABLE sessions ADD COLUMN status TEXT DEFAULT 'active'" },
  { version: 3,  sql: 'ALTER TABLE pipeline_runs ADD COLUMN task_name TEXT' },
  { version: 4,  sql: 'ALTER TABLE pipeline_runs ADD COLUMN archived INTEGER DEFAULT 0' },
  { version: 5,  sql: 'ALTER TABLE pipeline_runs ADD COLUMN pinned INTEGER DEFAULT 0' },
  { version: 6,  sql: 'ALTER TABLE pipeline_runs ADD COLUMN gate_entered_at TEXT' },
  { version: 7,  sql: 'ALTER TABLE checkpoints ADD COLUMN duration_seconds INTEGER' },
  { version: 8,  sql: 'ALTER TABLE checkpoints ADD COLUMN violations TEXT' },
  { version: 9,  sql: 'ALTER TABLE checkpoints ADD COLUMN quality_profile_source TEXT' },
  { version: 10, sql: 'ALTER TABLE pipeline_runs ADD COLUMN resume_data TEXT' },
  { version: 11, sql: 'ALTER TABLE sessions ADD COLUMN metadata TEXT' },
  { version: 12, sql: 'ALTER TABLE pipeline_runs ADD COLUMN total_duration_seconds INTEGER' },
];

/**
 * 执行数据库迁移：只执行版本号高于当前版本的迁移。
 * 保留 try-catch 作为兼容回退——对"列已存在但版本号未记录"的旧数据库友好。
 */
function runMigrations(db: DbConn): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER)');
  const row = db.prepare('SELECT COALESCE(MAX(version), 0) as v FROM schema_version').get() as { v: number };
  const currentVersion = row.v;

  for (const m of MIGRATIONS) {
    if (m.version > currentVersion) {
      try {
        db.exec(m.sql);
        db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(m.version);
      } catch (e: unknown) {
        // 列已存在时不阻止启动，记录版本号后继续
        const msg = String(e);
        if (msg.includes('already exists') || msg.includes('duplicate column')) {
          db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(m.version);
        } else {
          console.error(`  ✗  迁移 v${m.version} 失败:`, msg);
          throw e;
        }
      }
    }
  }
}

/**
 * 打开引擎数据库，存储在项目级 <projectRoot>/.jarvis/engine.db
 * 每个项目拥有独立数据库，实现项目级数据隔离。
 * @param {string} [projectRoot] 项目根目录；若以 .db 结尾则视为显式数据库路径（测试用）
 * @param {string} [dbPath] 可选自定义路径（测试用，优先级最高）
 * @returns {DatabaseSync}
 */
export function openDb(projectRoot?: string,  dbPath?: string) {
  // 单参数且以 .db 结尾 → 视为显式数据库路径（测试兼容）
  // 项目目录名不会以 .db 结尾，此启发式仅用于区分测试调用 openDb('/tmp/test.db')
  const effectiveDbPath = dbPath || (projectRoot && projectRoot.endsWith('.db') ? projectRoot : undefined);
  const effectiveRoot = (effectiveDbPath === projectRoot) ? undefined : projectRoot;
  const targetPath = effectiveDbPath || resolve(effectiveRoot || homedir(), '.jarvis', 'engine.db');
  const dir = resolve(targetPath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA journal_mode=WAL');
  db.exec('PRAGMA busy_timeout=5000');
  initSchema(db);
  return db;
}

function initSchema(db: DbConn) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline (
      session_id TEXT PRIMARY KEY,
      project TEXT NOT NULL,
      current_gate TEXT NOT NULL DEFAULT 'Gate A',
      pipeline_type TEXT NOT NULL DEFAULT 'full',
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS checkpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      gate TEXT NOT NULL,
      passed_at TEXT NOT NULL,
      advance_to TEXT,
      UNIQUE(session_id, gate)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      platform TEXT DEFAULT 'unknown',
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT DEFAULT 'active',
      created_at INTEGER NOT NULL,
      last_heartbeat INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_models (
      agent_id TEXT PRIMARY KEY,
      model TEXT NOT NULL,
      effort TEXT NOT NULL DEFAULT 'high',
      updated_at TEXT NOT NULL
    );
  `);
  // pipeline_runs: 每次 /jarvis 调用产生独立运行记录（Session Model B）
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      project TEXT NOT NULL,
      pipeline_type TEXT NOT NULL DEFAULT 'full',
      current_gate TEXT NOT NULL DEFAULT 'Gate A',
      status TEXT NOT NULL DEFAULT 'active',
      started_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pipeline_runs_session ON pipeline_runs(session_id, started_at DESC);
  `);

  // flow_skills: 会话流程导出为可复用 Skill 模板
  db.exec(`
    CREATE TABLE IF NOT EXISTS flow_skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      pipeline_type TEXT NOT NULL DEFAULT 'full',
      gate_sequence TEXT NOT NULL,
      agent_spawns TEXT NOT NULL DEFAULT '[]',
      skill_loads TEXT NOT NULL DEFAULT '[]',
      source_session_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // artifacts: pipeline run 产物记录
  db.exec(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      gate TEXT NOT NULL,
      filepath TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(run_id, gate, filepath)
    );
  `);

  // ---- 执行增量迁移（只在版本号不匹配时运行） ----
  runMigrations(db);

  // ---- 迁移：修复旧 pipeline 表 CHECK(id=1) 约束 ----
  const pipeSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='pipeline'").get() as { sql: string } | undefined;
  if (pipeSchema && /CHECK\s*\(\s*id\s*=\s*1\s*\)/i.test(pipeSchema.sql)) {
    // 旧单行表有 CHECK(id=1) 约束，需重建
    db.exec('BEGIN');
    try {
      // 备份旧数据（旧表可能有 id, project, current_gate, mode, started_at, updated_at, session_id, pipeline_type）
      const oldRows = db.prepare('SELECT * FROM pipeline').all() as unknown as PipelineRecord[];
      db.exec('DROP TABLE IF EXISTS pipeline');
      db.exec(`
        CREATE TABLE pipeline (
          session_id TEXT PRIMARY KEY,
          project TEXT NOT NULL,
          current_gate TEXT NOT NULL DEFAULT 'Gate A',
          pipeline_type TEXT NOT NULL DEFAULT 'full',
          started_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      for (const r of oldRows) {
        const sid = r.session_id || 'legacy';
        const pt = r.pipeline_type || 'full';
        db.prepare(`INSERT OR REPLACE INTO pipeline (session_id, project, current_gate, pipeline_type, started_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)`).run(sid, r.project || 'jarvis', r.current_gate || 'Gate A', pt, r.started_at || new Date().toISOString(), r.updated_at || new Date().toISOString());
      }
      db.exec('COMMIT');
      console.log('  ✓  pipeline 表已从旧 CHECK(id=1) 模式迁移为多会话模式');
    } catch (e) {
      db.exec('ROLLBACK');
      console.error('  ✗  pipeline 迁移失败:', String(e));
    }
  }

  // ---- 迁移：修复旧 checkpoints 表 UNIQUE(gate) → UNIQUE(session_id, gate) ----
  const cpSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='checkpoints'").get() as { sql: string } | undefined;
  if (cpSchema && !/session_id.*gate/i.test(cpSchema.sql)) {
    // 旧表只有 UNIQUE(gate)，缺少 session_id 列或多列唯一约束
    db.exec('BEGIN');
    try {
      const oldRows = db.prepare('SELECT * FROM checkpoints').all() as unknown as CheckpointRecord[];
      db.exec('DROP TABLE IF EXISTS checkpoints');
      db.exec(`
        CREATE TABLE checkpoints (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          gate TEXT NOT NULL,
          passed_at TEXT NOT NULL,
          advance_to TEXT,
          UNIQUE(session_id, gate)
        )
      `);
      for (const r of oldRows) {
        const sid = r.session_id || 'legacy';
        db.prepare('INSERT OR REPLACE INTO checkpoints (session_id, gate, passed_at, advance_to) VALUES (?, ?, ?, ?)')
          .run(sid, r.gate, r.passed_at || new Date().toISOString(), r.advance_to || null);
      }
      db.exec('COMMIT');
      console.log('  ✓  checkpoints 表已迁移为 session_id+gate 联合唯一约束');
    } catch (e) {
      db.exec('ROLLBACK');
      console.error('  ✗  checkpoints 迁移失败:', String(e));
    }
  }

  // ---- 清除遗留的 agent_events 表（v3.47.6+ 已废弃） ----
  db.exec('DROP TABLE IF EXISTS agent_events');

  // ----  OMC-inspired: 会话事件日志表（跨会话可观测性） ----
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      run_id TEXT,
      event_type TEXT NOT NULL,
      gate TEXT,
      detail TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_session_events_session ON session_events(session_id, created_at DESC);
  `);

  // ----  OMC-inspired: working_memory 短期记忆表（7天 TTL） ----
  db.exec(`
    CREATE TABLE IF NOT EXISTS working_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      run_id TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_working_memory_session ON working_memory(session_id, created_at DESC);
  `);

  // ----  OMC-inspired: session_context 会话归档摘要表 ----
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_context (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      run_id TEXT,
      summary TEXT NOT NULL,
      key_decisions TEXT,
      pending_items TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_session_context_session ON session_context(session_id, created_at DESC);
  `);

  // ----  TASK-001: 回填已有 checkpoints 的 duration_seconds ----
  // 使用窗口函数 LAG 取同一 session 内上一条 checkpoint 的 passed_at 作为近似进入时间
  const backfillResult = db.prepare(`
    WITH ordered AS (
      SELECT id, session_id, passed_at,
        LAG(passed_at) OVER (PARTITION BY session_id ORDER BY passed_at) AS prev_passed_at
      FROM checkpoints
      WHERE duration_seconds IS NULL
    )
    UPDATE checkpoints SET duration_seconds = (
      strftime('%s', ordered.passed_at) - strftime('%s', ordered.prev_passed_at)
    )
    FROM ordered
    WHERE checkpoints.id = ordered.id AND ordered.prev_passed_at IS NOT NULL
  `).run();
  if (backfillResult.changes > 0) {
    console.log(`  ✓  已回填 ${backfillResult.changes} 条 checkpoint 的 Gate 耗时`);
  }

  // ----  TASK-002: 回填已完成/已中止 run 的 total_duration_seconds ----
  const backfillDurationResult = db.prepare(`
    UPDATE pipeline_runs SET total_duration_seconds = CAST(
      (julianday(completed_at) - julianday(started_at)) * 86400 AS INTEGER
    )
    WHERE status IN ('completed', 'aborted')
      AND completed_at IS NOT NULL
      AND started_at IS NOT NULL
      AND total_duration_seconds IS NULL
  `).run();
  if (backfillDurationResult.changes > 0) {
    console.log(`  ✓  已回填 ${backfillDurationResult.changes} 条 run 的总耗时`);
  }

  // ---- 迁移旧 pipeline 数据为首条 pipeline_run ----
  const existingRuns = db.prepare('SELECT COUNT(*) as cnt FROM pipeline_runs').get() as { cnt: number };
  if (existingRuns.cnt === 0) {
    const oldPipelines = db.prepare('SELECT * FROM pipeline').all() as unknown as PipelineRecord[];
    for (const p of oldPipelines) {
      if (!p.session_id) continue;
      const runId = 'run_' + Date.now() + '_' + p.session_id.slice(-6);
      db.prepare(`INSERT OR IGNORE INTO pipeline_runs (id, session_id, project, pipeline_type, current_gate, status, started_at)
        VALUES (?, ?, ?, ?, ?, 'active', ?)`).run(
        runId, p.session_id, p.project || 'jarvis', p.pipeline_type || 'full', p.current_gate || 'Gate A', p.started_at || new Date().toISOString()
      );
    }
  }
}

// ---- Pipeline (per-session) ----
export function getPipeline(db: DbConn, sessionId: string): any {
  if (!sessionId) return null;
  return db.prepare('SELECT * FROM pipeline WHERE session_id=?').get(sessionId);
}
export function updatePipelineGate(db: DbConn, sessionId: string, gate: string): void {
  if (!sessionId) throw new Error('session_id required');
  db.prepare(`UPDATE pipeline SET current_gate=?, updated_at=datetime('now') WHERE session_id=?`).run(gate, sessionId);
}
export function initPipeline(db: DbConn, sessionId: string, project: string, pipelineType: string = 'full'): void {
  db.prepare(`INSERT OR REPLACE INTO pipeline (session_id, project, current_gate, pipeline_type, started_at, updated_at) VALUES (?, ?, 'Gate A', ?, datetime('now'), datetime('now'))`).run(sessionId, project, pipelineType);
}
export function getAllPipelines(db: DbConn): any[] {
  return db.prepare('SELECT * FROM pipeline ORDER BY updated_at DESC').all();
}

// ---- Checkpoints (per-session) ----
export function getCheckpoints(db: DbConn, gate: string, sessionId: string): any[] {
  if (!sessionId) return [];
  if (gate) return db.prepare('SELECT * FROM checkpoints WHERE gate=? AND session_id=?').all(gate, sessionId);
  return db.prepare('SELECT * FROM checkpoints WHERE session_id=? ORDER BY passed_at').all(sessionId);
}
/**
 * 记录 checkpoint，可选传入 Gate 耗时、质量门禁违反记录和配置档案来源。
 * @param {DatabaseSync} db
 * @param {string} gate
 * @param {string} advanceTo
 * @param {string} sessionId
 * @param {number} [durationSeconds] Gate 耗时（秒），不传则为 NULL
 * @param {string} [violations] 质量门禁违反记录 JSON 字符串（TASK-002）
 * @param {string} [qualityProfileSource] 质量门禁配置来源（TASK-002）
 */
export function addCheckpoint(db: DbConn, gate: string, advanceTo: string, sessionId: string, durationSeconds: number | undefined = undefined, violations: string | undefined = undefined, qualityProfileSource: string | undefined = undefined): void {
  if (violations !== undefined || qualityProfileSource !== undefined) {
    db.prepare(`INSERT OR REPLACE INTO checkpoints (session_id, gate, passed_at, advance_to, duration_seconds, violations, quality_profile_source) VALUES (?, ?, datetime('now'), ?, ?, ?, ?)`).run(sessionId, gate, advanceTo, durationSeconds ?? null, violations ?? null, qualityProfileSource ?? null);
  } else if (durationSeconds !== undefined) {
    db.prepare(`INSERT OR REPLACE INTO checkpoints (session_id, gate, passed_at, advance_to, duration_seconds) VALUES (?, ?, datetime('now'), ?, ?)`).run(sessionId, gate, advanceTo, durationSeconds);
  } else {
    db.prepare(`INSERT OR REPLACE INTO checkpoints (session_id, gate, passed_at, advance_to) VALUES (?, ?, datetime('now'), ?)`).run(sessionId, gate, advanceTo);
  }
}

// ---- Sessions ----
/**
 * 获取所有会话，按最近 run 创建时间倒序排列
 * - 有 run 的会话按 latest_run_started_at DESC
 * - 无 run 的会话排在末尾
 * @param {'active'|'inactive'|undefined} statusFilter
 * @returns {Array<{id: string; platform: string; role: string; status: string; created_at: number; last_heartbeat: number; latest_run_started_at: string|null}>}
 */
export function getSessions(db: DbConn, statusFilter?: string): any[] {
  const orderClause = `
    ORDER BY
      CASE WHEN latest_run_started_at IS NULL THEN 1 ELSE 0 END,
      latest_run_started_at DESC,
      s.created_at DESC
  `;
  if (statusFilter) {
    return db.prepare(`
      SELECT s.*,
        (SELECT MAX(pr.started_at) FROM pipeline_runs pr WHERE pr.session_id = s.id) AS latest_run_started_at
      FROM sessions s
      WHERE status=?
      ${orderClause}
    `).all(statusFilter);
  }
  return db.prepare(`
    SELECT s.*,
      (SELECT MAX(pr.started_at) FROM pipeline_runs pr WHERE pr.session_id = s.id) AS latest_run_started_at
    FROM sessions s
    ${orderClause}
  `).all();
}
export function getSession(db: DbConn, sid: string): any {
  return db.prepare('SELECT * FROM sessions WHERE id=?').get(sid);
}
export function addSession(db: DbConn, sid: string, platform: string, role: string): void {
  db.prepare('INSERT OR REPLACE INTO sessions (id, platform, role, status, created_at, last_heartbeat) VALUES (?, ?, ?, ?, ?, ?)').run(sid, platform, role || 'member', 'active', Date.now(), Date.now());
}
/** 更新会话活动时间——每次 MCP 工具调用即视为心跳 */
export function touchSession(db: DbConn, sid: string): void {
  db.prepare("UPDATE sessions SET last_heartbeat=?, status='active' WHERE id=?").run(Date.now(), sid);
}
export function removeSession(db: DbConn, sid: string): void {
  db.prepare('DELETE FROM sessions WHERE id=?').run(sid);
}
export function updateSessionRole(db: DbConn, sid: string, role: string): void {
  db.prepare('UPDATE sessions SET role=? WHERE id=?').run(role, sid);
}
/** 将会话标记为 inactive 而非删除，保留 pipeline 数据供恢复 */
export function markStaleSessions(db: DbConn, timeoutMs: number): string[] {
  const cutoff = Date.now() - timeoutMs;
  const stale = db.prepare("SELECT id FROM sessions WHERE last_heartbeat < ? AND status='active'").all(cutoff) as Array<{ id: string }>;
  for (const s of stale) db.prepare("UPDATE sessions SET status='inactive' WHERE id=?").run(s.id);
  return stale.map(s => s.id);
}
/** 恢复 inactive 会话为 active */
export function resumeSession(db: DbConn, sid: string): void {
  db.prepare("UPDATE sessions SET status='active', last_heartbeat=? WHERE id=?").run(Date.now(), sid);
}
/** 迁移旧会话的所有数据到新 sessionId（用于 MCP 重连恢复） */
export function migrateSession(db: DbConn, oldSid: string, newSid: string): void {
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE pipeline SET session_id=? WHERE session_id=?').run(newSid, oldSid);
    db.prepare('UPDATE checkpoints SET session_id=? WHERE session_id=?').run(newSid, oldSid);
    db.prepare('UPDATE pipeline_runs SET session_id=? WHERE session_id=?').run(newSid, oldSid);
    db.prepare('UPDATE working_memory SET session_id=? WHERE session_id=?').run(newSid, oldSid);
    db.prepare('UPDATE session_events SET session_id=? WHERE session_id=?').run(newSid, oldSid);
    db.prepare('UPDATE session_context SET session_id=? WHERE session_id=?').run(newSid, oldSid);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
export function getOldestSession(db: DbConn): any {
  return db.prepare('SELECT * FROM sessions ORDER BY created_at ASC LIMIT 1').get();
}

// ---- Agent Models ----
export function getAgentConfig(db: DbConn): Record<string, { model: string; effort: string }> {
  const rows = db.prepare('SELECT agent_id, model, effort FROM agent_models').all() as unknown as AgentModelRecord[];
  const cfg: Record<string, { model: string; effort: string }> = {};
  for (const r of rows) cfg[r.agent_id] = { model: r.model, effort: r.effort };
  return cfg;
}
export function setAgentModel(db: DbConn, agentId: string, model: string, effort: string): void {
  db.prepare(`INSERT OR REPLACE INTO agent_models (agent_id, model, effort, updated_at) VALUES (?, ?, ?, datetime('now'))`).run(agentId, model, effort);
}

// ---- Pipeline Runs（Session Model B）----

/**
 * 创建新的 pipeline run
 * @param {DatabaseSync} db
 * @param {string} sessionId
 * @param {string} project
 * @param {string} [pipelineType='full']
 * @returns {string} runId
 */
export function createPipelineRun(db: DbConn, sessionId: string, project: string, pipelineType: string = 'full'): string {
  const id = 'run_' + Date.now() + '_' + randomBytes(3).toString('base64url');
  db.prepare(`INSERT INTO pipeline_runs (id, session_id, project, pipeline_type, current_gate, status, started_at, gate_entered_at)
    VALUES (?, ?, ?, ?, 'Gate A', 'active', datetime('now'), datetime('now'))`).run(id, sessionId, project, pipelineType);
  return id;
}

/** 获取指定 run */
export function getPipelineRun(db: DbConn, runId: string): any {
  return db.prepare('SELECT * FROM pipeline_runs WHERE id=?').get(runId);
}

/**
 * 获取 session 的当前活跃 run（最新一条 status=active）
 * @returns {object|undefined}
 */
export function getActiveRun(db: DbConn, sessionId: string): any {
  return db.prepare("SELECT * FROM pipeline_runs WHERE session_id=? AND status='active' AND archived=0 ORDER BY started_at DESC LIMIT 1").get(sessionId);
}

/**
 * 获取 session 的所有 runs（按时间倒序）
 * @returns {object[]}
 */
export function getSessionRuns(db: DbConn, sessionId: string): any[] {
  return db.prepare('SELECT * FROM pipeline_runs WHERE session_id=? ORDER BY started_at DESC').all(sessionId);
}

/** 更新 run 的当前 Gate */
export function updateRunGate(db: DbConn, runId: string, gate: string): void {
  db.prepare("UPDATE pipeline_runs SET current_gate=? WHERE id=?").run(gate, runId);
}

/**
 * 更新 run 的 Gate 进入时间
 * @param {DatabaseSync} db
 * @param {string} runId
 * @param {string} isoTime 进入时间的 ISO 字符串
 */
export function updateRunGateEnteredAt(db: DbConn, runId: string, isoTime: string): void {
  db.prepare('UPDATE pipeline_runs SET gate_entered_at=? WHERE id=?').run(isoTime, runId);
}

/** 完成 run，同时计算总耗时 */
export function completeRun(db: DbConn, runId: string): void {
  db.prepare("UPDATE pipeline_runs SET status='completed', completed_at=datetime('now') WHERE id=?").run(runId);
  // 追加计算 total_duration_seconds；started_at/completed_at 缺失时不报错
  db.prepare(`
    UPDATE pipeline_runs SET total_duration_seconds = CAST(
      (julianday(completed_at) - julianday(started_at)) * 86400 AS INTEGER
    )
    WHERE id = ? AND started_at IS NOT NULL AND completed_at IS NOT NULL
  `).run(runId);
}

/** 中止 run，同时计算总耗时 */
export function abortRun(db: DbConn, runId: string): void {
  db.prepare("UPDATE pipeline_runs SET status='aborted', completed_at=datetime('now') WHERE id=?").run(runId);
  // 追加计算 total_duration_seconds；started_at/completed_at 缺失时不报错
  db.prepare(`
    UPDATE pipeline_runs SET total_duration_seconds = CAST(
      (julianday(completed_at) - julianday(started_at)) * 86400 AS INTEGER
    )
    WHERE id = ? AND started_at IS NOT NULL AND completed_at IS NOT NULL
  `).run(runId);
}

/**
 * 设置/清除 pipeline run 的会话任务名
 * name 为空或纯空白时，task_name 设为 null（清除）
 * runId 不存在时返回错误信息
 * @param {DatabaseSync} db
 * @param {string} runId
 * @param {string} name
 * @returns {{ ok: boolean; task_name: string | null; error?: string }}
 */
export function setRunTaskName(db: DbConn, runId: string, name: string): { ok: boolean; task_name: string | null; error?: string } {
  if (!runId) return { ok: false, task_name: null, error: 'runId required' };
  const trimmed = name?.trim() || null;
  if (trimmed) {
    const result = db.prepare('UPDATE pipeline_runs SET task_name=? WHERE id=?').run(trimmed, runId);
    if (result.changes === 0) return { ok: false, task_name: null, error: `Run not found: ${runId}` };
    return { ok: true, task_name: trimmed };
  }
  // 空白名称 → 清除
  const result = db.prepare('UPDATE pipeline_runs SET task_name=NULL WHERE id=?').run(runId);
  if (result.changes === 0) return { ok: false, task_name: null, error: `Run not found: ${runId}` };
  return { ok: true, task_name: null };
}

/**
 * 归档 run（设置 archived=1）
 * @param {DatabaseSync} db
 * @param {string} runId
 * @returns {{ ok: boolean }}
 */
export function archiveRun(db: DbConn, runId: string): { ok: boolean } {
  if (!runId) return { ok: false };
  const result = db.prepare('UPDATE pipeline_runs SET archived=1 WHERE id=?').run(runId);
  return { ok: result.changes > 0 };
}

/**
 * 取消归档 run（设置 archived=0）
 * @param {DatabaseSync} db
 * @param {string} runId
 * @returns {{ ok: boolean }}
 */
export function unarchiveRun(db: DbConn, runId: string): { ok: boolean } {
  if (!runId) return { ok: false };
  const result = db.prepare('UPDATE pipeline_runs SET archived=0 WHERE id=?').run(runId);
  return { ok: result.changes > 0 };
}

/**
 * 获取所有已归档的 run
 * @param {DatabaseSync} db
 * @returns {object[]}
 */
export function getArchivedRuns(db: DbConn): any[] {
  return db.prepare("SELECT * FROM pipeline_runs WHERE archived=1 ORDER BY session_id, started_at DESC").all();
}

/**
 * 硬删除 run
 * @param {DatabaseSync} db
 * @param {string} runId
 * @returns {{ ok: boolean }}
 */
/**
 * 硬删除 run，若该 session 再无其他 run 则同时删除 session
 * @param {DatabaseSync} db
 * @param {string} runId
 * @returns {{ ok: boolean }}
 */
export function deleteRun(db: DbConn, runId: string): { ok: boolean } {
  if (!runId) return { ok: false };
  try {
    // 先查出该 run 所属的 session_id
    const run = db.prepare('SELECT session_id FROM pipeline_runs WHERE id=?').get(runId) as { session_id: string } | undefined;
    const sessionId = run?.session_id;

    db.exec('BEGIN');
    // 级联删除关联的 artifacts 记录
    db.prepare('DELETE FROM artifacts WHERE run_id=?').run(runId);
    const result = db.prepare('DELETE FROM pipeline_runs WHERE id=?').run(runId);

    // 如果这是该 session 的最后一条 run，级联删除 session
    if (sessionId && result.changes > 0) {
      const remaining = db.prepare('SELECT COUNT(*) as cnt FROM pipeline_runs WHERE session_id=?').get(sessionId) as { cnt: number };
      if (remaining.cnt === 0) {
        db.prepare('DELETE FROM checkpoints WHERE session_id=?').run(sessionId);
        db.prepare('DELETE FROM pipeline WHERE session_id=?').run(sessionId);
        db.prepare('DELETE FROM sessions WHERE id=?').run(sessionId);
      }
    }

    db.exec('COMMIT');
    return { ok: result.changes > 0 };
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch (e: unknown) { if (!/already exists/i.test(String(e))) console.error("DB migration error:", String(e)); }
    throw e;
  }
}

/**
 * 直接删除 session 及其所有关联数据（级联删除 runs、artifacts、checkpoints、pipeline）
 * @param {DatabaseSync} db
 * @param {string} sessionId
 * @returns {{ ok: boolean }}
 */
export function deleteSession(db: DbConn, sessionId: string): { ok: boolean } {
  if (!sessionId) return { ok: false };
  try {
    db.exec('BEGIN');
    // 先查出所有关联的 run
    const runs = db.prepare('SELECT id FROM pipeline_runs WHERE session_id=?').all(sessionId) as Array<{ id: string }>;
    for (const r of runs) {
      db.prepare('DELETE FROM artifacts WHERE run_id=?').run(r.id);
    }
    db.prepare('DELETE FROM pipeline_runs WHERE session_id=?').run(sessionId);
    db.prepare('DELETE FROM checkpoints WHERE session_id=?').run(sessionId);
    db.prepare('DELETE FROM pipeline WHERE session_id=?').run(sessionId);
    const result = db.prepare('DELETE FROM sessions WHERE id=?').run(sessionId);
    db.exec('COMMIT');
    return { ok: result.changes > 0 };
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch (e: unknown) { if (!/already exists/i.test(String(e))) console.error("DB migration error:", String(e)); }
    throw e;
  }
}

/**
 * 置顶 run（设置 pinned=1）
 * @param {DatabaseSync} db
 * @param {string} runId
 * @returns {{ ok: boolean }}
 */
export function pinRun(db: DbConn, runId: string): { ok: boolean } {
  if (!runId) return { ok: false };
  const result = db.prepare('UPDATE pipeline_runs SET pinned=1 WHERE id=?').run(runId);
  return { ok: result.changes > 0 };
}

/**
 * 取消置顶 run（设置 pinned=0）
 * @param {DatabaseSync} db
 * @param {string} runId
 * @returns {{ ok: boolean }}
 */
export function unpinRun(db: DbConn, runId: string): { ok: boolean } {
  if (!runId) return { ok: false };
  const result = db.prepare('UPDATE pipeline_runs SET pinned=0 WHERE id=?').run(runId);
  return { ok: result.changes > 0 };
}

// ---- Artifacts ----

/**
 * 插入一条产物记录（幂等：同一 run_id+gate+filepath 静默忽略）
 * @param {DatabaseSync} db
 * @param {string} runId
 * @param {string} gate
 * @param {string} filepath 相对于 .jarvis/ 的路径，如 "2026-05-10/requirements/REQ-001.md"
 * @returns {{ ok: boolean }}
 */
export function insertArtifact(db: DbConn, runId: string, gate: string, filepath: string): { ok: boolean } {
  const result = db.prepare('INSERT OR IGNORE INTO artifacts (run_id, gate, filepath) VALUES (?, ?, ?)').run(runId, gate, filepath);
  return { ok: result.changes > 0 };
}

/**
 * 获取某 run 的所有产物
 * @param {DatabaseSync} db
 * @param {string} runId
 * @returns {Array<{id: number; run_id: string; gate: string; filepath: string; created_at: string}>}
 */
export function getArtifactsByRun(db: DbConn, runId: string): any[] {
  return db.prepare('SELECT * FROM artifacts WHERE run_id=? ORDER BY created_at').all(runId);
}

/**
 * 按 run + gate 获取产物（精确查询，无跨 run 污染）
 * @param {DatabaseSync} db
 * @param {string} runId
 * @param {string} gate
 * @returns {Array<{id: number; run_id: string; gate: string; filepath: string; created_at: string}>}
 */
export function getArtifactsByRunAndGate(db: DbConn, runId: string, gate: string): any[] {
  return db.prepare('SELECT * FROM artifacts WHERE run_id=? AND gate=? ORDER BY created_at').all(runId, gate);
}

// ---- Session Events（OMC-inspired 跨会话事件日志） ----

/**
 * 记录会话事件
 */
export function logSessionEvent(db: DbConn, sessionId: string, eventType: string, opts?: { runId?: string; gate?: string; detail?: string }): void {
  db.prepare('INSERT INTO session_events (session_id, run_id, event_type, gate, detail) VALUES (?, ?, ?, ?, ?)')
    .run(sessionId, opts?.runId || null, eventType, opts?.gate || null, opts?.detail || null);
}

/**
 * 获取会话事件日志
 */
export function getSessionEvents(db: DbConn, sessionId: string, limit: number = 50): any[] {
  return db.prepare('SELECT * FROM session_events WHERE session_id=? ORDER BY created_at DESC LIMIT ?').all(sessionId, limit);
}

/**
 * 获取 run 的事件日志
 */
export function getRunEvents(db: DbConn, runId: string): any[] {
  return db.prepare('SELECT * FROM session_events WHERE run_id=? ORDER BY created_at DESC').all(runId);
}

// ---- Resume State（OMC-inspired 会话恢复） ----

/**
 * 保存 run 的恢复数据
 */
export function saveResumeData(db: DbConn, runId: string, data: Record<string, unknown>): void {
  db.prepare('UPDATE pipeline_runs SET resume_data=? WHERE id=?').run(JSON.stringify(data), runId);
}

/**
 * 获取 run 的恢复数据
 */
export function getResumeData(db: DbConn,  runId: string): Record<string, unknown> | null {
  const row = db.prepare('SELECT resume_data FROM pipeline_runs WHERE id=?').get(runId) as { resume_data: string } | undefined;
  if (!row?.resume_data) return null;
  try { return JSON.parse(row.resume_data); } catch { return null; }
}

/**
 * 更新 session metadata
 */
export function updateSessionMetadata(db: DbConn, sessionId: string, metadata: Record<string, unknown>): void {
  db.prepare('UPDATE sessions SET metadata=? WHERE id=?').run(JSON.stringify(metadata), sessionId);
}

// ── flow_skills: 会话流程导出为可复用 Skill 模板 ──────────────

export function saveFlowSkill(db: DbConn, name: string, description: string, pipeline_type: string, gate_sequence: string, agent_spawns: string, skill_loads: string, source_session_id: string): string {
  const id = `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(`INSERT INTO flow_skills (id, name, description, pipeline_type, gate_sequence, agent_spawns, skill_loads, source_session_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
    .run(id, name, description, pipeline_type, gate_sequence, agent_spawns, skill_loads, source_session_id);
  return id;
}

export function getFlowSkills(db: DbConn): any[] {
  return db.prepare('SELECT * FROM flow_skills ORDER BY created_at DESC').all();
}

export function getFlowSkill(db: DbConn, id: string): any {
  return db.prepare('SELECT * FROM flow_skills WHERE id=?').get(id);
}

export function deleteFlowSkill(db: DbConn,  id: string) {
  return db.prepare('DELETE FROM flow_skills WHERE id=?').run(id);
}

export function getFlowSkillCount(db: DbConn): number {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM flow_skills').get() as { cnt: number };
  return row?.cnt || 0;
}

// ---- Working Memory（OMC-inspired 短期记忆，7天 TTL） ----

export function addWorkingMemory(db: DbConn, sessionId: string, content: string, opts?: { runId?: string; category?: string; ttlDays?: number }): void {
  const expiresAt = opts?.ttlDays
    ? new Date(Date.now() + opts.ttlDays * 86400000).toISOString()
    : new Date(Date.now() + 7 * 86400000).toISOString();
  db.prepare('INSERT INTO working_memory (session_id, run_id, category, content, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(sessionId, opts?.runId || null, opts?.category || 'general', content, expiresAt);
}

export function getWorkingMemory(db: DbConn, sessionId: string, limit = 20): any[] {
  return db.prepare(
    "SELECT * FROM working_memory WHERE session_id=? AND (expires_at IS NULL OR expires_at > datetime('now')) ORDER BY created_at DESC LIMIT ?"
  ).all(sessionId, limit);
}

export function queryWorkingMemory(db: DbConn, query: string, sessionId: string, limit = 20): any[] {
  return db.prepare(
    "SELECT * FROM working_memory WHERE (expires_at IS NULL OR expires_at > datetime('now')) AND session_id=? AND content LIKE ? ORDER BY created_at DESC LIMIT ?"
  ).all(sessionId, `%${query}%`, limit);
}

export function pruneWorkingMemory(db: DbConn): number {
  const result = db.prepare("DELETE FROM working_memory WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')").run();
  return Number(result.changes);
}

// ---- Session Context（会话归档摘要） ----

export function saveSessionContext(db: DbConn, sessionId: string, runId: string, summary: string, keyDecisions?: string[], pendingItems?: string[]): void {
  db.prepare('INSERT INTO session_context (session_id, run_id, summary, key_decisions, pending_items) VALUES (?, ?, ?, ?, ?)')
    .run(sessionId, runId, summary, keyDecisions ? JSON.stringify(keyDecisions) : null, pendingItems ? JSON.stringify(pendingItems) : null);
}

export function getRecentSessionContexts(db: DbConn, limit = 3): any[] {
  return db.prepare('SELECT * FROM session_context ORDER BY created_at DESC LIMIT ?').all(limit);
}

export function getSessionContext(db: DbConn, sessionId: string): any {
  return db.prepare('SELECT * FROM session_context WHERE session_id=? ORDER BY created_at DESC LIMIT 1').get(sessionId);
}

