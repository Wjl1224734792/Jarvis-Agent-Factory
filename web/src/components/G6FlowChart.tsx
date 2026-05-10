import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { theme, Tooltip as AntTooltip } from 'antd';
import { Graph } from '@antv/g6';
import type { AgentStatusResponse } from '../api';

// ============================================================
// Gate 节点定义 — 10 个 Gate，dagre 布局从上到下
// ============================================================

/** Gate 序列定义 */
const GATE_SEQUENCE = [
  'Gate A', 'Gate B', 'Gate B1', 'Gate C', 'Gate C-impl',
  'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D', 'Gate E',
] as const;

/** Gate ID → 中文标签 */
const GATE_LABELS: Record<string, string> = {
  'Gate A': '需求澄清',
  'Gate B': '任务分解',
  'Gate B1': '架构评审',
  'Gate C': '执行规划',
  'Gate C-impl': '并行实现',
  'Gate C1': '代码质量',
  'Gate C1.5': '视觉验证',
  'Gate C2': '测试验证',
  'Gate D': '审查签核',
  'Gate E': '发布上线',
};

/** Gate 功能说明（Tooltip 展示） */
const GATE_DESCRIPTIONS: Record<string, string> = {
  'Gate A': '至少1个需求文档，含REQ-XXX编号',
  'Gate B': '每个TASK-XXX映射至少1个REQ-XXX',
  'Gate B1': '架构评审通过（涉及架构变更时）',
  'Gate C': '计划文档含parallel_batches+Execution Packet',
  'Gate C-impl': '所有Batch实现完成，实现Agent已返回结果',
  'Gate C1': 'Lint+Type-check+Build+Deps Audit全部通过',
  'Gate C1.5': '页面/组件视觉验证截图证据已附',
  'Gate C2': '测试全部通过，API契约验证通过',
  'Gate D': '领域审查+安全审计+性能审计通过',
  'Gate E': '安全审计+上线检查清单+回滚预案就绪',
};

/** 边：从上游 Gate 指向下游 Gate */
const GATE_EDGES: [string, string][] = [
  ['Gate A', 'Gate B'],
  ['Gate B', 'Gate B1'],
  ['Gate B1', 'Gate C'],
  ['Gate C', 'Gate C-impl'],
  ['Gate C-impl', 'Gate C1'],
  ['Gate C1', 'Gate C1.5'],
  ['Gate C1.5', 'Gate C2'],
  ['Gate C2', 'Gate D'],
  ['Gate D', 'Gate E'],
];

// ============================================================
// 类型定义
// ============================================================

interface G6FlowChartProps {
  /** 当前运行 ID，为 null 时不渲染 */
  runId: string | null;
  /** Agent 状态数据（来自 useAgentData hook） */
  agentStatus: AgentStatusResponse | null;
  /** Pipeline 的 Gate 状态，从 Dashboard 传入 */
  pipelineGates?: { gate: string; passed: boolean }[];
}

// ============================================================
// 响应式高度
// ============================================================

function getResponsiveHeight(width: number): number {
  if (width >= 992) return 400;
  if (width >= 768) return 300;
  return 250;
}

// ============================================================
// G6FlowChart 组件
// ============================================================

/**
 * 10-Gate 实时流程可视化组件。
 * 使用 @antv/g6 v5 的 Graph API + DagreLayout，渲染从上到下的 DAG 图。
 */
export default function G6FlowChart({ runId, agentStatus, pipelineGates }: G6FlowChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const { token } = theme.useToken();
  const [containerWidth, setContainerWidth] = useState(0);

  // 构建 gate 状态映射：gateId → passed
  const gateStatusMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (pipelineGates) {
      pipelineGates.forEach(g => map.set(g.gate, g.passed));
    }
    return map;
  }, [pipelineGates]);

  // 构建 agent 分类映射
  const agentMap = useMemo(() => {
    if (!agentStatus) return { active: new Set<string>(), completed: new Set<string>(), failed: new Set<string>() };
    return {
      active: new Set(agentStatus.active),
      completed: new Set(agentStatus.completed),
      failed: new Set(agentStatus.failed),
    };
  }, [agentStatus]);

  // 确定"当前"gate —— 第一个未通过的 gate
  const currentGate = useMemo(() => {
    for (const gateId of GATE_SEQUENCE) {
      if (gateStatusMap.get(gateId) !== true) return gateId;
    }
    return null; // 全部通过
  }, [gateStatusMap]);

  // 计算每个 gate 的状态
  const getGateState = useCallback((gateId: string): 'passed' | 'current' | 'future' => {
    if (gateStatusMap.get(gateId) === true) return 'passed';
    if (gateId === currentGate) return 'current';
    return 'future';
  }, [gateStatusMap, currentGate]);

  // resize 防抖：300ms
  useEffect(() => {
    if (!containerRef.current) return;
    let debounceTimer: ReturnType<typeof setTimeout>;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => setContainerWidth(w), 300);
      }
    });

    observer.observe(containerRef.current);
    // 初始测量
    setContainerWidth(containerRef.current.clientWidth);

    return () => {
      observer.disconnect();
      clearTimeout(debounceTimer);
    };
  }, []);

  // 初始化 G6 Graph
  useEffect(() => {
    if (!containerRef.current || !runId || containerWidth === 0) return;

    const height = getResponsiveHeight(containerWidth);
    const graph = new Graph({
      container: containerRef.current,
      width: containerWidth,
      height,
      autoFit: 'view',
      padding: 20,
      layout: {
        type: 'dagre',
        rankdir: 'TB',
        nodesep: 40,
        ranksep: 30,
      },
      node: {
        type: 'rect',
        style: {
          size: [140, 52],
          radius: 8,
          labelText: '',
          labelFontSize: 11,
          labelFontWeight: 600,
          labelPlacement: 'center',
          labelLineHeight: 16,
        },
      },
      edge: {
        type: 'line',
        style: {
          endArrow: true,
          endArrowSize: 8,
          lineWidth: 2,
          stroke: token.colorBorderSecondary,
        },
      },
      behaviors: [
        { type: 'zoom-canvas', enable: true },
        { type: 'drag-canvas', enable: true },
      ],
    });

    // 构建节点 + 边数据
    const nodes = GATE_SEQUENCE.map(gateId => ({
      id: gateId,
      style: {
        labelText: `${gateId}\n${GATE_LABELS[gateId] || gateId}`,
      },
    }));

    const edges = GATE_EDGES.map(([source, target]) => ({
      id: `${source}->${target}`,
      source,
      target,
    }));

    graph.setData({ nodes, edges });
    graph.render();
    graphRef.current = graph;

    return () => {
      graph.destroy();
      graphRef.current = null;
    };
  }, [runId, containerWidth]);

  // 更新节点样式（状态变化时）
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const nodeUpdates = GATE_SEQUENCE.map(gateId => {
      const state = getGateState(gateId);
      let fillColor: string;
      let strokeColor: string;
      let strokeDash: number | undefined;
      let labelFill: string;

      switch (state) {
        case 'passed':
          fillColor = token.colorSuccessBg;
          strokeColor = token.colorSuccess;
          labelFill = token.colorSuccess;
          break;
        case 'current':
          fillColor = token.colorPrimaryBg;
          strokeColor = token.colorPrimary;
          labelFill = token.colorPrimary;
          break;
        default:
          fillColor = token.colorFillQuaternary;
          strokeColor = token.colorBorderSecondary;
          strokeDash = 4;
          labelFill = token.colorTextSecondary;
          break;
      }

      return {
        id: gateId,
        style: {
          fill: fillColor,
          stroke: strokeColor,
          lineDash: strokeDash,
          labelText: `${gateId}\n${GATE_LABELS[gateId] || gateId}`,
          labelFill,
        },
      };
    });

    graph.updateNodeData(nodeUpdates);

    // 更新边样式
    const edgeUpdates = GATE_EDGES.map(([source, target]) => {
      const sourcePassed = getGateState(source) === 'passed';
      return {
        id: `${source}->${target}`,
        style: {
          stroke: sourcePassed ? token.colorSuccess : token.colorBorderSecondary,
          lineDash: sourcePassed ? undefined : [6, 3],
          lineWidth: sourcePassed ? 2.5 : 1.5,
        },
      };
    });

    graph.updateEdgeData(edgeUpdates);
    graph.render();
  }, [gateStatusMap, currentGate, getGateState, token]);

  // 更新 Agent 子状态标注
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !agentStatus) return;

    const badgeUpdates = GATE_SEQUENCE.map(gateId => {
      const state = getGateState(gateId);
      let badgeText = '';
      let badgeFill = '';

      if (state === 'passed') {
        badgeText = 'done';
        badgeFill = token.colorSuccess;
      } else if (state === 'current' && agentStatus.active.length > 0) {
        badgeText = `${agentStatus.active.length} active`;
        badgeFill = token.colorPrimary;
      }

      return {
        id: gateId,
        style: {
          badges: badgeText
            ? [{ text: badgeText, placement: 'right-top' as const, fill: badgeFill }]
            : [],
        },
      };
    });

    graph.updateNodeData(badgeUpdates);
    graph.render();
  }, [agentStatus, getGateState, token]);

  // 点击节点交互
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const handleClick = (e: { targetType?: string; target?: { id?: string } }) => {
      if (e.targetType === 'node') {
        const nodeId = e.target?.id;
        if (nodeId && GATE_LABELS[nodeId]) {
          // 点击节点的处理逻辑（扩展点，当前无额外操作）
        }
      }
    };

    graph.on('node:click', handleClick as never);
    return () => {
      graph.off('node:click', handleClick as never);
    };
  }, []);

  if (!runId) {
    return (
      <div style={{
        height: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: token.colorTextSecondary,
        fontSize: 13,
      }}>
        无运行中的任务
      </div>
    );
  }

  return (
    <AntTooltip
      title={currentGate ? `${currentGate}: ${GATE_DESCRIPTIONS[currentGate]}` : '所有 Gate 已通过'}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      />
    </AntTooltip>
  );
}

export { GATE_SEQUENCE, GATE_LABELS, GATE_DESCRIPTIONS };
