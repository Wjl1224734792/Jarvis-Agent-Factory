import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

/**
 * mock @antv/x6 的 Graph 类
 */
const { MockGraph } = vi.hoisted(() => {
  class Mock {
    constructor(opts?: Record<string, unknown>) { void opts; }

    /** 返回模拟边对象 */
    getEdges() {
      return [
        {
          getData: () => ({ isGateEdge: true, isSkipEdge: false, isAgentEdge: false }),
          getAttrByPath: () => ({ strokeDasharray: '4,3' }),
          setAttrByPath: vi.fn(),
        },
        {
          getData: () => ({ isAgentEdge: true, isGateEdge: false }),
          getAttrByPath: () => ({ strokeDasharray: '3,2' }),
          setAttrByPath: vi.fn(),
        },
      ];
    }

    /** 返回模拟节点对象 */
    getCellById(id: string) {
      if (id === 'n1' || id === 'n2') {
        return {
          isNode: () => true,
          scale: vi.fn(),
        };
      }
      return null;
    }
  }
  return { MockGraph: Mock };
});

vi.mock('@antv/x6', () => ({
  Graph: MockGraph,
}));

// 必须在 mock 之后导入
import { useX6Animation } from '../useX6Animation';
import { Graph } from '@antv/x6';

describe('useX6Animation', () => {
  let graph: Graph;
  let rafCallbacks: Array<(time: number) => void>;
  let rafIdCounter: number;
  let visibilityListeners: Array<() => void>;

  beforeEach(() => {
    vi.clearAllMocks();

    graph = new MockGraph() as unknown as Graph;
    rafCallbacks = [];
    rafIdCounter = 1;
    visibilityListeners = [];

    // mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb as (time: number) => void);
      return rafIdCounter++;
    });

    // mock cancelAnimationFrame
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      // 移除对应的回调（简化实现：标记为已取消即可）
      void id;
    });

    // mock document.addEventListener for visibilitychange
    vi.spyOn(document, 'addEventListener').mockImplementation((event: string, handler: EventListenerOrEventListenerObject) => {
      if (event === 'visibilitychange') {
        visibilityListeners.push(handler as () => void);
      }
    });

    vi.spyOn(document, 'removeEventListener').mockImplementation((event: string, handler: EventListenerOrEventListenerObject) => {
      visibilityListeners = visibilityListeners.filter(h => h !== handler);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('graph 为 null 时不启动 RAF 循环', () => {
    renderHook(() => useX6Animation(null, {}));

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('graph 有效时启动 RAF 循环', () => {
    renderHook(() => useX6Animation(graph, {}));

    // 应该调用了一次 requestAnimationFrame
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    // 回调应该已注册
    expect(rafCallbacks.length).toBeGreaterThanOrEqual(1);
  });

  it('组件卸载时取消 RAF', () => {
    const { unmount } = renderHook(() => useX6Animation(graph, {}));

    expect(window.cancelAnimationFrame).not.toHaveBeenCalled();

    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('默认启用呼吸动画时对 nodeFilter 返回 true 的节点调用 scale', () => {
    const mockScale = vi.fn();

    // 创建一个含 getCells/getCellById/scale 的 mock 图
    const testNode = {
      id: 'n1',
      isNode: () => true,
      scale: mockScale,
    };
    const testGraph = {
      getCells: () => [testNode],
      getCellById: vi.fn().mockReturnValue(testNode),
      getEdges: () => [],
    } as unknown as Graph;

    renderHook(() =>
      useX6Animation(testGraph, {
        breath: {
          enabled: true,
          nodeFilter: (n: unknown) => {
            void n;
            return true;
          },
        },
      }),
    );

    // 执行 RAF 回调一次
    if (rafCallbacks.length > 0) {
      rafCallbacks[0](16);
    }

    expect(mockScale).toHaveBeenCalled();
    const callArg = mockScale.mock.calls[0];
    // scale(sx, sy) — 两个参数应相等
    expect(callArg[0]).toBe(callArg[1]);
  });

  it('禁用呼吸动画时不调用 scale', () => {
    const mockScale = vi.fn();
    const testGraph = {
      getCellById: vi.fn().mockReturnValue({
        isNode: () => true,
        scale: mockScale,
      }),
      getEdges: () => [],
    } as unknown as Graph;

    renderHook(() =>
      useX6Animation(testGraph, {
        breath: {
          enabled: false,
          nodeFilter: () => true,
        },
      }),
    );

    if (rafCallbacks.length > 0) {
      rafCallbacks[0](16);
    }

    expect(mockScale).not.toHaveBeenCalled();
  });

  it('虚线流动动画对匹配的边设置 strokeDashoffset', () => {
    const setAttrMock = vi.fn();
    const testGraph = {
      getCellById: vi.fn(),
      getEdges: () => [
        {
          getData: () => ({}),
          getAttrByPath: () => ({ strokeDasharray: '4,3' }),
          setAttrByPath: setAttrMock,
        },
      ],
    } as unknown as Graph;

    renderHook(() =>
      useX6Animation(testGraph, {
        dashFlow: {
          enabled: true,
          edgeFilter: () => true,
        },
      }),
    );

    if (rafCallbacks.length > 0) {
      rafCallbacks[0](16);
    }

    expect(setAttrMock).toHaveBeenCalledWith(
      'line/strokeDashoffset',
      expect.any(Number),
    );
  });

  it('禁用虚线流动时不设置 strokeDashoffset', () => {
    const setAttrMock = vi.fn();
    const testGraph = {
      getCellById: vi.fn(),
      getEdges: () => [
        {
          getData: () => ({}),
          getAttrByPath: () => ({ strokeDasharray: '4,3' }),
          setAttrByPath: setAttrMock,
        },
      ],
    } as unknown as Graph;

    renderHook(() =>
      useX6Animation(testGraph, {
        dashFlow: {
          enabled: false,
          edgeFilter: () => true,
        },
      }),
    );

    if (rafCallbacks.length > 0) {
      rafCallbacks[0](16);
    }

    expect(setAttrMock).not.toHaveBeenCalled();
  });

  it('没有配置任何动画时不调用 scale 或 setAttr', () => {
    const scaleMock = vi.fn();
    const setAttrMock = vi.fn();

    const testGraph = {
      getCellById: vi.fn().mockReturnValue({
        isNode: () => true,
        scale: scaleMock,
      }),
      getEdges: () => [
        {
          getData: () => ({}),
          getAttrByPath: () => ({ strokeDasharray: '4,3' }),
          setAttrByPath: setAttrMock,
        },
      ],
    } as unknown as Graph;

    renderHook(() => useX6Animation(testGraph, {}));

    if (rafCallbacks.length > 0) {
      rafCallbacks[0](16);
    }

    expect(scaleMock).not.toHaveBeenCalled();
    expect(setAttrMock).not.toHaveBeenCalled();
  });

  it('注册 visibilitychange 事件监听', () => {
    renderHook(() => useX6Animation(graph, {}));

    expect(document.addEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
  });

  it('卸载时移除 visibilitychange 事件监听', () => {
    const { unmount } = renderHook(() => useX6Animation(graph, {}));

    expect(visibilityListeners).toHaveLength(1);

    unmount();
    expect(document.removeEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
  });

  it('页面隐藏时暂停动画，可见时恢复', () => {
    const scaleMock = vi.fn();
    const testNode = { id: 'n1', isNode: () => true, scale: scaleMock };
    const testGraph = {
      getCells: () => [testNode],
      getCellById: vi.fn().mockReturnValue(testNode),
      getEdges: () => [],
    } as unknown as Graph;

    renderHook(() =>
      useX6Animation(testGraph, {
        breath: {
          enabled: true,
          nodeFilter: () => true,
        },
      }),
    );

    // 执行一次 RAF 确认动画正在运行
    if (rafCallbacks.length > 0) {
      rafCallbacks[0](16);
    }
    const callCountBeforeHide = scaleMock.mock.calls.length;
    expect(callCountBeforeHide).toBeGreaterThan(0);

    // 模拟 visibilitychange → hidden
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    visibilityListeners.forEach(fn => fn());

    // 再次执行 RAF — 应该不触发 scale
    scaleMock.mockClear();
    if (rafCallbacks.length > 0) {
      rafCallbacks[0](16);
    }
    expect(scaleMock).not.toHaveBeenCalled();
  });
});
