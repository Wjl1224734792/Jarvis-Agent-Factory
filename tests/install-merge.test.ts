/**
 * TASK-004: JSON 配置合并逻辑单元测试
 *
 * 验证 deepMergeValue、mergeMcpServers 的正确性。
 * 这些函数是 install.ts 内部私有函数，本文件通过复制实现进行独立验证。
 * 若 install.ts 中的实现变更，需同步更新本文件。
 */
import { describe, it, expect } from 'vitest';

/** 检查值是否为纯对象（非数组、非 null） */
function isPlainObject(val: unknown): boolean {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * 深度合并单个字段值：数组去重合并，对象递归合并，标量覆盖。
 * 与 src/install.ts 中的实现保持同步。
 */
function deepMergeValue(templateVal: unknown, existingVal: unknown): unknown {
  if (Array.isArray(templateVal) && Array.isArray(existingVal)) {
    const merged = [...templateVal];
    for (const item of existingVal) {
      if (!merged.includes(item)) {
        merged.push(item);
      }
    }
    return merged;
  }

  if (isPlainObject(templateVal) && isPlainObject(existingVal)) {
    const result: Record<string, unknown> = { ...(existingVal as Record<string, unknown>) };
    for (const [key, val] of Object.entries(templateVal as Record<string, unknown>)) {
      if (key in result) {
        result[key] = deepMergeValue(val, result[key]);
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  return templateVal;
}

const MCP_SERVER_WHITELIST = new Set(['jarvis-engine']);

/**
 * 合并 MCP servers 映射。
 * 与 src/install.ts 中的实现保持同步。
 */
function mergeMcpServers(
  templateServers: Record<string, unknown>,
  existingServers: Record<string, unknown>,
): { merged: Record<string, unknown>; added: number; removed: number; updated: number } {
  const result: Record<string, unknown> = {};
  let added = 0;
  let updated = 0;
  let removed = 0;

  for (const [name, tplConfig] of Object.entries(templateServers)) {
    if (name in existingServers) {
      const merged = deepMergeValue(tplConfig, existingServers[name]);
      if (JSON.stringify(merged) !== JSON.stringify(existingServers[name])) {
        updated++;
      }
      result[name] = merged;
    } else {
      result[name] = tplConfig;
      added++;
    }
  }

  for (const [name, config] of Object.entries(existingServers)) {
    if (!(name in templateServers)) {
      if (MCP_SERVER_WHITELIST.has(name)) {
        result[name] = config;
      } else {
        removed++;
      }
    }
  }

  return { merged: result, added, removed, updated };
}

// ================================
// 测试用例
// ================================

describe('TASK-004: deepMergeValue', () => {
  describe('标量字段', () => {
    it('模板标量值覆盖已有标量值', () => {
      expect(deepMergeValue('npx', 'old-cmd')).toBe('npx');
    });

    it('模板数字覆盖已有数字', () => {
      expect(deepMergeValue(8080, 3000)).toBe(8080);
    });

    it('模板布尔覆盖已有布尔', () => {
      expect(deepMergeValue(true, false)).toBe(true);
    });

    it('模板 null 覆盖已有值', () => {
      expect(deepMergeValue(null, 'something')).toBe(null);
    });
  });

  describe('数组字段', () => {
    it('两个数组去重合并，模板元素在前', () => {
      const result = deepMergeValue(['-y', '@playwright/mcp@latest'], ['-y', '--headed']);
      expect(result).toEqual(['-y', '@playwright/mcp@latest', '--headed']);
    });

    it('完全相同的数组合并后无重复', () => {
      const result = deepMergeValue(['a', 'b'], ['b', 'a']);
      expect(result).toEqual(['a', 'b']);
    });

    it('模板新增数组，目标为空数组', () => {
      const result = deepMergeValue(['a', 'b'], []);
      expect(result).toEqual(['a', 'b']);
    });
  });

  describe('对象字段', () => {
    it('对象递归深度合并', () => {
      const template = { key1: 'val1', nested: { a: 1 } };
      const existing = { key2: 'val2', nested: { b: 2 } };
      const result = deepMergeValue(template, existing);
      expect(result).toEqual({
        key1: 'val1',
        key2: 'val2',
        nested: { a: 1, b: 2 },
      });
    });

    it('对象中同名键模板覆盖', () => {
      const template = { command: 'jarvis', version: '2.0' };
      const existing = { command: 'old-jarvis', env: { NODE_ENV: 'dev' } };
      const result = deepMergeValue(template, existing);
      expect(result).toEqual({
        command: 'jarvis',
        version: '2.0',
        env: { NODE_ENV: 'dev' },
      });
    });

    it('对象中 env 子对象递归合并', () => {
      const template = { env: { A: '1', B: '2' } };
      const existing = { env: { A: 'old', C: '3' } };
      const result = deepMergeValue(template, existing);
      expect(result).toEqual({
        env: { A: '1', B: '2', C: '3' },
      });
    });
  });

  describe('类型不匹配', () => {
    it('模板为对象、目标为数组时模板覆盖', () => {
      expect(deepMergeValue({ a: 1 }, [1, 2])).toEqual({ a: 1 });
    });

    it('模板为数组、目标为对象时模板覆盖', () => {
      expect(deepMergeValue([1, 2], { a: 1 })).toEqual([1, 2]);
    });

    it('模板为标量、目标为对象时模板覆盖', () => {
      expect(deepMergeValue('string', { a: 1 })).toBe('string');
    });
  });
});

describe('TASK-004: mergeMcpServers', () => {
  const jarvisEngine = {
    type: 'stdio',
    command: 'jarvis',
    args: ['engine', 'start', '--stdio'],
  };

  // ================================
  // 验收标准 1: 模板新增 mcpServer
  // ================================
  it('验收标准1: 模板新增 server → 目标新增该条目', () => {
    const template = {
      playwright: { type: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp@latest'] },
    };
    const existing: Record<string, unknown> = {};

    const { merged, added, removed, updated } = mergeMcpServers(template, existing);

    expect(added).toBe(1);
    expect(removed).toBe(0);
    expect(updated).toBe(0);
    expect(merged).toHaveProperty('playwright');
    expect((merged.playwright as Record<string, unknown>).command).toBe('npx');
  });

  // ================================
  // 验收标准 2: 模板移除 mcpServer（白名单除外）
  // ================================
  it('验收标准2: 模板移除 server → 目标移除该条目', () => {
    const template: Record<string, unknown> = {};
    const existing = {
      'old-server': { type: 'stdio', command: 'old-cmd' },
    };

    const { merged, added, removed, updated } = mergeMcpServers(template, existing);

    expect(added).toBe(0);
    expect(removed).toBe(1);
    expect(updated).toBe(0);
    expect(merged).not.toHaveProperty('old-server');
  });

  it('验收标准2: jarvis-engine 在白名单 → 永不删除', () => {
    const template: Record<string, unknown> = {};
    const existing = {
      'jarvis-engine': jarvisEngine,
      'old-server': { type: 'stdio', command: 'old-cmd' },
    };

    const { merged, added, removed, updated } = mergeMcpServers(template, existing);

    expect(added).toBe(0);
    expect(removed).toBe(1); // 只删除 old-server
    expect(updated).toBe(0);
    expect(merged).toHaveProperty('jarvis-engine');
    expect(merged).not.toHaveProperty('old-server');
  });

  // ================================
  // 验收标准 3: 模板修改 args → 数组合并去重
  // ================================
  it('验收标准3: 模板修改 args → 数组合并去重', () => {
    const template = {
      playwright: { type: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp@latest'] },
    };
    const existing = {
      playwright: { type: 'stdio', command: 'npx', args: ['-y', '--headed'] },
    };

    const { merged, added, removed, updated } = mergeMcpServers(template, existing);

    expect(added).toBe(0);
    expect(removed).toBe(0);
    expect(updated).toBe(1);
    expect((merged.playwright as Record<string, unknown>).args).toEqual(['-y', '@playwright/mcp@latest', '--headed']);
  });

  it('验收标准3: 模板修改 command 标量 → 模板覆盖', () => {
    const template = {
      'jarvis-engine': { ...jarvisEngine, command: 'new-jarvis' },
    };
    const existing = {
      'jarvis-engine': { ...jarvisEngine },
    };

    const { merged, updated } = mergeMcpServers(template, existing);

    expect(updated).toBe(1);
    expect((merged['jarvis-engine'] as Record<string, unknown>).command).toBe('new-jarvis');
  });

  it('验收标准3: 模板修改 env 对象 → 递归深度合并', () => {
    const template = {
      server: { type: 'stdio', command: 'cmd', env: { A: 'new-a', B: 'b' } },
    };
    const existing = {
      server: { type: 'stdio', command: 'cmd', env: { A: 'old-a', C: 'c' } },
    };

    const { merged, updated } = mergeMcpServers(template, existing);

    expect(updated).toBe(1);
    expect((merged.server as Record<string, unknown>).env).toEqual({ A: 'new-a', B: 'b', C: 'c' });
  });

  it('无任何变更时不计数', () => {
    const template = {
      playwright: { type: 'stdio', command: 'npx' },
    };
    const existing = {
      playwright: { type: 'stdio', command: 'npx' },
    };

    const { added, removed, updated } = mergeMcpServers(template, existing);

    expect(added).toBe(0);
    expect(removed).toBe(0);
    expect(updated).toBe(0);
  });

  it('多 server 混合操作：新增、删除、修改同时发生', () => {
    const template = {
      'new-server': { type: 'stdio', command: 'new-cmd' },
      'modify-server': { type: 'stdio', command: 'updated-cmd' },
    };
    const existing = {
      'old-server': { type: 'stdio', command: 'old-cmd' },
      'modify-server': { type: 'stdio', command: 'original-cmd' },
    };

    const { merged, added, removed, updated } = mergeMcpServers(template, existing);

    expect(added).toBe(1);
    expect(removed).toBe(1);
    expect(updated).toBe(1);
    expect(merged).toHaveProperty('new-server');
    expect(merged).toHaveProperty('modify-server');
    expect(merged).not.toHaveProperty('old-server');
  });
});
