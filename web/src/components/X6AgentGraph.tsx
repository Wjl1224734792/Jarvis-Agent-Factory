import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Graph } from '@antv/x6';
import dagre from 'dagre';
import { theme } from 'antd';
import type { AgentGateStatusResponse } from '../api';

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

// Agent 状态颜色
const STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  active:    { fill: '#F6FFED', stroke: '#52C41A' },
  completed: { fill: '#E6F7FF', stroke: '#1677FF' },
  failed:    { fill: '#FFF2F0', stroke: '#FF4D4F' },
};

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

/** 环形布局 — Gate A（需求澄清）、Gate C1/C1.5/C2（质量验证） */
function circularLayout(nodes: string[], cx: number, cy: number, radius: number) {
  const positions: Record<string, { x: number; y: number }> = {};
  const n = nodes.length;
  if (n === 0) {
    positions[ORCHESTRATOR] = { x: cx, y: cy };
    return positions;
  }
  positions[ORCHESTRATOR] = { x: cx, y: cy };
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    positions[nodes[i]] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
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
  const cellW = 100, cellH = 80;
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
  nodesep = 50, ranksep = 90,
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

  g.setNode(ORCHESTRATOR, { width: 64, height: 64 });
  for (const id of nodes) {
    g.setNode(id, { width: 48, height: 48 });
    g.setEdge(ORCHESTRATOR, id);
  }

  dagre.layout(g);

  for (const id of allNodes) {
    const node = g.node(id);
    if (node) positions[id] = { x: node.x, y: node.y };
  }
  return positions;
}

/** 力导向模拟简化版 — Gate C-impl */
function forceLayout(nodes: string[], cx: number, cy: number) {
  const positions: Record<string, { x: number; y: number }> = {};
  const allNodes = [ORCHESTRATOR, ...nodes];
  if (nodes.length === 0) {
    positions[ORCHESTRATOR] = { x: cx, y: cy };
    return positions;
  }
  positions[ORCHESTRATOR] = { x: cx, y: cy };

  // 简单圆形扩散 + 随机偏移模拟力导向效果
  const radius = 140;
  const n = nodes.length;
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    // 添加伪随机偏移
    const offsetR = radius + ((i * 37 + 13) % 41) - 20;
    const offsetA = angle + ((i * 23 + 7) % 21 - 10) * (Math.PI / 180);
    positions[nodes[i]] = {
      x: cx + offsetR * Math.cos(offsetA),
      y: cy + offsetR * Math.sin(offsetA),
    };
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

  // 两层：内层半径 90，外层半径 170
  const halfN = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    const isInner = i < halfN;
    const r = isInner ? 90 : 170;
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
  const stepX = 110;
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
      return circularLayout(agents, cx, cy, 130);
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
      return circularLayout(agents, cx, cy, 120);
    case 'D':
      return starLayout(agents, cx, cy);
    case 'E':
      return linearLayout(agents, cx, cy);
    default:
      return circularLayout(agents, cx, cy, 130);
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
  const animRef = useRef<number>(0);
  const destroyedRef = useRef(false);
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
      mousewheel: { enabled: true, modifiers: 'ctrl', minScale: 0.5, maxScale: 2 },
    });

    graphRef.current = graph;

    return () => {
      destroyedRef.current = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      try { graph.dispose(); } catch {}
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

    const orchPos = positions[ORCHESTRATOR];
    if (orchPos) {
      graph.addNode({
        id: ORCHESTRATOR,
        x: orchPos.x - 32,
        y: orchPos.y - 32,
        width: 64,
        height: 64,
        shape: 'ellipse',
        attrs: {
          body: {
            fill: '#FFF7E6',
            stroke: '#FA8C16',
            strokeWidth: 3,
            rx: 32, ry: 32,
            filter: 'drop-shadow(0 2px 8px rgba(250,140,22,0.3))',
          },
          label: {
            text: '🧠\n编排者',
            fill: '#AD6800',
            fontSize: 12,
            fontWeight: 'bold',
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
          },
        },
        data: { type: 'orchestrator', status: 'active' },
      });
    }

    // 子 Agent 节点
    for (const agent of agents) {
      const pos = positions[agent.agent_id];
      if (!pos) continue;
      const colors = STATUS_COLORS[agent.status] || STATUS_COLORS.active;
      const icon = agentIcon(agent.agent_id);
      const name = agent.agent_id.length > 14 ? agent.agent_id.substring(0, 13) + '…' : agent.agent_id;
      const nodeSize = 44;

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
            strokeWidth: agent.status === 'active' ? 3 : 2,
            rx: nodeSize / 2, ry: nodeSize / 2,
            filter: agent.status === 'active' ? 'drop-shadow(0 0 6px rgba(82,196,26,0.4))' : undefined,
          },
          label: {
            text: `${icon} ${name}`,
            fill: '#262626',
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
            strokeWidth: 1.8,
            strokeDasharray: agent.status === 'active' ? '4,3' : undefined,
            targetMarker: { name: 'block', width: 7, height: 5 },
          },
        },
        data: { status: agent.status },
      });
    }

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

    graph.centerContent();
  }, [agents, selectedGate, size]);

  // 活跃节点呼吸动画
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || destroyedRef.current) return;

    let phase = 0;
    const breathe = () => {
      if (destroyedRef.current) return;
      phase = (phase + 0.04) % (Math.PI * 2);
      try {
        const activeAgents = agents.filter(a => a.status === 'active');
        for (const a of activeAgents) {
          const node = graph.getCellById(a.agent_id);
          if (node && node.isNode()) {
            const s = 1 + Math.sin(phase * 3) * 0.06;
            node.scale(s, s);
          }
        }
        // 编排者呼吸
        const orch = graph.getCellById(ORCHESTRATOR);
        if (orch && orch.isNode()) {
          const s = 1 + Math.sin(phase * 1.5) * 0.04;
          orch.scale(s, s);
        }
      } catch {}
      animRef.current = requestAnimationFrame(breathe);
    };
    animRef.current = requestAnimationFrame(breathe);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
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
        const statusLabel = data.status === 'active' ? '🟢 运行中'
          : data.status === 'completed' ? '✅ 已完成' : '❌ 失败';
        let html = `<div style="font-weight:700;margin-bottom:4px">${agentIcon(cell.id as string)} ${cell.id}</div>`;
        html += `<div style="font-size:11px">${statusLabel}</div>`;
        if (data.model) html += `<div style="font-size:10px;color:#999">模型: ${data.model}</div>`;
        if (agent?.status === 'active') html += `<div style="font-size:10px;color:#52C41A;margin-top:2px">● 正在执行任务...</div>`;
        tooltip.innerHTML = html;
        tooltip.style.display = 'block';
        tooltip.style.left = `${pos.x + 14}px`;
        tooltip.style.top = `${pos.y - 10}px`;
      }

      if (data.type === 'orchestrator') {
        const html = `<div style="font-weight:700">🧠 编排者</div>`
          + `<div style="font-size:11px;color:#666">Jarvis 主控 Agent</div>`
          + `<div style="font-size:10px;color:#999;margin-top:2px">调度所有子 Agent 执行任务</div>`;
        tooltip.innerHTML = html;
        tooltip.style.display = 'block';
        tooltip.style.left = `${pos.x + 14}px`;
        tooltip.style.top = `${pos.y - 10}px`;
      }
    };

    const hide = () => { tooltip.style.display = 'none'; };
    graph.on('node:mouseenter', show);
    graph.on('node:mouseleave', hide);
    return () => {
      graph.off('node:mouseenter', show);
      graph.off('node:mouseleave', hide);
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
        display: 'none', position: 'fixed', zIndex: 9999,
        background: token.colorBgElevated || token.colorBgContainer,
        border: `1.5px solid ${token.colorPrimaryBorder || token.colorBorder}`,
        borderRadius: 10, padding: '8px 12px', fontSize: 11,
        color: token.colorText,
        boxShadow: token.boxShadowSecondary || '0 4px 16px rgba(0,0,0,0.12)',
        pointerEvents: 'none', maxWidth: 240, lineHeight: 1.6,
      }} />
    </div>
  );
}
