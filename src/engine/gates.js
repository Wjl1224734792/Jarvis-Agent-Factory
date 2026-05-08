import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { getAgentList, getPlatformModels } from './agent-registry.js';

/**
 * 流水线定义表 — 不同工作流可注册不同的 Gate 序列。
 * 引擎只做通用状态机：记录当前 Gate、验证 FSM 顺序、记录检查点。
 * 工作流特定逻辑（通过条件、可用代理、并行策略）由编排提示词定义。
 *
 * 新增流水线类型只需在此表添加条目，然后在对应 command 提示词中引用即可。
 */
export const PIPELINE_DEFS = {
  /** 全流程编排（默认）：需求→任务→计划→实现→质量→测试→评审→发布 */
  full: {
    name: '全流程',
    gates: ['Gate A', 'Gate B', 'Gate C', 'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D', 'Gate E'],
  },
  /** 前端开发流程：同全流程但仅使用前端代理 */
  frontend: {
    name: '前端开发',
    gates: ['Gate A', 'Gate B', 'Gate C', 'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D', 'Gate E'],
  },
  /** 后端开发流程：跳过了 C1.5（视觉验证） */
  backend: {
    name: '后端开发',
    gates: ['Gate A', 'Gate B', 'Gate C', 'Gate C1', 'Gate C2', 'Gate D', 'Gate E'],
  },
  /** 轻量编排水：支持 Gate 入口跳转，按任务类型智能跳过无关闸门 */
  lite: {
    name: '轻量编排',
    gates: ['Gate A', 'Gate B', 'Gate C', 'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D', 'Gate E'],
    allow_jump: true,
  },
};

export const DEFAULT_PIPELINE = 'full';

/** 默认流水线的 Gate 序列（向后兼容） */
export const GATES = PIPELINE_DEFS[DEFAULT_PIPELINE].gates;

/** 按流水线类型获取 Gate 序列 */
export function getPipelineGates(type) {
  const def = PIPELINE_DEFS[type];
  return def ? def.gates : PIPELINE_DEFS[DEFAULT_PIPELINE].gates;
}

/** 获取流水线定义名称 */
export function getPipelineName(type) {
  const def = PIPELINE_DEFS[type];
  return def ? def.name : (type || DEFAULT_PIPELINE);
}

export const GATE_DIRS = { 'Gate A':'requirements','Gate B':'tasks','Gate C':'plans','Gate C1':'implementation','Gate C1.5':'implementation','Gate C2':'testing','Gate D':'review','Gate E':'shipping' };

export const GATE_CHECKS = {
  'Gate A':{check:'至少1个需求文档，含REQ-XXX编号'},'Gate B':{check:'每个TASK-XXX映射至少1个REQ-XXX'},
  'Gate C':{check:'计划文档含parallel_batches+Execution Packet'},'Gate C1':{check:'Lint+Type-check+Build+Deps Audit全部通过'},
  'Gate C1.5':{check:'页面/组件视觉验证截图证据已附'},'Gate C2':{check:'单元/集成/E2E/浏览器测试全部通过，API契约验证通过'},
  'Gate D':{check:'领域审查+安全审计+性能审计通过，REQ追踪矩阵完整'},'Gate E':{check:'安全审计+上线检查清单+回滚预案就绪'},
};

/**
 * 每个 Gate 允许的操作类型（硬约束）。
 * 引擎根据此表在 gate_check 工具中阻断非法操作。
 *
 * 操作类型：
 *   read       — 读取文件/探索代码
 *   write_doc  — 编写文档（需求/任务/计划/报告）
 *   write_code — 编写/修改业务代码
 *   sweep_arch — 架构评审（architect agent）
 *   spawn_impl — 生成实现 Agent（dev/ui/state/api/logic/data expert）
 *   spawn_test — 生成测试 Agent
 *   lint       — 代码检查
 *   build      — 构建
 *   preview    — 预览/截图
 *   review     — 代码审查
 *   audit      — 安全/性能审计
 *   deploy     — 发布/部署
 *   fix        — 修复（质量/测试/审查反馈驱动）
 */
export const GATE_OPERATIONS = {
  'Gate A':    { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'Gate B':    { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'Gate C':    { allow: ['read','write_doc','sweep_arch','write_code','spawn_impl'], deny: ['spawn_test','build','deploy'] },
  'Gate C1':   { allow: ['read','lint','build','fix'],                   deny: ['spawn_impl','spawn_test','deploy','write_code'] },
  'Gate C1.5': { allow: ['read','preview','fix'],                        deny: ['spawn_impl','spawn_test','build','deploy','write_code'] },
  'Gate C2':   { allow: ['read','spawn_test','fix'],                     deny: ['spawn_impl','deploy','write_code'] },
  'Gate D':    { allow: ['read','review','audit','fix'],                 deny: ['spawn_impl','spawn_test','build','deploy','write_code'] },
  'Gate E':    { allow: ['read','deploy','write_doc'],                   deny: ['write_code','spawn_impl','spawn_test','lint','build'] },
};

/** 获取当前 Gate 允许的操作列表 */
export function getGateOperations(gate) {
  return GATE_OPERATIONS[gate] || { allow: [], deny: [] };
}

/** 动态扫描模板目录生成的完整 Agent 列表（替代硬编码） */
export const AGENT_LIST = getAgentList();

export const AVAILABLE_MODELS = [
  ...new Set([
    'deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek/deepseek-v4-pro', 'deepseek/deepseek-v4-flash',
    'gpt-5.5', 'gpt-5.4', 'gpt-5.3-codex', 'gpt-5.3-codex-spark', 'gpt-5.4-mini', 'gpt-5.2',
    'claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5',
  ])
];

export function findGateArtifacts(docsDir, gate) {
  const subdir = GATE_DIRS[gate]; if (!subdir) return [];
  const dir = join(docsDir, subdir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.md')).slice(0, 5);
}

export function formatGateDisplay(gates, current) {
  return gates.map(g => `${g.passed ? '✅' : g.gate === current ? '🔵' : '⏳'} ${g.gate}${g.passed && g.checkpoints?.length ? ` (${g.checkpoints[0].passed_at?.slice(0,10)})` : ''}`).join(' → ');
}
