import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { theme } from 'antd';
import { Graph } from '@antv/g6';
import type { AgentStatusResponse, AgentUsageResponse } from '../api';

// ============================================================
// Gate 定义
// ============================================================

const GATE_SEQUENCE = [
  'Gate A', 'Gate B-DDD', 'Gate B-BDD', 'Gate B-TDD',
  'Gate B1', 'Gate C', 'Gate C-impl',
  'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D', 'Gate E',
] as const;

const GATE_LABELS: Record<string, string> = {
  'Gate A': '需求澄清', 'Gate B-DDD': '领域分析', 'Gate B-BDD': '行为驱动', 'Gate B-TDD': '测试任务',
  'Gate B1': '架构评审',
  'Gate C': '执行规划', 'Gate C-impl': '并行实现', 'Gate C1': '代码质量',
  'Gate C1.5': '视觉验证', 'Gate C2': '测试验证', 'Gate D': '审查签核', 'Gate E': '发布上线',
};

const GATE_DESCRIPTIONS: Record<string, string> = {
  'Gate A': '至少1个需求文档，含REQ-XXX编号',
  'Gate B-DDD': 'DDD领域分析：聚合/实体/值对象/领域服务',
  'Gate B-BDD': 'BDD行为场景：Gherkin Given/When/Then',
  'Gate B-TDD': 'TDD任务包：Red→Green→Refactor',
  'Gate B1': '架构评审通过（涉及架构变更时）',
  'Gate C': '计划文档含parallel_batches+Execution Packet',
  'Gate C-impl': '所有Batch实现完成，实现Agent已返回结果',
  'Gate C1': 'Lint+Type-check+Build+Deps Audit全部通过',
  'Gate C1.5': '页面/组件视觉验证截图证据已附',
  'Gate C2': '测试全部通过，API契约验证通过',
  'Gate D': '领域审查+安全审计+性能审计通过',
  'Gate E': '安全审计+上线检查清单+回滚预案就绪',
};

const GATE_EDGES: [string, string][] = [
  ['Gate A', 'Gate B-DDD'],
  ['Gate B-DDD', 'Gate B-BDD'],
  ['Gate B-BDD', 'Gate B-TDD'],
  ['Gate B-TDD', 'Gate B1'],
  ['Gate B1', 'Gate C'],
  ['Gate C', 'Gate C-impl'],
  ['Gate C-impl', 'Gate C1'],
  ['Gate C1', 'Gate C1.5'],
  ['Gate C1.5', 'Gate C2'],
  ['Gate C2', 'Gate D'],
  ['Gate D', 'Gate E'],
];

/** 条件跳过边：B-DDD → B-TDD（B-BDD 被跳过时可见） */
const GATE_SKIP_EDGES: [string, string][] = [
  ['Gate B-DDD', 'Gate B-TDD'],
];

// ============================================================
// 类型
// ============================================================

interface G6FlowChartProps {
  runId: string | null;
  agentStatus: AgentStatusResponse | null;
  agentUsage?: AgentUsageResponse | null;
  pipelineGates?: { gate: string; passed: boolean; duration_display?: string | null }[];
}

// ============================================================
// 组件
// ============================================================

export default function G6FlowChart({ runId, agentStatus, agentUsage, pipelineGates }: G6FlowChartProps) {
  const { token } = theme.useToken();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const destroyedRef = useRef(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const prevAgentIds = useRef<Set<string>>(new Set());
  const animFrameRef = useRef<number>(0);

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
  const allAgents = useMemo(() => {
    if (!agentStatus) return [];
    const result: { id: string; status: 'active' | 'completed' | 'failed' }[] = [];
    agentStatus.active.forEach(id => result.push({ id, status: 'active' as const }));
    agentStatus.completed.forEach(id => result.push({ id, status: 'completed' as const }));
    agentStatus.failed.forEach(id => result.push({ id, status: 'failed' as const }));
    return result;
  }, [agentStatus]);

  // 检测新 agent
  const newAgentIds = useMemo(() => {
    const currentIds = new Set(allAgents.map(a => a.id));
    const prev = prevAgentIds.current;
    const newIds = new Set<string>();
    currentIds.forEach(id => { if (!prev.has(id)) newIds.add(id); });
    prevAgentIds.current = currentIds;
    return newIds;
  }, [allAgents]);

  // B-BDD 是否被跳过（passed 列表里没有它但 B-TDD 已通过或正在进行）
  const bddSkipped = useMemo(() => {
    if (!pipelineGates || pipelineGates.length === 0) return false;
    const bddGate = pipelineGates.find(g => g.gate === 'Gate B-BDD');
    if (bddGate?.passed) return false;
    const tddGate = pipelineGates.find(g => g.gate === 'Gate B-TDD');
    return tddGate?.passed === true || currentGate === 'Gate B-TDD';
  }, [pipelineGates, currentGate]);

  // ResizeObserver — 同时观测宽高
  useEffect(() => {
    if (!containerRef.current) return;
    let debounceTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          setContainerSize({
            w: entry.contentRect.width,
            h: entry.contentRect.height,
          });
        }, 150);
      }
    });
    observer.observe(containerRef.current);
    setContainerSize({
      w: containerRef.current.clientWidth,
      h: containerRef.current.clientHeight,
    });
    return () => { observer.disconnect(); clearTimeout(debounceTimer); };
  }, []);

  // ============================================================
  // 初始化 G6 Graph
  // ============================================================
  useEffect(() => {
    if (!containerRef.current || !runId) return;
    const { w, h } = containerSize;
    if (w === 0 || h === 0) return;

    // 主节点大小：根据容器宽度自适应
    const mainNodeSize = Math.max(44, Math.min(58, w / 18));
    const mainFontSize = Math.max(8, Math.min(10, w / 80));

    const graph = new Graph({
      container: containerRef.current,
      width: w,
      height: h,
      autoFit: 'view',
      padding: [20, 25, 20, 25],
      animation: true,
      layout: {
        type: 'dagre',
        rankdir: 'LR',
        nodesep: Math.max(18, w / 55),
        ranksep: Math.max(45, w / 18),
      },
      node: {
        type: 'circle',
        style: {
          size: mainNodeSize,
          labelText: '',
          labelFontSize: mainFontSize,
          labelFontWeight: 600,
          labelPlacement: 'bottom',
          labelOffsetY: 4,
          strokeWidth: 2.5,
          cursor: 'pointer',
        },
      },
      edge: {
        type: 'line',
        style: {
          endArrow: true,
          endArrowSize: 8,
          lineWidth: 2.5,
        },
        animation: {},
      },
      behaviors: [
        { type: 'zoom-canvas', enable: true, sensitivity: 1.2 },
        { type: 'drag-canvas', enable: true, trigger: 'drag' },
        { type: 'hover-activate', enable: true, degree: 1 },
      ],
      plugins: [],
    });

    // —— 构建数据 ——
    const gateNodes = GATE_SEQUENCE.map(gateId => ({
      id: gateId,
      data: { gateId, isGate: true },
      style: { labelText: GATE_LABELS[gateId] || gateId },
    }));

    const agentNodes: any[] = [];
    const agentEdges: any[] = [];
    if (currentGate && allAgents.length > 0) {
      allAgents.forEach((a) => {
        const agentNodeId = `agent-${a.id}`;
        const isNew = newAgentIds.has(a.id);
        agentNodes.push({
          id: agentNodeId,
          data: { agentId: a.id, status: a.status, isAgent: true },
          style: {
            size: Math.max(18, mainNodeSize * 0.48),
            labelText: a.id.length > 14 ? a.id.substring(0, 13) + '…' : a.id,
            labelFontSize: Math.max(6, mainFontSize * 0.7),
            labelPlacement: 'bottom',
            labelOffsetY: 2,
            fill: a.status === 'active' ? token.colorPrimaryBg
              : a.status === 'completed' ? token.colorSuccessBg
              : token.colorErrorBg,
            stroke: a.status === 'active' ? token.colorPrimary
              : a.status === 'completed' ? token.colorSuccess
              : token.colorError,
            strokeWidth: isNew ? 3 : 2,
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
    const allEdges = [
      ...GATE_EDGES.map(([s, t]) => ({
        id: `${s}->${t}`,
        source: s,
        target: t,
      })),
      ...(bddSkipped ? GATE_SKIP_EDGES.map(([s, t]) => ({
        id: `${s}->${t}-skip`,
        source: s,
        target: t,
        style: { lineDash: [8, 4], stroke: token.colorWarning, lineWidth: 2 },
      })) : []),
      ...agentEdges,
    ];

    graph.setData({ nodes: allNodes, edges: allEdges });
    graph.render();
    graphRef.current = graph;
    destroyedRef.current = false;

    // —— 边虚线流动动画 ——
    let dashOffset = 0;
    const animateDash = () => {
      if (destroyedRef.current) return;
      dashOffset = (dashOffset - 0.4) % 16;
      try {
        const allEdgeIds = [...GATE_EDGES.map(([s, t]) => `${s}->${t}`),
          ...(bddSkipped ? GATE_SKIP_EDGES.map(([s, t]) => `${s}->${t}-skip`) : [])];
        allEdgeIds.forEach(eid => {
          try { graph.updateEdgeData([{ id: eid, style: { lineDashOffset: dashOffset } }]); } catch { /* ignore */ }
        });
        graph.draw();
      } catch { /* ignore */ }
      animFrameRef.current = requestAnimationFrame(animateDash);
    };
    animFrameRef.current = requestAnimationFrame(animateDash);

    return () => {
      destroyedRef.current = true;
      cancelAnimationFrame(animFrameRef.current);
      try { graph.destroy(); } catch { /* destroyed */ }
      graphRef.current = null;
    };
  }, [runId, containerSize.w, containerSize.h, allAgents, currentGate, bddSkipped]);

  // ============================================================
  // 更新 Gate 节点样式（状态变化时）
  // ============================================================
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || destroyedRef.current) return;

    const { w } = containerSize;
    const mainFontSize = Math.max(8, Math.min(10, w / 80));

    const nodeUpdates = GATE_SEQUENCE.map(gateId => {
      const state = getGateState(gateId);
      let fill: string; let stroke: string; let lDash: number[] | undefined;
      let labelFill: string;

      switch (state) {
        case 'passed':
          fill = token.colorSuccessBg;
          stroke = token.colorSuccess;
          labelFill = token.colorSuccess;
          break;
        case 'current':
          fill = token.colorPrimaryBg;
          stroke = token.colorPrimary;
          labelFill = token.colorPrimary;
          break;
        default:
          fill = token.colorBgElevated || token.colorBgContainer;
          stroke = token.colorBorderSecondary;
          lDash = [4, 3];
          labelFill = token.colorTextSecondary;
          break;
      }

      return {
        id: gateId,
        data: { gateId, state },
        style: {
          fill, stroke, lineDash: lDash,
          labelText: `${GATE_LABELS[gateId]}`,
          labelFill,
          labelFontSize: mainFontSize,
          labelFontWeight: state === 'current' ? 700 : 500,
          strokeWidth: state === 'current' ? 3.5 : 2.5,
          // 当前节点加阴影/光晕
          shadowColor: state === 'current' ? token.colorPrimary : undefined,
          shadowBlur: state === 'current' ? 12 : undefined,
        },
      };
    });
    graph.updateNodeData(nodeUpdates);
    graph.render();
  }, [gateStatusMap, currentGate, getGateState, containerSize.w]);

  // ============================================================
  // 更新边样式（按状态着色）
  // ============================================================
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || destroyedRef.current) return;

    const edgeUpdates = GATE_EDGES.map(([s, t]) => {
      const sState = getGateState(s);
      const tState = getGateState(t);
      const edgeId = `${s}->${t}`;
      let stroke: string; let lineWidth: number; let lDash: number[] | undefined;

      if (sState === 'passed' && tState === 'passed') {
        stroke = token.colorSuccess;
        lineWidth = 2.5;
      } else if (sState === 'current' || tState === 'current') {
        stroke = token.colorPrimary;
        lineWidth = 3;
      } else if (sState === 'passed' && tState === 'future') {
        stroke = token.colorPrimary;
        lineWidth = 3;
        lDash = [6, 3];
      } else {
        stroke = token.colorBorderSecondary;
        lineWidth = 2;
        lDash = [4, 3];
      }

      return { id: edgeId, style: { stroke, lineWidth, lineDash: lDash } };
    });

    graph.updateEdgeData(edgeUpdates);
    graph.draw();
  }, [gateStatusMap, currentGate, getGateState]);

  // ============================================================
  // Tooltip 事件 — Gate 节点 + Agent 节点
  // ============================================================
  useEffect(() => {
    const graph = graphRef.current;
    const tooltip = tooltipRef.current;
    if (!graph || !tooltip) return;

    const showTooltip = (e: any) => {
      const nodeId = e.target?.id || '';
      if (!nodeId) { tooltip.style.display = 'none'; return; }

      // Agent 节点 tooltip
      if (nodeId.startsWith('agent-')) {
        const agentId = nodeId.replace('agent-', '');
        const a = allAgents.find(x => x.id === agentId);
        const usage = agentUsage?.agents?.[agentId];
        const statusLabel = a?.status === 'active' ? '运行中' : a?.status === 'completed' ? '已完成' : '失败';
        const statusColor = a?.status === 'active' ? token.colorPrimary
          : a?.status === 'completed' ? token.colorSuccess : token.colorError;

        let html = `<div style="font-weight:700;margin-bottom:4px;color:${statusColor}">${agentId}</div>`;
        html += `<div style="font-size:10px;color:${token.colorTextSecondary}">状态: ${statusLabel}</div>`;
        if (usage) {
          const total = (usage.total_input_tokens || 0) + (usage.total_output_tokens || 0);
          html += `<div style="margin-top:4px;font-size:10px">调用: <b>${usage.calls}</b>次</div>`;
          html += `<div style="font-size:10px">Token: <b>${total.toLocaleString()}</b></div>`;
          html += `<div style="font-size:10px;color:${token.colorTextSecondary}">输入: ${(usage.total_input_tokens || 0).toLocaleString()} · 输出: ${(usage.total_output_tokens || 0).toLocaleString()}</div>`;
        } else {
          html += `<div style="font-size:10px;color:${token.colorTextSecondary}">暂无 Token 统计</div>`;
        }
        tooltip.innerHTML = html;
        tooltip.style.display = 'block';
        tooltip.style.left = (e.canvas?.x || e.clientX || 0) + 14 + 'px';
        tooltip.style.top = (e.canvas?.y || e.clientY || 0) - 10 + 'px';
        return;
      }

      // Gate 节点 tooltip
      const gateId = nodeId;
      const state = getGateState(gateId);
      const stateLabel = state === 'passed' ? '✅ 已通过' : state === 'current' ? '🔵 进行中' : '⏳ 等待中';
      const desc = GATE_DESCRIPTIONS[gateId] || '';
      const gateStatus = pipelineGates?.find(g => g.gate === gateId);

      let html = `<div style="font-weight:700;margin-bottom:4px">${gateId}</div>`;
      html += `<div style="font-size:10px">${GATE_LABELS[gateId] || ''}</div>`;
      html += `<div style="font-size:10px;margin-top:2px">${stateLabel}</div>`;
      if (desc) html += `<div style="font-size:10px;color:${token.colorTextSecondary};margin-top:2px;max-width:180px">${desc}</div>`;
      if (gateStatus?.duration_display) html += `<div style="font-size:10px;color:${token.colorTextSecondary};margin-top:2px">耗时: ${gateStatus.duration_display}</div>`;

      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.canvas?.x || e.clientX || 0) + 14 + 'px';
      tooltip.style.top = (e.canvas?.y || e.clientY || 0) - 10 + 'px';
    };

    const hideTooltip = () => { tooltip.style.display = 'none'; };

    graph.on('node:pointerenter', showTooltip as never);
    graph.on('node:pointerleave', hideTooltip as never);

    return () => {
      graph.off('node:pointerenter', showTooltip as never);
      graph.off('node:pointerleave', hideTooltip as never);
    };
  }, [agentUsage, allAgents, getGateState, pipelineGates]);

  // ============================================================
  // 空状态
  // ============================================================
  if (!runId) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: token.colorTextSecondary, fontSize: 13, borderRadius: 12,
        background: token.colorFillQuaternary,
      }}>
        无运行中的任务
      </div>
    );
  }

  return (
    <div ref={wrapperRef} style={{
      position: 'relative', width: '100%', height: '100%',
      borderRadius: 12, border: `1.5px solid ${token.colorBorderSecondary}`,
      background: token.colorBgContainer, overflow: 'hidden',
    }}>
      {/* G6 Canvas 容器 */}
      <div ref={containerRef} style={{
        width: '100%', height: '100%',
        background: token.colorFillQuaternary,
      }} />

      {/* 悬浮 tooltip */}
      <div ref={tooltipRef} style={{
        display: 'none', position: 'absolute', zIndex: 999,
        background: token.colorBgElevated || token.colorBgContainer,
        border: `1.5px solid ${token.colorPrimaryBorder || token.colorBorder}`,
        borderRadius: 10, padding: '8px 12px', fontSize: 11,
        color: token.colorText,
        boxShadow: token.boxShadowSecondary || '0 4px 16px rgba(0,0,0,0.12)',
        pointerEvents: 'none', maxWidth: 240, lineHeight: 1.6,
        backdropFilter: 'blur(8px)',
      }} />

      {/* 图例 */}
      <div style={{
        position: 'absolute', bottom: 8, left: 12,
        display: 'flex', gap: 12, fontSize: 10,
        color: token.colorTextSecondary,
        pointerEvents: 'none',
        background: token.colorBgContainer,
        borderRadius: 8, padding: '3px 10px',
        opacity: 0.85,
      }}>
        <span><span style={{ color: token.colorSuccess, fontWeight: 700 }}>●</span> 已通过</span>
        <span><span style={{ color: token.colorPrimary, fontWeight: 700 }}>●</span> 进行中</span>
        <span><span style={{ color: token.colorTextSecondary }}>○</span> 等待中</span>
        <span><span style={{ color: token.colorWarning }}>⇢</span> 条件跳过</span>
      </div>
    </div>
  );
}

export { GATE_SEQUENCE, GATE_LABELS, GATE_SKIP_EDGES, GATE_DESCRIPTIONS };
