import { describe, it, expect } from 'vitest';
import {
  NODE_SIZES,
  ANIMATION_DEFAULTS,
  createColorScheme,
  AGENT_TYPE_COLORS,
  ORCHESTRATOR_STYLE,
} from '../x6-theme';
import type { GlobalToken } from 'antd';

/** 模拟 antd token，覆盖常用色值字段 */
function mockToken(): GlobalToken {
  return {
    colorSuccessBg: '#F6FFED',
    colorSuccess: '#52C41A',
    colorSuccessBorder: '#B7EB8F',
    colorSuccessActive: '#389E0D',
    colorPrimaryBg: '#E6F4FF',
    colorPrimary: '#1677FF',
    colorPrimaryBorder: '#91CAFF',
    colorPrimaryActive: '#0958D9',
    colorWarningBg: '#FFF7E6',
    colorWarning: '#FA8C16',
    colorWarningBorder: '#FFD591',
    colorWarningActive: '#AD6800',
    colorErrorBg: '#FFF2F0',
    colorError: '#FF4D4F',
    colorErrorBorder: '#FFCCC7',
    colorErrorActive: '#CF1322',
    colorBgElevated: '#FFFFFF',
    colorBgContainer: '#F5F5F5',
    colorBorderSecondary: '#D9D9D9',
    colorTextSecondary: '#8C8C8C',
    colorText: '#262626',
    colorTextQuaternary: '#BFBFBF',
    colorFillQuaternary: '#FAFAFA',
    colorBorder: '#D9D9D9',
    colorPrimaryText: '#1677FF',
    boxShadowSecondary: '0 4px 16px rgba(0,0,0,0.12)',
    colorPrimaryTextActive: '#0958D9',
  } as unknown as GlobalToken;
}

describe('NODE_SIZES', () => {
  it('所有节点类型都有定义', () => {
    expect(NODE_SIZES.gate).toBeDefined();
    expect(NODE_SIZES.agent).toBeDefined();
    expect(NODE_SIZES.orchestrator).toBeDefined();
    expect(NODE_SIZES.subagent).toBeDefined();
  });

  it('gate 尺寸大于 agent', () => {
    expect(NODE_SIZES.gate.w).toBeGreaterThan(NODE_SIZES.agent.w);
    expect(NODE_SIZES.gate.h).toBeGreaterThan(NODE_SIZES.agent.h);
  });

  it('orchestrator 和 gate 尺寸一致', () => {
    expect(NODE_SIZES.orchestrator.w).toBe(NODE_SIZES.gate.w);
    expect(NODE_SIZES.orchestrator.h).toBe(NODE_SIZES.gate.h);
  });

  it('subagent 尺寸介于 agent 和 gate 之间', () => {
    expect(NODE_SIZES.subagent.w).toBeGreaterThan(NODE_SIZES.agent.w);
    expect(NODE_SIZES.subagent.w).toBeLessThan(NODE_SIZES.gate.w);
    expect(NODE_SIZES.subagent.h).toBeGreaterThan(NODE_SIZES.agent.h);
    expect(NODE_SIZES.subagent.h).toBeLessThan(NODE_SIZES.gate.h);
  });
});

describe('ANIMATION_DEFAULTS', () => {
  it('所有动画参数都有默认值', () => {
    expect(ANIMATION_DEFAULTS.breathAmplitude).toBe(0.05);
    expect(ANIMATION_DEFAULTS.breathFrequency).toBe(3.0);
    expect(ANIMATION_DEFAULTS.dashFlowSpeed).toBe(0.5);
    expect(ANIMATION_DEFAULTS.entranceDuration).toBe(300);
    expect(ANIMATION_DEFAULTS.entranceEasing).toBe('ease-out');
    expect(ANIMATION_DEFAULTS.exitDuration).toBe(200);
    expect(ANIMATION_DEFAULTS.exitEasing).toBe('ease-in');
  });

  it('呼吸动画幅度在合理范围内', () => {
    expect(ANIMATION_DEFAULTS.breathAmplitude).toBeGreaterThan(0);
    expect(ANIMATION_DEFAULTS.breathAmplitude).toBeLessThan(0.3);
  });
});

describe('createColorScheme', () => {
  const token = mockToken();
  const scheme = createColorScheme(token);

  it('返回 gate 颜色方案', () => {
    expect(scheme.gate.passed).toEqual({
      fill: token.colorSuccessBg,
      stroke: token.colorSuccess,
      labelFill: token.colorSuccess,
    });
    expect(scheme.gate.current).toEqual({
      fill: token.colorPrimaryBg,
      stroke: token.colorPrimary,
      labelFill: token.colorPrimary,
    });
    expect(scheme.gate.future).toEqual({
      fill: token.colorBgElevated,
      stroke: token.colorBorderSecondary,
      labelFill: token.colorTextSecondary,
    });
  });

  it('返回 agent 颜色方案', () => {
    expect(scheme.agent.active.fill).toBe(token.colorPrimaryBg);
    expect(scheme.agent.active.stroke).toBe(token.colorPrimary);
    expect(scheme.agent.completed.fill).toBe(token.colorSuccessBg);
    expect(scheme.agent.completed.stroke).toBe(token.colorSuccess);
    expect(scheme.agent.failed.fill).toBe(token.colorErrorBg);
    expect(scheme.agent.failed.stroke).toBe(token.colorError);
  });

  it('返回 orchestrator 颜色方案', () => {
    expect(scheme.orchestrator.fill).toBe(token.colorWarningBg);
    expect(scheme.orchestrator.stroke).toBe(token.colorWarning);
    expect(scheme.orchestrator.labelFill).toBe(token.colorWarningActive);
  });

  it('返回 edge 颜色方案', () => {
    expect(scheme.edge.passed).toBe(token.colorSuccess);
    expect(scheme.edge.current).toBe(token.colorPrimary);
    expect(scheme.edge.future).toBe(token.colorBorderSecondary);
    expect(scheme.edge.active).toBe(token.colorPrimary);
    expect(scheme.edge.completed).toBe(token.colorSuccess);
    expect(scheme.edge.failed).toBe(token.colorError);
  });

  it('当 token 缺少 colorBgElevated 时回退到 colorBgContainer', () => {
    const partialToken = {
      colorSuccessBg: '#A',
      colorSuccess: '#B',
      colorPrimaryBg: '#C',
      colorPrimary: '#D',
      colorTextSecondary: '#E',
      colorBorderSecondary: '#F',
      colorBgContainer: '#G',
      colorWarningBg: '#H',
      colorWarning: '#I',
      colorWarningActive: '#J',
      colorErrorBg: '#K',
      colorError: '#L',
    } as unknown as GlobalToken;

    const s = createColorScheme(partialToken);
    expect(s.gate.future.fill).toBe('#G');
  });
});

describe('AGENT_TYPE_COLORS', () => {
  it('包含常见 agent 类型', () => {
    expect(AGENT_TYPE_COLORS.frontend).toBeDefined();
    expect(AGENT_TYPE_COLORS.backend).toBeDefined();
    expect(AGENT_TYPE_COLORS.test).toBeDefined();
    expect(AGENT_TYPE_COLORS.review).toBeDefined();
    expect(AGENT_TYPE_COLORS.security).toBeDefined();
    expect(AGENT_TYPE_COLORS.architect).toBeDefined();
    expect(AGENT_TYPE_COLORS.data).toBeDefined();
    expect(AGENT_TYPE_COLORS.api).toBeDefined();
    expect(AGENT_TYPE_COLORS.default).toBeDefined();
  });

  it('每个类型都包含 fill 和 stroke', () => {
    for (const [key, colors] of Object.entries(AGENT_TYPE_COLORS)) {
      expect(colors, `类型 ${key} 缺少 fill`).toHaveProperty('fill');
      expect(colors, `类型 ${key} 缺少 stroke`).toHaveProperty('stroke');
      expect(typeof colors.fill, `类型 ${key} fill 应为 string`).toBe('string');
      expect(typeof colors.stroke, `类型 ${key} stroke 应为 string`).toBe('string');
    }
  });

  it('键按长度降序排列以确保更具体的类型优先匹配', () => {
    const keys = Object.keys(AGENT_TYPE_COLORS).filter(k => k !== 'default');
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i - 1].length, `"${keys[i - 1]}" 应不短于 "${keys[i]}"`)
        .toBeGreaterThanOrEqual(keys[i].length);
    }
  });

  it('default 颜色值存在', () => {
    expect(AGENT_TYPE_COLORS.default).toEqual({
      fill: 'var(--ant-color-fill-quaternary)',
      stroke: 'var(--ant-color-text-quaternary)',
    });
  });
});

describe('ORCHESTRATOR_STYLE', () => {
  it('使用 rect 形状 + 大圆角产生胶囊形', () => {
    expect(ORCHESTRATOR_STYLE.shape).toBe('rect');
    expect(ORCHESTRATOR_STYLE.rx).toBe(40);
    expect(ORCHESTRATOR_STYLE.ry).toBe(40);
  });
});
