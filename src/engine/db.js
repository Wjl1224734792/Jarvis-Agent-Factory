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
    -- Migration: rename old single-row pipeline table if exists
  `);
  try { db.exec("ALTER TABLE agent_models ADD COLUMN effort TEXT NOT NULL DEFAULT 'high'"); } catch {}
  // Migration from old single-row pipeline: add session_id if missing
  try { db.exec("ALTER TABLE pipeline ADD COLUMN session_id TEXT"); } catch {}
  try {
    const old = db.prepare('SELECT id, project, current_gate, started_at, updated_at FROM pipeline WHERE session_id IS NULL').all();
    for (const r of old) {
      db.prepare('INSERT OR REPLACE INTO pipeline (session_id, project, current_gate, started_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('legacy', r.project, r.current_gate, r.started_at, r.updated_at);
    }
  } catch {}
  // Migrate: add status column to sessions if missing
  try { db.exec("ALTER TABLE sessions ADD COLUMN status TEXT DEFAULT 'active'"); } catch {}
  // Migrate: add pipeline_type column to pipeline if missing
  try { db.exec("ALTER TABLE pipeline ADD COLUMN pipeline_type TEXT DEFAULT 'full'"); } catch {}
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
