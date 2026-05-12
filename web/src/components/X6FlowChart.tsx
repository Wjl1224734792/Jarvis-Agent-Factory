import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { theme } from 'antd';
import { NODE_SIZES } from '../constants/x6-theme';
import type { AgentStatusResponse } from '../api';

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

/** Gate emoji 图标 */
const GATE_ICONS: Record<string, string> = {
  'Gate A': '\u{1F4CB}', 'Gate B-DDD': '\u{1F3D7}️', 'Gate B-BDD': '\u{1F4DD}',
  'Gate B-TDD': '\u{1F9EA}', 'Gate B1': '\u{1F3DB}️', 'Gate C': '\u{1F4D0}',
  'Gate C-impl': '⚡', 'Gate C1': '✅', 'Gate C1.5': '\u{1F441}️',
  'Gate C2': '\u{1F52C}', 'Gate D': '\u{1F50D}', 'Gate E': '\u{1F680}',
};

// ============================================================
// 类型
// ============================================================

interface Props {
  runId: string | null;
  agentStatus: AgentStatusResponse | null;
  pipelineGates?: { gate: string; passed: boolean; duration_display?: string | null }[];
  selectedGate: string | null;
  onGateSelect: (gateId: string) => void;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  gateId: string | null;
}

/** 计算 contentHeight 后附加的边距 */
const SVG_PADDING_BOTTOM = 60;

// ============================================================
// 组件
// ============================================================

export default function X6FlowChart({
  runId, agentStatus, pipelineGates, selectedGate, onGateSelect,
}: Props) {
  const { token } = theme.useToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, gateId: null });
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Agent 数据（仅用于 tooltip 统计，不渲染 Agent 子节点）
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

  // 注入 CSS 动画关键帧（一次性，通过 DOM ID 去重）
  useEffect(() => {
    const styleId = 'x6-flowchart-animations';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes flowPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.06); }
      }
      @keyframes flowDashMove {
        to { stroke-dashoffset: -24; }
      }
      @keyframes flowFadeInScale {
        from { opacity: 0; transform: scale(0.3); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      // 仅在组件卸载且无其他实例时移除（用 ref 计数判断）
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

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

  // Tooltip 事件处理
  const showTooltip = useCallback((gateId: string, e: React.MouseEvent) => {
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    setTooltip({ visible: true, x: e.clientX, y: e.clientY, gateId });
  }, []);

  const hideTooltip = useCallback(() => {
    hideTimerRef.current = setTimeout(() => {
      setTooltip(prev => ({ ...prev, visible: false }));
      hideTimerRef.current = null;
    }, 150);
  }, []);

  // ============================================================
  // 布局计算
  // ============================================================

  const layoutData = useMemo(() => {
    const { w, h } = containerSize;
    if (w === 0 || h === 0) return null;

    const nodeR = NODE_SIZES.gate.w / 2; // 40
    const gateCount = GATE_SEQUENCE.length; // 12

    // 等距垂直排列：节点中心从上到下均匀分布
    const topMargin = nodeR + 10;
    const bottomMargin = nodeR + SVG_PADDING_BOTTOM;
    const availableH = 1200; // 固定内容高度，缩放适配容器
    const spacing = (availableH - topMargin - bottomMargin) / (gateCount - 1);

    // 构建 gateId -> 索引映射
    const gateIndexMap = new Map<string, number>();
    GATE_SEQUENCE.forEach((g, i) => gateIndexMap.set(g, i));

    // 计算每个 Gate 的中心坐标（在内容坐标系中）
    const gatePositions = new Map<string, { cx: number; cy: number }>();
    GATE_SEQUENCE.forEach((gateId, i) => {
      gatePositions.set(gateId, { cx: availableH, cy: topMargin + i * spacing });
    });

    const contentW = availableH; // 等宽正方形内容区
    const contentH = availableH;

    return { nodeR, gateCount, spacing, gateIndexMap, gatePositions, contentW, contentH };
  }, [containerSize]);

  // 计算 Bezier 路径
  const buildEdgePath = useCallback(
    (fromGate: string, toGate: string, isSkip: boolean): string | null => {
      if (!layoutData) return null;
      const { gatePositions, nodeR } = layoutData;
      const from = gatePositions.get(fromGate);
      const to = gatePositions.get(toGate);
      if (!from || !to) return null;

      const startX = from.cx;
      const startY = from.cy + nodeR;
      const endX = to.cx;
      const endY = to.cy - nodeR;

      if (isSkip) {
        // 跳过边：从右侧绕过中间节点
        const offsetX = 120;
        const midY = (startY + endY) / 2;
        return `M ${startX} ${startY} C ${startX + offsetX} ${startY + 30}, ${endX + offsetX} ${endY - 30}, ${endX} ${endY}`;
      }

      // 正常边：垂直贝塞尔曲线
      const cyDelta = (endY - startY) / 3;
      return `M ${startX} ${startY} C ${startX} ${startY + cyDelta}, ${endX} ${endY - cyDelta}, ${endX} ${endY}`;
    },
    [layoutData],
  );

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

  // ============================================================
  // 渲染
  // ============================================================

  const activeGate = selectedGate || currentGate;
  const filteredEdges = GATE_EDGES.filter(([s, t]) => {
    if (bddSkipped && s === 'Gate B-DDD' && t === 'Gate B-BDD') return false;
    if (bddSkipped && s === 'Gate B-BDD' && t === 'Gate B-TDD') return false;
    return true;
  });

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      borderRadius: 12, border: `1.5px solid ${token.colorBorderSecondary}`,
      background: token.colorBgContainer, overflow: 'hidden',
    }}>
      {/* SVG 画布 */}
      <div ref={containerRef} style={{
        width: '100%', height: '100%',
        background: token.colorFillQuaternary,
      }}>
        {layoutData && (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${layoutData.contentW} ${layoutData.contentH}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block' }}
          >
            {/* SVG 滤镜：发光效果 */}
            <defs>
              <filter id="gateGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Gate 连接边 */}
            {filteredEdges.map(([s, t]) => {
              const pathD = buildEdgePath(s, t, false);
              if (!pathD) return null;
              const sState = getGateState(s);
              const tState = getGateState(t);
              let stroke: string; let strokeW: number; let dash: string | undefined;
              if (sState === 'passed' && tState === 'passed') {
                stroke = token.colorSuccess; strokeW = 2.5;
              } else if (sState === 'current' || tState === 'current') {
                stroke = token.colorPrimary; strokeW = 3;
              } else if (sState === 'passed' && tState === 'future') {
                stroke = token.colorPrimary; strokeW = 2.5; dash = '6,3';
              } else {
                stroke = token.colorBorderSecondary; strokeW = 1.8; dash = '4,3';
              }
              return (
                <path
                  key={`${s}->${t}`}
                  d={pathD}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={strokeW}
                  strokeDasharray={dash}
                  strokeLinecap="round"
                />
              );
            })}

            {/* BDD 跳过边 */}
            {bddSkipped && GATE_SKIP_EDGES.map(([s, t]) => {
              const pathD = buildEdgePath(s, t, true);
              if (!pathD) return null;
              return (
                <path
                  key={`${s}->${t}-skip`}
                  d={pathD}
                  fill="none"
                  stroke={token.colorWarning}
                  strokeWidth={2}
                  strokeDasharray="8,4"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Gate 节点 */}
            {GATE_SEQUENCE.map(gateId => {
              const pos = layoutData.gatePositions.get(gateId);
              if (!pos) return null;
              const state = getGateState(gateId);
              const isSelected = activeGate === gateId;
              const nodeR = layoutData.nodeR;

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

              const strokeW = isSelected ? 3.5 : state === 'current' ? 3 : 2.2;
              const animation = state === 'current' ? 'flowPulse 2s ease-in-out infinite' : undefined;
              const useGlow = isSelected || state === 'current';

              return (
                <g
                  key={gateId}
                  onClick={(e) => { e.stopPropagation(); onGateSelect(gateId); }}
                  onMouseEnter={(e) => showTooltip(gateId, e)}
                  onMouseLeave={hideTooltip}
                  style={{ cursor: 'pointer' }}
                >
                  <ellipse
                    cx={pos.cx}
                    cy={pos.cy}
                    rx={nodeR}
                    ry={nodeR}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeW}
                    strokeDasharray={state === 'future' ? '4,3' : undefined}
                    filter={useGlow ? 'url(#gateGlow)' : undefined}
                    style={{
                      transformOrigin: `${pos.cx}px ${pos.cy}px`,
                      transformBox: 'fill-box',
                      animation,
                    }}
                  />
                  <text
                    x={pos.cx}
                    y={pos.cy + nodeR + 16}
                    textAnchor="middle"
                    fill={labelFill}
                    fontSize={NODE_SIZES.gate.fontSize}
                    fontWeight={isSelected ? 700 : state === 'current' ? 600 : 400}
                    style={{ pointerEvents: 'none' }}
                  >
                    {GATE_ICONS[gateId] || ''} {GATE_LABELS[gateId] || gateId}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Tooltip */}
      <div
        style={{
          display: tooltip.visible ? 'block' : 'none',
          position: 'fixed',
          zIndex: 10000,
          background: token.colorBgElevated || token.colorBgContainer,
          border: `1.5px solid ${token.colorPrimaryBorder || token.colorBorder}`,
          borderRadius: 10,
          padding: '8px 12px',
          fontSize: 11,
          color: token.colorText,
          boxShadow: token.boxShadowSecondary || '0 4px 16px rgba(0,0,0,0.12)',
          pointerEvents: 'none',
          maxWidth: 260,
          lineHeight: 1.6,
          backdropFilter: 'blur(8px)',
          opacity: tooltip.visible ? 1 : 0,
          transition: 'opacity 150ms ease',
          left: Math.min(tooltip.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 270),
          top: Math.max(4, tooltip.y - 10),
        }}
      >
        {tooltip.gateId && (() => {
          const gateId = tooltip.gateId;
          const state = getGateState(gateId);
          const stateLabel = state === 'passed' ? '✅ 已通过' : state === 'current' ? '\u{1F535} 进行中' : '⏳ 等待中';
          const desc = GATE_DESCRIPTIONS[gateId] || '';
          const gateInfo = pipelineGates?.find(g => g.gate === gateId);
          return (
            <>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {GATE_ICONS[gateId] || ''} {escapeHtml(gateId)}
              </div>
              <div style={{ fontSize: 10 }}>{GATE_LABELS[gateId] || ''}</div>
              <div style={{ fontSize: 10, marginTop: 2 }}>{stateLabel}</div>
              {desc && (
                <div style={{ fontSize: 10, color: token.colorTextTertiary, marginTop: 2, maxWidth: 200 }}>
                  {escapeHtml(desc)}
                </div>
              )}
              {gateInfo?.duration_display && (
                <div style={{ fontSize: 10, color: token.colorTextTertiary, marginTop: 2 }}>
                  ⏱ 耗时: {escapeHtml(gateInfo.duration_display)}
                </div>
              )}
              <div style={{ fontSize: 9, color: token.colorTextQuaternary, marginTop: 4 }}>
                点击查看该 Gate 的 Agent 详情
              </div>
            </>
          );
        })()}
      </div>

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
        <span style={{ cursor: 'pointer', pointerEvents: 'auto' }}>{'\u{1F5B1}'} 点击 Gate 查看 Agent</span>
      </div>
    </div>
  );
}

export { GATE_SEQUENCE, GATE_LABELS, GATE_SKIP_EDGES, GATE_DESCRIPTIONS };
