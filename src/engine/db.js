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
      id INTEGER PRIMARY KEY CHECK(id=1),
      project TEXT NOT NULL,
      current_gate TEXT NOT NULL DEFAULT 'Gate A',
      mode TEXT NOT NULL DEFAULT 'strict',
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS checkpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gate TEXT NOT NULL,
      passed_at TEXT NOT NULL,
      advance_to TEXT,
      session_id TEXT,
      UNIQUE(gate)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      platform TEXT DEFAULT 'unknown',
      role TEXT NOT NULL DEFAULT 'observer',
      created_at INTEGER NOT NULL,
      last_heartbeat INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_models (
      agent_id TEXT PRIMARY KEY,
      model TEXT NOT NULL,
      effort TEXT NOT NULL DEFAULT 'high',
      updated_at TEXT NOT NULL
    );
    -- Init pipeline row if empty
    INSERT OR IGNORE INTO pipeline (id, project, current_gate, mode, started_at, updated_at)
    VALUES (1, '', 'Gate A', 'strict', datetime('now'), datetime('now'));
    -- Migration: add effort column if missing (safe to fail)
  `);
  try { db.exec("ALTER TABLE agent_models ADD COLUMN effort TEXT NOT NULL DEFAULT 'high'"); } catch {}
  db.exec(`
  `);
}

// ---- Pipeline ----
export function getPipeline(db) {
  return db.prepare('SELECT * FROM pipeline WHERE id=1').get();
}
export function updatePipelineGate(db, gate) {
  db.prepare(`UPDATE pipeline SET current_gate=?, updated_at=datetime('now') WHERE id=1`).run(gate);
}
export function initPipeline(db, project, sessionId) {
  db.prepare(`UPDATE pipeline SET project=?, current_gate='Gate A', mode='strict', started_at=datetime('now'), updated_at=datetime('now') WHERE id=1`).run(project);
}

// ---- Checkpoints ----
export function getCheckpoints(db, gate) {
  return gate ? db.prepare('SELECT * FROM checkpoints WHERE gate=?').all(gate)
    : db.prepare('SELECT * FROM checkpoints ORDER BY passed_at').all();
}
export function addCheckpoint(db, gate, advanceTo, sessionId) {
  db.prepare(`INSERT OR REPLACE INTO checkpoints (gate, passed_at, advance_to, session_id) VALUES (?, datetime('now'), ?, ?)`).run(gate, advanceTo, sessionId);
}

// ---- Sessions ----
export function getSessions(db) {
  return db.prepare('SELECT * FROM sessions ORDER BY created_at').all();
}
export function getSession(db, sid) {
  return db.prepare('SELECT * FROM sessions WHERE id=?').get(sid);
}
export function addSession(db, sid, platform, role) {
  db.prepare('INSERT OR REPLACE INTO sessions (id, platform, role, created_at, last_heartbeat) VALUES (?, ?, ?, ?, ?)').run(sid, platform, role, Date.now(), Date.now());
}
export function heartbeatSession(db, sid) {
  db.prepare('UPDATE sessions SET last_heartbeat=? WHERE id=?').run(Date.now(), sid);
}
export function removeSession(db, sid) {
  db.prepare('DELETE FROM sessions WHERE id=?').run(sid);
}
export function updateSessionRole(db, sid, role) {
  db.prepare('UPDATE sessions SET role=? WHERE id=?').run(role, sid);
}
export function cleanupStaleSessions(db, timeoutMs) {
  const cutoff = Date.now() - timeoutMs;
  const stale = db.prepare('SELECT id FROM sessions WHERE last_heartbeat < ?').all(cutoff);
  for (const s of stale) db.prepare('DELETE FROM sessions WHERE id=?').run(s.id);
  return stale.map(s => s.id);
}
export function getOldestSession(db) {
  return db.prepare('SELECT * FROM sessions ORDER BY created_at ASC LIMIT 1').get();
}
export function getLeader(db) {
  return db.prepare(`SELECT * FROM sessions WHERE role='leader' LIMIT 1`).get();
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
