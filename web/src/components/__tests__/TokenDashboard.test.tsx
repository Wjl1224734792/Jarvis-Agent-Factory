import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import TokenDashboard from '../TokenDashboard';
import X6FlowChart from '../X6FlowChart';
import type { AgentUsageResponse } from '../../api';

/**
 * jsdom 不提供 requestAnimationFrame，此处 polyfill。
 * TokenDashboard 内部的 useAnimatedNumber hook 依赖 rAF。
 */
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  };
  globalThis.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}

/**
 * jsdom 不提供 window.matchMedia，antd 的 Row/Col（useBreakpoint）依赖它。
 * 使用简单桩函数返回默认不匹配结果。
 */
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
    writable: true,
    configurable: true,
  });
}

// ============================================================
// TokenDashboard 测试
// ============================================================
describe('TokenDashboard', () => {
  it('空数据状态下渲染 Empty 组件', () => {
    const { container } = render(
      <TokenDashboard runId="test" agentUsage={null} loading={false} />,
    );
    expect(container.textContent).toContain('暂无 Token 消耗数据');
  });

  it('传入 mock agentUsage 数据后渲染统计信息', () => {
    const mockUsage: AgentUsageResponse = {
      run_id: 'test-run',
      agents: {
        'agent-1': {
          model: 'claude-sonnet-4-6',
          calls: 5,
          total_input_tokens: 100000,
          total_output_tokens: 20000,
          total_cache_creation_input_tokens: 50000,
          total_cache_read_input_tokens: 30000,
        },
      },
      totals: {
        calls: 5,
        total_input_tokens: 100000,
        total_output_tokens: 20000,
        total_cache_creation_input_tokens: 50000,
        total_cache_read_input_tokens: 30000,
      },
    };

    const { container } = render(
      <TokenDashboard runId="test" agentUsage={mockUsage} loading={false} />,
    );
    expect(container.textContent).toContain('总 Token 消耗');
    expect(container.textContent).toContain('claude-sonnet-4-6');
  });
});

// ============================================================
// X6FlowChart smoke test
// Canvas API 在 jsdom 中不可用，仅验证 runId=null 时空状态不抛异常
// ============================================================
describe('X6FlowChart', () => {
  it('runId 为 null 时渲染空状态（不依赖 Canvas）', () => {
    const { container } = render(
      <ConfigProvider>
        <X6FlowChart runId={null} agentStatus={null} selectedGate={null} onGateSelect={() => {}} />
      </ConfigProvider>,
    );
    expect(container.textContent).toContain('无运行中的任务');
  });
});
