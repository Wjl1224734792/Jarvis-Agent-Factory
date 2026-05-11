import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

// ============================================================
// TASK-001 — X6FlowChart dagre 水平布局修复
// RED 阶段：测试先于实现
// ============================================================

// ------------------------------------------------------------------
// Mock @antv/x6 及其插件，避免 jsdom 中 Graph 构造函数报错
// ------------------------------------------------------------------
const mockNode = (id: string, data: Record<string, unknown> = {}) => ({
  id,
  isNode: () => true,
  isEdge: () => false,
  getData: () => data,
  setAttrs: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  remove: vi.fn(),
});

vi.mock('@antv/x6', () => {
  const actualCreate = vi.fn();
  const Graph = vi.fn().mockImplementation(() => ({
    use: vi.fn(),
    dispose: vi.fn(),
    clearCells: vi.fn(),
    addNode: vi.fn().mockImplementation((opts: { id: string; data?: Record<string, unknown> }) =>
      mockNode(opts.id, opts.data),
    ),
    addEdge: vi.fn().mockImplementation((opts: { id: string }) => ({
      id: opts.id,
      isNode: () => false,
      isEdge: () => true,
      getData: () => ({}),
      setAttrs: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      remove: vi.fn(),
    })),
    getNodes: vi.fn().mockReturnValue([]),
    getEdges: vi.fn().mockReturnValue([]),
    zoomToFit: vi.fn(),
    zoom: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getCellById: vi.fn(),
    resize: vi.fn(),
    centerContent: vi.fn(),
    once: vi.fn(),
  }));
  return {
    Graph: Graph as unknown as typeof import('@antv/x6').Graph,
    __mockCreate: actualCreate,
  };
});

vi.mock('@antv/x6-plugin-selection', () => ({
  Selection: vi.fn(),
}));

vi.mock('@antv/x6-plugin-snapline', () => ({
  Snapline: vi.fn(),
}));

// ------------------------------------------------------------------
// 导入被测函数
// ------------------------------------------------------------------
import { computeLayout, GATE_SEQUENCE, GATE_EDGES } from '../X6FlowChart';
import X6FlowChart from '../X6FlowChart';

// ============================================================
// 纯函数测试：computeLayout (dagre LR)
// ============================================================
describe('computeLayout — dagre 水平布局 (LR)', () => {
  let positions: Record<string, { x: number; y: number }>;

  beforeEach(() => {
    // 仅 Gate 节点，无 Agent 子节点
    positions = computeLayout([...GATE_SEQUENCE], [...GATE_EDGES], [], []);
  });

  it('测试1: 所有 12 个 Gate 节点的坐标全部唯一（无重复）', () => {
    const keys = Object.keys(positions);
    expect(keys).toHaveLength(12);

    const coordSet = new Set(keys.map(k => `${positions[k].x},${positions[k].y}`));
    // 每个坐标应该是唯一的——不应该有多个节点堆叠在同一位置
    expect(coordSet.size).toBe(12);
  });

  it('测试2: Gate 节点 x 坐标严格递增（从左到右）', () => {
    const xs = GATE_SEQUENCE.map(id => positions[id].x);
    for (let i = 1; i < xs.length; i++) {
      expect(
        xs[i],
        `Gate "${GATE_SEQUENCE[i]}" x=${xs[i]} 应大于 Gate "${GATE_SEQUENCE[i - 1]}" x=${xs[i - 1]}`,
      ).toBeGreaterThan(xs[i - 1]);
    }
  });

  it('测试3: 相邻节点水平间距 >= NODE_SIZES.nodesep (60px)', () => {
    for (let i = 1; i < GATE_SEQUENCE.length; i++) {
      const prev = positions[GATE_SEQUENCE[i - 1]];
      const curr = positions[GATE_SEQUENCE[i]];
      const gap = curr.x - prev.x;
      expect(
        gap,
        `Gate "${GATE_SEQUENCE[i - 1]}"→"${GATE_SEQUENCE[i]}" 间距 ${gap}px 应 >= 60px`,
      ).toBeGreaterThanOrEqual(60);
    }
  });
});

// ============================================================
// 组件测试：容器 minHeight
// ============================================================
describe('X6FlowChart 容器高度', () => {
  it('测试4: 容器 div 的 minHeight >= 240px', () => {
    render(
      <X6FlowChart
        runId="test-run-001"
        agentStatus={null}
        pipelineGates={[]}
        selectedGate={null}
        onGateSelect={vi.fn()}
      />,
    );

    // 容器 div 带有 ref={containerRef}，通过查找具有 background 和 overflow hidden 的外层 div 下的子 div
    const wrapperDiv = document.querySelector('div[style*="overflow: hidden"]');
    expect(wrapperDiv, '应存在带 overflow:hidden 的外层 wrapper').not.toBeNull();

    const containerDiv = wrapperDiv!.querySelector('div');
    expect(containerDiv, 'wrapper 下应存在容器 div').not.toBeNull();

    // React 通过 CSSStyleDeclaration API 设置样式，应直接从 style 属性读取
    const minHeight = containerDiv!.style.minHeight;
    expect(minHeight, `容器 minHeight 应为 240px 或更高，实际为 ${minHeight}`).toBeTruthy();
    const minHeightValue = parseInt(minHeight, 10);
    expect(minHeightValue, `minHeight=${minHeightValue} 应 >= 240`).toBeGreaterThanOrEqual(240);
  });
});
