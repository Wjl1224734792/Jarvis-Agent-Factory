# Stage-2：Server Admin Login 测试红灯任务拆解

## 1. 需求文档路径

- 上游需求文档：`docs/requirements/2026-04-25-server-admin-login-test-red-requirements.md`
- 本任务文档：`docs/tasks/2026-04-25-server-admin-login-test-red-tasks.md`
- 工作流定位：本文件仅做任务拆解，供 `planner` 制定执行计划；不选择执行轮次，不编写业务代码。

## 2. 任务概览

本轮目标是修复根级 `bun run test` 中与 `server/admin-login` 相关的红灯，已知表现集中在 admin 登录返回 `INVALID_CREDENTIALS`，或依赖 admin cookie 的服务端测试返回 `401`。范围仅限测试红灯修复：优先诊断测试状态重置、seed、auth 测试 helper、admin 凭据漂移、session/cookie 传递与测试执行顺序问题。

明确边界：

- 允许修复服务端测试、测试 helper、测试状态初始化、必要 seed/auth fixture，以及经证明确实导致测试不一致的最小 auth 测试支撑代码。
- 不得削弱生产 admin auth，不得绕过密码校验、角色校验、session 校验或 admin-only middleware。
- 不得无依据修改 DB/env/CORS/OpenAPI/upload policy、`.env.example`、根 `README.md`。
- 若诊断证明必须改 DB/env/CORS/OpenAPI/upload policy 或文档，必须给出失败证据、影响面说明，并按根 `AGENTS.md` L3/L4 同步相关文档。

主要候选路径：

- `apps/server/tests/auth.test.ts`
- `apps/server/tests/auth-test-helpers.ts`
- `apps/server/tests/test-state.ts`
- `apps/server/tests/admin-logs.test.ts`
- `apps/server/tests/admin-reports.test.ts`
- `apps/server/tests/content-closure.test.ts`
- `apps/server/src/modules/auth/auth.service.ts`
- `apps/server/src/modules/auth/auth.repo.ts`
- `apps/server/src/modules/auth/auth.middleware.ts`
- `packages/db/**`（仅 seed/auth fixture 被证明必要时）
- `.env.example`、`README.md`（仅 env/seed 行为对开发者可见且被证明必要时）

## 3. 任务分解列表

| 任务 ID | 名称 | 类型 | 优先级 | Owner 建议 | 允许路径 | 禁止路径 | TDD/test_after/manual_only | 完成标准 |
|---|---|---|---|---|---|---|---|---|
| TASK-001 | 复现并定位 admin-login 红灯 | 诊断 | P0 | server/test owner | `apps/server/tests/**`、只读查看 `apps/server/src/modules/auth/**`、`packages/db/**` | 禁止修改业务代码、DB schema、env、CORS、OpenAPI、upload policy | manual_only | 记录可复现命令、失败测试文件、失败断言、响应状态/body；区分 `INVALID_CREDENTIALS` 与登录后 admin 路由 `401`；形成明确根因假设。 |
| TASK-002 | 核对测试 admin 凭据来源 | 诊断 | P0 | server/test owner + db owner | `apps/server/tests/auth-test-helpers.ts`、`apps/server/tests/test-state.ts`、`packages/db/**` seed 相关文件 | 禁止更改生产默认密码策略；禁止把测试密码写入生产 env 默认值 | manual_only | 找到 `loginAdmin()` 使用的账号/密码与 seed/hash 的对应关系；确认红灯是否由测试 helper 默认值、seed 数据、hash 算法或重置顺序漂移导致。 |
| TASK-003 | 锁定 admin 登录契约测试 | 测试修复 | P0 | server/test owner | `apps/server/tests/auth.test.ts`、必要时 `apps/server/tests/auth-test-helpers.ts` | 禁止修改 auth 生产逻辑来迎合错误测试；禁止降低失败断言强度 | TDD | 新增或修正最小测试，覆盖正确 admin 凭据登录成功、错误凭据仍失败、返回 cookie 可用于 admin-only 路由；红灯能先证明当前问题，再由后续修复转绿。 |
| TASK-004 | 修复测试 helper 或测试状态漂移 | 测试修复 | P0 | server/test owner | `apps/server/tests/auth-test-helpers.ts`、`apps/server/tests/test-state.ts`、必要时受影响测试文件 | 禁止全局跳过 admin auth；禁止在测试中硬塞伪造 admin cookie；禁止扩大到无关测试重构 | TDD | `loginAdmin()` 使用与 seed 一致且语义清晰的凭据；失败时报错包含状态和 body；测试状态重置后 admin seed 稳定存在；依赖 admin cookie 的测试不再因 helper 漂移返回 `401`。 |
| TASK-005 | 必要 seed/auth fixture 最小修复 | 测试修复 | P0 | db owner + server/test owner | `packages/db/**` seed/auth fixture、`apps/server/tests/test-state.ts` | 禁止 DB schema/migration，除非主会话重新确认；禁止影响 demo/catalog seed 的真实业务语义 | TDD | 仅当 TASK-001/002 证明 seed 或 hash 数据缺失/漂移时执行；修复后 auth profile seed 可稳定创建 admin 用户，密码 hash 与登录校验一致，普通用户与 admin 角色边界不变。 |
| TASK-006 | 必要配置与文档同步评估 | 必要配置/文档同步 | P1 | docs owner + server owner | `.env.example`、`README.md`、相关子目录 README、必要 env 测试文件 | 禁止无证据修改 DB/env/CORS/OpenAPI/upload policy；禁止生产默认暴露 OpenAPI；禁止生产 `CORS_ORIGIN=all` | test_after | 只有在测试修复证明 env 或文档确实不一致时执行；每个配置/文档改动都有明确原因、同步范围和测试证据；否则记录“不需要配置/文档同步”。 |
| TASK-007 | 针对性回归验证 | 验证 | P0 | server/test owner | 不修改文件，运行测试命令并记录输出 | 禁止为通过验证临时跳过测试；禁止只跑单测就宣称根级通过 | test_after | 先运行相关 server/auth/admin 测试，再运行根级 `bun run test`；记录命令、结果、剩余失败是否与本轮范围相关。 |
| TASK-008 | 根级质量门验证 | 验证 | P1 | maintainer | 不修改文件，运行验证命令并记录输出 | 禁止在 lint/typecheck/build 红灯时宣称完成；禁止修无关问题 | test_after | 按需求运行 `bun run lint`、`bun run typecheck`、`bun run build`；若 `bun run test` 已因本轮外问题阻塞，需说明阻塞点和为何不继续扩大范围。 |
| TASK-009 | 安全边界评审 | 评审 | P0 | reviewer/security owner | 只读检查本轮 diff | 禁止接受削弱生产 auth 的实现；禁止接受无依据配置变更 | manual_only | 确认错误凭据仍返回失败、非 admin 仍无法访问 admin-only 路由、生产 auth middleware 未被绕过、session/cookie 语义未被放宽。 |
| TASK-010 | 变更范围与共享路径评审 | 评审 | P1 | reviewer + planner | 只读检查本轮 diff、任务文档、验证记录 | 禁止越界修改 UI、upload、CORS、OpenAPI、无关 DB schema/migration | manual_only | diff 仅覆盖本轮允许范围；共享路径 owner 已确认；若涉及 `packages/db` 或文档，已说明影响链路并同步必要说明。 |

## 4. DDD 分类

- 需要 DDD：无。本轮目标是测试红灯修复与测试支撑一致性，不新增业务能力，不重划聚合，不调整权限模型。
- DDD 关注但不建模：admin auth 属于权限边界，高风险但本轮不应重构领域模型；只能验证现有 admin 登录、角色和 session 规则是否被测试正确使用。
- 不需要 DDD：`TASK-001`、`TASK-002`、`TASK-003`、`TASK-004`、`TASK-006`、`TASK-007`、`TASK-008`、`TASK-009`、`TASK-010`。
- 条件需要领域 owner 参与：`TASK-005` 若进入 `packages/db` seed/auth fixture，需要 db owner 共同确认 seed 语义，但仍不做 DDD 重设计。

## 5. TDD 与直接开发分类

- 必须 TDD：`TASK-003`、`TASK-004`、`TASK-005`。原因是涉及权限验证、admin 登录契约、session/cookie 可用性和可复现红灯修复。
- test_after：`TASK-006`、`TASK-007`、`TASK-008`。配置/文档同步必须由测试证据驱动；验证任务以命令输出为准。
- manual_only：`TASK-001`、`TASK-002`、`TASK-009`、`TASK-010`。这些任务以诊断、只读核对、评审判断为主，不直接写业务代码。
- 可直接开发：无独立业务开发任务。本轮不写新功能；即使修改 helper/seed，也必须由 TDD 或复现证据驱动。

## 6. 风险任务

| 风险项 | 涉及任务 | 风险说明 | 控制要求 |
|---|---|---|---|
| 削弱生产 admin auth | TASK-003、TASK-004、TASK-009 | 为了让测试变绿而绕过 admin 密码、角色或 session 校验，会引入严重权限漏洞。 | 任何生产 auth 逻辑改动必须同时证明错误凭据失败、普通用户不可访问 admin-only 路由。 |
| seed 与真实业务数据语义混淆 | TASK-002、TASK-005 | 修改 seed 可能影响 demo/catalog/auth profiles 和其他测试。 | 只改被证明漂移的 auth fixture；不得做 DB schema/migration；变更前确认 `resetIntegrationState("auth")` 调用链。 |
| 测试间状态污染 | TASK-001、TASK-004、TASK-007 | Redis、ephemeral state、DB reset 顺序错误会导致单测绿、全量红。 | 验证必须包含相关单测和根级 `bun run test`；不得只依赖单文件结果。 |
| 无依据配置/文档变更 | TASK-006、TASK-010 | env/CORS/OpenAPI/upload policy 改动可能扩大影响面。 | 仅在证明确实必要时修改；同步 `.env.example`、根 `README.md` 和已提及变量的子目录文档。 |
| 共享 helper 影响大面积测试 | TASK-004 | `auth-test-helpers.ts` 被多组 server 测试复用，错误修复可能导致其他 auth flow 红灯。 | 保持 helper 行为最小、错误信息增强优先；修改后跑依赖 admin cookie 的测试集合。 |

## 7. 文件所有权和共享路径提醒

- `apps/server/tests/auth-test-helpers.ts` 是 server 测试共享登录入口，owner 建议为 server/test owner；修改会影响 admin logs、reports、content closure、auth flows 等测试。
- `apps/server/tests/test-state.ts` 负责 Redis、ephemeral auth state、DB reset 和 seed profile，owner 建议为 server/test owner + db owner；不得随意调整全局重置顺序。
- `packages/db/**` 是共享数据与 seed 所有权路径，owner 建议为 db owner；仅在 seed/hash 证据充分时进入，且不得顺手改 schema/migration。
- `apps/server/src/modules/auth/**` 是生产 auth 边界，owner 建议为 server/auth owner；本轮原则上只读诊断，若必须修改需通过安全评审。
- `.env.example`、`README.md` 是共享配置/文档路径，owner 建议为 docs owner + server owner；只有配置事实发生变化时同步。
- 禁止路径：`apps/web/**`、`apps/admin/**` UI、`docker/**`、upload policy 相关代码、CORS/OpenAPI 默认行为、无关 posts/editor 代码、`apps/mobiles/**`。
- 并行风险：`auth-test-helpers.ts`、`test-state.ts`、`packages/db` seed 文件属于高冲突共享路径；planner 应串行安排写入，避免多个任务同时修改。

## 8. 推荐交付顺序

1. `TASK-001`：先复现根级或 server/admin-login 红灯，记录确切失败和响应体。
2. `TASK-002`：核对 `loginAdmin()` 默认凭据、auth seed、hash 校验和 reset 顺序，确认根因。
3. `TASK-003`：用最小契约测试锁定正确 admin 登录成功与错误凭据失败。
4. `TASK-004`：优先修测试 helper 或测试状态漂移，避免改生产 auth。
5. `TASK-005`：仅当证明确实是 seed/auth fixture 漂移时进入 `packages/db` 最小修复。
6. `TASK-006`：仅当配置或文档事实发生变化时同步，否则明确记录无需同步。
7. `TASK-007`：运行针对性 server/auth/admin 测试和根级 `bun run test`。
8. `TASK-008`：运行 `bun run lint`、`bun run typecheck`、`bun run build`。
9. `TASK-009`、`TASK-010`：完成安全边界和变更范围评审后交付。

## 9. 推荐的下一步

- 将本任务文档交给 `planner`，由 `planner` 基于 `TASK-001` 到 `TASK-010` 制定执行计划。
- `planner` 执行前应读取根 `AGENTS.md`、`apps/AGENTS.md`、`apps/server/AGENTS.md`；若进入 `packages/db`，还需读取 `packages/AGENTS.md` 与相关 db 文档。
- 第一轮建议只做 `TASK-001`、`TASK-002`、`TASK-003`、`TASK-004`，除非诊断证明必须进入 `packages/db`。
- 若执行中发现必须改 DB schema/migration、env、CORS、OpenAPI、upload policy 或生产 admin auth 语义，应停止并回退主会话澄清，不得自行扩大范围。
- 交付给 reviewer 时必须附带失败复现、修复证据、根级验证结果，以及“未削弱生产 admin auth”的检查结论。
