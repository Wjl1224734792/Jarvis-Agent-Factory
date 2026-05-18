import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { getAgentList } from './agent-registry.js';
import { getArtifactsByRunAndGate } from './db.js';

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
    gates: ['Gate A', 'Gate B-DDD', 'Gate B-BDD', 'Gate B-TDD', 'Gate B1', 'Gate C', 'Gate C-impl', 'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D', 'Gate E'],
  },
  /** 前端开发流程：同全流程但仅使用前端代理 */
  frontend: {
    name: '前端开发',
    gates: ['Gate A', 'Gate B-DDD', 'Gate B-BDD', 'Gate B-TDD', 'Gate B1', 'Gate C', 'Gate C-impl', 'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D', 'Gate E'],
  },
  /** 后端开发流程：跳过了 C1.5（视觉验证） */
  backend: {
    name: '后端开发',
    gates: ['Gate A', 'Gate B-DDD', 'Gate B-BDD', 'Gate B-TDD', 'Gate B1', 'Gate C', 'Gate C-impl', 'Gate C1', 'Gate C2', 'Gate D', 'Gate E'],
  },
  /** 轻量编排水：支持 Gate 入口跳转，按任务类型智能跳过无关闸门 */
  lite: {
    name: '轻量编排',
    gates: ['Gate A', 'Gate B-DDD', 'Gate B-BDD', 'Gate B-TDD', 'Gate B1', 'Gate C', 'Gate C-impl', 'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D', 'Gate E'],
    allow_jump: true,
  },
  /** 重构流程：定义边界→基线测试→执行重构→行为漂移检测→生成报告
   *  Gate 命名：R1-R5 属于 /refactor 流水线，不与现有 Gate E（发布阶段）混淆 */
  refactor: {
    name: '重构',
    gates: ['R1', 'R2', 'R3', 'R4', 'R5'],
  },
  /** 紧急热修复：紧急声明→最小化修复→快速验证+回滚→事后审计
   *  Gate 命名：H0-H3 属于 /hotfix 流水线 */
  hotfix: {
    name: '紧急热修复',
    gates: ['H0', 'H1', 'H2', 'H3'],
  },
  /** 框架迁移：验证规则→应用迁移→编译验证→自动修复Lint */
  migrate: {
    name: '框架迁移',
    gates: ['M1', 'M2', 'M3', 'M4'],
  },
  /** 技术评估：定义标准→生成原型→收集指标→生成报告
   *  注意：E0-E3 属于 /evaluate 流水线，不与现有 Gate E（发布阶段）混淆 */
  evaluate: {
    name: '技术评估',
    gates: ['E0', 'E1', 'E2', 'E3'],
  },
  /** 调试诊断：收集信息→复现用例→调试会话→交互诊断→输出报告 */
  debug: {
    name: '调试诊断',
    gates: ['D0', 'D1', 'D2', 'D3', 'D4'],
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

export const GATE_DIRS = {
  'Gate A':'requirements','Gate B-DDD':'tasks','Gate B-BDD':'tasks','Gate B-TDD':'tasks',
  'Gate B1':'architecture','Gate C':'plans','Gate C-impl':'implementation',
  'Gate C1':'implementation','Gate C1.5':'implementation','Gate C2':'testing',
  'Gate D':'review','Gate E':'shipping',
  // TASK-001: 5 条新流水线产物目录映射
  // /refactor → docs/refactoring/
  'R1':'refactoring','R2':'refactoring','R3':'refactoring','R4':'refactoring','R5':'refactoring',
  // /hotfix → docs/hotfix/
  'H0':'hotfix','H1':'hotfix','H2':'hotfix','H3':'hotfix',
  // /migrate → docs/migration/
  'M1':'migration','M2':'migration','M3':'migration','M4':'migration',
  // /evaluate → docs/evaluation/
  'E0':'evaluation','E1':'evaluation','E2':'evaluation','E3':'evaluation',
  // /debug → docs/debug/
  'D0':'debug','D1':'debug','D2':'debug','D3':'debug','D4':'debug',
};

export const GATE_CHECKS = {
  'Gate A':{check:'至少1个需求文档，含REQ-XXX编号'},
  'Gate B-DDD':{check:'DDD领域分析文档已产出，含聚合/实体/值对象/领域服务/聚合行为清单及路由建议'},
  'Gate B-BDD':{check:'BDD场景文档已产出（或编排者确认无高业务价值聚合行为需BDD验收而跳过）'},
  'Gate B-TDD':{check:'TDD任务包已产出，每个TASK-XXX映射至少1个REQ-XXX，DDD/TDD分类完整'},
  'Gate B1':{check:'架构评审通过，架构方案文档已产出（涉及前端/后端/数据库/算法的领域均有评审文档）'},
  'Gate C':{check:'计划文档含parallel_batches+Execution Packet'},'Gate C-impl':{check:'所有Batch实现完成，实现Agent已返回结果'},
  'Gate C1':{check:'Lint+Type-check+Build+Deps Audit全部通过'},
  'Gate C1.5':{check:'页面/组件视觉验证截图证据已附'},
  'Gate C2':{check:'quality-gates.yml门禁判定通过：单元测试覆盖率/通过率≥阈值、集成/E2E测试通过率≥阈值、Lint/类型错误≤阈值；测试文档用例覆盖完整，API契约验证通过'},
  'Gate D':{check:'领域审查+安全审计+性能审计通过；quality-gates.yml门禁判定通过：安全严重漏洞=0、高危漏洞≤阈值、性能回归≤阈值；REQ追踪矩阵完整'},'Gate E':{check:'质量门重检通过（Lint+Type-check+Build+Deps Audit）+测试套件重跑通过+安全审计+上线检查清单+回滚预案就绪'},
  // TASK-001: 重构流水线检查条件
  'R1':{check:'重构边界与目标文档已产出，含重构范围+不变行为清单+成功标准'},
  'R2':{check:'现有测试套件全部通过，基线覆盖率报告已产出'},
  'R3':{check:'重构代码已提交，所有修改在重构边界内，未涉及边界外文件'},
  'R4':{check:'测试套件再次全部通过，覆盖率对比无下降，行为漂移检测通过'},
  'R5':{check:'重构报告已产出，含变更摘要+覆盖率对比+行为漂移结论'},
  // TASK-001: 热修复流水线检查条件
  'H0':{check:'紧急声明已提交，审批人已确认，回滚预案已就绪'},
  'H1':{check:'最小化修复代码已提交，修复范围严格限定在故障根因，未夹带无关改动'},
  'H2':{check:'快速验证通过（Lint+Type-check+Build+Test重检），修复后功能正常，回滚预案可执行'},
  'H3':{check:'事后回溯审计报告已产出，含根因分析+修复措施+预防改进'},
  // TASK-001: 迁移流水线检查条件
  'M1':{check:'迁移规则文档已产出，规则覆盖率验证通过'},
  'M2':{check:'迁移已执行，代码已按规则表转换完毕'},
  'M3':{check:'编译/构建通过，Type-check零错误'},
  'M4':{check:'Lint零错误（自动修复循环最多2轮），构建成功'},
  // TASK-001: 评估流水线检查条件
  'E0':{check:'评估标准文档已产出，含评估维度+权重+用例清单'},
  'E1':{check:'快速原型已生成（沙箱/独立分支），可独立运行'},
  'E2':{check:'评估用例全部运行完毕，指标数据已收集'},
  'E3':{check:'评估报告已产出，含各维度评分+综合结论+推荐方案'},
  // TASK-001: 调试流水线检查条件
  'D0':{check:'异常描述已记录，日志/堆栈/环境信息已收集'},
  'D1':{check:'最小复现用例已生成，可稳定复现异常'},
  'D2':{check:'调试会话已启动，断点/日志已插入关键路径'},
  'D3':{check:'交互式诊断完成，根因已定位'},
  'D4':{check:'诊断报告已产出，含根因分析+修复方案+预防建议'},
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
  'Gate A':      { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'Gate B-DDD':  { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },
  'Gate B-BDD':  { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },
  'Gate B-TDD':  { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },
  'Gate B1':     { allow: ['read','write_doc','sweep_arch'],               deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'Gate C':    { allow: ['read','write_doc','sweep_arch','write_code','spawn_impl'], deny: ['spawn_test','build','deploy'] },
  'Gate C-impl': { allow: ['read','write_code','spawn_impl'],             deny: ['spawn_test','build','deploy'] },
  'Gate C1':   { allow: ['read','lint','build','fix'],                   deny: ['spawn_impl','spawn_test','deploy','write_code'] },
  'Gate C1.5': { allow: ['read','preview','fix'],                        deny: ['spawn_impl','spawn_test','build','deploy','write_code'] },
  'Gate C2':   { allow: ['read','spawn_test','fix'],                     deny: ['spawn_impl','deploy','write_code'] },
  'Gate D':    { allow: ['read','review','audit','fix'],                 deny: ['spawn_impl','spawn_test','build','deploy','write_code'] },
  'Gate E':    { allow: ['read','deploy','write_doc'],                   deny: ['write_code','spawn_impl','spawn_test','lint','build'] },
  // TASK-001: /refactor 流水线 Gate 操作矩阵
  'R1': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'R2': { allow: ['read','spawn_test'],                            deny: ['write_code','spawn_impl','build','deploy'] },
  'R3': { allow: ['read','write_code','spawn_impl'],              deny: ['spawn_test','build','deploy'] },
  'R4': { allow: ['read','spawn_test'],                            deny: ['write_code','spawn_impl','build','deploy'] },
  'R5': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  // TASK-001: /hotfix 流水线 Gate 操作矩阵
  'H0': { allow: ['read'],                                       deny: ['write_code','write_doc','spawn_impl','spawn_test','build','deploy'] },
  'H1': { allow: ['read','write_code','spawn_impl'],              deny: ['spawn_test','build','deploy'] },
  'H2': { allow: ['read','spawn_test','fix'],                     deny: ['write_code','spawn_impl','build','deploy'] },
  'H3': { allow: ['read','review','audit','deploy','write_doc'],  deny: ['write_code','spawn_impl','spawn_test'] },
  // TASK-001: /migrate 流水线 Gate 操作矩阵
  'M1': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'M2': { allow: ['read','write_code','spawn_impl'],              deny: ['spawn_test','build','deploy'] },
  'M3': { allow: ['read','lint','build','fix'],                   deny: ['write_code','spawn_impl','spawn_test','deploy'] },
  'M4': { allow: ['read','lint','build','fix'],                   deny: ['write_code','spawn_impl','spawn_test','deploy'] },
  // TASK-001: /evaluate 流水线 Gate 操作矩阵
  'E0': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'E1': { allow: ['read','write_code','spawn_impl'],              deny: ['spawn_test','build','deploy'] },
  'E2': { allow: ['read','spawn_test'],                            deny: ['write_code','spawn_impl','build','deploy'] },
  'E3': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  // TASK-001: /debug 流水线 Gate 操作矩阵
  'D0': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'D1': { allow: ['read','write_code','spawn_impl'],              deny: ['spawn_test','build','deploy'] },
  'D2': { allow: ['read','write_code','spawn_impl'],              deny: ['spawn_test','build','deploy'] },
  'D3': { allow: ['read','write_code','spawn_impl','spawn_test'], deny: ['build','deploy'] },
  'D4': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
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
  'Gate A':    { can_spawn: ['code-explore-expert', 'external-resource-expert'], note: '需求澄清——用subagent(Agent工具)spawn code-explore-expert+external-resource-expert探索+文档', team_strategy: 'subagent_only' },
  'Gate B-DDD': { can_spawn: ['task-design'], note: '领域驱动分析——spawn task-design (DDD模式) 产出聚合/实体/值对象/领域服务列表及路由建议' },
  'Gate B-BDD': { can_spawn: ['task-design'], note: '行为驱动——spawn task-design (BDD模式) 为高业务价值聚合行为编写Gherkin场景；纯技术逻辑时编排者可跳过此Gate' },
  'Gate B-TDD': { can_spawn: ['task-design'], note: '测试驱动任务——spawn task-design (TDD模式) 产出TDD任务包，每个TASK映射REQ+场景' },
  'Gate B1':   { can_spawn: ['frontend-architect', 'backend-architect', 'database-architect', 'algorithm-expert'], note: '架构评审——用subagent(Agent工具)spawn对应架构师(依变更范围选择前端/后端/数据库/算法架构师)', team_strategy: 'subagent_only' },
  'Gate C':    { can_spawn: ['planner', 'skill-assignment-expert'], note: '执行规划——用subagent(Agent工具)spawn planner+skill-assignment-expert产出parallel_batches和执行计划', team_strategy: 'subagent_only' },
  'Gate C-impl': { can_spawn: ['frontend-dev-expert', 'frontend-ui-expert', 'frontend-state-expert', 'backend-dev-expert', 'backend-api-expert', 'backend-logic-expert', 'backend-data-expert', 'remediation-expert'], note: '批量实现——推荐使用 Agent Team(TeamCreate) 并行调度实现Agent(Team模式),轻量任务用subagent(Agent工具)；修复回退时spawn remediation-expert', team_strategy: 'prefer_team' },
  'Gate C1':   { can_spawn: [], note: '代码质量门——Lint/Type-check/Build/Deps Audit。失败则修复后重跑' },
  'Gate C1.5': { can_spawn: [], note: '视觉验证门——截图+样式检查。失败则退回实现Agent补充证据' },
  'Gate C2':   { can_spawn: ['test-doc-writer', 'frontend-test-expert', 'backend-test-expert', 'api-test-expert', 'test-executor', 'remediation-expert', 'browser-test-expert', 'browser-use-expert', 'api-contract-expert', 'perf-test-expert', 'e2e-test-expert'], note: '测试阶段——推荐 Agent Team 并行跑测试(TeamCreate→各tester并行执行),轻量检查用subagent。步骤1(Team并行):spawn test-doc-writer+frontend-test-expert+backend-test-expert+api-test-expert → 步骤2:spawn test-executor → 步骤3(失败时):spawn remediation-expert(≤2轮) → 步骤4:spawn e2e-test-expert → 步骤5:汇总至docs/testing/', team_strategy: 'prefer_team' },
  'Gate D':    { can_spawn: ['frontend-review-expert', 'backend-review-expert', 'security-review-expert', 'perf-review-expert', 'qa-review-expert'], note: '评审阶段——推荐 Agent Team 并行审查(TeamCreate→各reviewer并行),qa-review-expert用subagent综合签核', team_strategy: 'prefer_team' },
  'Gate E':    { can_spawn: ['security-review-expert', 'infra-deploy-expert', 'docs-engineer'], note: '发布阶段——安全审计+文档生成+上线检查+版本管理+归档' },
  // TASK-001: /refactor 流水线 Agent 生成指引
  'R1': { can_spawn: [], note: '定义重构边界与目标' },
  'R2': { can_spawn: ['frontend-test-expert','backend-test-expert'], note: '运行现有测试套件+基线覆盖率' },
  'R3': { can_spawn: ['frontend-dev-expert','frontend-ui-expert','frontend-state-expert','backend-dev-expert','backend-api-expert','backend-logic-expert','backend-data-expert','remediation-expert'], note: '执行重构' },
  'R4': { can_spawn: ['frontend-test-expert','backend-test-expert'], note: '再次运行测试+对比覆盖率+行为漂移检测' },
  'R5': { can_spawn: [], note: '汇总重构报告' },
  // TASK-001: /hotfix 流水线 Agent 生成指引
  'H0': { can_spawn: [], note: '紧急声明+审批确认——需人工介入' },
  'H1': { can_spawn: ['frontend-dev-expert','backend-dev-expert','remediation-expert'], note: '最小化修复' },
  'H2': { can_spawn: ['frontend-test-expert','backend-test-expert','browser-test-expert'], note: '快速验证+回滚预案' },
  'H3': { can_spawn: ['security-review-expert','qa-review-expert','docs-engineer'], note: '事后回溯审计' },
  // TASK-001: /migrate 流水线 Agent 生成指引
  'M1': { can_spawn: ['code-explore-expert'], note: '验证迁移规则覆盖率' },
  'M2': { can_spawn: ['frontend-dev-expert','backend-dev-expert','remediation-expert'], note: '应用迁移' },
  'M3': { can_spawn: [], note: '编译/构建验证——Lint+Type-check+Build' },
  'M4': { can_spawn: [], note: '自动修复Lint错误——循环修复至全部通过' },
  // TASK-001: /evaluate 流水线 Agent 生成指引
  'E0': { can_spawn: ['code-explore-expert','external-resource-expert'], note: '定义评估标准+用例' },
  'E1': { can_spawn: ['frontend-dev-expert','backend-dev-expert'], note: '生成快速原型（沙箱）' },
  'E2': { can_spawn: ['frontend-test-expert','backend-test-expert','perf-test-expert'], note: '运行用例+收集指标' },
  'E3': { can_spawn: [], note: '汇总评估报告到 docs/evaluation/' },
  // TASK-001: /debug 流水线 Agent 生成指引
  'D0': { can_spawn: ['code-explore-expert'], note: '异常描述+日志收集' },
  'D1': { can_spawn: ['frontend-dev-expert','backend-dev-expert'], note: '生成最小复现用例' },
  'D2': { can_spawn: ['frontend-dev-expert','backend-dev-expert'], note: '启动调试会话' },
  'D3': { can_spawn: ['frontend-dev-expert','backend-dev-expert'], note: '交互式诊断' },
  'D4': { can_spawn: [], note: '输出诊断报告到 docs/debug/' },
};

/** 获取当前 Gate 可生成的 Agent 指引 */
export function getGateAgentGuide(gate) {
  return GATE_AGENT_GUIDE[gate] || { can_spawn: [], note: '未知Gate' };
}

/** 获取当前 Gate 的团队策略指引（team/spawn 混合模式选择） */
export function getGateTeamStrategy(gate) {
  const guide = GATE_AGENT_GUIDE[gate];
  return guide?.team_strategy || 'subagent_only';
}

/** 每个 Gate 的最大重试循环次数 */
export const MAX_RETRY = {
  'Gate A': Infinity,
  'Gate B-DDD': 2,
  'Gate B-BDD': 2,
  'Gate B-TDD': 2,
  'Gate B1': 2,
  'Gate C': 2,
  'Gate C-impl': 3,
  'Gate C1': 3,
  'Gate C1.5': 2,
  'Gate C2': 2,
  'Gate D': 2,
  'Gate E': 2,
  // TASK-001: /refactor 流水线重试次数
  'R1': 2, 'R2': 2, 'R3': 2, 'R4': 2, 'R5': 2,
  // TASK-001: /hotfix 流水线重试次数
  'H0': 1, // 审批拒绝不重试
  'H1': 2, 'H2': 2,
  'H3': Infinity, // 合规审计不可跳过
  // TASK-001: /migrate 流水线重试次数
  'M1': 2, 'M2': 2, 'M3': 2,
  'M4': 2, // 自动修复Lint错误：循环修复至全部通过
  // TASK-001: /evaluate 流水线重试次数
  'E0': 2, 'E1': 2, 'E2': 2, 'E3': 2,
  // TASK-001: /debug 流水线重试次数
  'D0': 2, 'D1': 2, 'D2': 2,
  'D3': Infinity, // 交互式诊断可无限重试
  'D4': 2,
};

/** 各个 Gate 的入口条件检查 */
export const GATE_ENTRY_CONDITIONS = {
  'Gate B-DDD': 'Gate A 需求文档已产出',
  'Gate B-BDD': 'Gate B-DDD 领域分析已产出（含聚合行为路由建议）',
  'Gate B-TDD': 'Gate B-BDD 场景文档已产出（或编排者确认跳过）',
  'Gate B1': 'Gate B-TDD TDD任务包已产出',
  'Gate C': 'Gate B1 架构评审通过（或确认无需架构评审）',
  'Gate C-impl': 'Gate C 执行计划已产出',
  'Gate C1': 'Gate C-impl 实现代码已提交',
  'Gate C1.5': 'Gate C1 质量检查通过',
  'Gate C2': 'Gate C1+C1.5 通过',
  'Gate D': 'Gate C2 测试通过',
  'Gate E': 'Gate D 审查通过',
  // TASK-001: /refactor 流水线入口条件
  'R2': 'Gate R1 重构边界已确认',
  'R3': 'Gate R2 基线测试通过+覆盖率已记录',
  'R4': 'Gate R3 重构代码已提交',
  'R5': 'Gate R4 覆盖率对比+行为漂移检测通过',
  // TASK-001: /hotfix 流水线入口条件
  'H1': 'Gate H0 审批人已确认',
  'H2': 'Gate H1 最小化修复已提交',
  'H3': 'Gate H2 快速验证通过+回滚预案已就绪',
  // TASK-001: /migrate 流水线入口条件
  'M2': 'Gate M1 规则覆盖率验证通过',
  'M3': 'Gate M2 迁移已执行',
  'M4': 'Gate M3 编译/构建通过',
  // TASK-001: /evaluate 流水线入口条件
  'E1': 'Gate E0 评估标准已定义',
  'E2': 'Gate E1 原型已生成',
  'E3': 'Gate E2 用例运行完毕+指标已收集',
  // TASK-001: /debug 流水线入口条件
  'D1': 'Gate D0 异常信息已收集',
  'D2': 'Gate D1 复现用例已生成',
  'D3': 'Gate D2 调试会话已启动',
  'D4': 'Gate D3 诊断完成',
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

/**
 * 扫描 Gate 产物文档（返回相对 docs/ 的完整路径）。
 * 仅从日期目录 docs/<YYYY>-<MM>-<DD>/{subdir}/ 扫描，旧扁平结构不再兼容。
 * @param {string} docsDir 文档根目录
 * @param {string} gate Gate 名称
 * @returns {string[]} 相对路径列表（如 "2026-05-10/requirements/REQ-001.md"），最多 5 个
 */
export function findGateArtifacts(docsDir, gate) {
  const subdir = GATE_DIRS[gate]; if (!subdir) return [];

  // 新结构：迭代所有日期目录
  if (existsSync(docsDir)) {
    const dateDirs = readdirSync(docsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name));
    const files: string[] = [];
    for (const dd of dateDirs) {
      const dir = join(docsDir, dd.name, subdir);
      if (existsSync(dir)) {
        const mdFiles = readdirSync(dir).filter(f => f.endsWith('.md'));
        for (const f of mdFiles) {
          files.push(`${dd.name}/${subdir}/${f}`);
        }
        if (files.length >= 5) break;
      }
    }
    if (files.length > 0) return files.slice(0, 5);
  }

  return [];
}

/**
 * 按会话过滤 Gate 产物文档——仅查 artifacts 表，杜绝跨会话污染。
 * 无 artifacts 记录时回退当日日期目录扫描（当前 Gate 实时可见，无需等到 Gate 通过）。
 * @param docsDir 文档根目录
 * @param gate Gate 名称
 * @param sessionId 会话 ID
 * @param db 数据库实例
 * @param runId 可选 run ID；传入时优先从 artifacts 表精确查询
 * @returns 相对于 docsDir 的文档路径列表（如 "2026-05-10/requirements/REQ-001.md"），最多 5 个
 */
export function findSessionGateArtifacts(docsDir, gate, sessionId, db, runId?) {
  const subdir = GATE_DIRS[gate];
  if (!subdir) return [];

  // 按 run_id + gate 精确查询 artifacts 表
  if (runId && db) {
    const rows = getArtifactsByRunAndGate(db, runId, gate);
    if (rows.length > 0) {
      return rows.map(r => r.filepath).slice(0, 5);
    }
  }

  // 无 artifacts 记录时使用当日日期目录扫描（当前 Gate 实时可见）
  const today = new Date().toISOString().slice(0, 10);
  const todayDir = join(docsDir, today, subdir);
  if (existsSync(todayDir)) {
    const mdFiles = readdirSync(todayDir).filter(f => f.endsWith('.md'));
    if (mdFiles.length > 0) {
      return mdFiles.map(f => `${today}/${subdir}/${f}`).slice(0, 5);
    }
  }

  return [];
}

export function formatGateDisplay(gates, current) {
  return gates.map(g => `${g.passed ? '✅' : g.gate === current ? '🔵' : '⏳'} ${g.gate}${g.passed && g.checkpoints?.length ? ` (${g.checkpoints[0].passed_at?.slice(0,10)})` : ''}`).join(' → ');
}
