# 信息流推荐算法与性能优化任务文档

## 1. 需求文档路径

- 上游需求文档：`docs/requirements/2026-04-24-feed-recommendation-performance-requirements.md`
- 本任务文档：`docs/tasks/2026-04-24-feed-recommendation-performance-tasks.md`
- 任务设计边界：仅拆分任务，不选择执行轮次，不编写业务代码，不变更公开 API 形状。

## 2. 任务概览

本轮围绕现有首页推荐流与飞友圈推荐流进行最小正确优化，目标是在不引入外部 ML 服务、不做破坏性数据库重构、不改变公开请求/响应契约的前提下，提升推荐排序稳定性、分页深翻能力、候选查询效率与前端加载体验。

涉及模块边界：

- 后端推荐域：`apps/server/src/modules/posts/feed-recommendation.ts`
- 后端查询与分页：`apps/server/src/modules/posts/posts.repo.ts`、`apps/server/src/modules/posts/posts.service.ts`
- 后端路由契约核对：`apps/server/src/modules/posts/posts.route.ts`
- 后端测试：`apps/server/tests/posts-recommended-window.test.ts`、`apps/server/tests/posts.test.ts`
- 用户端首页查询：`apps/web/src/routes/home-page.tsx`、`apps/web/src/lib/home-feed-query.ts`
- 用户端虚拟列表触发：`apps/web/src/components/virtual-feed.tsx`、`apps/web/src/components/virtual-feed-runtime.tsx`
- 用户端测试：`apps/web/tests/feed-pagination.test.ts`、`apps/web/tests/virtual-feed.test.ts`，必要时新增首页查询行为测试

明确不进入本轮：

- 不新增推荐服务、向量检索、训练任务或外部 ML 依赖。
- 不改变 API 路径、鉴权模型、公开请求/响应字段。
- 默认不改 DB schema / migration；若实现中证明索引或 schema 必须调整，应先形成变更请求并回退主会话确认。
- 不重做信息流 UI 视觉风格，不扩展新内容类型。
- 不修改生产 CORS / OpenAPI 默认行为。

## 3. 任务分解列表

| 任务 ID | 名称 | 类型 | 优先级 | 完成标准 |
|---|---|---|---|---|
| TASK-001 | 推荐排序规则基线测试补齐 | TDD | P0 | 在 `apps/server/tests` 中覆盖互动、时效、质量、关注关系、内容类型、已互动降权、举报降权的排序断言；测试先能暴露当前缺口或锁定现有行为；不依赖外部服务。 |
| TASK-002 | 推荐 cursor 契约与兼容性测试 | TDD | P0 | 覆盖推荐 cursor 必须包含分数、发布时间、ID、锚点时间；旧 cursor 或异常 cursor 的处理保持现有兼容策略；响应字段形状不变。 |
| TASK-003 | 推荐 seek 分页稳定性实现 | TDD + 后端实现 | P0 | 推荐流分页以分数、发布时间、ID 为稳定顺序键；新增头部高分内容后，下一页不重复、不漏翻；保留 `nextCursor` 与现有 API 形状。 |
| TASK-004 | 深翻候选集查询去固定窗口截断 | TDD + 后端实现 | P0 | 推荐分页不再被 200 条固定候选窗口截断；现有 `posts-recommended-window` 深翻测试扩展到跨多页数据；每页仅拉取 `limit + 1` 或实现所需的最小候选窗口。 |
| TASK-005 | SQL 侧分数与 TS 重排模型对齐 | DDD + TDD + 后端实现 | P1 | 明确 SQL 侧 `recommendationBaseScore` 与 `rankFeedItemsByRecommendation` 的职责边界；同一输入下分页顺序、cursor 分数与 TS 重排不会产生跨页重复；新增分数一致性或边界测试。 |
| TASK-006 | 作者/分类多样性策略安全化 | DDD + TDD + 后端实现 | P1 | 多样性惩罚只影响当前页内展示顺序或被证明与 cursor 顺序一致；同作者/同分类连续曝光下降；跨页分页仍按稳定 cursor 不重复。 |
| TASK-007 | 推荐查询字段与计数开销收敛 | 后端实现 + 验证 | P1 | 推荐候选查询阶段只读取排序、过滤、回表所需字段；推荐流避免无效全量 count；详情字段如 `contentHtml` 继续通过既有分页内容补取流程处理。 |
| TASK-008 | 首页 `useInfiniteQuery` 缓存与占位数据优化 | 前端实现 + 测试 | P1 | `home-page.tsx` 为首页信息流设置合理 `staleTime`、`gcTime`、`placeholderData`、`getNextPageParam`；切换 Tab / 分类时减少闪烁并不串页；失败重试文案保持清晰。 |
| TASK-009 | 虚拟列表加载触发锁定与重试体验 | TDD + 前端实现 | P1 | `VirtualFeed` 的 `onLoadMore` 在已请求、正在请求、无下一页、错误重试场景下不重复触发；现有 `virtual-feed.test.ts` 覆盖列表与瀑布流两种路径。 |
| TASK-010 | 飞友圈推荐流回归覆盖 | TDD + 集成验证 | P1 | moment / circle 推荐流与 article 首页推荐流均通过排序、分页、深翻与多样性测试；内容类型差异不引入 API 契约变化。 |
| TASK-011 | 兼容性与共享契约巡检 | 直接开发 | P2 | 确认未变更 `packages/schemas`、`packages/http-client`、`packages/shared` 的公开契约；若确需内部 helper 调整，记录兼容性结论；不修改 CORS / OpenAPI 默认行为。 |
| TASK-012 | 验证命令与交付说明整理 | 验证 | P2 | planner 执行完成后可运行针对性测试、`bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`；任务交付说明包含未做 DB schema 变更或已回退确认的结论。 |

## 4. DDD 分类

### 需要 DDD 的任务

- `TASK-005`：推荐分数模型存在 SQL 侧评分与 TS 侧重排两个业务规则入口，必须明确领域职责，避免模型漂移导致分页、排序、cursor 不一致。
- `TASK-006`：作者/分类多样性会影响内容曝光顺序，并与分页稳定性存在一致性风险，需明确“排序顺序”和“展示重排”的边界。
- `TASK-003`：推荐 cursor 是推荐流分页状态的一部分，影响新增内容插入后的状态转换与幂等翻页行为，应按领域规则处理。

### 不需要完整 DDD、但需遵守领域边界的任务

- `TASK-001`、`TASK-002`、`TASK-004`、`TASK-010`：主要是规则验证与分页行为测试，需以推荐领域语言命名断言。
- `TASK-007`：主要是查询性能收敛，避免改变业务语义。
- `TASK-008`、`TASK-009`：前端体验优化，不定义推荐领域规则，只消费既有 feed contract。
- `TASK-011`、`TASK-012`：契约巡检与验证交付，不涉及领域建模。

## 5. TDD 与直接开发分类

### 必须 TDD 的任务

- `TASK-001`：核心推荐业务规则，必须先补排序断言。
- `TASK-002`：高风险分页接口契约，必须先锁定 cursor 编解码兼容性。
- `TASK-003`：分页稳定性与新增内容插入属于可复现高风险行为，必须测试先行。
- `TASK-004`：深翻能力与固定窗口截断属于可复现 bug 风险，必须测试先行。
- `TASK-005`：分数模型一致性影响核心推荐规则，必须测试先行。
- `TASK-006`：多样性与跨页去重存在一致性风险，必须测试先行。
- `TASK-009`：重复请求和错误重试属于前端状态机行为，必须测试先行。
- `TASK-010`：飞友圈推荐流是同规则的另一内容类型入口，必须有回归测试。

### 可以直接开发的任务

- `TASK-007`：查询字段与计数收敛可在现有测试保护下直接实现，但完成前必须补充或更新能观察到分页与数据完整性的测试。
- `TASK-008`：React Query 参数调优可直接开发，但需同步新增前端行为测试或可执行验证。
- `TASK-011`：契约巡检只做核对和记录，不应主动修改共享包。
- `TASK-012`：验证与交付说明整理，不涉及业务实现。

### test_strategy

- 后端排序单元测试：优先覆盖 `rankFeedItemsByRecommendation` 的确定性输入，断言互动、时效、质量、关注关系、已互动和举报降权的相对顺序。
- 后端分页集成测试：扩展 `apps/server/tests/posts-recommended-window.test.ts`，构造超过旧固定窗口的数据量，验证 `nextCursor` 深翻、插入新头部内容后无重复/漏翻。
- 后端 API 回归测试：在 `apps/server/tests/posts.test.ts` 中覆盖 article / moment、recommended / latest / following 的边界，不改变响应字段。
- 前端分页工具测试：扩展 `apps/web/tests/feed-pagination.test.ts`，验证 `getNextPageParam` 对新旧 cursor 结构仍兼容。
- 前端虚拟列表测试：扩展 `apps/web/tests/virtual-feed.test.ts`，覆盖已请求锁定、请求中锁定、错误后可重试、瀑布流只由首列触发加载。
- 前端首页查询测试：若现有测试无法覆盖 `useInfiniteQuery` 参数，应新增轻量测试或抽取可测试 helper，验证 `staleTime`、`gcTime`、`placeholderData` 与 Tab / 分类 queryKey 隔离。
- 验证命令建议：先运行针对性测试（server posts 推荐测试、web feed/virtual 测试），再运行根级 `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`。

## 6. 风险任务

| 任务 ID | 风险 | 处理要求 |
|---|---|---|
| TASK-003 | cursor 与排序键不一致会导致跨页重复或漏翻 | cursor 必须绑定实际服务端排序键；新增内容插入测试必须覆盖。 |
| TASK-004 | 去掉固定窗口后可能扩大查询成本 | 使用 seek + limit 控制候选集；禁止以全量拉取后内存排序替代。 |
| TASK-005 | SQL 评分与 TS 重排职责不清会造成分数漂移 | 明确 SQL 用于分页候选稳定序，TS 重排只在不破坏 cursor 的边界内使用。 |
| TASK-006 | 页内多样性重排可能破坏跨页游标顺序 | 若重排影响 cursor，必须改为 cursor 稳定的策略；无法证明时回退主会话确认。 |
| TASK-007 | 性能优化可能误删响应所需字段 | 候选阶段可裁剪字段，回表/补取阶段必须保持现有响应完整。 |
| TASK-008 | `placeholderData` 与 queryKey 不当可能导致 Tab 串数据 | queryKey 必须包含 feed tab 与 category slug；测试覆盖切换。 |
| TASK-009 | 加载锁过强可能阻止错误后重试 | 错误态和请求完成后必须释放锁；测试覆盖自动重试/手动触发路径。 |
| TASK-011 | 误改共享契约会扩大影响到 admin / http-client / schemas | 默认不改共享包；如必须改公开类型或路由常量，需按共享协议顺序评估并回退确认。 |

## 7. 文件所有权和共享路径提醒

- `apps/server/src/modules/posts/*` 归后端 posts 模块所有；修改排序、分页、repo 查询时必须同步检查 service 与 route 对调用方的语义影响。
- `apps/web/src/routes/home-page.tsx` 是首页页面入口；仅做加载体验和 query 参数最小优化，不重做 UI 视觉结构。
- `apps/web/src/lib/home-feed-query.ts` 适合承载首页请求超时、错误文案、可测试 helper；避免把请求细节散落在页面组件。
- `apps/web/src/components/virtual-feed.tsx` 与 `apps/web/src/components/virtual-feed-runtime.tsx` 可能被其他页面复用；改加载锁或触发条件时必须回归列表和瀑布流路径。
- `packages/schemas`、`packages/http-client`、`packages/shared` 是共享契约路径；本轮保持公开 API 形状兼容，禁止在 `apps/*` 重复定义应属于 `packages/*` 的结构。
- `packages/db`、迁移文件与索引不在默认修改范围；如分析证明必须新增索引或改 schema，应停止实现并提交主会话澄清/确认。
- `.env.example`、根 `README.md`、CORS / OpenAPI 默认行为不应因本轮任务修改；如 planner 发现 env 或文档必须同步，需先说明原因。
- 共享路径风险：同一轮若多人并行修改 `posts.repo.ts`、`posts.service.ts`、`home-page.tsx` 或 `virtual-feed-runtime.tsx`，冲突概率高；planner 应串行安排这些文件的写入或明确文件锁定窗口。

## 8. 推荐交付顺序

1. `TASK-001`、`TASK-002`：先锁定推荐排序与 cursor 契约测试。
2. `TASK-003`、`TASK-004`：实现稳定 seek 分页与深翻候选查询，优先解除 P0 行为风险。
3. `TASK-005`、`TASK-006`：对齐 SQL 分数与 TS 多样性策略，确保分页顺序和展示顺序不冲突。
4. `TASK-007`：在行为稳定后收敛查询字段与计数开销，避免性能优化掩盖分页 bug。
5. `TASK-008`、`TASK-009`：优化首页查询缓存与虚拟列表加载触发，降低 UI 闪烁和重复请求。
6. `TASK-010`：补齐飞友圈推荐流回归，防止只覆盖 article 首页流。
7. `TASK-011`、`TASK-012`：做共享契约巡检、验证命令和交付说明。

## 9. 推荐的下一步

- 将本文档交给 `planner`，由 `planner` 基于任务优先级选择当前执行轮次并制定实施计划。
- `planner` 执行前应先读取上游需求文档、本任务文档、根 `AGENTS.md`、`apps/AGENTS.md`，以及进入 `apps/server` / `apps/web` 时对应的 `AGENTS.md`。
- 若 `planner` 在实现前发现必须改 API 契约、DB schema / migration、共享包公开类型、生产 CORS / OpenAPI 默认行为，应停止执行并回退主会话澄清。
- 建议第一轮只处理 P0：`TASK-001` 至 `TASK-004`；待分页稳定和深翻验证通过后再处理多样性、查询性能与前端体验。

