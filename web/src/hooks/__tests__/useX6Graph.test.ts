import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

/**
 * mock @antv/x6 的 Graph 类 —— 必须是可 new 的构造函数
 *
 * 使用 vi.hoisted 确保在 vi.mock 工厂提升时变量已可用。
 */
const { MockGraph, mockDispose, mockUse } = vi.hoisted(() => {
  const dispose = vi.fn();
  const use = vi.fn();

  class Mock {
    static instances: Mock[] = [];

    constructor(opts: Record<string, unknown>) {
      Mock.instances.push(this);
      this.opts = opts;
    }

    opts: Record<string, unknown>;
    dispose = dispose;
    use = use;
  }

  return { MockGraph: Mock, mockDispose: dispose, mockUse: use };
});

vi.mock('@antv/x6', () => ({
  Graph: MockGraph,
}));

import { useX6Graph } from '../useX6Graph';
import { Graph } from '@antv/x6';

describe('useX6Graph', () => {
  let containerEl: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    MockGraph.instances = [];
    containerEl = document.createElement('div');
    // 模拟非零尺寸
    Object.defineProperty(containerEl, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(containerEl, 'clientHeight', { value: 600, configurable: true });
  });

  afterEach(() => {
    containerEl.remove();
  });

  it('containerRef 为 null 时不创建 Graph', () => {
    const ref = { current: null };
    const { result } = renderHook(() =>
      useX6Graph(ref as React.RefObject<HTMLDivElement | null>, {
        width: 800,
        height: 600,
      }),
    );

    expect(MockGraph.instances).toHaveLength(0);
    expect(result.current).toBeNull();
  });

  it('width 为 0 时不创建 Graph', () => {
    const ref = { current: containerEl };
    const { result } = renderHook(() =>
      useX6Graph(ref as React.RefObject<HTMLDivElement | null>, {
        width: 0,
        height: 600,
      }),
    );

    expect(MockGraph.instances).toHaveLength(0);
    expect(result.current).toBeNull();
  });

  it('height 为 0 时不创建 Graph', () => {
    const ref = { current: containerEl };
    const { result } = renderHook(() =>
      useX6Graph(ref as React.RefObject<HTMLDivElement | null>, {
        width: 800,
        height: 0,
      }),
    );

    expect(MockGraph.instances).toHaveLength(0);
    expect(result.current).toBeNull();
  });

  it('容器就绪且尺寸有效时创建 Graph', async () => {
    const ref = { current: containerEl };
    const { result } = renderHook(() =>
      useX6Graph(ref as React.RefObject<HTMLDivElement | null>, {
        width: 800,
        height: 600,
      }),
    );

    await waitFor(() => {
      expect(MockGraph.instances).toHaveLength(1);
      expect(result.current).not.toBeNull();
    });
  });

  it('传递正确的 Graph 配置项', async () => {
    const ref = { current: containerEl };
    renderHook(() =>
      useX6Graph(ref as React.RefObject<HTMLDivElement | null>, {
        width: 1024,
        height: 768,
        background: { color: '#FFF' },
        interacting: { nodeMovable: false, edgeMovable: false },
        mousewheel: {
          enabled: true,
          modifiers: 'ctrl',
          minScale: 0.5,
          maxScale: 2,
          zoomAtMousePosition: true,
        },
        autoResize: false,
      }),
    );

    await waitFor(() => {
      expect(MockGraph.instances).toHaveLength(1);
    });

    const instance = MockGraph.instances[0];
    expect(instance.opts).toMatchObject({
      container: containerEl,
      width: 1024,
      height: 768,
      background: { color: '#FFF' },
      interacting: { nodeMovable: false, edgeMovable: false },
      autoResize: false,
    });
  });

  it('传递插件数组时依次调用 graph.use', async () => {
    const ref = { current: containerEl };
    const fakePlugin1 = {};
    const fakePlugin2 = {};
    renderHook(() =>
      useX6Graph(ref as React.RefObject<HTMLDivElement | null>, {
        width: 800,
        height: 600,
        plugins: [fakePlugin1, fakePlugin2],
      }),
    );

    await waitFor(() => {
      expect(mockUse).toHaveBeenCalledTimes(2);
    });
    expect(mockUse).toHaveBeenCalledWith(fakePlugin1);
    expect(mockUse).toHaveBeenCalledWith(fakePlugin2);
  });

  it('卸载时调用 graph.dispose', async () => {
    const ref = { current: containerEl };
    const { unmount } = renderHook(() =>
      useX6Graph(ref as React.RefObject<HTMLDivElement | null>, {
        width: 800,
        height: 600,
      }),
    );

    await waitFor(() => {
      expect(MockGraph.instances).toHaveLength(1);
    });

    expect(mockDispose).not.toHaveBeenCalled();
    unmount();
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });

  it('容器引用不变时不重复创建 Graph', async () => {
    const ref = { current: containerEl };
    const { rerender } = renderHook(() =>
      useX6Graph(ref as React.RefObject<HTMLDivElement | null>, {
        width: 800,
        height: 600,
      }),
    );

    await waitFor(() => {
      expect(MockGraph.instances).toHaveLength(1);
    });

    rerender();
    // 确认只有一次构造调用
    expect(MockGraph.instances).toHaveLength(1);
  });
});
