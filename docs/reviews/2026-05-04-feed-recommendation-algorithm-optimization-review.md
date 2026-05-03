# 推荐/推流算法优化与侧边卡片规范化 -- 最终评审报告 (Gate D)

## 评审元数据

| 项目 | 内容 |
|------|------|
| 评审日期 | 2026-05-04 |
| 评审人 | review-qa Agent |
| 关联需求 | REQ-001 至 REQ-007 |
| 关联任务 | TASK-001 至 TASK-007 |
| 关联计划 | `docs/plans/2026-05-04-feed-recommendation-algorithm-optimization-plan.md` |
| 变更规模 | 19 文件，+540 / -215 行（净增 325 行，总变更 755 行） |
| 评审框架 | 五轴审查（正确性、可读性、架构、安全、性能） |

---

## 审查结论：**有条件通过**

**存在 1 个阻塞问题、3 个重要问题、2 个警告项。阻塞问题必须在合并前修复。**

---

## 一、REQ 追踪矩阵（完整）

| requirement_id | task_id | planned_owner | actual_change_files | verification | review_result |
|---|---|---|---|---|---|
| REQ-001 | TASK-001 | backend-service-worker | `posts.service.ts`, `feed-recommendation.ts`, `feed-recommendation.test.ts` (new) | 11 个单元测试覆盖 diversity penalty 和 ranker | **conditional** -- 测试存在但未验证分页一致性端到端 |
| REQ-002 | TASK-002 | backend-service-worker | `posts.repo.ts`, `feed-recommendation.ts`, `posts-recommendation-score.test.ts` (new) | 8 个单元测试覆盖 env var 配置 | **fail** -- 默认半衰期值（42h/22h）与需求（36h/18h）不匹配 |
| REQ-003 | TASK-003 | backend-service-worker | `posts.repo.ts`, `users.repo.ts`, `users.service.ts`, `user-model-preference.test.ts` (new) | 11 个测试覆盖偏好表达式和 repo/service 方法 | **conditional** -- 使用"等效关联"而非直接匹配，且异步更新仅为函数入口未接入调度器 |
| REQ-004 | TASK-004 | backend-service-worker | `model-hot-score.ts`, `aircraft-models.repo.ts`, `aircraft-models.service.ts`, `model-hot-score.test.ts` (new) | 12 个测试覆盖新旧因子和向后兼容 | **conditional** -- `recentSearchCount` 硬编码为 0，搜索维度缺失 |
| REQ-005 | TASK-005 | backend-service-worker + frontend-implementer | `ranking-score.ts`, `rankings.service.ts`, `rankings.route.ts`, `rankings.ts` (schema), `http-client/index.ts`, `home-page.tsx`, `rankings-page.tsx`, `rankings-page-helpers.ts`, `ranking-hot-score.test.ts` (new), `rankings-page-helpers.test.ts` (modified) | 7 个测试覆盖热度计算和排序 | **conditional** -- 修改了 forbidden 路径（route.ts, http-client）；前端热度分已删除 |
| REQ-006 | TASK-006 | frontend-implementer | `home-page.tsx`, `sidebar-section.tsx` (new) | 组件已创建，无独立测试 | **conditional** -- 组件无独立测试；榜单显示 2 项而非 3 项 |
| REQ-007 | TASK-007 | backend-data-worker | `schema.ts`, `0002_wandering_index.sql` (new), `_journal.json` | 索引定义 + 迁移脚本 | **pass** -- 索引定义完整，仅新增未修改列 |

---

## 二、需求覆盖情况

### REQ-001：接入多样性重排器 -- 有条件通过

- [x] `posts.service.ts` 在 `tab=recommended` 时调用 `rankFeedItemsByRecommendation`
- [x] 使用 SQL 预计算的 `recommendationBaseScore` 作为 `precomputedBaseScores`
- [x] 重排发生在 `serializePostListItem` 之前
- [x] 重排后 `lastItem` 基于重排后最后一项编码游标
- [x] 11 个单元测试覆盖 `buildDiversityPenalty`（9 tests）和 `rankFeedItemsByRecommendation`（2 tests 多样性场景 + 3 tests 边界/不变性/预计算分）
- [x] 测试覆盖：空已选列表 penalty=0、连续同作者 penalty 递增、连续同分类 penalty、同作者+同分类叠加、无 author.id/无 contentCategory 边界
- [x] 测试覆盖：10 个 item（含相同作者）的多样性重排
- [ ] **缺口**：未验证分页一致性（同一游标不同时间请求返回相同帖子）-- 需集成测试或手动验证
- [ ] **缺口**：连续 3 条相同作者占比 ≤ 30% 的统计验收未验证 -- 需人工抽检

### REQ-002：推荐评分公式权重可配置化 -- 阻塞

- [x] SQL 侧 `buildRecommendationFreshnessMultiplierExpression` 半衰期从环境变量读取
- [x] SQL 侧 `buildRecommendedStaticBaseScoreExpression` 权重比从 `RECOMMENDATION_INTERACTION_WEIGHT` 读取
- [x] JS 侧 `feed-recommendation.ts` 的 `buildFreshnessMultiplier` 同步读取环境变量
- [x] JS 侧的 `freshnessAdjustedInteraction` 公式同步使用配置的权重比
- [x] 配置变量在模块顶层解析缓存
- [x] 8 个单元测试覆盖默认值/半衰期/权重/env var 边界
- [x] **未设置环境变量时使用默认值，行为与原硬编码 JS 公式一致**（但默认值与需求不符）
- [ ] **[BLOCKED]** 默认半衰期值不匹配需求：代码默认 42h（文章）/ 22h（动态），需求明确要求默认 36h（文章）/ 18h（动态）。见需求文档 REQ-002 验收标准第 1 条。

**证据** (`posts.repo.ts:246` 和 `feed-recommendation.ts:172`):
```typescript
// posts.repo.ts -- 默认值 42h，应为 36h
function getArticleHalfLifeHours(): number {
  // ...
  return Number.isFinite(value) && value > 0 ? value : 42;
}

// feed-recommendation.ts -- 默认值 42h，应为 36h
function getArticleHalfLifeHours(): number {
  // ...
  return Number.isFinite(value) && value > 0 ? value : 42;
}
```

需求文档 REQ-002 验收标准原文："文章半衰期从 42 小时调整为可配置参数（默认 36 小时）"、"动态半衰期从 22 小时调整为可配置参数（默认 18 小时）"。

### REQ-003：引入用户机型偏好信号 -- 有条件通过

- [x] `users.repo.ts` 新增 `getUserModelPreferences` 方法，查询近 30 天机型交互记录
- [x] `posts.repo.ts` 新增 `buildUserModelPreferenceBoostExpression` SQL 表达式
- [x] 偏好信号仅影响 `tab=recommended` Feed（代码 `if (input.tab === "recommended")`）
- [x] 未登录用户偏好加成默认为 0（`if (!currentUserId) return sql<number>`0`\`\``)
- [x] 偏好权重通过 `RECOMMENDATION_PREFERENCE_BOOST_WEIGHT` 环境变量配置（默认 5）
- [x] `users.service.ts` 新增 `buildUserModelPreferenceVector` 方法
- [x] 11 个测试覆盖表达式、repo、service
- [ ] **缺口**：异步更新逻辑未接入调度器 -- 仅提供了 `buildUserModelPreferenceVector` 函数入口，但未实现每周一次的定时调用
- [ ] **缺口**：偏好匹配使用"等效关联"（通过 rankings + rating_targets 间接匹配），而非直接 `post_aircraft_links` 表匹配。代码注释已说明此为近似方案，精确匹配需等专用关联表。

### REQ-004：丰富热门机型评分维度 -- 有条件通过

- [x] `ModelHotSeed` 扩展为 `interface`，新增 3 个可选字段
- [x] `buildModelHotScore` 公式包含新因子并保留原有因子
- [x] 新因子权重通过环境变量可配置（`MODEL_HOT_VIEW_WEIGHT=0.5`, `MODEL_HOT_SEARCH_WEIGHT=2.0`, `MODEL_HOT_RANKING_REF_WEIGHT=8.0`）
- [x] `aircraft-models.repo.ts` 新增 `getModelHotExtraData` 批量查询
- [x] `aircraft-models.service.ts` 在 `tab=recommended` 时传递新维度数据
- [x] 向后兼容：无新字段时默认 0
- [x] 12 个测试覆盖所有因子和向后兼容
- [ ] **缺口**：`recentSearchCount` 硬编码为 0（`aircraft-models.repo.ts:55`），代码注释标注"暂无搜索统计数据源"。这导致 3 个新维度中 1 个实际无效。

**证据** (`aircraft-models.repo.ts:55`):
```typescript
recentSearchCount: 0, // 暂无搜索统计数据源
```

### REQ-005：榜单热度服务端化 -- 有条件通过

- [x] 服务端新增 `buildRankingHotScore` 函数，算法与前端原实现一致
- [x] `GET /api/v1/rankings?sort=hot` 支持热度排序
- [x] `sort` 默认值为 `"latest"`，保持 API 向后兼容
- [x] `rankingsSortSchema` 校验 `sort` 参数
- [x] official 和 community 分组各自按热度降序排列
- [x] 首页侧边栏使用 `sort=hot&limit=3`
- [x] `rankings-page.tsx` 支持排序切换
- [x] `rankings-page-helpers.ts` 中 `buildRankingHotScore` 函数已删除
- [x] `mergeRankingsByTab` 中 `.hot` 分支已移除
- [x] 7 个单元测试覆盖等效性、官方加成、新鲜度边界
- [ ] **[IMPORTANT]** 修改了 `rankings.route.ts`，该文件在 TASK-005 的 `forbidden_paths` 中。虽然修改量小（仅添加 sort 参数解析），但根据计划应回主 Build Agent 评估影响。
- [ ] **[IMPORTANT]** 修改了 `packages/http-client/src/index.ts`，该文件不在 TASK-005 的 `allowed_paths` 中。虽然修改必要且向后兼容，但属于越界修改。

### REQ-006：侧边卡片统一规范 -- 有条件通过

- [x] 新建 `SidebarSection` 组件（`sidebar-section.tsx`），Props 使用 `interface` 定义
- [x] `maxItems` 默认值 3，内部自动截断
- [x] `HomeRailPanels` 已重构为使用 `SidebarSection` 渲染两个面板
- [x] 热门榜单查询参数为 `sort=hot&limit=3`
- [x] `isLoading` 态渲染骨架屏
- [x] Tailwind CSS 使用内联类名
- [x] 组件使用泛型支持不同列表项类型
- [ ] **缺口**：组件无独立单元测试（test_after 策略下预期应有集成/快照测试）
- [ ] **缺口**：热门榜单实际只展示 2 项（`useMemo` 中 `.slice(0, 2)`），虽在 ≤3 范围内，但与 `limit=3` 查询不匹配，浪费 1 条数据

### REQ-007：推荐查询性能优化 -- 通过

- [x] `packages/db/src/schema.ts` 新增 8 个索引定义，未修改任何列定义
- [x] 数据库迁移脚本 `0002_wandering_index.sql` 包含所有 `CREATE INDEX` 语句
- [x] `_journal.json` 正确记录迁移条目
- [x] 索引覆盖方向合理：posts 表（author_id, report_count, view_count）、aircraft_model_interactions（user_id+created_at 复合）、rating_targets（linked_model_id+status 复合）、rankings（author_id, updated_at）、aircraft_models（is_published）
- [ ] **缺口**：未提供 `EXPLAIN ANALYZE` 输出证据，无法确认索引被实际使用
- [ ] **缺口**：P95 ≤ 200ms 的性能目标未经验证（需要压测工具和 ≥100 次请求样本）

---

## 三、代码质量审查（五轴框架）

### 1. 正确性

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 默认值不匹配 | **[BLOCKED]** | REQ-002 要求将半衰期默认值从 42h/22h 调整为 36h/18h，代码保留了旧默认值（见前述证据） |
| latest/following Tab 隔离 | 通过 | 偏好加成仅在 `tab=recommended` 分支生效；重排器仅在 `tab=recommended` 时调用 |
| 分页一致性 | 未验证 | `recommendationNow` 时间戳在重排中用于新鲜度计算，理论上固定时间戳可保证结果确定，但缺少验证 |
| 空数据处理 | 通过 | 多处有空值保护：`modelIds.length === 0` 返回 `[]`；`!currentUserId` 返回 0；`hasMore` 截断保护 |
| env var 解析安全 | 通过 | 所有 env var 经过 `Number.isFinite` 检查，非数字回退默认值，空字符串回退默认值 |
| 向后兼容 | 通过 | 未设 env var 时算法与原硬编码一致（除了默认值变更意图未落实） |

### 2. 可读性

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 函数命名 | 通过 | `buildXxxExpression`、`getXxx`、`sortXxxByHotScore` 命名清晰 |
| 注释质量 | 通过 | SQL 表达式有 JSDoc 注释说明参数和返回；复杂逻辑（如等效关联）有分段注释 |
| 嵌套层级 | 通过 | 无超过 4 层嵌套 |
| 文件职责 | 通过 | 评分函数独立封装，repo 负责查询，service 负责编排 |
| 新组件清晰度 | 通过 | `SidebarSection` 接口清晰，泛型支持良好 |

### 3. 架构

| 检查项 | 状态 | 说明 |
|--------|------|------|
| DDD 分层 | 通过 | 评分算法在领域函数中（`buildXxxScore`），不泄露到路由层 |
| 模块耦合 | 通过 | 无新增循环依赖；跨模块通过 repo/service 正常调用 |
| TypeScript 规范 | 通过 | `ModelHotSeed` 改为 `interface`；`SidebarSectionProps` 使用 `interface`；`RankingForHotScore` 使用 `interface` |
| 共享区域隔离 | 部分通过 | schema.ts 仅新增索引（符合规范）；rankings.ts 新增可选字段（向后兼容）；http-client 扩展参数（向后兼容） |

### 4. 安全

| 检查项 | 状态 | 说明 |
|--------|------|------|
| SQL 注入 | 通过 | `users.repo.ts` 的 `dbPool.query` 使用 `$1` 参数化；Drizzle `sql` 模板自动参数化 |
| XSS | 通过 | 前端渲染使用 React JSX，无 `dangerouslySetInnerHTML` 新增 |
| 鉴权 | 通过 | 偏好查询仅在 `currentUserId` 存在时执行，未登录用户跳过 |
| 环境变量泄露 | 无风险 | env var 仅读取配置值，无敏感信息硬编码 |

### 5. 性能

| 检查项 | 状态 | 说明 |
|--------|------|------|
| N+1 查询 | 无新增 | `getModelHotExtraData` 批量查询；`getUserModelPreferences` 单次聚合查询 |
| 索引覆盖 | 通过 | 8 个新索引覆盖 posts/rankings/aircraft_models/aircraft_model_interactions/rating_targets |
| 异步非阻塞 | 通过 | 偏好向量查询为独立方法，未在 Feed 请求热路径中调用 |
| 查询复杂度 | 注意 | `buildUserModelPreferenceBoostExpression` 使用嵌套 EXISTS 子查询，需 EXPLAIN ANALYZE 确认性能 |
| 内存排序 | 通过 | `sortRankingsByHotScore` 在已从 DB 拉取的有限数据上排序，N 可控 |

---

## 四、共享区域审查

| 共享文件 | 修改内容 | 审查结论 |
|---------|---------|---------|
| `packages/schemas/src/rankings.ts` | 新增 `rankingsSortSchema`（`z.enum(["hot", "latest"]).default("latest")`） | **通过** -- 仅新增，`sort` 可选且默认 `"latest"`，完全向后兼容 |
| `packages/db/src/schema.ts` | 新增 8 个 Drizzle `index()` 定义 | **通过** -- 仅新增索引，未修改任何列定义或约束 |
| `packages/db/drizzle/0002_wandering_index.sql` | 新增 8 条 `CREATE INDEX` 语句 | **通过** -- 正确的 DDL，无破坏性操作 |
| `packages/http-client/src/index.ts` | `listRankings` 新增 `sort?: "hot" \| "latest"` 可选参数 | **通过** -- 扩展参数为可选，不破坏现有调用方 |
| `apps/web/tests/rankings-page-helpers.test.ts` | 移除 `buildRankingHotScore` 测试，更新 merge test | **通过** -- 测试与功能变更同步 |

---

## 五、行为准则审查

### 准则 3（精准修改）违规

| 违规 | 文件 | 说明 |
|------|------|------|
| **[IMPORTANT]** 越界修改 | `rankings.route.ts` | TASK-005 的 `forbidden_paths` 明确列出此文件，理由为"路由已有 query 参数解析，无需修改"。实际修改添加了 sort 参数解析逻辑。根据计划 escalation_rule，此修改应回主 Build Agent 评估。 |
| **[IMPORTANT]** 越界修改 | `packages/http-client/src/index.ts` | 不在 TASK-005 的 `allowed_paths` 中。修改增加 sort 参数透传，功能上必要，但未在 Execution Packet 中授权。 |

### 准则 2（简单优先）

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 过度设计 | 无 | 新增代码均为需求指定功能，无投机性抽象 |

### 准则 1（先思考再编码）

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 默认值与需求不一致 | **[BLOCKED]** | 实现者可能保持了旧值以降低风险，但未与需求对齐 |

---

## 六、问题列表（按严重度排序）

### 阻塞问题（必须修复才能合并）

**[BLOCKED] #1 -- REQ-002 默认半衰期值不匹配**

- 文件：`apps/server/src/modules/posts/posts.repo.ts:246,252` 和 `apps/server/src/modules/posts/feed-recommendation.ts:172,182`
- 证据：`getArticleHalfLifeHours()` 默认返回 42（应为 36），`getMomentHalfLifeHours()` 默认返回 22（应为 18）；测试文件 `posts-recommendation-score.test.ts:134` 注释也写 "With default half-life (22h for moment)"
- 影响：需求明确要求将默认值从 42/22 调整为 36/18，当前实现仅实现了可配置性但未落实默认值变更。用户体验优化意图未实现。
- 修复：将两处 `getArticleHalfLifeHours()` 的默认值 42 改为 36，`getMomentHalfLifeHours()` 的默认值 22 改为 18。同步更新测试文件中的注释和预期值。

### 重要问题（应修复）

**[IMPORTANT] #2 -- TASK-005 越界修改 rankings.route.ts**

- 文件：`apps/server/src/modules/rankings/rankings.route.ts:58-62`
- 证据：该文件在 TASK-005 Execution Packet 的 `forbidden_paths` 中明确列出，理由为"路由已有 query 参数解析，无需修改"。实际修改了 `listRankings` 路由处理函数，新增 sort 参数解析逻辑。
- 影响：虽然修改量小（+6/-3 行）且功能正确，但违反了执行计划的边界约束。根据 escalation_rule，此修改应触发 plan patch 或回主 Build Agent 评估。
- 修复：确认此修改是否有其他隐式影响；若无，记录为已审查的 plan patch 异常并补充到变更日志。

**[IMPORTANT] #3 -- TASK-005 越界修改 http-client**

- 文件：`packages/http-client/src/index.ts:1264-1272`
- 证据：该文件不在 TASK-005 Execution Packet 的 `allowed_paths` 中。修改了 `listRankings` 方法签名，新增 `sort` 可选参数。
- 影响：修改是必要且向后兼容的，但属于计划外修改。
- 修复：确认为已审查的 plan patch 异常并补充到变更日志。

**[IMPORTANT] #4 -- REQ-004 recentSearchCount 硬编码为 0**

- 文件：`apps/server/src/modules/aircraft-models/aircraft-models.repo.ts:55`
- 证据：`recentSearchCount: 0, // 暂无搜索统计数据源`
- 影响：REQ-004 要求引入"近 7 天搜索次数"作为新评分维度之一，但此维度因缺少数据源而实际无效。3 个新维度中 2 个生效（浏览、榜单引用），1 个不生效（搜索）。
- 修复：短期接受此限制并在需求文档中标注已知限制；长期需建立搜索行为的数据采集管道。

### 警告项（建议修复）

**[WARNING] #5 -- 热门榜单侧边栏显示 2 项而非 3 项**

- 文件：`apps/web/src/routes/home-page.tsx:204`
- 证据：`[...rankingsQuery.data.official, ...rankingsQuery.data.community].slice(0, 2)` + `<SidebarSection ... maxItems={2} ...>`
- 影响：虽然 ≤3 的约束得到满足，但服务端查询 `limit=3` 实际只用了 2 条，浪费 1 条数据。与 REQ-006"最多 3 项"的意图不完全一致（意在 3 项而非 2 项）。
- 修复：考虑改为 `slice(0, 3)` 和 `maxItems={3}`。

**[WARNING] #6 -- 偏好异步更新未接入调度**

- 文件：`apps/server/src/modules/users/users.service.ts:694-697`
- 证据：`buildUserModelPreferenceVector` 方法已实现但未接入任何定时调度器（cron job）。
- 影响：REQ-003 要求"偏好向量每周异步更新一次，不阻塞请求"。当前仅提供了计算函数，调用方需自行实现调度。
- 修复：在服务启动时注册定时任务（如 `node-cron` 或应用层 setInterval），每周调用 `buildUserModelPreferenceVector` 并缓存结果。

### 信息项

**[INFO] #7 -- 等效关联而非直接匹配**

- 位置：`posts.repo.ts:300-309`
- 说明：用户偏好匹配使用多跳"等效关联"（user -> interactions -> rating_targets -> rankings -> author -> post）而非直接的 `post_aircraft_links` 表。代码已注释说明此为近似方案。不影响功能正确性但精度有限。

**[INFO] #8 -- SidebarSection 缺少独立测试**

- 说明：REQ-006 策略为 `test_after`，预期应有组件集成/快照测试。当前 `SidebarSection` 组件无独立测试文件。

**[INFO] #9 -- EXPLAIN ANALYZE / P95 验证缺失**

- 说明：REQ-007 策略为 `manual_only`，要求提供 EXPLAIN ANALYZE 输出和 P95 压测数据。当前迁移脚本和索引定义已就绪，但性能验证证据未提供。

---

## 七、必须修复项（合并门禁）

1. **[BLOCKED]** 将 `posts.repo.ts` 和 `feed-recommendation.ts` 中 `getArticleHalfLifeHours()` 默认值从 42 改为 36
2. **[BLOCKED]** 将 `posts.repo.ts` 和 `feed-recommendation.ts` 中 `getMomentHalfLifeHours()` 默认值从 22 改为 18
3. **[BLOCKED]** 更新 `posts-recommendation-score.test.ts` 中的半衰期相关注释和预期值以匹配新默认值

---

## 八、优化建议

1. 为 `SidebarSection` 组件补充快照测试（REQ-006 test_after 策略的要求）
2. 为 REQ-007 补充 EXPLAIN ANALYZE 输出文档（性能验证证据）
3. 将 `home-page.tsx` 中的榜单侧边栏从 `maxItems={2}` 改为 `maxItems={3}`，与查询 `limit=3` 对齐
4. 在 staging 环境执行端到端验证：四个页面排序效果 + 侧边栏展示 + 响应时间基准
5. 设置环境变量 `RECOMMENDATION_ARTICLE_HALFLIFE_HOURS=36` 和 `RECOMMENDATION_MOMENT_HALFLIFE_HOURS=18` 作为部署配置（或等待代码默认值修复后自动生效）

---

## 九、回归风险评估

| 风险项 | 等级 | 说明 | 缓解措施 |
|--------|------|------|---------|
| `latest`/`following` Tab 被推荐算法影响 | **低** | 偏好加成和 JS 重排器均有 `tab === "recommended"` 条件守卫 | 代码已正确隔离 |
| 榜单 API 向后兼容性 | **低** | `sort` 默认 `"latest"`，不传参数时行为不变 | API 测试覆盖 |
| 数据库写入性能下降 | **低** | 8 个新索引均为常规 B-tree 索引，非唯一索引，写入开销可控 | 使用 `CREATE INDEX CONCURRENTLY`（如 PostgreSQL 支持） |
| 分页一致性漂移 | **中** | JS 重排器改变 item 顺序，游标编码依赖重排后 `lastItem` | 已按计划实现（重排后取 lastItem），需端到端验证 |
| 评分公式效果退化 | **中** | 默认半衰值如从 42h 改为 36h，旧帖衰减加速可能影响信息流新鲜度感知 | 可通过环境变量快速回退到旧值 |

---

## 十、变更规模评估

| 指标 | 数值 | 评估 |
|------|------|------|
| 修改文件数 | 19 | 合理 |
| 新增文件数 | 7（5 测试 + 1 组件 + 1 迁移脚本） | 合理 |
| 新增行数 | 540 | 符合预期 |
| 删除行数 | 215 | 合理（删除前端热度算法和旧侧边栏代码） |
| 净增行数 | 325 | 可接受 |
| 总变更行数 | 755 | 在 1000 行阈值内，一次审查可覆盖 |

**总变更行数 755 行（含测试代码），在 820 行预估范围内，一轮审查可安全完成。**

---

## 十一、测试覆盖状态

| 测试文件 | 测试数 | 覆盖任务 | 状态 |
|---------|--------|---------|------|
| `feed-recommendation.test.ts` | 11 | TASK-001 | **通过**（需更新默认值相关断言） |
| `posts-recommendation-score.test.ts` | 8 | TASK-002 | **需更新**（默认值变更后需调整） |
| `user-model-preference.test.ts` | 11 | TASK-003 | 通过 |
| `model-hot-score.test.ts` | 12 | TASK-004 | 通过 |
| `ranking-hot-score.test.ts` | 7 | TASK-005 | 通过 |
| `rankings-page-helpers.test.ts` | 1（修改） | TASK-005 | 通过（已移除 hot score 测试） |

**测试总计：50 个测试，覆盖 5 个 TDD 任务。test_after（TASK-006）和 manual_only（TASK-007）的验证证据缺失。**

---

## 十二、红线检查

| 红线 | 状态 |
|------|------|
| 需求模糊时自行补全 | 未触发 -- 需求文档清晰完整 |
| 没有完整追踪矩阵就下结论 | 已输出完整追踪矩阵 |
| 用"看起来没问题"替代证据 | 每条 finding 有文件路径和行号 |
| 变更超过 1000 行但未评估拆分 | 755 行，无需拆分 |
| 跳过某个审查维度 | 五轴全部覆盖 |

---

## 十三、变更日志

| 日期 | 变更内容 | 原因 |
|------|---------|------|
| 2026-05-04 | 初始评审报告，覆盖全部 7 个 REQ/TASK | Gate D 最终评审 |

---

> **下一步：** 主 Build Agent 根据本报告决定是否通过。阻塞问题（#1 默认半衰期值）必须在合并前修复。重要问题（#2-#4）应在合并前确认或记录。修复后由 review-qa 进行复审确认。
