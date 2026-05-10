import { describe, it, expect } from 'vitest';

/**
 * TASK-004 / REQ-027 — 会话列表操作乐观更新 + 回滚
 *
 * RED 阶段：测试先于实现。
 * 从 Layout.tsx 导入乐观更新纯函数（尚未实现），验证期望行为。
 * 这些函数将在 Layout.tsx 中作为模块级导出，被 handlePin/handleArchive/handleDelete 调用。
 */
import {
  applyPinOptimistic,
  applyArchiveOptimistic,
  applyDeleteOptimistic,
  applyRollback,
  sortSessions,
} from '../Layout';

import type { Session } from '../../api';

// ============================================================
// 测试辅助
// ============================================================
function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 's-default',
    platform: 'claude',
    role: 'default',
    gate: 'planning',
    pipeline_type: 'full',
    heartbeat: 1000,
    status: 'active',
    task_name: null,
    run_id: 'r-default',
    pinned: 0,
    latest_run_started_at: null,
    ...overrides,
  };
}

// ============================================================
// applyPinOptimistic — 乐观置顶
// ============================================================
describe('applyPinOptimistic', () => {
  it('将未置顶会话置顶：pinned 字段从 0 变为 1', () => {
    const sessions = [
      makeSession({ run_id: 'r1', pinned: 0 }),
    ];
    const result = applyPinOptimistic(sessions, 'r1', false);
    expect(result[0].pinned).toBe(1);
  });

  it('取消已置顶会话的置顶：pinned 字段从 1 变为 0', () => {
    const sessions = [
      makeSession({ run_id: 'r1', pinned: 1 }),
    ];
    const result = applyPinOptimistic(sessions, 'r1', true);
    expect(result[0].pinned).toBe(0);
  });

  it('不影响其他会话', () => {
    const sessions = [
      makeSession({ id: 's1', run_id: 'r1', pinned: 0 }),
      makeSession({ id: 's2', run_id: 'r2', pinned: 1 }),
    ];
    const result = applyPinOptimistic(sessions, 'r1', false);
    expect(result[0].pinned).toBe(1); // toggled
    expect(result[1].pinned).toBe(1); // unchanged
  });

  it('返回新数组（不可变性）', () => {
    const sessions = [
      makeSession({ run_id: 'r1', pinned: 0 }),
    ];
    const result = applyPinOptimistic(sessions, 'r1', false);
    expect(result).not.toBe(sessions);
    expect(result[0]).not.toBe(sessions[0]);
  });
});

// ============================================================
// applyArchiveOptimistic — 乐观归档
// ============================================================
describe('applyArchiveOptimistic', () => {
  it('按 run_id 移除会话', () => {
    const sessions = [
      makeSession({ id: 's1', run_id: 'r1' }),
      makeSession({ id: 's2', run_id: 'r2' }),
    ];
    const result = applyArchiveOptimistic(sessions, 'r1');
    expect(result).toHaveLength(1);
    expect(result[0].run_id).toBe('r2');
  });

  it('不影响其他会话', () => {
    const sessions = [
      makeSession({ id: 's1', run_id: 'r1' }),
      makeSession({ id: 's2', run_id: 'r2' }),
      makeSession({ id: 's3', run_id: 'r3' }),
    ];
    const result = applyArchiveOptimistic(sessions, 'r2');
    expect(result.map(s => s.id)).toEqual(['s1', 's3']);
  });

  it('返回新数组', () => {
    const sessions = [
      makeSession({ id: 's1', run_id: 'r1' }),
    ];
    const result = applyArchiveOptimistic(sessions, 'r1');
    expect(result).not.toBe(sessions);
  });
});

// ============================================================
// applyDeleteOptimistic — 乐观删除
// ============================================================
describe('applyDeleteOptimistic', () => {
  it('优先按 run_id 移除会话', () => {
    const sessions = [
      makeSession({ id: 's1', run_id: 'r1' }),
      makeSession({ id: 's2', run_id: 'r2' }),
    ];
    const result = applyDeleteOptimistic(sessions, 'r1');
    expect(result).toHaveLength(1);
    expect(result[0].run_id).toBe('r2');
  });

  it('当 run_id 不存在时按 id 移除', () => {
    const sessions = [
      makeSession({ id: 's1', run_id: 'r1' }),
      makeSession({ id: 's2', run_id: null }),
    ];
    const result = applyDeleteOptimistic(sessions, 's2');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s1');
  });

  it('不影响其他会话', () => {
    const sessions = [
      makeSession({ id: 's1', run_id: 'r1' }),
      makeSession({ id: 's2', run_id: 'r2' }),
      makeSession({ id: 's3', run_id: 'r3' }),
    ];
    const result = applyDeleteOptimistic(sessions, 'r2');
    expect(result.map(s => s.id)).toEqual(['s1', 's3']);
  });

  it('返回新数组', () => {
    const sessions = [
      makeSession({ id: 's1', run_id: 'r1' }),
    ];
    const result = applyDeleteOptimistic(sessions, 'r1');
    expect(result).not.toBe(sessions);
  });
});

// ============================================================
// applyRollback — 回滚快照
// ============================================================
describe('applyRollback', () => {
  it('将状态恢复为操作前的快照', () => {
    const snapshot = [
      makeSession({ id: 's1', run_id: 'r1', pinned: 0 }),
      makeSession({ id: 's2', run_id: 'r2', pinned: 0 }),
    ];
    const result = applyRollback(snapshot);
    expect(result).toEqual(snapshot);
    expect(result).not.toBe(snapshot); // defensive copy
  });
});

// ============================================================
// sortSessions — 置顶 + heartbeat 排序
// ============================================================
describe('sortSessions', () => {
  it('置顶项排在非置顶项之前', () => {
    const sessions = [
      makeSession({ pinned: 0, heartbeat: 3000 }),
      makeSession({ pinned: 1, heartbeat: 1000 }),
    ];
    const result = sortSessions(sessions);
    expect(result[0].pinned).toBe(1);
    expect(result[1].pinned).toBe(0);
  });

  it('同置顶状态下按 heartbeat 降序排列', () => {
    const sessions = [
      makeSession({ pinned: 0, heartbeat: 1000 }),
      makeSession({ pinned: 0, heartbeat: 3000 }),
    ];
    const result = sortSessions(sessions);
    expect(result[0].heartbeat).toBe(3000);
    expect(result[1].heartbeat).toBe(1000);
  });

  it('置顶且 heartbeat 更高时应排在最前', () => {
    const sessions = [
      makeSession({ pinned: 0, heartbeat: 5000 }),
      makeSession({ pinned: 1, heartbeat: 2000 }),
      makeSession({ pinned: 0, heartbeat: 3000 }),
    ];
    const result = sortSessions(sessions);
    expect(result[0].pinned).toBe(1);
    expect(result[0].heartbeat).toBe(2000);
    expect(result[1].heartbeat).toBe(5000);
    expect(result[2].heartbeat).toBe(3000);
  });

  it('空数组应返回空数组', () => {
    expect(sortSessions([])).toEqual([]);
  });
});
