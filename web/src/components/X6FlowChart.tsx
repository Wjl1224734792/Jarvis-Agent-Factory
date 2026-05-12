import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Graph } from '@antv/x6';
import { Selection } from '@antv/x6-plugin-selection';
import { Snapline } from '@antv/x6-plugin-snapline';
import dagre from 'dagre';
import { theme } from 'antd';
import { NODE_SIZES, ANIMATION_DEFAULTS } from '../constants/x6-theme';
import type { AgentStatusResponse, AgentUsageResponse } from '../api';
import { useX6Animation } from '../hooks/useX6Animation';
import X6Controls from './X6Controls';

/**
 * HTML 实体编码，防止 XSS 注入
 * 所有来自后端的数据在拼入 HTML 字符串前必须调用此函数
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

const GATE_SKIP_EDGES: [string, string][] = [
  ['Gate B-DDD', 'Gate B-TDD'],
];

// Gate emoji 图标
const GATE_ICONS: Record<string, string> = {
  'Gate A': '📋', 'Gate B-DDD': '🏗️', 'Gate B-BDD': '📝', 'Gate B-TDD': '🧪',
  'Gate B1': '🏛️', 'Gate C': '📐', 'Gate C-impl': '⚡',
  'Gate C1': '✅', 'Gate C1.5': '👁️', 'Gate C2': '🔬', 'Gate D': '🔍', 'Gate E': '🚀',
};

// ============================================================
// 类型
// ============================================================

interface Props {
  runId: string | null;
  agentStatus: AgentStatusResponse | null;
  agentUsage?: AgentUsageResponse | null;
  pipelineGates?: { gate: string; passed: boolean; duration_display?: string | null }[];
  selectedGate: string | null;
  onGateSelect: (gateId: string) => void;
}

// ============================================================
// dagre 布局计算
// ============================================================

function computeLayout(
  gateNodes: string[],
  edges: [string, string][],
  agentNodes: string[],
  agentEdges: [string, string][],
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 120, marginx: 20, marginy: 20 });

  for (const id of gateNodes) {
    g.setNode(id, { width: NODE_SIZES.gate.w, height: NODE_SIZES.gate.w });
  }
  for (const id of agentNodes) {
    g.setNode(id, { width: NODE_SIZES.agent.w, height: NODE_SIZES.agent.w });
  }
  for (const [s, t] of edges) {
    g.setEdge(s, t);
  }
  for (const [s, t] of agentEdges) {
    g.setEdge(s, t);
  }

  dagre.layout(g);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const id of [...gateNodes, ...agentNodes]) {
    const node = g.node(id);
    if (node) {
      positions[id] = { x: node.x, y: node.y };
    }
  }
  return positions;
}

// ============================================================
// 组件
// ============================================================

export default function X6FlowChart({
  runId, agentStatus, agentUsage, pipelineGates, selectedGate, onGateSelect,
}: Props) {
  const { token } = theme.useToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const destroyedRef = useRef(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 记录已渲染过的节点 ID，数据轮询时跳过入场动画 */
  const renderedNodeIdsRef = useRef<Set<string>>(new Set());

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

  const bddSkipped = useMemo(() => {
    if (!pipelineGates || pipelineGates.length === 0) return false;
    const bddGate = pipelineGates.find(g => g.gate === 'Gate B-BDD');
    if (bddGate?.passed) return false;
    const tddGate = pipelineGates.find(g => g.gate === 'Gate B-TDD');
    return tddGate?.passed === true || currentGate === 'Gate B-TDD';
  }, [pipelineGates, currentGate]);

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let debounceTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          setContainerSize({
            w: entry.contentRect.width,
            h: entry.contentRect.height,
          });
        }, 100);
      }
    });
    observer.observe(el);
    if (el.clientWidth > 0 && el.clientHeight > 0) {
      setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    }
    return () => { observer.disconnect(); clearTimeout(debounceTimer); };
  }, []);

  // 初始化 X6 Graph
  useEffect(() => {
    if (!containerRef.current || !runId) return;
    const { w, h } = containerSize;
    if (w === 0 || h === 0) return;

    destroyedRef.current = false;

    const graph = new Graph({
      container: containerRef.current,
      width: w,
      height: h,
      background: { color: 'transparent' },
      interacting: { nodeMovable: false, edgeMovable: false },
      autoResize: false,
      mousewheel: {
        enabled: true,
        zoomAtMousePosition: true,
        modifiers: 'ctrl',
        minScale: 0.3,
        maxScale: 3.0,
      },
    });

    graph.use(new Selection({ enabled: true, multiple: false, rubberband: false }));
    graph.use(new Snapline({ enabled: true }));

    graphRef.current = graph;

    return () => {
      destroyedRef.current = true;
      try { graph.dispose(); } catch {}
      graphRef.current = null;
    };
  }, [runId, containerSize.w, containerSize.h]);

  // 渲染图数据
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || destroyedRef.current) return;

    const mainNodeSize = NODE_SIZES.gate.w;
    const mainFontSize = NODE_SIZES.gate.fontSize;
    const agentNodeSize = NODE_SIZES.agent.w;

    // 准备 agent 节点数据
    const agentNodeIds: string[] = [];
    const agentEdgeList: [string, string][] = [];
    const selGate = selectedGate || currentGate;

    if (selGate && allAgents.length > 0) {
      for (const a of allAgents) {
        const agentId = `agent-${a.id}`;
        agentNodeIds.push(agentId);
        agentEdgeList.push([selGate, agentId]);
      }
    }

    // 计算布局
    const edgeList: [string, string][] = [
      ...GATE_EDGES,
      ...(bddSkipped ? GATE_SKIP_EDGES : []),
      ...agentEdgeList,
    ];
    const positions = computeLayout(
      [...GATE_SEQUENCE], edgeList, agentNodeIds, agentEdgeList,
    );

    // 清除旧内容
    graph.clearCells();

    // 添加 Gate 节点
    for (const gateId of GATE_SEQUENCE) {
      const pos = positions[gateId];
      if (!pos) continue;
      const state = getGateState(gateId);
      const isSelected = (selectedGate || currentGate) === gateId;

      let fill: string; let stroke: string; let labelFill: string;
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
          labelFill = token.colorTextSecondary;
          break;
      }

      const node = graph.addNode({
        id: gateId,
        x: pos.x - mainNodeSize / 2,
        y: pos.y - mainNodeSize / 2,
        width: mainNodeSize,
        height: mainNodeSize,
        shape: 'ellipse',
        attrs: {
          body: {
            fill,
            stroke,
            strokeWidth: isSelected ? 3.5 : state === 'current' ? 3 : 2.2,
            strokeDasharray: state === 'future' ? '4,3' : undefined,
            rx: mainNodeSize / 2,
            ry: mainNodeSize / 2,
            filter: isSelected ? `drop-shadow(0 0 8px ${stroke})` : state === 'current' ? `drop-shadow(0 0 6px ${stroke})` : undefined,
          },
          label: {
            text: `${GATE_ICONS[gateId] || ''} ${GATE_LABELS[gateId] || gateId}`,
            fill: labelFill,
            fontSize: mainFontSize,
            fontWeight: isSelected ? 700 : state === 'current' ? 600 : 400,
            textAnchor: 'middle',
            textVerticalAnchor: 'top',
            refY: mainNodeSize / 2 + 6,
          },
        },
        data: { gateId, state, isGate: true },
      });

      // 点击事件
      node.on('cell:click', () => {
        onGateSelect(gateId);
      });
    }

    // 添加 Agent 子节点
    for (const agentId of agentNodeIds) {
      const pos = positions[agentId];
      if (!pos) continue;
      const agentName = agentId.replace('agent-', '');
      const a = allAgents.find(x => x.id === agentName);
      const status = a?.status || 'active';

      const agentFill = status === 'active' ? token.colorPrimaryBg
        : status === 'completed' ? token.colorSuccessBg
        : token.colorErrorBg;
      const agentStroke = status === 'active' ? token.colorPrimary
        : status === 'completed' ? token.colorSuccess
        : token.colorError;

      graph.addNode({
        id: agentId,
        x: pos.x - agentNodeSize / 2,
        y: pos.y - agentNodeSize / 2,
        width: agentNodeSize,
        height: agentNodeSize,
        shape: 'ellipse',
        attrs: {
          body: {
            fill: agentFill,
            stroke: agentStroke,
            strokeWidth: 2,
            rx: agentNodeSize / 2,
            ry: agentNodeSize / 2,
          },
          label: {
            text: agentName.length > 16 ? agentName.substring(0, 15) + '…' : agentName,
            fill: token.colorTextSecondary,
            fontSize: NODE_SIZES.agent.fontSize,
            textAnchor: 'middle',
            textVerticalAnchor: 'top',
            refY: agentNodeSize / 2 + 4,
          },
        },
        data: { agentId: agentName, status, isAgent: true },
      });
    }

    // 添加 Gate 边
    for (const [s, t] of GATE_EDGES) {
      const sState = getGateState(s);
      const tState = getGateState(t);

      let edgeStroke: string; let edgeWidth: number; let edgeDash: string | undefined;
      if (sState === 'passed' && tState === 'passed') {
        edgeStroke = token.colorSuccess; edgeWidth = 2.5;
      } else if (sState === 'current' || tState === 'current') {
        edgeStroke = token.colorPrimary; edgeWidth = 3;
      } else if (sState === 'passed' && tState === 'future') {
        edgeStroke = token.colorPrimary; edgeWidth = 2.5; edgeDash = '6,3';
      } else {
        edgeStroke = token.colorBorderSecondary; edgeWidth = 1.8; edgeDash = '4,3';
      }

      graph.addEdge({
        id: `${s}->${t}`,
        source: { cell: s },
        target: { cell: t },
        attrs: {
          line: {
            stroke: edgeStroke,
            strokeWidth: edgeWidth,
            strokeDasharray: edgeDash,
            targetMarker: { name: 'block', width: 8, height: 6 },
          },
        },
        data: { isGateEdge: true },
      });
    }

    // 条件跳过边
    if (bddSkipped) {
      for (const [s, t] of GATE_SKIP_EDGES) {
        graph.addEdge({
          id: `${s}->${t}-skip`,
          source: { cell: s },
          target: { cell: t },
          attrs: {
            line: {
              stroke: token.colorWarning,
              strokeWidth: 2,
              strokeDasharray: '8,4',
              targetMarker: { name: 'block', width: 8, height: 6 },
            },
          },
          data: { isSkipEdge: true },
        });
      }
    }

    // 添加 Agent 边
    for (const [s, t] of agentEdgeList) {
      const agentName = t.replace('agent-', '');
      const a = allAgents.find(x => x.id === agentName);
      const status = a?.status || 'active';
      const edgeStroke = status === 'active' ? token.colorPrimary
        : status === 'completed' ? token.colorSuccess
        : token.colorError;

      graph.addEdge({
        id: `${s}->${t}`,
        source: { cell: s },
        target: { cell: t },
        attrs: {
          line: {
            stroke: edgeStroke,
            strokeWidth: 1.5,
            strokeDasharray: status === 'active' ? '3,2' : undefined,
            targetMarker: { name: 'block', width: 6, height: 4 },
          },
        },
        data: { isAgentEdge: true, status },
      });
    }

    // 适配视图
    graph.zoomToFit({ padding: { top: 20, right: 20, bottom: 20, left: 20 }, maxScale: 3.0, minScale: 0.3 });

    // 节点入场动画：仅对新出现的节点 ID 播放，数据轮询不重播
    const entranceD = ANIMATION_DEFAULTS.entranceDuration;
    const entranceE = ANIMATION_DEFAULTS.entranceEasing;
    const cssTransition = `opacity ${entranceD}ms ${entranceE}, transform ${entranceD}ms ${entranceE}`;
    const initialStyle = `opacity: 0; transform: scale(0.3); transform-origin: center; transform-box: fill-box; ${cssTransition};`;
    const finalStyle = `opacity: 1; transform: scale(1); transform-origin: center; transform-box: fill-box; ${cssTransition};`;
    const nodes = graph.getNodes();
    const currentIds = new Set(nodes.map(n => n.id));
    // 仅选中 renderedNodeIdsRef 中未出现过的节点执行入场动画
    const newNodes = nodes.filter(n => !renderedNodeIdsRef.current.has(n.id));

    for (const node of newNodes) {
      if (node.isNode()) {
        node.setAttrs({ body: { opacity: 0, style: initialStyle } });
      }
    }
    if (newNodes.length > 0) {
      requestAnimationFrame(() => {
        for (const node of newNodes) {
          if (node.isNode()) {
            node.setAttrs({ body: { opacity: 1, style: finalStyle } });
          }
        }
      });
    }

    // 更新已渲染节点 ID 集合
    renderedNodeIdsRef.current = currentIds;
  }, [gateStatusMap, currentGate, selectedGate, allAgents, bddSkipped, containerSize]);

  // 统一动画：呼吸 + 虚线流动（useX6Animation）
  useX6Animation(graphRef.current, {
    breath: {
      enabled: true,
      amplitude: ANIMATION_DEFAULTS.breathAmplitude,
      frequency: ANIMATION_DEFAULTS.breathFrequency,
      nodeFilter: (node) => {
        const data = node.getData();
        if (data?.isGate) {
          return getGateState(data.gateId as string) === 'current';
        }
        if (data?.isAgent) {
          return (data.status as string) === 'active';
        }
        return false;
      },
    },
    dashFlow: {
      enabled: true,
      speed: ANIMATION_DEFAULTS.dashFlowSpeed,
      edgeFilter: (edge) => {
        const data = edge.getData();
        return !!(data?.isGateEdge || data?.isSkipEdge || data?.isAgentEdge);
      },
    },
    transitions: {
      entranceDuration: ANIMATION_DEFAULTS.entranceDuration,
      exitDuration: ANIMATION_DEFAULTS.exitDuration,
    },
  });

  // Tooltip 事件
  useEffect(() => {
    const graph = graphRef.current;
    const tooltip = tooltipRef.current;
    if (!graph || !tooltip) return;

    const showTooltip = (args: any) => {
      const cell = args.cell;
      if (!cell) { tooltip.style.display = 'none'; return; }
      const data = cell.getData();
      if (!data) return;

      // 取消之前的隐藏定时器，防止 stale 隐藏覆盖新的显示
      if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }

      const pos = args.e ? { x: args.e.clientX, y: args.e.clientY } : { x: 0, y: 0 };

      let html = '';

      if (data.isAgent) {
        const agentId = escapeHtml(data.agentId as string);
        const agent = allAgents.find(x => x.id === data.agentId as string);
        const usage = agentUsage?.agents?.[data.agentId as string];
        const statusLabel = agent?.status === 'active' ? '🟢 运行中'
          : agent?.status === 'completed' ? '✅ 已完成' : '❌ 失败';
        html += `<div style="font-weight:700;margin-bottom:4px">🤖 ${agentId}</div>`;
        html += `<div style="font-size:11px">${statusLabel}</div>`;
        if (usage) {
          const total = (usage.total_input_tokens || 0) + (usage.total_output_tokens || 0);
          html += `<div style="margin-top:4px;font-size:10px;color:${token.colorTextTertiary}">调用: <b>${escapeHtml(String(usage.calls))}</b>次 · Token: <b>${total.toLocaleString()}</b></div>`;
        }
      } else if (data.isGate) {
        const gateId = data.gateId as string;
        const state = getGateState(gateId);
        const stateLabel = state === 'passed' ? '✅ 已通过' : state === 'current' ? '🔵 进行中' : '⏳ 等待中';
        const desc = GATE_DESCRIPTIONS[gateId] || '';
        const gateInfo = pipelineGates?.find(g => g.gate === gateId);

        html += `<div style="font-weight:700;margin-bottom:4px">${GATE_ICONS[gateId] || ''} ${escapeHtml(gateId)}</div>`;
        html += `<div style="font-size:10px">${GATE_LABELS[gateId] || ''}</div>`;
        html += `<div style="font-size:10px;margin-top:2px">${stateLabel}</div>`;
        if (desc) html += `<div style="font-size:10px;color:${token.colorTextTertiary};margin-top:2px;max-width:200px">${escapeHtml(desc)}</div>`;
        if (gateInfo?.duration_display) html += `<div style="font-size:10px;color:${token.colorTextTertiary};margin-top:2px">⏱ 耗时: ${escapeHtml(gateInfo.duration_display)}</div>`;
        html += `<div style="font-size:9px;color:${token.colorTextQuaternary};margin-top:4px">点击查看该 Gate 的 Agent 详情</div>`;
      } else {
        return;
      }

      // 视口边界检测 + 智能翻转，防止 tooltip 溢出屏幕
      const tooltipW = 260; // maxWidth
      const tooltipH = 150; // 预估高度
      let left = pos.x + 14;
      let top = pos.y - 10;
      if (left + tooltipW > window.innerWidth - 10) {
        left = pos.x - tooltipW - 14; // 翻转到左侧
      }
      if (top + tooltipH > window.innerHeight - 10) {
        top = pos.y - tooltipH - 10; // 翻转到上方
      }
      left = Math.max(4, left);
      top = Math.max(4, top);

      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      requestAnimationFrame(() => {
        tooltip.style.opacity = '1';
      });
    };

    const hideTooltip = () => {
      tooltip.style.opacity = '0';
      hideTimerRef.current = setTimeout(() => {
        if (tooltip.style.opacity === '0') {
          tooltip.style.display = 'none';
        }
        hideTimerRef.current = null;
      }, 150);
    };

    graph.on('node:mouseenter', showTooltip);
    graph.on('node:mouseleave', hideTooltip);

    return () => {
      graph.off('node:mouseenter', showTooltip);
      graph.off('node:mouseleave', hideTooltip);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [agentUsage, allAgents, getGateState, pipelineGates, selectedGate, currentGate]);

  // 空状态
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
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      borderRadius: 12, border: `1.5px solid ${token.colorBorderSecondary}`,
      background: token.colorBgContainer, overflow: 'hidden',
    }}>
      <div ref={containerRef} style={{
        width: '100%', height: '100%',
        background: token.colorFillQuaternary,
      }} />

      {/* Tooltip */}
      <div ref={tooltipRef} style={{
        display: 'none', position: 'fixed', zIndex: 10000,
        background: token.colorBgElevated || token.colorBgContainer,
        border: `1.5px solid ${token.colorPrimaryBorder || token.colorBorder}`,
        borderRadius: 10, padding: '8px 12px', fontSize: 11,
        color: token.colorText,
        boxShadow: token.boxShadowSecondary || '0 4px 16px rgba(0,0,0,0.12)',
        pointerEvents: 'none', maxWidth: 260, lineHeight: 1.6,
        backdropFilter: 'blur(8px)',
        opacity: 0, transition: 'opacity 150ms ease, transform 150ms ease',
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
        <span style={{ cursor: 'pointer', pointerEvents: 'auto' }}>🖱 点击 Gate 查看 Agent</span>
      </div>

      {/* 共享缩放控制组件 */}
      <X6Controls
        onZoomIn={() => graphRef.current?.zoom(0.2)}
        onZoomOut={() => graphRef.current?.zoom(-0.2)}
        onZoomToFit={() => graphRef.current?.zoomToFit({ padding: 20, maxScale: 3, minScale: 0.3 })}
        showLegend={false}
      />
    </div>
  );
}

export { GATE_SEQUENCE, GATE_LABELS, GATE_SKIP_EDGES, GATE_DESCRIPTIONS };
