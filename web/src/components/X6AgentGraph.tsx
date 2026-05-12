import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Graph } from '@antv/x6';
import dagre from 'dagre';
import { theme } from 'antd';
import type { GlobalToken } from 'antd';
import type { AgentGateStatusResponse } from '../api';
import { NODE_SIZES, ANIMATION_DEFAULTS, AGENT_TYPE_COLORS } from '../constants/x6-theme';
import { useX6Animation } from '../hooks/useX6Animation';
import X6Controls, { DEFAULT_AGENT_TYPES } from './X6Controls';

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
// 每个 Gate 独立的 Agent 交互图（X6 版本）
// 不同 Gate 使用不同布局
// ============================================================

interface Props {
  selectedGate: string;
  gateStatus: AgentGateStatusResponse | null;
  style?: React.CSSProperties;
}

const ORCHESTRATOR = 'orchestrator';

/**
 * 根据 agent ID 匹配 AGENT_TYPE_COLORS 获取类型专属色
 * 按键长度降序确保更具体的类型优先匹配
 * 匹配不到则使用 status 对应的 antd token 默认色
 */
function getAgentColors(agentId: string, status: string, token: GlobalToken): { fill: string; stroke: string } {
  const lowerId = agentId.toLowerCase();
  // AGENT_TYPE_COLORS 已按键长度降序排列，直接遍历即可
  const entries = Object.entries(AGENT_TYPE_COLORS);
  for (const [typeKey, colors] of entries) {
    if (lowerId.includes(typeKey)) return colors;
  }
  // 匹配不到类型，使用 status 默认色（基于 antd token）
  switch (status) {
    case 'active':    return { fill: token.colorPrimaryBg, stroke: token.colorPrimary };
    case 'completed': return { fill: token.colorSuccessBg, stroke: token.colorSuccess };
    case 'failed':    return { fill: token.colorErrorBg, stroke: token.colorError };
    default:          return { fill: token.colorPrimaryBg, stroke: token.colorPrimary };
  }
}

// Agent emoji 图标
function agentIcon(agentId: string): string {
  if (agentId.includes('frontend')) return '🎨';
  if (agentId.includes('backend')) return '🔧';
  if (agentId.includes('test') || agentId.includes('e2e')) return '🧪';
  if (agentId.includes('review')) return '🔍';
  if (agentId.includes('architect')) return '🏗️';
  if (agentId.includes('security')) return '🛡️';
  if (agentId.includes('browser')) return '🌐';
  if (agentId.includes('android')) return '📱';
  if (agentId.includes('ios')) return '🍎';
  if (agentId.includes('flutter')) return '🦋';
  if (agentId.includes('taro')) return '🏪';
  if (agentId.includes('data') || agentId.includes('db') || agentId.includes('database')) return '💾';
  if (agentId.includes('api')) return '🔗';
  if (agentId.includes('algo')) return '🧮';
  if (agentId.includes('perf')) return '⚡';
  if (agentId.includes('docs')) return '📄';
  if (agentId.includes('qa')) return '✅';
  if (agentId.includes('planner')) return '📐';
  if (agentId.includes('planning')) return '📋';
  if (agentId.includes('explore')) return '🔎';
  if (agentId.includes('research')) return '📚';
  if (agentId.includes('deploy') || agentId.includes('infra')) return '🚀';
  if (agentId.includes('fix') || agentId.includes('remediation')) return '🔨';
  return '🤖';
}

// === 布局函数 ===

/** 环形布局 — Gate A（需求澄清）、Gate C1/C1.5/C2（质量验证）
 *  半径根据节点数量动态计算，确保 0-30 个 Agent 无重叠 */
function circularLayout(nodes: string[], cx: number, cy: number, radius?: number) {
  const positions: Record<string, { x: number; y: number }> = {};
  const n = nodes.length;
  if (n === 0) {
    positions[ORCHESTRATOR] = { x: cx, y: cy };
    return positions;
  }
  // 动态半径：Agent 越多半径越大，最小 130
  const r = radius ?? Math.max(130, nodes.length * 18);
  positions[ORCHESTRATOR] = { x: cx, y: cy };
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    positions[nodes[i]] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }
  return positions;
}

/** 树形布局 — Gate B-DDD/B-BDD/B-TDD（任务分解） */
function treeLayout(nodes: string[], cx: number, cy: number) {
  return dagreLayout(nodes, cx, cy, 'TB', 60, 100);
}

/** 网格布局 — Gate B1（架构评审） */
function gridLayout(nodes: string[], cx: number, cy: number) {
  const positions: Record<string, { x: number; y: number }> = {};
  const n = nodes.length;
  if (n === 0) {
    positions[ORCHESTRATOR] = { x: cx, y: cy };
    return positions;
  }
  const cols = Math.ceil(Math.sqrt(n));
  const cellW = 120, cellH = 100;
  const gridW = (cols - 1) * cellW;
  const gridH = (Math.ceil(n / cols) - 1) * cellH;
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions[nodes[i]] = {
      x: cx - gridW / 2 + col * cellW,
      y: cy - gridH / 2 + row * cellH,
    };
  }
  positions[ORCHESTRATOR] = { x: cx, y: cy - gridH / 2 - 60 };
  return positions;
}

/** 通用 dagre 布局 */
function dagreLayout(
  nodes: string[], cx: number, cy: number,
  rankdir: 'TB' | 'LR' = 'TB',
  nodesep = 60, ranksep = 110,
) {
  const positions: Record<string, { x: number; y: number }> = {};
  const allNodes = [ORCHESTRATOR, ...nodes];
  if (nodes.length === 0) {
    positions[ORCHESTRATOR] = { x: cx, y: cy };
    return positions;
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir, nodesep, ranksep, marginx: 20, marginy: 20 });

  g.setNode(ORCHESTRATOR, { width: NODE_SIZES.orchestrator.w, height: NODE_SIZES.orchestrator.h });
  for (const id of nodes) {
    g.setNode(id, { width: NODE_SIZES.subagent.w, height: NODE_SIZES.subagent.h });
    g.setEdge(ORCHESTRATOR, id);
  }

  dagre.layout(g);

  for (const id of allNodes) {
    const node = g.node(id);
    if (node) positions[id] = { x: node.x, y: node.y };
  }
  return positions;
}

/** 力导向布局（简单弹簧模型）— Gate C-impl
 *  通过排斥力（节点之间）和引力（编排者→节点）迭代收敛
 *  编排者固定在中心 */
function forceLayout(nodes: string[], cx: number, cy: number) {
  const positions: Record<string, { x: number; y: number }> = {};
  if (nodes.length === 0) {
    positions[ORCHESTRATOR] = { x: cx, y: cy };
    return positions;
  }
  positions[ORCHESTRATOR] = { x: cx, y: cy };

  const kRepel = 800;      // 排斥力系数（所有节点对之间），降低使节点更紧凑
  const kAttract = 0.05;   // 引力系数（编排者→子节点），提高增强向心力
  const maxIter = 100;     // 增加迭代次数确保收敛
  const damping = 0.85;    // 降低阻尼提高收敛速度

  const n = nodes.length;
  const vel: { x: number; y: number }[] = Array.from({ length: n }, () => ({ x: 0, y: 0 }));

  // 初始位置：圆形排列
  const initRadius = Math.max(140, n * 18);
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    positions[nodes[i]] = {
      x: cx + initRadius * Math.cos(angle),
      y: cy + initRadius * Math.sin(angle),
    };
  }

  // 迭代力模拟
  for (let iter = 0; iter < maxIter; iter++) {
    // 每轮迭代的合力累积（重置为零）
    const forces: { x: number; y: number }[] = Array.from({ length: n }, () => ({ x: 0, y: 0 }));

    // 节点间排斥力（Coulomb 定律）
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[nodes[i]].x - positions[nodes[j]].x;
        const dy = positions[nodes[i]].y - positions[nodes[j]].y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
        // 排斥力：F = kRepel / d^2，方向是远离对方
        const force = kRepel / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces[i].x += fx;
        forces[i].y += fy;
        forces[j].x -= fx;
        forces[j].y -= fy;
      }
    }

    // 编排者引力（Hooke 定律）
    for (let i = 0; i < n; i++) {
      const dx = cx - positions[nodes[i]].x;
      const dy = cy - positions[nodes[i]].y;
      // 引力：F = kAttract * d
      forces[i].x += kAttract * dx;
      forces[i].y += kAttract * dy;
    }

    // 更新速度与位置（阻尼衰减）
    for (let i = 0; i < n; i++) {
      vel[i].x = (vel[i].x + forces[i].x) * damping;
      vel[i].y = (vel[i].y + forces[i].y) * damping;
      positions[nodes[i]].x += vel[i].x;
      positions[nodes[i]].y += vel[i].y;
    }
  }

  // 半径约束：节点距中心超过 300px 时回弹到 250px，确保紧凑围绕
  for (let i = 0; i < n; i++) {
    const dx = positions[nodes[i]].x - cx;
    const dy = positions[nodes[i]].y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 300) {
      const angle = Math.atan2(dy, dx);
      positions[nodes[i]].x = cx + 250 * Math.cos(angle);
      positions[nodes[i]].y = cy + 250 * Math.sin(angle);
    }
  }

  return positions;
}

/** 星形布局 — Gate D（审查签核） */
function starLayout(nodes: string[], cx: number, cy: number) {
  const positions: Record<string, { x: number; y: number }> = {};
  const n = nodes.length;
  if (n === 0) {
    positions[ORCHESTRATOR] = { x: cx, y: cy };
    return positions;
  }
  positions[ORCHESTRATOR] = { x: cx, y: cy };

  // 两层：内层半径 120，外层半径 210
  const halfN = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    const isInner = i < halfN;
    const r = isInner ? 120 : 210;
    const idx = isInner ? i : i - halfN;
    const total = isInner ? halfN : n - halfN;
    const angle = (2 * Math.PI * idx) / total - Math.PI / 2;
    positions[nodes[i]] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }
  return positions;
}

/** 线性布局 — Gate E（发布上线） */
function linearLayout(nodes: string[], cx: number, cy: number) {
  const positions: Record<string, { x: number; y: number }> = {};
  const allNodes = [ORCHESTRATOR, ...nodes];
  const n = allNodes.length;
  const stepX = 130;
  const startX = cx - ((n - 1) * stepX) / 2;
  for (let i = 0; i < n; i++) {
    positions[allNodes[i]] = { x: startX + i * stepX, y: cy };
  }
  return positions;
}

/** 根据 Gate 类型选择布局 */
function getLayoutForGate(gate: string, agents: string[], cx: number, cy: number) {
  const short = gate.replace('Gate ', '');
  switch (short) {
    case 'A':
      return circularLayout(agents, cx, cy);
    case 'B-DDD':
    case 'B-BDD':
    case 'B-TDD':
      return treeLayout(agents, cx, cy);
    case 'B1':
      return gridLayout(agents, cx, cy);
    case 'C':
      return dagreLayout(agents, cx, cy, 'TB', 50, 80);
    case 'C-impl':
      return forceLayout(agents, cx, cy);
    case 'C1':
    case 'C1.5':
    case 'C2':
      return circularLayout(agents, cx, cy);
    case 'D':
      return starLayout(agents, cx, cy);
    case 'E':
      return linearLayout(agents, cx, cy);
    default:
      return circularLayout(agents, cx, cy);
  }
}

// ============================================================
// Gate 中文名
// ============================================================

const GATE_TITLES: Record<string, string> = {
  'Gate A': '需求澄清 · 探索 Agent',
  'Gate B-DDD': '领域驱动设计 · 分析 Agent',
  'Gate B-BDD': '行为驱动开发 · 场景 Agent',
  'Gate B-TDD': '测试驱动开发 · 任务 Agent',
  'Gate B1': '架构评审 · 架构师 Agent',
  'Gate C': '执行规划 · 规划 Agent',
  'Gate C-impl': '并行实现 · 实现 Agent',
  'Gate C1': '代码质量门 · 检查 Agent',
  'Gate C1.5': '视觉验证 · 预览 Agent',
  'Gate C2': '测试验证 · 测试 Agent',
  'Gate D': '审查签核 · 审查 Agent',
  'Gate E': '发布上线 · 部署 Agent',
};

// ============================================================
// 组件
// ============================================================

export default function X6AgentGraph({ selectedGate, gateStatus, style }: Props) {
  const { token } = theme.useToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const destroyedRef = useRef(false);
  /** 记录曾渲染过的节点 ID，用于判断新节点触发入场动画 */
  const prevAgentIdsRef = useRef<Set<string>>(new Set());
  /** 记录上次渲染参数，容器尺寸变化 < 10% 时跳过图重建 */
  const prevRenderRef = useRef<{ size: { w: number; h: number }; selectedGate: string; agentIds: string[] }>({
    size: { w: 0, h: 0 },
    selectedGate: '',
    agentIds: [],
  });
  const [size, setSize] = useState({ w: 600, h: 400 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 当前 Gate 下的 Agent 列表
  const agents = useMemo(() => {
    if (!gateStatus?.gates) return [];
    return gateStatus.gates[selectedGate]?.agents || [];
  }, [gateStatus, selectedGate]);

  const agentIds = useMemo(() => agents.map(a => a.agent_id), [agents]);

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setSize({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 初始化 X6
  useEffect(() => {
    if (!containerRef.current) return;
    const { w, h } = size;
    if (w === 0 || h === 0) return;

    destroyedRef.current = false;

    const graph = new Graph({
      container: containerRef.current,
      width: w,
      height: h,
      background: { color: 'transparent' },
      interacting: { nodeMovable: false, edgeMovable: false },
      autoResize: false,
      mousewheel: { enabled: true, modifiers: 'ctrl', minScale: 0.3, maxScale: 3.0 },
    });

    graphRef.current = graph;

    return () => {
      destroyedRef.current = true;
      try { graph.dispose(); } catch {}
      graphRef.current = null;
    };
  }, []);

  // 渲染图
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || destroyedRef.current) return;

    // 容器尺寸变化阈值守卫：变化 < 10% 且 agent/gate 未变时跳过重建
    const prev = prevRenderRef.current;
    const agentsChanged = prev.selectedGate !== selectedGate
      || prev.agentIds.length !== agentIds.length
      || prev.agentIds.some((id, i) => id !== agentIds[i]);
    const sizeChanged = prev.size.w > 0 && prev.size.h > 0 && (
      Math.abs(size.w - prev.size.w) >= prev.size.w * 0.1
      || Math.abs(size.h - prev.size.h) >= prev.size.h * 0.1
    );

    if (!agentsChanged && !sizeChanged) return;

    prevRenderRef.current = { size, selectedGate, agentIds };

    const { w, h } = size;
    const cx = w / 2;
    const cy = h / 2;

    // 选择布局
    const positions = getLayoutForGate(selectedGate, agentIds, cx, cy);

    // 清除旧内容
    graph.clearCells();

    const dur = ANIMATION_DEFAULTS.entranceDuration;
    const cssTransition = `opacity ${dur}ms ease-out`;

    const orchPos = positions[ORCHESTRATOR];
    if (orchPos) {
      graph.addNode({
        id: ORCHESTRATOR,
        x: orchPos.x - NODE_SIZES.orchestrator.w / 2,
        y: orchPos.y - NODE_SIZES.orchestrator.h / 2,
        width: NODE_SIZES.orchestrator.w,
        height: NODE_SIZES.orchestrator.h,
        shape: 'rect',
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'rect', selector: 'innerBorder' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          body: {
            fill: token.colorWarningBg,
            stroke: token.colorWarning,
            strokeWidth: 4,
            rx: 40, ry: 40,
            filter: 'drop-shadow(0 0 12px rgba(250,140,22,0.35))',
            style: `${cssTransition}; transform-origin: center; transform-box: fill-box;`,
          },
          innerBorder: {
            fill: 'none',
            stroke: token.colorWarningBorder,
            strokeWidth: 1.5,
            rx: 35, ry: 35,
            refX: 5,
            refY: 5,
            refWidth: 70,
            refHeight: 70,
          },
          label: {
            text: '🧠\n编排者',
            fill: token.colorWarningActive ?? token.colorWarningText,
            fontSize: NODE_SIZES.orchestrator.fontSize,
            fontWeight: 'bold',
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
          },
        },
        data: { type: 'orchestrator', status: 'active' },
      });
    }

    // 子 Agent 节点 — 按类型着色，类型无匹配时回退到 status 默认色
    for (const agent of agents) {
      const pos = positions[agent.agent_id];
      if (!pos) continue;
      const colors = getAgentColors(agent.agent_id, agent.status, token);
      const icon = agentIcon(agent.agent_id);
      const name = agent.agent_id.length > 17 ? agent.agent_id.substring(0, 16) + '…' : agent.agent_id;
      const nodeSize = NODE_SIZES.subagent.w;
      const isActive = agent.status === 'active';
      // CSS 变量颜色无法拼接透明度后缀，回退到中性阴影
      const activeFilter = isActive
        ? (colors.stroke.startsWith('#')
            ? `drop-shadow(0 0 6px ${colors.stroke}40)`
            : 'drop-shadow(0 0 6px rgba(0,0,0,0.12))')
        : undefined;

      graph.addNode({
        id: agent.agent_id,
        x: pos.x - nodeSize / 2,
        y: pos.y - nodeSize / 2,
        width: nodeSize,
        height: nodeSize,
        shape: 'ellipse',
        attrs: {
          body: {
            fill: colors.fill,
            stroke: colors.stroke,
            strokeWidth: isActive ? 3 : 2,
            rx: nodeSize / 2, ry: nodeSize / 2,
            filter: activeFilter,
            style: `${cssTransition}; transform-origin: center; transform-box: fill-box;`,
          },
          label: {
            text: `${icon} ${name}`,
            fill: token.colorText,
            fontSize: 11,
            textAnchor: 'middle',
            textVerticalAnchor: 'top',
            refY: nodeSize / 2 + 5,
          },
        },
        data: { type: 'subagent', status: agent.status, model: agent.model },
      });

      // 连线：编排者 → 子 Agent
      const edgeStroke = agent.status === 'active' ? token.colorPrimary
        : agent.status === 'completed' ? token.colorSuccess
        : agent.status === 'failed' ? token.colorError
        : token.colorBorderSecondary;

      graph.addEdge({
        id: `${ORCHESTRATOR}->${agent.agent_id}`,
        source: { cell: ORCHESTRATOR },
        target: { cell: agent.agent_id },
        attrs: {
          line: {
            stroke: edgeStroke,
            strokeWidth: 2.5,
            strokeDasharray: agent.status === 'active' ? '4,3' : undefined,
            targetMarker: { name: 'block', width: 7, height: 5 },
          },
        },
        data: { status: agent.status },
      });
    }

    // 新节点入场动画：初始不可见/缩小，下一帧通过 CSS transition 过渡到正常
    const prevIds = prevAgentIdsRef.current;
    const newIds: string[] = [];
    if (!prevIds.has(ORCHESTRATOR)) {
      const orchNode = graph.getCellById(ORCHESTRATOR);
      if (orchNode && orchNode.isNode()) {
        orchNode.setAttrs({
          body: {
            opacity: 0,
            style: `opacity: 0; transform: scale(0.3); transform-origin: center; transform-box: fill-box; ${cssTransition};`,
          },
        });
      }
      newIds.push(ORCHESTRATOR);
    }
    for (const agent of agents) {
      if (!prevIds.has(agent.agent_id)) {
        const node = graph.getCellById(agent.agent_id);
        if (node && node.isNode()) {
          node.setAttrs({
            body: {
              opacity: 0,
              style: `opacity: 0; transform: scale(0.3); transform-origin: center; transform-box: fill-box; ${cssTransition};`,
            },
          });
        }
        newIds.push(agent.agent_id);
      }
    }
    // 延迟一帧后恢复 opacity → 1, scale → 1，CSS transition 接管过渡
    if (newIds.length > 0) {
      requestAnimationFrame(() => {
        if (destroyedRef.current) return;
        const finalStyle = `opacity: 1; transform: scale(1); transform-origin: center; transform-box: fill-box; ${cssTransition};`;
        for (const id of newIds) {
          const node = graph.getCellById(id);
          if (node && node.isNode()) {
            node.setAttrs({ body: { opacity: 1, style: finalStyle } });
          }
        }
      });
    }
    // 更新已见节点 ID 集合
    prevAgentIdsRef.current = new Set([ORCHESTRATOR, ...agentIds]);

    // 无 Agent 时显示提示
    if (agents.length === 0) {
      graph.addNode({
        id: 'placeholder',
        x: cx - 90,
        y: cy - 20,
        width: 180,
        height: 40,
        shape: 'rect',
        attrs: {
          body: { fill: 'transparent', stroke: 'none' },
          label: {
            text: '等待子 Agent 启动...',
            fill: token.colorTextQuaternary,
            fontSize: 14,
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
          },
        },
      });
    }

    graph.zoomToFit({ padding: { top: 20, right: 20, bottom: 20, left: 20 }, maxScale: 3.0, minScale: 0.3 });
  }, [agents, selectedGate, size]);

  // 统一的 RAF 动画循环：呼吸动画 + 页面可见性自动暂停/恢复
  // 编排者仅保留静态发光效果（drop-shadow），不参与呼吸动画
  // 子 Agent 仅 active 状态呼吸，completed/failed 静止
  useX6Animation(graphRef.current, {
    breath: {
      enabled: true,
      amplitude: ANIMATION_DEFAULTS.breathAmplitude,
      frequency: ANIMATION_DEFAULTS.breathFrequency,
      nodeFilter: (node) => {
        const data = node.getData();
        return data?.type === 'subagent' && data?.status === 'active';
      },
    },
    transitions: {
      entranceDuration: ANIMATION_DEFAULTS.entranceDuration,
      exitDuration: ANIMATION_DEFAULTS.exitDuration,
    },
  });

  // Tooltip
  useEffect(() => {
    const graph = graphRef.current;
    const tooltip = tooltipRef.current;
    if (!graph || !tooltip) return;

    const show = (args: any) => {
      const cell = args.cell;
      if (!cell) return;
      const data = cell.getData();
      if (!data) return;
      const pos = args.e ? { x: args.e.clientX, y: args.e.clientY } : { x: 0, y: 0 };

      if (data.type === 'subagent') {
        const agent = agents.find(a => a.agent_id === cell.id);
        const safeId = escapeHtml(cell.id as string);
        const safeModel = escapeHtml(data.model as string ?? '');
        const statusLabel = data.status === 'active' ? '🟢 运行中'
          : data.status === 'completed' ? '✅ 已完成' : '❌ 失败';
        let html = `<div style="font-weight:700;margin-bottom:4px">${agentIcon(cell.id as string)} ${safeId}</div>`;
        html += `<div style="font-size:11px">${statusLabel}</div>`;
        if (data.model) html += `<div style="font-size:10px;color:${token.colorTextQuaternary}">模型: ${safeModel}</div>`;
        if (agent?.status === 'active') html += `<div style="font-size:10px;color:${token.colorSuccess};margin-top:2px">● 正在执行任务...</div>`;
        tooltip.innerHTML = html;
        applyTooltipPosition(pos);
        tooltip.style.opacity = '1';
        tooltip.style.pointerEvents = 'none';
      }

      if (data.type === 'orchestrator') {
        const html = `<div style="font-weight:700">🧠 编排者</div>`
          + `<div style="font-size:11px;color:${token.colorTextTertiary}">Jarvis 主控 Agent</div>`
          + `<div style="font-size:10px;color:${token.colorTextQuaternary};margin-top:2px">调度所有子 Agent 执行任务</div>`;
        tooltip.innerHTML = html;
        applyTooltipPosition(pos);
        tooltip.style.opacity = '1';
        tooltip.style.pointerEvents = 'none';
      }
    };

    /** 设置 tooltip 位置，含视口边界检测与智能翻转 */
    const applyTooltipPosition = (pos: { x: number; y: number }) => {
      const tooltipW = 240; // maxWidth
      let left = pos.x + 14;
      let top = pos.y - 10;
      if (left + tooltipW > window.innerWidth - 10) {
        left = pos.x - tooltipW - 14; // 翻转到左侧
      }
      if (top + 180 > window.innerHeight - 10) {
        top = pos.y - 180 - 10; // 翻转到上方
      }
      left = Math.max(4, left);
      top = Math.max(4, top);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    const hide = () => {
      tooltip.style.opacity = '0';
      tooltip.style.pointerEvents = 'none';
    };

    graph.on('node:mouseenter', show);
    graph.on('node:mouseleave', hide);

    // 移动端长按触发 tooltip
    const touchTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
    graph.on('node:touchstart', ({ cell, e }: { cell: any; e: any }) => {
      const timer = setTimeout(() => show({ cell, e }), 500); // 500ms 长按
      touchTimers.set(cell.id, timer);
    });
    graph.on('node:touchend', ({ cell }: { cell: any }) => {
      const timer = touchTimers.get(cell.id);
      if (timer) { clearTimeout(timer); touchTimers.delete(cell.id); }
      hide();
    });

    return () => {
      graph.off('node:mouseenter', show);
      graph.off('node:mouseleave', hide);
      graph.off('node:touchstart');
      graph.off('node:touchend');
      // 清理未触发的长按定时器
      for (const timer of touchTimers.values()) clearTimeout(timer);
      touchTimers.clear();
    };
  }, [agents]);

  // 空状态
  if (agents.length === 0) {
    return (
      <div style={{ position: 'relative', ...style }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ textAlign: 'center', color: token.colorTextQuaternary }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: token.colorTextSecondary }}>
              {selectedGate}
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              等待子 Agent 启动...
            </div>
            <div style={{ fontSize: 11, marginTop: 8, color: token.colorTextTertiary }}>
              Hook 触发 SubagentStart 后自动出现
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', ...style }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Gate 标题 */}
      <div style={{
        position: 'absolute', top: 8, left: 12, zIndex: 10, pointerEvents: 'none',
        fontSize: 13, fontWeight: 600, color: token.colorText,
        background: token.colorBgContainer, padding: '2px 10px',
        borderRadius: 6, opacity: 0.85,
      }}>
        {GATE_TITLES[selectedGate] || selectedGate}
      </div>

      {/* Agent 计数标签栏 */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8, right: 8,
        display: 'flex', gap: 6, zIndex: 10, pointerEvents: 'none',
      }}>
        {[
          { label: '活跃', count: agents.filter(a => a.status === 'active').length, icon: '🟢', color: token.colorPrimary, bg: token.colorPrimaryBg },
          { label: '已完成', count: agents.filter(a => a.status === 'completed').length, icon: '✅', color: token.colorSuccess, bg: token.colorSuccessBg },
          { label: '失败', count: agents.filter(a => a.status === 'failed').length, icon: '❌', color: token.colorError, bg: token.colorErrorBg },
        ].filter(b => b.count > 0).map(b => (
          <span key={b.label} style={{
            fontSize: 11, background: b.bg, color: b.color,
            padding: '2px 8px', borderRadius: 4, fontWeight: 600,
          }}>
            {b.icon} {b.count} {b.label}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      <div ref={tooltipRef} style={{
        opacity: 0, position: 'fixed', zIndex: 10000,
        background: token.colorBgElevated || token.colorBgContainer,
        border: `1.5px solid ${token.colorPrimaryBorder || token.colorBorder}`,
        borderRadius: 10, padding: '8px 12px', fontSize: 11,
        color: token.colorText,
        boxShadow: token.boxShadowSecondary || '0 4px 16px rgba(0,0,0,0.12)',
        pointerEvents: 'none', maxWidth: 240, lineHeight: 1.6,
        transition: 'opacity 150ms ease, transform 150ms ease',
      }} />

      {/* 共享缩放控制组件 + Agent 类型图例 */}
      <X6Controls
        onZoomIn={() => graphRef.current?.zoom(0.2)}
        onZoomOut={() => graphRef.current?.zoom(-0.2)}
        onZoomToFit={() => graphRef.current?.zoomToFit({ padding: 20, maxScale: 3, minScale: 0.3 })}
        agentTypes={DEFAULT_AGENT_TYPES}
        showLegend={true}
      />
    </div>
  );
}
