# 2026-04-19 全仓审查报告与优化路线图任务拆解

## 需求文档路径

- `docs/requirements/2026-04-19-full-repo-audit-and-optimization-roadmap-requirements.md`

## 任务概览

- 本轮目标是产出“全仓审查报告”与“优化路线图”，不在同一轮做大规模代码改造。
- 审查范围覆盖 `apps/web`、`apps/admin`、`apps/server`、`packages/config`、`packages/db`、`packages/http-client`、`packages/schemas`、`packages/shared`，以及与其直接相关的根脚本、根配置与文档。
- 当前阶段默认代码路径只读，写权限仅限 `docs/review/**`、`docs/tasks/**`、`docs/plans/**`。
- 所有审查结论都必须落到仓库内证据路径；无法由仓库证明的内容必须标注为“推断”。
- planner 应按“先基线、再分维度审查、最后汇总路线图”的方式编排，不得跳过审查直接进入实现。

## 任务分解列表

### TASK-FRAO-001

- 任务名：建立全仓审查基线、证据模板与输出骨架
- 类型：共享 / 审查流程
- 优先级：P0
- 完成标准：
  - 建立本轮统一的审查口径，至少包含：问题严重度等级、证据引用规则、推断标记规则、P0/P1/P2 路线图分层规则。
  - 建立后续产物骨架，至少预留以下文档：
    - `docs/review/2026-04-19-full-repo-audit-baseline.md`
    - `docs/review/2026-04-19-full-repo-architecture-audit.md`
    - `docs/review/2026-04-19-full-repo-dataflow-audit.md`
    - `docs/review/2026-04-19-full-repo-performance-audit.md`
    - `docs/review/2026-04-19-full-repo-quality-delivery-audit.md`
    - `docs/review/2026-04-19-full-repo-audit-report.md`
    - `docs/review/2026-04-19-full-repo-optimization-roadmap.md`
  - 明确本轮只读审查路径、可写文档路径、共享边界升级条件和回退主会话澄清条件。
- DDD 分类：`supporting`
- test_strategy：`manual_only`
- 风险任务：否
- 并行 / 串行关系：必须最先完成；`TASK-FRAO-002` 至 `TASK-FRAO-005` 全部依赖本任务。
- 文件所有权 / 允许修改路径 / 禁止事项：
  - 文件所有权：主会话统一维护 `docs/tasks/**` 与本轮新增 `docs/review/**` 骨架。
  - 允许修改路径：`docs/tasks/**`、`docs/review/**`、`docs/plans/**`
  - 审查只读路径：`apps/**`、`packages/**`、`scripts/**`、`package.json`、`README.md`、`.env.example`
  - 禁止事项：不得改业务代码、不得改 schema / env / seed / migrate / OpenAPI 行为、不得先写路线图结论再补证据

### TASK-FRAO-002

- 任务名：全仓架构与模块边界审查
- 类型：审查 / 架构
- 优先级：P0
- 完成标准：
  - 形成 `docs/review/2026-04-19-full-repo-architecture-audit.md`。
  - 覆盖 monorepo 依赖方向、`apps/*` 与 `packages/*` 职责边界、共享契约落点、热点文件、重复实现、职责穿透与边界漂移。
  - 对每个确认问题给出：严重度、影响面、证据路径、建议处理方向、是否需要 `plan patch` / `contract change request`。
  - 识别需要先做 DDD 设计再动手的区域，并给出触发原因；未达到 DDD 触发条件的问题不得强行上升为 DDD。
- DDD 分类：`ddd_assessment`
- test_strategy：`evidence_review`
- 风险任务：是
- 并行 / 串行关系：
  - 串行依赖 `TASK-FRAO-001`
  - 可与 `TASK-FRAO-003`、`TASK-FRAO-004`、`TASK-FRAO-005` 并行
  - 若发现跨模块边界争议，需先登记到 `TASK-FRAO-007`，再继续本任务
- 文件所有权 / 允许修改路径 / 禁止事项：
  - 文件所有权：架构审查子任务 owner 仅拥有架构审查文档写权限
  - 允许修改路径：`docs/review/2026-04-19-full-repo-architecture-audit.md`
  - 审查只读路径：`apps/web/**`、`apps/admin/**`、`apps/server/**`、`packages/**`、根 `package.json`、根 `README.md`
  - 禁止事项：不得为证明边界问题而直接改代码；不得在 `apps/*` 重复定义本应属于 `packages/*` 的共享结构；不得跳过证据给出抽象“建议优化架构”

### TASK-FRAO-003

- 任务名：算法与关键数据流审查
- 类型：审查 / 业务链路
- 优先级：P0
- 完成标准：
  - 形成 `docs/review/2026-04-19-full-repo-dataflow-audit.md`。
  - 识别仓库内真实存在的关键链路，至少覆盖排序 / 聚合 / 推荐 / 搜索 / 审核 / 消息 / 发布等高复杂度流程中实际存在的部分，并明确“不存在”与“未审到”的边界。
  - 对每条关键链路给出输入、核心规则所在位置、跨层调用路径、状态变化点、重复计算点、潜在错误激励或冷启动风险。
  - 对每个确认问题给出：严重度、影响面、证据路径、建议处理方向、是否必须 TDD、是否需要 DDD 先行。
- DDD 分类：`ddd_assessment`
- test_strategy：`evidence_review`
- 风险任务：是
- 并行 / 串行关系：
  - 串行依赖 `TASK-FRAO-001`
  - 可与 `TASK-FRAO-002`、`TASK-FRAO-004`、`TASK-FRAO-005` 并行
  - 若链路规则横跨多个聚合或状态机不清晰，需联动 `TASK-FRAO-007` 登记升级入口
- 文件所有权 / 允许修改路径 / 禁止事项：
  - 文件所有权：数据流审查子任务 owner 仅拥有数据流审查文档写权限
  - 允许修改路径：`docs/review/2026-04-19-full-repo-dataflow-audit.md`
  - 审查只读路径：`apps/web/**`、`apps/admin/**`、`apps/server/**`、`packages/http-client/**`、`packages/schemas/**`、`packages/shared/**`
  - 禁止事项：不得臆造仓库中不存在的算法链路；不得把“猜测中的线上表现”写成事实；不得为了补结论而临时扩展到仓库外系统

### TASK-FRAO-004

- 任务名：性能与扩展性审查
- 类型：审查 / 性能
- 优先级：P1
- 完成标准：
  - 形成 `docs/review/2026-04-19-full-repo-performance-audit.md`。
  - 覆盖 server 查询与 I/O 模式、前端请求扇出与渲染成本、构建与包体、seed / migrate / test / log 链路对开发与验证效率的影响。
  - 对每个确认问题给出：问题模式、影响链路、证据路径、预期收益、前置条件、是否依赖外部指标、是否属于“推断”。
  - 将性能问题区分为“可快速验证的小改”“需要基准补齐后再动手”“需要跨模块协调”的 3 类。
- DDD 分类：`supporting`
- test_strategy：`evidence_review`
- 风险任务：是
- 并行 / 串行关系：
  - 串行依赖 `TASK-FRAO-001`
  - 可与 `TASK-FRAO-002`、`TASK-FRAO-003`、`TASK-FRAO-005` 并行
  - 若优化前置依赖共享契约或 DB 语义调整，必须转 `TASK-FRAO-007`
- 文件所有权 / 允许修改路径 / 禁止事项：
  - 文件所有权：性能审查子任务 owner 仅拥有性能审查文档写权限
  - 允许修改路径：`docs/review/2026-04-19-full-repo-performance-audit.md`
  - 审查只读路径：`apps/**`、`packages/**`、`scripts/**`、`package.json`、`vitest.config.ts`、`playwright.config.ts`
  - 禁止事项：不得在本轮引入 profiling 基础设施重构；不得无证据地下结论“性能差”；不得把需要真实线上指标支撑的问题伪装成已证实事实

### TASK-FRAO-005

- 任务名：测试、工程质量与交付风险审查
- 类型：审查 / 工程质量
- 优先级：P0
- 完成标准：
  - 形成 `docs/review/2026-04-19-full-repo-quality-delivery-audit.md`。
  - 覆盖测试分层与覆盖断层、lint / typecheck / test / build 链路、脚本漂移、文档一致性、环境变量约束、OpenAPI / CORS 暴露风险、可维护性热点与交付阻塞点。
  - 对每个确认问题给出：严重度、复现或证据路径、失败模式、建议修复顺序、是否必须 TDD、是否可直接开发。
  - 明确哪些问题只是“审查记录”，哪些问题会阻塞后续优化落地。
- DDD 分类：`supporting`
- test_strategy：`evidence_review`
- 风险任务：是
- 并行 / 串行关系：
  - 串行依赖 `TASK-FRAO-001`
  - 可与 `TASK-FRAO-002`、`TASK-FRAO-003`、`TASK-FRAO-004` 并行
  - 若发现需求文档与真实实现不一致且影响范围无法在仓库内判定，需转 `TASK-FRAO-007`
- 文件所有权 / 允许修改路径 / 禁止事项：
  - 文件所有权：工程质量审查子任务 owner 仅拥有质量审查文档写权限
  - 允许修改路径：`docs/review/2026-04-19-full-repo-quality-delivery-audit.md`
  - 审查只读路径：根 `package.json`、`.env.example`、`README.md`、`apps/**/package.json`、`apps/**/tests/**`、`packages/**/tests/**`、`scripts/**`
  - 禁止事项：不得顺手修脚本或补 env；不得在没有证据时宣称“测试不足”；不得把代码风格偏好写成高优先级风险

### TASK-FRAO-006

- 任务名：汇总全仓审查报告与优化路线图
- 类型：共享 / 路线图
- 优先级：P0
- 完成标准：
  - 汇总 `TASK-FRAO-002` 至 `TASK-FRAO-005` 的审查结论，形成：
    - `docs/review/2026-04-19-full-repo-audit-report.md`
    - `docs/review/2026-04-19-full-repo-optimization-roadmap.md`
  - 审查报告至少包含：范围、方法、问题清单、严重度、影响面、证据路径、处理建议、明确不处理项。
  - 路线图至少包含：P0/P1/P2 分层、推荐执行顺序、并行与串行关系、DDD 先行任务、必须 TDD 的任务、可直接开发的任务、可能触发 `plan patch` / `contract change request` 的任务。
  - 路线图必须明确“当前阶段不做大规模代码修改”的边界，并给出下游 planner 可直接采用的任务序列。
- DDD 分类：`supporting`
- test_strategy：`plan_only`
- 风险任务：是
- 并行 / 串行关系：
  - 必须等待 `TASK-FRAO-002`、`TASK-FRAO-003`、`TASK-FRAO-004`、`TASK-FRAO-005` 完成后再执行
  - 可消费 `TASK-FRAO-007` 的条件触发记录
- 文件所有权 / 允许修改路径 / 禁止事项：
  - 文件所有权：主会话统一拥有汇总报告与路线图文档写权限
  - 允许修改路径：`docs/review/2026-04-19-full-repo-audit-report.md`、`docs/review/2026-04-19-full-repo-optimization-roadmap.md`
  - 审查只读路径：`docs/review/2026-04-19-full-repo-*-audit.md`、`apps/**`、`packages/**`、根配置与脚本
  - 禁止事项：不得把未经确认的问题写入路线图 P0；不得遗漏证据路径；不得把实现方案写成当前轮次的执行承诺

### TASK-FRAO-007

- 任务名：计划补丁 / 契约变更请求 / 主会话澄清回退登记
- 类型：共享 / 条件触发
- 优先级：P0（条件触发）
- 完成标准：
  - 当任一审查任务发现以下情况时，登记单独的补丁或澄清项：
    - 问题根因超出本轮只读审查边界
    - 需要修改共享契约、环境变量、数据库语义、OpenAPI 暴露策略或跨 app / package 一致性
    - 需求边界与真实代码冲突，且仓库内无法判定应以哪一方为准
  - 登记内容至少包含：来源任务、问题摘要、受影响路径、为什么不能在本轮直接实现、建议 owner、建议验证方式、是否阻塞路线图。
- DDD 分类：`supporting`
- test_strategy：`plan_only`
- 风险任务：是
- 并行 / 串行关系：由 `TASK-FRAO-002` 至 `TASK-FRAO-005` 条件触发，可并行登记；`TASK-FRAO-006` 汇总时必须消费这些登记项。
- 文件所有权 / 允许修改路径 / 禁止事项：
  - 文件所有权：主会话统一维护补丁与澄清登记文档
  - 允许修改路径：`docs/plans/**`、`docs/tasks/**`、`docs/review/**`
  - 审查只读路径：`apps/**`、`packages/**`、根配置与脚本
  - 禁止事项：不得借补丁登记直接落代码；不得把“待补充证据”伪装成已确认结论；不得绕过主会话自行补完未确认范围

## DDD 分类

- `ddd_assessment`
  - `TASK-FRAO-002`
  - `TASK-FRAO-003`
- `supporting`
  - `TASK-FRAO-001`
  - `TASK-FRAO-004`
  - `TASK-FRAO-005`
  - `TASK-FRAO-006`
  - `TASK-FRAO-007`
- DDD 升级触发条件：
  - 核心业务规则复杂且分散
  - 状态转换复杂
  - 权限 / 配额 / 计费 / 审批规则集中
  - 聚合边界清晰且一个问题影响多个业务对象一致性
  - 修复必须跨 `apps/*` 与 `packages/*` 才能成立

## TDD 与直接开发分类

- 本轮任务本身均为审查 / 文档任务，不以代码实现为目标，因此无“当前轮次必须 TDD 的实现任务”。
- 本轮各审查任务必须在产物中标出下游实现分类：
  - `must_tdd`
    - 核心业务规则
    - 权限验证
    - 资金 / 配额 / 统计
    - 幂等性 / 重试 / 故障恢复
    - 状态机 / 状态转换
    - 高风险接口契约
    - 可复现 Bug
  - `can_direct_dev`
    - 文档与实现对齐
    - 不改变业务语义的脚本 / 构建入口修正
    - 局部重复逻辑收敛且有明确验证路径
    - 不涉及共享契约、状态机、权限或统计口径的低风险结构整理
  - `needs_ddd_first`
    - 涉及跨聚合一致性、审批 / 审核规则集中、复杂状态转移、共享边界重划分的问题
- `test_strategy` 对应关系：
  - `manual_only`：文档骨架与规则建立，仅做人工核对
  - `evidence_review`：以证据完整性、路径可追溯性和结论一致性为验证手段
  - `plan_only`：只产出路线图、补丁登记与执行分类，不落实现

## 风险任务

- `TASK-FRAO-002`：最容易发现跨 app / package 边界问题，若处理不当会把本轮文档任务误扩成共享重构。
- `TASK-FRAO-003`：算法与数据流问题最容易夹杂推断，必须严格区分“证实”与“推断”。
- `TASK-FRAO-004`：性能结论如果没有证据或缺少上下文，很容易误导后续优化优先级。
- `TASK-FRAO-005`：工程质量问题可能牵涉根脚本、环境变量、文档和 OpenAPI / CORS 策略，越界风险高。
- `TASK-FRAO-006`：路线图一旦错误分级，会直接误导 planner 的执行顺序。
- `TASK-FRAO-007`：如果补丁与澄清入口缺失，执行阶段极易发生 scope creep 或错误吸收共享修改。

## 文件所有权和共享路径提醒

- 本轮可写路径仅限：
  - `docs/review/**`
  - `docs/tasks/**`
  - `docs/plans/**`
- 本轮默认只读路径：
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
- 共享路径风险提醒：
  - 发现共享协议漂移时，不得在 `apps/*` 本地复制类型或常量绕过 `packages/*`
  - 发现 DB / env / OpenAPI / CORS 风险时，不得在本轮直接修改，必须先登记 `TASK-FRAO-007`
  - 发现需求边界不清时，必须回退主会话澄清，不得自行补全范围
- 文件所有权提醒：
  - 审查子任务只拥有各自 `docs/review/*.md` 的写权限
  - 汇总报告、路线图、补丁登记与本任务文档由主会话统一维护，避免并行覆盖

## 并行 / 串行关系总览

1. 串行执行 `TASK-FRAO-001`，先建基线与骨架。
2. 在 `TASK-FRAO-001` 完成后，并行执行：
   - `TASK-FRAO-002`
   - `TASK-FRAO-003`
   - `TASK-FRAO-004`
   - `TASK-FRAO-005`
3. `TASK-FRAO-007` 由 `TASK-FRAO-002` 至 `TASK-FRAO-005` 条件触发，可随时并行登记。
4. `TASK-FRAO-006` 必须串行收口，在 `TASK-FRAO-002` 至 `TASK-FRAO-005` 完成且 `TASK-FRAO-007` 已同步后执行。

## 推荐交付顺序

1. `TASK-FRAO-001`：先统一证据口径、问题分级和文档骨架。
2. `TASK-FRAO-002`：尽早产出架构与边界结论，为其它维度提供共享边界参照。
3. 并行推进 `TASK-FRAO-003`、`TASK-FRAO-004`、`TASK-FRAO-005`。
4. 审查过程中一旦触发越界、契约变更或需求不明，立即登记 `TASK-FRAO-007`。
5. `TASK-FRAO-006`：最后统一收口审查报告与优化路线图。

## 推荐的下一步

- 由 planner 基于本任务文档生成执行计划，至少设置 3 个检查点：
  - 审查基线确认
  - 四个分维度审查文档完成
  - 汇总报告与路线图确认
- planner 在分配审查子任务时，应优先保证文档写路径不冲突，不要让并行任务同时改同一份汇总文档。
- 下一轮若进入实现，必须从 `docs/review/2026-04-19-full-repo-optimization-roadmap.md` 中按 `needs_ddd_first`、`must_tdd`、`can_direct_dev` 重新拆成执行任务，而不是直接沿用本轮审查任务编号。
