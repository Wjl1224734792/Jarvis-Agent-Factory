import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { getAgentList } from './agent-registry.js';

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
  'Gate C1.5':{check:'页面/组件视觉验证截图证据已附'},'Gate C2':{check:'测试文档用例覆盖完整，单元/集成/E2E/浏览器测试全部通过，API契约验证通过'},
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

/**
 * 每个 Gate 可生成的 Agent 类型及流程指引。
 * 由 pipeline_guide MCP 工具消费，作为编排者 spawn Agent 的参考。
 *
 * 操作类型说明见 GATE_OPERATIONS，此处聚焦 Agent 级的可生成范围。
 */
export const GATE_AGENT_GUIDE = {
  'Gate A':    { can_spawn: ['code-explore-expert', 'docs-research-expert'], note: '需求澄清阶段，只探索和写文档' },
  'Gate B':    { can_spawn: ['task-design'], note: '任务分解阶段，spawn task-design 做垂直切片' },
  'Gate C':    { can_spawn: ['planner', 'frontend-architect', 'backend-architect', 'database-architect'], note: '规划阶段，spawn planner 产出 parallel_batches；按需做架构评审' },
  'Gate C1':   { can_spawn: [], note: '代码质量门——Lint/Type-check/Build/Deps Audit。失败则修复后重跑' },
  'Gate C1.5': { can_spawn: [], note: '视觉验证门——截图+样式检查。失败则退回实现Agent补充证据' },
  'Gate C2':   { can_spawn: ['test-doc-writer', 'frontend-test-expert', 'backend-test-expert', 'api-test-expert', 'test-executor', 'fix-retest', 'browser-test-expert', 'api-contract-expert', 'perf-test-expert', 'e2e-test-expert'], note: '测试阶段——步骤1(并行):spawn test-doc-writer(编写测试用例文档)+frontend-test-expert+backend-test-expert+api-test-expert(API功能测试) → 步骤2:spawn test-executor(按文档执行测试,输出报告) → 步骤3(有失败时):spawn fix-retest(定位根因→spawn实现Agent修复→重跑,≤2轮) → 步骤4:spawn e2e-test-expert(端到端测试) → 步骤5:汇总测试结果至docs/testing/' },
  'Gate D':    { can_spawn: ['frontend-review-expert', 'backend-review-expert', 'security-review-expert', 'perf-review-expert', 'qa-review-expert'], note: '评审阶段——4个领域审查并行，最后qa-review-expert综合签核' },
  'Gate E':    { can_spawn: ['security-review-expert', 'infra-deploy-expert'], note: '发布阶段——安全审计+上线检查+版本管理+归档' },
};

/** 获取当前 Gate 可生成的 Agent 指引 */
export function getGateAgentGuide(gate) {
  return GATE_AGENT_GUIDE[gate] || { can_spawn: [], note: '未知Gate' };
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

/**
 * 按会话过滤 Gate 产物文档
 * 通过检查点记录中的日期匹配文件名前缀，只返回该会话产生的文档
 * @param docsDir 文档根目录
 * @param gate Gate 名称
 * @param sessionId 会话 ID
 * @param db 数据库实例
 * @returns 匹配的文档文件名列表（最多 5 个）
 */
export function findSessionGateArtifacts(docsDir, gate, sessionId, db) {
  const subdir = GATE_DIRS[gate];
  if (!subdir) return [];

  const checkpoints = db.prepare(
    'SELECT passed_at FROM checkpoints WHERE session_id = ? AND gate = ?'
  ).all(sessionId, gate);

  const dir = join(docsDir, subdir);
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir).filter(f => f.endsWith('.md'));

  if (checkpoints.length > 0) {
    const dates = new Set(checkpoints.map(c => c.passed_at.slice(0, 10)));
    return files.filter(f => dates.has(f.slice(0, 10))).slice(0, 5);
  }

  return [];
}

export function formatGateDisplay(gates, current) {
  return gates.map(g => `${g.passed ? '✅' : g.gate === current ? '🔵' : '⏳'} ${g.gate}${g.passed && g.checkpoints?.length ? ` (${g.checkpoints[0].passed_at?.slice(0,10)})` : ''}`).join(' → ');
}
