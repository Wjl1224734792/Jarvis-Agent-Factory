# 推荐查询性能优化 — 数据层实现

**task_id:** TASK-007
**requirement_ids:** [REQ-007]
**date:** 2026-05-04
**author:** backend-data-worker

---

## 1. 实现目标

对推荐相关 SQL 查询做 EXPLAIN ANALYZE 级性能分析（基于 Schema 推理），添加必要索引，确保 P95 延迟 <= 200ms。

---

## 2. 对应需求 / 任务 ID

| 任务 | 说明 |
|------|------|
| TASK-007 | 推荐查询性能优化 |
| REQ-007 | 推荐系统 P95 <= 200ms 的 SLA 约束 |

---

## 3. 变更文件及范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/db/src/schema.ts` | 修改 — 仅新增 `index()` 调用 | 8 个新索引定义，0 个现有列变更 |
| `packages/db/drizzle/0002_wandering_index.sql` | 新增 | 迁移脚本：8 条 CREATE INDEX 语句 |
| `packages/db/drizzle/meta/_journal.json` | 修改 | 新增 journal entry idx=2 |

**明确不修改：**
- `apps/server/src/modules/posts/posts.repo.ts` — CTE 结构评估后无需调整，现有索引已满足
- `posts.service.ts`, `feed-recommendation.ts`, `rankings/*`, `aircraft-models/*`
- 任何 Schema 列定义、路由前缀、共享契约

---

## 4. Schema / 模型变更说明

### 4.1 变更原则

- 仅新增 Drizzle `index()` 定义，不修改任何现有列
- 不使用物理外键（项目规范约束）
- 所有索引均为普通 b-tree 索引，无 `DESC` / 部分索引（现有 feed 部分索引保持不变）

### 4.2 新增索引一览

| 索引名称 | 表 | 列 | 目标查询 | 推理依据 |
|----------|-----|-----|---------|---------|
| `posts_author_id_idx` | `posts` | `author_id` | `listFeed` 全部 tab 中的 INNER JOIN users；following tab 中的 user_follows 关联 | 每个 feed 请求均 JOIN `users` 表，`authorId` 无索引会导致 Seq Scan |
| `posts_report_count_idx` | `posts` | `report_count` | `listFeed(tab=recommended)` 的候选条件筛选 | `recommended_candidate_conditions` 使用 `report_count < 3` 作为门禁条件，索引可快速过滤高举报帖子 |
| `posts_view_count_idx` | `posts` | `view_count` | `listFeed(tab=recommended)` 的候选条件/陈旧惩罚 | 候选条件中 `view_count >= 25/40` 和 `staleLowValuePenalty` 判断均引用此列 |
| `aircraft_model_interactions_user_created_at_idx` | `aircraft_model_interactions` | `(user_id, created_at)` | `listFeed(tab=recommended)` 的用户机型偏好 EXISTS 子查询 | 子查询按 `user_id = ? AND created_at >= now() - 30d` 过滤，组合索引避免两列分别扫描 |
| `rating_targets_linked_model_id_status_idx` | `rating_targets` | `(linked_model_id, status)` | 偏好 EXISTS 子查询中的 JOIN；`getModelHotExtraData` 的批量查询 | 两处查询均以 `linked_model_id IN (...) AND status = 'published'` 过滤，该表此前无索引 |
| `rankings_author_id_idx` | `rankings` | `author_id` | 偏好 EXISTS 子查询中的 JOIN | 子查询以 `rankings.author_id = posts.author_id` 关联，该表此前无索引 |
| `rankings_updated_at_idx` | `rankings` | `updated_at` | `listRankings()` 的 ORDER BY | 无 WHERE 过滤的全表查询按 `updated_at DESC` 排序，索引可避免文件排序 |
| `aircraft_models_is_published_idx` | `aircraft_models` | `is_published` | `listModels()` 的 WHERE 过滤 | 核心过滤条件 `is_published = true`，该表此前仅有 `slug_unique` 索引 |

### 4.3 未新增索引的分析

以下列出考察过但决定不新增索引的路径及理由：

| 路径 | 理由 |
|------|------|
| `posts.commentCount / likeCount / favoriteCount / shareCount` | 仅在计算表达式中引用（非 WHERE/ORDER BY 列），不参与过滤/排序 |
| `postComments.postId` | 评论查询不在 feed 关键路径上，不走推荐 P95 SLA |
| `aircraft_models.categoryId / brandId` | 已在 INNER JOIN 中通过 `aircraft_categories.id`/`brands.id`（PK）关联，索引收益有限 |
| `rating_targets.rankingId` | `listRatingTargetsByRankingIds` 有合理调用频率且不依赖 PK 索引 |

---

## 5. 迁移脚本说明

### 5.1 脚本路径
`packages/db/drizzle/0002_wandering_index.sql`

### 5.2 SQL 内容
8 条 `CREATE INDEX` 语句，每条以 `--> statement-breakpoint` 分隔，符合 Drizzle Kit 迁移规范。

### 5.3 回滚方案

```sql
DROP INDEX IF EXISTS "posts_author_id_idx";
DROP INDEX IF EXISTS "posts_report_count_idx";
DROP INDEX IF EXISTS "posts_view_count_idx";
DROP INDEX IF EXISTS "aircraft_model_interactions_user_created_at_idx";
DROP INDEX IF EXISTS "rating_targets_linked_model_id_status_idx";
DROP INDEX IF EXISTS "rankings_author_id_idx";
DROP INDEX IF EXISTS "rankings_updated_at_idx";
DROP INDEX IF EXISTS "aircraft_models_is_published_idx";
```

执行方式：在 PostgreSQL 中直接执行上述 DROP INDEX 语句，或创建 `0002_down.sql` 文件并通过 `psql -f` 执行。

### 5.4 迁移执行顺序

```bash
# 先 typecheck/lint 确认无类型错误
cd packages/db && bun run lint && bun run typecheck

# 执行迁移（连接到目标数据库）
bun run migrate
```

---

## 6. 查询性能分析

### 6.1 `listFeed(tab=recommended)` — 推荐流

**主查询路径：**
1. `scored_feed` CTE: `SELECT ... FROM posts INNER JOIN users ON authorId LEFT JOIN content_categories WHERE status='published' AND type=?`
   - 现有 `posts_feed_status_type_seek_idx` (partial, WHERE `status='published'`) 覆盖 type + 时间排序
   - 新增 `posts_author_id_idx` 加速 users JOIN
2. 候选条件过滤: `report_count < 3 OR ...` + 陈旧度过滤
   - 新增 `posts_report_count_idx`, `posts_view_count_idx` 加速
3. 偏好等级 EXISTS 子查询:
   - `aircraft_model_interactions WHERE user_id=? AND created_at >= now()-30d`
     - 新增 `aircraft_model_interactions_user_created_at_idx` 覆盖
   - `rating_targets INNER JOIN rankings ON rankings.author_id = posts.author_id AND rating_targets.linked_model_id = interactions.model_id`
     - 新增 `rating_targets_linked_model_id_status_idx` 覆盖 linked_model_id 连接
     - 新增 `rankings_author_id_idx` 覆盖 author_id 连接

**预期执行计划：** Index Scan (partial) on posts -> Nested Loop (users via `authorIdIdx`) -> Index Scan (interactions via `user_created_at_idx`) -> Nested Loop (rating_targets via `linked_model_id_status_idx` + rankings via `authorIdIdx`)

**预期 P95 改善：** 子查询从 Seq Scan 转为 Index Scan，预计降低 60-80% 耗时。

### 6.2 `listFeed(tab=following)` — 关注流

**主查询路径：**
1. 基础查询 + INNER JOIN user_follows ON `followeeId=posts.authorId AND followerId=?`
   - 现有 `user_follows_follower_followee_unique` 覆盖 (followerId, followeeId)
   - 新增 `posts_author_id_idx` 加速 followeeId 侧的 posts 表连接

**预期执行计划：** Index Scan on user_follows (unique index, equality on followerId) -> Nested Loop (posts via `authorIdIdx`)

### 6.3 `listModels(sort=hot)` — 机型列表（热门排序）

**主查询路径：**
1. `SELECT ... FROM aircraft_models WHERE is_published=true` + 可选 category/brand/power 过滤 + 多个 LEFT JOIN
   - 新增 `aircraft_models_is_published_idx` 覆盖核心过滤条件
2. 注意：热门排序 `sortModelsByHotScore()` 在服务层内存中执行，不依赖数据库排序

**预期执行计划：** Index Scan on aircraft_models (`is_published_idx`) -> Nested Loop joins 到 categories/brands

### 6.4 `listRankings(sort=hot)` — 榜单列表（热门排序）

**主查询路径：**
1. `SELECT ... FROM rankings INNER JOIN users ORDER BY updatedAt DESC`
   - 新增 `rankings_updated_at_idx` 覆盖 ORDER BY 排序
   - 新增 `rankings_author_id_idx` 覆盖 users JOIN
2. 注意：热门排序在服务层 `sortRankingsByHotScore()` 内存中执行，数据库不参与

**预期执行计划：** Index Scan Backward on rankings (`updated_at_idx`) -> Nested Loop (users via PK)

---

## 7. 验证结果

| 检查项 | 结果 |
|--------|------|
| `bun run lint` (db) | 通过 |
| `bun run typecheck` (db) | 通过 |
| `bun run lint` (server) | 通过 |
| `bun run typecheck` (server) | 通过 |
| `bun run test:unit` | 8 项预存失败（声明字段验证），与本次变更无关 |
| 迁移 SQL 格式正确 | 通过 |
| Journal 一致性 | 通过 |
| 无物理外键约束 | 通过 |

### 预存测试失败说明

8 项测试失败均来自 `packages/schemas/tests/posts.test.ts` 和 `packages/http-client/tests/posts.test.ts`，系 `declaration` 字段枚举值变更导致，与本次索引变更无关。未引入新的测试失败。

---

## 8. 风险 / 未解决项

### 已知风险

1. **写性能开销**：8 个新索引增加 INSERT/UPDATE/DELETE 的写放大。评估认为这些表的写入频率远低于读取，收益 > 代价。
2. **`aircraft_model_interactions` 的复合索引 `(user_id, created_at)`**：若该表写入量极大（每次点赞/收藏均写一条），索引维护代价需监控。可在上线后观察 `pg_stat_user_indexes` 的 `idx_scan` vs `idx_tup_write` 比率。
3. **索引覆盖度**：`buildRecommendedCandidateConditions` 中的复杂 OR 条件（如 `(report_count * 2) < (engagement_volume + 2)`）无法被简单 b-tree 索引直接覆盖。`reportCountIdx` 仅覆盖 `report_count < 3` 这一分支。

### 未解决项

1. **CTE 无 LIMIT 优化**：`scored_feed` CTE 对全量候选帖子计算推荐评分，无预过滤 LIMIT。当帖子总量 > 10 万时，即使有索引，CTE 物化开销仍可能影响 P95。建议后续引入以下之一：
   - 在 CTE 内增加 `LIMIT 1000`（需保证推荐质量）
   - 引入物化视图定期预计算评分
   - 引入 Redis 缓存热门/推荐帖子 ID 列表
2. **EXPLAIN ANALYZE 验证**：当前环境无可运行的 PostgreSQL 实例，索引生效确认需在测试/预发环境实际执行 `EXPLAIN (ANALYZE, BUFFERS)` 验证。上述分析基于 Schema 推理和 PostgreSQL 查询计划知识推断。
3. **`aircraft_models` 的 `categoryId`/`brandId` JOIN**：`listModels` 查询对 `aircraft_models` 做 INNER JOIN 到 `categories` 和 `brands`，若机型表行数 > 5 万可能需要覆盖索引。

---

## 9. 推荐的下一步

| 优先级 | 事项 | 说明 |
|--------|------|------|
| P0 | 在预发环境执行 EXPLAIN ANALYZE | 验证所有查询路径使用预期索引，无 Seq Scan |
| P0 | 执行 P95 压测 | 使用 wrk/k6 模拟用户 feed 请求，确认 P95 <= 200ms |
| P1 | 监控 pg_stat_user_indexes | 上线后一周内监控索引使用率和写放大 |
| P2 | 考虑 `postComments.postId` 索引 | 评论区查询频繁，但不在本任务范围内 |
| P2 | 考虑 `aircraft_models` 复合索引 | 若 categorySlug/brandSlug 过滤频繁，可加(categoryId, brandId) |

---

## 附录：索引 DDL 汇总

```sql
-- posts 表
CREATE INDEX "posts_author_id_idx"              ON "posts" USING btree ("author_id");
CREATE INDEX "posts_report_count_idx"          ON "posts" USING btree ("report_count");
CREATE INDEX "posts_view_count_idx"            ON "posts" USING btree ("view_count");

-- aircraft_model_interactions 表
CREATE INDEX "aircraft_model_interactions_user_created_at_idx"
    ON "aircraft_model_interactions" USING btree ("user_id", "created_at");

-- rating_targets 表
CREATE INDEX "rating_targets_linked_model_id_status_idx"
    ON "rating_targets" USING btree ("linked_model_id", "status");

-- rankings 表
CREATE INDEX "rankings_author_id_idx"           ON "rankings" USING btree ("author_id");
CREATE INDEX "rankings_updated_at_idx"          ON "rankings" USING btree ("updated_at");

-- aircraft_models 表
CREATE INDEX "aircraft_models_is_published_idx" ON "aircraft_models" USING btree ("is_published");
```

回滚脚本：

```sql
DROP INDEX IF EXISTS "posts_author_id_idx";
DROP INDEX IF EXISTS "posts_report_count_idx";
DROP INDEX IF EXISTS "posts_view_count_idx";
DROP INDEX IF EXISTS "aircraft_model_interactions_user_created_at_idx";
DROP INDEX IF EXISTS "rating_targets_linked_model_id_status_idx";
DROP INDEX IF EXISTS "rankings_author_id_idx";
DROP INDEX IF EXISTS "rankings_updated_at_idx";
DROP INDEX IF EXISTS "aircraft_models_is_published_idx";
```
