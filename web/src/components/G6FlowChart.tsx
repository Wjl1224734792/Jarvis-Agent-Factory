import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { theme } from 'antd';
import { Graph } from '@antv/g6';
import type { AgentStatusResponse } from '../api';

// ============================================================
// Gate 定义
// ============================================================

const GATE_SEQUENCE = [
  'Gate A', 'Gate B', 'Gate B1', 'Gate C', 'Gate C-impl',
  'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D', 'Gate E',
] as const;

const GATE_LABELS: Record<string, string> = {
  'Gate A': '需求澄清', 'Gate B': '任务分解', 'Gate B1': '架构评审',
  'Gate C': '执行规划', 'Gate C-impl': '并行实现', 'Gate C1': '代码质量',
  'Gate C1.5': '视觉验证', 'Gate C2': '测试验证', 'Gate D': '审查签核', 'Gate E': '发布上线',
};

const GATE_EDGES: [string, string][] = [
  ['Gate A', 'Gate B'], ['Gate B', 'Gate B1'], ['Gate B1', 'Gate C'],
  ['Gate C', 'Gate C-impl'], ['Gate C-impl', 'Gate C1'], ['Gate C1', 'Gate C1.5'],
  ['Gate C1.5', 'Gate C2'], ['Gate C2', 'Gate D'], ['Gate D', 'Gate E'],
];

// ============================================================
// 类型
// ============================================================

interface G6FlowChartProps {
  runId: string | null;
  agentStatus: AgentStatusResponse | null;
  pipelineGates?: { gate: string; passed: boolean }[];
}

// ============================================================
// 组件
// ============================================================

export default function G6FlowChart({ runId, agentStatus, pipelineGates }: G6FlowChartProps) {
  const { token } = theme.useToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const destroyedRef = useRef(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const prevAgentIds = useRef<Set<string>>(new Set());

  // Gate 状态
  const gateStatusMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (pipelineGates) pipelineGates.forEach(g => map.set(g.gate, g.passed));
    return map;
  }, [pipelineGates]);

  const currentGate = useMemo(() => {
    for (const g of GATE_SEQUENCE) { if (gateStatusMap.get(g) !== true) return g; }
    return null;
  }, [gateStatusMap]);

  const getGateState = useCallback((gateId: string): 'passed' | 'current' | 'future' => {
    if (gateStatusMap.get(gateId) === true) return 'passed';
    if (gateId === currentGate) return 'current';
    return 'future';
  }, [gateStatusMap, currentGate]);

  // Agent 数据
  const hasAgentData = useMemo(() => {
    if (!agentStatus) return false;
    return agentStatus.active.length > 0 || agentStatus.completed.length > 0 || agentStatus.failed.length > 0;
  }, [agentStatus]);

  // 合并所有 agent 信息
  const allAgents = useMemo(() => {
    if (!agentStatus) return [];
    const result: { id: string; status: 'active' | 'completed' | 'failed' }[] = [];
    agentStatus.active.forEach(id => result.push({ id, status: 'active' as const }));
    agentStatus.completed.forEach(id => result.push({ id, status: 'completed' as const }));
    agentStatus.failed.forEach(id => result.push({ id, status: 'failed' as const }));
    return result;
  }, [agentStatus]);

  // 检测新 agent（用于动画触发）
  const newAgentIds = useMemo(() => {
    const currentIds = new Set(allAgents.map(a => a.id));
    const prev = prevAgentIds.current;
    const newIds = new Set<string>();
    currentIds.forEach(id => { if (!prev.has(id)) newIds.add(id); });
    prevAgentIds.current = currentIds;
    return newIds;
  }, [allAgents]);

  // ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    let debounceTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => setContainerWidth(entry.contentRect.width), 300);
      }
    });
    observer.observe(containerRef.current);
    setContainerWidth(containerRef.current.clientWidth);
    return () => { observer.disconnect(); clearTimeout(debounceTimer); };
  }, []);

  // ============================================================
  // 初始化 / 重建 G6 Graph
  // ============================================================
  useEffect(() => {
    if (!containerRef.current || !runId) return;
    const w = containerWidth || containerRef.current.clientWidth;
    if (w === 0) return;

    const h = Math.min(w * 0.28, 280);
    const graph = new Graph({
      container: containerRef.current, width: w, height: h,
      autoFit: 'view', padding: 15,
      layout: { type: 'dagre', rankdir: 'LR', nodesep: 20, ranksep: 55 },
      node: {
        type: 'circle',
        style: { size: 44, labelText: '', labelFontSize: 8, labelFontWeight: 600,
          labelPlacement: 'bottom', labelOffsetY: 4, strokeWidth: 2.5 },
      },
      edge: {
        type: 'line',
        style: { endArrow: true, endArrowSize: 7, lineWidth: 2, stroke: token.colorBorderSecondary },
      },
      behaviors: [
        { type: 'zoom-canvas', enable: true },
        { type: 'drag-canvas', enable: true },
      ],
    });

    // 主 Gate 节点
    const gateNodes = GATE_SEQUENCE.map(gateId => ({
      id: gateId,
      style: { labelText: GATE_LABELS[gateId]?.charAt(0) || gateId.slice(-2) },
    }));

    // 子 Agent 节点（如果当前有数据）
    const agentNodes: any[] = [];
    const agentEdges: any[] = [];
    if (currentGate && allAgents.length > 0) {
      allAgents.forEach((a, i) => {
        const agentNodeId = `agent-${a.id}`;
        const isNew = newAgentIds.has(a.id);
        agentNodes.push({
          id: agentNodeId,
          style: {
            size: 24,
            labelText: a.id.length > 12 ? a.id.substring(0, 11) + '…' : a.id,
            labelFontSize: 7,
            labelPlacement: 'bottom',
            labelOffsetY: 2,
            fill: a.status === 'active' ? token.colorPrimaryBg : a.status === 'completed' ? token.colorSuccessBg : token.colorErrorBg,
            stroke: a.status === 'active' ? token.colorPrimary : a.status === 'completed' ? token.colorSuccess : token.colorError,
            strokeWidth: 2,
            // 新 agent 节点用虚线表示"刚加入"
            lineDash: isNew ? [4, 2] : undefined,
          },
        });
        agentEdges.push({
          id: `${currentGate}->agent-${a.id}`,
          source: currentGate,
          target: agentNodeId,
          style: {
            lineWidth: 1.5,
            stroke: a.status === 'active' ? token.colorPrimary : token.colorTextQuaternary,
            lineDash: a.status === 'active' ? [3, 2] : undefined,
            endArrow: false,
          },
        });
      });
    }

    const allNodes = [...gateNodes, ...agentNodes];
    const allEdges = [...GATE_EDGES.map(([s, t]) => ({ id: `${s}->${t}`, source: s, target: t })), ...agentEdges];

    graph.setData({ nodes: allNodes, edges: allEdges });
    graph.render();
    graphRef.current = graph;
    destroyedRef.current = false;

    return () => {
      destroyedRef.current = true;
      try { graph.destroy(); } catch { /* destroyed */ }
      graphRef.current = null;
    };
  }, [runId, containerWidth, allAgents, currentGate]);

  // ============================================================
  // 更新 Gate 节点样式
  // ============================================================
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || destroyedRef.current) return;

    const nodeUpdates = GATE_SEQUENCE.map(gateId => {
      const state = getGateState(gateId);
      let fill: string, stroke: string, lDash: number[] | undefined;
      switch (state) {
        case 'passed': fill = token.colorSuccessBg; stroke = token.colorSuccess; break;
        case 'current': fill = token.colorPrimaryBg; stroke = token.colorPrimary; break;
        default: fill = token.colorFillQuaternary; stroke = token.colorBorderSecondary; lDash = [4, 3]; break;
      }
      return {
        id: gateId,
        style: {
          fill, stroke, lineDash: lDash,
          labelText: `${GATE_LABELS[gateId]?.charAt(0)}\n${GATE_LABELS[gateId]}`,
          labelFill: state === 'future' ? token.colorTextSecondary : token.colorText,
        },
      };
    });
    graph.updateNodeData(nodeUpdates);
    graph.render();
  }, [gateStatusMap, currentGate, getGateState]);

  if (!runId) {
    return (
      <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: token.colorTextSecondary, fontSize: 13, borderRadius: 12,
        background: token.colorFillQuaternary }}>
        无运行中的任务
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}`,
      background: token.colorBgContainer, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', background: token.colorFillQuaternary }} />
      {/* 脉冲动画 */}
      <style>{`
        @keyframes g6-agent-in {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes g6-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export { GATE_SEQUENCE, GATE_LABELS };
