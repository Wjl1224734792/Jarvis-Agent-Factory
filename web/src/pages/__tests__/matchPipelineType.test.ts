import { describe, it, expect } from 'vitest';
import { matchPipelineType } from '../matchPipelineType';

describe('matchPipelineType', () => {
  // === REQ-021: '轻量' case Bug 修复 ===
  describe('轻量 (REQ-021)', () => {
    it('应匹配 jarvis-lite 开头的智能体', () => {
      expect(matchPipelineType('jarvis-lite', '轻量')).toBe(true);
      expect(matchPipelineType('jarvis-lite-dev', '轻量')).toBe(true);
    });

    it('应匹配 remediation-expert', () => {
      expect(matchPipelineType('remediation-expert', '轻量')).toBe(true);
    });

    it('不应匹配非轻量智能体', () => {
      expect(matchPipelineType('frontend-dev', '轻量')).toBe(false);
      expect(matchPipelineType('backend-api', '轻量')).toBe(false);
    });
  });

  // === REQ-020: '移动端' case 新增 ===
  describe('移动端 (REQ-020)', () => {
    it('应匹配 android-* 开头的智能体', () => {
      expect(matchPipelineType('android-dev', '移动端')).toBe(true);
      expect(matchPipelineType('android-ui', '移动端')).toBe(true);
    });

    it('应匹配 ios-* 开头的智能体', () => {
      expect(matchPipelineType('ios-dev', '移动端')).toBe(true);
      expect(matchPipelineType('ios-logic', '移动端')).toBe(true);
    });

    it('应匹配 flutter-* 开头的智能体', () => {
      expect(matchPipelineType('flutter-dev', '移动端')).toBe(true);
    });

    it('应匹配包含 expo 的智能体', () => {
      expect(matchPipelineType('expo-dev', '移动端')).toBe(true);
      expect(matchPipelineType('my-expo-app', '移动端')).toBe(true);
    });

    it('应匹配 taro-* 开头的智能体', () => {
      expect(matchPipelineType('taro-dev', '移动端')).toBe(true);
    });

    it('应匹配 react-native-* 开头的智能体', () => {
      expect(matchPipelineType('react-native-dev', '移动端')).toBe(true);
    });

    it('不应匹配非移动端智能体', () => {
      expect(matchPipelineType('frontend-dev', '移动端')).toBe(false);
      expect(matchPipelineType('backend-api', '移动端')).toBe(false);
      expect(matchPipelineType('jarvis-lite', '移动端')).toBe(false);
    });
  });

  // === REQ-020: '全流程' case 排除移动端 ===
  describe('全流程排除移动端 (REQ-020)', () => {
    it('不应匹配 android-* 智能体', () => {
      expect(matchPipelineType('android-dev', '全流程')).toBe(false);
    });

    it('不应匹配 ios-* 智能体', () => {
      expect(matchPipelineType('ios-dev', '全流程')).toBe(false);
    });

    it('不应匹配 flutter-* 智能体', () => {
      expect(matchPipelineType('flutter-dev', '全流程')).toBe(false);
    });

    it('不应匹配包含 expo 的智能体', () => {
      expect(matchPipelineType('expo-dev', '全流程')).toBe(false);
    });

    it('不应匹配 taro-* 智能体', () => {
      expect(matchPipelineType('taro-dev', '全流程')).toBe(false);
    });

    it('不应匹配 react-native-* 智能体', () => {
      expect(matchPipelineType('react-native-dev', '全流程')).toBe(false);
    });

    it('仍应匹配 frontend-* 智能体', () => {
      expect(matchPipelineType('frontend-dev', '全流程')).toBe(true);
    });

    it('仍应匹配 backend-* 智能体', () => {
      expect(matchPipelineType('backend-api', '全流程')).toBe(true);
    });

    it('仍应匹配通用智能体', () => {
      expect(matchPipelineType('code-explore', '全流程')).toBe(true);
      expect(matchPipelineType('infra-deploy', '全流程')).toBe(true);
    });

    it('应匹配 browser-use-expert', () => {
      expect(matchPipelineType('browser-use-expert', '全流程')).toBe(true);
    });

    it('不应匹配已移除的 docs-research-expert', () => {
      expect(matchPipelineType('docs-research-expert', '全流程')).toBe(false);
    });
  });

  // === 分类不重复验证 ===
  describe('分类不重复', () => {
    const mobileIds = [
      'android-dev', 'ios-dev', 'flutter-dev', 'expo-dev',
      'taro-dev', 'react-native-dev',
    ];

    it('移动端智能体不应同时出现在全流程中', () => {
      for (const id of mobileIds) {
        expect(matchPipelineType(id, '移动端')).toBe(true);
        expect(matchPipelineType(id, '全流程')).toBe(false);
      }
    });

    it('轻量智能体不应同时出现在全流程中', () => {
      const liteIds = ['jarvis-lite', 'remediation-expert'];
      for (const id of liteIds) {
        expect(matchPipelineType(id, '轻量')).toBe(true);
        expect(matchPipelineType(id, '全流程')).toBe(false);
      }
    });
  });

  // === 原有分类保持不变 ===
  describe('原有分类保持不变', () => {
    it('前端: 匹配 frontend-*', () => {
      expect(matchPipelineType('frontend-dev', '前端')).toBe(true);
      expect(matchPipelineType('backend-api', '前端')).toBe(false);
    });

    it('后端: 匹配 backend-*', () => {
      expect(matchPipelineType('backend-api', '后端')).toBe(true);
      expect(matchPipelineType('frontend-dev', '后端')).toBe(false);
    });

    it('架构: 匹配 architect / algorithm-expert', () => {
      expect(matchPipelineType('frontend-architect', '架构')).toBe(true);
      expect(matchPipelineType('algorithm-expert', '架构')).toBe(true);
    });

    it('测试: 匹配 *-test-* 及已知测试智能体', () => {
      expect(matchPipelineType('frontend-test-dev', '测试')).toBe(true);
      expect(matchPipelineType('browser-test', '测试')).toBe(true);
    });

    it('审查: 匹配 *-review-* 及已知审查智能体', () => {
      expect(matchPipelineType('code-review-agent', '审查')).toBe(true);
      expect(matchPipelineType('qa-review', '审查')).toBe(true);
    });

    it('default: 匹配所有', () => {
      expect(matchPipelineType('anything', 'unknown')).toBe(true);
    });
  });
});
