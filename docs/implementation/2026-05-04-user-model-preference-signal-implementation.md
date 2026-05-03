# TASK-003: 引入用户机型偏好信号 — 实现文档

## 1. 当前实现目标

本任务在 TASK-002 已完成的 `posts.repo.ts` 基础上，引入用户机型偏好信号。偏好信号根据用户近 30 天与机型模型的交互记录（通过 `aircraft_model_interactions` 表），在推荐 Feed 中给予匹配机型帖子小幅加分。

## 2. 对应需求 ID / 任务 ID

- **Requirement**: REQ-003（用户机型偏好信号）
- **Task**: TASK-003（引入用户机型偏好信号）
- **依赖**: TASK-002（推荐评分公式权重可配置化）

## 3. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `apps/server/src/modules/posts/posts.repo.ts` | 修改 | 新增 `getPreferenceBoostWeight()`、`buildUserModelPreferenceBoostExpression()`，修改 `listFeed` 推荐 Tab 评分 |
| `apps/server/src/modules/users/users.repo.ts` | 修改 | 新增 `getUserModelPreferences()` 方法 |
| `apps/server/src/modules/users/users.service.ts` | 修改 | 新增 `buildUserModelPreferenceVector()` 方法 |
| `apps/server/tests/user-model-preference.test.ts` | 新建 | 11 个 TDD 单元测试 |

### 未修改的文件（确认范围合规）

- `posts.service.ts` — TASK-001 独占
- `feed-recommendation.ts` — TASK-001/TASK-002 共享
- `rankings/*` — 未触碰
- `aircraft-models/*` — 未触碰
- `packages/*` — 未触碰
- `apps/web/*` — 未触碰

## 4. 业务规则说明

### 4.1 偏好信号计算逻辑

1. **数据源**: `aircraft_model_interactions` 表中用户近 30 天的交互记录（浏览、收藏等）
2. **匹配方式**: 通过"等效关联"间接匹配——
   - 用户偏好机型 X（在 `aircraft_model_interactions` 中有记录）
   - 帖子作者创建过榜单（`rankings`），榜单包含评分目标（`rating_targets`），且评分目标关联了机型 X（`linkedModelId`）
   - 匹配成功时帖子获得偏好加分
3. **加分值**: 通过 `RECOMMENDATION_PREFERENCE_BOOST_WEIGHT` 环境变量配置（默认 5）
4. **加分范围**: 仅 `tab=recommended` Feed

### 4.2 与 TASK-002 的兼容性

- TASK-002 的函数签名未变：`buildRecommendedStaticBaseScoreExpression(type, currentUserId, recommendationNow)`
- TASK-002 的 CTE 结构未变：偏好信号作为 SQL 表达式直接叠加到现有 `recommendationBaseScore` 列
- `buildUserModelPreferenceBoostExpression` 为独立新函数，不修改现有函数

### 4.3 帖子-机型关联的"等效关联"方案

由于数据库中暂无 `post_aircraft_links` 表，偏好匹配通过以下间接路径实现：

```
aircraft_model_interactions (用户 ↔ 机型 X)
    ↓
rating_targets.linkedModelId = aircraft_model_interactions.modelId
    ↓
rankings.authorId = posts.authorId (榜单作者 = 帖子作者)
```

当未来添加 `post_aircraft_links` 表后，应直接使用该表做精确匹配。

## 5. 状态机 / 状态转换说明

不适用 — 本任务不涉及状态机逻辑。

## 6. 权限与幂等性说明

| 场景 | 行为 |
|------|------|
| 未登录用户 | `currentUserId` 为 null/undefined → `buildUserModelPreferenceBoostExpression` 直接返回 0，不产生子查询 |
| 有偏好的用户 | 使用用户 ID 构建 SQL CASE/EXISTS 子查询，匹配成功时返回配置的权重值 |
| 已登录但无偏好的用户 | EXISTS 子查询返回 false → ELSE 0 |
| 无关联机型的帖子 | EXISTS 子查询中的关联路径不匹配 → ELSE 0 |

幂等性：偏好加分仅依赖当前用户的静态偏好数据（30 天窗口），重复执行相同查询返回一致结果。

## 7. 测试和验证结果

### 7.1 单元测试覆盖

| 测试 | 验证内容 | 状态 |
|------|---------|------|
| `currentUserId=null` 返回 0 | 未登录用户无加分 | 通过 |
| `currentUserId=undefined` 返回 0 | 同上 | 通过 |
| 提供 userId 返回 CASE/EXISTS 表达式 | 有偏好用户获得加分 | 通过 |
| 自定义 env var `RECOMMENDATION_PREFERENCE_BOOST_WEIGHT=10` | 权重可配置 | 通过 |
| env var 为空字符串时使用默认值 5 | 向后兼容 | 通过 |
| env var 为非法值时使用默认值 5 | 鲁棒性 | 通过 |
| null userId + env var 仍返回 0 | 未登录优先级高于 env var | 通过 |
| `usersRepo.getUserModelPreferences` 存在 | 接口正确性 | 通过 |
| 不存在的用户返回空数组 | 边界处理 | 通过 |
| `usersService.buildUserModelPreferenceVector` 存在 | 接口正确性 | 通过 |
| 不存在的用户返回空数组 | 边界处理 | 通过 |

### 7.2 验证结果

- lint: 通过
- TypeScript typecheck: 通过
- 单元测试: 11/11 通过
- 关联测试未回退：`posts-recommendation-score.test.ts` 8 项全部通过
- 预存在的基础设施测试失败：`posts-recommended-window.test.ts` / `posts.test.ts` 为迁移环境问题（`42P07`），与本次变更无关

## 8. 风险 / 未解决项

### 已知风险

| 风险 | 等级 | 说明 | 缓解措施 |
|------|------|------|---------|
| 等效关联匹配精度有限 | 低 | 通过 `ranking_targets.linkedModelId` 和 `rankings.authorId` 做间接匹配，覆盖率可能不如直接链接表 | 代码已注释说明，待 `post_aircraft_links` 表就绪后改用直接匹配 |
| 子查询性能 | 低 | `buildUserModelPreferenceBoostExpression` 包含嵌套 EXISTS 子查询，对推荐 Feed 查询有额外开销 | 偏好向量可预计算并缓存（`users.service.ts` 已提供 `buildUserModelPreferenceVector` 方法）；未登录用户无子查询开销 |

### 未解决项

- 偏好向量的异步缓存逻辑（Redis）未实现 — 当前设计已预留接口（`buildUserModelPreferenceVector`），但缓存层需在 TASK-007 或独立基础设施任务中添加
- 偏好得分仅作为 SQL 表达式层加分，未同步到 JS 侧重排器（`feed-recommendation.ts`）— 根据任务范围限制（禁止修改 `feed-recommendation.ts`），此部分留给后续任务

## 9. 推荐的下一步

1. **添加 `post_aircraft_links` 表**：在共享 schema（`packages/db/src/schema.ts`）中创建帖子-机型关联表，替换当前的"等效关联"方案，实现精确匹配
2. **Redis 缓存偏好向量**：使用 `users.service.ts` 的 `buildUserModelPreferenceVector` 方法，将偏好向量缓存到 Redis（key: `user:preference:{userId}`），避免每次 Feed 请求执行聚合子查询
3. **同步 JS 侧重排器**：在 TASK-001 或后续任务中，将偏好信号同步到 `rankFeedItemsByRecommendation` 函数的评分逻辑
4. **偏好更新定时任务**：实现每周一次的偏好向量异步更新任务（当前 `buildUserModelPreferenceVector` 为按需调用）
