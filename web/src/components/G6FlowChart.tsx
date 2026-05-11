import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { theme, Tag, Tooltip as AntTooltip } from 'antd';
import { Graph } from '@antv/g6';
import type { AgentStatusResponse } from '../api';

// ============================================================
// Gate 节点定义 — 10 个 Gate
// ============================================================

const GATE_SEQUENCE = [
  'Gate A', 'Gate B', 'Gate B1', 'Gate C', 'Gate C-impl',
  'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D', 'Gate E',
] as const;

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
// 类型
// ============================================================

interface G6FlowChartProps {
  runId: string | null;
  agentStatus: AgentStatusResponse | null;
  pipelineGates?: { gate: string; passed: boolean }[];
}

// ============================================================
// 响应式
// ============================================================

function getResponsiveHeight(width: number): number {
  if (width >= 992) return 380;
  if (width >= 768) return 280;
  return 220;
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
  const [expandedGate, setExpandedGate] = useState<string | null>(null);

  // Gate 状态映射
  const gateStatusMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (pipelineGates) {
      pipelineGates.forEach(g => map.set(g.gate, g.passed));
    }
    return map;
  }, [pipelineGates]);

  // 当前 Gate（第一个未通过的）
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

  // Agent 状态：是否有实际数据
  const hasAgentData = useMemo(() => {
    if (!agentStatus) return false;
    return agentStatus.active.length > 0 ||
           agentStatus.completed.length > 0 ||
           agentStatus.failed.length > 0;
  }, [agentStatus]);

  // Agent 分类集合
  const agentSets = useMemo(() => {
    if (!agentStatus) return { active: new Set<string>(), completed: new Set<string>(), failed: new Set<string>() };
    return {
      active: new Set(agentStatus.active),
      completed: new Set(agentStatus.completed),
      failed: new Set(agentStatus.failed),
    };
  }, [agentStatus]);

  // 当前 Gate 的活跃 agent 列表
  const currentGateAgents = useMemo(() => {
    if (!hasAgentData) return [];
    const all = [
      ...Array.from(agentSets.active).map((a: string) => ({ name: a, status: 'active' as const })),
      ...Array.from(agentSets.completed).map((a: string) => ({ name: a, status: 'completed' as const })),
      ...Array.from(agentSets.failed).map((a: string) => ({ name: a, status: 'failed' as const })),
    ];
    return all.slice(0, 8);
  }, [hasAgentData, agentSets]);

  // 切换展开/折叠
  const toggleExpand = useCallback((gateId: string) => {
    setExpandedGate(prev => prev === gateId ? null : gateId);
  }, []);

  // ResizeObserver — 依赖 expandedGate 以便展开时重新绑定
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
    // 立即设置初始宽度
    setContainerWidth(containerRef.current.clientWidth);
    return () => {
      observer.disconnect();
      clearTimeout(debounceTimer);
    };
  }, [expandedGate]);

  // ============================================================
  // 初始化 G6 Graph（仅展开时）
  // ============================================================
  useEffect(() => {
    if (!containerRef.current || !runId || !expandedGate) return;
    // 若 ResizeObserver 尚未触发，直接读取容器宽度
    const w = containerWidth || containerRef.current.clientWidth;
    if (w === 0) return;

    const height = getResponsiveHeight(w);
    const graph = new Graph({
      container: containerRef.current,
      width: w,
      height,
      autoFit: 'view',
      padding: 20,
      layout: {
        type: 'dagre',
        rankdir: 'LR',
        nodesep: 30,
        ranksep: 60,
      },
      node: {
        type: 'circle',
        style: {
          size: 56,
          labelText: '',
          labelFontSize: 10,
          labelFontWeight: 600,
          labelPlacement: 'bottom',
          labelOffsetY: 6,
          labelLineHeight: 14,
          strokeWidth: 2,
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

    const nodes = GATE_SEQUENCE.map(gateId => {
      const abbreviated = GATE_LABELS[gateId]?.charAt(0) || gateId.slice(-2);
      return {
        id: gateId,
        style: {
          labelText: abbreviated,
        },
      };
    });

    const edges = GATE_EDGES.map(([source, target]) => ({
      id: `${source}->${target}`,
      source,
      target,
    }));

    graph.setData({ nodes, edges });
    graph.render();
    graphRef.current = graph;
    destroyedRef.current = false;

    return () => {
      destroyedRef.current = true;
      try { graph.destroy(); } catch { /* 已销毁则忽略 */ }
      graphRef.current = null;
    };
  }, [runId, containerWidth, expandedGate]);

  // ============================================================
  // 更新节点样式（Gate 状态变化）
  // ============================================================
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || destroyedRef.current) return;

    const nodeUpdates = GATE_SEQUENCE.map(gateId => {
      const state = getGateState(gateId);
      let fillColor: string;
      let strokeColor: string;
      let lineDash: number[] | undefined;

      switch (state) {
        case 'passed':
          fillColor = token.colorSuccessBg;
          strokeColor = token.colorSuccess;
          break;
        case 'current':
          fillColor = token.colorPrimaryBg;
          strokeColor = token.colorPrimary;
          break;
        default:
          fillColor = token.colorFillQuaternary;
          strokeColor = token.colorBorderSecondary;
          lineDash = [4, 3];
          break;
      }

      const abbreviated = GATE_LABELS[gateId]?.charAt(0) || gateId.slice(-2);
      return {
        id: gateId,
        style: {
          fill: fillColor,
          stroke: strokeColor,
          lineDash,
          labelText: `${abbreviated}\n${GATE_LABELS[gateId]}`,
          labelFill: state === 'future' ? token.colorTextSecondary : token.colorText,
        },
      };
    });

    graph.updateNodeData(nodeUpdates);

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
  }, [gateStatusMap, currentGate, getGateState, expandedGate]);

  // ============================================================
  // Agent 子状态标注（仅在有数据时显示）
  // ============================================================
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || destroyedRef.current || !hasAgentData) return;

    const badgeUpdates = GATE_SEQUENCE.map(gateId => {
      const state = getGateState(gateId);
      const activeCount = agentSets.active.size;
      let badgeText = '';
      let badgeFill = '';

      if (state === 'current' && activeCount > 0) {
        badgeText = activeCount.toString();
        badgeFill = token.colorPrimary;
      } else if (state === 'passed') {
        badgeText = '✓';
        badgeFill = token.colorSuccess;
      }

      return {
        id: gateId,
        style: {
          badges: badgeText
            ? [{ text: badgeText, placement: 'right-top' as const, fill: badgeFill, fontSize: 10 }]
            : [],
        },
      };
    });

    graph.updateNodeData(badgeUpdates);
    graph.render();
  }, [agentStatus, hasAgentData, getGateState, agentSets]);

  // ============================================================
  // 空状态（无 runId）
  // ============================================================
  if (!runId) {
    return (
      <div style={{
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: token.colorTextSecondary, fontSize: 13,
        borderRadius: 12, background: token.colorFillQuaternary,
      }}>
        无运行中的任务
      </div>
    );
  }

  // ============================================================
  // Gate 颜色辅助
  // ============================================================
  const gateColorMap = useMemo(() => {
    const map: Record<string, { bg: string; border: string; text: string }> = {};
    GATE_SEQUENCE.forEach(gateId => {
      const state = getGateState(gateId);
      switch (state) {
        case 'passed':
          map[gateId] = { bg: token.colorSuccessBg, border: token.colorSuccess, text: token.colorSuccess };
          break;
        case 'current':
          map[gateId] = { bg: token.colorPrimaryBg, border: token.colorPrimary, text: token.colorPrimary };
          break;
        default:
          map[gateId] = { bg: token.colorFillQuaternary, border: token.colorBorderSecondary, text: token.colorTextSecondary };
          break;
      }
    });
    return map;
  }, [token, getGateState]);

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer }}>
      {/* ── 折叠状态：Gate 横向指示条 ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px',
          overflowX: 'auto', cursor: 'default', minHeight: 52,
        }}
      >
        {GATE_SEQUENCE.map((gateId, idx) => {
          const colors = gateColorMap[gateId];
          const isExpanded = expandedGate === gateId;
          const abbreviated = GATE_LABELS[gateId] || gateId;

          return (
            <React.Fragment key={gateId}>
              <AntTooltip title={`${gateId}: ${GATE_LABELS[gateId]}`}>
                <div
                  onClick={() => toggleExpand(gateId)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 40, height: 40, borderRadius: '50%',
                    background: colors.bg, border: `2px solid ${isExpanded ? token.colorPrimary : colors.border}`,
                    color: colors.text, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
                    boxShadow: isExpanded ? `0 0 0 2px ${token.colorPrimaryBg}` : undefined,
                    position: 'relative',
                  }}
                >
                  {abbreviated.charAt(0)}
                  {/* 当前 Gate 脉冲动画 */}
                  {getGateState(gateId) === 'current' && (
                    <span style={{
                      position: 'absolute', inset: -3, borderRadius: '50%',
                      border: `2px solid ${token.colorPrimary}`,
                      animation: 'g6-pulse 2s ease-in-out infinite',
                    }} />
                  )}
                </div>
              </AntTooltip>
              {idx < GATE_SEQUENCE.length - 1 && (
                <div style={{
                  flex: '0 0 16px', height: 2,
                  background: getGateState(gateId) === 'passed' ? token.colorSuccess : token.colorBorderSecondary,
                  borderRadius: 1,
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── 展开状态：G6 Canvas ── */}
      {expandedGate && (
        <div style={{ padding: '0 8px 8px' }}>
          {/* Agent 状态条 */}
          {hasAgentData && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: token.colorTextSecondary, fontWeight: 600 }}>Agent 状态：</span>
              {currentGateAgents.map(a => (
                <Tag
                  key={a.name}
                  style={{ borderRadius: 10, fontSize: 10, margin: 0 }}
                  color={
                    a.status === 'active' ? 'processing' :
                    a.status === 'completed' ? 'success' :
                    'error'
                  }
                >
                  {a.status === 'active' ? '● ' : a.status === 'completed' ? '✓ ' : '✗ '}
                  {a.name}
                </Tag>
              ))}
              {currentGateAgents.length === 0 && (
                <span style={{ fontSize: 11, color: token.colorTextQuaternary }}>暂无活跃 Agent</span>
              )}
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <AntTooltip title={expandedGate ? `${expandedGate}: ${GATE_DESCRIPTIONS[expandedGate]}` : ''}>
              <span style={{ position: 'absolute', top: 4, right: 8, fontSize: 10, color: token.colorTextQuaternary, zIndex: 1 }}>
                {expandedGate} {GATE_LABELS[expandedGate]}
              </span>
            </AntTooltip>
            <div
              ref={containerRef}
              style={{
                width: '100%',
                borderRadius: 10,
                overflow: 'hidden',
                background: token.colorFillQuaternary,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            />
          </div>

          <div style={{ textAlign: 'center', marginTop: 6 }}>
            <span
              onClick={() => setExpandedGate(null)}
              style={{
                fontSize: 11, color: token.colorTextSecondary, cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              ▲ 收起流程图
            </span>
          </div>
        </div>
      )}

      {/* 脉冲动画 keyframes */}
      <style>{`
        @keyframes g6-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

export { GATE_SEQUENCE, GATE_LABELS, GATE_DESCRIPTIONS };
