import { describe, it, expect } from 'vitest';

// ============================================================
// TASK-003 — X6 节点信息展示增强
// 纯函数测试：Gate 颜色方案、Token/耗时格式化、Agent 状态色值
// ============================================================

import { getGateColorScheme } from '../X6FlowChart';
import { formatTokens, formatDuration, getAgentColors } from '../X6AgentGraph';

// ============================================================
// 测试1: FlowChart active Gate 为蓝色
// ============================================================
describe('X6NodeInfo — FlowChart Gate 节点信息展示', () => {
  it('测试1: getGateColorScheme — current 状态使用蓝色系', () => {
    const mockToken = {
      colorPrimaryBg: '#E6F7FF',
      colorPrimary: '#1677FF',
      colorPrimaryActive: '#0958D9',
      colorSuccessBg: '#F6FFED',
      colorSuccess: '#52C41A',
      colorErrorBg: '#FFF2F0',
      colorError: '#FF4D4F',
      colorBgElevated: '#FFFFFF',
      colorBgContainer: '#FFFFFF',
      colorBorderSecondary: '#D9D9D9',
      colorTextSecondary: '#666666',
    };

    const scheme = getGateColorScheme('current', mockToken as any);
    expect(scheme.fill, 'current fill 应为蓝色背景').toBe('#E6F7FF');
    expect(scheme.stroke, 'current stroke 应为蓝色').toBe('#1677FF');
    expect(scheme.labelFill, 'current labelFill 应为蓝色').toBe('#1677FF');
  });

  it('测试2: getGateColorScheme — passed 状态使用绿色系', () => {
    const mockToken = {
      colorPrimaryBg: '#E6F7FF',
      colorPrimary: '#1677FF',
      colorSuccessBg: '#F6FFED',
      colorSuccess: '#52C41A',
      colorErrorBg: '#FFF2F0',
      colorError: '#FF4D4F',
      colorBgElevated: '#FFFFFF',
      colorBgContainer: '#FFFFFF',
      colorBorderSecondary: '#D9D9D9',
      colorTextSecondary: '#666666',
    };

    const scheme = getGateColorScheme('passed', mockToken as any);
    expect(scheme.fill, 'passed fill 应为绿色背景').toBe('#F6FFED');
    expect(scheme.stroke, 'passed stroke 应为绿色').toBe('#52C41A');
    expect(scheme.labelFill, 'passed labelFill 应为绿色').toBe('#52C41A');
  });
});

// ============================================================
// 测试3-4: AgentGraph 节点信息 Token/耗时格式化
// ============================================================
describe('X6NodeInfo — AgentGraph 节点信息展示', () => {
  it('测试3: AgentGraph 节点包含 Token 文本', () => {
    expect(typeof formatTokens).toBe('function');

    expect(formatTokens(12500), '12.5k tokens 格式化为 "12.5K"').toBe('12.5K');
    expect(formatTokens(500), '<1000 tokens 格式化为 "500"').toBe('500');
    expect(formatTokens(null), 'null 返回 "--"').toBe('--');
    expect(formatTokens(undefined), 'undefined 返回 "--"').toBe('--');
    expect(formatTokens(1000), '1000 格式化为 "1.0K"').toBe('1.0K');
  });

  it('测试4: AgentGraph 节点包含耗时文本', () => {
    expect(typeof formatDuration).toBe('function');

    expect(formatDuration(3200), '3200ms 格式化为 "3.2s"').toBe('3.2s');
    expect(formatDuration(125000), '125000ms 格式化为 "2.1min"').toBe('2.1min');
    expect(formatDuration(null), 'null 返回 "--"').toBe('--');
    expect(formatDuration(undefined), 'undefined 返回 "--"').toBe('--');
    expect(formatDuration(500), '<1000ms 格式化为 "500ms"').toBe('500ms');
  });

  it('测试5: active status 使用实线边框色（getAgentColors 无类型匹配时回退到 status token）', () => {
    const mockToken = {
      colorPrimaryBg: '#E6F7FF',
      colorPrimary: '#1677FF',
      colorSuccessBg: '#F6FFED',
      colorSuccess: '#52C41A',
      colorErrorBg: '#FFF2F0',
      colorError: '#FF4D4F',
      colorFillQuaternary: '#F0F0F0',
      colorBorderSecondary: '#D9D9D9',
    };

    // 使用不匹配任何类型的 agent ID，回退到 status 色值
    const activeColors = getAgentColors('custom-worker', 'active', mockToken as any);
    expect(activeColors.stroke, 'active stroke 应为蓝色').toBe('#1677FF');
    expect(activeColors.fill, 'active fill 应为浅蓝背景').toBe('#E6F7FF');

    const completedColors = getAgentColors('custom-worker', 'completed', mockToken as any);
    expect(completedColors.stroke, 'completed stroke 应为绿色').toBe('#52C41A');

    const failedColors = getAgentColors('custom-worker', 'failed', mockToken as any);
    expect(failedColors.stroke, 'failed stroke 应为红色').toBe('#FF4D4F');

    const pendingColors = getAgentColors('custom-worker', 'pending', mockToken as any);
    expect(pendingColors.stroke, 'pending stroke 应为灰色').toBe('#D9D9D9');
    expect(pendingColors.fill, 'pending fill 应为灰色填充').toBe('#F0F0F0');
  });
});
