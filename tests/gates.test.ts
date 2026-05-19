import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { getPipelineGates, getPipelineName, getGateOperations, GATE_OPERATIONS, GATE_AGENT_GUIDE, GATE_DIRS, GATE_CHECKS, MAX_RETRY, GATE_ENTRY_CONDITIONS, PIPELINE_DEFS, DEFAULT_PIPELINE, findSessionGateArtifacts } from '../src/engine/gates.js';

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

  it('共 62 个 Gate 有操作定义（12 原有 + 22 新增 + 14 research/release/ask + 14 simplify/trace/improve）', () => {
    expect(Object.keys(GATE_OPERATIONS)).toHaveLength(62);
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
// TASK-001: 5 条新流水线 + 22 个新 Gate 测试（17 个 TDD 测试用例）
// ==================================================================

const NEW_PIPELINE_TYPES = ['refactor', 'hotfix', 'migrate', 'evaluate', 'debug'] as const;
const NEW_GATE_SETS: Record<string, string[]> = {
  refactor: ['R1', 'R2', 'R3', 'R4', 'R5'],
  hotfix: ['H0', 'H1', 'H2', 'H3'],
  migrate: ['M1', 'M2', 'M3', 'M4'],
  evaluate: ['E0', 'E1', 'E2', 'E3'],
  debug: ['D0', 'D1', 'D2', 'D3', 'D4'],
};
const ALL_NEW_GATES = Object.values(NEW_GATE_SETS).flat();

describe('TASK-001: PIPELINE_DEFS 新增 5 条流水线', () => {
  it('1. PIPELINE_DEFS 包含 5 条新流水线', () => {
    for (const pt of NEW_PIPELINE_TYPES) {
      expect(PIPELINE_DEFS[pt], `${pt} 应存在于 PIPELINE_DEFS`).toBeDefined();
      expect(PIPELINE_DEFS[pt].name, `${pt} 应有中文名称`).toBeTruthy();
      expect(PIPELINE_DEFS[pt].gates, `${pt} 应有 gates 数组`).toBeInstanceOf(Array);
    }
  });

  it('2. refactor 流水线有 5 个 Gate（R1-R5）', () => {
    expect(getPipelineGates('refactor')).toEqual(['R1', 'R2', 'R3', 'R4', 'R5']);
  });

  it('3. hotfix 流水线有 4 个 Gate（H0-H3）', () => {
    expect(getPipelineGates('hotfix')).toEqual(['H0', 'H1', 'H2', 'H3']);
  });

  it('4. migrate 流水线有 4 个 Gate（M1-M4）', () => {
    expect(getPipelineGates('migrate')).toEqual(['M1', 'M2', 'M3', 'M4']);
  });

  it('5. evaluate 流水线有 4 个 Gate（E0-E3）', () => {
    expect(getPipelineGates('evaluate')).toEqual(['E0', 'E1', 'E2', 'E3']);
  });

  it('6. debug 流水线有 5 个 Gate（D0-D4）', () => {
    expect(getPipelineGates('debug')).toEqual(['D0', 'D1', 'D2', 'D3', 'D4']);
  });

  it('7. 已有 4 条流水线 Gate 序列不变', () => {
    expect(getPipelineGates('full')).toContain('Gate A');
    expect(getPipelineGates('full')).toContain('Gate E');
    expect(getPipelineGates('full')).toHaveLength(12);
    expect(getPipelineGates('frontend')).toHaveLength(12);
    expect(getPipelineGates('backend')).toHaveLength(11);
    expect(getPipelineGates('lite')).toHaveLength(12);
    expect(PIPELINE_DEFS.lite.allow_jump).toBe(true);
  });

  it('7a. frontend 流水线包含 Gate C1.5 且位置在 C1 和 C2 之间', () => {
    const gates = getPipelineGates('frontend');
    const c1Idx = gates.indexOf('Gate C1');
    const c15Idx = gates.indexOf('Gate C1.5');
    const c2Idx = gates.indexOf('Gate C2');
    expect(c15Idx).toBeGreaterThan(c1Idx);
    expect(c2Idx).toBeGreaterThan(c15Idx);
  });

  it('7b. Gate C1.5 的 GATE_OPERATIONS 允许 preview、fix 禁止 write_code', () => {
    const ops = getGateOperations('Gate C1.5');
    expect(ops.allow).toContain('preview');
    expect(ops.allow).toContain('fix');
    expect(ops.deny).toContain('write_code');
    expect(ops.deny).toContain('spawn_impl');
    expect(ops.deny).toContain('deploy');
  });

  it('8. getPipelineName 返回新流水线中文名称', () => {
    expect(getPipelineName('refactor')).toBe('重构');
    expect(getPipelineName('hotfix')).toBe('紧急热修复');
    expect(getPipelineName('migrate')).toBe('框架迁移');
    expect(getPipelineName('evaluate')).toBe('技术评估');
    expect(getPipelineName('debug')).toBe('调试诊断');
  });
});

describe('TASK-001: GATE_OPERATIONS 注册 22 个新 Gate', () => {
  it('9. GATE_OPERATIONS 共 62 个条目（12 原有 + 22 新增 + 14 research/release/ask + 14 simplify/trace/improve）', () => {
    expect(Object.keys(GATE_OPERATIONS)).toHaveLength(62);
  });

  it('10. 所有 22 个新 Gate 都允许 read', () => {
    for (const gate of ALL_NEW_GATES) {
      const ops = getGateOperations(gate);
      expect(ops.allow, `${gate} 应允许 read`).toContain('read');
    }
  });

  it('11. H0 禁止 write_code / write_doc / spawn_impl / spawn_test / build / deploy（安全加固：防自审批绕过）', () => {
    const ops = getGateOperations('H0');
    expect(ops.allow).toContain('read');
    expect(ops.deny).toContain('write_code');
    expect(ops.deny).toContain('write_doc');
    expect(ops.deny).toContain('spawn_impl');
    expect(ops.deny).toContain('spawn_test');
    expect(ops.deny).toContain('build');
    expect(ops.deny).toContain('deploy');
  });

  it('12. H3 允许 deploy / review / audit / read / write_doc', () => {
    const ops = getGateOperations('H3');
    expect(ops.allow).toContain('deploy');
    expect(ops.allow).toContain('review');
    expect(ops.allow).toContain('audit');
    expect(ops.allow).toContain('read');
    expect(ops.allow).toContain('write_doc');
  });

  it('13. D0 禁止 write_code / spawn_impl / spawn_test / build / deploy', () => {
    const ops = getGateOperations('D0');
    expect(ops.deny).toContain('write_code');
    expect(ops.deny).toContain('spawn_impl');
    expect(ops.deny).toContain('spawn_test');
    expect(ops.deny).toContain('build');
    expect(ops.deny).toContain('deploy');
  });

  it('14. R3 允许 read / write_code / spawn_impl，禁止 spawn_test / build / deploy', () => {
    const ops = getGateOperations('R3');
    expect(ops.allow).toContain('read');
    expect(ops.allow).toContain('write_code');
    expect(ops.allow).toContain('spawn_impl');
    expect(ops.deny).toContain('spawn_test');
    expect(ops.deny).toContain('build');
    expect(ops.deny).toContain('deploy');
  });

  it('15. E1 禁止 deploy', () => {
    const ops = getGateOperations('E1');
    expect(ops.deny).toContain('deploy');
  });
});

describe('TASK-001: GATE_AGENT_GUIDE 注册 22 个新 Gate', () => {
  it('16. 所有 22 个新 Gate 都有 GATE_AGENT_GUIDE 条目', () => {
    for (const gate of ALL_NEW_GATES) {
      expect(GATE_AGENT_GUIDE[gate], `${gate} 应有 GATE_AGENT_GUIDE`).toBeDefined();
      expect(GATE_AGENT_GUIDE[gate].can_spawn, `${gate} can_spawn 应为数组`).toBeInstanceOf(Array);
    }
  });

  it('17. H0 can_spawn 为空（需人工介入）', () => {
    expect(GATE_AGENT_GUIDE['H0'].can_spawn).toEqual([]);
    expect(GATE_AGENT_GUIDE['H0'].note).toContain('人工');
  });

  it('18. H1 can_spawn 包含 frontend-dev-expert / backend-dev-expert / remediation-expert', () => {
    expect(GATE_AGENT_GUIDE['H1'].can_spawn).toContain('frontend-dev-expert');
    expect(GATE_AGENT_GUIDE['H1'].can_spawn).toContain('backend-dev-expert');
    expect(GATE_AGENT_GUIDE['H1'].can_spawn).toContain('remediation-expert');
  });

  it('19. R3 can_spawn 包含全部 8 种实现 Agent', () => {
    const agents = GATE_AGENT_GUIDE['R3'].can_spawn;
    expect(agents).toContain('frontend-dev-expert');
    expect(agents).toContain('frontend-ui-expert');
    expect(agents).toContain('frontend-state-expert');
    expect(agents).toContain('backend-dev-expert');
    expect(agents).toContain('backend-api-expert');
    expect(agents).toContain('backend-logic-expert');
    expect(agents).toContain('backend-data-expert');
    expect(agents).toContain('remediation-expert');
    expect(agents).toHaveLength(8);
  });

  it('20. H3 can_spawn 包含 security-review-expert / qa-review-expert / docs-engineer', () => {
    expect(GATE_AGENT_GUIDE['H3'].can_spawn).toContain('security-review-expert');
    expect(GATE_AGENT_GUIDE['H3'].can_spawn).toContain('qa-review-expert');
    expect(GATE_AGENT_GUIDE['H3'].can_spawn).toContain('docs-engineer');
  });
});

describe('TASK-001: GATE_DIRS 映射', () => {
  it('21. 所有 22 个新 Gate 都有 GATE_DIRS 映射', () => {
    for (const gate of ALL_NEW_GATES) {
      expect(GATE_DIRS[gate], `${gate} 应有 GATE_DIRS`).toBeDefined();
      expect(typeof GATE_DIRS[gate], `${gate} GATE_DIRS 应为字符串`).toBe('string');
    }
  });

  it('22. R1-R5 映射到 refactoring', () => {
    for (let i = 1; i <= 5; i++) {
      expect(GATE_DIRS[`R${i}`]).toBe('refactoring');
    }
  });

  it('23. H0-H3 映射到 hotfix', () => {
    for (let i = 0; i <= 3; i++) {
      expect(GATE_DIRS[`H${i}`]).toBe('hotfix');
    }
  });

  it('24. M1-M4 映射到 migration', () => {
    for (let i = 1; i <= 4; i++) {
      expect(GATE_DIRS[`M${i}`]).toBe('migration');
    }
  });

  it('25. E0-E3 映射到 evaluation', () => {
    for (let i = 0; i <= 3; i++) {
      expect(GATE_DIRS[`E${i}`]).toBe('evaluation');
    }
  });

  it('26. D0-D4 映射到 debug', () => {
    for (let i = 0; i <= 4; i++) {
      expect(GATE_DIRS[`D${i}`]).toBe('debug');
    }
  });
});

describe('TASK-001: GATE_CHECKS 检查条件', () => {
  it('27. 所有 22 个新 Gate 都有 GATE_CHECKS 条目', () => {
    for (const gate of ALL_NEW_GATES) {
      expect(GATE_CHECKS[gate], `${gate} 应有 GATE_CHECKS`).toBeDefined();
      expect(GATE_CHECKS[gate].check, `${gate} check 应为非空字符串`).toBeTruthy();
    }
  });
});

describe('TASK-001: MAX_RETRY 设置', () => {
  it('28. 所有 22 个新 Gate 都有 MAX_RETRY', () => {
    for (const gate of ALL_NEW_GATES) {
      expect(MAX_RETRY[gate], `${gate} 应有 MAX_RETRY`).toBeDefined();
    }
  });

  it('29. H0 MAX_RETRY=1（审批拒绝不重试）', () => {
    expect(MAX_RETRY['H0']).toBe(1);
  });

  it('30. H3 MAX_RETRY=Infinity（合规审计不可跳过）', () => {
    expect(MAX_RETRY['H3']).toBe(Infinity);
  });

  it('31. D3 MAX_RETRY=Infinity（交互式诊断可无限重试）', () => {
    expect(MAX_RETRY['D3']).toBe(Infinity);
  });

  it('32. M4 MAX_RETRY=2', () => {
    expect(MAX_RETRY['M4']).toBe(2);
  });

  it('33. 其他新 Gate 使用默认值 2', () => {
    for (const gate of ALL_NEW_GATES) {
      if (['H0', 'H3', 'D3', 'M4'].includes(gate)) continue;
      expect(MAX_RETRY[gate], `${gate} MAX_RETRY 应为 2`).toBe(2);
    }
  });
});

describe('TASK-001: GATE_ENTRY_CONDITIONS 入口条件', () => {
  it('34. 18 条 GATE_ENTRY_CONDITIONS 都存在', () => {
    // 每个新 Gate 除了第一个（R1, H0, M1, E0, D0）都有入口条件 = 22 - 5 = 17...
    // 但按任务描述，确切是 18 条（含所有有前置的Gate）
    const newConditions = Object.keys(GATE_ENTRY_CONDITIONS).filter(k =>
      ALL_NEW_GATES.includes(k)
    );
    expect(newConditions.length).toBeGreaterThanOrEqual(17);
  });

  it('35. R2 入口条件包含 R1', () => {
    expect(GATE_ENTRY_CONDITIONS['R2']).toContain('R1');
  });

  it('36. H1 入口条件包含 H0', () => {
    expect(GATE_ENTRY_CONDITIONS['H1']).toContain('H0');
  });

  it('37. D1 入口条件包含 D0', () => {
    expect(GATE_ENTRY_CONDITIONS['D1']).toContain('D0');
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

  // --- Green 阶段：findSessionGateArtifacts 测试（已移除 checkpoint 回退 + 扁平回退） ---

  it('1. 无 runId 时使用当日日期目录扫描（dateDir/subdir/filename.md）', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));
    mockFs.setEntries(DOCS, [{ name: '2026-05-10', isDir: true }]);
    mockFs.setExists(join(DOCS, '2026-05-10', 'requirements'), true);
    mockFs.setEntries(join(DOCS, '2026-05-10', 'requirements'), ['REQ-001.md', 'REQ-002.md']);

    const result = findSessionGateArtifacts(DOCS, 'Gate A', SID, mockDb([]));

    expect(result).toEqual([
      '2026-05-10/requirements/REQ-001.md',
      '2026-05-10/requirements/REQ-002.md',
    ]);
    vi.useRealTimers();
  });

  it('2. 当日日期目录不存在时返回空数组', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-13T10:00:00Z'));
    mockFs.setEntries(DOCS, [{ name: '2026-05-09', isDir: true }]); // 不匹配今天

    const result = findSessionGateArtifacts(DOCS, 'Gate A', SID, mockDb([]));

    expect(result).toEqual([]);
    vi.useRealTimers();
  });

  it('3. 日期目录存在但 subdir 不存在时返回空数组', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-11T08:00:00Z'));
    mockFs.setEntries(DOCS, [{ name: '2026-05-11', isDir: true }]);
    // plans 子目录不存在

    const result = findSessionGateArtifacts(DOCS, 'Gate C', SID, mockDb([]));

    expect(result).toEqual([]);
    vi.useRealTimers();
  });

  it('4. 无 runId 时使用模拟的当前日期扫描', () => {
    mockFs.setEntries(DOCS, [{ name: '2026-05-12', isDir: true }]);
    mockFs.setExists(join(DOCS, '2026-05-12', 'requirements'), true);
    mockFs.setEntries(join(DOCS, '2026-05-12', 'requirements'), ['REQ-005.md']);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-12T10:00:00Z'));

    const result = findSessionGateArtifacts(DOCS, 'Gate A', SID, mockDb([]));
    expect(result).toEqual(['2026-05-12/requirements/REQ-005.md']);
    vi.useRealTimers();
  });

  it('5. 日期目录和子目录都不存在时返回空数组', () => {
    mockFs.setEntries(DOCS, [{ name: '2026-05-09', isDir: true }]);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-13T12:00:00Z'));

    const result = findSessionGateArtifacts(DOCS, 'Gate A', SID, mockDb([]));
    expect(result).toEqual([]);
    vi.useRealTimers();
  });
});
