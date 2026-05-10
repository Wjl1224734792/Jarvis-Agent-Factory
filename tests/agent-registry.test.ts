import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  resolveTemplatesDir,
  getAgentList,
  getAgentFiles,
  getCategories,
} from '../src/engine/agent-registry.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ---- 三层配置合并测试的固定目录 ----
const MOCK_HOME = join(tmpdir(), 'jarvis-test-home-' + Date.now());
const MOCK_PROJECT = join(tmpdir(), 'jarvis-test-project-' + Date.now());

// Mock node:os homedir 指向测试临时目录
vi.mock('node:os', async (importOriginal) => {
  const mod = await importOriginal<typeof import('node:os')>();
  return {
    ...mod,
    homedir: () => MOCK_HOME,
  };
});

describe('resolveTemplatesDir', () => {
  it('dist 路径存在时优先返回 dist 路径', () => {
    const mockCheck = vi.fn().mockReturnValue(true);
    const dir = resolveTemplatesDir(mockCheck);
    // resolveTemplatesDir 优先检查的路径应包含 dist
    expect(mockCheck).toHaveBeenCalled();
    expect(dir).toContain('templates');
    expect(dir).toContain('platforms');
  });

  it('dist 路径不存在时回退到源码路径', () => {
    const mockCheck = vi.fn().mockReturnValue(false);
    const dir = resolveTemplatesDir(mockCheck);
    // 回退路径应包含 src
    expect(mockCheck).toHaveBeenCalled();
    expect(dir).toContain('src');
    expect(dir).toContain('templates');
    expect(dir).toContain('platforms');
    // 确认 dist 不在最终路径中（源码路径不含 dist）
    expect(dir).not.toContain('dist');
  });

  it('返回的路径是绝对路径', () => {
    const mockCheck = vi.fn().mockReturnValue(true);
    const dir = resolveTemplatesDir(mockCheck);
    expect(dir.startsWith('/') || /^[A-Z]:/.test(dir)).toBe(true);
  });
});

describe('getAgentList', () => {
  beforeEach(() => {
    // 强制重新扫描，确保惰性解析生效
    getAgentList(true);
  });

  it('返回非空 agent 列表', () => {
    const agents = getAgentList();
    expect(agents.length).toBeGreaterThan(0);
  });

  it('每个 agent 包含必要字段', () => {
    const agents = getAgentList();
    for (const a of agents) {
      expect(a).toHaveProperty('id');
      expect(a).toHaveProperty('name');
      expect(a).toHaveProperty('role');
      expect(a).toHaveProperty('icon');
      expect(a).toHaveProperty('platform');
      expect(a).toHaveProperty('defaultModel');
      expect(a).toHaveProperty('defaultEffort');
      expect(a).toHaveProperty('category');
    }
  });

  it('force=true 时重新扫描并返回与首次扫描相同数量', () => {
    const first = getAgentList();
    const second = getAgentList(true);
    expect(second.length).toBe(first.length);
  });

  it('覆盖 claude、opencode、codex 三个平台', () => {
    const agents = getAgentList();
    const platforms = new Set(agents.map(a => a.platform));
    expect(platforms).toContain('claude');
    expect(platforms).toContain('opencode');
    expect(platforms).toContain('codex');
  });
});

describe('getAgentFiles', () => {
  it('返回非空文件映射', () => {
    const files = getAgentFiles();
    expect(files).not.toBeNull();
    expect(Object.keys(files!).length).toBeGreaterThan(0);
    // 每个文件映射应包含 base 和 type
    for (const info of Object.values(files!)) {
      expect(info).toHaveProperty('base');
      expect(info).toHaveProperty('type');
      expect(['md', 'toml']).toContain(info.type);
    }
  });
});

describe('getCategories', () => {
  it('返回来源归属分类列表（无db时不含项目名）', () => {
    const cats = getCategories();
    expect(cats).toContain('全部');
    expect(cats).toContain('模板默认');
    expect(cats).toContain('全局配置');
  });
});

// ---- 三层配置合并测试 ----

describe('getAgentList 三层配置读取与合并', () => {
  /**
   * 夹具目录结构：
   * MOCK_HOME/.claude/agents/
   *   - test-global-only.md          → id=test-global-only（全局独有）
   *   - backend-logic-expert.md      → id=backend-logic-expert（覆写模板）
   *
   * MOCK_HOME/.config/opencode/agents/
   *   - test-global.md               → id=opencode-test-global（OpenCode 全局独有）
   *
   * MOCK_PROJECT/.claude/agents/
   *   - test-project-only.md         → id=test-project-only（项目独有）
   *   - backend-logic-expert.md      → id=backend-logic-expert（覆写全局+模板）
   */
  beforeAll(() => {
    // 全局配置：~/.claude/agents/
    const globalClaudeDir = join(MOCK_HOME, '.claude', 'agents');
    mkdirSync(globalClaudeDir, { recursive: true });

    // 全局独有智能体
    writeFileSync(join(globalClaudeDir, 'test-global-only.md'), `---
name: test-global-only
description: "全局独有测试智能体——不在模板中"
model: deepseek-v4-pro
effort: high
---
`);
    // 覆写模板 backend-logic-expert 的全局版本
    writeFileSync(join(globalClaudeDir, 'backend-logic-expert.md'), `---
name: global-backend-logic
description: "全局层覆写——名称与模板不同"
model: claude-sonnet-4-20250514
effort: medium
---
`);

    // 全局配置：~/.config/opencode/agents/
    const globalOpenCodeDir = join(MOCK_HOME, '.config', 'opencode', 'agents');
    mkdirSync(globalOpenCodeDir, { recursive: true });
    writeFileSync(join(globalOpenCodeDir, 'test-global.md'), `---
name: opencode-test-global
description: "全局 OpenCode 测试智能体"
model: deepseek/deepseek-v4-pro
effort: high
---
`);

    // 项目配置：{projectRoot}/.claude/agents/
    const projectAgentsDir = join(MOCK_PROJECT, '.claude', 'agents');
    mkdirSync(projectAgentsDir, { recursive: true });

    // 项目独有智能体
    writeFileSync(join(projectAgentsDir, 'test-project-only.md'), `---
name: test-project-only
description: "项目独有测试智能体——不在模板/全局中"
model: deepseek-v4-pro
effort: high
---
`);
    // 覆写 backend-logic-expert 的项目版本（优先级最高）
    writeFileSync(join(projectAgentsDir, 'backend-logic-expert.md'), `---
name: project-backend-logic
description: "项目层覆写——最终生效版本"
model: claude-opus-4-20250514
effort: max
---
`);
  });

  afterAll(() => {
    // 清理临时目录
    try { rmSync(MOCK_HOME, { recursive: true, force: true }); } catch {}
    try { rmSync(MOCK_PROJECT, { recursive: true, force: true }); } catch {}
  });

  it('传入 projectRoot 时返回合并后的列表（含模板+全局+项目智能体）', () => {
    const agents = getAgentList(true, MOCK_PROJECT);
    const ids = new Set(agents.map(a => a.id));

    // 模板智能体仍在（未覆写的）
    expect(ids.has('algorithm-expert')).toBe(true);
    expect(ids.has('frontend-dev-expert')).toBe(true);

    // 全局独有智能体出现
    expect(ids.has('test-global-only')).toBe(true);
    expect(ids.has('opencode-test-global')).toBe(true);

    // 项目独有智能体出现
    expect(ids.has('test-project-only')).toBe(true);
  });

  it('项目级配置覆写全局级同名智能体（backend-logic-expert）', () => {
    const agents = getAgentList(true, MOCK_PROJECT);
    const ble = agents.find(a => a.id === 'backend-logic-expert');
    expect(ble).toBeDefined();
    // 项目级覆写生效：名称、模型、effort 均为项目版本
    expect(ble!.name).toBe('project-backend-logic');
    expect(ble!.defaultModel).toBe('claude-opus-4-20250514');
    expect(ble!.defaultEffort).toBe('max');
  });

  it('全局级配置覆写模板默认同名智能体（当无项目级时）', () => {
    // 使用不存在的 projectRoot，确保只有全局 + 模板
    const noProjectDir = join(tmpdir(), 'jarvis-test-no-project-' + Date.now());
    const agents = getAgentList(true, noProjectDir);
    const ble = agents.find(a => a.id === 'backend-logic-expert');
    expect(ble).toBeDefined();
    // 全局覆写生效：名称、模型、effort 均为全局版本
    expect(ble!.name).toBe('global-backend-logic');
    expect(ble!.defaultModel).toBe('claude-sonnet-4-20250514');
    expect(ble!.defaultEffort).toBe('medium');
    // 清理
    try { rmSync(noProjectDir, { recursive: true, force: true }); } catch {}
  });

  it('不传 projectRoot 时仅返回模板默认列表（向后兼容）', () => {
    const agents = getAgentList(true);
    const ids = new Set(agents.map(a => a.id));

    // 模板智能体存在
    expect(ids.has('algorithm-expert')).toBe(true);
    expect(ids.has('backend-logic-expert')).toBe(true);

    // 全局/项目独有智能体不应出现
    expect(ids.has('test-global-only')).toBe(false);
    expect(ids.has('test-project-only')).toBe(false);
  });

  it('projectRoot 变化时刷新缓存', () => {
    // 创建另一个项目目录，含不同的智能体
    const otherProject = join(tmpdir(), 'jarvis-test-other-' + Date.now());
    const otherAgentsDir = join(otherProject, '.claude', 'agents');
    mkdirSync(otherAgentsDir, { recursive: true });
    writeFileSync(join(otherAgentsDir, 'test-other-project.md'), `---
name: test-other-project
description: "另一个项目的智能体"
model: deepseek-v4-pro
effort: high
---
`);

    // 先查询 MOCK_PROJECT
    const agents1 = getAgentList(true, MOCK_PROJECT);
    const ids1 = new Set(agents1.map(a => a.id));
    expect(ids1.has('test-project-only')).toBe(true);
    expect(ids1.has('test-other-project')).toBe(false);

    // 切换到 otherProject（缓存应刷新）
    const agents2 = getAgentList(false, otherProject);
    const ids2 = new Set(agents2.map(a => a.id));
    expect(ids2.has('test-project-only')).toBe(false);
    expect(ids2.has('test-other-project')).toBe(true);

    // 切回 MOCK_PROJECT
    const agents3 = getAgentList(false, MOCK_PROJECT);
    const ids3 = new Set(agents3.map(a => a.id));
    expect(ids3.has('test-project-only')).toBe(true);
    expect(ids3.has('test-other-project')).toBe(false);

    // 清理
    try { rmSync(otherProject, { recursive: true, force: true }); } catch {}
  });
});
