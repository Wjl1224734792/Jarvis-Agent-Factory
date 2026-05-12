import React, { useRef, useEffect, useState, useMemo } from 'react';
import { theme } from 'antd';
import type { GlobalToken } from 'antd';
import type { AgentGateStatusResponse, AgentUsageResponse } from '../api';
import { NODE_SIZES, ANIMATION_DEFAULTS, AGENT_TYPE_COLORS } from '../constants/x6-theme';

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

/** 格式化 Token 数量 */
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ============================================================
// 每个 Gate 独立的 Agent 交互图（纯 SVG 版本）
// ============================================================

interface Props {
  selectedGate: string;
  gateStatus: AgentGateStatusResponse | null;
  style?: React.CSSProperties;
  /** Token 用量数据，用于在已完成 Agent 节点下方显示 Token 信息 */
  agentUsage?: AgentUsageResponse | null;
}

const ORCHESTRATOR = 'orchestrator';

/** 根据 agent ID 匹配 AGENT_TYPE_COLORS 获取类型专属色 */
function getAgentColors(agentId: string, status: string, token: GlobalToken): { fill: string; stroke: string } {
  const lowerId = agentId.toLowerCase();
  const entries = Object.entries(AGENT_TYPE_COLORS);
  for (const [typeKey, colors] of entries) {
    if (lowerId.includes(typeKey)) return colors;
  }
  switch (status) {
    case 'active':    return { fill: token.colorPrimaryBg, stroke: token.colorPrimary };
    case 'completed': return { fill: token.colorSuccessBg, stroke: token.colorSuccess };
    case 'failed':    return { fill: token.colorErrorBg, stroke: token.colorError };
    default:          return { fill: token.colorPrimaryBg, stroke: token.colorPrimary };
  }
}

/** Agent emoji 图标 */
function agentIcon(agentId: string): string {
  if (agentId.includes('frontend')) return '\u{1F3A8}';
  if (agentId.includes('backend')) return '\u{1F527}';
  if (agentId.includes('test') || agentId.includes('e2e')) return '\u{1F9EA}';
  if (agentId.includes('review')) return '\u{1F50D}';
  if (agentId.includes('architect')) return '\u{1F3D7}️';
  if (agentId.includes('security')) return '\u{1F6E1}️';
  if (agentId.includes('browser')) return '\u{1F310}';
  if (agentId.includes('android')) return '\u{1F4F1}';
  if (agentId.includes('ios')) return '\u{1F34E}';
  if (agentId.includes('flutter')) return '\u{1F98B}';
  if (agentId.includes('taro')) return '\u{1F3EA}';
  if (agentId.includes('data') || agentId.includes('db') || agentId.includes('database')) return '\u{1F4BE}';
  if (agentId.includes('api')) return '\u{1F517}';
  if (agentId.includes('algo')) return '\u{1F9EE}';
  if (agentId.includes('perf')) return '⚡';
  if (agentId.includes('docs')) return '\u{1F4C4}';
  if (agentId.includes('qa')) return '✅';
  if (agentId.includes('planner')) return '\u{1F4D0}';
  if (agentId.includes('planning')) return '\u{1F4CB}';
  if (agentId.includes('explore')) return '\u{1F50E}';
  if (agentId.includes('research')) return '\u{1F4DA}';
  if (agentId.includes('deploy') || agentId.includes('infra')) return '\u{1F680}';
  if (agentId.includes('fix') || agentId.includes('remediation')) return '\u{1F528}';
  return '\u{1F916}';
}

// === 布局函数 ===

/** 环形布局：编排者居中，Agent 等角度分布在外层圆上 */
function circularLayout(
  agents: string[], cx: number, cy: number, radius?: number,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const n = agents.length;
  if (n === 0) {
    positions[ORCHESTRATOR] = { x: cx, y: cy };
    return positions;
  }
  const r = radius ?? Math.max(130, n * 18);
  positions[ORCHESTRATOR] = { x: cx, y: cy };
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    positions[agents[i]] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }
  return positions;
}

/** 力导向布局：简单弹簧模型，用于 Gate C-impl */
function forceLayout(
  agents: string[], cx: number, cy: number,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  if (agents.length === 0) {
    positions[ORCHESTRATOR] = { x: cx, y: cy };
    return positions;
  }
  positions[ORCHESTRATOR] = { x: cx, y: cy };

  const n = agents.length;
  const kRepel = 600;
  const kAttract = 0.05;
  const maxIter = 60;
  const damping = 0.85;

  const vel: { x: number; y: number }[] = Array.from({ length: n }, () => ({ x: 0, y: 0 }));

  // 初始位置：圆形排列
  const initRadius = Math.max(140, n * 18);
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    positions[agents[i]] = {
      x: cx + initRadius * Math.cos(angle),
      y: cy + initRadius * Math.sin(angle),
    };
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const forces: { x: number; y: number }[] = Array.from({ length: n }, () => ({ x: 0, y: 0 }));

    // 节点间排斥力
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[agents[i]].x - positions[agents[j]].x;
        const dy = positions[agents[i]].y - positions[agents[j]].y;
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

    // 编排者引力
    for (let i = 0; i < n; i++) {
      const dx = cx - positions[agents[i]].x;
      const dy = cy - positions[agents[i]].y;
      forces[i].x += kAttract * dx;
      forces[i].y += kAttract * dy;
    }

    for (let i = 0; i < n; i++) {
      vel[i].x = (vel[i].x + forces[i].x) * damping;
      vel[i].y = (vel[i].y + forces[i].y) * damping;
      positions[agents[i]].x += vel[i].x;
      positions[agents[i]].y += vel[i].y;
    }
  }

  // 半径约束
  for (let i = 0; i < n; i++) {
    const dx = positions[agents[i]].x - cx;
    const dy = positions[agents[i]].y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 250) {
      const angle = Math.atan2(dy, dx);
      positions[agents[i]].x = cx + 200 * Math.cos(angle);
      positions[agents[i]].y = cy + 200 * Math.sin(angle);
    }
  }

  return positions;
}

/** 根据 Gate 类型选择布局 */
function getLayoutForGate(
  gate: string, agents: string[], cx: number, cy: number,
): Record<string, { x: number; y: number }> {
  const short = gate.replace('Gate ', '');
  switch (short) {
    case 'C-impl':
      return forceLayout(agents, cx, cy);
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

/** Agent 类型图例数据 */
const DEFAULT_AGENT_TYPES: { icon: string; label: string; color: string }[] = [
  { icon: '\u{1F3A8}', label: '前端', color: 'var(--ant-color-primary)' },
  { icon: '\u{1F527}', label: '后端', color: 'var(--ant-color-success)' },
  { icon: '\u{1F9EA}', label: '测试', color: '#722ED1' },
  { icon: '\u{1F50D}', label: '审查', color: 'var(--ant-color-warning)' },
  { icon: '\u{1F6E1}️', label: '安全', color: 'var(--ant-color-error)' },
  { icon: '\u{1F3D7}️', label: '架构', color: '#13C2C2' },
  { icon: '\u{1F4F1}', label: '移动端', color: '#389E0D' },
  { icon: '\u{1F916}', label: '其他', color: 'var(--ant-color-text-quaternary)' },
];

// ============================================================
// 组件
// ============================================================

export default function X6AgentGraph({ selectedGate, gateStatus, style, agentUsage }: Props) {
  const { token } = theme.useToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 400 });
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean; x: number; y: number; type: 'orchestrator' | 'agent'; agentId?: string;
  }>({ visible: false, x: 0, y: 0, type: 'orchestrator' });
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 注入 CSS 动画关键帧
  useEffect(() => {
    const styleId = 'x6-agentgraph-animations';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes agentPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
      @keyframes agentFadeInScale {
        from { opacity: 0; transform: scale(0.3); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes agentDashFlow {
        to { stroke-dashoffset: -20; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

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

  // 布局计算
  const layoutResult = useMemo(() => {
    const { w, h } = size;
    if (w === 0 || h === 0) return null;
    const cx = w / 2;
    const cy = h / 2;
    const positions = getLayoutForGate(selectedGate, agentIds, cx, cy);
    return { cx, cy, positions };
  }, [size, selectedGate, agentIds]);

  // Tooltip 事件
  const showTooltip = (type: 'orchestrator' | 'agent', agentId: string | undefined, e: React.MouseEvent) => {
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    setTooltipData({ visible: true, x: e.clientX, y: e.clientY, type, agentId });
  };

  const hideTooltip = () => {
    hideTimerRef.current = setTimeout(() => {
      setTooltipData(prev => ({ ...prev, visible: false }));
      hideTimerRef.current = null;
    }, 150);
  };

  // ============================================================
  // 渲染
  // ============================================================

  const orchNodeR = NODE_SIZES.orchestrator.w / 2; // 40
  const agentNodeR = NODE_SIZES.subagent.w / 2;    // 28
  const activeCount = agents.filter(a => a.status === 'active').length;
  const completedCount = agents.filter(a => a.status === 'completed').length;
  const failedCount = agents.filter(a => a.status === 'failed').length;

  return (
    <div style={{ position: 'relative', ...style }}>
      {/* SVG 画布容器 */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        {layoutResult && (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${size.w} ${size.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block' }}
          >
            <defs>
              <filter id="orchGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="agentGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 连线：编排者 → 子 Agent */}
            {agents.map(agent => {
              const pos = layoutResult.positions[agent.agent_id];
              if (!pos) return null;
              const orchPos = layoutResult.positions[ORCHESTRATOR];
              if (!orchPos) return null;

              const isActive = agent.status === 'active';
              const edgeStroke = isActive ? token.colorPrimary
                : agent.status === 'completed' ? token.colorSuccess
                : agent.status === 'failed' ? token.colorError
                : token.colorBorderSecondary;

              return (
                <line
                  key={`edge-${agent.agent_id}`}
                  x1={orchPos.x}
                  y1={orchPos.y}
                  x2={pos.x}
                  y2={pos.y}
                  stroke={edgeStroke}
                  strokeWidth={2.5}
                  strokeDasharray={isActive ? '4,3' : undefined}
                  strokeLinecap="round"
                  style={isActive ? { animation: 'agentDashFlow 1s linear infinite' } : undefined}
                />
              );
            })}

            {/* 编排者节点 */}
            {layoutResult.positions[ORCHESTRATOR] && (
              <g
                onMouseEnter={(e) => showTooltip('orchestrator', undefined, e)}
                onMouseLeave={hideTooltip}
                style={{ cursor: 'default' }}
              >
                <rect
                  x={layoutResult.positions[ORCHESTRATOR].x - orchNodeR}
                  y={layoutResult.positions[ORCHESTRATOR].y - orchNodeR}
                  width={orchNodeR * 2}
                  height={orchNodeR * 2}
                  rx={orchNodeR}
                  ry={orchNodeR}
                  fill={token.colorWarningBg}
                  stroke={token.colorWarning}
                  strokeWidth={4}
                  filter="url(#orchGlow)"
                />
                <rect
                  x={layoutResult.positions[ORCHESTRATOR].x - 35}
                  y={layoutResult.positions[ORCHESTRATOR].y - 35}
                  width={70}
                  height={70}
                  rx={35}
                  ry={35}
                  fill="none"
                  stroke={token.colorWarningBorder}
                  strokeWidth={1.5}
                />
                <text
                  x={layoutResult.positions[ORCHESTRATOR].x}
                  y={layoutResult.positions[ORCHESTRATOR].y + 5}
                  textAnchor="middle"
                  fill={token.colorWarningActive ?? token.colorWarningText}
                  fontSize={NODE_SIZES.orchestrator.fontSize}
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {'\u{1F9E0}\n\u{7F16}\u{6392}\u{8005}'}
                </text>
              </g>
            )}

            {/* 子 Agent 节点 */}
            {agents.map(agent => {
              const pos = layoutResult.positions[agent.agent_id];
              if (!pos) return null;
              const colors = getAgentColors(agent.agent_id, agent.status, token);
              const icon = agentIcon(agent.agent_id);
              const name = agent.agent_id.length > 17
                ? agent.agent_id.substring(0, 16) + '…'
                : agent.agent_id;
              const isActive = agent.status === 'active';
              const isCompleted = agent.status === 'completed';

              // 活跃节点呼吸动画
              const pulseAnim = isActive ? 'agentPulse 2s ease-in-out infinite' : undefined;

              return (
                <g
                  key={agent.agent_id}
                  onMouseEnter={(e) => showTooltip('agent', agent.agent_id, e)}
                  onMouseLeave={hideTooltip}
                  style={{ cursor: 'default' }}
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={agentNodeR}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isActive ? 3 : 2}
                    filter={isActive ? 'url(#agentGlow)' : undefined}
                    style={{
                      transformOrigin: `${pos.x}px ${pos.y}px`,
                      transformBox: 'fill-box',
                      animation: pulseAnim,
                    }}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 5}
                    textAnchor="middle"
                    fill={token.colorText}
                    fontSize={11}
                    style={{ pointerEvents: 'none' }}
                  >
                    {icon} {name}
                  </text>

                  {/* Token 用量显示（仅已完成 Agent） */}
                  {isCompleted && agentUsage?.agents?.[agent.agent_id] && (
                    <text
                      x={pos.x}
                      y={pos.y + agentNodeR + 16}
                      textAnchor="middle"
                      fill={token.colorTextTertiary}
                      fontSize={9}
                      style={{ pointerEvents: 'none' }}
                    >
                      {'\u{1F4E5}'}{formatTokens(agentUsage.agents[agent.agent_id].total_input_tokens)}
                      {' \u{1F4E4}'}{formatTokens(agentUsage.agents[agent.agent_id].total_output_tokens)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 无 Agent 时的占位文字 */}
            {agents.length === 0 && (
              <text
                x={size.w / 2}
                y={size.h / 2}
                textAnchor="middle"
                fill={token.colorTextQuaternary}
                fontSize={14}
              >
                等待子 Agent 启动...
              </text>
            )}
          </svg>
        )}
      </div>

      {/* 空状态 overlay */}
      {agents.length === 0 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ textAlign: 'center', color: token.colorTextQuaternary }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{'\u{1F916}'}</div>
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
      )}

      {/* Gate 标题 */}
      {agents.length > 0 && (
        <div style={{
          position: 'absolute', top: 8, left: 12, zIndex: 10, pointerEvents: 'none',
          fontSize: 13, fontWeight: 600, color: token.colorText,
          background: token.colorBgContainer, padding: '2px 10px',
          borderRadius: 6, opacity: 0.85,
        }}>
          {GATE_TITLES[selectedGate] || selectedGate}
        </div>
      )}

      {/* Agent 类型图例面板 */}
      {agents.length > 0 && (
        <div style={{
          position: 'absolute', top: 8, left: 12, zIndex: 100,
          display: 'flex', flexWrap: 'wrap', gap: '4px 10px',
          padding: '4px 10px', borderRadius: 8,
          background: token.colorBgContainer, opacity: 0.85,
          pointerEvents: 'none',
          marginTop: 28,
        }}>
          {DEFAULT_AGENT_TYPES.map(({ icon, label, color }) => (
            <span key={label} style={{
              fontSize: 11, color: token.colorTextSecondary,
              display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
            }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                backgroundColor: color, flexShrink: 0,
              }} />
              {icon} {label}
            </span>
          ))}
        </div>
      )}

      {/* Agent 计数标签栏 */}
      {agents.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 8, left: 8, right: 8,
          display: 'flex', gap: 6, zIndex: 10, pointerEvents: 'none',
        }}>
          {[
            { label: '活跃', count: activeCount, icon: '\u{1F7E2}', color: token.colorPrimary, bg: token.colorPrimaryBg },
            { label: '已完成', count: completedCount, icon: '✅', color: token.colorSuccess, bg: token.colorSuccessBg },
            { label: '失败', count: failedCount, icon: '❌', color: token.colorError, bg: token.colorErrorBg },
          ].filter(b => b.count > 0).map(b => (
            <span key={b.label} style={{
              fontSize: 11, background: b.bg, color: b.color,
              padding: '2px 8px', borderRadius: 4, fontWeight: 600,
            }}>
              {b.icon} {b.count} {b.label}
            </span>
          ))}
        </div>
      )}

      {/* Tooltip */}
      <div style={{
        opacity: tooltipData.visible ? 1 : 0,
        position: 'fixed', zIndex: 10000,
        background: token.colorBgElevated || token.colorBgContainer,
        border: `1.5px solid ${token.colorPrimaryBorder || token.colorBorder}`,
        borderRadius: 10, padding: '8px 12px', fontSize: 11,
        color: token.colorText,
        boxShadow: token.boxShadowSecondary || '0 4px 16px rgba(0,0,0,0.12)',
        pointerEvents: 'none', maxWidth: 240, lineHeight: 1.6,
        transition: 'opacity 150ms ease',
        left: Math.min(
          tooltipData.x + 14,
          (typeof window !== 'undefined' ? window.innerWidth : 1200) - 250,
        ),
        top: Math.max(4, tooltipData.y - 10),
        display: tooltipData.visible ? 'block' : 'none',
      }}>
        {tooltipData.type === 'orchestrator' && (
          <>
            <div style={{ fontWeight: 700 }}>{'\u{1F9E0}'} 编排者</div>
            <div style={{ fontSize: 11, color: token.colorTextTertiary }}>Jarvis 主控 Agent</div>
            <div style={{ fontSize: 10, color: token.colorTextQuaternary, marginTop: 2 }}>
              调度所有子 Agent 执行任务
            </div>
          </>
        )}
        {tooltipData.type === 'agent' && tooltipData.agentId && (() => {
          const agent = agents.find(a => a.agent_id === tooltipData.agentId);
          const safeId = escapeHtml(tooltipData.agentId);
          const safeModel = agent?.model ? escapeHtml(agent.model) : '';
          const statusLabel = agent?.status === 'active' ? '\u{1F7E2} 运行中'
            : agent?.status === 'completed' ? '✅ 已完成' : '❌ 失败';
          return (
            <>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {agentIcon(tooltipData.agentId!)} {safeId}
              </div>
              <div style={{ fontSize: 11 }}>{statusLabel}</div>
              {safeModel && (
                <div style={{ fontSize: 10, color: token.colorTextQuaternary }}>
                  模型: {safeModel}
                </div>
              )}
              {agent?.status === 'active' && (
                <div style={{ fontSize: 10, color: token.colorSuccess, marginTop: 2 }}>
                  ● 正在执行任务...
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
