import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { getPipelineGates, getPipelineName, getGateOperations, GATE_OPERATIONS, GATE_AGENT_GUIDE, MAX_RETRY, GATE_ENTRY_CONDITIONS, PIPELINE_DEFS, DEFAULT_PIPELINE, findSessionGateArtifacts } from '../src/engine/gates.js';

// ---- Mock setup for findSessionGateArtifacts filesystem + db ----
const { mockFs, mockArtifacts } = vi.hoisted(() => {
  const existsMap = new Map<string, boolean>();
  const entriesMap = new Map<string, Array<{ name: string; isDir: boolean } | string>>();
  const artifactsByRun = vi.fn(() => []);

  return {
    mockFs: {
      setExists: (path: string, val: boolean) => existsMap.set(path, val),
      setEntries: (
        path: string,
        entries: Array<{ name: string; isDir: boolean } | string>,
      ) => entriesMap.set(path, entries),
      reset: () => { existsMap.clear(); entriesMap.clear(); },
      existsMap,
      entriesMap,
    },
    mockArtifacts: artifactsByRun,
  };
});

vi.mock('node:fs', () => ({
  existsSync: (p: string) => mockFs.existsMap.get(p) ?? false,
  readdirSync: (p: string, opts?: { withFileTypes?: boolean }) => {
    const list = mockFs.entriesMap.get(p) || [];
    return opts?.withFileTypes
      ? list.map((e) => {
          if (typeof e === 'string') {
            return { name: e, isDirectory: () => false, isFile: () => true, isSymbolicLink: () => false };
          }
          return { name: e.name, isDirectory: () => e.isDir, isFile: () => !e.isDir, isSymbolicLink: () => false };
        })
      : list.map((e) => (typeof e === 'string' ? e : e.name));
  },
}));

vi.mock('../src/engine/db.js', () => ({
  getArtifactsByRunAndGate: mockArtifacts,
}));
// ---- End mock setup ----

describe('getPipelineGates', () => {
  it('返回 full 类型的 12 个 Gate（含 B-DDD/B-BDD/B-TDD/B1/C-impl）', () => {
    expect(getPipelineGates('full')).toHaveLength(12);
    expect(getPipelineGates('full')).toContain('Gate B-DDD');
    expect(getPipelineGates('full')).toContain('Gate B-BDD');
    expect(getPipelineGates('full')).toContain('Gate B-TDD');
    expect(getPipelineGates('full')).toContain('Gate B1');
    expect(getPipelineGates('full')).toContain('Gate C-impl');
  });

  it('返回 backend 类型的 11 个 Gate（跳过 C1.5）', () => {
    const gates = getPipelineGates('backend');
    expect(gates).toHaveLength(11);
    expect(gates).not.toContain('Gate C1.5');
    expect(gates).toContain('Gate B-DDD');
    expect(gates).toContain('Gate B-TDD');
    expect(gates).toContain('Gate B1');
    expect(gates).toContain('Gate C-impl');
  });

  it('未知类型回退到默认流水线', () => {
    expect(getPipelineGates('unknown')).toEqual(PIPELINE_DEFS[DEFAULT_PIPELINE].gates);
  });

  it('lite 模式允许 jump', () => {
    expect(PIPELINE_DEFS.lite.allow_jump).toBe(true);
    expect(getPipelineGates('lite')).toHaveLength(12);
  });
});

describe('getPipelineName', () => {
  it('返回中文名称', () => {
    expect(getPipelineName('full')).toBe('全流程');
    expect(getPipelineName('lite')).toBe('轻量编排');
    expect(getPipelineName('frontend')).toBe('前端开发');
    expect(getPipelineName('backend')).toBe('后端开发');
  });

  it('未知类型返回原始值', () => {
    expect(getPipelineName('unknown')).toBe('unknown');
  });
});

describe('getGateOperations', () => {
  it('Gate A 允许 read + write_doc', () => {
    const ops = getGateOperations('Gate A');
    expect(ops.allow).toContain('read');
    expect(ops.allow).toContain('write_doc');
    expect(ops.deny).toContain('write_code');
  });

  it('Gate B-DDD 允许 read + write_doc + spawn_impl，禁止 write_code', () => {
    const ops = getGateOperations('Gate B-DDD');
    expect(ops.allow).toContain('read');
    expect(ops.allow).toContain('write_doc');
    expect(ops.allow).toContain('spawn_impl');
    expect(ops.deny).toContain('write_code');
    expect(ops.deny).toContain('build');
  });

  it('Gate B1 允许 read + write_doc + sweep_arch，禁止 spawn_impl', () => {
    const ops = getGateOperations('Gate B1');
    expect(ops.allow).toContain('read');
    expect(ops.allow).toContain('write_doc');
    expect(ops.allow).toContain('sweep_arch');
    expect(ops.deny).toContain('spawn_impl');
    expect(ops.deny).toContain('write_code');
  });

  it('Gate C（规划）允许 spawn_impl', () => {
    expect(GATE_OPERATIONS['Gate C'].allow).toContain('spawn_impl');
  });

  it('Gate C-impl 允许 write_code + spawn_impl', () => {
    expect(GATE_OPERATIONS['Gate C-impl'].allow).toContain('write_code');
    expect(GATE_OPERATIONS['Gate C-impl'].allow).toContain('spawn_impl');
  });

  it('未知 Gate 返回空数组', () => {
    expect(getGateOperations('Gate X')).toEqual({ allow: [], deny: [] });
  });
});

describe('GATE_OPERATIONS', () => {
  it('所有 Gate 至少允许 read', () => {
    for (const [gate, ops] of Object.entries(GATE_OPERATIONS)) {
      expect(ops.allow, `${gate} should allow read`).toContain('read');
    }
  });

  it('共 12 个 Gate 有操作定义', () => {
    expect(Object.keys(GATE_OPERATIONS)).toHaveLength(12);
  });
});

describe('GATE_AGENT_GUIDE', () => {
  it('Gate B-DDD 可 spawn task-design（DDD模式）', () => {
    const guide = GATE_AGENT_GUIDE['Gate B-DDD'];
    expect(guide.can_spawn).toContain('task-design');
    expect(guide.note).toContain('DDD');
  });

  it('Gate B-BDD 可 spawn task-design（BDD模式）', () => {
    const guide = GATE_AGENT_GUIDE['Gate B-BDD'];
    expect(guide.can_spawn).toContain('task-design');
    expect(guide.note).toContain('BDD');
  });

  it('Gate B-TDD 可 spawn task-design（TDD模式）', () => {
    const guide = GATE_AGENT_GUIDE['Gate B-TDD'];
    expect(guide.can_spawn).toContain('task-design');
    expect(guide.note).toContain('TDD');
  });
  it('Gate B1 可 spawn 4 个架构 Agent', () => {
    const guide = GATE_AGENT_GUIDE['Gate B1'];
    expect(guide.can_spawn).toContain('frontend-architect');
    expect(guide.can_spawn).toContain('backend-architect');
    expect(guide.can_spawn).toContain('database-architect');
    expect(guide.can_spawn).toContain('algorithm-expert');
  });

  it('Gate C（规划）spawn planner + skill-assignment-expert', () => {
    const guide = GATE_AGENT_GUIDE['Gate C'];
    expect(guide.can_spawn).toContain('planner');
    expect(guide.can_spawn).toContain('skill-assignment-expert');
  });

  it('Gate C-impl 可 spawn 实现 Agent', () => {
    const guide = GATE_AGENT_GUIDE['Gate C-impl'];
    expect(guide.can_spawn).toContain('frontend-dev-expert');
    expect(guide.can_spawn).toContain('backend-dev-expert');
  });

  it('Gate C1 不可 spawn Agent', () => {
    expect(GATE_AGENT_GUIDE['Gate C1'].can_spawn).toEqual([]);
  });
});

describe('MAX_RETRY', () => {
  it('所有 Gate 都有重试次数定义', () => {
    const gates = getPipelineGates('full');
    for (const gate of gates) {
      expect(MAX_RETRY[gate], `${gate} should have MAX_RETRY`).toBeDefined();
    }
  });

  it('Gate A 允许无限次重试', () => {
    expect(MAX_RETRY['Gate A']).toBe(Infinity);
  });

  it('Gate C-impl 最多 3 次重试', () => {
    expect(MAX_RETRY['Gate C-impl']).toBe(3);
  });

  it('大多数 Gate 最多 2 次重试', () => {
    expect(MAX_RETRY['Gate B-DDD']).toBe(2);
    expect(MAX_RETRY['Gate B-BDD']).toBe(2);
    expect(MAX_RETRY['Gate B-TDD']).toBe(2);
    expect(MAX_RETRY['Gate B1']).toBe(2);
    expect(MAX_RETRY['Gate C2']).toBe(2);
    expect(MAX_RETRY['Gate D']).toBe(2);
  });
});

describe('GATE_ENTRY_CONDITIONS', () => {
  it('Gate B-DDD 入口条件包含需求文档', () => {
    expect(GATE_ENTRY_CONDITIONS['Gate B-DDD']).toContain('需求文档');
  });

  it('Gate B-BDD 入口条件包含领域分析', () => {
    expect(GATE_ENTRY_CONDITIONS['Gate B-BDD']).toContain('领域分析');
  });

  it('Gate B-TDD 入口条件包含场景文档', () => {
    expect(GATE_ENTRY_CONDITIONS['Gate B-TDD']).toContain('场景文档');
  });

  it('Gate B1 入口条件包含 TDD任务包', () => {
    expect(GATE_ENTRY_CONDITIONS['Gate B1']).toContain('TDD任务包');
  });

  it('Gate C-impl 入口条件包含计划文档', () => {
    expect(GATE_ENTRY_CONDITIONS['Gate C-impl']).toContain('计划');
  });
});

// ==================================================================
// findSessionGateArtifacts — 产物扫描（TDD：Red → Green → Refactor）
// ==================================================================
describe('findSessionGateArtifacts', () => {
  const DOCS = '/test/docs';
  const SID = 'test-session-gate-artifacts';

  /** 创建带 checkpoints 的 mock db */
  function mockDb(checkpoints: Array<{ passed_at: string }> | null) {
    return {
      prepare: vi.fn(() => ({ all: vi.fn(() => checkpoints ?? []) })),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.reset();
    mockFs.setExists(DOCS, true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Green 阶段：findSessionGateArtifacts 测试，全部通过 ---

  it('1. 日期目录扫描返回 dateDir/subdir/filename.md 格式（含 subdir 前缀）', () => {
    // Gate A → subdir = 'requirements'，checkpoint 日期 2026-05-10
    mockFs.setEntries(DOCS, [{ name: '2026-05-10', isDir: true }]);
    mockFs.setExists(join(DOCS, '2026-05-10', 'requirements'), true);
    mockFs.setEntries(join(DOCS, '2026-05-10', 'requirements'), ['REQ-001.md', 'REQ-002.md']);

    const db = mockDb([{ passed_at: '2026-05-10T12:00:00Z' }]);
    const result = findSessionGateArtifacts(DOCS, 'Gate A', SID, db);

    expect(result).toEqual([
      '2026-05-10/requirements/REQ-001.md',
      '2026-05-10/requirements/REQ-002.md',
    ]);
  });

  it('2. 扁平目录回退返回 subdir/filename.md 格式（非裸 filename）', () => {
    // checkpoint 日期 2026-05-10，但 dateDirs 中无匹配 → 回退到扁平目录
    // BUG 验证：当前实现返回裸 filename，修复后应返回 subdir/filename.md
    mockFs.setEntries(DOCS, [{ name: '2026-05-09', isDir: true }]); // 不匹配
    mockFs.setExists(join(DOCS, 'requirements'), true);
    mockFs.setEntries(join(DOCS, 'requirements'), [
      '2026-05-10-REQ-003.md',
      '2026-05-10-REQ-004.md',
    ]);

    const db = mockDb([{ passed_at: '2026-05-10T12:00:00Z' }]);
    const result = findSessionGateArtifacts(DOCS, 'Gate A', SID, db);

    // 期望：subdir/filename.md（与 findGateArtifacts 扁平回退一致）
    expect(result).toEqual([
      'requirements/2026-05-10-REQ-003.md',
      'requirements/2026-05-10-REQ-004.md',
    ]);
  });

  it('3. 有 checkpoint 的 Gate 通过日期匹配扫描', () => {
    // Gate C → subdir = 'plans'，checkpoint 日期 2026-05-11
    mockFs.setEntries(DOCS, [
      { name: '2026-05-09', isDir: true },
      { name: '2026-05-11', isDir: true },
    ]);
    mockFs.setExists(join(DOCS, '2026-05-11', 'plans'), true);
    mockFs.setEntries(join(DOCS, '2026-05-11', 'plans'), ['plan-001.md']);

    const db = mockDb([{ passed_at: '2026-05-11T08:00:00Z' }]);
    const result = findSessionGateArtifacts(DOCS, 'Gate C', SID, db);

    expect(result).toEqual(['2026-05-11/plans/plan-001.md']);
  });

  it('4. 无 checkpoint 的 Gate 使用当前日期扫描', () => {
    // 当前 Gate 尚未通过，无 checkpoint → 使用今天日期扫描
    mockFs.setEntries(DOCS, [{ name: '2026-05-12', isDir: true }]);
    mockFs.setExists(join(DOCS, '2026-05-12', 'requirements'), true);
    mockFs.setEntries(join(DOCS, '2026-05-12', 'requirements'), ['REQ-005.md']);

    const db = mockDb([]); // 无 checkpoints
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-12T10:00:00Z'));

    const result = findSessionGateArtifacts(DOCS, 'Gate A', SID, db);
    // 当前实现：checkpoints 为空 → 返回 []（BUG）
    // 修复后：使用当前日期扫描 → 返回今天日期的文件
    expect(result).toEqual(['2026-05-12/requirements/REQ-005.md']);
  });

  it('5. 日期目录和扁平目录都不存在时返回空数组', () => {
    // 有 checkpoint 但无匹配的日期目录，扁平目录也不存在
    mockFs.setEntries(DOCS, [{ name: '2026-05-09', isDir: true }]); // 不匹配 2026-05-13
    // flatDir 不存在（mock 默认返回 false）

    const db = mockDb([{ passed_at: '2026-05-13T12:00:00Z' }]);
    const result = findSessionGateArtifacts(DOCS, 'Gate A', SID, db);

    expect(result).toEqual([]);
  });
});
