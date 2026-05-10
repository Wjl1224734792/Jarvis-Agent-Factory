import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

/**
 * 打开引擎数据库，固定存储在 ~/.jarvis/engine.db
 * @returns {DatabaseSync}
 */
export function openDb() {
  const dir = resolve(homedir(), '.jarvis');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(resolve(dir, 'engine.db'));
  db.exec('PRAGMA journal_mode=WAL');
  db.exec('PRAGMA busy_timeout=5000');
  initSchema(db);
  return db;
}

function initSchema(db) {
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

  try { db.exec("ALTER TABLE agent_models ADD COLUMN effort TEXT NOT NULL DEFAULT 'high'"); } catch {}

  // ---- 迁移：修复旧 pipeline 表 CHECK(id=1) 约束 ----
  const pipeSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='pipeline'").get();
  if (pipeSchema && /CHECK\s*\(\s*id\s*=\s*1\s*\)/i.test(pipeSchema.sql)) {
    // 旧单行表有 CHECK(id=1) 约束，需重建
    db.exec('BEGIN');
    try {
      // 备份旧数据（旧表可能有 id, project, current_gate, mode, started_at, updated_at, session_id, pipeline_type）
      const oldRows = db.prepare('SELECT * FROM pipeline').all();
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
      console.error('  ✗  pipeline 迁移失败:', e.message);
    }
  }

  // ---- 迁移：修复旧 checkpoints 表 UNIQUE(gate) → UNIQUE(session_id, gate) ----
  const cpSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='checkpoints'").get();
  if (cpSchema && !/session_id.*gate/i.test(cpSchema.sql)) {
    // 旧表只有 UNIQUE(gate)，缺少 session_id 列或多列唯一约束
    db.exec('BEGIN');
    try {
      const oldRows = db.prepare('SELECT * FROM checkpoints').all();
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
      console.error('  ✗  checkpoints 迁移失败:', e.message);
    }
  }

  // ---- 旧列迁移（向后兼容） ----
  try { db.exec("ALTER TABLE sessions ADD COLUMN status TEXT DEFAULT 'active'"); } catch {}

  // ---- 会话任务名迁移 ----
  try { db.exec("ALTER TABLE pipeline_runs ADD COLUMN task_name TEXT"); } catch {}

  // ---- Run 归档迁移 ----
  try { db.exec("ALTER TABLE pipeline_runs ADD COLUMN archived INTEGER DEFAULT 0"); } catch {}

  // ---- Run 置顶迁移 ----
  try { db.exec("ALTER TABLE pipeline_runs ADD COLUMN pinned INTEGER DEFAULT 0"); } catch {}

  // ----  TASK-001: Gate 进入时间记录 ----
  try { db.exec("ALTER TABLE pipeline_runs ADD COLUMN gate_entered_at TEXT"); } catch {}

  // ----  TASK-001: Checkpoint 耗时字段 ----
  try { db.exec("ALTER TABLE checkpoints ADD COLUMN duration_seconds INTEGER"); } catch {}

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

  // ----  TASK-002: 任务总耗时列 ----
  try { db.exec("ALTER TABLE pipeline_runs ADD COLUMN total_duration_seconds INTEGER"); } catch {}

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
  const existingRuns = db.prepare('SELECT COUNT(*) as cnt FROM pipeline_runs').get();
  if (existingRuns.cnt === 0) {
    const oldPipelines = db.prepare('SELECT * FROM pipeline').all();
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
export function getPipeline(db, sessionId) {
  if (!sessionId) return null;
  return db.prepare('SELECT * FROM pipeline WHERE session_id=?').get(sessionId);
}
export function updatePipelineGate(db, sessionId, gate) {
  if (!sessionId) throw new Error('session_id required');
  db.prepare(`UPDATE pipeline SET current_gate=?, updated_at=datetime('now') WHERE session_id=?`).run(gate, sessionId);
}
/** @param {'full'|'frontend'|'backend'} pipelineType */
export function initPipeline(db, sessionId, project, pipelineType = 'full') {
  db.prepare(`INSERT OR REPLACE INTO pipeline (session_id, project, current_gate, pipeline_type, started_at, updated_at) VALUES (?, ?, 'Gate A', ?, datetime('now'), datetime('now'))`).run(sessionId, project, pipelineType);
}
export function getAllPipelines(db) {
  return db.prepare('SELECT * FROM pipeline ORDER BY updated_at DESC').all();
}

// ---- Checkpoints (per-session) ----
export function getCheckpoints(db, gate, sessionId) {
  if (!sessionId) return [];
  if (gate) return db.prepare('SELECT * FROM checkpoints WHERE gate=? AND session_id=?').all(gate, sessionId);
  return db.prepare('SELECT * FROM checkpoints WHERE session_id=? ORDER BY passed_at').all(sessionId);
}
/**
 * 记录 checkpoint，可选传入 Gate 耗时（秒）
 * @param {DatabaseSync} db
 * @param {string} gate
 * @param {string} advanceTo
 * @param {string} sessionId
 * @param {number} [durationSeconds] Gate 耗时（秒），不传则为 NULL
 */
export function addCheckpoint(db, gate, advanceTo, sessionId, durationSeconds: number | undefined = undefined) {
  if (durationSeconds !== undefined) {
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
export function getSessions(db, statusFilter = undefined) {
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
export function getSession(db, sid) {
  return db.prepare('SELECT * FROM sessions WHERE id=?').get(sid);
}
export function addSession(db, sid, platform, role) {
  db.prepare('INSERT OR REPLACE INTO sessions (id, platform, role, status, created_at, last_heartbeat) VALUES (?, ?, ?, ?, ?, ?)').run(sid, platform, role || 'member', 'active', Date.now(), Date.now());
}
/** 更新会话活动时间——每次 MCP 工具调用即视为心跳 */
export function touchSession(db, sid) {
  db.prepare("UPDATE sessions SET last_heartbeat=?, status='active' WHERE id=?").run(Date.now(), sid);
}
export function removeSession(db, sid) {
  db.prepare('DELETE FROM sessions WHERE id=?').run(sid);
}
export function updateSessionRole(db, sid, role) {
  db.prepare('UPDATE sessions SET role=? WHERE id=?').run(role, sid);
}
/** 将会话标记为 inactive 而非删除，保留 pipeline 数据供恢复 */
export function markStaleSessions(db, timeoutMs) {
  const cutoff = Date.now() - timeoutMs;
  const stale = db.prepare("SELECT id FROM sessions WHERE last_heartbeat < ? AND status='active'").all(cutoff);
  for (const s of stale) db.prepare("UPDATE sessions SET status='inactive' WHERE id=?").run(s.id);
  return stale.map(s => s.id);
}
/** 恢复 inactive 会话为 active */
export function resumeSession(db, sid) {
  db.prepare("UPDATE sessions SET status='active', last_heartbeat=? WHERE id=?").run(Date.now(), sid);
}
/** 迁移旧会话的 pipeline 和 checkpoints 到新 sessionId（用于 MCP 重连恢复） */
export function migrateSession(db, oldSid, newSid) {
  db.prepare('UPDATE pipeline SET session_id=? WHERE session_id=?').run(newSid, oldSid);
  db.prepare('UPDATE checkpoints SET session_id=? WHERE session_id=?').run(newSid, oldSid);
}
export function getOldestSession(db) {
  return db.prepare('SELECT * FROM sessions ORDER BY created_at ASC LIMIT 1').get();
}

// ---- Agent Models ----
export function getAgentConfig(db) {
  const rows = db.prepare('SELECT agent_id, model, effort FROM agent_models').all();
  const cfg = {};
  for (const r of rows) cfg[r.agent_id] = { model: r.model, effort: r.effort };
  return cfg;
}
export function setAgentModel(db, agentId, model, effort) {
  db.prepare(`INSERT OR REPLACE INTO agent_models (agent_id, model, effort, updated_at) VALUES (?, ?, ?, datetime('now'))`).run(agentId, model, effort || 'high');
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
export function createPipelineRun(db, sessionId, project, pipelineType = 'full') {
  const id = 'run_' + Date.now();
  db.prepare(`INSERT INTO pipeline_runs (id, session_id, project, pipeline_type, current_gate, status, started_at, gate_entered_at)
    VALUES (?, ?, ?, ?, 'Gate A', 'active', datetime('now'), datetime('now'))`).run(id, sessionId, project, pipelineType);
  return id;
}

/** 获取指定 run */
export function getPipelineRun(db, runId) {
  return db.prepare('SELECT * FROM pipeline_runs WHERE id=?').get(runId);
}

/**
 * 获取 session 的当前活跃 run（最新一条 status=active）
 * @returns {object|undefined}
 */
export function getActiveRun(db, sessionId) {
  return db.prepare("SELECT * FROM pipeline_runs WHERE session_id=? AND status='active' AND archived=0 ORDER BY started_at DESC LIMIT 1").get(sessionId);
}

/**
 * 获取 session 的所有 runs（按时间倒序）
 * @returns {object[]}
 */
export function getSessionRuns(db, sessionId) {
  return db.prepare('SELECT * FROM pipeline_runs WHERE session_id=? ORDER BY started_at DESC').all(sessionId);
}

/** 更新 run 的当前 Gate */
export function updateRunGate(db, runId, gate) {
  db.prepare("UPDATE pipeline_runs SET current_gate=? WHERE id=?").run(gate, runId);
}

/**
 * 更新 run 的 Gate 进入时间
 * @param {DatabaseSync} db
 * @param {string} runId
 * @param {string} isoTime 进入时间的 ISO 字符串
 */
export function updateRunGateEnteredAt(db, runId, isoTime) {
  db.prepare('UPDATE pipeline_runs SET gate_entered_at=? WHERE id=?').run(isoTime, runId);
}

/** 完成 run，同时计算总耗时 */
export function completeRun(db, runId) {
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
export function abortRun(db, runId) {
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
export function setRunTaskName(db, runId, name) {
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
export function archiveRun(db, runId) {
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
export function unarchiveRun(db, runId) {
  if (!runId) return { ok: false };
  const result = db.prepare('UPDATE pipeline_runs SET archived=0 WHERE id=?').run(runId);
  return { ok: result.changes > 0 };
}

/**
 * 获取所有已归档的 run
 * @param {DatabaseSync} db
 * @returns {object[]}
 */
export function getArchivedRuns(db) {
  return db.prepare("SELECT * FROM pipeline_runs WHERE archived=1 ORDER BY session_id, started_at DESC").all();
}

/**
 * 硬删除 run
 * @param {DatabaseSync} db
 * @param {string} runId
 * @returns {{ ok: boolean }}
 */
export function deleteRun(db, runId) {
  if (!runId) return { ok: false };
  // 级联删除关联的 artifacts 记录
  db.prepare('DELETE FROM artifacts WHERE run_id=?').run(runId);
  const result = db.prepare('DELETE FROM pipeline_runs WHERE id=?').run(runId);
  return { ok: result.changes > 0 };
}

/**
 * 置顶 run（设置 pinned=1）
 * @param {DatabaseSync} db
 * @param {string} runId
 * @returns {{ ok: boolean }}
 */
export function pinRun(db, runId) {
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
export function unpinRun(db, runId) {
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
 * @param {string} filepath 相对于 docs/ 的路径，如 "2026-05-10/requirements/REQ-001.md"
 * @returns {{ ok: boolean }}
 */
export function insertArtifact(db, runId, gate, filepath) {
  const result = db.prepare('INSERT OR IGNORE INTO artifacts (run_id, gate, filepath) VALUES (?, ?, ?)').run(runId, gate, filepath);
  return { ok: result.changes > 0 };
}

/**
 * 获取某 run 的所有产物
 * @param {DatabaseSync} db
 * @param {string} runId
 * @returns {Array<{id: number; run_id: string; gate: string; filepath: string; created_at: string}>}
 */
export function getArtifactsByRun(db, runId) {
  return db.prepare('SELECT * FROM artifacts WHERE run_id=? ORDER BY created_at').all(runId);
}

/**
 * 按 run + gate 获取产物（精确查询，无跨 run 污染）
 * @param {DatabaseSync} db
 * @param {string} runId
 * @param {string} gate
 * @returns {Array<{id: number; run_id: string; gate: string; filepath: string; created_at: string}>}
 */
export function getArtifactsByRunAndGate(db, runId, gate) {
  return db.prepare('SELECT * FROM artifacts WHERE run_id=? AND gate=? ORDER BY created_at').all(runId, gate);
}
