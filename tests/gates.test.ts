import { describe, it, expect } from 'vitest';
import { getPipelineGates, getPipelineName, getGateOperations, GATE_OPERATIONS, GATE_AGENT_GUIDE, MAX_RETRY, GATE_ENTRY_CONDITIONS, PIPELINE_DEFS, DEFAULT_PIPELINE } from '../src/engine/gates.js';

describe('getPipelineGates', () => {
  it('返回 full 类型的 10 个 Gate（含 B1 和 C-impl）', () => {
    expect(getPipelineGates('full')).toHaveLength(10);
    expect(getPipelineGates('full')).toContain('Gate B1');
    expect(getPipelineGates('full')).toContain('Gate C-impl');
  });

  it('返回 backend 类型的 9 个 Gate（跳过 C1.5）', () => {
    const gates = getPipelineGates('backend');
    expect(gates).toHaveLength(9);
    expect(gates).not.toContain('Gate C1.5');
    expect(gates).toContain('Gate B1');
    expect(gates).toContain('Gate C-impl');
  });

  it('未知类型回退到默认流水线', () => {
    expect(getPipelineGates('unknown')).toEqual(PIPELINE_DEFS[DEFAULT_PIPELINE].gates);
  });

  it('lite 模式允许 jump', () => {
    expect(PIPELINE_DEFS.lite.allow_jump).toBe(true);
    expect(getPipelineGates('lite')).toHaveLength(10);
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

  it('共 10 个 Gate 有操作定义', () => {
    expect(Object.keys(GATE_OPERATIONS)).toHaveLength(10);
  });
});

describe('GATE_AGENT_GUIDE', () => {
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
    expect(MAX_RETRY['Gate B']).toBe(2);
    expect(MAX_RETRY['Gate B1']).toBe(2);
    expect(MAX_RETRY['Gate C2']).toBe(2);
    expect(MAX_RETRY['Gate D']).toBe(2);
  });
});

describe('GATE_ENTRY_CONDITIONS', () => {
  it('Gate B 入口条件包含需求文档', () => {
    expect(GATE_ENTRY_CONDITIONS['Gate B']).toContain('需求文档');
  });

  it('Gate B1 入口条件包含任务文档', () => {
    expect(GATE_ENTRY_CONDITIONS['Gate B1']).toContain('任务文档');
  });

  it('Gate C-impl 入口条件包含计划文档', () => {
    expect(GATE_ENTRY_CONDITIONS['Gate C-impl']).toContain('计划');
  });
});
