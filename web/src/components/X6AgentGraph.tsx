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

export const ORCHESTRATOR = 'orchestrator';

/**
 * TASK-002 节点尺寸常量（与 NODE_SIZES.orchestrator/subagent 不同，
 * 因需求明确指定 100x50 / 64x40 且 NODE_SIZES 不可修改）
 */
const ORCH_W = 100;
const ORCH_H = 50;
const ORCH_FONT_SIZE = 13;
const SUB_W = 64;
const SUB_H = 40;
const SUB_FONT_SIZE = 9;
const SUB_RX = 8;

/** 最小画布尺寸 */
const MIN_CANVAS_W = 600;
const MIN_CANVAS_H = 500;

/**
 * 格式化 Token 数量为人类可读字符串
 * @param tokens - Token 数量
 */
export function formatTokens(tokens: number | undefined | null): string {
  if (tokens == null) return '--';
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return String(tokens);
}

/**
 * 格式化耗时（毫秒）为人类可读字符串
 * @param ms - 毫秒数
 */
export function formatDuration(ms: number | undefined | null): string {
  if (ms == null) return '--';
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)}min`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

/**
 * 根据 agent ID 匹配 AGENT_TYPE_COLORS 获取类型专属色
 * 按键长度降序确保更具体的类型优先匹配
 * 匹配不到则使用 status 对应的 antd token 默认色
 */
export function getAgentColors(agentId: string, status: string, token: GlobalToken): { fill: string; stroke: string } {
  const lowerId = agentId.toLowerCase();
  const entries = Object.entries(AGENT_TYPE_COLORS);
  for (const [typeKey, colors] of entries) {
    if (lowerId.includes(typeKey)) return colors;
  }
  switch (status) {
    case 'active':    return { fill: token.colorPrimaryBg, stroke: token.colorPrimary };
    case 'completed': return { fill: token.colorSuccessBg, stroke: token.colorSuccess };
    case 'failed':    return { fill: token.colorErrorBg, stroke: token.colorError };
    case 'pending':   return { fill: token.colorFillQuaternary, stroke: token.colorBorderSecondary };
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
export function circularLayout(nodes: string[], cx: number, cy: number, radius?: number) {
  const positions: Record<string, { x: number; y: number }> = {};
  const n = nodes.length;
  if (n === 0) {
    positions[ORCHESTRATOR] = { x: cx, y: cy };
    return positions;
  }
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

/**
 * 力导向布局（简单弹簧模型）— Gate C-impl
 * 通过排斥力（节点之间）和引力（编排者→节点）迭代收敛。
 * 编排者固定在中心。收敛失败时回退到环形布局。
 *
 * @param nodes - Agent ID 数组
 * @param cx - 画布中心 x
 * @param cy - 画布中心 y
 * @returns 位置映射
 */
export function forceLayout(nodes: string[], cx: number, cy: number) {
  const positions: Record<string, { x: number; y: number }> = {};
  if (nodes.length === 0) {
    positions[ORCHESTRATOR] = { x: cx, y: cy };
    return positions;
  }
  positions[ORCHESTRATOR] = { x: cx, y: cy };

  const kRepel = 5000;
  const kAttract = 0.01;
  const maxIter = 80;
  const damping = 0.9;
  /** 收敛阈值：节点间最小距离（px） */
  const MIN_SPACING = 30;

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
    const forces: { x: number; y: number }[] = Array.from({ length: n }, () => ({ x: 0, y: 0 }));

    // 节点间排斥力（Coulomb 定律）
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[nodes[i]].x - positions[nodes[j]].x;
        const dy = positions[nodes[i]].y - positions[nodes[j]].y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
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

  // 收敛检查：节点最小间距 >= MIN_SPACING
  let minDist = Infinity;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = positions[nodes[i]].x - positions[nodes[j]].x;
      const dy = positions[nodes[i]].y - positions[nodes[j]].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) minDist = dist;
    }
  }

  // 收敛失败时回退到环形布局
  if (n > 1 && minDist < MIN_SPACING) {
    return circularLayout(nodes, cx, cy);
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
export function getLayoutForGate(gate: string, agents: string[], cx: number, cy: number) {
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
  const [size, setSize] = useState({ w: MIN_CANVAS_W, h: MIN_CANVAS_H });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 当前 Gate 下的 Agent 列表
  const agents = useMemo(() => {
    if (!gateStatus?.gates) return [];
    return gateStatus.gates[selectedGate]?.agents || [];
  }, [gateStatus, selectedGate]);

  const agentIds = useMemo(() => agents.map(a => a.agent_id), [agents]);

  // ResizeObserver — 回调内取 max(实际, MIN_CANVAS) 确保最小画布
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setSize({ w: Math.max(width, MIN_CANVAS_W), h: Math.max(height, MIN_CANVAS_H) });
        }
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
      try { graph.dispose(); } catch { /* ignore */ }
      graphRef.current = null;
    };
  }, []);

  // 渲染图
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || destroyedRef.current) return;

    const { w, h } = size;
    const cx = w / 2;
    const cy = h / 2;

    // 选择布局
    const positions = getLayoutForGate(selectedGate, agentIds, cx, cy);

    // 清除旧内容
    graph.clearCells();

    const dur = ANIMATION_DEFAULTS.entranceDuration;
    const cssTransition = `opacity ${dur}ms ease-out`;

    // ---- 编排者节点（中央）----
    const orchPos = positions[ORCHESTRATOR];
    if (orchPos) {
      // 发光 filter：仅当 token.colorPrimary 为 hex 时使用，否则回退到中性阴影
      const primaryColor = token.colorPrimary;
      const glowFilter = primaryColor.startsWith('#')
        ? `drop-shadow(0 0 14px ${primaryColor}40)`
        : 'drop-shadow(0 0 10px rgba(0,0,0,0.15))';

      const gateTitle = GATE_TITLES[selectedGate] || selectedGate;

      graph.addNode({
        id: ORCHESTRATOR,
        x: orchPos.x - ORCH_W / 2,
        y: orchPos.y - ORCH_H / 2,
        width: ORCH_W,
        height: ORCH_H,
        shape: 'rect',
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'rect', selector: 'innerBorder' },
          { tagName: 'text', selector: 'label' },
          { tagName: 'text', selector: 'gateLabel' },
        ],
        attrs: {
          body: {
            fill: token.colorPrimaryBg,
            stroke: token.colorPrimary,
            strokeWidth: 4,
            rx: ORCH_H / 2,
            ry: ORCH_H / 2,
            filter: glowFilter,
            style: `${cssTransition}; transform-origin: center; transform-box: fill-box;`,
          },
          innerBorder: {
            fill: 'none',
            stroke: token.colorPrimaryBorder || token.colorPrimary,
            strokeWidth: 1.5,
            rx: ORCH_H / 2 - 5,
            ry: ORCH_H / 2 - 5,
            refX: 5,
            refY: 5,
            refWidth: ORCH_W - 10,
            refHeight: ORCH_H - 10,
          },
          label: {
            text: '🧠 编排者',
            fill: token.colorPrimaryActive ?? token.colorPrimaryText ?? token.colorPrimary,
            fontSize: ORCH_FONT_SIZE,
            fontWeight: 'bold',
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
            refY: -3,
          },
          gateLabel: {
            text: gateTitle,
            fill: token.colorTextSecondary,
            fontSize: 9,
            textAnchor: 'middle',
            textVerticalAnchor: 'top',
            refY: ORCH_H / 2 + 3,
          },
        },
        data: { type: 'orchestrator', status: 'active' },
      });
    }

    // ---- 子 Agent 节点 ----
    for (const agent of agents) {
      const pos = positions[agent.agent_id];
      if (!pos) continue;

      const colors = getAgentColors(agent.agent_id, agent.status, token);
      const icon = agentIcon(agent.agent_id);

      // Agent ID 截断至 15 字符
      const name = agent.agent_id.length > 15
        ? `${agent.agent_id.substring(0, 14)}…`
        : agent.agent_id;

      const isActive = agent.status === 'active';
      const isCompleted = agent.status === 'completed';
      const isFailed = agent.status === 'failed';
      const isPending = agent.status === 'pending';

      // 呼吸动画 filter
      const activeFilter = isActive && colors.stroke.startsWith('#')
        ? `drop-shadow(0 0 6px ${colors.stroke}40)`
        : undefined;

      // 状态图标
      const statusIcon = isActive ? '🟢'
        : isCompleted ? '✅'
        : isFailed ? '❌'
        : '⏳';

      // Token 与耗时（从 agent 数据中可选读取）
      const agentData = agent as Record<string, unknown>;
      const tokenDisplay = formatTokens(agentData.total_tokens as number | undefined);
      const durationDisplay = formatDuration(agentData.duration_ms as number | undefined);

      // 信息行：状态图标 + Token + 耗时
      const infoText = `${statusIcon} T:${tokenDisplay} D:${durationDisplay}`;

      // pending 状态使用虚线边框
      const strokeDash = isPending ? '4,3' : undefined;

      graph.addNode({
        id: agent.agent_id,
        x: pos.x - SUB_W / 2,
        y: pos.y - SUB_H / 2,
        width: SUB_W,
        height: SUB_H,
        shape: 'rect',
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'text', selector: 'nameLabel' },
          { tagName: 'text', selector: 'infoLabel' },
        ],
        attrs: {
          body: {
            fill: colors.fill,
            stroke: colors.stroke,
            strokeWidth: isActive ? 3 : 2,
            rx: SUB_RX,
            ry: SUB_RX,
            strokeDasharray: strokeDash,
            filter: activeFilter,
            style: `${cssTransition}; transform-origin: center; transform-box: fill-box;`,
          },
          nameLabel: {
            text: `${icon} ${name}`,
            fill: token.colorText,
            fontSize: SUB_FONT_SIZE,
            textAnchor: 'middle',
            fontWeight: 600,
            refX: SUB_W / 2,
            refY: 7,
          },
          infoLabel: {
            text: infoText,
            fill: token.colorTextSecondary,
            fontSize: 8,
            textAnchor: 'middle',
            refX: SUB_W / 2,
            refY: 22,
          },
        },
        data: { type: 'subagent', status: agent.status, model: agent.model },
      });

      // ---- 连线：编排者 → 子 Agent ----
      const edgeStroke = isActive ? token.colorPrimary
        : isCompleted ? token.colorSuccess
        : isFailed ? token.colorError
        : isPending ? token.colorBorderSecondary
        : token.colorBorderSecondary;

      // Token 数量映射线宽：1-3px
      const tokenCount = agentData.total_tokens as number | undefined;
      const edgeWidth = tokenCount != null
        ? Math.max(1, Math.min(3, 1 + (tokenCount / 5000) * 2))
        : 2;

      const edgeDash = (isActive || isPending) ? '4,3' : undefined;

      graph.addEdge({
        id: `${ORCHESTRATOR}->${agent.agent_id}`,
        source: { cell: ORCHESTRATOR },
        target: { cell: agent.agent_id },
        attrs: {
          line: {
            stroke: edgeStroke,
            strokeWidth: edgeWidth,
            strokeDasharray: edgeDash,
            targetMarker: { name: 'block', width: 7, height: 5 },
          },
        },
        data: { status: agent.status },
      });
    }

    // ---- 入场动画 ----
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
    prevAgentIdsRef.current = new Set([ORCHESTRATOR, ...agentIds]);

    graph.zoomToFit({ padding: { top: 20, right: 20, bottom: 20, left: 20 }, maxScale: 3.0, minScale: 0.3 });
  }, [agents, selectedGate, size]);

  // 统一的 RAF 动画循环
  useX6Animation(graphRef.current, {
    breath: {
      enabled: true,
      amplitude: ANIMATION_DEFAULTS.breathAmplitude,
      frequency: ANIMATION_DEFAULTS.breathFrequency,
      nodeFilter: (node) => {
        const data = node.getData();
        return data?.type === 'subagent' || data?.type === 'orchestrator';
      },
    },
    transitions: {
      entranceDuration: ANIMATION_DEFAULTS.entranceDuration,
      exitDuration: ANIMATION_DEFAULTS.exitDuration,
    },
  }, [agents]);

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
        const safeModel = escapeHtml((data.model as string) ?? '');
        const agentData = agent ? (agent as Record<string, unknown>) : null;
        const statusLabel = data.status === 'active' ? '🟢 运行中'
          : data.status === 'completed' ? '✅ 已完成'
          : data.status === 'failed' ? '❌ 失败'
          : data.status === 'pending' ? '⏳ 等待中'
          : '⏳ 等待中';

        // 组装 tooltip HTML（所有动态数据均经过 escapeHtml 防护）
        let html = `<div style="font-weight:700;margin-bottom:4px">${agentIcon(cell.id as string)} ${safeId}</div>`;
        html += `<div style="font-size:11px;margin-bottom:2px">${statusLabel}</div>`;

        // 模型信息
        if (data.model || safeModel) {
          html += `<div style="font-size:10px;color:${token.colorTextQuaternary}">模型: ${safeModel || '--'}</div>`;
        }

        // Token 用量详情（输入/输出/缓存）
        const inputTokens = agentData?.input_tokens as number | undefined;
        const outputTokens = agentData?.output_tokens as number | undefined;
        const totalTokens = agentData?.total_tokens as number | undefined;
        if (totalTokens != null || inputTokens != null || outputTokens != null) {
          html += `<div style="font-size:10px;color:${token.colorTextTertiary};margin-top:2px">`;
          const total = totalTokens ?? (inputTokens ?? 0) + (outputTokens ?? 0);
          html += `Token: <b>${formatTokens(total)}</b>`;
          if (inputTokens != null || outputTokens != null) {
            html += ` (入 ${formatTokens(inputTokens)} / 出 ${formatTokens(outputTokens)})`;
          }
          html += `</div>`;
        }

        // 耗时
        const durationMs = agentData?.duration_ms as number | undefined;
        const durationDisplay = agentData?.duration_display as string | undefined;
        if (durationMs != null || durationDisplay != null) {
          html += `<div style="font-size:10px;color:${token.colorTextTertiary}">耗时: ${escapeHtml(durationDisplay ?? formatDuration(durationMs))}</div>`;
        }

        // 开始时间
        const startedAt = agentData?.started_at as string | undefined;
        if (startedAt) {
          html += `<div style="font-size:10px;color:${token.colorTextQuaternary}">开始: ${escapeHtml(startedAt)}</div>`;
        }

        // 错误信息（仅失败状态显示）
        const errorMsg = agentData?.error_message as string | undefined;
        if (data.status === 'failed' && errorMsg) {
          html += `<div style="font-size:10px;color:${token.colorError};margin-top:2px;max-width:220px;word-break:break-all">错误: ${escapeHtml(errorMsg)}</div>`;
        } else if (data.status === 'active') {
          html += `<div style="font-size:10px;color:${token.colorSuccess};margin-top:2px">● 正在执行任务...</div>`;
        }

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

    const applyTooltipPosition = (pos: { x: number; y: number }) => {
      const tooltipW = 240;
      let left = pos.x + 14;
      let top = pos.y - 10;
      if (left + tooltipW > window.innerWidth - 10) {
        left = pos.x - tooltipW - 14;
      }
      if (top + 240 > window.innerHeight - 10) {
        top = pos.y - 240 - 10;
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

    const touchTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
    graph.on('node:touchstart', ({ cell, e }: { cell: any; e: any }) => {
      const timer = setTimeout(() => show({ cell, e }), 500);
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
            <div style={{ fontSize: 48, marginBottom: 12 }}>{'🤖'}</div>
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
