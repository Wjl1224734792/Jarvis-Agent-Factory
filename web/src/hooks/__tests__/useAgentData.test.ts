import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAgentData } from '../useAgentData';
import { api } from '../../api';

// mock api 模块，避免发起真实 HTTP 请求
vi.mock('../../api', () => ({
  api: {
    agentStatus: vi.fn().mockResolvedValue({
      run_id: 'test',
      active: [],
      completed: [],
      failed: [],
    }),
    agentUsage: vi.fn().mockResolvedValue({
      run_id: 'test',
      agents: {},
      totals: {
        calls: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cache_creation_input_tokens: 0,
        total_cache_read_input_tokens: 0,
      },
    }),
  },
}));

describe('useAgentData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runId 为 null 时不发起请求', () => {
    const { result } = renderHook(() => useAgentData(null));
    expect(api.agentStatus).not.toHaveBeenCalled();
    expect(api.agentUsage).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.agentStatus).toBeNull();
    expect(result.current.agentUsage).toBeNull();
  });

  it('组件卸载后清理定时器', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useAgentData('test-run'));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
