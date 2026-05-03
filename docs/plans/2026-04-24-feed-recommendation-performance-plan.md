# 信息流推荐算法与性能优化阶段 3 执行计划

## 1. 需求文档路径

- `docs/requirements/2026-04-24-feed-recommendation-performance-requirements.md`

## 2. 任务文档路径

- `docs/tasks/2026-04-24-feed-recommendation-performance-tasks.md`

## 3. 规划前 Gate B 自检

Gate B 结论：通过，可进入阶段 3 执行规划。

| Gate B 条件 | 核对结果 |
|---|---|
| 任务 ID 完整 | 已覆盖 `TASK-001` 至 `TASK-012`，均为 `TASK-XXX` 格式。 |
| 任务名称完整 | 任务分解列表中每项均有名称。 |
| 类型完整 | 任务表与 TDD 分类中标注了 `TDD`、`后端实现`、`前端实现`、`集成验证`、`直接开发`、`验证` 等类型；执行计划进一步映射到前端/后端/测试/巡检 owner。 |
| 优先级完整 | 已标注 `P0`、`P1`、`P2`。 |
| 完成标准完整 | 任务表每项均给出可验收完成标准。 |
| DDD 分类完整 | 任务文档第 4 节已标注需要 DDD、不需要完整 DDD 但需遵守领域边界的任务。 |
| TDD / test_after / manual_only 分类完整 | 任务文档第 5 节已标注必须 TDD、可直接开发与验证建议；本计划为每个 Execution Packet 指定 `test_strategy`。 |
| 风险任务已标注 | 任务文档第 6 节列出 `TASK-003`、`TASK-004`、`TASK-005`、`TASK-006`、`TASK-007`、`TASK-008`、`TASK-009`、`TASK-011` 风险。 |
| 文件所有权 / 共享路径提醒已写明 | 任务文档第 7 节已标注 server、web、packages、DB、env 与文档边界。 |

## 4. 当前轮次目标

阶段 3 产出可直接交给编排者 spawn 的执行计划：优先锁定并修复推荐排序、cursor 与深翻分页稳定性，再推进后端性能收敛和前端加载体验优化，最后完成飞友圈回归、共享契约巡检与全量验证。

## 5. 当前轮次范围

### 范围内

- 后端推荐排序基线、cursor 兼容、seek 分页、深翻候选集、SQL 分数/TS 排序边界、多样性策略、查询字段与计数开销收敛。
- 首页推荐流与飞友圈推荐流现有能力回归。
- 首页 `useInfiniteQuery` 缓存/占位数据优化与虚拟列表加载触发/重试行为优化。
- 兼容性巡检、针对性测试与根级验证命令。

### 范围外

- 不新增 ML 服务、向量检索、训练任务或外部推荐依赖。
- 不改变 API 路径、鉴权模型、公开请求/响应字段形状。
- 默认不修改 `packages/schemas`、`packages/http-client`、`packages/shared`、`packages/db`、DB migrations。
- 不重做 UI 视觉风格，不扩展新内容类型。
- 不修改 `.env.example`、根 `README.md`、CORS / OpenAPI 默认行为，除非触发 contract change request 并经主会话确认。

## 6. 完成标准

- `TASK-001` 至 `TASK-012` 均有明确 owner、允许/禁止路径、依赖、验收标准、测试策略与升级规则。
- 后端推荐分页保持 API 形状兼容，cursor 与实际排序键一致，深翻不再被固定候选窗口截断，且不退化为全量内存排序。
- 前端首页查询缓存/占位行为可测试，Tab / 分类 queryKey 不串数据；虚拟列表在请求中、已请求、无下一页、错误重试场景不重复触发。
- 共享契约、DB schema/migration、env、CORS/OpenAPI 均保持默认不变；若必须变更，已有 plan patch / contract change request 触发条件。
- 实现完成后进入 `review_qa` 前，至少提供针对性测试与根级 `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build` 的结果或阻塞说明。

## 7. 是否需要先查阅 repo_explorer / docs_researcher

- `repo_explorer`：本轮不强制。任务文档与当前代码定位已覆盖关键入口；若实现者发现 `posts.repo.ts`、`posts.service.ts`、`home-page.tsx`、`virtual-feed-runtime.tsx` 的调用链与计划不符，应暂停并请求编排者补一次只读 `repo_explorer`。
- `docs_researcher`：本轮不强制。不引入新库；前端仅调整现有 React Query 使用。若实现者无法从仓内现有模式确认 `placeholderData` / `keepPreviousData` 语义，应先请求编排者安排文档研究，不得凭空升级依赖或改全局配置。

## 8. 执行代理分工

| 执行包 | 覆盖任务 | owner | 说明 |
|---|---|---|---|
| BE-R1 | `TASK-001`、`TASK-002`、`TASK-003`、`TASK-004` | `backend_implementer` | P0 后端 TDD + 实现，必须单代理串行，避免 `posts.repo.ts` / `posts.service.ts` / server tests 冲突。 |
| BE-R2 | `TASK-005`、`TASK-006`、`TASK-007` | `backend_implementer` | P1 后端排序模型、多样性与查询成本，依赖 BE-R1 通过。 |
| FE-R2A | `TASK-008` | `frontend_state_worker` | 首页查询缓存、占位数据与分页参数，仅状态/数据层优化。 |
| FE-R2B | `TASK-009` | `frontend_implementer` | 虚拟列表触发状态 + 组件测试，涉及组件行为与测试。 |
| BE-R3 | `TASK-010` | `backend_implementer` | 飞友圈推荐流回归，依赖 BE-R1 与 BE-R2 后端行为稳定。 |
| QA-R3 | `TASK-011`、`TASK-012` | `review_qa` | 共享契约巡检、验证结果与交付审查；不改业务代码。 |

## 9. 共享区域改动归属

| 共享/高风险区域 | 唯一责任方 | 本轮策略 |
|---|---|---|
| `apps/server/src/modules/posts/posts.repo.ts` | `backend_implementer` | 仅 BE-R1/BE-R2 可改；禁止其他代理并行写入。 |
| `apps/server/src/modules/posts/posts.service.ts` | `backend_implementer` | 仅 BE-R1/BE-R2 可改；cursor 编解码必须保持兼容。 |
| `apps/server/src/modules/posts/feed-recommendation.ts` | `backend_implementer` | 仅 BE-R1/BE-R2 可改；默认作为纯算法基线与测试目标，除非能证明不会破坏 cursor，否则不得直接引入服务端分页链路。 |
| `apps/server/tests/posts.test.ts`、`apps/server/tests/posts-recommended-window.test.ts` | `backend_implementer` | BE-R1/BE-R2/BE-R3 串行修改，禁止 backend_test_worker 并行写入。 |
| `apps/web/src/routes/home-page.tsx`、`apps/web/src/lib/home-feed-query.ts`、`apps/web/src/lib/feed-pagination.ts` | `frontend_state_worker` | TASK-008 唯一写入；若必须改共享分页 helper，需同步运行前端分页测试并记录兼容性。 |
| `apps/web/src/components/virtual-feed.tsx`、`apps/web/src/components/virtual-feed-runtime.tsx` | `frontend_implementer` | TASK-009 唯一写入；不得顺手调整视觉布局。 |
| `packages/schemas`、`packages/http-client`、`packages/shared` | `review_qa` 巡检，默认所有实现代理禁止修改 | 仅允许读取核对；如必须改公开契约，先提交 contract change request。 |
| `packages/db`、DB migrations | 无默认修改责任方 | 默认禁止修改；如需要索引/schema 支撑，先提交 plan patch 与主会话确认。 |
| `.env.example`、根 `README.md`、CORS/OpenAPI 默认行为 | 无默认修改责任方 | 默认禁止修改；仅 contract change request 通过后再指定唯一责任方。 |

## 10. 并行 / 串行策略

### 必须串行

1. `TASK-001` → `TASK-002` → `TASK-003` → `TASK-004`：先锁定排序和 cursor 契约，再改 seek 分页与深翻窗口。
2. `TASK-003` → `TASK-004`：两者都触碰推荐分页查询与 cursor，必须同一 owner 串行。
3. `TASK-005` → `TASK-006` → `TASK-007`：先定 SQL/TS 排序职责，再安全化多样性，最后收敛查询字段与计数开销。
4. `TASK-010` 必须在 BE-R1 与 BE-R2 后执行，避免飞友圈回归基于过时排序规则。
5. `TASK-011`、`TASK-012` 必须在全部实现包完成后执行。

### 可并行

- `TASK-008` 与 `TASK-009` 可在 BE-R1 通过后并行执行；二者分别锁定首页查询文件与虚拟列表文件，不共享写入路径。
- `TASK-008` / `TASK-009` 可与 BE-R2 并行执行，前提是 BE-R1 已确认 API 形状与 cursor 兼容；若 BE-R2 提出 contract change request，前端任务必须暂停合并。

### 本轮可合并实现

- 合并包 BE-R1：`TASK-001`、`TASK-002`、`TASK-003`、`TASK-004` 由同一 `backend_implementer` 按 TDD 顺序完成。
- 合并包 BE-R2：`TASK-005`、`TASK-006`、`TASK-007` 由同一 `backend_implementer` 完成，避免排序/多样性/查询优化互相覆盖。
- 合并包 QA-R3：`TASK-011`、`TASK-012` 由 `review_qa` 在最终审查中合并处理。

### 不建议合并

- `TASK-008` 不与 `TASK-009` 合并；二者可并行但 owner 不同，避免首页查询状态与虚拟列表触发逻辑互相牵连。
- `TASK-010` 不并入 BE-R2；它应作为后端行为稳定后的跨内容类型回归。

## 11. 风险提醒

- `posts.service.ts` 已有 recommended cursor：`score + recommendationNow + publishedAt + id`；任何 cursor 调整必须保持旧 cursor/异常 cursor 兼容策略与响应字段形状。
- `posts.repo.ts` 已有 `scored_feed` CTE、seek 条件与 `limit(input.limit)`；实现不得退化为全量拉取后内存排序。
- `feed-recommendation.ts` 当前 TS 排序只被 tests 引用；本计划默认保留为纯算法测试基线。若实现者要把它引入 service/repo 链路，必须先证明 cursor 键与最终跨页顺序一致，否则触发 plan patch。
- 多样性策略只能影响当前页展示顺序，或必须证明与 cursor 稳定顺序一致；无法证明时回退主会话确认。
- `placeholderData` 与 queryKey 变更必须覆盖 Tab / 分类隔离，避免首页推荐流串页。
- `virtual-feed-runtime.tsx` 已有 `isLoadRequestedRef` 锁；实现必须确认错误/请求完成后释放，且瀑布流只由首列触发加载。

## 12. 实现者交接信息

- 所有实现代理开工前必须先输出 Execution Acknowledgement，确认理解对应 Execution Packet、allowed_paths、forbidden_paths、dependencies 与 escalation_rule。
- 后端实现代理应优先阅读 `apps/server/src/modules/posts/feed-recommendation.ts`、`apps/server/src/modules/posts/posts.repo.ts`、`apps/server/src/modules/posts/posts.service.ts`、相关 tests，再修改。
- 前端实现代理应优先阅读 `apps/web/src/routes/home-page.tsx`、`apps/web/src/lib/home-feed-query.ts`、`apps/web/src/lib/feed-pagination.ts`、`apps/web/src/components/virtual-feed.tsx`、`apps/web/src/components/virtual-feed-runtime.tsx` 与相关 tests。
- 禁止在 `apps/*` 重复定义应属于 `packages/*` 的结构；默认不改共享包。若发现必须改公开类型、路由常量、DB schema/migration、env 或 CORS/OpenAPI 默认行为，立即暂停并回编排者。
- 每个实现包完成后需产出简短实现说明：变更文件、测试命令与结果、是否触及共享契约、未解决风险。

## 13. Execution Packets

### Execution Packet: TASK-001

#### task_id
TASK-001

#### task_name
推荐排序规则基线测试补齐

#### owner
backend_implementer

#### objective
以测试锁定推荐排序规则基线，覆盖互动、时效、质量、关注关系、内容类型、已互动降权与举报降权。

#### in_scope
- 扩展 `apps/server/tests` 中推荐排序相关测试。
- 以 `rankFeedItemsByRecommendation` / 现有推荐排序语义为基线组织断言。
- 测试可锁定现有行为或暴露缺口，但不得在本任务中修改业务实现。

#### out_of_scope
- 不修改 `apps/server/src/modules/posts/*.ts` 实现。
- 不调整 SQL 排序、cursor、DB schema 或 API 契约。
- 不新增外部服务或测试依赖。

#### input_documents
- requirements: `docs/requirements/2026-04-24-feed-recommendation-performance-requirements.md`
- tasks: `docs/tasks/2026-04-24-feed-recommendation-performance-tasks.md`
- plan: `docs/plans/2026-04-24-feed-recommendation-performance-plan.md`

#### allowed_paths
- `apps/server/tests/posts.test.ts`
- `apps/server/tests/posts-recommended-window.test.ts`
- `apps/server/tests/**/*.test.ts`（仅当现有文件无法承载基线测试时新增 posts 推荐相关测试）

#### forbidden_paths
- `apps/server/src/modules/posts/feed-recommendation.ts`
- `apps/server/src/modules/posts/posts.repo.ts`
- `apps/server/src/modules/posts/posts.service.ts`
- `packages/schemas/**`
- `packages/http-client/**`
- `packages/shared/**`
- `packages/db/**`

#### dependencies
- 依赖现有推荐排序 helper 与 server test harness。
- 后续 `TASK-003`、`TASK-005`、`TASK-006` 使用本任务测试作为回归基线。

#### acceptance_criteria
- 测试覆盖互动、时效、质量、关注关系、内容类型、已互动降权、举报降权至少一组明确断言。
- 测试不依赖外部网络、外部 ML 服务或真实第三方服务。
- 针对性 server posts 测试可运行并给出通过结果，或在 TDD 阶段给出预期失败说明供后续任务修复。

#### test_strategy
tdd

#### handoff_notes
- 后续实现不得为了通过测试改变公开 API 形状。
- review_qa 应核对测试命名是否表达推荐领域规则，而非只检查具体数值。

#### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

### Execution Packet: TASK-002

#### task_id
TASK-002

#### task_name
推荐 cursor 契约与兼容性测试

#### owner
backend_implementer

#### objective
用测试锁定推荐 cursor 包含分数、发布时间、ID、锚点时间，并保持旧 cursor / 异常 cursor 兼容策略。

#### in_scope
- 扩展后端推荐流 cursor 编解码、响应 `nextCursor` 与异常输入测试。
- 覆盖 cursor 与推荐排序键的对应关系。
- 必要时扩展 `apps/web/tests/feed-pagination.test.ts`，验证前端 `getNextPageParam` 对新旧 cursor 响应保持兼容。

#### out_of_scope
- 不改变公开请求/响应字段形状。
- 不修改 `packages/schemas`、`packages/http-client`、`packages/shared`。
- 不引入新 cursor 版本导致旧客户端不可用。

#### input_documents
- requirements: `docs/requirements/2026-04-24-feed-recommendation-performance-requirements.md`
- tasks: `docs/tasks/2026-04-24-feed-recommendation-performance-tasks.md`
- plan: `docs/plans/2026-04-24-feed-recommendation-performance-plan.md`

#### allowed_paths
- `apps/server/tests/posts.test.ts`
- `apps/server/tests/posts-recommended-window.test.ts`
- `apps/web/tests/feed-pagination.test.ts`（仅添加 cursor 兼容测试；不得改前端实现）

#### forbidden_paths
- `apps/server/src/modules/posts/posts.service.ts`（本任务只写测试；实现留给 `TASK-003`）
- `apps/server/src/modules/posts/posts.repo.ts`
- `apps/web/src/lib/feed-pagination.ts`
- `packages/schemas/**`
- `packages/http-client/**`
- `packages/shared/**`
- `packages/db/**`

#### dependencies
- 依赖 `TASK-001` 的后端推荐测试上下文。
- 后续 `TASK-003` 必须让本任务测试通过。

#### acceptance_criteria
- 测试断言推荐 cursor 至少包含 score、recommendationNow、publishedAt、id 所需信息或等效兼容表示。
- 测试覆盖旧 cursor 或异常 cursor 的现有兼容策略，不产生 500 类非预期错误。
- 测试确认响应字段形状不变。

#### test_strategy
tdd

#### handoff_notes
- 前端分页兼容测试仅验证消费端不被新旧 cursor 破坏，不得引入新的前端请求契约。
- 如果测试显示当前 cursor 契约无法兼容旧值，需在 `TASK-003` 处理前回编排者确认兼容策略。

#### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

### Execution Packet: TASK-003

#### task_id
TASK-003

#### task_name
推荐 seek 分页稳定性实现

#### owner
backend_implementer

#### objective
实现推荐流以分数、发布时间、ID 为稳定顺序键的 seek 分页，保证新增头部高分内容后下一页不重复、不漏翻。

#### in_scope
- 调整 `posts.service.ts` 中 recommended cursor 解析/生成逻辑，保持 API 形状兼容。
- 调整 `posts.repo.ts` 推荐流 seek 条件，使 cursor 绑定实际排序键。
- 让 `TASK-001`、`TASK-002` 测试通过，并新增/补齐新增头部内容后的跨页稳定性测试。

#### out_of_scope
- 不改 API 路径、请求/响应字段名或共享 schema。
- 不做全量内存排序替代数据库 seek。
- 不修改 DB schema、migration 或新增索引。

#### input_documents
- requirements: `docs/requirements/2026-04-24-feed-recommendation-performance-requirements.md`
- tasks: `docs/tasks/2026-04-24-feed-recommendation-performance-tasks.md`
- plan: `docs/plans/2026-04-24-feed-recommendation-performance-plan.md`

#### allowed_paths
- `apps/server/src/modules/posts/posts.service.ts`
- `apps/server/src/modules/posts/posts.repo.ts`
- `apps/server/src/modules/posts/feed-recommendation.ts`（仅当需要同步纯算法边界测试 helper；不得未经证明引入分页链路）
- `apps/server/tests/posts.test.ts`
- `apps/server/tests/posts-recommended-window.test.ts`

#### forbidden_paths
- `packages/schemas/**`
- `packages/http-client/**`
- `packages/shared/**`
- `packages/db/**`
- `apps/web/**`
- `.env.example`
- `README.md`

#### dependencies
- 依赖 `TASK-001`、`TASK-002` 的测试基线。
- 依赖现有 recommended cursor：score + recommendationNow + publishedAt + id。

#### acceptance_criteria
- 推荐流分页以分数、发布时间、ID 或等效稳定键排序和 seek。
- 在第一页后插入新的头部高分内容后，使用原 `nextCursor` 请求下一页不重复、不漏翻。
- `nextCursor` 与现有 API 形状兼容，旧 cursor / 异常 cursor 测试仍符合兼容策略。
- 查询不退化为拉取全量再内存排序。

#### test_strategy
tdd

#### handoff_notes
- `feed-recommendation.ts` 默认仍作为纯算法测试基线；若要引入 service，必须在实现说明中证明 cursor 键与最终展示顺序一致。
- review_qa 需重点检查 SQL order by、cursor encode/decode、seek where 条件三者是否一致。

#### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

### Execution Packet: TASK-004

#### task_id
TASK-004

#### task_name
深翻候选集查询去固定窗口截断

#### owner
backend_implementer

#### objective
移除推荐深翻被固定候选窗口截断的行为，同时保持每页只读取最小必要候选集。

#### in_scope
- 调整推荐候选查询，避免固定 200 条窗口导致深翻截断。
- 扩展 `posts-recommended-window` 深翻测试到跨多页数据。
- 保持 `scored_feed` / seek / `limit + 1` 或等效最小窗口策略。

#### out_of_scope
- 不改 DB schema、migration 或新增索引。
- 不以全量拉取后内存排序替代分页查询。
- 不改变响应字段形状。

#### input_documents
- requirements: `docs/requirements/2026-04-24-feed-recommendation-performance-requirements.md`
- tasks: `docs/tasks/2026-04-24-feed-recommendation-performance-tasks.md`
- plan: `docs/plans/2026-04-24-feed-recommendation-performance-plan.md`

#### allowed_paths
- `apps/server/src/modules/posts/posts.repo.ts`
- `apps/server/src/modules/posts/posts.service.ts`
- `apps/server/tests/posts-recommended-window.test.ts`
- `apps/server/tests/posts.test.ts`

#### forbidden_paths
- `packages/db/**`
- `packages/schemas/**`
- `packages/http-client/**`
- `packages/shared/**`
- `apps/web/**`
- `.env.example`
- `README.md`

#### dependencies
- 依赖 `TASK-003` 的稳定 seek 分页顺序。
- 依赖现有 posts 推荐深翻测试数据构造能力。

#### acceptance_criteria
- 推荐分页不再因固定 200 条候选窗口在深翻时提前结束。
- 跨多页推荐数据测试能稳定取到后续页面，且页面间不重复。
- 每页查询保持 `limit + 1` 或实现所需最小候选窗口，不出现全量候选加载。

#### test_strategy
tdd

#### handoff_notes
- 如果查询计划显示必须新增索引才能达成性能目标，不得直接改 `packages/db`，应提交 plan patch。
- review_qa 应检查是否存在隐藏的硬编码窗口常量。

#### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

### Execution Packet: TASK-005

#### task_id
TASK-005

#### task_name
SQL 侧分数与 TS 重排模型对齐

#### owner
backend_implementer

#### objective
明确 SQL `recommendationBaseScore` 与 TS `rankFeedItemsByRecommendation` 的职责边界，避免分数漂移破坏跨页分页。

#### in_scope
- 梳理并最小调整 SQL 评分与 TS 排序 helper 的边界。
- 新增分数一致性或边界测试，证明 cursor 分数、SQL 排序与 TS 基线不导致跨页重复。
- 在实现说明中记录 TS helper 是否仍仅用于测试基线，或若引入 service，说明不破坏 cursor 的证明。

#### out_of_scope
- 不新增复杂 ML 模型或外部评分服务。
- 不改变公开响应中的分数字段形状。
- 不引入跨页内存重排。

#### input_documents
- requirements: `docs/requirements/2026-04-24-feed-recommendation-performance-requirements.md`
- tasks: `docs/tasks/2026-04-24-feed-recommendation-performance-tasks.md`
- plan: `docs/plans/2026-04-24-feed-recommendation-performance-plan.md`

#### allowed_paths
- `apps/server/src/modules/posts/feed-recommendation.ts`
- `apps/server/src/modules/posts/posts.repo.ts`
- `apps/server/src/modules/posts/posts.service.ts`
- `apps/server/tests/posts.test.ts`
- `apps/server/tests/posts-recommended-window.test.ts`

#### forbidden_paths
- `packages/schemas/**`
- `packages/http-client/**`
- `packages/shared/**`
- `packages/db/**`
- `apps/web/**`

#### dependencies
- 依赖 `TASK-003`、`TASK-004` 已稳定的分页键和深翻行为。
- 依赖 `TASK-001` 的排序基线测试。

#### acceptance_criteria
- 文档化在实现说明中说明 SQL 分数与 TS 重排各自职责。
- 同一输入下 cursor 分数与分页顺序不会因 TS 重排产生跨页重复或漏翻。
- 新增或更新测试覆盖 SQL/TS 分数边界一致性。

#### test_strategy
tdd

#### handoff_notes
- 默认推荐方案：SQL 负责分页候选稳定序，TS helper 保持纯算法测试基线；只有能证明 cursor 稳定时才允许引入运行链路。
- review_qa 应重点审查是否存在“先按 SQL 分页、再跨页 TS 重排”的隐性行为。

#### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

### Execution Packet: TASK-006

#### task_id
TASK-006

#### task_name
作者/分类多样性策略安全化

#### owner
backend_implementer

#### objective
让作者/分类多样性策略只影响安全边界内的展示顺序，或证明其与 cursor 稳定顺序一致。

#### in_scope
- 为同作者/同分类连续曝光下降补齐测试。
- 确保多样性惩罚不破坏跨页 cursor 顺序。
- 必要时将多样性限制为当前页内展示层策略，并保留跨页稳定分页顺序。

#### out_of_scope
- 不改变推荐 API 形状。
- 不引入用户级长期曝光状态表或新持久化结构。
- 不修改 DB schema / migration。

#### input_documents
- requirements: `docs/requirements/2026-04-24-feed-recommendation-performance-requirements.md`
- tasks: `docs/tasks/2026-04-24-feed-recommendation-performance-tasks.md`
- plan: `docs/plans/2026-04-24-feed-recommendation-performance-plan.md`

#### allowed_paths
- `apps/server/src/modules/posts/feed-recommendation.ts`
- `apps/server/src/modules/posts/posts.repo.ts`
- `apps/server/src/modules/posts/posts.service.ts`
- `apps/server/tests/posts.test.ts`
- `apps/server/tests/posts-recommended-window.test.ts`

#### forbidden_paths
- `packages/db/**`
- `packages/schemas/**`
- `packages/http-client/**`
- `packages/shared/**`
- `apps/web/**`

#### dependencies
- 依赖 `TASK-005` 对 SQL/TS 职责边界的结论。
- 依赖 `TASK-003` 的 cursor 稳定性测试。

#### acceptance_criteria
- 同作者/同分类连续曝光下降有可执行测试覆盖。
- 跨页分页仍按稳定 cursor 不重复、不漏翻。
- 实现说明明确多样性影响范围：当前页展示顺序或与 cursor 一致的稳定排序。

#### test_strategy
tdd

#### handoff_notes
- 若无法证明多样性与 cursor 稳定顺序一致，必须选择“页内展示重排”或回退编排者确认。
- review_qa 应核对多样性逻辑是否改变 `nextCursor` 所依据的排序锚点。

#### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

### Execution Packet: TASK-007

#### task_id
TASK-007

#### task_name
推荐查询字段与计数开销收敛

#### owner
backend_implementer

#### objective
收敛推荐候选查询字段和无效计数开销，同时保持现有响应详情完整。

#### in_scope
- 审查并最小调整推荐候选阶段字段选择。
- 避免推荐流无效全量 count。
- 确保 `contentHtml` 等详情字段仍通过既有分页内容补取流程提供。
- 补充或复用测试验证分页行为与响应完整性。

#### out_of_scope
- 不删除响应所需字段。
- 不改共享 schema / http-client 类型。
- 不改 DB schema / migration / seed。

#### input_documents
- requirements: `docs/requirements/2026-04-24-feed-recommendation-performance-requirements.md`
- tasks: `docs/tasks/2026-04-24-feed-recommendation-performance-tasks.md`
- plan: `docs/plans/2026-04-24-feed-recommendation-performance-plan.md`

#### allowed_paths
- `apps/server/src/modules/posts/posts.repo.ts`
- `apps/server/src/modules/posts/posts.service.ts`
- `apps/server/tests/posts.test.ts`
- `apps/server/tests/posts-recommended-window.test.ts`

#### forbidden_paths
- `packages/schemas/**`
- `packages/http-client/**`
- `packages/shared/**`
- `packages/db/**`
- `apps/web/**`

#### dependencies
- 依赖 `TASK-003`、`TASK-004`、`TASK-005`、`TASK-006` 后端行为稳定。
- 依赖现有响应完整性测试或新增测试。

#### acceptance_criteria
- 推荐候选阶段只读取排序、过滤、回表所需字段。
- 推荐流不执行无意义全量 count，或实现说明解释保留 count 的必要性。
- 响应详情字段保持现有可用性，尤其不丢失 `contentHtml` 等既有消费字段。

#### test_strategy
test_after

#### handoff_notes
- 性能优化不得掩盖分页 bug；如测试失败，应先回查 `TASK-003` / `TASK-004` 行为。
- review_qa 应重点核对字段裁剪是否只发生在候选阶段。

#### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

### Execution Packet: TASK-008

#### task_id
TASK-008

#### task_name
首页 `useInfiniteQuery` 缓存与占位数据优化

#### owner
frontend_state_worker

#### objective
优化首页信息流 React Query 缓存、占位数据和分页参数，减少切换闪烁且不串页。

#### in_scope
- 为首页信息流设置合理 `staleTime`、`gcTime`、`placeholderData`、`getNextPageParam`。
- 确认 queryKey 包含 feed tab 与 category slug 等隔离维度。
- 新增轻量测试或抽取 helper，覆盖缓存参数、占位数据与 Tab / 分类切换隔离。

#### out_of_scope
- 不重做 UI 视觉结构。
- 不修改后端 API 或共享契约。
- 不改全局 QueryClient 默认配置，除非先回编排者确认。

#### input_documents
- requirements: `docs/requirements/2026-04-24-feed-recommendation-performance-requirements.md`
- tasks: `docs/tasks/2026-04-24-feed-recommendation-performance-tasks.md`
- plan: `docs/plans/2026-04-24-feed-recommendation-performance-plan.md`

#### allowed_paths
- `apps/web/src/routes/home-page.tsx`
- `apps/web/src/lib/home-feed-query.ts`
- `apps/web/src/lib/feed-pagination.ts`
- `apps/web/tests/feed-pagination.test.ts`
- `apps/web/tests/**/*.test.ts`（仅新增首页查询行为相关测试）

#### forbidden_paths
- `apps/server/**`
- `apps/admin/**`
- `packages/schemas/**`
- `packages/http-client/**`
- `packages/shared/**`
- `packages/db/**`
- `.env.example`
- `README.md`

#### dependencies
- 依赖 BE-R1 确认 API 形状与 cursor 兼容。
- 可参考现有 models/rankings 的 `keepPreviousData` 模式，但不得盲目复制不适合首页 queryKey 的行为。

#### acceptance_criteria
- 首页信息流 query 明确配置 `staleTime`、`gcTime`、`placeholderData`、`getNextPageParam` 或等效可测试 helper。
- 切换 Tab / 分类时 queryKey 隔离，不展示错误分类的页面数据。
- 失败重试文案保持现有清晰度，不因占位数据吞掉错误态。

#### test_strategy
test_after

#### handoff_notes
- 如必须修改 `feed-pagination.ts`，需同步保证旧 cursor 与新 cursor 兼容测试通过。
- review_qa 应重点检查 `placeholderData` 是否造成跨 Tab 视觉串页。

#### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

### Execution Packet: TASK-009

#### task_id
TASK-009

#### task_name
虚拟列表加载触发锁定与重试体验

#### owner
frontend_implementer

#### objective
完善 `VirtualFeed` 加载触发锁定与错误重试，避免重复请求并保持列表/瀑布流行为一致。

#### in_scope
- 扩展 `virtual-feed.test.ts`，覆盖已请求锁定、请求中锁定、无下一页、错误后可重试。
- 覆盖普通列表与瀑布流路径，确保瀑布流只由首列触发加载。
- 最小调整 `virtual-feed.tsx` / `virtual-feed-runtime.tsx` 的加载锁释放逻辑。

#### out_of_scope
- 不重做虚拟列表视觉样式或布局算法。
- 不修改首页 query 缓存参数；该范围归 `TASK-008`。
- 不修改后端或共享契约。

#### input_documents
- requirements: `docs/requirements/2026-04-24-feed-recommendation-performance-requirements.md`
- tasks: `docs/tasks/2026-04-24-feed-recommendation-performance-tasks.md`
- plan: `docs/plans/2026-04-24-feed-recommendation-performance-plan.md`

#### allowed_paths
- `apps/web/src/components/virtual-feed.tsx`
- `apps/web/src/components/virtual-feed-runtime.tsx`
- `apps/web/tests/virtual-feed.test.ts`

#### forbidden_paths
- `apps/web/src/routes/home-page.tsx`
- `apps/web/src/lib/home-feed-query.ts`
- `apps/web/src/lib/feed-pagination.ts`
- `apps/server/**`
- `packages/**`
- `.env.example`
- `README.md`

#### dependencies
- 依赖现有 `isLoadRequestedRef` 锁语义。
- 可与 `TASK-008` 并行，但不得修改其 allowed paths。

#### acceptance_criteria
- `onLoadMore` 在已请求、正在请求、无下一页时不会重复触发。
- 错误态或请求完成后锁能释放，用户或运行时可重新触发加载。
- 瀑布流场景仅首列负责触发加载，测试覆盖列表与瀑布流两种路径。

#### test_strategy
tdd

#### handoff_notes
- review_qa 应重点检查加载锁是否因错误态永久卡住。
- 不得以移除锁的方式解决重试问题。

#### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

### Execution Packet: TASK-010

#### task_id
TASK-010

#### task_name
飞友圈推荐流回归覆盖

#### owner
backend_implementer

#### objective
补齐 moment / circle 推荐流在排序、分页、深翻与多样性上的回归覆盖，确认与 article 首页推荐流一致兼容。

#### in_scope
- 扩展后端推荐流测试，覆盖 moment / circle 内容类型。
- 验证排序、分页、深翻、多样性策略在飞友圈推荐流下不重复、不漏翻。
- 确认内容类型差异不改变 API 契约。

#### out_of_scope
- 不新增内容类型。
- 不修改前端飞友圈 UI。
- 不改 shared schema / http-client 类型。

#### input_documents
- requirements: `docs/requirements/2026-04-24-feed-recommendation-performance-requirements.md`
- tasks: `docs/tasks/2026-04-24-feed-recommendation-performance-tasks.md`
- plan: `docs/plans/2026-04-24-feed-recommendation-performance-plan.md`

#### allowed_paths
- `apps/server/tests/posts.test.ts`
- `apps/server/tests/posts-recommended-window.test.ts`
- `apps/server/src/modules/posts/posts.repo.ts`（仅当测试暴露内容类型过滤/排序实现缺口）
- `apps/server/src/modules/posts/posts.service.ts`（仅当测试暴露服务层分支缺口）

#### forbidden_paths
- `apps/web/**`
- `packages/schemas/**`
- `packages/http-client/**`
- `packages/shared/**`
- `packages/db/**`

#### dependencies
- 依赖 `TASK-003` 至 `TASK-006` 后端推荐排序与分页策略稳定。
- 依赖 `TASK-007` 不误删 moment / circle 所需响应字段。

#### acceptance_criteria
- moment / circle 推荐流与 article 首页推荐流均通过排序、分页、深翻、多样性相关测试。
- 内容类型差异不引入 API 契约变化。
- 如需要实现修复，修复仅限 posts 模块推荐流内容类型处理。

#### test_strategy
tdd

#### handoff_notes
- 此任务作为后端最终回归，不应再引入新的排序模型变更；若发现模型缺口，应回到对应 TASK-005/006 修复说明。
- review_qa 应核对 article 与 moment/circle 断言是否共享核心推荐语义。

#### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

### Execution Packet: TASK-011

#### task_id
TASK-011

#### task_name
兼容性与共享契约巡检

#### owner
review_qa

#### objective
确认本轮未破坏共享契约、公开 API 形状、CORS/OpenAPI 默认行为与 DB 结构边界。

#### in_scope
- 巡检 `packages/schemas`、`packages/http-client`、`packages/shared` 是否有非计划公开契约变更。
- 巡检 `packages/db`、migration、`.env.example`、根 `README.md` 是否被非计划修改。
- 核对 server / web 变更是否仍消费共享包而非在 app 内重复定义契约。
- 记录兼容性结论。

#### out_of_scope
- 不主动修改业务代码。
- 不批准共享契约变更。
- 不补做实现任务未完成的代码修复；发现问题应退回对应实现 owner。

#### input_documents
- requirements: `docs/requirements/2026-04-24-feed-recommendation-performance-requirements.md`
- tasks: `docs/tasks/2026-04-24-feed-recommendation-performance-tasks.md`
- plan: `docs/plans/2026-04-24-feed-recommendation-performance-plan.md`

#### allowed_paths
- `docs/review/**`（如需产出评审记录）
- `docs/implementation/**`（仅读取实现说明）
- 仅读取：`packages/schemas/**`
- 仅读取：`packages/http-client/**`
- 仅读取：`packages/shared/**`
- 仅读取：`packages/db/**`
- 仅读取：`apps/server/**`
- 仅读取：`apps/web/**`

#### forbidden_paths
- `apps/server/src/**`（禁止写入）
- `apps/web/src/**`（禁止写入）
- `packages/**`（禁止写入）
- `.env.example`
- `README.md`

#### dependencies
- 依赖所有实现任务完成并提交实现说明。
- 依赖 git diff 或等效文件变更清单。

#### acceptance_criteria
- 明确记录 `packages/schemas`、`packages/http-client`、`packages/shared` 未发生公开契约变更，或指出已触发 contract change request。
- 明确记录未修改 DB schema/migration、env、CORS/OpenAPI 默认行为，或指出违规变更。
- 若发现 app 内重复定义共享契约，退回对应实现任务。

#### test_strategy
manual_only

#### handoff_notes
- 这是评审/巡检任务，不是实现任务；如需代码修复，必须由编排者重新分配给对应 owner。
- 巡检结论应供 `TASK-012` 汇总。

#### escalation_rule
如发现共享契约、数据库结构、路由前缀、根配置被修改且未获计划批准，必须停止交付并回编排者处理。

### Execution Packet: TASK-012

#### task_id
TASK-012

#### task_name
验证命令与交付说明整理

#### owner
review_qa

#### objective
汇总针对性测试、根级验证命令与交付说明，确认可进入最终交付或指出阻塞。

#### in_scope
- 汇总并核对针对性测试：server posts 推荐测试、web feed/virtual 测试。
- 汇总根级验证命令：`bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`。
- 交付说明中记录未做 DB schema/migration、共享契约、env、CORS/OpenAPI 变更，或记录已触发并处理的变更请求。

#### out_of_scope
- 不直接修复验证失败。
- 不新增业务代码或测试。
- 不创建 git commit 或分支。

#### input_documents
- requirements: `docs/requirements/2026-04-24-feed-recommendation-performance-requirements.md`
- tasks: `docs/tasks/2026-04-24-feed-recommendation-performance-tasks.md`
- plan: `docs/plans/2026-04-24-feed-recommendation-performance-plan.md`
- review: `docs/review/**`（如 `TASK-011` 已产出）

#### allowed_paths
- `docs/review/**`（如需产出最终审查记录）
- `docs/implementation/**`（仅读取实现说明）
- 仅读取项目源码与测试文件

#### forbidden_paths
- `apps/**`（禁止写入）
- `packages/**`（禁止写入）
- `.env.example`
- `README.md`
- `bun.lockb`

#### dependencies
- 依赖 `TASK-011` 兼容性巡检结论。
- 依赖所有实现 owner 提供测试命令与结果。

#### acceptance_criteria
- 交付说明列出每条验证命令的结果；失败时列出失败命令、失败摘要与退回 owner。
- 明确记录本轮是否未变更 DB schema/migration、共享契约、env、CORS/OpenAPI 默认行为。
- 明确推荐下一步：可交付、退回某 owner 修复、或需要 plan patch / contract change request。

#### test_strategy
manual_only

#### handoff_notes
- 若根级命令耗时或环境缺依赖导致无法运行，必须记录具体阻塞，不得声称通过。
- 编排者最终交付前应以本任务输出作为证据。

#### escalation_rule
如发现验证失败或未批准的共享/DB/env 变更，必须停止交付并回编排者，不得直接修改。

## 14. plan patch / contract change request 触发条件

- 任何任务需要修改 `packages/schemas`、`packages/http-client`、`packages/shared` 的公开类型、路由常量、请求/响应契约。
- 任何任务需要修改 `packages/db`、schema、migration、seed、索引或根 `db:*` 脚本。
- 推荐 cursor 需要改变公开响应字段形状，或无法兼容旧 cursor / 异常 cursor 的现有策略。
- 实现者计划将 `rankFeedItemsByRecommendation` 引入 service/repo 运行链路，但无法证明最终展示顺序与 cursor 键一致。
- 去固定窗口后必须扩大到高成本全量扫描或全量内存排序才能通过测试。
- 多样性策略无法证明不破坏跨页 cursor 顺序，且不能限制在当前页展示层。
- `TASK-008` 需要修改全局 QueryClient、共享请求客户端或跨应用 package。
- `TASK-009` 需要改变 `VirtualFeed` 对外 props 契约或影响非首页调用方。
- 任一任务需要修改 `.env.example`、根 `README.md`、CORS/OpenAPI 默认行为。

## 15. Gate C 自检

Gate C 结论：计划满足进入实现阶段的最低条件，但必须按本计划串并行约束 spawn。

| Gate C 条件 | 自检结果 |
|---|---|
| 当前轮次目标已写明 | 见第 4 节。 |
| 当前轮次范围已写明 | 见第 5 节。 |
| 执行代理分工已写明 | 见第 8 节。 |
| 共享区域唯一责任方已指定 | 见第 9 节。 |
| 每个任务都有 Execution Packet | 见第 13 节，覆盖 `TASK-001` 至 `TASK-012`。 |
| test_strategy 已指定 | 每个 Execution Packet 均包含 `test_strategy`。 |
| 风险提醒已写明 | 见第 11 节与第 14 节。 |
| 实现者交接信息已写明 | 见第 12 节。 |

## 16. 推荐的下一步

1. 编排者先 spawn `backend_implementer` 执行 BE-R1：`TASK-001` → `TASK-002` → `TASK-003` → `TASK-004`。
2. BE-R1 通过针对性 server posts 测试后，并行推进 BE-R2、FE-R2A、FE-R2B；若 BE-R2 触发契约变更，暂停前端合并。
3. BE-R2 完成后执行 BE-R3：`TASK-010` 飞友圈推荐流回归。
4. 所有实现包完成后 spawn `review_qa` 执行 QA-R3：`TASK-011`、`TASK-012`，并基于结果决定交付或退回修复。
