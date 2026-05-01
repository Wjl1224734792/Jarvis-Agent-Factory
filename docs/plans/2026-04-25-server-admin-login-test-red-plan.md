# Stage-3：Server Admin Login Test Red 执行计划

## 1. 需求文档路径

- `docs/requirements/2026-04-25-server-admin-login-test-red-requirements.md`

## 2. 任务文档路径

- `docs/tasks/2026-04-25-server-admin-login-test-red-tasks.md`

## 3. Gate B 规划前检查

结论：通过，可进入 Stage-3 执行规划。

- 任务 ID：任务文档包含 `TASK-001` 至 `TASK-010`，格式完整。
- 任务名称：任务分解表已逐项写明。
- 类型：任务分解表已写明诊断、测试修复、验证、评审、必要配置/文档同步等类型。
- 优先级：任务分解表已写明 `P0` / `P1`。
- 完成标准：任务分解表每个任务均有可检查完成标准。
- DDD 分类：第 4 节明确本轮不需要 DDD，`TASK-005` 仅条件性需要 db owner 确认 seed 语义。
- TDD / test_after / manual_only 分类：第 5 节已完整标注。
- 风险任务：第 6 节已标注削弱生产 auth、seed 语义混淆、测试间状态污染、无依据配置变更、共享 helper 影响面等风险。
- 文件所有权 / 共享路径提醒：第 7 节已写明 `auth-test-helpers.ts`、`test-state.ts`、`packages/db/**`、生产 auth、`.env.example` / `README.md` 等所有权和禁止路径。

## 4. 当前轮次目标

基于已知诊断结论，优先修复 server 测试隔离 / 测试 helper 中的 admin 凭据漂移窗口，使多 server 测试文件并发运行时不再因共享 admin 密码被 `auth.test.ts` 临时改动而导致 `loginAdmin()` 返回 `INVALID_CREDENTIALS` 或后续 admin 路由 `401`。

## 5. 当前轮次范围

### In Scope

- `TASK-003`：锁定 admin 登录契约测试。
- `TASK-004`：修复测试 helper 或测试状态漂移。
- `TASK-007`：针对性回归验证。
- `TASK-008`：根级质量门验证。
- `TASK-009` / `TASK-010`：实现后交由 `review_qa` 做安全边界与范围评审。

### 已由上游输入覆盖的诊断

- `TASK-001` / `TASK-002` 不作为本轮独立执行包重复执行；已知诊断摘要已给出足够规划依据：
  - `loginAdmin()` 默认硬编码 `admin / Admin#123`。
  - `apps/server/tests/auth.test.ts` 的 “allows admins to change password...” 会把共享 admin 密码改到 `Admin#456`，再尝试回滚。
  - `bun run test` 多 server 测试文件并发时，其它文件可能在此窗口调用 `loginAdmin()`，导致 `400 INVALID_CREDENTIALS` 或后续 `401`。
  - 单独运行 `apps/server/tests/search.test.ts -t "caps admin search results"` 通过。

### Out of Scope / Forbidden

- 禁止修改生产 auth 语义、密码校验、角色校验、session 校验或 admin-only middleware。
- 禁止修改 DB schema、migration、seed 语义，除非先触发 plan patch / contract change request。
- 禁止修改 env、CORS、OpenAPI、upload policy、`.env.example`、根 `README.md`，除非先证明测试修复必须依赖这些变更并回到编排者确认。
- 禁止修改 `apps/web/**`、`apps/admin/**`、`docker/**`、`packages/schemas/**`、`packages/http-client/**`、`packages/shared/**`。
- 禁止为了测试通过跳过 admin auth、伪造 admin cookie、降低错误凭据失败断言强度。

## 6. 完成标准

- `loginAdmin()` 或相关测试 helper 不再依赖会被其它并发测试临时修改的共享 admin 密码状态。
- admin 正确凭据登录成功、错误凭据失败、返回 cookie 可访问 admin-only 路由的测试契约保持可验证。
- “allows admins to change password...” 不再污染并发测试的 admin 登录前提；若仍需改密码，必须隔离到独立测试主体、独立 fixture、串行化局部文件内状态，或等效测试隔离方案。
- 针对性 server/auth/admin/search 测试通过，并记录命令输出。
- 根级 `bun run test` 重新运行并记录结果；随后按 AGENTS L5 运行 `bun run lint`、`bun run typecheck`、`bun run build`，除非存在已记录的外部阻塞。
- diff 不包含 DB/env/CORS/OpenAPI/upload-policy/`.env.example`/`README.md`/生产 auth 语义变更；如包含，必须有已批准的 plan patch / contract change request。

## 7. 是否需要先查阅 repo_explorer / docs_researcher

- 不需要先查阅 `repo_explorer`：需求文档、任务文档与已知诊断摘要已足够定位当前轮次实现边界；实现代理可在执行包允许路径内自行读取相关测试文件。
- 不需要 `docs_researcher`：本轮不涉及外部库 API、框架升级或 OpenAPI/CORS 文档研究。
- 如实现代理发现测试运行器并发策略、Bun 参数或仓内脚本不明确，可只读查阅 `package.json`、`apps/server/package.json`、相关 README；不需要启动专项 research。

## 8. 执行代理分工

- 唯一实现 owner：`backend_test_worker`。
- 负责范围：`TASK-003`、`TASK-004`、`TASK-007`、`TASK-008` 的测试修复与验证记录。
- 下游评审：有意义变更完成后由 `review_qa` 执行 `TASK-009`、`TASK-010`。
- 不分配给 `backend_implementer`，因为当前轮次明确优先只改测试隔离 / 测试 helper，不需要 API、业务逻辑、数据层多维度实现。

## 9. 共享区域改动归属

- `apps/server/tests/auth-test-helpers.ts`：唯一 owner 为 `backend_test_worker`。
- `apps/server/tests/test-state.ts`：唯一 owner 为 `backend_test_worker`；仅允许在证明 helper 层无法隔离时最小修改。
- `apps/server/tests/auth.test.ts`：唯一 owner 为 `backend_test_worker`。
- 受影响 server 测试文件（如 `apps/server/tests/search.test.ts`、`apps/server/tests/admin-logs.test.ts`、`apps/server/tests/admin-reports.test.ts`、`apps/server/tests/content-closure.test.ts`）：默认只读或仅调整调用测试 helper 的最小兼容代码，owner 仍为 `backend_test_worker`。
- `packages/db/**`、`.env.example`、`README.md`、CORS/OpenAPI/upload policy、生产 auth 模块：本轮无 owner，全部 forbidden；如必须进入，先触发 plan patch / contract change request。

## 10. 并行 / 串行策略

- 串行执行：本轮只有一个实现 owner，且 `auth-test-helpers.ts` / `test-state.ts` 是共享测试入口，禁止并行修改。
- 推荐顺序：先补/调整契约测试（`TASK-003`）→ 再修 helper 或测试状态隔离（`TASK-004`）→ 再跑针对性回归（`TASK-007`）→ 最后跑质量门（`TASK-008`）→ 交给 `review_qa`。
- 不启动并行 worker；避免多个代理同时触碰共享测试 helper。

## 11. 风险提醒

- 高风险点 1：直接把 `loginAdmin()` 默认密码改成 `Admin#456` 可能反向破坏依赖 seed 初始密码的测试；实现应消除共享密码漂移窗口，而不是追随临时密码。
- 高风险点 2：将改密码测试改为全局跳过、延迟回滚或吞掉登录失败会掩盖真实权限问题，不允许。
- 高风险点 3：如果方案依赖 DB seed 或 production auth 行为变化，说明当前轮次范围已扩大，必须先回到编排者。
- 高风险点 4：单文件测试通过不代表修复完成；必须包含多 server 测试文件并发或根级 `bun run test` 验证。

## 12. 实现者交接信息

- 已知根因优先级：共享 admin 用户密码在 `auth.test.ts` 改密测试期间被临时改为 `Admin#456`，并发测试文件中的 `loginAdmin()` 仍使用 `Admin#123`。
- 优先方案方向：隔离改密测试使用的 admin 主体 / 凭据，或让改密测试不改变其它测试共享的 admin 登录前提；其次才考虑 helper 支持显式凭据参数或测试内局部凭据。
- 保持生产 auth 不变：实现代理只能在测试与测试 helper 层解决，不得为了稳定测试修改 `apps/server/src/modules/auth/**` 行为。
- 验证时必须记录失败前后：至少包含改密相关测试、一个依赖 `loginAdmin()` 的并发受害测试（已知 `search.test.ts -t "caps admin search results"`）、以及根级 `bun run test`。

## 13. Execution Packets

### Execution Packet 1

#### task_id
TASK-003

#### task_name
锁定 admin 登录契约测试

#### owner
backend_test_worker

#### objective
用最小测试锁定 admin 正确凭据、错误凭据与 admin-only cookie 访问契约，防止测试隔离修复削弱 auth 语义。

#### in_scope
- 检查 `apps/server/tests/auth.test.ts` 中现有 admin 登录、改密、admin-only 路由断言。
- 新增或调整最小测试断言，覆盖正确 admin 凭据登录成功。
- 保留或补强错误 admin 凭据失败断言。
- 验证登录返回 cookie 可用于至少一个 admin-only 路由或等效受保护请求。

#### out_of_scope
- 不修改生产 auth service、repo、middleware。
- 不修改 DB seed、schema、migration。
- 不新增无关 auth flow 测试。
- 不改变真实业务密码策略或角色模型。

#### input_documents
- requirements: `docs/requirements/2026-04-25-server-admin-login-test-red-requirements.md`
- tasks: `docs/tasks/2026-04-25-server-admin-login-test-red-tasks.md`
- plan: `docs/plans/2026-04-25-server-admin-login-test-red-plan.md`

#### allowed_paths
- `apps/server/tests/auth.test.ts`
- `apps/server/tests/auth-test-helpers.ts`（仅当测试契约需要复用 helper 或增强错误输出）

#### forbidden_paths
- `apps/server/src/modules/auth/**`
- `packages/db/**`
- `packages/schemas/**`
- `packages/http-client/**`
- `packages/shared/**`
- `.env.example`
- `README.md`
- `apps/web/**`
- `apps/admin/**`
- `docker/**`

#### dependencies
- 现有 auth 测试 app / request helper。
- 现有 test seed 中的 admin 用户与密码约定。
- `loginAdmin()` 当前 helper 行为。

#### acceptance_criteria
- `auth.test.ts` 中存在可读断言证明正确 admin 凭据可登录。
- `auth.test.ts` 中存在可读断言证明错误 admin 凭据仍失败。
- `auth.test.ts` 中存在可读断言证明 admin 登录 cookie 可访问 admin-only 路由或等效受保护请求。
- 执行 `bun test apps/server/tests/auth.test.ts` 时相关契约测试可被单独定位运行。

#### test_strategy
tdd

#### validation_commands
- `bun test apps/server/tests/auth.test.ts`
- `bun test apps/server/tests/auth.test.ts -t "admin"`

#### rollback_notes
- 若新增契约测试暴露生产 auth 真实缺陷，不得直接改生产 auth；停止并提交 plan patch。
- 若测试命名或 helper 依赖不匹配，回滚本任务对 `auth.test.ts` 的新增断言，保留诊断记录。

#### handoff_notes
- 交给 `TASK-004` 时说明哪些断言先红、哪些断言用于防止修复削弱 auth。
- 交给 `review_qa` 时附上相关测试名称和命令输出。

#### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置、生产 auth 语义，必须先回编排者，不得直接修改。

### Execution Packet 2

#### task_id
TASK-004

#### task_name
修复测试 helper 或测试状态漂移

#### owner
backend_test_worker

#### objective
消除并发 server 测试中文件间共享 admin 密码漂移导致的 `loginAdmin()` 失败或后续 `401`。

#### in_scope
- 修改 `apps/server/tests/auth-test-helpers.ts`，使 `loginAdmin()` 支持稳定、明确且不受改密测试污染的测试登录策略。
- 必要时修改 `apps/server/tests/auth.test.ts` 的改密测试，使其使用隔离 admin 主体、隔离凭据、局部 helper 参数，或等效隔离方案。
- 必要时最小修改 `apps/server/tests/test-state.ts`，确保测试状态重置后共享 admin seed 稳定存在且不被单个测试永久污染。
- 增强 `loginAdmin()` 失败信息，包含响应状态和 body，便于后续诊断。

#### out_of_scope
- 不修改生产 auth service/repo/middleware。
- 不修改 DB schema、migration 或通用 seed 语义。
- 不全局串行化所有 server 测试，除非先证明无更小测试隔离方案并触发 plan patch。
- 不通过跳过测试、伪造 cookie、降低断言强度来变绿。

#### input_documents
- requirements: `docs/requirements/2026-04-25-server-admin-login-test-red-requirements.md`
- tasks: `docs/tasks/2026-04-25-server-admin-login-test-red-tasks.md`
- plan: `docs/plans/2026-04-25-server-admin-login-test-red-plan.md`

#### allowed_paths
- `apps/server/tests/auth-test-helpers.ts`
- `apps/server/tests/auth.test.ts`
- `apps/server/tests/test-state.ts`（仅当 helper / 单测隔离不足时）
- `apps/server/tests/search.test.ts`（仅当需要适配显式 helper 参数或新增最小回归断言）
- `apps/server/tests/admin-logs.test.ts`（仅当需要适配显式 helper 参数）
- `apps/server/tests/admin-reports.test.ts`（仅当需要适配显式 helper 参数）
- `apps/server/tests/content-closure.test.ts`（仅当需要适配显式 helper 参数）

#### forbidden_paths
- `apps/server/src/modules/auth/**`
- `apps/server/src/app.ts`
- `apps/server/src/lib/cors-origins.ts`
- `apps/server/src/openapi/**`
- `packages/db/**`
- `packages/schemas/**`
- `packages/http-client/**`
- `packages/shared/**`
- `.env.example`
- `README.md`
- `apps/web/**`
- `apps/admin/**`
- `docker/**`

#### dependencies
- `TASK-003` 的 admin 登录契约断言。
- 已知诊断摘要中的并发改密污染窗口。
- 现有 test-state reset / seed helper 行为。

#### acceptance_criteria
- `loginAdmin()` 默认行为不再在并发改密窗口中使用已失效的共享 admin 密码。
- 改密测试不再改变其它测试依赖的共享 admin 登录前提，或变更被限制在该测试自己的隔离主体内。
- `loginAdmin()` 失败时错误信息包含 HTTP status 和 response body。
- `bun test apps/server/tests/auth.test.ts` 通过。
- `bun test apps/server/tests/search.test.ts -t "caps admin search results"` 通过。
- 至少一次组合运行 `auth.test.ts` 与一个依赖 `loginAdmin()` 的 server 测试文件时通过，用于覆盖并发/顺序污染窗口。

#### test_strategy
tdd

#### validation_commands
- `bun test apps/server/tests/auth.test.ts`
- `bun test apps/server/tests/search.test.ts -t "caps admin search results"`
- `bun test apps/server/tests/auth.test.ts apps/server/tests/search.test.ts`
- `bun test apps/server/tests/admin-logs.test.ts apps/server/tests/admin-reports.test.ts apps/server/tests/content-closure.test.ts`

#### rollback_notes
- 若 helper 改动导致多个测试调用点大面积适配，应优先回滚为更小方案，例如只隔离改密测试主体。
- 若必须进入 `packages/db/**` 或生产 auth，立即停止并提交 plan patch，不保留越界修改。

#### handoff_notes
- 向 `review_qa` 明确说明最终选择的隔离策略：隔离测试主体、显式凭据、helper 调整、test-state 调整中的哪一种。
- 记录是否触碰 `test-state.ts`；若触碰，说明为什么 helper 层无法解决。

#### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置、生产 auth 语义，必须先回编排者，不得直接修改。

### Execution Packet 3

#### task_id
TASK-007

#### task_name
针对性回归验证

#### owner
backend_test_worker

#### objective
用针对性 server/auth/admin/search 测试证明 admin 登录红灯已被本轮测试隔离修复覆盖。

#### in_scope
- 运行改密相关测试文件。
- 运行已知受害测试 `search.test.ts -t "caps admin search results"`。
- 运行依赖 `loginAdmin()` 的 admin logs、reports、content closure 测试集合。
- 运行根级 `bun run test` 并记录结果。

#### out_of_scope
- 不修改文件。
- 不跳过失败测试。
- 不修复本轮范围外失败。

#### input_documents
- requirements: `docs/requirements/2026-04-25-server-admin-login-test-red-requirements.md`
- tasks: `docs/tasks/2026-04-25-server-admin-login-test-red-tasks.md`
- plan: `docs/plans/2026-04-25-server-admin-login-test-red-plan.md`

#### allowed_paths
- 不允许修改文件；只允许运行命令并在实现交付记录中写结果。

#### forbidden_paths
- `apps/**`
- `packages/**`
- `docker/**`
- `.env.example`
- `README.md`

#### dependencies
- `TASK-003` 与 `TASK-004` 已完成。
- 当前工作区已包含本轮测试修复 diff。

#### acceptance_criteria
- 记录每条验证命令、退出码和关键结果。
- 相关 server/auth/admin/search 测试通过，或失败被明确归类为本轮外问题。
- 根级 `bun run test` 已运行并记录结果。
- 若根级测试仍红，记录剩余失败文件、失败断言、是否仍与 admin-login 凭据漂移有关。

#### test_strategy
test_after

#### validation_commands
- `bun test apps/server/tests/auth.test.ts`
- `bun test apps/server/tests/search.test.ts -t "caps admin search results"`
- `bun test apps/server/tests/auth.test.ts apps/server/tests/search.test.ts`
- `bun test apps/server/tests/admin-logs.test.ts apps/server/tests/admin-reports.test.ts apps/server/tests/content-closure.test.ts`
- `bun run test`

#### rollback_notes
- 验证任务不产生代码 diff；如验证失败，回到 `TASK-004` 修复或触发 plan patch。

#### handoff_notes
- 将命令输出摘要提供给 `TASK-008` 和 `review_qa`。
- 特别标注是否还出现 `INVALID_CREDENTIALS` 或 admin 路由 `401`。

#### escalation_rule
如验证显示必须变更 DB/env/CORS/OpenAPI/upload policy 或生产 auth，停止并回编排者，不得直接修改。

### Execution Packet 4

#### task_id
TASK-008

#### task_name
根级质量门验证

#### owner
backend_test_worker

#### objective
按仓库收尾要求运行 lint、typecheck、build，并记录是否存在本轮范围外阻塞。

#### in_scope
- 运行 `bun run lint`。
- 运行 `bun run typecheck`。
- 运行 `bun run build`。
- 记录命令结果和任何剩余阻塞。

#### out_of_scope
- 不修复 lint/typecheck/build 中与本轮无关的问题。
- 不调整配置、依赖或脚本来规避失败。
- 不提交代码或创建分支。

#### input_documents
- requirements: `docs/requirements/2026-04-25-server-admin-login-test-red-requirements.md`
- tasks: `docs/tasks/2026-04-25-server-admin-login-test-red-tasks.md`
- plan: `docs/plans/2026-04-25-server-admin-login-test-red-plan.md`

#### allowed_paths
- 不允许修改文件；只允许运行命令并在实现交付记录中写结果。

#### forbidden_paths
- `apps/**`
- `packages/**`
- `docker/**`
- `.env.example`
- `README.md`

#### dependencies
- `TASK-007` 已运行；若 `bun run test` 因本轮外问题阻塞，需在本任务记录阻塞原因。

#### acceptance_criteria
- `bun run lint` 已运行并记录结果。
- `bun run typecheck` 已运行并记录结果。
- `bun run build` 已运行并记录结果。
- 若任一命令失败，记录失败是否由本轮修改引入；不得宣称质量门全绿。

#### test_strategy
test_after

#### validation_commands
- `bun run lint`
- `bun run typecheck`
- `bun run build`

#### rollback_notes
- 验证任务不产生代码 diff；如失败由本轮修改引入，回到对应实现任务修复。

#### handoff_notes
- 将质量门结果提供给 `review_qa`。
- 若存在本轮外阻塞，列出最小复现命令与失败摘要。

#### escalation_rule
如质量门失败需要修改根配置、依赖、构建脚本或共享契约，停止并回编排者，不得直接修改。

## 14. plan patch / contract change request 触发条件

以下任一情况出现时，`backend_test_worker` 必须停止当前实现并回到编排者，不得继续扩大范围：

- 需要修改 `packages/db/**`、DB schema、migration、通用 seed 语义或 auth fixture 语义。
- 需要修改 `.env.example`、根 `README.md`、任意 env 默认值、CORS、OpenAPI、upload policy。
- 需要修改 `apps/server/src/modules/auth/**` 或任何生产 auth 语义。
- 需要全局改变测试运行并发策略、根级 `package.json` 脚本、Bun/Vitest 配置。
- 需要调整共享契约、路由常量、请求/响应类型或 `packages/*`。
- 发现已知诊断不成立，根因不是 admin 密码漂移窗口，而是 seed/hash/session 生产行为缺陷。

## 15. 推荐的下一步

1. 编排者 spawn `backend_test_worker`，传递本计划中的 Execution Packet 1–4。
2. `backend_test_worker` 先输出 Execution Acknowledgement，再按 TDD 顺序执行 `TASK-003` 与 `TASK-004`。
3. 修复完成后执行 `TASK-007` / `TASK-008` 验证并产出实现交付记录。
4. 有意义变更完成后 spawn `review_qa`，重点审查未削弱生产 admin auth、未越界修改 DB/env/CORS/OpenAPI/upload-policy/文档、验证结果可追溯。
