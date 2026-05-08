import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

export function openDb(root) {
  const dir = join(root, '.jarvis');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(join(dir, 'engine.db'));
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
}

// ---- Pipeline (per-session) ----
export function getPipeline(db, sessionId) {
  return db.prepare('SELECT * FROM pipeline WHERE session_id=?').get(sessionId || 'legacy');
}
export function updatePipelineGate(db, sessionId, gate) {
  db.prepare(`UPDATE pipeline SET current_gate=?, updated_at=datetime('now') WHERE session_id=?`).run(gate, sessionId || 'legacy');
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
  if (gate) return db.prepare('SELECT * FROM checkpoints WHERE gate=? AND session_id=?').all(gate, sessionId || 'legacy');
  return db.prepare('SELECT * FROM checkpoints WHERE session_id=? ORDER BY passed_at').all(sessionId || 'legacy');
}
export function addCheckpoint(db, gate, advanceTo, sessionId) {
  db.prepare(`INSERT OR REPLACE INTO checkpoints (session_id, gate, passed_at, advance_to) VALUES (?, ?, datetime('now'), ?)`).run(sessionId, gate, advanceTo);
}

// ---- Sessions ----
/** @param {'active'|'inactive'|undefined} statusFilter */
export function getSessions(db, statusFilter) {
  if (statusFilter) return db.prepare('SELECT * FROM sessions WHERE status=? ORDER BY created_at').all(statusFilter);
  return db.prepare('SELECT * FROM sessions ORDER BY created_at').all();
}
export function getSession(db, sid) {
  return db.prepare('SELECT * FROM sessions WHERE id=?').get(sid);
}
export function addSession(db, sid, platform, role) {
  db.prepare('INSERT OR REPLACE INTO sessions (id, platform, role, status, created_at, last_heartbeat) VALUES (?, ?, ?, ?, ?, ?)').run(sid, platform, role || 'member', 'active', Date.now(), Date.now());
}
export function heartbeatSession(db, sid) {
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
