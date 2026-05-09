/**
 * TASK-001: OpenCode Gate Hook 增强 — 单元测试
 *
 * 测试范围:
 *   1. tool.execute.before — Gate 满足/不满足/非关键工具
 *   2. tool.execute.after — Task 执行后事件上报
 *   3. session.idle — 流水线状态同步
 *   4. session.error — 错误事件记录
 *   5. permission.asked — 权限请求记录
 *   6. 硬阻断 — Gate NOT met 抛出 Error
 *   7. 错误处理 — execSync 异常时不影响流程
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JarvisGateCheck } from '../src/templates/platforms/opencode/plugins/jarvis-gate-check.js';

// ── Mock 安装 ──────────────────────────────────────────────
// vitest 会提升 vi.mock/vi.hoisted 到文件顶部

const { mockExecSync, mockFetch, mockConsoleError } = vi.hoisted(() => ({
  mockExecSync: vi.fn<(..._args: any[]) => string>(),
  mockFetch: vi.fn<typeof fetch>(),
  mockConsoleError: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execSync: mockExecSync,
}));

// 全局 fetch stub（Node 22+ 原生支持，此处 stub 以捕获调用）
vi.stubGlobal('fetch', mockFetch);
vi.spyOn(console, 'error').mockImplementation(mockConsoleError);

// ── 测试套件 ────────────────────────────────────────────────

describe('JarvisGateCheck Plugin — TASK-001', () => {
  /** 每次测试前重新初始化 hooks 实例 */
  let hooks: Awaited<ReturnType<typeof JarvisGateCheck>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
    hooks = await JarvisGateCheck({});
  });

  // ────────────────────────────────────────────────────────
  // 用例 1-3: tool.execute.before
  // ────────────────────────────────────────────────────────
  describe('tool.execute.before — 工具执行前 Gate 检查', () => {
    it('1 | Gate 满足时允许工具执行（不抛错）', async () => {
      mockExecSync.mockReturnValue('Gate A: met');

      await expect(
        hooks['tool.execute.before']({ tool: 'Task', params: { name: 'Task' } }),
      ).resolves.toBeUndefined();

      expect(mockExecSync).toHaveBeenCalledWith('jarvis hook gate-check', expect.any(Object));
    });

    it('2 | Gate 不满足时抛出 Error 硬阻断', async () => {
      mockExecSync.mockReturnValue('Gate C: NOT met — code quality check failed');

      await expect(
        hooks['tool.execute.before']({ tool: 'Write', params: {} }),
      ).rejects.toThrow(/\[Jarvis\] Gate BLOCKED/);
    });

    it('3 | 非关键工具（如 Read/Grep）不触发 gate-check', async () => {
      await expect(
        hooks['tool.execute.before']({ tool: 'Read', params: {} }),
      ).resolves.toBeUndefined();

      expect(mockExecSync).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────
  // 用例 4: tool.execute.after
  // ────────────────────────────────────────────────────────
  describe('tool.execute.after — Task 执行后事件上报', () => {
    it('4 | Task 工具执行后 POST 事件到 /api/events', async () => {
      mockExecSync.mockReturnValue('Gate A: met');

      await hooks['tool.execute.after'](
        { tool: 'Task', params: { name: 'Task' } },
        { result: 'done' },
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0]!;
      const url = call[0] as string;
      const init = call[1] as { body?: string | null; method?: string; headers?: Record<string, string> };
      expect(url).toBe('http://localhost:3456/api/events');
      expect(init.method!).toBe('POST');
      expect(init.headers!).toEqual({ 'Content-Type': 'application/json' });
      const body = JSON.parse(init.body! as string);
      expect(body.type).toBe('tool.execute.after');
      expect(body.tool).toBe('Task');
    });
  });

  // ────────────────────────────────────────────────────────
  // 用例 5: session.idle
  // ────────────────────────────────────────────────────────
  describe('session.idle — 流水线状态同步', () => {
    it('5 | 会话空闲时 POST /api/pipeline 同步状态', async () => {
      await hooks['session.idle']();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3456/api/pipeline',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const init = mockFetch.mock.calls[0]![1] as { body?: string | null };
      const body = JSON.parse(init.body! as string);
      expect(body.type).toBe('session.idle');
    });
  });

  // ────────────────────────────────────────────────────────
  // 用例 6: session.error
  // ────────────────────────────────────────────────────────
  describe('session.error — 错误事件记录', () => {
    it('6 | 错误发生时 POST 错误信息到 /api/events', async () => {
      const testError = new Error('Simulated session crash');

      await hooks['session.error'](testError);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3456/api/events',
        expect.objectContaining({ method: 'POST' }),
      );
      const init = mockFetch.mock.calls[0]![1] as { body?: string | null };
      const body = JSON.parse(init.body! as string);
      expect(body.type).toBe('session.error');
      expect(body.error).toContain('Simulated session crash');
    });
  });

  // ────────────────────────────────────────────────────────
  // 用例 7: permission.asked
  // ────────────────────────────────────────────────────────
  describe('permission.asked — 权限请求记录', () => {
    it('7 | 权限请求时记录到 /api/events', async () => {
      const permission = { tool: 'Bash', command: 'rm -rf /tmp/test' };

      await hooks['permission.asked'](permission);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3456/api/events',
        expect.objectContaining({ method: 'POST' }),
      );
      const init = mockFetch.mock.calls[0]![1] as { body?: string | null };
      const body = JSON.parse(init.body! as string);
      expect(body.type).toBe('permission.asked');
      expect(body.permission.tool).toBe('Bash');
    });
  });

  // ────────────────────────────────────────────────────────
  // 用例 8: 错误处理 — execSync / fetch 失败不影响流程
  // ────────────────────────────────────────────────────────
  describe('错误处理 — execSync 或 fetch 失败时不崩溃', () => {
    it('8 | execSync 抛出异常时不阻断 tool.execute.after 流程', async () => {
      mockExecSync.mockImplementation(() => {
        throw Object.assign(new Error('Command failed'), { stderr: 'mock stderr' });
      });

      // 不应抛出，只应 console.error
      await expect(
        hooks['tool.execute.after'](
          { tool: 'Task', params: { name: 'Task' } },
          { result: 'done' },
        ),
      ).resolves.toBeUndefined();

      // execSync 异常时仍有 console.error 输出
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[Jarvis] Gate check failed:',
        expect.any(String),
      );
    });

    it('9 | fetch 网络错误时不抛出异常', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      // session.idle 内部的 fetch 失败不应向外传播
      await expect(hooks['session.idle']()).resolves.toBeUndefined();

      // session.error 内部的 fetch 失败也不应向外传播
      await expect(hooks['session.error'](new Error('test'))).resolves.toBeUndefined();

      // permission.asked 内部的 fetch 失败也不应向外传播
      await expect(
        hooks['permission.asked']({ tool: 'Bash' }),
      ).resolves.toBeUndefined();
    });
  });
});
