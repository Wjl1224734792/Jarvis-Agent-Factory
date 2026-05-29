/**
 * hookCommand 单元测试 — 覆盖 gate-check / gate-advance / status / report-status / agent-config
 *
 * Mock 策略: vi.stubGlobal('fetch', ...) + vi.spyOn(process, 'exit') + vi.spyOn(console, 'log')
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    on: vi.fn(),
    unref: vi.fn(),
  })),
}));

const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

import { hookCommand } from '../src/hook.js';

describe('hookCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  // ================================================================
  // gate-check with --operation
  // ================================================================
  describe('gate-check with --operation', () => {
    it('1 | write_code 在 Gate A 被拒绝 → exit(2)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ session_id: 's1', current_gate: 'Gate A', pipeline_name: '全流程', status: 'active' }]
        })
      });
      await hookCommand(['gate-check', '--operation', 'write_code']);
      expect(exitSpy).toHaveBeenCalledWith(2);
    });

    it('2 | write_code 在 Gate C-impl 允许 → exit(0)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ session_id: 's1', current_gate: 'Gate C-impl', pipeline_name: '全流程', status: 'active' }]
        })
      });
      await hookCommand(['gate-check', '--operation', 'write_code']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('3 | spawn_impl 在 Gate A 被拒绝 → exit(2)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ session_id: 's1', current_gate: 'Gate A', pipeline_name: '全流程', status: 'active' }]
        })
      });
      await hookCommand(['gate-check', '--operation', 'spawn_impl']);
      expect(exitSpy).toHaveBeenCalledWith(2);
    });

    it('4 | spawn_impl 在 Gate C 允许 → exit(0)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ session_id: 's1', current_gate: 'Gate C', pipeline_name: '全流程', status: 'active' }]
        })
      });
      await hookCommand(['gate-check', '--operation', 'spawn_impl']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('5 | spawn_test 在 Gate C2 允许 → exit(0)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ session_id: 's1', current_gate: 'Gate C2', pipeline_name: '全流程', status: 'active' }]
        })
      });
      await hookCommand(['gate-check', '--operation', 'spawn_test']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('6 | review 在 Gate D 允许 → exit(0)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ session_id: 's1', current_gate: 'Gate D', pipeline_name: '全流程', status: 'active' }]
        })
      });
      await hookCommand(['gate-check', '--operation', 'review']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('7 | Gate=Complete → 直接通过 exit(0)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ session_id: 's1', current_gate: 'Complete', pipeline_name: '全流程', status: 'active' }]
        })
      });
      await hookCommand(['gate-check', '--operation', 'spawn_impl']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  // ================================================================
  // gate-check WITHOUT --operation（Phase 1 新行为）
  // ================================================================
  describe('gate-check without --operation (Agent default)', () => {
    it('8 | Gate A：spawn_impl 在 allow → enforce 通过 → exit(0) 探索 Agent 允许 spawn', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ session_id: 's1', current_gate: 'Gate A', pipeline_name: '全流程', status: 'active' }]
        })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ allowed: true })
      });
      await hookCommand(['gate-check']);
      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Gate A'));
    });

    it('9 | Gate C-impl：spawn_impl 在允许列表中 → exit(0)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ session_id: 's1', current_gate: 'Gate C-impl', pipeline_name: '全流程', status: 'active' }]
        })
      });
      await hookCommand(['gate-check']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('10 | Gate C：spawn_impl 也在允许列表中 → exit(0)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ session_id: 's1', current_gate: 'Gate C', pipeline_name: '全流程', status: 'active' }]
        })
      });
      await hookCommand(['gate-check']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  // ================================================================
  // gate-check error cases
  // ================================================================
  describe('gate-check error cases', () => {
    it('11 | 无会话 → exit(0)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: [] })
      });
      await hookCommand(['gate-check']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('12 | Engine 不可用 → exit(0) + 尝试自启动', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      await hookCommand(['gate-check']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  // ================================================================
  // gate-advance
  // ================================================================
  describe('gate-advance', () => {
    it('13 | 指定目标 Gate 推进成功 → exit(0)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ session_id: 's1', current_gate: 'Gate A', pipeline_name: '全流程', status: 'active' }]
        })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ allowed: true, previous: 'Gate A', current: 'Gate B-DDD', next: 'Gate B-BDD' })
      });
      await hookCommand(['gate-advance', '--gate', 'Gate B-DDD']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('14 | 推进被阻止 → exit(2)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ session_id: 's1', current_gate: 'Gate A', pipeline_name: '全流程', status: 'active' }]
        })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ allowed: false, error: 'missing artifacts' })
      });
      await hookCommand(['gate-advance']);
      expect(exitSpy).toHaveBeenCalledWith(2);
    });

    it('15 | Engine 不可用 → exit(0) + 尝试自启动', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      await hookCommand(['gate-advance']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  // ================================================================
  // status
  // ================================================================
  describe('status', () => {
    it('16 | 正常显示 → exit(0)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ session_id: 's1', current_gate: 'Gate C', pipeline_name: '全流程', status: 'active' }],
          active_count: 1
        })
      });
      await hookCommand(['status']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('17 | --json → exit(0)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: [], active_count: 0 })
      });
      await hookCommand(['status', '--json']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('18 | Engine 不可用 → exit(0) 非致命', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      await hookCommand(['status']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  // ================================================================
  // report-status
  // ================================================================
  describe('report-status', () => {
    it('19 | 有会话时显示报告 → exit(0)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ session_id: 's1', current_gate: 'Gate D', pipeline_name: '全流程', status: 'active', gates: [{ gate: 'Gate A', passed: true }] }],
          active_count: 1
        })
      });
      await hookCommand(['report-status']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  // ================================================================
  // unknown subcommand
  // ================================================================
  describe('unknown subcommand', () => {
    it('20 | 未知子命令 → exit(0) + 用法', async () => {
      await hookCommand(['unknown-cmd']);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });
});
