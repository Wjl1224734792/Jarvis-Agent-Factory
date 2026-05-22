import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { getAgentList } from './agent-registry.js';
import { getArtifactsByRunAndGate, getSessionRuns } from './db.js';

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
  /** 深度研究：课题定义→信息收集→深度分析→假设验证→研究报告 */
  research: {
    name: '深度研究',
    gates: ['RS0', 'RS1', 'RS2', 'RS3', 'RS4'],
  },
  /** 发布：环境检测→质量门→版本递增→发布执行→发布验证 */
  release: {
    name: '发布',
    gates: ['RL0', 'RL1', 'RL2', 'RL3', 'RL4'],
  },
  /** 需求探询：4模式(K0需求摄入→K1信息收集→K2分析综合→K3交付产出)
   *  Interview: 一次一问→代码探索→分析综合→计划产出
   *  Direct: 解析需求→快速上下文→快速分析→直接计划
   *  Consensus: 加载计划→计划分析→Architect+Critic审查→共识裁决(≤5轮)
   *  Review: 加载计划→流程评估→Critic评估→优化建议
   */
  ask: {
    name: '需求探询',
    gates: ['K0', 'K1', 'K2', 'K3'],
    allow_jump: true,
  },
  /** 代码简化：S0代码分析→S1简化执行→S2回归验证→S3报告产出 */
  simplify: {
    name: '代码简化',
    gates: ['S0', 'S1', 'S2', 'S3'],
  },
  /** 因果追踪：T0问题框架→T1假设生成→T2证据收集→T3因果分析→T4解决方案 */
  trace: {
    name: '因果追踪',
    gates: ['T0', 'T1', 'T2', 'T3', 'T4'],
  },
  /** 自主迭代改进：IM0目标定义→IM1研究分析→IM2计划制定→IM3执行验证→IM4评估迭代 */
  improve: {
    name: '自主迭代改进',
    gates: ['IM0', 'IM1', 'IM2', 'IM3', 'IM4'],
    allow_jump: true,
  },
};

export const DEFAULT_PIPELINE = 'full';

/** 默认流水线的 Gate 序列（向后兼容） */
export const GATES = PIPELINE_DEFS[DEFAULT_PIPELINE].gates;

/** 按流水线类型获取 Gate 序列 */
export function getPipelineGates(type: any) {
  const def = PIPELINE_DEFS[type];
  return def ? def.gates : PIPELINE_DEFS[DEFAULT_PIPELINE].gates;
}

/** 获取流水线定义名称 */
export function getPipelineName(type: any) {
  const def = PIPELINE_DEFS[type];
  return def ? def.name : (type || DEFAULT_PIPELINE);
}

/** 统一 Gate 配置 — 合并原 6 张并行查找表，单一数据源 */
export interface GateConfig {
  dir: string;
  check: string;
  operations: { allow: string[]; deny: string[] };
  agent_guide: { can_spawn: string[]; note: string; team_strategy?: string; team_rules?: string };
  max_retry: number;
  entry_condition?: string;
}

export const GATE_CONFIG: Record<string, GateConfig> = {
  // ── full / frontend / backend / lite 共用 Gate ──
  'Gate A':      { dir: 'requirements',     check: '至少1个需求文档，含REQ-XXX编号',                                                                                 operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },                                 agent_guide: { can_spawn: ['code-explore-expert', 'external-resource-expert', 'docs-research-expert', 'browser-use-expert'], note: '需求澄清——spawn code-explore-expert探索代码库+external-resource-expert外部知识+docs-research-expert文档调研+browser-use-expert探索现有UI（按需），纯只读探索不写代码', team_strategy: 'subagent_only' },                             max_retry: Infinity },
  'Gate B-DDD':  { dir: 'tasks',             check: 'DDD领域分析文档已产出，含聚合/实体/值对象/领域服务/聚合行为清单及路由建议',                                              operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },                                 agent_guide: { can_spawn: ['task-design'], note: '领域驱动分析——spawn task-design (DDD模式) 产出聚合/实体/值对象/领域服务列表及路由建议' },                                                                                              max_retry: 2, entry_condition: 'Gate A 需求文档已产出' },
  'Gate B-BDD':  { dir: 'tasks',             check: 'BDD场景文档已产出（或编排者确认无高业务价值聚合行为需BDD验收而跳过）',                                                      operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },                                 agent_guide: { can_spawn: ['task-design'], note: '行为驱动——spawn task-design (BDD模式) 为高业务价值聚合行为编写Gherkin场景；纯技术逻辑时编排者可跳过此Gate' },                                                                                    max_retry: 2, entry_condition: 'Gate B-DDD 领域分析已产出（含聚合行为路由建议）' },
  'Gate B-TDD':  { dir: 'tasks',             check: 'TDD任务包已产出，每个TASK-XXX映射至少1个REQ-XXX，DDD/TDD分类完整',                                                      operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },                                 agent_guide: { can_spawn: ['task-design'], note: '测试驱动任务——spawn task-design (TDD模式) 产出TDD任务包，每个TASK映射REQ+场景' },                                                                                                  max_retry: 2, entry_condition: 'Gate B-BDD 场景文档已产出（或编排者确认跳过）' },
  'Gate B1':     { dir: 'architecture',      check: '架构评审通过，架构方案文档已产出（涉及前端/后端/数据库/算法的领域均有评审文档）',                                                operations: { allow: ['read','write_doc','sweep_arch','spawn_impl'],   deny: ['write_code','spawn_test','build','deploy'] },                                 agent_guide: { can_spawn: ['frontend-architect', 'backend-architect', 'database-architect', 'algorithm-expert', 'code-explore-expert'], note: '架构评审——spawn对应架构师(依变更范围选择前端/后端/数据库/算法)+code-explore-expert辅助探索现有代码库架构，纯只读不写代码', team_strategy: 'subagent_only' }, max_retry: 2, entry_condition: 'Gate B-TDD TDD任务包已产出' },
  'Gate C':      { dir: 'plans',             check: '计划文档含parallel_batches+Execution Packet',                                                                        operations: { allow: ['read','write_doc','sweep_arch','write_code','spawn_impl'], deny: ['spawn_test','build','deploy'] },                                 agent_guide: { can_spawn: ['planner', 'skill-assignment-expert'], note: '执行规划——用subagent(Agent工具)spawn planner+skill-assignment-expert产出parallel_batches和执行计划', team_strategy: 'subagent_only' },                                               max_retry: 2, entry_condition: 'Gate B1 架构评审通过（或确认无需架构评审）' },
  'Gate C-impl': { dir: 'implementation',    check: '所有Batch实现完成，实现Agent已返回结果',                                                                             operations: { allow: ['read','write_code','spawn_impl'],             deny: ['spawn_test','build','deploy'] },                                 agent_guide: { can_spawn: ['frontend-dev-expert', 'frontend-ui-expert', 'frontend-state-expert', 'backend-dev-expert', 'backend-api-expert', 'backend-logic-expert', 'backend-data-expert', 'android-dev-expert', 'android-ui-expert', 'android-state-expert', 'ios-dev-expert', 'ios-ui-expert', 'ios-state-expert', 'flutter-dev-expert', 'flutter-ui-expert', 'flutter-state-expert', 'taro-dev-expert', 'taro-ui-expert', 'taro-state-expert', 'react-native-dev-expert', 'react-native-ui-expert', 'react-native-state-expert', 'expo-dev-expert', 'expo-ui-expert', 'expo-state-expert', 'remediation-expert', 'remediation-planner'], note: '批量实现——推荐 Agent Team(TeamCreate) 并行调度实现Agent(Team模式),轻量任务用subagent(Agent工具)；平台Agent(android/ios/flutter/taro/react-native/expo)按需选择；修复回退时spawn remediation-expert或remediation-planner', team_strategy: 'prefer_team', team_rules: '每个Team成员必须独占模块/文件区域,禁止多成员共享同一文件或模块。前端按组件/页面拆分,后端按服务/路由模块拆分,移动端按平台+页面拆分,共享区域由唯一责任人处理' }, max_retry: 3, entry_condition: 'Gate C 执行计划已产出' },
  'Gate C1':     { dir: 'implementation',    check: 'Lint+Type-check+Build+Deps Audit全部通过',                                                                          operations: { allow: ['read','lint','build','fix'],                   deny: ['spawn_impl','spawn_test','deploy','write_code'] },                                 agent_guide: { can_spawn: [], note: '代码质量门——Lint/Type-check/Build/Deps Audit。失败则修复后重跑' },                                                                                                                                                                                        max_retry: 3, entry_condition: 'Gate C-impl 实现代码已提交' },
  'Gate C1.5':   { dir: 'implementation',    check: '页面/组件视觉验证截图证据已附',                                                                                      operations: { allow: ['read','preview','fix'],                        deny: ['spawn_impl','spawn_test','build','deploy','write_code'] },                                 agent_guide: { can_spawn: [], note: '视觉验证门——截图+样式检查。失败则退回实现Agent补充证据' },                                                                                                                                                                                        max_retry: 2, entry_condition: 'Gate C1 质量检查通过' },
  'Gate C2':     { dir: 'testing',           check: 'quality-gates.yml门禁判定通过：单元测试覆盖率/通过率≥阈值、集成/E2E测试通过率≥阈值、Lint/类型错误≤阈值；测试文档用例覆盖完整，API契约验证通过', operations: { allow: ['read','spawn_test','fix'],                     deny: ['spawn_impl','deploy','write_code'] },                                 agent_guide: { can_spawn: ['test-doc-writer', 'frontend-test-expert', 'backend-test-expert', 'android-test-expert', 'ios-test-expert', 'flutter-test-expert', 'taro-test-expert', 'expo-test-expert', 'react-native-test-expert', 'api-test-expert', 'test-executor', 'remediation-expert', 'browser-test-expert', 'browser-use-expert', 'api-contract-expert', 'perf-test-expert', 'e2e-test-expert'], note: '测试阶段——推荐 Agent Team 并行跑测试(TeamCreate→各tester并行执行),轻量检查用subagent。平台测试Agent(android/ios/flutter/taro/react-native/expo)按需选择。步骤1(Team并行):spawn test-doc-writer+各平台test-expert → 步骤2:spawn test-executor → 步骤3(失败时):spawn remediation-expert(≤2轮) → 步骤4:spawn e2e-test-expert → 步骤5:汇总至.jarvis/testing/', team_strategy: 'prefer_team', team_rules: '各tester按测试类型独占(单元/集成/E2E/性能/安全),test-doc-writer写文档后tester按文档独立执行,互不干扰。平台测试按平台隔离,互不交叉' }, max_retry: 5, entry_condition: 'Gate C1（后端）或 Gate C1+C1.5（前端/移动端）通过' },
  'Gate D':      { dir: 'review',            check: '领域审查+安全审计+性能审计通过；quality-gates.yml门禁判定通过：安全严重漏洞=0、高危漏洞≤阈值、性能回归≤阈值；REQ追踪矩阵完整',           operations: { allow: ['read','review','audit','fix'],                 deny: ['spawn_impl','spawn_test','build','deploy','write_code'] },                                 agent_guide: { can_spawn: ['frontend-review-expert', 'backend-review-expert', 'android-review-expert', 'ios-review-expert', 'flutter-review-expert', 'taro-review-expert', 'expo-review-expert', 'react-native-review-expert', 'security-review-expert', 'perf-review-expert', 'qa-review-expert', 'change-review-expert', 'diff-review-expert', 'project-review-expert', 'audit-fix-optimize', 'audit-only', 'code-explore-expert', 'browser-use-expert', 'browser-test-expert'], note: '评审阶段——推荐 Agent Team 并行审查(TeamCreate→各reviewer并行),qa-review-expert用subagent综合签核。平台审查Agent(android/ios/flutter/taro/react-native/expo)按需选择', team_strategy: 'prefer_team', team_rules: '各reviewer按领域独占(前端/后端/移动端/安全/性能),只读审查不修改文件。qa-review-expert为唯一签核者,汇总各领域findings后综合判定。平台审查按平台隔离,互不交叉' }, max_retry: 2, entry_condition: 'Gate C2 测试通过' },
  'Gate E':      { dir: 'shipping',          check: '质量门重检通过（Lint+Type-check+Build+Deps Audit）+测试套件重跑通过+安全审计+上线检查清单+回滚预案就绪',                           operations: { allow: ['read','deploy','write_doc'],                   deny: ['write_code','spawn_impl','spawn_test','lint','build'] },                                 agent_guide: { can_spawn: ['security-review-expert', 'infra-deploy-expert', 'docs-engineer'], note: '发布阶段——安全审计+文档生成+上线检查+版本管理+归档' },                                                                                                                                                                                  max_retry: 2, entry_condition: 'Gate D 审查通过' },

  // ── /refactor 流水线 ──
  'R1': { dir: 'refactoring',  check: '重构边界与目标文档已产出，含重构范围+不变行为清单+成功标准',                                                              operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '定义重构边界与目标' },                                                                                                                                                                                                                                    max_retry: 2 },
  'R2': { dir: 'refactoring',  check: '现有测试套件全部通过，基线覆盖率报告已产出',                                                                              operations: { allow: ['read','spawn_test'],                            deny: ['write_code','spawn_impl','build','deploy'] },                agent_guide: { can_spawn: ['frontend-test-expert','backend-test-expert'], note: '运行现有测试套件+基线覆盖率', team_strategy: 'subagent_only' },                                                                                                                                                    max_retry: 2, entry_condition: 'Gate R1 重构边界已确认' },
  'R3': { dir: 'refactoring',  check: '重构代码已提交，所有修改在重构边界内，未涉及边界外文件',                                                                  operations: { allow: ['read','write_code','spawn_impl'],              deny: ['spawn_test','build','deploy'] },                              agent_guide: { can_spawn: ['frontend-dev-expert','frontend-ui-expert','frontend-state-expert','backend-dev-expert','backend-api-expert','backend-logic-expert','backend-data-expert','remediation-expert'], note: '执行重构——推荐 Agent Team 并行执行,各成员独占模块', team_strategy: 'prefer_team', team_rules: '重构按模块拆分,每个Team成员独占一个模块,共享区域由唯一责任人处理' }, max_retry: 2, entry_condition: 'Gate R2 基线测试通过+覆盖率已记录' },
  'R4': { dir: 'refactoring',  check: '测试套件再次全部通过，覆盖率对比无下降，行为漂移检测通过',                                                                operations: { allow: ['read','spawn_test'],                            deny: ['write_code','spawn_impl','build','deploy'] },                agent_guide: { can_spawn: ['frontend-test-expert','backend-test-expert'], note: '再次运行测试+对比覆盖率+行为漂移检测, 可并行执行前后端测试', team_strategy: 'prefer_team', team_rules: '前端测试和后端测试各自独占,互不干扰,结果汇总对比' },                                                                      max_retry: 2, entry_condition: 'Gate R3 重构代码已提交' },
  'R5': { dir: 'refactoring',  check: '重构报告已产出，含变更摘要+覆盖率对比+行为漂移结论',                                                                      operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '汇总重构报告' },                                                                                                                                                                                                                                    max_retry: 2, entry_condition: 'Gate R4 覆盖率对比+行为漂移检测通过' },

  // ── /hotfix 流水线 ──
  'H0': { dir: 'hotfix', check: '紧急声明已提交，审批人已确认，回滚预案已就绪',                                 operations: { allow: ['read'],                                       deny: ['write_code','write_doc','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '紧急声明+审批确认——需人工介入' },                                                                                                                                                                                                                 max_retry: 1 },
  'H1': { dir: 'hotfix', check: '最小化修复代码已提交，修复范围严格限定在故障根因，未夹带无关改动',                  operations: { allow: ['read','write_code','spawn_impl'],              deny: ['spawn_test','build','deploy'] },                              agent_guide: { can_spawn: ['frontend-dev-expert','backend-dev-expert','remediation-expert'], note: '最小化修复' },                                                                                                                                                                          max_retry: 2, entry_condition: 'Gate H0 审批人已确认' },
  'H2': { dir: 'hotfix', check: '快速验证通过（Lint+Type-check+Build+Test重检），修复后功能正常，回滚预案可执行',      operations: { allow: ['read','spawn_test','fix'],                     deny: ['write_code','spawn_impl','build','deploy'] },                agent_guide: { can_spawn: ['frontend-test-expert','backend-test-expert','browser-test-expert'], note: '快速验证+回滚预案' },                                                                                                                                                              max_retry: 2, entry_condition: 'Gate H1 最小化修复已提交' },
  'H3': { dir: 'hotfix', check: '事后回溯审计报告已产出，含根因分析+修复措施+预防改进',                            operations: { allow: ['read','review','audit','deploy','write_doc'],  deny: ['write_code','spawn_impl','spawn_test'] },                  agent_guide: { can_spawn: ['security-review-expert','qa-review-expert','docs-engineer'], note: '事后回溯审计' },                                                                                                                                                                        max_retry: Infinity, entry_condition: 'Gate H2 快速验证通过+回滚预案已就绪' },

  // ── /migrate 流水线 ──
  'M1': { dir: 'migration', check: '迁移规则文档已产出，规则覆盖率验证通过',                              operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: ['code-explore-expert'], note: '验证迁移规则覆盖率' },                                                                                                                                                                                                                         max_retry: 2 },
  'M2': { dir: 'migration', check: '迁移已执行，代码已按规则表转换完毕',                                    operations: { allow: ['read','write_code','spawn_impl'],              deny: ['spawn_test','build','deploy'] },                              agent_guide: { can_spawn: ['frontend-dev-expert','backend-dev-expert','remediation-expert'], note: '应用迁移' },                                                                                                                                                                          max_retry: 2, entry_condition: 'Gate M1 规则覆盖率验证通过' },
  'M3': { dir: 'migration', check: '编译/构建通过，Type-check零错误',                                    operations: { allow: ['read','lint','build','fix'],                   deny: ['write_code','spawn_impl','spawn_test','deploy'] },           agent_guide: { can_spawn: [], note: '编译/构建验证——Lint+Type-check+Build' },                                                                                                                                                                                                                max_retry: 2, entry_condition: 'Gate M2 迁移已执行' },
  'M4': { dir: 'migration', check: 'Lint零错误（自动修复循环最多2轮），构建成功',                              operations: { allow: ['read','lint','build','fix'],                   deny: ['write_code','spawn_impl','spawn_test','deploy'] },           agent_guide: { can_spawn: [], note: '自动修复Lint错误——循环修复至全部通过' },                                                                                                                                                                                                            max_retry: 2, entry_condition: 'Gate M3 编译/构建通过' },

  // ── /evaluate 流水线 ──
  'E0': { dir: 'evaluation',  check: '评估标准文档已产出，含评估维度+权重+用例清单',                                 operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] }, agent_guide: { can_spawn: ['code-explore-expert','external-resource-expert'], note: '定义评估标准+用例' },                                                                                                                                                                                                        max_retry: 2 },
  'E1': { dir: 'evaluation',  check: '快速原型已生成（沙箱/独立分支），可独立运行',                                   operations: { allow: ['read','write_code','spawn_impl'],              deny: ['spawn_test','build','deploy'] },                              agent_guide: { can_spawn: ['frontend-dev-expert','backend-dev-expert'], note: '生成快速原型（沙箱）' },                                                                                                                                                                                          max_retry: 2, entry_condition: 'Gate E0 评估标准已定义' },
  'E2': { dir: 'evaluation',  check: '评估用例全部运行完毕，指标数据已收集',                                        operations: { allow: ['read','spawn_test'],                            deny: ['write_code','spawn_impl','build','deploy'] },                agent_guide: { can_spawn: ['frontend-test-expert','backend-test-expert','perf-test-expert'], note: '运行用例+收集指标' },                                                                                                                                                                    max_retry: 2, entry_condition: 'Gate E1 原型已生成' },
  'E3': { dir: 'evaluation',  check: '评估报告已产出，含各维度评分+综合结论+推荐方案',                                  operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '汇总评估报告到 .jarvis/evaluation/' },                                                                                                                                                                                                               max_retry: 2, entry_condition: 'Gate E2 用例运行完毕+指标已收集' },

  // ── /debug 流水线 ──
  'D0': { dir: 'debug',       check: '异常描述已记录，日志/堆栈/环境信息已收集',                                    operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] }, agent_guide: { can_spawn: ['code-explore-expert'], note: '异常描述+日志收集' },                                                                                                                                                                                                                 max_retry: 2 },
  'D1': { dir: 'debug',       check: '最小复现用例已生成，可稳定复现异常',                                          operations: { allow: ['read','write_code','spawn_impl'],              deny: ['spawn_test','build','deploy'] },                              agent_guide: { can_spawn: ['frontend-dev-expert','backend-dev-expert'], note: '生成最小复现用例' },                                                                                                                                                                                          max_retry: 2, entry_condition: 'Gate D0 异常信息已收集' },
  'D2': { dir: 'debug',       check: '调试会话已启动，断点/日志已插入关键路径',                                       operations: { allow: ['read','write_code','spawn_impl'],              deny: ['spawn_test','build','deploy'] },                              agent_guide: { can_spawn: ['frontend-dev-expert','backend-dev-expert'], note: '启动调试会话' },                                                                                                                                                                                              max_retry: 2, entry_condition: 'Gate D1 复现用例已生成' },
  'D3': { dir: 'debug',       check: '交互式诊断完成，根因已定位',                                                operations: { allow: ['read','write_code','spawn_impl','spawn_test'], deny: ['build','deploy'] },                                         agent_guide: { can_spawn: ['frontend-dev-expert','backend-dev-expert'], note: '交互式诊断' },                                                                                                                                                                                                  max_retry: Infinity, entry_condition: 'Gate D2 调试会话已启动' },
  'D4': { dir: 'debug',       check: '诊断报告已产出，含根因分析+修复方案+预防建议',                                    operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '输出诊断报告到 .jarvis/debug/' },                                                                                                                                                                                                             max_retry: 2, entry_condition: 'Gate D3 诊断完成' },

  // ── /research 流水线 ──
  'RS0': { dir: 'research',   check: '研究课题定义文档已产出，含研究范围+方法论+成功标准',                                 operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] }, agent_guide: { can_spawn: ['code-explore-expert', 'external-resource-expert'], note: '课题定义——探索代码库+外部资源，明确研究范围和方法论', team_strategy: 'subagent_only' },                                                                                                                                        max_retry: 2 },
  'RS1': { dir: 'research',   check: '信息收集清单已产出，含代码库/文档/网络资源索引',                                    operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] }, agent_guide: { can_spawn: ['code-explore-expert', 'external-resource-expert', 'docs-research-expert'], note: '信息收集——推荐 Agent Team 并行收集代码库/文档/网络资源', team_strategy: 'prefer_team', team_rules: '各信息源独占，代码探索与网络搜索分开并行，互不干扰' },                                                                                          max_retry: 2, entry_condition: 'Gate RS0 研究课题已定义' },
  'RS2': { dir: 'research',   check: '多维度分析已产出，含竞争假设+证据矩阵',                                         operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] }, agent_guide: { can_spawn: ['algorithm-expert', 'code-explore-expert', 'external-resource-expert'], note: '深度分析——推荐 Agent Team 多角度分析，产出竞争假设+证据矩阵', team_strategy: 'prefer_team', team_rules: '按分析维度拆分，算法/架构/数据各维度独占，互不交叉' },                                                                                         max_retry: 3, entry_condition: 'Gate RS1 信息已收集' },
  'RS3': { dir: 'research',   check: '假设验证已执行，证据充分支持或否定各假设',                                       operations: { allow: ['read','write_doc','spawn_impl','spawn_test'],   deny: ['write_code','build','deploy'] },                              agent_guide: { can_spawn: ['code-explore-expert', 'external-resource-expert', 'frontend-test-expert', 'backend-test-expert'], note: '假设验证——可spawn测试Agent验证技术假设，spawn探索Agent收集佐证', team_strategy: 'prefer_team', team_rules: '各假设独立验证，Agent按假设分配不交叉' },                                                                            max_retry: 3, entry_condition: 'Gate RS2 多维度分析已产出' },
  'RS4': { dir: 'research',   check: '研究报告已产出，含结论+建议+后续行动',                                         operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '研究报告——编排者汇总所有证据和分析，产出结构化研究报告' },                                                                                                                                                                                              max_retry: 2, entry_condition: 'Gate RS3 假设验证已完成' },

  // ── /release 流水线 ──
  'RL0': { dir: 'shipping',   check: '环境检测报告已产出，含分支/包管理器/版本文件/测试命令',                               operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] }, agent_guide: { can_spawn: ['code-explore-expert'], note: '环境检测——检测分支/包管理器/版本文件/测试命令' },                                                                                                                                                                                 max_retry: 2 },
  'RL1': { dir: 'shipping',   check: 'Lint+Type-check+Build+Deps Audit全部通过',                              operations: { allow: ['read','lint','build','fix'],                   deny: ['spawn_impl','spawn_test','deploy','write_code'] },           agent_guide: { can_spawn: [], note: '质量门——Lint+Type-check+Build+Deps Audit；失败则修复后重跑' },                                                                                                                                                                                           max_retry: 3, entry_condition: 'Gate RL0 环境检测已完成' },
  'RL2': { dir: 'shipping',   check: '版本号已递增，CHANGELOG已更新',                                            operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '版本递增——编排者执行版本号bump+CHANGELOG更新' },                                                                                                                                                                                                        max_retry: 2, entry_condition: 'Gate RL1 质量门全部通过' },
  'RL3': { dir: 'shipping',   check: 'Commit+Tag+Push+npm publish已完成',                                    operations: { allow: ['read','deploy','write_doc'],                   deny: ['write_code','spawn_impl','spawn_test','lint','build'] },     agent_guide: { can_spawn: ['infra-deploy-expert', 'security-review-expert'], note: '发布执行——commit+tag+push+npm publish；安全审计并行' },                                                                                                                                                 max_retry: 2, entry_condition: 'Gate RL2 版本已递增' },
  'RL4': { dir: 'shipping',   check: 'Tag存在+CI已触发+Registry版本已更新',                                      operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '发布验证——确认tag存在、CI触发、Registry更新' },                                                                                                                                                                                                         max_retry: 2, entry_condition: 'Gate RL3 发布已执行' },

  // ── /ask 流水线 ──
  'K0': { dir: 'requirements', check: '需求摄入完成，模式已选择（Interview/Direct/Consensus/Review），核心问题或需求已明确',    operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '需求摄入——编排者判断输入清晰度，自动选择Interview/Direct/Consensus/Review模式；苏格拉底式追问（Interview）或直接解析（Direct）', team_strategy: 'subagent_only' },                                                                             max_retry: Infinity },
  'K1': { dir: 'requirements', check: '信息收集完成：代码上下文已探索（Interview）/需求已解析（Direct）/计划已加载（Consensus/Review）', operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] }, agent_guide: { can_spawn: ['code-explore-expert', 'external-resource-expert'], note: '信息收集——Interview:深度代码探索+外部资源; Direct:快速上下文确认; Consensus:分析现有计划覆盖范围; Review:评估现有流程编排', team_strategy: 'subagent_only' },                                                              max_retry: 2, entry_condition: 'Gate K0 需求已摄入，模式已选择' },
  'K2': { dir: 'requirements', check: '分析综合完成：需求分析+计划草案已产出（Interview/Direct）/架构审查+批评评估已执行（Consensus/Review）', operations: { allow: ['read','write_doc','spawn_impl','sweep_arch'],  deny: ['write_code','spawn_test','build','deploy'] }, agent_guide: { can_spawn: ['code-explore-expert', 'frontend-architect', 'backend-architect', 'algorithm-expert'], note: '分析综合——Interview:编排者主导分析+code-explore-expert辅助; Direct:快速分析+code-explore-expert确认; Consensus:编排者(Critic角色)评估+Architect并行审查(≤5轮); Review:编排者(Critic角色)评估+优化建议', team_strategy: 'prefer_team', team_rules: 'Consensus模式: Architect子Agent并行审查(spawn Agent),编排者同时担任Critic独立评估,两者只读不修改文件,编排者汇总后修订计划。Interview/Direct: 编排者主导,code-explore-expert作为subagent辅助(只读)。Review: 编排者独占到K2完成' }, max_retry: 5, entry_condition: 'Gate K1 信息已收集' },
  'K3': { dir: 'requirements', check: '最终交付物已产出：结构化需求计划（Interview/Direct）/共识裁决结果（Consensus）/优化建议+修订方案（Review）', operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '交付产出——编排者产出最终交付物:结构化需求计划(Interview/Direct)/共识裁决结果(Consensus)/优化建议+修订方案(Review)' },                                                                                                                                               max_retry: 2, entry_condition: 'Gate K2 分析已完成' },

  // ── /simplify 流水线 ──
  'S0': { dir: 'simplification', check: '代码分析报告已产出，含复杂度/冗余/AI痕迹/改进机会清单',                           operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] }, agent_guide: { can_spawn: ['code-explore-expert'], note: '代码分析——spawn code-explore-expert扫描目标代码，识别复杂度/冗余/重复/AI痕迹模式', team_strategy: 'subagent_only' },                                                                                                                                     max_retry: 2 },
  'S1': { dir: 'simplification', check: '简化执行完成，代码已按分析报告优化，所有功能保持不变',                              operations: { allow: ['read','write_code','spawn_impl'],              deny: ['spawn_test','build','deploy'] },                              agent_guide: { can_spawn: ['frontend-dev-expert', 'backend-dev-expert', 'backend-logic-expert', 'remediation-expert'], note: '简化执行——推荐 Agent Team 按模块并行简化，各成员独占文件区域，确保功能不变', team_strategy: 'prefer_team', team_rules: '每个Team成员独占模块/文件区域,禁止多成员共享同一文件。前端按组件拆分,后端按服务模块拆分。只做删除冗余+提取复用+简化逻辑,不改变功能行为' }, max_retry: 2, entry_condition: 'Gate S0 代码分析报告已产出' },
  'S2': { dir: 'simplification', check: '回归验证通过：Lint+Type-check+Build+Test全部通过，无回归',                    operations: { allow: ['read','lint','build','spawn_test','fix'],      deny: ['write_code','spawn_impl','deploy'] },                         agent_guide: { can_spawn: ['frontend-test-expert', 'backend-test-expert'], note: '回归验证——Lint+Type-check+Build+Test全跑，确保简化无回归', team_strategy: 'subagent_only' },                                                                                                                                      max_retry: 3, entry_condition: 'Gate S1 简化执行已完成' },
  'S3': { dir: 'simplification', check: '简化报告已产出，含before/after对比+简化统计+变更清单',                          operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '报告产出——编排者汇总before/after对比+简化统计+变更清单' },                                                                                                                                                                                      max_retry: 2, entry_condition: 'Gate S2 回归验证已通过' },

  // ── /trace 流水线 ──
  'T0': { dir: 'trace', check: '问题框架已明确，含症状描述+上下文+已知信息+时间线',                            operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '问题框架——编排者定义症状、上下文、已知信息、时间线' },                                                                                                                                                                                            max_retry: 2 },
  'T1': { dir: 'trace', check: '2-5个竞态假设已生成，每个假设含先验概率+支持条件+证伪条件',                         operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] }, agent_guide: { can_spawn: ['algorithm-expert', 'code-explore-expert'], note: '假设生成——spawn algorithm-expert+code-explore-expert生成2-5个竞态假设，每个含先验概率+证伪条件', team_strategy: 'subagent_only' },                                                                                                       max_retry: 2, entry_condition: 'Gate T0 问题框架已明确' },
  'T2': { dir: 'trace', check: '每个假设的证据已收集，含支持证据+反对证据+不确定性评估',                            operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] }, agent_guide: { can_spawn: ['code-explore-expert', 'external-resource-expert'], note: '证据收集——spawn code-explore-expert+external-resource-expert并行收集每个假设的支持/反对证据', team_strategy: 'subagent_only' },                                                                                             max_retry: 2, entry_condition: 'Gate T1 假设已生成' },
  'T3': { dir: 'trace', check: '因果分析完成：贝叶斯更新已执行+假设排序+根因概率+置信度',                           operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '因果分析——编排者执行贝叶斯更新，按证据权重排序假设，定位根因' },                                                                                                                                                                                      max_retry: 3, entry_condition: 'Gate T2 证据已收集' },
  'T4': { dir: 'trace', check: '解决方案已产出，含推荐修复+验证步骤+预防建议',                                    operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '解决方案——编排者基于确认的根因推荐修复方案+验证步骤+预防建议' },                                                                                                                                                                                    max_retry: 2, entry_condition: 'Gate T3 因果分析已完成' },

  // ── /improve 流水线 ──
  'IM0': { dir: 'improvement', check: '改进目标已定义，含量化指标+基准值+目标值+停止条件',                         operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '目标定义——编排者与用户确认改进目标+可量化指标+基准值+目标值+停止条件' },                                                                                                                                                                            max_retry: 2 },
  'IM1': { dir: 'improvement', check: '研究分析完成，代码库改进机会已识别，含优先级排序+预期收益',                       operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] }, agent_guide: { can_spawn: ['code-explore-expert', 'external-resource-expert'], note: '研究分析——spawn code-explore-expert分析代码库改进机会，external-resource-expert补充外部最佳实践', team_strategy: 'subagent_only' },                                                                                          max_retry: 2, entry_condition: 'Gate IM0 改进目标已定义' },
  'IM2': { dir: 'improvement', check: '改进计划已制定，含可测试假设+实现方案+验证方法',                              operations: { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] }, agent_guide: { can_spawn: ['planner'], note: '计划制定——spawn planner制定改进计划，含可测试假设+实现方案+验证方法+预期收益', team_strategy: 'subagent_only' },                                                                                                                                            max_retry: 2, entry_condition: 'Gate IM1 研究分析已完成' },
  'IM3': { dir: 'improvement', check: '改进已执行，基准测试已运行，结果已记录',                                    operations: { allow: ['read','write_code','spawn_impl','lint','build','spawn_test','fix'], deny: ['deploy'] }, agent_guide: { can_spawn: ['frontend-dev-expert', 'backend-dev-expert', 'backend-logic-expert', 'remediation-expert', 'frontend-test-expert', 'backend-test-expert'], note: '执行验证——推荐 Agent Team 并行实现改进+运行基准测试，各成员独占模块', team_strategy: 'prefer_team', team_rules: '每个Team成员独占模块/文件区域,禁止多成员共享同一文件。实现和测试Agent各自独立,测试确认改进效果' }, max_retry: 3, entry_condition: 'Gate IM2 改进计划已制定' },
  'IM4': { dir: 'improvement', check: '评估完成：指标对比+迭代决策（继续/停止）+总结报告',                            operations: { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] }, agent_guide: { can_spawn: [], note: '评估迭代——编排者对比指标+决策继续/停止，若继续则跳回IM1研究新一轮改进' },                                                                                                                                                                            max_retry: Infinity, entry_condition: 'Gate IM3 改进已执行' },
};

// ── 向后兼容导出：全部从 GATE_CONFIG 派生 ──

export const GATE_DIRS: Record<string, string> = Object.fromEntries(
  Object.entries(GATE_CONFIG).map(([k, v]) => [k, v.dir])
);

export const GATE_CHECKS: Record<string, { check: string }> = Object.fromEntries(
  Object.entries(GATE_CONFIG).map(([k, v]) => [k, { check: v.check }])
);

export const GATE_OPERATIONS: Record<string, { allow: string[]; deny: string[] }> = Object.fromEntries(
  Object.entries(GATE_CONFIG).map(([k, v]) => [k, v.operations])
);

export const GATE_AGENT_GUIDE: Record<string, { can_spawn: string[]; note: string; team_strategy?: string; team_rules?: string }> = Object.fromEntries(
  Object.entries(GATE_CONFIG).map(([k, v]) => [k, v.agent_guide])
);

export const MAX_RETRY: Record<string, number> = Object.fromEntries(
  Object.entries(GATE_CONFIG).map(([k, v]) => [k, v.max_retry])
);

export const GATE_ENTRY_CONDITIONS: Record<string, string> = Object.fromEntries(
  Object.entries(GATE_CONFIG).filter(([, v]) => v.entry_condition).map(([k, v]) => [k, v.entry_condition!])
);

/** 获取当前 Gate 允许的操作列表 */
export function getGateOperations(gate: any) {
  const cfg = GATE_CONFIG[gate];
  return cfg ? cfg.operations : { allow: [], deny: [] };
}

/** 获取当前 Gate 可生成的 Agent 指引 */
export function getGateAgentGuide(gate: any) {
  const cfg = GATE_CONFIG[gate];
  return cfg ? cfg.agent_guide : { can_spawn: [], note: '未知Gate' };
}

/** 获取当前 Gate 的团队策略指引（team/spawn 混合模式选择） */
export function getGateTeamStrategy(gate: any) {
  const cfg = GATE_CONFIG[gate];
  return cfg?.agent_guide?.team_strategy || 'subagent_only';
}

/** 动态扫描模板目录生成的完整 Agent 列表（替代硬编码） */
export const AGENT_LIST = getAgentList();


/**
 * 扫描 Gate 产物文档（返回相对 .jarvis/ 的完整路径）。
 * 仅从日期目录 .jarvis/<YYYY>-<MM>-<DD>/{subdir}/ 扫描，旧扁平结构不再兼容。
 * @param {string} artifactsDir 文档根目录
 * @param {string} gate Gate 名称
 * @returns {string[]} 相对路径列表（如 "2026-05-10/requirements/REQ-001.md"），最多 5 个
 */
export function findGateArtifacts(artifactsDir, gate) {
  const subdir = GATE_DIRS[gate]; if (!subdir) return [];

  // 新结构：迭代所有日期目录
  if (existsSync(artifactsDir)) {
    const dateDirs = readdirSync(artifactsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name));
    const files: string[] = [];
    for (const dd of dateDirs) {
      const dir = join(artifactsDir, dd.name, subdir);
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
 * @param artifactsDir 文档根目录
 * @param gate Gate 名称
 * @param sessionId 会话 ID
 * @param db 数据库实例
 * @param runId 可选 run ID；传入时优先从 artifacts 表精确查询
 * @returns 相对于 artifactsDir 的文档路径列表（如 "2026-05-10/requirements/REQ-001.md"），最多 5 个
 */
export function findSessionGateArtifacts(artifactsDir, gate, sessionId, db, runId?) {
  const subdir = GATE_DIRS[gate];
  if (!subdir) return [];

  // 按 run_id + gate 精确查询 artifacts 表
  if (runId && db) {
    const rows = getArtifactsByRunAndGate(db, runId, gate);
    return rows.map(r => r.filepath).slice(0, 5);
  }

  // 无活跃 run 时回退：查询该会话最近一次 run 的产物记录
  if (sessionId && db) {
    const sessionRuns = getSessionRuns(db, sessionId);
    if (sessionRuns.length > 0) {
      const rows = getArtifactsByRunAndGate(db, sessionRuns[0].id, gate);
      return rows.map(r => r.filepath).slice(0, 5);
    }
  }

  return [];
}

export function formatGateDisplay(gates: any, current: any) {
  return gates.map(g => `${g.passed ? '✅' : g.gate === current ? '🔵' : '⏳'} ${g.gate}${g.passed && g.checkpoints?.length ? ` (${g.checkpoints[0].passed_at?.slice(0,10)})` : ''}`).join(' → ');
}
