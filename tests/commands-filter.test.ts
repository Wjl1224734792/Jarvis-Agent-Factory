import { describe, it, expect } from 'vitest';
import { filterCommands, onSourceTabChange } from '../web/src/utils/commands-filter.js';

// ============================================================
// 测试数据
// ============================================================

const projectCommands = [
  { name: 'proj-dev', description: '项目开发指令', argumentHint: '', pipelineType: 'frontend', category: 'development' },
  { name: 'proj-test', description: '项目测试指令', argumentHint: '', pipelineType: 'full', category: 'testing' },
  { name: 'proj-review', description: '项目审查指令', argumentHint: '', pipelineType: 'full', category: 'review' },
];

const globalCommands = [
  { name: 'glob-dev', description: '全局开发指令', argumentHint: '', pipelineType: 'backend', category: 'development' },
  { name: 'glob-test', description: '全局测试指令', argumentHint: '', pipelineType: 'full', category: 'testing' },
  { name: 'glob-arch', description: '全局架构指令', argumentHint: '', pipelineType: 'full', category: 'architecture' },
];

// ============================================================
// filterCommands 测试
// ============================================================

describe('filterCommands', () => {

  it('F1.1 来源 Tab=project, 分类=all → 返回 projectCommands 完整列表', () => {
    const result = filterCommands(projectCommands, globalCommands, 'project', 'all');
    expect(result).toHaveLength(3);
    expect(result.map(c => c.name)).toEqual(['proj-dev', 'proj-test', 'proj-review']);
  });

  it('F1.2 来源 Tab=global, 分类=all → 返回 globalCommands 完整列表', () => {
    const result = filterCommands(projectCommands, globalCommands, 'global', 'all');
    expect(result).toHaveLength(3);
    expect(result.map(c => c.name)).toEqual(['glob-dev', 'glob-test', 'glob-arch']);
  });

  it('F1.3 来源 Tab=project, 分类=development → 仅返回 projectCommands 中 category=development 的指令', () => {
    const result = filterCommands(projectCommands, globalCommands, 'project', 'development');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('proj-dev');
  });

  it('F1.4 来源 Tab=global, 分类=testing → 仅返回 globalCommands 中 category=testing 的指令', () => {
    const result = filterCommands(projectCommands, globalCommands, 'global', 'testing');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('glob-test');
  });

});

// ============================================================
// onSourceTabChange 测试
// ============================================================

describe('onSourceTabChange', () => {

  it('F1.5 切换来源 Tab (project → global) → 返回 { sourceTab: "global", categoryTab: "all" }', () => {
    const result = onSourceTabChange('global');
    expect(result).toEqual({ sourceTab: 'global', categoryTab: 'all' });
  });

  it('F1.6 切换来源 Tab (global → project) → 返回 { sourceTab: "project", categoryTab: "all" }', () => {
    const result = onSourceTabChange('project');
    expect(result).toEqual({ sourceTab: 'project', categoryTab: 'all' });
  });

});
