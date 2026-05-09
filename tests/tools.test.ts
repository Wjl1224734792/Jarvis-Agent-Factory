/**
 * TASK-002: OpenCode 原生自定义工具 — 单元测试
 *
 * 测试范围:
 *   1. jarvis-gate-check — 正常调用 + 错误处理
 *   2. jarvis-gate-advance — 正常调用 + 错误处理
 *   3. jarvis-pipeline-status — 正常调用 + 错误处理
 *   4. jarvis-report — 正常调用 + 错误处理
 *   5. jarvis-agent-config — 正常调用 + 错误处理
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock 安装 ──────────────────────────────────────────────
// vitest 会提升 vi.mock 到文件顶部

const { mockToolFn, mockExecSync, mockExecFileSync } = vi.hoisted(() => {
  // 构建 tool.schema.* 链式调用 mock
  const chainable = {
    describe: (_desc: string) => chainable,
    optional: () => chainable,
    default: (_val: unknown) => chainable,
  };
  const schemaMock = {
    string: () => chainable,
    number: () => chainable,
    boolean: () => chainable,
    array: (_of?: unknown) => chainable,
    object: (_shape?: unknown) => chainable,
  };
  const toolFn = vi.fn((config: Record<string, unknown>) => config);
  Object.assign(toolFn, { schema: schemaMock });
  return {
    mockToolFn: toolFn,
    mockExecSync: vi.fn<(..._args: any[]) => string>(),
    mockExecFileSync: vi.fn<(..._args: any[]) => string>(),
  };
});

vi.mock('@opencode-ai/plugin', () => ({
  tool: mockToolFn,
}));

vi.mock('node:child_process', () => ({
  execSync: mockExecSync,
  execFileSync: mockExecFileSync,
}));

// ── 动态导入工具文件 ──────────────────────────────────────
// 每个工具文件使用 import() 以通过 vitest 的模块解析
async function loadTool(name: string) {
  const path = `../src/templates/platforms/opencode/tools/${name}.js`;
  return (await import(path)).default;
}

// ── 测试套件 ────────────────────────────────────────────────

describe('TASK-002: OpenCode 原生自定义工具', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────
  // 工具 1: jarvis-gate-check
  // ────────────────────────────────────────────────────────
  describe('jarvis-gate-check — Gate操作检查', () => {
    it('1 | 工具定义含中文 describe() 和 operation 参数', async () => {
      const tool = await loadTool('jarvis-gate-check');

      expect(tool.description).toBeTruthy();
      expect(tool.description).toEqual(expect.stringContaining('Gate'));
      expect(tool.args).toHaveProperty('operation');
    });

    it('2 | execute 正常返回时输出格式化中文结果', async () => {
      mockExecFileSync.mockReturnValue('✅ Gate C: 操作 "spawn_impl" 允许执行 (全流程)');

      const tool = await loadTool('jarvis-gate-check');
      const result = await tool.execute({ operation: 'spawn_impl' });

      expect(result).toContain('允许执行');
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'jarvis',
        ['hook', 'gate-check', '--operation', 'spawn_impl'],
        expect.objectContaining({ encoding: 'utf-8' }),
      );
    });

    it('3 | execute 异常时捕获 stderr/stdout 并返回错误信息', async () => {
      const err = Object.assign(new Error('Command failed'), {
        stderr: '🚫 Gate C: 操作 "deploy" 被禁止',
        stdout: '',
      });
      mockExecFileSync.mockImplementation(() => { throw err; });

      const tool = await loadTool('jarvis-gate-check');
      const result = await tool.execute({ operation: 'deploy' });

      expect(result).toContain('被禁止');
    });
  });

  // ────────────────────────────────────────────────────────
  // 工具 2: jarvis-gate-advance
  // ────────────────────────────────────────────────────────
  describe('jarvis-gate-advance — Gate推进', () => {
    it('4 | 工具定义含中文 describe() 和 gate 参数', async () => {
      const tool = await loadTool('jarvis-gate-advance');

      expect(tool.description).toBeTruthy();
      expect(tool.description).toEqual(expect.stringContaining('Gate'));
      expect(tool.args).toHaveProperty('gate');
    });

    it('5 | execute 正常推进返回格式化结果', async () => {
      mockExecFileSync.mockReturnValue('🚀 Gate C → Gate C1 (next: Gate C1.5)');

      const tool = await loadTool('jarvis-gate-advance');
      const result = await tool.execute({ gate: 'Gate C1' });

      expect(result).toContain('→');
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'jarvis',
        expect.arrayContaining(['hook', 'gate-advance', '--gate', 'Gate C1']),
        expect.any(Object),
      );
    });

    it('6 | execute 推进被阻止时返回错误信息', async () => {
      const err = Object.assign(new Error('Blocked'), {
        stderr: '🚫 BLOCKED — Gate C conditions NOT met',
        stdout: '',
      });
      mockExecFileSync.mockImplementation(() => { throw err; });

      const tool = await loadTool('jarvis-gate-advance');
      const result = await tool.execute({ gate: 'Gate D' });

      expect(result).toContain('BLOCKED');
    });
  });

  // ────────────────────────────────────────────────────────
  // 工具 3: jarvis-pipeline-status
  // ────────────────────────────────────────────────────────
  describe('jarvis-pipeline-status — 流水线状态', () => {
    it('7 | 工具定义含中文 describe()，args 为空对象', async () => {
      const tool = await loadTool('jarvis-pipeline-status');

      expect(tool.description).toBeTruthy();
      expect(tool.description).toEqual(expect.stringContaining('流水线'));
      expect(tool.args).toEqual({});
    });

    it('8 | execute 正常返回格式化中文状态', async () => {
      mockExecSync.mockReturnValue(JSON.stringify({
        sessions: [{
          session_id: 'sesh-001',
          platform: 'opencode',
          pipeline_name: '全流程',
          status: 'active',
          current_gate: 'Gate C',
          gates: [
            { gate: 'Gate A', passed: true, duration_display: '5分' },
            { gate: 'Gate B', passed: true, duration_display: '12分' },
            { gate: 'Gate C', passed: false },
          ],
        }],
        active_count: 1,
      }));

      const tool = await loadTool('jarvis-pipeline-status');
      const result = await tool.execute();

      expect(result).toContain('流水线状态报告');
      expect(result).toContain('sesh-001');
      expect(result).toContain('全流程');
      expect(result).toContain('Gate C');
      expect(result).toContain('2/3');
      expect(result).toContain('67%');
      expect(result).toContain('✅ Gate A');
      expect(result).toContain('✅ Gate B');
      expect(result).toContain('⬜ Gate C');
      expect(mockExecSync).toHaveBeenCalledWith(
        'jarvis hook status --json',
        expect.any(Object),
      );
    });

    it('8b | execute 无会话时返回提示', async () => {
      mockExecSync.mockReturnValue(JSON.stringify({ sessions: [], active_count: 0 }));

      const tool = await loadTool('jarvis-pipeline-status');
      const result = await tool.execute();

      expect(result).toContain('暂无活跃流水线会话');
    });

    it('9 | execute 异常时返回错误信息', async () => {
      const err = Object.assign(new Error('ECONNREFUSED'), {
        stderr: 'Engine: not running',
        stdout: '',
      });
      mockExecSync.mockImplementation(() => { throw err; });

      const tool = await loadTool('jarvis-pipeline-status');
      const result = await tool.execute();

      expect(result).toContain('not running');
    });
  });

  // ────────────────────────────────────────────────────────
  // 工具 4: jarvis-report
  // ────────────────────────────────────────────────────────
  describe('jarvis-report — 流水线报告', () => {
    it('10 | 工具定义含中文 describe()，args 为空对象', async () => {
      const tool = await loadTool('jarvis-report');

      expect(tool.description).toBeTruthy();
      expect(tool.description).toEqual(expect.stringContaining('报告'));
      expect(tool.args).toEqual({});
    });

    it('11 | execute 正常返回格式化报告', async () => {
      mockExecSync.mockReturnValue('🟢 全流程 · Gate C · 进度 3/8 (38%)');

      const tool = await loadTool('jarvis-report');
      const result = await tool.execute();

      expect(result).toContain('进度');
      expect(mockExecSync).toHaveBeenCalledWith(
        'jarvis hook report-status',
        expect.any(Object),
      );
    });

    it('12 | execute 引擎未运行返回提示', async () => {
      mockExecSync.mockReturnValue('Engine: not running. Start with: jarvis engine start');

      const tool = await loadTool('jarvis-report');
      const result = await tool.execute();

      expect(result).toContain('not running');
    });
  });

  // ────────────────────────────────────────────────────────
  // 工具 5: jarvis-agent-config
  // ────────────────────────────────────────────────────────
  describe('jarvis-agent-config — Agent配置', () => {
    it('13 | 工具定义含中文 describe()，含 agent_id/model/effort 参数', async () => {
      const tool = await loadTool('jarvis-agent-config');

      expect(tool.description).toBeTruthy();
      expect(tool.description).toEqual(expect.stringContaining('智能体'));
      expect(tool.args).toHaveProperty('agent_id');
      expect(tool.args).toHaveProperty('model');
      expect(tool.args).toHaveProperty('effort');
    });

    it('14 | execute 设置模式传递 --agent-id --model --effort', async () => {
      mockExecFileSync.mockReturnValue('✅ Agent "frontend-implementer": 模型=gpt-5.5, 思考等级=high');

      const tool = await loadTool('jarvis-agent-config');
      const result = await tool.execute({
        agent_id: 'frontend-implementer',
        model: 'gpt-5.5',
        effort: 'high',
      });

      expect(result).toContain('frontend-implementer');
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'jarvis',
        expect.arrayContaining(['hook', 'agent-config', '--agent-id', 'frontend-implementer', '--model', 'gpt-5.5', '--effort', 'high']),
        expect.any(Object),
      );
    });

    it('15 | execute 查询模式只传 agent_id 返回配置信息', async () => {
      mockExecFileSync.mockReturnValue('{"id":"backend-architect","name":"后端架构师","model":"deepseek-v4-pro","effort":"high"}');

      const tool = await loadTool('jarvis-agent-config');
      const result = await tool.execute({ agent_id: 'backend-architect' });

      expect(result).toContain('backend-architect');
    });

    it('16 | execute 异常时返回错误', async () => {
      const err = Object.assign(new Error('Not found'), {
        stderr: '⚠️ Agent "unknown" 未找到',
        stdout: '',
      });
      mockExecFileSync.mockImplementation(() => { throw err; });

      const tool = await loadTool('jarvis-agent-config');
      const result = await tool.execute({ agent_id: 'unknown' });

      expect(result).toContain('未找到');
    });
  });
});
