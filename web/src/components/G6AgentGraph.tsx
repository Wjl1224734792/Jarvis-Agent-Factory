import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Graph } from '@antv/g6';
import type { AgentGateStatusResponse } from '../api';

// ============================================================
// 每个 Gate 独立的 Agent 交互图
// 初始只有主编排者节点，Hook 触发 SubagentStart 后子 Agent 动态出现
// ============================================================

interface Props {
  currentGate: string;
  gateStatus: AgentGateStatusResponse | null;
  style?: React.CSSProperties;
}

/** Agent 状态颜色映射 */
const STATUS_STYLE: Record<string, { fill: string; stroke: string; lineWidth: number }> = {
  active:    { fill: '#F6FFED', stroke: '#52C41A', lineWidth: 3 },
  completed: { fill: '#E6F7FF', stroke: '#1677FF', lineWidth: 2 },
  failed:    { fill: '#FFF2F0', stroke: '#FF4D4F', lineWidth: 3 },
};

/** 简化 Agent 名称 */
function shortLabel(name: string): string {
  return name.length > 16 ? name.slice(0, 15) + '…' : name;
}

/** 从 agent_id 推断图标 emoji */
function agentIcon(agentId: string): string {
  if (agentId.includes('frontend')) return '\u{1F3A8}';
  if (agentId.includes('backend')) return '\u{1F527}';
  if (agentId.includes('test')) return '\u{1F9EA}';
  if (agentId.includes('review')) return '\u{1F50D}';
  if (agentId.includes('architect')) return '\u{1F3D7}';
  if (agentId.includes('security')) return '\u{1F6E1}';
  if (agentId.includes('browser')) return '\u{1F310}';
  if (agentId.includes('android')) return '\u{1F4F1}';
  if (agentId.includes('ios')) return '\u{1F34E}';
  if (agentId.includes('flutter')) return '\u{1F98B}';
  if (agentId.includes('expo') || agentId.includes('react-native')) return '\u{1F4F1}';
  if (agentId.includes('taro')) return '\u{1F3EE}';
  if (agentId.includes('data') || agentId.includes('db') || agentId.includes('database')) return '\u{1F4BE}';
  if (agentId.includes('api')) return '\u{1F517}';
  if (agentId.includes('algo')) return '\u{1F9EE}';
  if (agentId.includes('perf')) return '\u{26A1}';
  if (agentId.includes('docs')) return '\u{1F4C4}';
  return '\u{1F916}';
}

export default function G6AgentGraph({ currentGate, gateStatus, style }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const animRef = useRef<number>(0);
  const destroyedRef = useRef(false);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 400 });

  // 当前 Gate 下的 Agent 列表
  const gateAgents = useMemo(() => {
    if (!gateStatus?.gates) return [];
    return gateStatus.gates[currentGate]?.agents || [];
  }, [gateStatus, currentGate]);

  // 节点数据
  const graphData = useMemo(() => {
    const nodes: Array<{ id: string; style: Record<string, unknown>; data: Record<string, unknown> }> = [];
    const edges: Array<{ id: string; source: string; target: string; data: Record<string, unknown> }> = [];

    // 主编排者节点（始终存在）
    nodes.push({
      id: 'orchestrator',
      style: {
        fill: '#FFF7E6', stroke: '#FA8C16', lineWidth: 3,
        labelText: '编排者',
        labelFill: '#AD6800',
        labelFontSize: 14,
        labelFontWeight: 'bold',
        size: 48,
        halo: true,
        haloFill: '#FFF7E6',
        haloLineWidth: 2,
      },
      data: { type: 'orchestrator', status: 'active', icon: '\u{1F9E0}' },
    });

    // 子 Agent 节点
    for (const agent of gateAgents) {
      const style = STATUS_STYLE[agent.status] || STATUS_STYLE.active;
      const hasData = agent.status === 'active' || agent.status === 'completed';
      nodes.push({
        id: agent.agent_id,
        style: {
          fill: style.fill,
          stroke: style.stroke,
          lineWidth: style.lineWidth,
          labelText: shortLabel(agent.agent_id),
          labelFill: '#262626',
          labelFontSize: 12,
          size: 36,
          halo: agent.status === 'active',
          haloFill: style.fill,
        },
        data: { type: 'subagent', status: agent.status, icon: agentIcon(agent.agent_id), model: agent.model },
      });

      // 编排者 → 子 Agent 连线
      edges.push({
        id: `orch->${agent.agent_id}`,
        source: 'orchestrator',
        target: agent.agent_id,
        data: { status: agent.status },
      });
    }

    return { nodes, edges };
  }, [gateAgents]);

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setContainerSize({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 初始化 G6 图
  useEffect(() => {
    if (!containerRef.current) return;
    destroyedRef.current = false;
    const { w, h } = containerSize;

    const graph = new Graph({
      container: containerRef.current,
      width: w,
      height: h,
      autoFit: 'center',
      animation: true,
      layout: {
        type: 'dagre',
        rankdir: 'LR',
        nodesep: 50,
        ranksep: 100,
      },
      node: {
        type: 'circle',
        style: {
          size: 40,
          fill: '#E6F7FF',
          stroke: '#1677FF',
          lineWidth: 2,
          labelText: '',
          labelFill: '#262626',
          labelFontSize: 12,
          labelPlacement: 'bottom',
          labelOffsetY: 8,
        },
      },
      edge: {
        type: 'polyline',
        style: {
          stroke: '#91CAFF',
          lineWidth: 2,
          endArrow: true,
          lineDash: [4, 4],
        },
        animation: {},
      },
      behaviors: ['drag-canvas', 'zoom-canvas'],
    });

    graph.render();
    graphRef.current = graph;

    return () => {
      destroyedRef.current = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      try { graph.destroy(); } catch {}
      graphRef.current = null;
    };
  }, []);

  // 更新图数据
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    try {
      graph.setData(graphData as any);
      graph.render();

      // 动态适配视图
      graph.fitView();
    } catch {}
  }, [graphData]);

  // 活跃节点呼吸动画
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    let phase = 0;
    const animate = () => {
      if (destroyedRef.current) return;
      phase = (phase + 0.03) % (Math.PI * 2);
      try {
        const activeAgents = gateAgents.filter(a => a.status === 'active');
        if (activeAgents.length > 0) {
          const updates = activeAgents.map(a => ({
            id: a.agent_id,
            style: {
              haloLineWidth: 2 + Math.sin(phase * 3) * 1.5,
              haloOpacity: 0.4 + Math.sin(phase * 3) * 0.3,
            },
          }));
          graph.updateNodeData(updates);
          graph.draw();
        }

        // 编排者也有呼吸效果
        graph.updateNodeData([{
          id: 'orchestrator',
          style: {
            haloLineWidth: 2 + Math.sin(phase) * 1.5,
          },
        }]);
        graph.draw();
      } catch {}
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [gateAgents]);

  // 空状态
  if (gateAgents.length === 0) {
    return (
      <div ref={containerRef} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--ant-color-text-quaternary)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{'\u{1F916}'}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ant-color-text-secondary)' }}>
            {currentGate}
          </div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            等待子 Agent 启动...
          </div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--ant-color-text-tertiary)' }}>
            Hook 触发 SubagentStart 后自动出现
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={style}>
      {/* Agent 计数标签栏 */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8, right: 8,
        display: 'flex', gap: 8, zIndex: 10, pointerEvents: 'none',
      }}>
        {gateAgents.filter(a => a.status === 'active').length > 0 && (
          <span style={{ fontSize: 11, background: 'var(--ant-color-primary-bg)', color: 'var(--ant-color-primary)',
            padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
            {'\u{1F7E2}'} {(gateAgents.filter(a => a.status === 'active')).length} 活跃
          </span>
        )}
        {gateAgents.filter(a => a.status === 'completed').length > 0 && (
          <span style={{ fontSize: 11, background: 'var(--ant-color-success-bg)', color: 'var(--ant-color-success)',
            padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
            {'\u{2705}'} {(gateAgents.filter(a => a.status === 'completed')).length} 已完成
          </span>
        )}
        {gateAgents.filter(a => a.status === 'failed').length > 0 && (
          <span style={{ fontSize: 11, background: 'var(--ant-color-error-bg)', color: 'var(--ant-color-error)',
            padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
            {'\u{274C}'} {(gateAgents.filter(a => a.status === 'failed')).length} 失败
          </span>
        )}
      </div>
    </div>
  );
}
