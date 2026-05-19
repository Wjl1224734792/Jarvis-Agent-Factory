import { describe, it, expect, afterAll, vi } from 'vitest';
import { Hono } from 'hono';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';

// 模拟 homedir()，使全局命令目录指向临时目录
const MOCK_HOME = resolve(tmpdir(), `jarvis-test-home-${Date.now()}`);
vi.mock('node:os', async (importOriginal) => {
   
  const actual: any = await importOriginal();
  return { ...actual, homedir: () => MOCK_HOME };
});

// 动态导入以获取 mock 后的模块
const { setupApiRoutes } = await import('../src/web/routes.js');

/** 创建测试用 .md 指令文件 */
function createCommandFile(dir: string, name: string, description = '', extra = ''): void {
  mkdirSync(dir, { recursive: true });
  const frontmatter = description ? `---\ndescription: ${description}\n---\n\n` : '';
  const content = `${frontmatter}# ${name}\n\n${extra}`.trim();
  writeFileSync(join(dir, `${name}.md`), content, 'utf-8');
}

// ---- 测试目录常量 ----
const PROJECT_ROOT = resolve(tmpdir(), `jarvis-test-project-${Date.now()}`);
const PROJECT_CMDS = resolve(PROJECT_ROOT, '.claude', 'commands');
const GLOBAL_CMDS = resolve(MOCK_HOME, '.claude', 'commands');

describe('Commands API - GET /api/commands (TASK-CM-001)', () => {

  afterAll(() => {
    rmSync(PROJECT_ROOT, { recursive: true, force: true });
    rmSync(MOCK_HOME, { recursive: true, force: true });
  });

  // ========================================
  // 测试组 1: 双源加载与合并 (B1 / REQ-CM-001)
  // ========================================
  describe('B1: 双源加载合并', () => {

    it('T1.1 项目目录存在且有 .md 文件 → project.commands 非空，project.name = 项目根目录名', async () => {
      // 准备：项目有指令，全局为空
      mkdirSync(PROJECT_CMDS, { recursive: true });
      createCommandFile(PROJECT_CMDS, 'test-cmd', '测试指令');
      mkdirSync(GLOBAL_CMDS, { recursive: true });

      const app = new Hono();
      setupApiRoutes(app, null, PROJECT_ROOT);
      const res = await app.request('/api/commands');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.project.commands.length).toBeGreaterThan(0);
      expect(body.project.commands.some((c: any) => c.name === 'test-cmd')).toBe(true);
      expect(body.project.name).toBe(PROJECT_ROOT.split(/[\\/]/).filter(Boolean).pop());

      // 清理
      rmSync(PROJECT_CMDS, { recursive: true, force: true });
      rmSync(GLOBAL_CMDS, { recursive: true, force: true });
    });

    it('T1.2 项目 .claude/commands/ 目录不存在 → project.commands: []，不抛异常，HTTP 200', async () => {
      // 确保项目目录不存在
      rmSync(PROJECT_CMDS, { recursive: true, force: true });
      rmSync(GLOBAL_CMDS, { recursive: true, force: true });

      const app = new Hono();
      setupApiRoutes(app, null, PROJECT_ROOT);
      const res = await app.request('/api/commands');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.project.commands).toEqual([]);
    });

    it('T1.3 全局 ~/.claude/commands/ 目录存在且有 .md 文件 → global.commands 非空', async () => {
      rmSync(PROJECT_CMDS, { recursive: true, force: true });
      mkdirSync(GLOBAL_CMDS, { recursive: true });
      createCommandFile(GLOBAL_CMDS, 'global-cmd', '全局指令');

      const app = new Hono();
      setupApiRoutes(app, null, PROJECT_ROOT);
      const res = await app.request('/api/commands');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.global.commands.length).toBeGreaterThan(0);
      expect(body.global.commands.some((c: any) => c.name === 'global-cmd')).toBe(true);

      rmSync(GLOBAL_CMDS, { recursive: true, force: true });
    });

    it('T1.4 全局目录不存在 → global.commands: []，不抛异常，HTTP 200', async () => {
      // 项目有指令，全局目录不存在 → 不触发兜底，global.commands 应为空
      mkdirSync(PROJECT_CMDS, { recursive: true });
      createCommandFile(PROJECT_CMDS, 'proj-only', '仅项目指令');
      rmSync(GLOBAL_CMDS, { recursive: true, force: true });

      const app = new Hono();
      setupApiRoutes(app, null, PROJECT_ROOT);
      const res = await app.request('/api/commands');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.global.commands).toEqual([]);

      rmSync(PROJECT_CMDS, { recursive: true, force: true });
    });

    it('T1.5 同名指令（如 jarvis.md）同时存在于项目和全局 → 项目保留，全局排除', async () => {
      mkdirSync(PROJECT_CMDS, { recursive: true });
      mkdirSync(GLOBAL_CMDS, { recursive: true });
      createCommandFile(PROJECT_CMDS, 'shared-cmd', '项目版共享指令');
      createCommandFile(GLOBAL_CMDS, 'shared-cmd', '全局版共享指令');
      createCommandFile(GLOBAL_CMDS, 'only-global', '仅全局指令');

      const app = new Hono();
      setupApiRoutes(app, null, PROJECT_ROOT);
      const res = await app.request('/api/commands');
      const body = await res.json();

      expect(res.status).toBe(200);
      // 项目包含 shared-cmd
      expect(body.project.commands.some((c: any) => c.name === 'shared-cmd')).toBe(true);
      // 全局不包含 shared-cmd（被项目覆盖）
      expect(body.global.commands.some((c: any) => c.name === 'shared-cmd')).toBe(false);
      // 全局包含 only-global
      expect(body.global.commands.some((c: any) => c.name === 'only-global')).toBe(true);

      rmSync(PROJECT_CMDS, { recursive: true, force: true });
      rmSync(GLOBAL_CMDS, { recursive: true, force: true });
    });

    it('T1.6 两个目录各有不同指令文件 → 两组指令分别正确返回，无交叉污染', async () => {
      mkdirSync(PROJECT_CMDS, { recursive: true });
      mkdirSync(GLOBAL_CMDS, { recursive: true });
      createCommandFile(PROJECT_CMDS, 'proj-a', '项目指令A');
      createCommandFile(PROJECT_CMDS, 'proj-b', '项目指令B');
      createCommandFile(GLOBAL_CMDS, 'glob-x', '全局指令X');
      createCommandFile(GLOBAL_CMDS, 'glob-y', '全局指令Y');

      const app = new Hono();
      setupApiRoutes(app, null, PROJECT_ROOT);
      const res = await app.request('/api/commands');
      const body = await res.json();

      expect(res.status).toBe(200);
      const projNames = body.project.commands.map((c: any) => c.name);
      const globNames = body.global.commands.map((c: any) => c.name);
      expect(projNames).toContain('proj-a');
      expect(projNames).toContain('proj-b');
      expect(projNames).not.toContain('glob-x');
      expect(globNames).toContain('glob-x');
      expect(globNames).toContain('glob-y');
      expect(globNames).not.toContain('proj-a');

      rmSync(PROJECT_CMDS, { recursive: true, force: true });
      rmSync(GLOBAL_CMDS, { recursive: true, force: true });
    });

    it('T1.7 指令的 YAML frontmatter 正确解析 → description、argumentHint 字段正确提取', async () => {
      mkdirSync(PROJECT_CMDS, { recursive: true });
      mkdirSync(GLOBAL_CMDS, { recursive: true });
      // 创建带完整 frontmatter 的指令
      const fmContent = '---\ndescription: 测试描述信息\nargument-hint: <arg1> <arg2>\n---\n\n# 内容';
      writeFileSync(join(PROJECT_CMDS, 'fm-test.md'), fmContent, 'utf-8');

      const app = new Hono();
      setupApiRoutes(app, null, PROJECT_ROOT);
      const res = await app.request('/api/commands');
      const body = await res.json();

      expect(res.status).toBe(200);
      const cmd = body.project.commands.find((c: any) => c.name === 'fm-test');
      expect(cmd).toBeDefined();
      expect(cmd.description).toBe('测试描述信息');
      expect(cmd.argumentHint).toBe('<arg1> <arg2>');

      rmSync(PROJECT_CMDS, { recursive: true, force: true });
      rmSync(GLOBAL_CMDS, { recursive: true, force: true });
    });

    it('T1.8 pipelineType 和 category 正确推断', async () => {
      mkdirSync(PROJECT_CMDS, { recursive: true });
      mkdirSync(GLOBAL_CMDS, { recursive: true });
      // test-e2e.md → category: test, 含 "frontend" → pipelineType: frontend
      createCommandFile(PROJECT_CMDS, 'test-e2e', '端到端测试', '这是一个 frontend 测试指令');
      // refactor.md → category: refactor
      createCommandFile(GLOBAL_CMDS, 'refactor', '重构指令');

      const app = new Hono();
      setupApiRoutes(app, null, PROJECT_ROOT);
      const res = await app.request('/api/commands');
      const body = await res.json();

      expect(res.status).toBe(200);
      const testCmd = body.project.commands.find((c: any) => c.name === 'test-e2e');
      expect(testCmd).toBeDefined();
      expect(testCmd.category).toBe('test');
      expect(testCmd.pipelineType).toBe('frontend');

      const refactorCmd = body.global.commands.find((c: any) => c.name === 'refactor');
      expect(refactorCmd).toBeDefined();
      expect(refactorCmd.category).toBe('refactor');

      rmSync(PROJECT_CMDS, { recursive: true, force: true });
      rmSync(GLOBAL_CMDS, { recursive: true, force: true });
    });

    it('T1.9 指令按名称字母序排列 → project.commands 和 global.commands 均按 name 排序', async () => {
      mkdirSync(PROJECT_CMDS, { recursive: true });
      mkdirSync(GLOBAL_CMDS, { recursive: true });
      // 故意乱序创建
      createCommandFile(PROJECT_CMDS, 'zebra', 'Z');
      createCommandFile(PROJECT_CMDS, 'alpha', 'A');
      createCommandFile(PROJECT_CMDS, 'middle', 'M');
      createCommandFile(GLOBAL_CMDS, 'zulu', 'Z');
      createCommandFile(GLOBAL_CMDS, 'bravo', 'B');

      const app = new Hono();
      setupApiRoutes(app, null, PROJECT_ROOT);
      const res = await app.request('/api/commands');
      const body = await res.json();

      expect(res.status).toBe(200);
      const projNames = body.project.commands.map((c: any) => c.name);
      const globNames = body.global.commands.map((c: any) => c.name);
      expect(projNames).toEqual([...projNames].sort());
      expect(globNames).toEqual([...globNames].sort());

      rmSync(PROJECT_CMDS, { recursive: true, force: true });
      rmSync(GLOBAL_CMDS, { recursive: true, force: true });
    });
  });

  // ========================================
  // 测试组 2: 内置模板兜底 (B2 / REQ-CM-003)
  // ========================================
  describe('B2: 内置模板兜底', () => {

    it('T2.1 项目和全局目录均不存在 → 读取内置模板，指令放入 global.commands', async () => {
      rmSync(PROJECT_CMDS, { recursive: true, force: true });
      rmSync(GLOBAL_CMDS, { recursive: true, force: true });

      const app = new Hono();
      setupApiRoutes(app, null, PROJECT_ROOT);
      const res = await app.request('/api/commands');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.project.commands).toEqual([]);
      expect(body.global.commands.length).toBeGreaterThan(0);
      // 模板中有 jarvis.md
      expect(body.global.commands.some((c: any) => c.name === 'jarvis')).toBe(true);
    });

    it('T2.2 项目和全局目录存在但均为空（无 .md 文件）→ 触发模板兜底', async () => {
      mkdirSync(PROJECT_CMDS, { recursive: true });
      mkdirSync(GLOBAL_CMDS, { recursive: true });

      const app = new Hono();
      setupApiRoutes(app, null, PROJECT_ROOT);
      const res = await app.request('/api/commands');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.project.commands).toEqual([]);
      expect(body.global.commands.length).toBe(40);

      rmSync(PROJECT_CMDS, { recursive: true, force: true });
      rmSync(GLOBAL_CMDS, { recursive: true, force: true });
    });

    it('T2.3 至少一个来源有指令时，不触发兜底 → global.commands 不包含模板指令', async () => {
      mkdirSync(PROJECT_CMDS, { recursive: true });
      mkdirSync(GLOBAL_CMDS, { recursive: true });
      // 项目目录有一个指令
      createCommandFile(PROJECT_CMDS, 'my-cmd', '我的指令');

      const app = new Hono();
      setupApiRoutes(app, null, PROJECT_ROOT);
      const res = await app.request('/api/commands');
      const body = await res.json();

      expect(res.status).toBe(200);
      // 项目有指令，不应触发兜底
      expect(body.project.commands.length).toBe(1);
      // 全局为空（不触发兜底，因为项目有指令）
      expect(body.global.commands).toEqual([]);

      rmSync(PROJECT_CMDS, { recursive: true, force: true });
      rmSync(GLOBAL_CMDS, { recursive: true, force: true });
    });
  });

  // ========================================
  // 测试组 3: API 契约验证
  // ========================================
  describe('API 契约验证', () => {

    it('T3.1 返回正确 JSON 结构 { project: { name, commands }, global: { commands } }', async () => {
      rmSync(PROJECT_CMDS, { recursive: true, force: true });
      rmSync(GLOBAL_CMDS, { recursive: true, force: true });

      const app = new Hono();
      setupApiRoutes(app, null, PROJECT_ROOT);
      const res = await app.request('/api/commands');
      const body = await res.json();

      expect(res.status).toBe(200);
      // 顶层结构
      expect(body).toHaveProperty('project');
      expect(body).toHaveProperty('global');
      // project 子结构
      expect(body.project).toHaveProperty('name');
      expect(body.project).toHaveProperty('commands');
      expect(typeof body.project.name).toBe('string');
      expect(Array.isArray(body.project.commands)).toBe(true);
      // global 子结构
      expect(body.global).toHaveProperty('commands');
      expect(Array.isArray(body.global.commands)).toBe(true);
    });

    it('T3.2 不再返回旧格式 { commands, total }', async () => {
      rmSync(PROJECT_CMDS, { recursive: true, force: true });
      rmSync(GLOBAL_CMDS, { recursive: true, force: true });

      const app = new Hono();
      setupApiRoutes(app, null, PROJECT_ROOT);
      const res = await app.request('/api/commands');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).not.toHaveProperty('commands');
      expect(body).not.toHaveProperty('total');
    });
  });
});
