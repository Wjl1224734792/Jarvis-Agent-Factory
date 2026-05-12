import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

// ============================================================
// TASK-002 — X6AgentGraph 力导向环形网状拓扑修复
// RED 阶段：测试先于实现
// ============================================================

// ------------------------------------------------------------------
// Mock @antv/x6 — 收集 addNode 调用的 ID 列表用于组件级断言
// ------------------------------------------------------------------
const addedNodeIds: string[] = [];

function makeNode(id: string, data: Record<string, unknown> = {}) {
  return {
    id,
    isNode: () => true,
    isEdge: () => false,
    getData: () => data,
    setAttrs: vi.fn(),
    scale: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    getAttrByPath: vi.fn().mockReturnValue(null),
    setAttrByPath: vi.fn(),
  };
}

function addNode(id: string) {
  addedNodeIds.push(id);
  return makeNode(id);
}

vi.mock('@antv/x6', () => {
  // 必须使用 function 声明而非箭头函数，确保 Graph 可作为构造函数 (new Graph)
  function Graph() {
    return {
      use: vi.fn(),
      dispose: vi.fn(),
      clearCells: vi.fn(),
      addNode: vi.fn().mockImplementation(
        (opts: { id: string; data?: Record<string, unknown> }) => addNode(opts.id),
      ),
      addEdge: vi.fn().mockImplementation(
        (opts: { id: string }) => ({
          id: opts.id,
          isNode: () => false,
          isEdge: () => true,
          getData: () => ({}),
          getAttrByPath: vi.fn().mockReturnValue(null),
          setAttrByPath: vi.fn(),
          setAttrs: vi.fn(),
          on: vi.fn(),
          off: vi.fn(),
          remove: vi.fn(),
        }),
      ),
      getNodes: vi.fn().mockReturnValue([]),
      getEdges: vi.fn().mockReturnValue([]),
      getCells: vi.fn().mockReturnValue([]),
      zoomToFit: vi.fn(),
      zoom: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getCellById: vi.fn(),
      resize: vi.fn(),
      centerContent: vi.fn(),
    };
  }
  return {
    Graph: Graph as unknown as typeof import('@antv/x6').Graph,
  };
});

vi.mock('@antv/x6-plugin-selection', () => ({ Selection: vi.fn() }));
vi.mock('@antv/x6-plugin-snapline', () => ({ Snapline: vi.fn() }));

// ------------------------------------------------------------------
// 导入被测函数
// ------------------------------------------------------------------
import {
  forceLayout,
  circularLayout,
  getLayoutForGate,
  ORCHESTRATOR as ORCH_ID,
} from '../X6AgentGraph';

const CX = 400;
const CY = 300;

// ============================================================
// 纯函数测试：力导向布局
// ============================================================
describe('forceLayout — 力导向环形网状拓扑', () => {
  beforeEach(() => {
    addedNodeIds.length = 0;
  });

  /** 计算两点间欧氏距离 */
  function dist(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  it('测试1: 编排者节点坐标在画布中心 ±10px', () => {
    const nodes = ['agent-1', 'agent-2', 'agent-3'];
    const positions = forceLayout(nodes, CX, CY);

    expect(positions[ORCH_ID]).toBeDefined();
    expect(positions[ORCH_ID].x).toBeCloseTo(CX, -1); // 精度到 10px
    expect(positions[ORCH_ID].y).toBeCloseTo(CY, -1);
  });

  it('测试3: Agent 节点坐标全部唯一（无重叠）', () => {
    const nodes = ['a1', 'a2', 'a3', 'a4', 'a5'];
    const positions = forceLayout(nodes, CX, CY);

    const coordSet = new Set(
      nodes.map(id => `${positions[id].x.toFixed(2)},${positions[id].y.toFixed(2)}`),
    );
    expect(coordSet.size).toBe(nodes.length);
  });

  it('测试4: Agent 节点最小间距 >= 30px（收敛或回退到环形）', () => {
    const nodes = ['a1', 'a2', 'a3', 'a4'];
    const positions = forceLayout(nodes, CX, CY);

    let minDist = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = dist(positions[nodes[i]], positions[nodes[j]]);
        if (d < minDist) minDist = d;
      }
    }
    expect(minDist, `最小间距 ${minDist.toFixed(1)}px 应 >= 30px`).toBeGreaterThanOrEqual(30);
  });

  it('力导向收敛失败时回退到环形布局', () => {
    const manyNodes = Array.from({ length: 20 }, (_, i) => `agent-${i}`);
    const positions = forceLayout(manyNodes, CX, CY);

    let minDist = Infinity;
    for (let i = 0; i < manyNodes.length; i++) {
      for (let j = i + 1; j < manyNodes.length; j++) {
        const d = dist(positions[manyNodes[i]], positions[manyNodes[j]]);
        if (d < minDist) minDist = d;
      }
    }
    expect(minDist).toBeGreaterThanOrEqual(30);
  });
});

// ============================================================
// 纯函数测试：环形布局
// ============================================================
describe('circularLayout', () => {
  it('编排者固定在中心', () => {
    const positions = circularLayout(['a', 'b', 'c'], CX, CY);
    expect(positions[ORCH_ID].x).toBe(CX);
    expect(positions[ORCH_ID].y).toBe(CY);
  });

  it('Agent 节点均匀分布在圆周上', () => {
    const nodes = ['a', 'b', 'c', 'd'];
    const positions = circularLayout(nodes, CX, CY);

    const distances = nodes.map(id => {
      const dx = positions[id].x - CX;
      const dy = positions[id].y - CY;
      return Math.sqrt(dx * dx + dy * dy);
    });
    const avgDist = distances.reduce((s, d) => s + d, 0) / distances.length;
    for (const d of distances) {
      expect(d).toBeCloseTo(avgDist, 0);
    }
  });
});

// ============================================================
// 布局选择
// ============================================================
describe('getLayoutForGate', () => {
  it('Gate C-impl 使用力导向布局', () => {
    const agents = ['agent-a', 'agent-b'];
    const positions = getLayoutForGate('Gate C-impl', agents, CX, CY);
    expect(positions[ORCH_ID]).toBeDefined();
    expect(positions['agent-a']).toBeDefined();
    expect(positions['agent-b']).toBeDefined();
  });

  it('Gate A 使用环形布局', () => {
    const agents = ['agent-a'];
    const positions = getLayoutForGate('Gate A', agents, CX, CY);
    expect(positions[ORCH_ID]).toBeDefined();
    expect(positions['agent-a']).toBeDefined();
  });

  it('未知 Gate 回退到环形布局', () => {
    const agents = ['agent-x'];
    const positions = getLayoutForGate('Unknown Gate', agents, CX, CY);
    expect(positions[ORCH_ID]).toBeDefined();
    expect(positions['agent-x']).toBeDefined();
  });
});

// ============================================================
// 组件测试：有 Agent 数据时渲染实际节点
// ============================================================
describe('X6AgentGraph 组件 — 有数据时渲染实际节点', () => {
  beforeEach(() => {
    addedNodeIds.length = 0;
  });

  it('测试2: 有 Agent 数据时渲染实际节点（而非占位文本）', async () => {
    const { default: X6AgentGraph } = await import('../X6AgentGraph');

    const mockGateStatus = {
      run_id: 'test-run-001',
      current_gate: 'Gate C-impl',
      gates: {
        'Gate C-impl': {
          active: ['agent-test'],
          completed: [],
          failed: [],
          agents: [
            { agent_id: 'agent-test', status: 'active', model: 'test-model' },
          ],
        },
      },
    };

    render(
      <X6AgentGraph
        selectedGate="Gate C-impl"
        gateStatus={mockGateStatus as any}
      />,
    );

    expect(addedNodeIds).toContain(ORCH_ID);
    expect(addedNodeIds).toContain('agent-test');
    expect(addedNodeIds).not.toContain('placeholder');
  });
});
