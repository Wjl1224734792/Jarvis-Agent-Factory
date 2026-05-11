import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { theme, Tag } from 'antd';
import { Graph } from '@antv/g6';
import type { AgentStatusResponse } from '../api';

// ============================================================
// Gate 节点定义
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
// G6FlowChart 组件
// ============================================================

export default function G6FlowChart({ runId, agentStatus, pipelineGates }: G6FlowChartProps) {
  const { token } = theme.useToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const destroyedRef = useRef(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const gateStatusMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (pipelineGates) pipelineGates.forEach(g => map.set(g.gate, g.passed));
    return map;
  }, [pipelineGates]);

  const currentGate = useMemo(() => {
    for (const gateId of GATE_SEQUENCE) {
      if (gateStatusMap.get(gateId) !== true) return gateId;
    }
    return null;
  }, [gateStatusMap]);

  const getGateState = useCallback((gateId: string): 'passed' | 'current' | 'future' => {
    if (gateStatusMap.get(gateId) === true) return 'passed';
    if (gateId === currentGate) return 'current';
    return 'future';
  }, [gateStatusMap, currentGate]);

  const hasAgentData = useMemo(() => {
    if (!agentStatus) return false;
    return agentStatus.active.length > 0 || agentStatus.completed.length > 0 || agentStatus.failed.length > 0;
  }, [agentStatus]);

  const agentSets = useMemo(() => {
    if (!agentStatus) return { active: new Set<string>(), completed: new Set<string>(), failed: new Set<string>() };
    return {
      active: new Set(agentStatus.active),
      completed: new Set(agentStatus.completed),
      failed: new Set(agentStatus.failed),
    };
  }, [agentStatus]);

  const currentGateAgents = useMemo(() => {
    if (!hasAgentData) return [];
    const all = [
      ...Array.from(agentSets.active).map((a: string) => ({ name: a, status: 'active' as const })),
      ...Array.from(agentSets.completed).map((a: string) => ({ name: a, status: 'completed' as const })),
      ...Array.from(agentSets.failed).map((a: string) => ({ name: a, status: 'failed' as const })),
    ];
    return all.slice(0, 10);
  }, [hasAgentData, agentSets]);

  // ResizeObserver
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
    setContainerWidth(containerRef.current.clientWidth);
    return () => { observer.disconnect(); clearTimeout(debounceTimer); };
  }, []);

  // 初始化 G6 Graph
  useEffect(() => {
    if (!containerRef.current || !runId) return;
    const w = containerWidth || containerRef.current.clientWidth;
    if (w === 0) return;

    const height = Math.min(w * 0.22, 260);
    const graph = new Graph({
      container: containerRef.current,
      width: w, height,
      autoFit: 'view',
      padding: 15,
      layout: { type: 'dagre', rankdir: 'LR', nodesep: 24, ranksep: 50 },
      node: {
        type: 'circle',
        style: { size: 48, labelText: '', labelFontSize: 9, labelFontWeight: 600,
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

    const nodes = GATE_SEQUENCE.map(gateId => ({
      id: gateId,
      style: { labelText: GATE_LABELS[gateId]?.charAt(0) || gateId.slice(-2) },
    }));
    const edges = GATE_EDGES.map(([s, t]) => ({ id: `${s}->${t}`, source: s, target: t }));

    graph.setData({ nodes, edges });
    graph.render();
    graphRef.current = graph;
    destroyedRef.current = false;

    return () => {
      destroyedRef.current = true;
      try { graph.destroy(); } catch { /* destroyed */ }
      graphRef.current = null;
    };
  }, [runId, containerWidth]);

  // 更新节点样式
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
          labelText: `${GATE_LABELS[gateId]?.charAt(0) || gateId.slice(-2)}\n${GATE_LABELS[gateId]}`,
          labelFill: state === 'future' ? token.colorTextSecondary : token.colorText,
        },
      };
    });
    graph.updateNodeData(nodeUpdates);

    const edgeUpdates = GATE_EDGES.map(([s, t]) => {
      const sp = getGateState(s) === 'passed';
      return { id: `${s}->${t}`, style: { stroke: sp ? token.colorSuccess : token.colorBorderSecondary,
        lineDash: sp ? undefined : [6, 3], lineWidth: sp ? 2.5 : 1.5 } };
    });
    graph.updateEdgeData(edgeUpdates);
    graph.render();
  }, [gateStatusMap, currentGate, getGateState]);

  // Agent 标注
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || destroyedRef.current || !hasAgentData) return;

    const badgeUpdates = GATE_SEQUENCE.map(gateId => {
      const state = getGateState(gateId);
      const activeCount = agentSets.active.size;
      return {
        id: gateId,
        style: {
          badges: (state === 'current' && activeCount > 0)
            ? [{ text: String(activeCount), placement: 'right-top' as const, fill: token.colorPrimary, fontSize: 10 }]
            : state === 'passed'
            ? [{ text: '✓', placement: 'right-top' as const, fill: token.colorSuccess, fontSize: 10 }]
            : [],
        },
      };
    });
    graph.updateNodeData(badgeUpdates);
    graph.render();
  }, [agentStatus, hasAgentData, getGateState, agentSets]);

  if (!runId) {
    return (
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: token.colorTextSecondary, fontSize: 13, borderRadius: 12,
        background: token.colorFillQuaternary }}>
        无运行中的任务
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer, overflow: 'hidden' }}>
      {/* G6 Canvas */}
      <div ref={containerRef} style={{ width: '100%', background: token.colorFillQuaternary }} />

      {/* Agent 状态条 — 有数据时显示 */}
      {hasAgentData && (
        <div style={{ display: 'flex', gap: 6, padding: '8px 12px', flexWrap: 'wrap', alignItems: 'center',
          borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <span style={{ fontSize: 11, color: token.colorTextSecondary, fontWeight: 600, flexShrink: 0 }}>
            🔄 Agent 状态
          </span>
          {currentGateAgents.map(a => (
            <Tag key={a.name} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}
              color={a.status === 'active' ? 'processing' : a.status === 'completed' ? 'success' : 'error'}>
              {a.status === 'active' ? '●' : a.status === 'completed' ? '✓' : '✗'} {a.name}
            </Tag>
          ))}
        </div>
      )}

      {/* 脉冲动画 */}
      <style>{`
        @keyframes g6-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

export { GATE_SEQUENCE, GATE_LABELS };
