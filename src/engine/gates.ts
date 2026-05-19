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
  // /research → docs/research/
  'RS0':'research','RS1':'research','RS2':'research','RS3':'research','RS4':'research',
  // /release → docs/shipping/
  'RL0':'shipping','RL1':'shipping','RL2':'shipping','RL3':'shipping','RL4':'shipping',
  // /ask → docs/requirements/
  'K0':'requirements','K1':'requirements','K2':'requirements','K3':'requirements',
  // /simplify → docs/simplification/
  'S0':'simplification','S1':'simplification','S2':'simplification','S3':'simplification',
  // /trace → docs/trace/
  'T0':'trace','T1':'trace','T2':'trace','T3':'trace','T4':'trace',
  // /improve → docs/improvement/
  'IM0':'improvement','IM1':'improvement','IM2':'improvement','IM3':'improvement','IM4':'improvement',
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
  // /research 流水线检查条件
  'RS0':{check:'研究课题定义文档已产出，含研究范围+方法论+成功标准'},
  'RS1':{check:'信息收集清单已产出，含代码库/文档/网络资源索引'},
  'RS2':{check:'多维度分析已产出，含竞争假设+证据矩阵'},
  'RS3':{check:'假设验证已执行，证据充分支持或否定各假设'},
  'RS4':{check:'研究报告已产出，含结论+建议+后续行动'},
  // /release 流水线检查条件
  'RL0':{check:'环境检测报告已产出，含分支/包管理器/版本文件/测试命令'},
  'RL1':{check:'Lint+Type-check+Build+Deps Audit全部通过'},
  'RL2':{check:'版本号已递增，CHANGELOG已更新'},
  'RL3':{check:'Commit+Tag+Push+npm publish已完成'},
  'RL4':{check:'Tag存在+CI已触发+Registry版本已更新'},
  // /ask 流水线检查条件
  'K0':{check:'需求摄入完成，模式已选择（Interview/Direct/Consensus/Review），核心问题或需求已明确'},
  'K1':{check:'信息收集完成：代码上下文已探索（Interview）/需求已解析（Direct）/计划已加载（Consensus/Review）'},
  'K2':{check:'分析综合完成：需求分析+计划草案已产出（Interview/Direct）/架构审查+批评评估已执行（Consensus/Review）'},
  'K3':{check:'最终交付物已产出：结构化需求计划（Interview/Direct）/共识裁决结果（Consensus）/优化建议+修订方案（Review）'},
  // /simplify 流水线检查条件
  'S0':{check:'代码分析报告已产出，含复杂度/冗余/AI痕迹/改进机会清单'},
  'S1':{check:'简化执行完成，代码已按分析报告优化，所有功能保持不变'},
  'S2':{check:'回归验证通过：Lint+Type-check+Build+Test全部通过，无回归'},
  'S3':{check:'简化报告已产出，含before/after对比+简化统计+变更清单'},
  // /trace 流水线检查条件
  'T0':{check:'问题框架已明确，含症状描述+上下文+已知信息+时间线'},
  'T1':{check:'2-5个竞态假设已生成，每个假设含先验概率+支持条件+证伪条件'},
  'T2':{check:'每个假设的证据已收集，含支持证据+反对证据+不确定性评估'},
  'T3':{check:'因果分析完成：贝叶斯更新已执行+假设排序+根因概率+置信度'},
  'T4':{check:'解决方案已产出，含推荐修复+验证步骤+预防建议'},
  // /improve 流水线检查条件
  'IM0':{check:'改进目标已定义，含量化指标+基准值+目标值+停止条件'},
  'IM1':{check:'研究分析完成，代码库改进机会已识别，含优先级排序+预期收益'},
  'IM2':{check:'改进计划已制定，含可测试假设+实现方案+验证方法'},
  'IM3':{check:'改进已执行，基准测试已运行，结果已记录'},
  'IM4':{check:'评估完成：指标对比+迭代决策（继续/停止）+总结报告'},
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
  // /research 流水线 Gate 操作矩阵
  'RS0': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'RS1': { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },
  'RS2': { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },
  'RS3': { allow: ['read','write_doc','spawn_impl','spawn_test'],   deny: ['write_code','build','deploy'] },
  'RS4': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  // /release 流水线 Gate 操作矩阵
  'RL0': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'RL1': { allow: ['read','lint','build','fix'],                   deny: ['spawn_impl','spawn_test','deploy','write_code'] },
  'RL2': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'RL3': { allow: ['read','deploy','write_doc'],                   deny: ['write_code','spawn_impl','spawn_test','lint','build'] },
  'RL4': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  // /ask 流水线 Gate 操作矩阵
  'K0': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'K1': { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },
  'K2': { allow: ['read','write_doc','spawn_impl','sweep_arch'],  deny: ['write_code','spawn_test','build','deploy'] },
  'K3': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  // /simplify 流水线 Gate 操作矩阵
  'S0': { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },
  'S1': { allow: ['read','write_code','spawn_impl'],              deny: ['spawn_test','build','deploy'] },
  'S2': { allow: ['read','lint','build','spawn_test','fix'],      deny: ['write_code','spawn_impl','deploy'] },
  'S3': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  // /trace 流水线 Gate 操作矩阵
  'T0': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'T1': { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },
  'T2': { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },
  'T3': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'T4': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  // /improve 流水线 Gate 操作矩阵
  'IM0': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
  'IM1': { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },
  'IM2': { allow: ['read','write_doc','spawn_impl'],               deny: ['write_code','spawn_test','build','deploy'] },
  'IM3': { allow: ['read','write_code','spawn_impl','lint','build','spawn_test','fix'], deny: ['deploy'] },
  'IM4': { allow: ['read','write_doc'],                            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
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
  'Gate C-impl': { can_spawn: ['frontend-dev-expert', 'frontend-ui-expert', 'frontend-state-expert', 'backend-dev-expert', 'backend-api-expert', 'backend-logic-expert', 'backend-data-expert', 'remediation-expert', 'remediation-planner'], note: '批量实现——推荐 Agent Team(TeamCreate) 并行调度实现Agent(Team模式),轻量任务用subagent(Agent工具)；修复回退时spawn remediation-expert或remediation-planner', team_strategy: 'prefer_team', team_rules: '每个Team成员必须独占模块/文件区域,禁止多成员共享同一文件或模块。前端按组件/页面拆分,后端按服务/路由模块拆分,共享区域由唯一责任人处理'  },
  'Gate C1':   { can_spawn: [], note: '代码质量门——Lint/Type-check/Build/Deps Audit。失败则修复后重跑' },
  'Gate C1.5': { can_spawn: [], note: '视觉验证门——截图+样式检查。失败则退回实现Agent补充证据' },
  'Gate C2':   { can_spawn: ['test-doc-writer', 'frontend-test-expert', 'backend-test-expert', 'api-test-expert', 'test-executor', 'remediation-expert', 'browser-test-expert', 'browser-use-expert', 'api-contract-expert', 'perf-test-expert', 'e2e-test-expert'], note: '测试阶段——推荐 Agent Team 并行跑测试(TeamCreate→各tester并行执行),轻量检查用subagent。步骤1(Team并行):spawn test-doc-writer+frontend-test-expert+backend-test-expert+api-test-expert → 步骤2:spawn test-executor → 步骤3(失败时):spawn remediation-expert(≤2轮) → 步骤4:spawn e2e-test-expert → 步骤5:汇总至docs/testing/', team_strategy: 'prefer_team', team_rules: '各tester按测试类型独占(单元/集成/E2E/性能/安全),test-doc-writer写文档后tester按文档独立执行,互不干扰'  },
  'Gate D':    { can_spawn: ['frontend-review-expert', 'backend-review-expert', 'security-review-expert', 'perf-review-expert', 'qa-review-expert'], note: '评审阶段——推荐 Agent Team 并行审查(TeamCreate→各reviewer并行),qa-review-expert用subagent综合签核', team_strategy: 'prefer_team', team_rules: '各reviewer按领域独占(前端/后端/安全/性能),只读审查不修改文件。qa-review-expert为唯一签核者,汇总各领域findings后综合判定'  },
  'Gate E':    { can_spawn: ['security-review-expert', 'infra-deploy-expert', 'docs-engineer'], note: '发布阶段——安全审计+文档生成+上线检查+版本管理+归档' },
  // TASK-001: /refactor 流水线 Agent 生成指引
  'R1': { can_spawn: [], note: '定义重构边界与目标' },
  'R2': { can_spawn: ['frontend-test-expert','backend-test-expert'], note: '运行现有测试套件+基线覆盖率', team_strategy: 'subagent_only' },
  'R3': { can_spawn: ['frontend-dev-expert','frontend-ui-expert','frontend-state-expert','backend-dev-expert','backend-api-expert','backend-logic-expert','backend-data-expert','remediation-expert'], note: '执行重构——推荐 Agent Team 并行执行,各成员独占模块', team_strategy: 'prefer_team', team_rules: '重构按模块拆分,每个Team成员独占一个模块,共享区域由唯一责任人处理' },
  'R4': { can_spawn: ['frontend-test-expert','backend-test-expert'], note: '再次运行测试+对比覆盖率+行为漂移检测, 可并行执行前后端测试', team_strategy: 'prefer_team', team_rules: '前端测试和后端测试各自独占,互不干扰,结果汇总对比' },
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
  // /research 流水线 Agent 生成指引
  'RS0': { can_spawn: ['code-explore-expert', 'external-resource-expert'], note: '课题定义——探索代码库+外部资源，明确研究范围和方法论', team_strategy: 'subagent_only' },
  'RS1': { can_spawn: ['code-explore-expert', 'external-resource-expert', 'docs-research-expert'], note: '信息收集——推荐 Agent Team 并行收集代码库/文档/网络资源', team_strategy: 'prefer_team', team_rules: '各信息源独占，代码探索与网络搜索分开并行，互不干扰' },
  'RS2': { can_spawn: ['algorithm-expert', 'code-explore-expert', 'external-resource-expert'], note: '深度分析——推荐 Agent Team 多角度分析，产出竞争假设+证据矩阵', team_strategy: 'prefer_team', team_rules: '按分析维度拆分，算法/架构/数据各维度独占，互不交叉' },
  'RS3': { can_spawn: ['code-explore-expert', 'external-resource-expert', 'frontend-test-expert', 'backend-test-expert'], note: '假设验证——可spawn测试Agent验证技术假设，spawn探索Agent收集佐证', team_strategy: 'prefer_team', team_rules: '各假设独立验证，Agent按假设分配不交叉' },
  'RS4': { can_spawn: [], note: '研究报告——编排者汇总所有证据和分析，产出结构化研究报告' },
  // /release 流水线 Agent 生成指引
  'RL0': { can_spawn: ['code-explore-expert'], note: '环境检测——检测分支/包管理器/版本文件/测试命令' },
  'RL1': { can_spawn: [], note: '质量门——Lint+Type-check+Build+Deps Audit；失败则修复后重跑' },
  'RL2': { can_spawn: [], note: '版本递增——编排者执行版本号bump+CHANGELOG更新' },
  'RL3': { can_spawn: ['infra-deploy-expert', 'security-review-expert'], note: '发布执行——commit+tag+push+npm publish；安全审计并行' },
  'RL4': { can_spawn: [], note: '发布验证——确认tag存在、CI触发、Registry更新' },
  // /ask 流水线 Agent 生成指引
  'K0': { can_spawn: [], note: '需求摄入——编排者判断输入清晰度，自动选择Interview/Direct/Consensus/Review模式；苏格拉底式追问（Interview）或直接解析（Direct）', team_strategy: 'subagent_only' },
  'K1': { can_spawn: ['code-explore-expert', 'external-resource-expert'], note: '信息收集——Interview:深度代码探索+外部资源; Direct:快速上下文确认; Consensus:分析现有计划覆盖范围; Review:评估现有流程编排', team_strategy: 'subagent_only' },
  'K2': { can_spawn: ['code-explore-expert', 'frontend-architect', 'backend-architect', 'algorithm-expert'], note: '分析综合——Interview:编排者主导分析+code-explore-expert辅助; Direct:快速分析+code-explore-expert确认; Consensus:编排者(Critic角色)评估+Architect并行审查(≤5轮); Review:编排者(Critic角色)评估+优化建议', team_strategy: 'prefer_team', team_rules: 'Consensus模式: Architect子Agent并行审查(spawn Agent),编排者同时担任Critic独立评估,两者只读不修改文件,编排者汇总后修订计划。Interview/Direct: 编排者主导,code-explore-expert作为subagent辅助(只读)。Review: 编排者独占到K2完成' },
  'K3': { can_spawn: [], note: '交付产出——编排者产出最终交付物:结构化需求计划(Interview/Direct)/共识裁决结果(Consensus)/优化建议+修订方案(Review)' },
  // /simplify 流水线 Agent 生成指引
  'S0': { can_spawn: ['code-explore-expert'], note: '代码分析——spawn code-explore-expert扫描目标代码，识别复杂度/冗余/重复/AI痕迹模式', team_strategy: 'subagent_only' },
  'S1': { can_spawn: ['frontend-dev-expert', 'backend-dev-expert', 'backend-logic-expert', 'remediation-expert'], note: '简化执行——推荐 Agent Team 按模块并行简化，各成员独占文件区域，确保功能不变', team_strategy: 'prefer_team', team_rules: '每个Team成员独占模块/文件区域,禁止多成员共享同一文件。前端按组件拆分,后端按服务模块拆分。只做删除冗余+提取复用+简化逻辑,不改变功能行为' },
  'S2': { can_spawn: ['frontend-test-expert', 'backend-test-expert'], note: '回归验证——Lint+Type-check+Build+Test全跑，确保简化无回归', team_strategy: 'subagent_only' },
  'S3': { can_spawn: [], note: '报告产出——编排者汇总before/after对比+简化统计+变更清单' },
  // /trace 流水线 Agent 生成指引
  'T0': { can_spawn: [], note: '问题框架——编排者定义症状、上下文、已知信息、时间线' },
  'T1': { can_spawn: ['algorithm-expert', 'code-explore-expert'], note: '假设生成——spawn algorithm-expert+code-explore-expert生成2-5个竞态假设，每个含先验概率+证伪条件', team_strategy: 'subagent_only' },
  'T2': { can_spawn: ['code-explore-expert', 'external-resource-expert'], note: '证据收集——spawn code-explore-expert+external-resource-expert并行收集每个假设的支持/反对证据', team_strategy: 'subagent_only' },
  'T3': { can_spawn: [], note: '因果分析——编排者执行贝叶斯更新，按证据权重排序假设，定位根因' },
  'T4': { can_spawn: [], note: '解决方案——编排者基于确认的根因推荐修复方案+验证步骤+预防建议' },
  // /improve 流水线 Agent 生成指引
  'IM0': { can_spawn: [], note: '目标定义——编排者与用户确认改进目标+可量化指标+基准值+目标值+停止条件' },
  'IM1': { can_spawn: ['code-explore-expert', 'external-resource-expert'], note: '研究分析——spawn code-explore-expert分析代码库改进机会，external-resource-expert补充外部最佳实践', team_strategy: 'subagent_only' },
  'IM2': { can_spawn: ['planner'], note: '计划制定——spawn planner制定改进计划，含可测试假设+实现方案+验证方法+预期收益', team_strategy: 'subagent_only' },
  'IM3': { can_spawn: ['frontend-dev-expert', 'backend-dev-expert', 'backend-logic-expert', 'remediation-expert', 'frontend-test-expert', 'backend-test-expert'], note: '执行验证——推荐 Agent Team 并行实现改进+运行基准测试，各成员独占模块', team_strategy: 'prefer_team', team_rules: '每个Team成员独占模块/文件区域,禁止多成员共享同一文件。实现和测试Agent各自独立,测试确认改进效果' },
  'IM4': { can_spawn: [], note: '评估迭代——编排者对比指标+决策继续/停止，若继续则跳回IM1研究新一轮改进' },
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
  // /research 流水线重试次数
  'RS0': 2, 'RS1': 2, 'RS2': 3,
  'RS3': 3, 'RS4': 2,
  // /release 流水线重试次数
  'RL0': 2, 'RL1': 3,
  'RL2': 2, 'RL3': 2,
  'RL4': 2,
  // /ask 流水线重试次数
  'K0': Infinity, // 需求摄入可无限迭代(Socratic追问)
  'K1': 2,
  'K2': 5, // Consensus模式最多5轮Architect+Critic审查
  'K3': 2,
  // /simplify 流水线重试次数
  'S0': 2,
  'S1': 2,
  'S2': 3, // 回归验证失败可修复后重试
  'S3': 2,
  // /trace 流水线重试次数
  'T0': 2,
  'T1': 2,
  'T2': 2,
  'T3': 3, // 因果分析证据不充分时可补充收集
  'T4': 2,
  // /improve 流水线重试次数
  'IM0': 2,
  'IM1': 2,
  'IM2': 2,
  'IM3': 3, // 执行失败可修复后重试
  'IM4': Infinity, // 迭代直到停止条件满足
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
  // /research 流水线入口条件
  'RS1': 'Gate RS0 研究课题已定义',
  'RS2': 'Gate RS1 信息已收集',
  'RS3': 'Gate RS2 多维度分析已产出',
  'RS4': 'Gate RS3 假设验证已完成',
  // /release 流水线入口条件
  'RL1': 'Gate RL0 环境检测已完成',
  'RL2': 'Gate RL1 质量门全部通过',
  'RL3': 'Gate RL2 版本已递增',
  'RL4': 'Gate RL3 发布已执行',
  // /ask 流水线入口条件
  'K1': 'Gate K0 需求已摄入，模式已选择',
  'K2': 'Gate K1 信息已收集',
  'K3': 'Gate K2 分析已完成',
  // /simplify 流水线入口条件
  'S1': 'Gate S0 代码分析报告已产出',
  'S2': 'Gate S1 简化执行已完成',
  'S3': 'Gate S2 回归验证已通过',
  // /trace 流水线入口条件
  'T1': 'Gate T0 问题框架已明确',
  'T2': 'Gate T1 假设已生成',
  'T3': 'Gate T2 证据已收集',
  'T4': 'Gate T3 因果分析已完成',
  // /improve 流水线入口条件
  'IM1': 'Gate IM0 改进目标已定义',
  'IM2': 'Gate IM1 研究分析已完成',
  'IM3': 'Gate IM2 改进计划已制定',
  'IM4': 'Gate IM3 改进已执行',
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
    return rows.map(r => r.filepath).slice(0, 5);
  }

  // 无 runId 时使用当日日期目录扫描（兼容旧调用）
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
