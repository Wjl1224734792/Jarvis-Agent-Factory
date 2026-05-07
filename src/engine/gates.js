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
  'Gate D':{check:'review-qa评审通过，REQ追踪矩阵完整'},'Gate E':{check:'安全审计+上线检查清单+回滚预案就绪'},
};

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
