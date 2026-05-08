import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, getSessions, addSession, touchSession, getSession, removeSession, initPipeline, getPipeline, getCheckpoints, addCheckpoint, setAgentModel, getAgentConfig } from '../src/engine/db.js';

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
