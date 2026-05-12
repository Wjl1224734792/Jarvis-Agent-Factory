import { describe, it, expect, vi } from 'vitest';

// 延迟导入：测试用 mock promptFn 注入，不触发真实 I/O
// resolveScope 在 scope.ts 中定义，测试仅验证其逻辑分支

describe('resolveScope', () => {
  // 动态 import 以便 vite 可以 tree-shake 并正确处理 ESM
  async function importScope() {
    return await import('../src/cli/utils/scope.js');
  }

  it('globalExplicit 为 true 时直接返回 true，不调用 promptFn', async () => {
    const { resolveScope } = await importScope();
    const mockPrompt = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);

    const result = await resolveScope(
      { globalExplicit: true, global: true },
      mockPrompt,
    );

    expect(result).toBe(true);
    // globalExplicit 路径不应调用 promptFn
    expect(mockPrompt).not.toHaveBeenCalled();
  });

  it('globalExplicit 为 true 但 global 为 false 时返回 false', async () => {
    const { resolveScope } = await importScope();
    const mockPrompt = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);

    const result = await resolveScope(
      { globalExplicit: true, global: false },
      mockPrompt,
    );

    expect(result).toBe(false);
    expect(mockPrompt).not.toHaveBeenCalled();
  });

  it('globalExplicit 为 false 时调用注入的 promptFn 并返回其结果', async () => {
    const { resolveScope } = await importScope();
    const mockPrompt = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);

    const result = await resolveScope(
      { globalExplicit: false, global: false },
      mockPrompt,
    );

    expect(result).toBe(true);
    expect(mockPrompt).toHaveBeenCalledTimes(1);
  });

  it('未提供 globalExplicit 时视为 false，走 promptFn 路径', async () => {
    const { resolveScope } = await importScope();
    const mockPrompt = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);

    const result = await resolveScope({}, mockPrompt);

    expect(result).toBe(false);
    expect(mockPrompt).toHaveBeenCalledTimes(1);
  });

  it('promptFn 返回 false 时 resolveScope 返回 false', async () => {
    const { resolveScope } = await importScope();
    const mockPrompt = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);

    const result = await resolveScope(
      { globalExplicit: false, global: false },
      mockPrompt,
    );

    expect(result).toBe(false);
  });

  it('promptFn 返回 Promise<boolean> 正常 resolve', async () => {
    const { resolveScope } = await importScope();

    // 验证异步行为正确
    let called = false;
    const mockPrompt = async () => {
      called = true;
      return true;
    };

    const result = await resolveScope({}, mockPrompt);
    expect(result).toBe(true);
    expect(called).toBe(true);
  });
});

describe('promptScope', () => {
  // promptScope 是含真实 I/O 的默认实现，仅验证其函数签名存在
  it('promptScope 应为一个可导出的异步函数', async () => {
    const { promptScope } = await import('../src/cli/utils/scope.js');
    expect(typeof promptScope).toBe('function');
    // async 函数在 ES 规范中 constructor.name === 'AsyncFunction'
    expect(promptScope.constructor.name).toBe('AsyncFunction');
  });
});
