import React from 'react';
import { theme, Tooltip } from 'antd';

// ============================================================
// 共享 X6 控制组件：缩放按钮组 + Agent 类型图例面板
// 用于 X6AgentGraph（含图例）和 X6FlowChart（仅缩放按钮）
// ============================================================

/** Agent 类型图例项数据结构 */
interface AgentTypeInfo {
  icon: string;
  label: string;
  color: string;
}

/** X6Controls 组件 Props */
interface X6ControlsProps {
  /** 放大回调 */
  onZoomIn: () => void;
  /** 缩小回调 */
  onZoomOut: () => void;
  /** 适应画布回调 */
  onZoomToFit: () => void;
  /** Agent 类型图例数据，未传时使用 DEFAULT_AGENT_TYPES */
  agentTypes?: AgentTypeInfo[];
  /** 是否显示 Agent 类型图例 */
  showLegend?: boolean;
  /** 额外样式（应用到按钮组容器） */
  style?: React.CSSProperties;
}

/** 默认 Agent 类型图例数据，覆盖 Jarvis 常见 Agent 类型 */
export const DEFAULT_AGENT_TYPES: AgentTypeInfo[] = [
  { icon: '🎨', label: '前端', color: 'var(--ant-color-primary)' },
  { icon: '🔧', label: '后端', color: 'var(--ant-color-success)' },
  { icon: '🧪', label: '测试', color: 'var(--ant-purple-7)' },
  { icon: '🔍', label: '审查', color: 'var(--ant-color-warning)' },
  { icon: '🛡️', label: '安全', color: 'var(--ant-color-error)' },
  { icon: '🏗️', label: '架构', color: 'var(--ant-cyan-7)' },
  { icon: '📱', label: '移动端', color: 'var(--ant-green-7)' },
  { icon: '🤖', label: '其他', color: 'var(--ant-color-text-quaternary)' },
];

/**
 * 共享 X6 控制组件
 * 提供缩放按钮组（右下角）和可选的 Agent 类型图例面板（左上角）
 */
export default function X6Controls({
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  agentTypes = DEFAULT_AGENT_TYPES,
  showLegend = false,
  style,
}: X6ControlsProps) {
  const { token } = theme.useToken();

  /** 缩放按钮通用样式，使用 antd token 保持主题一致性 */
  const btnStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: 6,
    background: token.colorBgContainer,
    color: token.colorText,
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    padding: 0,
  };

  return (
    <>
      {/* Agent 类型图例面板 — 左上角，半透明背景 */}
      {showLegend && agentTypes.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 12,
            zIndex: 100,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 10px',
            padding: '4px 10px',
            borderRadius: 8,
            background: token.colorBgContainer,
            opacity: 0.85,
            pointerEvents: 'none',
          }}
        >
          {agentTypes.map(({ icon, label, color }) => (
            <Tooltip key={label} title={`${icon} ${label}`}>
              <span
                style={{
                  fontSize: 11,
                  color: token.colorTextSecondary,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'auto',
                }}
              >
                {/* 类型颜色指示圆点 */}
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: color,
                    flexShrink: 0,
                  }}
                />
                {icon} {label}
              </span>
            </Tooltip>
          ))}
        </div>
      )}

      {/* 缩放控制按钮组 — 右下角 */}
      <div
        style={{
          position: 'absolute',
          bottom: 36,
          right: 12,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          ...style,
        }}
      >
        <Tooltip title="放大 (Ctrl+滚轮)">
          <button
            type="button"
            onClick={onZoomIn}
            aria-label="放大画布"
            aria-keyshortcuts="Control+Equal"
            style={btnStyle}
          >
            +
          </button>
        </Tooltip>
        <Tooltip title="缩小 (Ctrl+滚轮)">
          <button
            type="button"
            onClick={onZoomOut}
            aria-label="缩小画布"
            aria-keyshortcuts="Control+Minus"
            style={btnStyle}
          >
            −
          </button>
        </Tooltip>
        <Tooltip title="适应画布 (Ctrl+0)">
          <button
            type="button"
            onClick={onZoomToFit}
            aria-label="适应画布"
            aria-keyshortcuts="Control+Digit0"
            style={btnStyle}
          >
            ⊡
          </button>
        </Tooltip>
      </div>
    </>
  );
}
