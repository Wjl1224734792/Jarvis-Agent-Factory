import { describe, it, expect } from 'vitest';
import { getPipelineGates, getPipelineName, getGateOperations, GATE_OPERATIONS, PIPELINE_DEFS, DEFAULT_PIPELINE } from '../src/engine/gates.js';

describe('getPipelineGates', () => {
  it('返回 full 类型的 8 个 Gate', () => {
    expect(getPipelineGates('full')).toHaveLength(8);
  });

  it('返回 backend 类型的 7 个 Gate（跳过 C1.5）', () => {
    const gates = getPipelineGates('backend');
    expect(gates).toHaveLength(7);
    expect(gates).not.toContain('Gate C1.5');
  });

  it('未知类型回退到默认流水线', () => {
    expect(getPipelineGates('unknown')).toEqual(PIPELINE_DEFS[DEFAULT_PIPELINE].gates);
  });
});

describe('getPipelineName', () => {
  it('返回中文名称', () => {
    expect(getPipelineName('full')).toBe('全流程');
    expect(getPipelineName('lite')).toBe('轻量编排');
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

  it('Gate C 允许 spawn_impl', () => {
    expect(GATE_OPERATIONS['Gate C'].allow).toContain('spawn_impl');
  });
});
