# 2026-04-19 全仓审查报告与优化路线图执行计划

## 需求文档路径

- `docs/requirements/2026-04-19-full-repo-audit-and-optimization-roadmap-requirements.md`

## 任务文档路径

- `docs/tasks/2026-04-19-full-repo-audit-and-optimization-roadmap-tasks.md`

## Gate B 预检查

- 结论：通过，可进入规划阶段。
- 已核对项：
  - 任务 ID 完整，采用 `TASK-FRAO-XXX` 格式。
  - 任务名称、类型、优先级、完成标准已写明。
  - DDD 分类与 `test_strategy` 已写明。
  - 风险任务已标注。
  - 文件所有权、共享路径提醒、只读/可写边界已写明。
- 本轮仍需坚持的硬边界：
  - 主产物是审查报告与优化路线图，不是大规模代码改造。
  - `apps/**`、`packages/**`、根配置与脚本默认只读。
  - 当前阶段仅允许写 `docs/review/**`、`docs/tasks/**`、`docs/plans/**`。

## 当前轮次目标

- 产出一套可直接交付主会话确认的全仓审查报告与优化路线图。
- 用并行只读审查泳道覆盖架构边界、关键数据流、性能扩展性、工程质量与交付风险。
- 明确哪些问题只记录，哪些问题会在下一阶段触发实现任务，哪些问题必须先发起 `plan patch` 或 `contract change request`。

## 当前轮次范围

- 只读审查范围：
  - `apps/web/**`
  - `apps/admin/**`
  - `apps/server/**`
  - `packages/config/**`
  - `packages/db/**`
  - `packages/http-client/**`
  - `packages/schemas/**`
  - `packages/shared/**`
  - `scripts/**`
  - `package.json`
  - `README.md`
  - `.env.example`
- 可写路径：
  - `docs/review/**`
  - `docs/tasks/**`
  - `docs/plans/**`
- 本轮交付物：
  - `docs/review/2026-04-19-full-repo-audit-baseline.md`
  - `docs/review/2026-04-19-full-repo-architecture-audit.md`
  - `docs/review/2026-04-19-full-repo-dataflow-audit.md`
  - `docs/review/2026-04-19-full-repo-performance-audit.md`
  - `docs/review/2026-04-19-full-repo-quality-delivery-audit.md`
  - `docs/review/2026-04-19-full-repo-audit-report.md`
  - `docs/review/2026-04-19-full-repo-optimization-roadmap.md`
- 本轮明确不做：
  - 不直接修改业务代码、测试代码、数据库结构、迁移、seed、共享契约、环境变量、根脚本。
  - 不为“顺手修复”突破只读边界。
  - 不在证据不足时输出伪确定性结论。

## 完成标准

- 基线文档、4 条审查泳道文档、总报告、路线图全部落盘。
- 所有关键结论都带证据路径；无法由仓内证据证明的内容必须标注为“推断”。
- 路线图中明确：
  - `P0 / P1 / P2` 优先级
  - 并行与串行关系
  - `must_tdd / can_direct_dev / needs_ddd_first`
  - 会触发下一阶段实现任务的确认问题
  - 会触发 `plan patch / contract change request` 的确认问题
- 全程满足当前阶段“代码只读、文档可写”的约束。

## 是否需要先查阅 repo_explorer / docs_researcher

- `repo_explorer`：建议先执行一次，只读输出仓库入口、依赖方向、热点路径、共享边界索引，作为 `TASK-FRAO-001` 的输入；若主会话已有等效索引，可跳过。
- `docs_researcher`：本轮默认不需要。只有当某个工具链行为、框架约束或脚本语义影响问题归类，且仓库内证据不足时，才追加只读研究；研究结果不能替代仓库证据。

## 执行代理分工

- `orchestrator`
  - 负责 `TASK-FRAO-001` 基线与文档骨架。
  - 负责 `TASK-FRAO-006` 总报告与路线图汇总。
  - 负责 `TASK-FRAO-007` 计划补丁/契约变更/主会话澄清登记。
- `backend_implementer`
  - 负责 `TASK-FRAO-002` 架构与模块边界审查。
  - 负责 `TASK-FRAO-005` 测试、工程质量与交付风险审查。
- `backend_service_worker`
  - 负责 `TASK-FRAO-003` 算法与关键数据流审查。
- `frontend_implementer`
  - 负责 `TASK-FRAO-004` 性能与扩展性审查。
- `review_qa`
  - 本轮不是强制环节。
  - 如主会话希望在进入下一阶段前再做一次一致性检查，可在 `TASK-FRAO-006` 完成后追加，只审报告、路线图、证据链与追踪矩阵，不审业务代码。

## 共享区域改动归属

- `docs/review/2026-04-19-full-repo-audit-baseline.md`
  - 唯一责任方：`orchestrator`
- `docs/review/2026-04-19-full-repo-architecture-audit.md`
  - 唯一责任方：`backend_implementer`
- `docs/review/2026-04-19-full-repo-dataflow-audit.md`
  - 唯一责任方：`backend_service_worker`
- `docs/review/2026-04-19-full-repo-performance-audit.md`
  - 唯一责任方：`frontend_implementer`
- `docs/review/2026-04-19-full-repo-quality-delivery-audit.md`
  - 唯一责任方：`backend_implementer`
- `docs/review/2026-04-19-full-repo-audit-report.md`
  - 唯一责任方：`orchestrator`
- `docs/review/2026-04-19-full-repo-optimization-roadmap.md`
  - 唯一责任方：`orchestrator`
- `docs/plans/**` 与 `docs/tasks/**` 中的补丁登记
  - 唯一责任方：`orchestrator`
- 禁止事项：
  - 任一并行泳道不得编辑别人的审查文档。
  - 任一并行泳道不得改写共享契约、根配置、数据库结构、路由入口、全局请求客户端。

## 并行 / 串行策略

1. 串行启动 `TASK-FRAO-001`。
   - 统一证据口径、严重级别、推断标记规则、路线图分层标准。
   - 创建审查文档骨架，避免并行任务争用共享文件。
2. `TASK-FRAO-001` 完成后，开启 4 条并行只读审查泳道。
   - `TASK-FRAO-002` 架构与模块边界
   - `TASK-FRAO-003` 算法与关键数据流
   - `TASK-FRAO-004` 性能与扩展性
   - `TASK-FRAO-005` 测试、工程质量与交付风险
3. `TASK-FRAO-007` 条件触发。
   - 任一泳道发现越界问题、共享契约争议、需求冲突、外部依赖缺口时，立即登记，不等待并行泳道结束。
4. 串行执行 `TASK-FRAO-006`。
   - 只有在 4 条泳道完成且 `TASK-FRAO-007` 已同步后，才能汇总总报告与路线图。
5. 可选追加 `review_qa`。
   - 仅对报告、路线图与计划追踪一致性做审查。

## 风险提醒

- 最大风险不是“漏掉一个风格问题”，而是误把共享边界问题写成可以直接落地的局部修复。
- 架构与数据流泳道最容易出现“由现象倒推设计”的误判；必须把“已证实”与“推断”分栏。
- 性能泳道最容易在缺少运行指标时过度下结论；任何依赖线上指标、压测或真实流量的判断都必须显式标注前提。
- 质量与交付泳道最容易越界到根脚本、环境变量、OpenAPI、CORS 直接修订；本轮一律只登记，不改。
- 汇总阶段如果把未确认问题列为 `P0`，会直接污染下一轮实现顺序；`P0` 只能放已被仓内证据充分支持、且对交付风险或系统正确性有直接影响的问题。

## 实现者交接信息

- 所有子代理必须先输出 `Execution Acknowledgement`，确认只读范围、可写文档路径、禁止修改区域。
- 审查文档中的每条问题至少包含：
  - 问题摘要
  - 严重级别
  - 影响面
  - 证据路径
  - 处理建议
  - 分类标签：`confirmed` 或 `inferred`
  - 下一阶段归类：`must_tdd`、`can_direct_dev`、`needs_ddd_first`、`plan_patch_required`
- 若发现必须跨 `apps/*` 与 `packages/*` 协调的事实冲突，先登记 `TASK-FRAO-007`，再继续审查，不得自行补齐方案。
- 若需要运行命令收集证据，只允许读取型命令或不产生提交副作用的验证命令；任何会改写仓库的命令都禁止。

## 计划补丁 / 契约变更触发条件

- 触发 `plan patch`：
  - 已确认问题超出本轮“代码只读、文档可写”边界。
  - 已确认问题必须调整任务拆分、优先级或泳道归属。
  - 已确认问题需要新增“先测量/先建基线/先做 DDD”前置任务。
- 触发 `contract change request`：
  - 已确认共享类型、请求/响应结构、路由常量、全局 HTTP client 语义漂移。
  - 已确认数据库 schema、迁移语义、seed 语义、仓储接口需要调整。
  - 已确认环境变量、CORS、OpenAPI 暴露策略、根脚本语义需要调整。
- 触发主会话澄清：
  - 需求文档与仓库事实冲突，且仓内证据无法判定以谁为准。
  - 路线图优先级依赖业务目标取舍，而非技术证据可以单独决定。

## 下一阶段触发实现任务的确认问题

- 一旦确认，将在下一阶段直接拆实现任务：
  - 共享契约重复定义、跨 app 漂移、调用方各自兜底不一致。
  - 核心业务规则散落在 route/page/util，导致状态转换、权限或计算口径不可追踪。
  - 可由仓内证据明确定位的性能瓶颈，例如 N+1、重复请求、无效渲染、明显热路径串行 I/O。
  - 测试链路断层、脚本入口失真、文档与实现长期偏离、可复现的交付阻塞点。
- 一旦确认，将先触发 `plan patch` 再进入下一阶段：
  - 需要改共享包、数据库、环境变量、OpenAPI/CORS、根脚本或跨应用约束。
  - 需要先补监控/基准/压测/埋点，仓内无法单靠静态审查给出可靠优先级。
  - 需要先做 DDD 重新定义聚合边界、状态机或权限模型。

## 推荐的下一步

1. 由主会话先执行 `TASK-FRAO-001`，建立统一证据模板与文档骨架。
2. 并行 spawn `TASK-FRAO-002` 至 `TASK-FRAO-005`，全部限制为只读审查泳道。
3. 审查过程中实时消费 `TASK-FRAO-007`，不要把越界问题拖到汇总阶段再补录。
4. 完成 `TASK-FRAO-006` 后，再决定是否追加一次 `review_qa` 文档审查。
5. 只有在总报告与路线图被确认后，才把 `must_tdd / can_direct_dev / needs_ddd_first / plan_patch_required` 转换为下一阶段实现任务。

## Execution Packet

### task_id
TASK-FRAO-001

### task_name
建立全仓审查基线、证据模板与输出骨架

### owner
orchestrator

### objective
建立本轮统一的审查口径、文档骨架和只读边界，为并行审查泳道提供一致输入。

### in_scope
- 创建或完善 `docs/review/2026-04-19-full-repo-audit-baseline.md`
- 明确严重级别、证据引用格式、推断标记规则、路线图优先级规则
- 创建后续 6 份 `docs/review/**` 文档骨架
- 在基线文档中写明当前阶段代码只读、文档可写

### out_of_scope
- 不审查业务问题本身
- 不修改 `apps/**`、`packages/**`、根配置、环境变量、脚本
- 不提前写最终路线图结论

### input_documents
- requirements: `docs/requirements/2026-04-19-full-repo-audit-and-optimization-roadmap-requirements.md`
- tasks: `docs/tasks/2026-04-19-full-repo-audit-and-optimization-roadmap-tasks.md`
- plan: `docs/plans/2026-04-19-full-repo-audit-and-optimization-roadmap-plan.md`
- analysis/research: `repo_explorer` 输出，如有

### allowed_paths
- `docs/review/2026-04-19-full-repo-audit-baseline.md`
- `docs/review/2026-04-19-full-repo-architecture-audit.md`
- `docs/review/2026-04-19-full-repo-dataflow-audit.md`
- `docs/review/2026-04-19-full-repo-performance-audit.md`
- `docs/review/2026-04-19-full-repo-quality-delivery-audit.md`
- `docs/review/2026-04-19-full-repo-audit-report.md`
- `docs/review/2026-04-19-full-repo-optimization-roadmap.md`
- `docs/plans/2026-04-19-full-repo-audit-and-optimization-roadmap-plan.md`

### forbidden_paths
- `apps/**`
- `packages/**`
- `scripts/**`
- `package.json`
- `README.md`
- `.env.example`

### dependencies
- 需求文档中的审查范围与成功标准
- 任务文档中的任务编号、只读边界、DDD/TDD 分类

### acceptance_criteria
- 基线文档已定义统一证据模板与分类口径
- 审查文档骨架已建立且责任分离明确
- 已明文写出“当前阶段代码只读、文档可写”

### test_strategy
manual_only

### handoff_notes
- 后续泳道必须复用本任务定义的证据格式，不得各写各的模板
- 若并行泳道认为模板不够用，先登记 `TASK-FRAO-007`

### escalation_rule
如需调整共享文档归属、任务边界或只读范围，必须先回编排者登记 `plan patch`，不得自行扩权。

## Execution Packet

### task_id
TASK-FRAO-002

### task_name
全仓架构与模块边界审查

### owner
backend_implementer

### objective
识别 monorepo 依赖方向、共享边界、职责穿透与热点模块问题，并输出证据化架构审查文档。

### in_scope
- 只读审查 `apps/web/**`、`apps/admin/**`、`apps/server/**`、`packages/**`
- 输出 `docs/review/2026-04-19-full-repo-architecture-audit.md`
- 标注共享契约、路由常量、数据库层、应用层的边界漂移
- 标注哪些问题需要 `needs_ddd_first` 或 `plan_patch_required`

### out_of_scope
- 不修改任何代码或配置
- 不直接重定义共享契约或模块归属
- 不写最终优先级路线图

### input_documents
- requirements: `docs/requirements/2026-04-19-full-repo-audit-and-optimization-roadmap-requirements.md`
- tasks: `docs/tasks/2026-04-19-full-repo-audit-and-optimization-roadmap-tasks.md`
- plan: `docs/plans/2026-04-19-full-repo-audit-and-optimization-roadmap-plan.md`
- analysis/research: `docs/review/2026-04-19-full-repo-audit-baseline.md`

### allowed_paths
- `docs/review/2026-04-19-full-repo-architecture-audit.md`

### forbidden_paths
- `docs/review/2026-04-19-full-repo-dataflow-audit.md`
- `docs/review/2026-04-19-full-repo-performance-audit.md`
- `docs/review/2026-04-19-full-repo-quality-delivery-audit.md`
- `docs/review/2026-04-19-full-repo-audit-report.md`
- `docs/review/2026-04-19-full-repo-optimization-roadmap.md`
- `apps/**`
- `packages/**`
- `scripts/**`
- `package.json`
- `README.md`
- `.env.example`

### dependencies
- `TASK-FRAO-001` 输出的基线模板
- 根 `AGENTS.md` 中共享协议、数据库、环境变量边界规则

### acceptance_criteria
- 文档覆盖依赖方向、模块边界、共享契约落点、热点文件与重复实现
- 每条问题都带严重级别、影响面、证据路径、处理建议、确认/推断标签
- 明确哪些问题会触发 `needs_ddd_first` 或 `plan_patch_required`

### test_strategy
evidence_review

### handoff_notes
- 若发现共享类型或接口语义漂移，只登记事实与影响，不得给出未验证的重构方案
- 汇总阶段需要直接消费本任务的下一阶段分类结论

### escalation_rule
如确认问题需要修改共享包、数据库、环境变量、根配置或跨应用入口，立即登记 `TASK-FRAO-007`，不得继续把该问题描述成局部修复。

## Execution Packet

### task_id
TASK-FRAO-003

### task_name
算法与关键数据流审查

### owner
backend_service_worker

### objective
识别关键业务链路中的规则分散、状态变化、重复计算与高风险数据流问题，并输出证据化审查文档。

### in_scope
- 只读审查真实存在的关键链路，不虚构不存在的算法模块
- 输出 `docs/review/2026-04-19-full-repo-dataflow-audit.md`
- 对每条链路写明输入、规则落点、跨层调用路径、状态变化点、重复计算点
- 标注 `must_tdd`、`needs_ddd_first`、`plan_patch_required`

### out_of_scope
- 不修改 route、service、page、util、schema、client 代码
- 不把线上表现猜测写成已证实事实
- 不在仓库证据不足时直接下业务结论

### input_documents
- requirements: `docs/requirements/2026-04-19-full-repo-audit-and-optimization-roadmap-requirements.md`
- tasks: `docs/tasks/2026-04-19-full-repo-audit-and-optimization-roadmap-tasks.md`
- plan: `docs/plans/2026-04-19-full-repo-audit-and-optimization-roadmap-plan.md`
- analysis/research: `docs/review/2026-04-19-full-repo-audit-baseline.md`

### allowed_paths
- `docs/review/2026-04-19-full-repo-dataflow-audit.md`

### forbidden_paths
- `docs/review/2026-04-19-full-repo-architecture-audit.md`
- `docs/review/2026-04-19-full-repo-performance-audit.md`
- `docs/review/2026-04-19-full-repo-quality-delivery-audit.md`
- `docs/review/2026-04-19-full-repo-audit-report.md`
- `docs/review/2026-04-19-full-repo-optimization-roadmap.md`
- `apps/**`
- `packages/**`
- `scripts/**`
- `package.json`
- `README.md`
- `.env.example`

### dependencies
- `TASK-FRAO-001` 输出的基线模板
- `packages/http-client/**`、`packages/schemas/**`、`packages/shared/**` 的只读上下文

### acceptance_criteria
- 文档只覆盖仓内已识别的真实链路，并明确“不存在”与“未审到”的边界
- 每条问题都带严重级别、影响面、证据路径、处理建议、确认/推断标签
- 明确下一阶段哪些问题必须 `must_tdd`，哪些必须 `needs_ddd_first`

### test_strategy
evidence_review

### handoff_notes
- 若链路涉及权限、状态机、审批、幂等、重试、统计口径，优先按高风险问题记录
- 汇总阶段应优先消费本任务对实现顺序的约束，而不是只看严重级别

### escalation_rule
如确认问题需要先定义聚合边界、状态机、共享口径或跨模块一致性，立即登记 `TASK-FRAO-007`，不得直接给出实现承诺。

## Execution Packet

### task_id
TASK-FRAO-004

### task_name
性能与扩展性审查

### owner
frontend_implementer

### objective
识别可由仓内证据支撑的性能与扩展性风险，并区分可直接优化、需补测量、需跨模块协同三类问题。

### in_scope
- 只读审查前端请求/渲染/打包与后端 I/O/查询模式的静态证据
- 输出 `docs/review/2026-04-19-full-repo-performance-audit.md`
- 将问题分成“可快速验证的小改”“需基准后再动手”“需跨模块协同”
- 标注哪些问题属于推断，哪些问题可直接进入下一阶段实现

### out_of_scope
- 不引入 profiling、埋点、压测或构建脚本改造
- 不修改任何业务代码、配置、脚本
- 不把缺失指标的判断写成确定事实

### input_documents
- requirements: `docs/requirements/2026-04-19-full-repo-audit-and-optimization-roadmap-requirements.md`
- tasks: `docs/tasks/2026-04-19-full-repo-audit-and-optimization-roadmap-tasks.md`
- plan: `docs/plans/2026-04-19-full-repo-audit-and-optimization-roadmap-plan.md`
- analysis/research: `docs/review/2026-04-19-full-repo-audit-baseline.md`

### allowed_paths
- `docs/review/2026-04-19-full-repo-performance-audit.md`

### forbidden_paths
- `docs/review/2026-04-19-full-repo-architecture-audit.md`
- `docs/review/2026-04-19-full-repo-dataflow-audit.md`
- `docs/review/2026-04-19-full-repo-quality-delivery-audit.md`
- `docs/review/2026-04-19-full-repo-audit-report.md`
- `docs/review/2026-04-19-full-repo-optimization-roadmap.md`
- `apps/**`
- `packages/**`
- `scripts/**`
- `package.json`
- `README.md`
- `.env.example`

### dependencies
- `TASK-FRAO-001` 输出的基线模板
- 仓内可见的打包、测试、日志、请求调用路径

### acceptance_criteria
- 文档区分已证实问题与依赖外部指标的推断问题
- 每条问题都带影响链路、证据路径、预期收益、前置条件、确认/推断标签
- 已明确三类后续处理方式：直接实现、补测量、跨模块协调

### test_strategy
evidence_review

### handoff_notes
- 下一阶段不得直接消费“需基准后再动手”类问题，除非先补前置测量任务
- 汇总时若某问题涉及共享契约或数据库语义，优先转 `plan_patch_required`

### escalation_rule
如确认性能问题的修复依赖共享契约、数据库、环境变量、根脚本或外部基准，立即登记 `TASK-FRAO-007`。

## Execution Packet

### task_id
TASK-FRAO-005

### task_name
测试、工程质量与交付风险审查

### owner
backend_implementer

### objective
识别测试断层、脚本/文档偏移、环境约束与交付阻塞点，并输出可直接支撑路线图分层的审查文档。

### in_scope
- 只读审查测试分层、lint/typecheck/test/build 链路、根脚本、环境变量文档、OpenAPI/CORS 风险
- 输出 `docs/review/2026-04-19-full-repo-quality-delivery-audit.md`
- 明确哪些问题只是记录项，哪些问题会阻塞下一阶段优化落地
- 标注哪些问题下一阶段应 `must_tdd`，哪些可 `can_direct_dev`

### out_of_scope
- 不修改脚本、配置、文档、环境变量或任何代码
- 不在无证据时泛化成“测试不足”或“文档不好”
- 不直接修复 OpenAPI/CORS/环境变量问题

### input_documents
- requirements: `docs/requirements/2026-04-19-full-repo-audit-and-optimization-roadmap-requirements.md`
- tasks: `docs/tasks/2026-04-19-full-repo-audit-and-optimization-roadmap-tasks.md`
- plan: `docs/plans/2026-04-19-full-repo-audit-and-optimization-roadmap-plan.md`
- analysis/research: `docs/review/2026-04-19-full-repo-audit-baseline.md`

### allowed_paths
- `docs/review/2026-04-19-full-repo-quality-delivery-audit.md`

### forbidden_paths
- `docs/review/2026-04-19-full-repo-architecture-audit.md`
- `docs/review/2026-04-19-full-repo-dataflow-audit.md`
- `docs/review/2026-04-19-full-repo-performance-audit.md`
- `docs/review/2026-04-19-full-repo-audit-report.md`
- `docs/review/2026-04-19-full-repo-optimization-roadmap.md`
- `apps/**`
- `packages/**`
- `scripts/**`
- `package.json`
- `README.md`
- `.env.example`

### dependencies
- `TASK-FRAO-001` 输出的基线模板
- 根 `AGENTS.md` 中数据库、环境变量、CORS、OpenAPI、收尾验证规则

### acceptance_criteria
- 文档覆盖测试分层、脚本链路、文档一致性、环境约束、OpenAPI/CORS 风险、交付阻塞点
- 每条问题都带严重级别、失效模式、证据路径、处理建议、确认/推断标签
- 已明确哪些问题阻塞下一阶段优化，哪些仅为记录项

### test_strategy
evidence_review

### handoff_notes
- 下一阶段若要处理根脚本、环境变量、OpenAPI/CORS，必须先经 `TASK-FRAO-007`
- 汇总阶段需要直接消费“阻塞/非阻塞”与 `must_tdd / can_direct_dev` 分类

### escalation_rule
如确认问题需要改根脚本、环境变量、OpenAPI、CORS、README 或跨应用验证链路，立即登记 `TASK-FRAO-007`。

## Execution Packet

### task_id
TASK-FRAO-006

### task_name
汇总全仓审查报告与优化路线图

### owner
orchestrator

### objective
将各只读审查泳道的证据化结论收敛为总报告与分阶段路线图，且不引入未经确认的新问题。

### in_scope
- 汇总 `TASK-FRAO-002` 至 `TASK-FRAO-005` 的审查结果
- 产出 `docs/review/2026-04-19-full-repo-audit-report.md`
- 产出 `docs/review/2026-04-19-full-repo-optimization-roadmap.md`
- 消费 `TASK-FRAO-007` 中的条件触发记录
- 为下一阶段输出 `must_tdd / can_direct_dev / needs_ddd_first / plan_patch_required` 分类

### out_of_scope
- 不新增未经泳道证据支持的问题
- 不直接修改业务代码、配置、共享契约、脚本
- 不绕过 `TASK-FRAO-007` 处理越界事项

### input_documents
- requirements: `docs/requirements/2026-04-19-full-repo-audit-and-optimization-roadmap-requirements.md`
- tasks: `docs/tasks/2026-04-19-full-repo-audit-and-optimization-roadmap-tasks.md`
- plan: `docs/plans/2026-04-19-full-repo-audit-and-optimization-roadmap-plan.md`
- analysis/research:
  - `docs/review/2026-04-19-full-repo-audit-baseline.md`
  - `docs/review/2026-04-19-full-repo-architecture-audit.md`
  - `docs/review/2026-04-19-full-repo-dataflow-audit.md`
  - `docs/review/2026-04-19-full-repo-performance-audit.md`
  - `docs/review/2026-04-19-full-repo-quality-delivery-audit.md`

### allowed_paths
- `docs/review/2026-04-19-full-repo-audit-report.md`
- `docs/review/2026-04-19-full-repo-optimization-roadmap.md`
- `docs/plans/2026-04-19-full-repo-audit-and-optimization-roadmap-plan.md`

### forbidden_paths
- `docs/review/2026-04-19-full-repo-architecture-audit.md`
- `docs/review/2026-04-19-full-repo-dataflow-audit.md`
- `docs/review/2026-04-19-full-repo-performance-audit.md`
- `docs/review/2026-04-19-full-repo-quality-delivery-audit.md`
- `apps/**`
- `packages/**`
- `scripts/**`
- `package.json`
- `README.md`
- `.env.example`

### dependencies
- `TASK-FRAO-002` 至 `TASK-FRAO-005` 的完成文档
- `TASK-FRAO-007` 的登记项

### acceptance_criteria
- 总报告覆盖范围、方法、问题清单、证据路径、处理建议、明确不处理项
- 路线图覆盖优先级、顺序、并行关系、前置条件、下一阶段任务分类
- 明文写出“当前阶段不做大规模代码修改”

### test_strategy
plan_only

### handoff_notes
- 若总报告与单泳道结论冲突，以单泳道证据文档为准，先修正汇总，不得私自覆盖源结论
- 进入下一阶段前，应由主会话确认路线图优先级与补丁触发项

### escalation_rule
如汇总时发现任务边界、共享归属或优先级需要重排，先登记 `TASK-FRAO-007` 或更新本计划，不得直接在路线图中偷换范围。

## Execution Packet

### task_id
TASK-FRAO-007

### task_name
计划补丁 / 契约变更 / 主会话澄清登记

### owner
orchestrator

### objective
接收各泳道的越界事项与争议项，形成后续可追踪的补丁、契约变更或主会话澄清入口。

### in_scope
- 登记 `plan patch`
- 登记 `contract change request`
- 登记需回主会话澄清的问题
- 记录来源任务、影响路径、阻塞性、建议 owner、建议验证方式

### out_of_scope
- 不直接实现任何登记事项
- 不替代主会话做需求裁决
- 不把“待补证据”包装为已确认结论

### input_documents
- requirements: `docs/requirements/2026-04-19-full-repo-audit-and-optimization-roadmap-requirements.md`
- tasks: `docs/tasks/2026-04-19-full-repo-audit-and-optimization-roadmap-tasks.md`
- plan: `docs/plans/2026-04-19-full-repo-audit-and-optimization-roadmap-plan.md`
- analysis/research: `docs/review/2026-04-19-full-repo-audit-baseline.md`

### allowed_paths
- `docs/plans/2026-04-19-full-repo-audit-and-optimization-roadmap-plan.md`
- `docs/tasks/2026-04-19-full-repo-audit-and-optimization-roadmap-tasks.md`
- `docs/review/2026-04-19-full-repo-audit-report.md`
- `docs/review/2026-04-19-full-repo-optimization-roadmap.md`

### forbidden_paths
- `apps/**`
- `packages/**`
- `scripts/**`
- `package.json`
- `README.md`
- `.env.example`

### dependencies
- `TASK-FRAO-002` 至 `TASK-FRAO-005` 的触发记录
- 主会话对越界问题的后续裁决

### acceptance_criteria
- 每个越界事项都有来源任务、问题摘要、影响路径、阻塞性、建议 owner、建议验证方式
- 已区分 `plan patch`、`contract change request`、`needs_main_session_clarification`
- 汇总阶段可直接消费这些登记项

### test_strategy
plan_only

### handoff_notes
- 登记项是下一阶段的入口，不是当前阶段的实现承诺
- 若登记项阻塞路线图排序，必须在总报告中显式列出

### escalation_rule
如登记项本身需要重定义当前轮次目标或范围，立即回主会话，不得继续按原计划推进。
