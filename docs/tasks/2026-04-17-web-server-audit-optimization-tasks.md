# 2026-04-17 Web / Server 审查优化任务拆解

## 需求文档路径

- `docs/requirements/2026-04-17-web-server-audit-optimization-requirements.md`

## 任务概览

- 本轮仅拆分 `apps/web` 与 `apps/server` 的分阶段审查与最小优化任务，不扩展到 `apps/admin`、共享包实现修改或仓库外应用。
- 固定执行顺序为：`web review -> web optimize -> server review -> server optimize`。
- 每一阶段都必须先形成“已确认问题清单”，再进入对应优化任务；未确认的问题不得直接实现。
- `packages/config`、`packages/db`、`packages/http-client`、`packages/schemas`、`packages/shared`、根目录环境变量与说明文档不纳入本轮实现；若审查确认必须调整，只能登记为计划补丁 / 升级任务。
- 本轮目标是最小正确改动，不做无关重构，不做顺手清理，不通过应用层重复定义共享结构绕过 `packages/*`。

## 任务分解列表

### TASK-WSAO-001

- 任务名：Web 阶段审查与问题清单确认
- 类型：审查
- 优先级：P0
- 完成标准：
  - 完成 `apps/web` 审查，覆盖性能、代码质量、模块结构、可维护性、重复逻辑、功能正确性、明显运行风险与可验证性。
  - 输出独立 Web 审查结论，至少包含：已确认问题、影响范围、证据、建议、本轮处理范围、明确不处理项。
  - 对每个确认问题标记处理方式：`本轮修复`、`仅记录`、`需转共享补丁任务`。
  - 未形成已确认问题清单前，不得进入 `TASK-WSAO-002`。
- DDD 分类：`supporting`（无需 DDD）
- test_strategy：`manual_only`
- 风险任务：否
- 文件所有权 / 共享路径提醒：
  - 审查对象仅限 `apps/web/src/**`、`apps/web/tests/**`、`apps/web/e2e/**`。
  - 允许新增或更新 `docs/review/**` 审查文档。
  - `packages/*`、`apps/server/**`、`apps/admin/**` 仅可只读引用；若问题根因落在这些路径，转 `TASK-WSAO-005`。

### TASK-WSAO-002

- 任务名：Web 阶段最小优化与验证
- 类型：前端
- 优先级：P1
- 完成标准：
  - 仅修复 `TASK-WSAO-001` 中已确认且标记为“本轮修复”的 Web 问题。
  - 变更保持最小正确改动，不做无关重构，不扩大到 `apps/server` 或 `packages/*`。
  - 对每个处理项记录结果：`已修复`、`保留未处理`、`转共享补丁`，并说明原因。
  - 至少完成与改动直接相关的验证；若为行为性问题，补充对应测试或浏览器 / 场景验证证据。
  - 完成后更新 Web 阶段审查结论与验证结果，作为进入 `TASK-WSAO-003` 的前置产物。
- DDD 分类：`application`（默认无需 DDD；若发现跨共享契约或多对象一致性问题，升级到 `TASK-WSAO-005`）
- test_strategy：`conditional_tdd`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 允许修改 `apps/web/src/**`、`apps/web/tests/**`、`apps/web/e2e/**`、`docs/review/**`。
  - 禁止直接修改 `packages/schemas/**`、`packages/http-client/**`、`packages/shared/**`、`apps/server/**`、`apps/admin/**`、`README.md`、`.env.example`。
  - 若优化结论依赖共享协议、环境变量、CORS 或 HTTP Client 变更，只登记补丁任务，不纳入本轮实现。

### TASK-WSAO-003

- 任务名：Server 阶段审查与问题清单确认
- 类型：审查
- 优先级：P0
- 完成标准：
  - 在 Web 阶段收口后审查 `apps/server`，覆盖性能、代码质量、模块结构、可维护性、重复逻辑、功能正确性、运行风险、接口契约与可验证性。
  - 输出独立 Server 审查结论，至少包含：已确认问题、影响范围、风险等级、复现 / 证据、建议、本轮处理范围、明确不处理项。
  - 对每个确认问题标记处理方式：`本轮修复`、`仅记录`、`需转共享补丁任务`。
  - 未形成已确认问题清单前，不得进入 `TASK-WSAO-004`。
- DDD 分类：`supporting`（无需 DDD）
- test_strategy：`manual_only`
- 风险任务：否
- 文件所有权 / 共享路径提醒：
  - 审查对象仅限 `apps/server/src/**`、`apps/server/tests/**`。
  - 允许新增或更新 `docs/review/**` 审查文档。
  - `packages/*`、`apps/web/**`、`apps/admin/**` 仅可只读引用；若问题根因落在这些路径，转 `TASK-WSAO-005`。
  - 若发现数据库 schema、迁移、seed 语义风险，只能升级为计划补丁，不纳入本轮实现。

### TASK-WSAO-004

- 任务名：Server 阶段最小优化与验证
- 类型：后端
- 优先级：P1
- 完成标准：
  - 仅修复 `TASK-WSAO-003` 中已确认且标记为“本轮修复”的 Server 问题。
  - 变更保持最小正确改动，不做无关重构，不扩大到 `apps/web` 或 `packages/*`。
  - 对权限、状态转换、接口契约、统计 / 计数、幂等 / 重试 / 故障恢复类问题，先补失败测试再改实现。
  - 对每个处理项记录结果：`已修复`、`保留未处理`、`转共享补丁`，并说明原因。
  - 至少完成与改动直接相关的验证；若涉及 OpenAPI / HTTP 契约，仅允许在 `apps/server` 内同步更新对应文档或测试产物。
- DDD 分类：`application`（若发现复杂权限规则、状态机或多聚合一致性，需升级为 DDD 设计并转 `TASK-WSAO-005`）
- test_strategy：`tdd`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 允许修改 `apps/server/src/**`、`apps/server/tests/**`、`docs/review/**`。
  - 禁止直接修改 `packages/db/**`、`packages/schemas/**`、`packages/http-client/**`、`packages/shared/**`、`apps/web/**`、`apps/admin/**`、`README.md`、`.env.example`。
  - 若修复需要调整共享 schema、环境变量、根脚本或数据库语义，只登记补丁任务，不纳入本轮实现。

### TASK-WSAO-005

- 任务名：共享边界计划补丁 / 升级任务登记（条件触发）
- 类型：共享
- 优先级：P0（条件触发）
- 完成标准：
  - 当 `TASK-WSAO-001` 或 `TASK-WSAO-003` 发现问题根因位于 `packages/*`、根目录环境变量 / 文档、跨应用契约或数据库语义时，登记单独的计划补丁 / 升级任务。
  - 登记内容至少包含：触发来源任务、问题摘要、受影响路径、为什么不能在本轮直接实现、建议 owner、建议验证方式、阻塞级别。
  - 本任务只产出文档，不在本轮直接修改共享包或根目录配置。
- DDD 分类：`supporting`（作为 DDD / 共享契约升级入口）
- test_strategy：`plan_only`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 当前轮次只允许新增或更新 `docs/tasks/**`、`docs/plans/**`、`docs/review/**` 中的计划记录。
  - `packages/config/**`、`packages/db/**`、`packages/http-client/**`、`packages/schemas/**`、`packages/shared/**`、根目录 `README.md`、`.env.example` 保持只读，交由后续专项任务处理。

## DDD 分类

- `无需 DDD`：`TASK-WSAO-001`、`TASK-WSAO-003`
- `应用层直接处理，默认不引入 DDD`：`TASK-WSAO-002`
- `高风险应用层任务，必要时升级为 DDD`：`TASK-WSAO-004`
- `DDD / 共享升级入口`：`TASK-WSAO-005`
- `升级触发条件`：核心业务规则复杂、状态转换复杂、权限 / 配额 / 计费 / 审批规则集中、聚合边界清晰且一个问题影响多个业务对象一致性、修复必须跨 `apps/web`、`apps/server`、`packages/*` 同步变更才能成立。

## TDD 与直接开发分类

- `必须 TDD`：`TASK-WSAO-004`
- `条件触发 TDD`：`TASK-WSAO-002`
- `TDD 触发条件`：可复现 Bug、鉴权 / 权限 / 会话 / 缓存隔离 / 状态切换、接口契约、错误恢复、重试、幂等、统计 / 计数、容易回归且已有复现路径的问题。
- `可直接开发`：`TASK-WSAO-001`、`TASK-WSAO-003`、`TASK-WSAO-005`
- `可直接开发的 Web 优化范围`：`TASK-WSAO-002` 中不改变业务语义的结构整理、重复逻辑收敛、构建 / 首屏性能微调。
- `验证下限`：每个优化任务至少执行与改动直接相关的验证；若无法完成默认 `lint` / `typecheck` / `test` / `build`，必须在阶段结论中记录原因和未验证风险。

## 风险任务

- `TASK-WSAO-002`：前端问题容易表面出在 `apps/web`，根因却落在 `packages/http-client`、`packages/shared` 或服务端契约；一旦出现跨边界依赖，必须停止越界修改，转 `TASK-WSAO-005`。
- `TASK-WSAO-004`：后端优化最可能触发权限、状态机、接口契约和 OpenAPI 风险；必须用测试先锁定行为，再做最小修复。
- `TASK-WSAO-005`：该任务一旦被触发，说明当前轮次边界不足以承载修复；planner 需要单独排期，不能把共享修改混入 Web 或 Server 优化步骤。

## 文件所有权和共享路径提醒

- `Web 执行阶段所有权`：仅拥有 `apps/web/**` 的实现修改权。
- `Server 执行阶段所有权`：仅拥有 `apps/server/**` 的实现修改权。
- `文档所有权`：审查与计划文档由主会话统一落在 `docs/review/**`、`docs/tasks/**`、`docs/plans/**`。
- `本轮只读共享路径`：`packages/config/**`、`packages/db/**`、`packages/http-client/**`、`packages/schemas/**`、`packages/shared/**`、`README.md`、`.env.example`、`apps/admin/**`。
- `共享风险提醒`：发现共享协议漂移时，不得在应用层重复定义结构绕过 `packages/*`。
- `数据库与环境边界提醒`：发现数据库、环境变量、CORS、OpenAPI 默认暴露策略需要调整时，不得在本轮直接吸收，必须升级为计划补丁任务。
- `范围控制提醒`：不得因为审查顺手引入跨应用重构、脚本重命名或文档大范围清理。

## 推荐交付顺序

1. 执行 `TASK-WSAO-001`，先产出 Web 已确认问题清单和处理边界。
2. 若 `TASK-WSAO-001` 发现共享根因，立即登记 `TASK-WSAO-005`，但不打断 Web 审查结论收口。
3. 执行 `TASK-WSAO-002`，只处理 Web 已确认且在边界内的问题。
4. 在 Web 优化结论和验证完成后，执行 `TASK-WSAO-003`。
5. 若 `TASK-WSAO-003` 发现共享根因，更新 `TASK-WSAO-005`，但不把共享修改混入 Server 本轮实现。
6. 执行 `TASK-WSAO-004`，只处理 Server 已确认且在边界内的问题。
7. 最后统一核对 `docs/review/**`、验证记录和未处理问题说明，确保 planner 可直接接手。

## 高风险提醒

- 没有书面问题清单，不进入对应优化任务。
- Web 与 Server 两阶段都不得越权修改对方应用或共享包。
- 一旦发现修复依赖 `packages/*`、环境变量、根文档或数据库语义，立即停止直改，转计划补丁。
- Server 优化阶段若命中权限、状态转换、契约一致性问题，默认按高风险处理，不接受“先改后看”。
- 本轮目标是最小正确改动，不是趁机重构；任何顺手清理都必须有审查结论支撑。

## 推荐的下一步

- 由 planner 基于本任务文档生成执行计划，明确 Web 审查产物、Web 优化验证、Server 审查产物、Server 优化验证 4 个检查点。
- 先为 `TASK-WSAO-001` 和 `TASK-WSAO-003` 约定统一的审查输出模板，保证后续优化只消费“已确认问题”。
- 预留 `TASK-WSAO-005` 的占位编号和升级入口，避免执行中临时扩 scope。
