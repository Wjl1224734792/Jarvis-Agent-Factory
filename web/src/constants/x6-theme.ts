import type { GlobalToken } from 'antd';

/**
 * 节点尺寸常量
 * 定义各类型图节点的宽高与字体大小
 */
export const NODE_SIZES = {
  gate:        { w: 80, h: 80, fontSize: 12 },
  agent:       { w: 40, h: 40, fontSize: 10 },
  orchestrator:{ w: 80, h: 80, fontSize: 14 },
  subagent:    { w: 56, h: 56, fontSize: 11 },
} as const;

/**
 * 动画默认参数
 * 呼吸动画、虚线流动、入场/退场动画的默认值
 */
export const ANIMATION_DEFAULTS = {
  breathAmplitude: 0.05,
  breathFrequency: 3.0,
  dashFlowSpeed: 0.5,
  entranceDuration: 300,
  entranceEasing: 'ease-out',
  exitDuration: 200,
  exitEasing: 'ease-in',
} as const;

/**
 * 基于 antd token 生成完整色值映射
 * 覆盖 Gate 状态色、Agent 状态色、编排者色、边色
 *
 * @param token - antd 主题 token
 * @returns 色值映射对象
 */
export function createColorScheme(token: GlobalToken) {
  return {
    gate: {
      passed: {
        fill: token.colorSuccessBg,
        stroke: token.colorSuccess,
        labelFill: token.colorSuccess,
      },
      current: {
        fill: token.colorPrimaryBg,
        stroke: token.colorPrimary,
        labelFill: token.colorPrimary,
      },
      future: {
        fill: token.colorBgElevated ?? token.colorBgContainer,
        stroke: token.colorBorderSecondary,
        labelFill: token.colorTextSecondary,
      },
    },
    agent: {
      /** 运行中：蓝色系（token 缺失时回退到浅蓝/蓝色） */
      active: {
        fill: token.colorPrimaryBg ?? '#E6F7FF',
        stroke: token.colorPrimary ?? '#1677FF',
      },
      /** 已完成：绿色系（token 缺失时回退到浅绿/绿色） */
      completed: {
        fill: token.colorSuccessBg ?? '#F6FFED',
        stroke: token.colorSuccess ?? '#52C41A',
      },
      failed: {
        fill: token.colorErrorBg ?? '#FFF2F0',
        stroke: token.colorError ?? '#FF4D4F',
      },
    },
    orchestrator: {
      fill: token.colorWarningBg ?? '#FFF7E6',
      stroke: token.colorWarning ?? '#FA8C16',
      labelFill: token.colorWarningActive ?? '#AD6800',
    },
    edge: {
      passed: token.colorSuccess,
      current: token.colorPrimary,
      future: token.colorBorderSecondary,
      active: token.colorPrimary,
      completed: token.colorSuccess,
      failed: token.colorError,
    },
  };
}

/**
 * Agent 类型颜色映射
 * 不同 agent 类型使用不同的 var(--ant-*) CSS 变量作为 fill/stroke
 * 键按长度降序排列，确保 agentId.includes(key) 匹配时优先匹配更具体的类型
 */
export const AGENT_TYPE_COLORS: Record<string, { fill: string; stroke: string }> = {
  remediation: { fill: '#FFF2F0', stroke: '#FF4D4F' },
  architect:   { fill: '#E6FFFB', stroke: '#13C2C2' },
  frontend:    { fill: 'var(--ant-color-primary-bg)', stroke: 'var(--ant-color-primary)' },
  security:    { fill: 'var(--ant-color-error-bg)', stroke: 'var(--ant-color-error)' },
  research:    { fill: 'var(--ant-color-primary-bg)', stroke: 'var(--ant-color-primary)' },
  backend:     { fill: 'var(--ant-color-success-bg)', stroke: 'var(--ant-color-success)' },
  android:     { fill: '#F0FFF0', stroke: '#389E0D' },
  flutter:     { fill: '#E6F7FF', stroke: '#1677FF' },
  browser:     { fill: 'var(--ant-color-primary-bg)', stroke: 'var(--ant-color-primary)' },
  planner:     { fill: '#FFFBE6', stroke: '#FAAD14' },
  explore:     { fill: 'var(--ant-color-primary-bg)', stroke: 'var(--ant-color-primary)' },
  default:     { fill: 'var(--ant-color-fill-quaternary)', stroke: 'var(--ant-color-text-quaternary)' },
  deploy:      { fill: 'var(--ant-color-fill-quaternary)', stroke: 'var(--ant-color-text)' },
  review:      { fill: 'var(--ant-color-warning-bg)', stroke: 'var(--ant-color-warning)' },
  infra:       { fill: 'var(--ant-color-fill-quaternary)', stroke: 'var(--ant-color-text)' },
  test:        { fill: '#F9F0FF', stroke: '#722ED1' },
  data:        { fill: '#F0F5FF', stroke: '#2F54EB' },
  algo:        { fill: '#F0F5FF', stroke: '#2F54EB' },
  perf:        { fill: 'var(--ant-color-warning-bg)', stroke: 'var(--ant-color-warning)' },
  docs:        { fill: 'var(--ant-color-fill-quaternary)', stroke: 'var(--ant-color-text)' },
  taro:        { fill: '#F6FFED', stroke: '#52C41A' },
  e2e:         { fill: '#F9F0FF', stroke: '#722ED1' },
  ios:         { fill: '#FFF7E6', stroke: '#D46B08' },
  api:         { fill: '#FFF0F6', stroke: '#EB2F96' },
  fix:         { fill: '#FFF2F0', stroke: '#FF4D4F' },
  qa:          { fill: 'var(--ant-color-warning-bg)', stroke: 'var(--ant-color-warning)' },
};

/**
 * 编排者节点样式
 * 使用 rect + 大圆角产生胶囊形（不需要注册新 shape）
 * rx/ry 等于宽高一半时产生胶囊效果
 */
export const ORCHESTRATOR_STYLE = {
  shape: 'rect' as const,
  rx: 40,
  ry: 40,
} as const;
