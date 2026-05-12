import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock agent-registry 模块的函数，使用 vi.hoisted 避免 hoisting 时未初始化
const { mockAgentsByPlatform, mockGetPlatforms, mockGetPlatformModels, mockGetAgentList, mockPlatformFeatures } = vi.hoisted(() => ({
  mockAgentsByPlatform: vi.fn(),
  mockGetPlatforms: vi.fn(),
  mockGetPlatformModels: vi.fn(),
  mockGetAgentList: vi.fn(),
  mockPlatformFeatures: {
    claude: ['commands'],
    opencode: ['plugins'],
    codex: [],
  },
}));

vi.mock('../src/engine/agent-registry.js', () => ({
  getPlatforms: mockGetPlatforms,
  getPlatformModels: mockGetPlatformModels,
  getAgentsByPlatform: mockAgentsByPlatform,
  getAgentList: mockGetAgentList,
  PLATFORM_FEATURES: mockPlatformFeatures,
}));

// resolvePlatformInfo 导入在 mock 之后，确保使用 mock 版本
import { resolvePlatformInfo } from '../src/engine/server.js';

/** 测试用的假 agent 数据 */
function mockAgent(id: string, platform: string, model: string) {
  return {
    id, name: id, role: 'test', icon: 'cog',
    platform, defaultModel: model, defaultEffort: 'high',
    category: '支撑', fileName: `${id}.md`, subdir: 'agents',
  };
}

describe('resolvePlatformInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认 mock 数据：三平台 + 各平台 agent
    mockGetPlatforms.mockReturnValue(['claude', 'opencode', 'codex']);
    mockGetPlatformModels.mockReturnValue({
      claude: ['claude-sonnet-4-6', 'deepseek-v4-pro'],
      opencode: ['deepseek/deepseek-v4-pro', 'deepseek/deepseek-v4-flash'],
      codex: ['deepseek-v4-pro'],
    });
    mockAgentsByPlatform.mockImplementation((platform: string) => {
      const map: Record<string, ReturnType<typeof mockAgent>[]> = {
        claude: [mockAgent('backend-logic-expert', 'claude', 'claude-sonnet-4-6')],
        opencode: [mockAgent('opencode-frontend-dev-expert', 'opencode', 'deepseek/deepseek-v4-pro')],
        codex: [mockAgent('codex-algorithm-expert', 'codex', 'deepseek-v4-pro')],
      };
      return map[platform] || [];
    });
    mockGetAgentList.mockReturnValue([
      mockAgent('backend-logic-expert', 'claude', 'claude-sonnet-4-6'),
      mockAgent('opencode-frontend-dev-expert', 'opencode', 'deepseek/deepseek-v4-pro'),
      mockAgent('codex-algorithm-expert', 'codex', 'deepseek-v4-pro'),
    ]);
  });

  // ---- 场景 1: 不传参数，返回三平台完整信息 ----
  describe('不传参数时', () => {
    it('返回三平台完整信息：agent_count + available_models + features', () => {
      const result = resolvePlatformInfo() as { platforms: Record<string, { agent_count: number; available_models: string[]; features: string[] }>; total_agents: number };

      // total_agents
      expect(result.total_agents).toBe(3);

      // 三平台 summary
      expect(result.platforms).toHaveProperty('claude');
      expect(result.platforms).toHaveProperty('opencode');
      expect(result.platforms).toHaveProperty('codex');

      // claude
      expect(result.platforms.claude.agent_count).toBe(1);
      expect(result.platforms.claude.available_models).toEqual(['claude-sonnet-4-6', 'deepseek-v4-pro']);
      expect(result.platforms.claude.features).toEqual(['commands']);

      // opencode
      expect(result.platforms.opencode.agent_count).toBe(1);
      expect(result.platforms.opencode.available_models).toEqual(['deepseek/deepseek-v4-pro', 'deepseek/deepseek-v4-flash']);
      expect(result.platforms.opencode.features).toEqual(['plugins']);

      // codex
      expect(result.platforms.codex.agent_count).toBe(1);
      expect(result.platforms.codex.available_models).toEqual(['deepseek-v4-pro']);
      expect(result.platforms.codex.features).toEqual([]);
    });

    it('各平台 agent_count 必须为数字且 >= 0', () => {
      const result = resolvePlatformInfo() as { platforms: Record<string, { agent_count: number }>; total_agents: number };
      for (const p of ['claude', 'opencode', 'codex']) {
        expect(result.platforms[p]).toBeDefined();
        expect(typeof result.platforms[p].agent_count).toBe('number');
        expect(result.platforms[p].agent_count).toBeGreaterThanOrEqual(0);
      }
    });

    it('total_agents 等于各平台 agent_count 之和', () => {
      const result = resolvePlatformInfo() as { platforms: Record<string, { agent_count: number }>; total_agents: number };
      const sum = ['claude', 'opencode', 'codex']
        .reduce((acc, p) => acc + (result.platforms[p]?.agent_count || 0), 0);
      expect(result.total_agents).toBe(sum);
    });
  });

  // ---- 场景 2: 指定平台 opencode ----
  describe('指定 platform=opencode 时', () => {
    it('返回 features: ["plugins"]', () => {
      const result = resolvePlatformInfo('opencode') as { platform: string; features: string[]; error?: string };
      expect(result).not.toHaveProperty('error');
      expect(result.platform).toBe('opencode');
      expect(result.features).toEqual(['plugins']);
    });

    it('返回 opencode 的 agent_count 和 available_models', () => {
      const result = resolvePlatformInfo('opencode') as { agent_count: number; available_models: string[]; error?: string };
      expect(result.agent_count).toBe(1);
      expect(result.available_models).toEqual(['deepseek/deepseek-v4-pro', 'deepseek/deepseek-v4-flash']);
    });

    it('返回 agents 列表含必要字段', () => {
      const result = resolvePlatformInfo('opencode') as { agents: Array<{ id: string; name: string; role: string; category: string; defaultModel: string; defaultEffort: string }>; error?: string };
      expect(result.agents).toHaveLength(1);
      const agent = result.agents[0];
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('role');
      expect(agent).toHaveProperty('category');
      expect(agent).toHaveProperty('defaultModel');
      expect(agent).toHaveProperty('defaultEffort');
    });
  });

  // ---- 场景 3: 指定平台 claude ----
  describe('指定 platform=claude 时', () => {
    it('返回 features: ["commands"]', () => {
      const result = resolvePlatformInfo('claude') as { platform: string; features: string[]; error?: string };
      expect(result).not.toHaveProperty('error');
      expect(result.platform).toBe('claude');
      expect(result.features).toEqual(['commands']);
    });

    it('返回 claude 的 agent_count 和 available_models', () => {
      const result = resolvePlatformInfo('claude') as { agent_count: number; available_models: string[]; error?: string };
      expect(result.agent_count).toBe(1);
      expect(result.available_models).toEqual(['claude-sonnet-4-6', 'deepseek-v4-pro']);
    });
  });

  // ---- 场景 4: 指定平台 codex ----
  describe('指定 platform=codex 时', () => {
    it('返回 features: []（无平台特性）', () => {
      const result = resolvePlatformInfo('codex') as { platform: string; features: string[]; error?: string };
      expect(result).not.toHaveProperty('error');
      expect(result.platform).toBe('codex');
      expect(result.features).toEqual([]);
    });
  });

  // ---- 场景 5: 未知平台错误处理 ----
  describe('指定未知平台时', () => {
    it('返回错误信息，含可用平台列表', () => {
      const result = resolvePlatformInfo('unknown_platform') as { error: string };
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Unknown platform');
      expect(result.error).toContain('unknown_platform');
      expect(result.error).toContain('claude');
      expect(result.error).toContain('opencode');
      expect(result.error).toContain('codex');
    });

    it('未知平台不触发 agent 查询', () => {
      resolvePlatformInfo('nonexistent');
      expect(mockAgentsByPlatform).not.toHaveBeenCalled();
    });
  });

});
