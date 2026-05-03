# 推荐/推流算法优化与侧边卡片规范化 -- 任务分解

## 需求文档

`docs/requirements/2026-05-04-feed-recommendation-algorithm-optimization-requirements.md`

## 变更日志

| 日期 | 变更内容 | 影响 TASK | 原因 |
|------|---------|-----------|------|
| 2026-05-04 | 初始版本 | 全部 | 任务分解完成后首次落盘 |

---

## 1. 任务概览

| TASK | 名称 | REQ | 类型 | 测试策略 | 优先级 | 预估行数 | 风险 |
|------|------|-----|------|----------|--------|----------|------|
| TASK-001 | 接入多样性重排器 | REQ-001 | DDD/TDD | tdd | P1 | M (120) | 中 |
| TASK-002 | 推荐评分公式权重可配置化 | REQ-002 | TDD | tdd | P1 | M (100) | 低 |
| TASK-003 | 引入用户机型偏好信号 | REQ-003 | DDD/TDD | tdd | P2 | M (150) | 中 |
| TASK-004 | 丰富热门机型评分维度 | REQ-004 | DDD/TDD | tdd | P1 | M (120) | 低 |
| TASK-005 | 榜单热度服务端化 | REQ-005 | DDD/TDD | tdd | P1 | L (200) | 中 |
| TASK-006 | 侧边卡片统一规范 | REQ-006 | 直接开发 | test_after | P1 | S (80) | 低 |
| TASK-007 | 推荐查询性能优化 | REQ-007 | 直接开发 | manual_only | P2 | S (50) | 中 |

**总预估变更行数：约 820 行（含测试代码）**

---

## 2. 任务分解列表

### TASK-001：接入多样性重排器

- **task_id**：TASK-001
- **requirement_ids**：[REQ-001]
- **type**：DDD / TDD
- **priority**：P1（必须）
- **estimated_lines**：M（约 120 行）
- **test_strategy**：tdd
- **owner**：backend-service-worker
- **dependencies**：无
- **wait_for**：[]
- **parallel_group**：batch-1（与 TASK-002 / TASK-004 / TASK-005 无共享文件冲突，可并行）
- **risk**：中
- **risk_reason**：JS 重排器影响分页一致性，游标编码需保证重排后同一位置返回相同帖子

**涉及文件**：

| 文件 | 操作 | 所有权 |
|------|------|--------|
| `apps/server/src/modules/posts/posts.service.ts` | 修改 `listFeed` 方法，SQL 结果后调用 `rankFeedItemsByRecommendation` | TASK-001 独占 |
| `apps/server/src/modules/posts/feed-recommendation.ts` | 可能调整 `FeedRecommendationItem` 类型以匹配 SQL 返回结构 | TASK-001 独占 |
| `apps/server/tests/feed-recommendation.test.ts` | 新增 TDD 测试文件 | TASK-001 独占 |

**共享区域冲突检查**：无其他任务修改以上文件。

**完成标准**：

1. [ ] `posts.service.ts` 的 `listFeed` 方法在 `tab=recommended` 时，对 SQL 返回的 items 调用 `rankFeedItemsByRecommendation` 进行 JS 二次重排
2. [ ] 首页 `tab=recommended` 返回的帖子列表中，连续 3 条中相同作者的占比 ≤ 30%（人工抽检 100 条数据）
3. [ ] 飞友圈 `tab=recommended` 返回的帖子列表中，连续 3 条中相同作者的占比 ≤ 30%
4. [ ] 分页游标一致性验证：同一游标位置在不同时间请求返回相同帖子（`recommendationNow` 固定时）
5. [ ] 单元测试覆盖 `buildDiversityPenalty` 函数的以下场景：
   - 空已选列表（penalty = 0）
   - 连续同作者（penalty > 0 且随出现次数递增）
   - 连续同分类（penalty > 0）
   - 同作者 + 同分类叠加惩罚
   - 无作者 ID 或无分类 slug 的边界情况
6. [ ] 单元测试覆盖 `rankFeedItemsByRecommendation`：输入 10 个 item（含同作者/同分类）验证重排后顺序合理

**实现指南**：

- 重排发生在 `posts.service.ts` 的 `listFeed` 方法中，位于 `serializePostListItem` **之前**（重排基于原始 item，序列化仅在最终输出时执行）
- `rankFeedItemsByRecommendation` 接受 `precomputedBaseScores` 参数，SQL 已计算 `recommendationBaseScore`，应将该值传入避免重复计算
- `type` 参数根据 `input.type` 传入（`article` 或 `moment`）
- 重排后 item 顺序改变，确保 `lastItem` 仍取重排后的最后一项来编码游标

---

### TASK-002：推荐评分公式权重可配置化

- **task_id**：TASK-002
- **requirement_ids**：[REQ-002]
- **type**：TDD
- **priority**：P1（必须）
- **estimated_lines**：M（约 100 行）
- **test_strategy**：tdd
- **owner**：backend-service-worker
- **dependencies**：无
- **wait_for**：[]
- **parallel_group**：batch-1（与 TASK-001 / TASK-004 / TASK-005 无共享文件冲突，可并行）
- **risk**：低

**涉及文件**：

| 文件 | 操作 | 所有权 |
|------|------|--------|
| `apps/server/src/modules/posts/posts.repo.ts` | 修改 `buildRecommendationFreshnessMultiplierExpression` 和 `buildRecommendedStaticBaseScoreExpression` | **与 TASK-003 共享，须串行** |
| `apps/server/tests/posts-recommendation-score.test.ts` | 新增 TDD 测试文件 | TASK-002 独占 |

**共享区域冲突检查**：`posts.repo.ts` 同时被 TASK-002 和 TASK-003 修改。TASK-003 **必须**在 TASK-002 完成后开始。

**完成标准**：

1. [ ] `buildRecommendationFreshnessMultiplierExpression` 的半衰期参数从硬编码改为从环境变量读取，默认值：文章 36 小时、动态 18 小时
2. [ ] 环境变量 `RECOMMENDATION_ARTICLE_HALFLIFE_HOURS` 和 `RECOMMENDATION_MOMENT_HALFLIFE_HOURS` 生效，未设置时使用默认值
3. [ ] `buildRecommendedStaticBaseScoreExpression` 中互动分与新鲜度的权重比（当前 0.58 : 0.42）可通过环境变量 `RECOMMENDATION_INTERACTION_WEIGHT` 调整（范围 0.3-0.8，默认 0.58）
4. [ ] 配置变更后重启服务即生效，无需代码修改
5. [ ] 单元测试覆盖：
   - 默认值（36h / 18h / 0.58）产出的分值与原硬编码一致
   - 半衰期缩短后旧帖分值下降更快
   - 互动权重提高后高互动旧帖分值相对提升
   - 边界：半衰期 = 1 小时、互动权重 = 0.3 / 0.8 的极端值

**实现指南**：

- 使用 `process.env.RECOMMENDATION_ARTICLE_HALFLIFE_HOURS` / `process.env.RECOMMENDATION_MOMENT_HALFLIFE_HOURS` / `process.env.RECOMMENDATION_INTERACTION_WEIGHT` 读取配置
- 在模块顶层解析并缓存环境变量值（避免每次 SQL 构建时重复读取）
- `buildRecommendationFreshnessMultiplierExpression` 的 `halfLife` 参数从硬编码改为函数参数，默认值从环境变量读取
- `buildRecommendedStaticBaseScoreExpression` 中 `0.58` 和 `0.42` 替换为 `interactionWeight` 和 `1 - interactionWeight`
- **必须同步更新 `feed-recommendation.ts` 中的 JS 版本公式**（JS 版本也硬编码了 42h / 22h 半衰期和 0.58 / 0.42 权重），确保 JS 重排器与 SQL 评分一致

---

### TASK-003：引入用户机型偏好信号

- **task_id**：TASK-003
- **requirement_ids**：[REQ-003]
- **type**：DDD / TDD
- **priority**：P2（应该）
- **estimated_lines**：M（约 150 行）
- **test_strategy**：tdd
- **owner**：backend-service-worker
- **dependencies**：TASK-002
- **wait_for**：[TASK-002]
- **parallel_group**：batch-2（须在 TASK-002 完成后，可与 TASK-006 并行）
- **risk**：中
- **risk_reason**：新增用户偏好查询可能增加推荐接口延迟；偏好向量异步计算引入 Redis 依赖

**涉及文件**：

| 文件 | 操作 | 所有权 |
|------|------|--------|
| `apps/server/src/modules/posts/posts.repo.ts` | 新增 `buildUserModelPreferenceBoostExpression` SQL 表达式，修改 `buildRecommendedStaticBaseScoreExpression` 加入偏好加成 | **与 TASK-002 共享，须在其后执行** |
| `apps/server/src/modules/users/users.repo.ts` | 新增用户机型偏好查询方法（浏览/收藏/评论记录聚合） | TASK-003 独占 |
| `apps/server/tests/user-model-preference.test.ts` | 新增 TDD 测试文件 | TASK-003 独占 |

**共享区域冲突检查**：`posts.repo.ts` 须在 TASK-002 完成后修改。`users.repo.ts` 无冲突。

**完成标准**：

1. [ ] `users.repo.ts` 新增方法：查询用户近 30 天内机型浏览/收藏/评论记录，按机型 ID 聚合频次
2. [ ] `posts.repo.ts` 新增 `buildUserModelPreferenceBoostExpression`，根据帖子的机型关联（通过 `post_aircraft_links` 或等效关联）匹配用户偏好，匹配成功时给予小幅加分（建议 +3 至 +8）
3. [ ] 偏好信号仅影响 `tab=recommended` 的 Feed，不影响 `latest` 和 `following`
4. [ ] 未登录用户偏好加成默认为 0，不产生额外查询
5. [ ] 无关联机型的帖子不受影响
6. [ ] 偏好向量的异步更新逻辑（每周一次）在 `users.service.ts` 中实现，不阻塞 Feed 请求
7. [ ] 单元测试覆盖：
   - 用户有偏好机型的帖子获得加分
   - 未登录用户无加分
   - 偏好权重可通过环境变量配置（`RECOMMENDATION_PREFERENCE_BOOST_WEIGHT`，默认 5）

**实现指南**：

- 偏好评分的 SQL 表达式应在 CTE 层计算，与现有 `recommendationBaseScore` 并行作为独立加分项
- 可考虑将偏好向量预计算后缓存到 Redis（key: `user:preference:{userId}`），避免每次 Feed 请求都做聚合查询
- 偏好信号使用 `inner join` 或 `exists` 子查询判断，不修改现有 CTE 结构

---

### TASK-004：丰富热门机型评分维度

- **task_id**：TASK-004
- **requirement_ids**：[REQ-004]
- **type**：DDD / TDD
- **priority**：P1（必须）
- **estimated_lines**：M（约 120 行）
- **test_strategy**：tdd
- **owner**：backend-service-worker
- **dependencies**：无
- **wait_for**：[]
- **parallel_group**：batch-1（与 TASK-001 / TASK-002 / TASK-005 无共享文件冲突，可并行）
- **risk**：低

**涉及文件**：

| 文件 | 操作 | 所有权 |
|------|------|--------|
| `apps/server/src/modules/aircraft-models/model-hot-score.ts` | 修改 `buildModelHotScore` 函数，新增浏览热度/搜索频次/被榜单引用次数因子 | TASK-004 独占 |
| `apps/server/src/modules/aircraft-models/aircraft-models.repo.ts` | 可能新增查询方法获取浏览/搜索/榜单引用数据 | TASK-004 独占 |
| `apps/server/src/modules/aircraft-models/aircraft-models.service.ts` | 修改 `listModels` 方法，将新维度数据传入 `sortModelsByHotScore` | TASK-004 独占 |
| `apps/server/tests/model-hot-score.test.ts` | 新增 TDD 测试文件 | TASK-004 独占 |

**共享区域冲突检查**：无其他任务修改以上文件。

**完成标准**：

1. [ ] `ModelHotSeed` 类型扩展，新增字段：`recentViewCount`（近 7 天浏览量）、`recentSearchCount`（近 7 天搜索次数）、`rankingReferenceCount`（被榜单引用次数）
2. [ ] `buildModelHotScore` 公式扩展：
   - 原有因子保留：`favoriteCount*4 + commentCount*3 + reviewCount*2 + freshnessSignal`
   - 新增因子：`recentViewCount * W_view + recentSearchCount * W_search + rankingReferenceCount * W_ranking_ref`
3. [ ] 各加权系数可通过环境变量配置，默认值建议：
   - `MODEL_HOT_VIEW_WEIGHT` = 0.5
   - `MODEL_HOT_SEARCH_WEIGHT` = 2.0
   - `MODEL_HOT_RANKING_REF_WEIGHT` = 8.0
4. [ ] `aircraft-models.repo.ts` 提供必要的数据查询，支持批量获取机型的新维度数据
5. [ ] `aircraft-models.service.ts` 的 `listModels` 方法在 `tab=recommended` 时将新维度数据传递给 `sortModelsByHotScore`
6. [ ] 单元测试覆盖：
   - 高浏览/搜索/榜单引用机型得分高于低热度机型
   - 新因子权重可独立配置
   - 向后兼容：传入无新字段的旧 `ModelHotSeed` 时，新因子默认为 0

**实现指南**：

- `ModelHotSeed` 类型扩展为 `interface`，新增字段全部可选（默认 0），保证向后兼容
- 若数据库暂无浏览/搜索统计字段，先使用 `posts` 表或日志表做聚合查询
- 被榜单引用次数可从 `ratingTargets` 表的 `linkedModelId` 字段统计

---

### TASK-005：榜单热度服务端化

- **task_id**：TASK-005
- **requirement_ids**：[REQ-005]
- **type**：DDD / TDD
- **priority**：P1（必须）
- **estimated_lines**：L（约 200 行）
- **test_strategy**：tdd（后端算法）+ test_after（前端集成）
- **owner**：backend-service-worker（后端）、frontend-implementer（前端）
- **dependencies**：无
- **wait_for**：[]
- **parallel_group**：batch-1（与 TASK-001 / TASK-002 / TASK-004 无共享文件冲突，可并行）
- **risk**：中
- **risk_reason**：L 级变更（200 行），涉及共享区域 `packages/schemas/src/rankings.ts`；前后端同时修改；需确保热度分与前端原算法等效

**涉及文件**：

| 文件 | 操作 | 所有权 |
|------|------|--------|
| `apps/server/src/modules/rankings/rankings.service.ts` | 新增 `buildRankingHotScore` 函数，修改 `buildRankingListItems` / `listRankings` 支持 `sort` 参数 | TASK-005 独占 |
| `packages/schemas/src/rankings.ts` | 新增 `rankingsSortSchema`（`z.enum(["hot", "latest"])`），修改 `rankingsResponseSchema` 可选 | **共享区域，修改需审慎** |
| `apps/web/src/routes/home-page.tsx` | 修改 `rankingsQuery` 使用 `sort=hot&limit=3`，移除 `mergeRankingsByTab` 客户端排序 | **与 TASK-006 共享** |
| `apps/web/src/routes/rankings-page.tsx` | 修改 rankings 查询支持 `sort` 参数，切换排序时重新请求 | TASK-005 独占 |
| `apps/web/src/routes/rankings-page-helpers.ts` | 删除 `buildRankingHotScore` 函数，保留 `mergeRankingsByTab` 但移除 `.hot` 分支（或标记为 deprecated） | TASK-005 独占 |
| `apps/server/tests/ranking-hot-score.test.ts` | 新增 TDD 测试文件 | TASK-005 独占 |

**共享区域冲突检查**：
- `packages/schemas/src/rankings.ts` 为共享区域，仅 TASK-005 修改，无冲突
- `apps/web/src/routes/home-page.tsx` 与 TASK-006 共享，TASK-006 须在 TASK-005 完成后执行

**完成标准**：

1. [ ] 服务端新增 `buildRankingHotScore` 函数，算法等效于前端的当前实现：
   ```
   score = averageScore*12 + totalRatings*0.85 + commentCount*3.4 + itemCount*1.8
           + max(0, 72 - hoursSinceCreation) + (type === "official" ? 4 : 0)
   ```
2. [ ] `GET /api/v1/rankings` 支持 `sort` 参数，可选值 `"hot"`（按热度降序）、`"latest"`（按创建时间降序，现有行为），默认 `"latest"`
3. [ ] `packages/schemas/src/rankings.ts` 新增 `rankingsSortSchema` 校验 `sort` 参数
4. [ ] `GET /api/v1/rankings?sort=hot` 返回`official` 和 `community` 两个分组内各自按热度降序排列
5. [ ] 首页侧边栏「热门榜单」查询改为 `sort=hot&limit=3`，移除客户端 `mergeRankingsByTab(...).hot.slice(0, 2)` 逻辑
6. [ ] 榜单页面支持排序切换（`sort=hot` / `sort=latest`），切换时重新请求服务端
7. [ ] 前端 `rankings-page-helpers.ts` 删除 `buildRankingHotScore` 函数及其在 `mergeRankingsByTab` 中的 `.hot` 排序分支
8. [ ] 单元测试覆盖：
   - `buildRankingHotScore` 与前端原算法计算结果一致（用固定数据对比）
   - 官方榜单与社区榜单的官方加成差异
   - 新鲜度信号边界（刚创建 vs 超过 72 小时）

**实现指南**：

- `buildRankingHotScore` 实现在 `apps/server/src/modules/rankings/ranking-score.ts`（与现有 `rankRatingTargetsByDynamicScore` 同级）
- 后端排序函数签名：`function sortRankingsByHotScore<T extends RankingListItem>(items: T[], now?: Date): T[]`
- `buildRankingListItems` 在 `all` 数组构建完成后，若 `sort === "hot"` 则调用 `sortRankingsByHotScore` 分别对 `officialItems` 和 `communityItems` 排序后分页
- `listRankings` 方法签名改为接受 `sort?: "hot" | "latest"`
- 前端 `rankingsQuery` 新增 `sort` 参数，从路由或 state 中读取当前排序模式
- 删除前端 hot score 代码时，确认 `mergeRankingsByTab` 的 `latest` 分支仍需保留（榜单页面默认按最新排序）

---

### TASK-006：侧边卡片统一规范

- **task_id**：TASK-006
- **requirement_ids**：[REQ-006]
- **type**：直接开发
- **priority**：P1（必须）
- **estimated_lines**：S（约 80 行）
- **test_strategy**：test_after
- **owner**：frontend-implementer
- **dependencies**：TASK-005
- **wait_for**：[TASK-005]
- **parallel_group**：batch-2（须在 TASK-005 完成后，可与 TASK-003 并行）
- **risk**：低

**涉及文件**：

| 文件 | 操作 | 所有权 |
|------|------|--------|
| `apps/web/src/routes/home-page.tsx` | 提取 `SidebarSection` 组件，替换 `HomeRailPanels` 中的内联面板 | **与 TASK-005 共享，须在其后执行** |
| `apps/web/src/components/sidebar-section.tsx` | 新增统一侧边卡片组件，内置 `maxItems=3` 约束 | TASK-006 独占 |
| `apps/web/src/components/site-shell.tsx` | 可能需要导出 `SidebarSection` 或调整布局 | TASK-006 独占 |

**共享区域冲突检查**：`home-page.tsx` 须在 TASK-005 完成数据查询改造后修改。

**完成标准**：

1. [ ] 新增 `SidebarSection` 组件（`apps/web/src/components/sidebar-section.tsx`），Props 包含：
   - `title: string`（标题）
   - `icon: ReactNode`（图标）
   - `items: T[]`（展示项列表）
   - `maxItems?: number`（默认 3，内部自动截断）
   - `renderItem: (item: T, index: number) => ReactNode`（渲染函数）
   - `isLoading?: boolean`（加载态）
   - `skeletonCount?: number`（骨架屏数量，默认等于 maxItems）
2. [ ] `HomeRailPanels` 重构为使用 `SidebarSection` 组件渲染「热门榜单」和「热门机型」两个面板
3. [ ] 热门榜单查询参数确认为 `sort=hot&limit=3`（由 TASK-005 完成）
4. [ ] 热门机型查询参数确认为 `limit=3`（现有代码已符合）
5. [ ] `SidebarSection` 组件在内部执行 `items.slice(0, maxItems)`，上层调用者无需手动截断
6. [ ] 若其他页面（飞友圈、飞行器列表）未来需要侧边推荐卡片，直接复用 `SidebarSection` 即可自动遵守 ≤3 项规范

**实现指南**：

- 组件遵循项目 TypeScript 规范，Props 使用 `interface` 定义
- 骨架屏支持：当 `isLoading=true` 时渲染 `skeletonCount` 个骨架占位，与当前 `HomeRailPanels` 的加载态效果一致
- 不引入新的第三方依赖，使用项目已有的 `Skeleton` / UI 组件
- Tailwind CSS 类名使用内联方式（禁止 `@apply`）

---

### TASK-007：推荐查询性能优化

- **task_id**：TASK-007
- **requirement_ids**：[REQ-007]
- **type**：直接开发
- **priority**：P2（应该）
- **estimated_lines**：S（约 50 行）
- **test_strategy**：manual_only
- **owner**：backend-data-worker
- **dependencies**：TASK-002、TASK-003
- **wait_for**：[TASK-002, TASK-003]
- **parallel_group**：batch-3（所有查询逻辑修改完成后执行）
- **risk**：中
- **risk_reason**：索引创建可能影响写入性能；需在生产环境验证 P95

**涉及文件**：

| 文件 | 操作 | 所有权 |
|------|------|--------|
| `packages/db/src/schema.ts` | 新增数据库索引定义 | **共享区域，修改需审慎** |
| 数据库迁移脚本 | 新增（按项目规范创建迁移文件） | TASK-007 独占 |
| `apps/server/src/modules/posts/posts.repo.ts` | 可能需要添加查询提示（如 `pg_hint_plan`）或微调 CTE 结构 | TASK-007 独占 |

**共享区域冲突检查**：`posts.repo.ts` 和 `packages/db/src/schema.ts` 被多个任务修改，TASK-007 须在所有查询逻辑变更完成后执行。

**完成标准**：

1. [ ] 对 `listFeed`（`tab=recommended`）执行 `EXPLAIN ANALYZE`，确认使用索引而非全表扫描
2. [ ] 对 `listFeed`（`tab=following` 含 JOIN）执行 `EXPLAIN ANALYZE`，确认查询计划合理
3. [ ] 对 `listModels`（`sort=hot`）执行 `EXPLAIN ANALYZE`，确认排序使用索引
4. [ ] 对 `listRankings`（`sort=hot`）执行 `EXPLAIN ANALYZE`，确认查询计划合理
5. [ ] 首页 Feed 推荐 Tab P95 响应时间 ≤ 200 ms（通过压测工具验证，≥100 次请求样本）
6. [ ] 飞友圈 Feed 推荐 Tab P95 响应时间 ≤ 200 ms
7. [ ] 飞行器列表推荐 Tab P95 响应时间 ≤ 200 ms
8. [ ] 榜单列表 `sort=hot` P95 响应时间 ≤ 200 ms
9. [ ] 数据库迁移脚本包含所有新增索引的 `CREATE INDEX` 语句

**实现指南**：

- 优先分析当前查询瓶颈：`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` 定位慢查询步骤
- 建议索引方向（基于当前查询分析）：
  - 推荐 Feed CTE 查询：`posts(status, type, coalesce(published_at, created_at), id)` 已有部分索引，检查是否需要覆盖 `reportCount` / `viewCount` 条件
  - 关注 Feed JOIN 查询：`user_follows(followerId, followeeId)` 复合索引
  - 机型列表排序：`aircraft_models` 表的热门评分相关字段索引
- 索引在 `packages/db/src/schema.ts` 的 `pgTable` 第二个参数中定义（使用 Drizzle ORM 的 `index()` 函数）
- 索引创建后必须在测试环境 `EXPLAIN ANALYZE` 确认执行计划变更

---

## 3. DDD 分类汇总

| 领域 | TASK | 核心领域逻辑 | 聚合根 | 领域服务 |
|------|------|-------------|--------|---------|
| 推荐排序 | TASK-001 | 多样性重排算法（同作者/同分类惩罚、贪心选择） | FeedItem（推荐候选条目） | `rankFeedItemsByRecommendation` |
| 用户画像 | TASK-003 | 用户机型偏好向量（浏览/收藏/评论聚合、衰减权重） | User（用户实体） | `buildUserModelPreferenceVector` |
| 机型热度 | TASK-004 | 机型热度评分（多维加权、新鲜度衰减） | AircraftModel（机型聚合根） | `buildModelHotScore` |
| 榜单热度 | TASK-005 | 榜单热度评分（评分信号、讨论热度、官方加成） | Ranking（榜单聚合根） | `buildRankingHotScore` |

**DDD 设计原则遵循**：
- 评分算法封装在领域函数中（`buildXxxScore`），不泄露到路由层
- 聚合边界清晰：`FeedItem` 不直接操作 `User` 或 `AircraftModel` 的内部状态
- 跨聚合协调通过领域服务完成（如 TASK-003 的偏好向量计算）

---

## 4. TDD 与直接开发分类

### TDD 任务（核心算法逻辑，严格 Red-Green-Refactor）

| TASK | 测试文件 | 关键测试场景 |
|------|---------|-------------|
| TASK-001 | `apps/server/tests/feed-recommendation.test.ts` | `buildDiversityPenalty` 各种惩罚组合；`rankFeedItemsByRecommendation` 端到端排序 |
| TASK-002 | `apps/server/tests/posts-recommendation-score.test.ts` | 半衰期/权重配置生效验证；默认值一致性；极端参数值 |
| TASK-003 | `apps/server/tests/user-model-preference.test.ts` | 偏好向量计算；偏好加分逻辑；未登录/无偏好边界 |
| TASK-004 | `apps/server/tests/model-hot-score.test.ts` | 新维度加权；向后兼容（旧数据）；权重可配置性 |
| TASK-005 | `apps/server/tests/ranking-hot-score.test.ts` | 热度分等效性（与前端原算法对比）；官方加成；新鲜度边界 |

### test_after 任务（实现后补集成测试）

| TASK | 测试范围 |
|------|---------|
| TASK-001 | Feed 接口（首页/飞友圈）排序结果集成测试 |
| TASK-005 | Rankings 接口 `sort=hot` 参数集成测试 |
| TASK-006 | 侧边卡片组件渲染测试（快照测试 + 交互测试） |

### manual_only 任务（性能/人工验证）

| TASK | 验证方式 |
|------|---------|
| TASK-007 | `EXPLAIN ANALYZE` 执行计划分析；压测工具验证 P95 延迟 |

---

## 5. 风险任务

| TASK | 风险等级 | 风险描述 | 拆分/不拆分理由 | 缓解措施 |
|------|---------|---------|----------------|---------|
| TASK-001 | 中 | JS 重排影响分页一致性，游标位置可能漂移 | 不拆分：重排逻辑是一个完整的贪心算法，拆分会破坏算法完整性 | `recommendationNow` 时间戳固定时分页结果确定；游标编码包含 score 和时间戳保证精确翻页 |
| TASK-003 | 中 | 新增用户偏好查询可能增加推荐接口延迟 | 不拆分：偏好向量计算是独立的聚合查询，异步预计算可解耦 | 偏好向量 Redis 缓存 + 每周异步更新；未登录用户跳过查询 |
| TASK-005 | 中 | L 级变更（200 行），涉及共享区域 schema 和前后端联调 | 不拆分：榜单热度服务端化是端到端功能，前后端切分后不能独立验证 | 后端先实现并用 curl 验证；前后端联调用契约测试确保数据结构一致 |
| TASK-007 | 中 | 索引创建在生产环境执行，可能短暂影响写入性能 | 不拆分：索引优化是单次 DDL 操作 | 在低峰期执行 `CREATE INDEX CONCURRENTLY`；先在 staging 验证 |

---

## 6. 文件所有权与共享路径提醒

### 共享区域文件（修改需 Plan Patch 审慎操作）

| 文件 | 修改者 | 风险等级 | 注意事项 |
|------|--------|---------|---------|
| `packages/schemas/src/rankings.ts` | TASK-005 | 中 | 新增 `sort` 字段为可选参数，保持向后兼容；前端 Zod 推断类型需同步更新 |
| `packages/db/src/schema.ts` | TASK-007 | 高 | 索引定义变更需配套数据库迁移脚本；不应修改现有列定义 |

### 共享业务文件（多任务修改同一文件）

| 文件 | 任务序列 | 执行顺序 |
|------|---------|---------|
| `apps/server/src/modules/posts/posts.repo.ts` | TASK-002 → TASK-003 → TASK-007 | **严格串行**：TASK-002 先修改评分公式 → TASK-003 在其基础上添加偏好信号 → TASK-007 最终性能微调 |
| `apps/web/src/routes/home-page.tsx` | TASK-005 → TASK-006 | **严格串行**：TASK-005 先改造数据查询 → TASK-006 提取 SidebarSection 组件 |

### 独占文件（无冲突）

| 文件 | 独占任务 |
|------|---------|
| `apps/server/src/modules/posts/posts.service.ts` | TASK-001 |
| `apps/server/src/modules/posts/feed-recommendation.ts` | TASK-001 |
| `apps/server/src/modules/aircraft-models/model-hot-score.ts` | TASK-004 |
| `apps/server/src/modules/aircraft-models/aircraft-models.repo.ts` | TASK-004 |
| `apps/server/src/modules/aircraft-models/aircraft-models.service.ts` | TASK-004 |
| `apps/server/src/modules/users/users.repo.ts` | TASK-003 |
| `apps/server/src/modules/rankings/rankings.service.ts` | TASK-005 |
| `apps/server/src/modules/rankings/ranking-score.ts` | TASK-005 |
| `apps/web/src/routes/rankings-page-helpers.ts` | TASK-005 |
| `apps/web/src/routes/rankings-page.tsx` | TASK-005 |
| `apps/web/src/components/sidebar-section.tsx` | TASK-006（新建） |

---

## 7. 推荐交付顺序

### 按批次执行

```
第 1 批次（并行，无共享依赖）
┌─────────────────────────────────────────────────────────┐
│ TASK-001  接入多样性重排器         (REQ-001, P1, M)     │
│ TASK-002  推荐评分公式权重可配置化  (REQ-002, P1, M)     │
│ TASK-004  丰富热门机型评分维度      (REQ-004, P1, M)     │
│ TASK-005  榜单热度服务端化          (REQ-005, P1, L)     │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          v               v               v
第 2 批次（在 TASK-002/TASK-005 完成后并行）
┌──────────────────────┐ ┌──────────────────────┐
│ TASK-003  用户偏好    │ │ TASK-006  侧边卡片   │
│ (REQ-003, P2, M)     │ │ (REQ-006, P1, S)     │
│ wait_for: [TASK-002] │ │ wait_for: [TASK-005] │
└──────────────────────┘ └──────────────────────┘
                          │
                          v
第 3 批次（所有查询逻辑完成后执行）
┌─────────────────────────────────────────────────────────┐
│ TASK-007  推荐查询性能优化          (REQ-007, P2, S)     │
│ wait_for: [TASK-002, TASK-003]                          │
└─────────────────────────────────────────────────────────┘
```

### 批次理由

| 批次 | 理由 |
|------|------|
| 第 1 批次 | 四个 P1 任务互不修改同一文件（TASK-002 改 `posts.repo.ts`，TASK-004 改 `model-hot-score.ts`，TASK-005 改 `rankings.service.ts`，TASK-001 改 `posts.service.ts`），可安全并行 |
| 第 2 批次 | TASK-003 依赖 TASK-002 完成 `posts.repo.ts` 的评分公式改造；TASK-006 依赖 TASK-005 完成 `home-page.tsx` 的查询改造。两任务互不冲突可并行 |
| 第 3 批次 | TASK-007 是查询优化，必须在 TASK-002 和 TASK-003 的查询结构变更完成后执行，针对最终 SQL 做性能分析和索引优化 |

---

## 8. 推荐的下一步

1. **planner** 读取本任务文档，生成第 1 批次的执行计划
2. 第 1 批次中 TASK-005 为 L 级任务，planner 可考虑将其拆分为两个子步骤：
   - TASK-005a：后端实现（`ranking-score.ts` + `rankings.service.ts` + schema）
   - TASK-005b：前端适配（`home-page.tsx` + `rankings-page.tsx` + `rankings-page-helpers.ts` 清理）
3. TASK-002 的测试文件需覆盖 `feed-recommendation.ts` 中 JS 版本公式的同步更新——建议在 TASK-001 中由同一 implementer 处理 JS 侧的权重配置化
4. 所有 P1 任务完成后（第 1 + 第 2 批次），在 staging 环境做端到端验证：四个页面的排序效果 + 侧边栏展示 + 响应时间基准

---

## 9. 验证清单

- [x] 所有 7 条 REQ 均映射到至少 1 个 TASK（REQ-001→TASK-001, REQ-002→TASK-002, REQ-003→TASK-003, REQ-004→TASK-004, REQ-005→TASK-005, REQ-006→TASK-006, REQ-007→TASK-007）
- [x] 全部采用垂直切片策略（每个 TASK 是完整的端到端功能路径）
- [x] 无水平切片（未出现"设计全部数据库表"或"实现全部 API"类任务）
- [x] 所有 TASK 有明确的 test_strategy（5 个 TDD + 1 个 test_after + 1 个 manual_only）
- [x] 依赖关系已明确且无循环依赖
- [x] 并行机会已识别（第 1 批次 4 个任务可并行）
- [x] 风险任务已标注（TASK-001/003/005/007 中风险，TASK-005 L 级变更）
- [x] 总变更约 820 行（含测试），可在一轮内完成
- [x] 共享区域已指定唯一责任方（`rankings.ts` 由 TASK-005 负责，`db/schema.ts` 由 TASK-007 负责）
- [x] 每个 TASK 有可独立验证的完成标准
