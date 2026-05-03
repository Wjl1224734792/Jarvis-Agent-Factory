# Feed Diversity Reorderer 接入实现文档

## 1. 当前实现目标

在首页和飞友圈推荐信息流中接入 `rankFeedItemsByRecommendation`，利用其内置的多样性惩罚（`buildDiversityPenalty`）降低连续同作者/同分类内容的频率，提升信息流消费体验。

## 2. 对应需求 ID / 任务 ID

- **Task ID**: TASK-001
- **Requirement IDs**: [REQ-001]

## 3. 变更文件 / 变更范围

### 修改的文件

| 文件 | 变更类型 | 变更说明 |
|------|---------|---------|
| `apps/server/src/modules/posts/feed-recommendation.ts` | 导出增强 | 添加 `export` 到 `FeedRecommendationItem` 类型、`ScoredFeedRecommendationItem` 类型、`buildDiversityPenalty` 函数 |
| `apps/server/src/modules/posts/posts.service.ts` | 业务集成 | 在 `listFeed` 方法中 `tab === "recommended"` 分支调用重排器 |
| `apps/server/tests/feed-recommendation.test.ts` | 新建 | 11 个单元测试覆盖 `buildDiversityPenalty` 和 `rankFeedItemsByRecommendation` 的多样性行为 |

### 未修改（但已读取理解）

- `apps/server/src/modules/posts/posts.repo.ts` — 未修改，仅读取其 SQL 返回结构
- `apps/server/src/modules/posts/posts-presenters.ts` — 未修改，仅读取 `serializePostListItem` 和 `toViewerState` 签名
- `apps/server/src/modules/posts/feed-cursor.ts` — 未修改，仅读取游标编码逻辑

## 4. 业务规则说明

### 4.1 重排触发条件

仅在 `listFeed` 的 `tab === "recommended"` 时触发重排，`latest` 和 `following` 分支维持原有排序不变。

### 4.2 重排时机

重排发生在以下数据就绪之后、序列化之前：

1. SQL 查询返回原始 items（含 `recommendationBaseScore`）
2. 加载 viewer 互动状态（`listViewerInteractions`、`listFollowingStateSet`）
3. 构建 `interactionMap`
4. **→ 重排触发**（新插入步骤）
5. `serializePostListItem` 序列化（使用重排后的 items）
6. 游标编码（基于重排后最后一项）

### 4.3 数据映射

SQL 行到 `FeedRecommendationItem` 的映射逻辑：

| FeedRecommendationItem 字段 | SQL 行来源 |
|---------------------------|-----------|
| `id` | `item.id` |
| `title` | `item.title` |
| `contentPreview` | `item.contentPlainText`（截断至 160 字符） |
| `viewCount` | `item.viewCount` |
| `reportCount` | `item.reportCount` |
| `commentCount` | `item.commentCount` |
| `engagement.likeCount` | `item.likeCount` |
| `engagement.favoriteCount` | `item.favoriteCount` |
| `engagement.shareCount` | `item.shareCount` |
| `engagement.viewer` | 通过 `toViewerState` 从 `interactionMap` 和 `followingAuthorIds` 构建 |
| `author.id` | `item.author.id` |
| `author.role` | `item.author.role`（cast 为 `"user" | "admin"`） |
| `images` | `[]`（序列化阶段单独加载） |
| `videos` | `[]`（序列化阶段单独加载） |
| `createdAt` | `item.createdAt.toISOString()` |
| `updatedAt` | `item.updatedAt.toISOString()` |
| `publishedAt` | `item.publishedAt?.toISOString() ?? null` |
| `contentCategory` | `item.contentCategory?.id ? { id, slug, name } : null` |

### 4.4 `precomputedBaseScores` 传递

SQL 查询已通过 `buildRecommendedStaticBaseScoreExpression` 计算出 `recommendationBaseScore`。重排时收集 `item.recommendationBaseScore` 构建 `Map<itemId, score>` 传入 `precomputedBaseScores`，避免重复计算静态分数。

### 4.5 游标一致性

重排后 `items` 数组顺序改变，`lastItem = items.at(-1)` 返回的是重排后数组的最后一项。该 SQL 行仍保留 `recommendationBaseScore` 和 `publishedAt`/`createdAt`，游标编码流程无需额外调整。

## 5. 状态机 / 状态转换说明

不适用——本任务是纯数据重排，不涉及状态转换。

## 6. 权限与幂等性说明

### 权限

- `currentUser` 的 viewer 互动状态（`followingAuthorIds`、`interactionMap`）由调用 `listFeed` 前就已计算，重排仅消费这些数据，不新增权限检查。
- `buildAffinityPenalty` 使用 viewer 的 `hasLiked`/`hasFavorited`/`hasShared`/`isFollowingAuthor` 状态，这些数据已授权。

### 幂等性

- `rankFeedItemsByRecommendation` 是纯函数：相同输入（items、type、precomputedBaseScores、now）始终产生相同输出。
- 重排不修改原始 items，不写入数据库，不产生副作用。

## 7. 测试和验证结果

### 测试文件

`apps/server/tests/feed-recommendation.test.ts` — 11 个测试用例

#### `buildDiversityPenalty` 测试（8 个）

| 测试场景 | 验证内容 |
|---------|---------|
| 空 selected 列表（article） | penalty = 0 |
| 空 selected 列表（moment） | penalty = 0 |
| 同作者（article 类型） | 应用 sameAuthorCount + recentItem + category + stacking 惩罚 |
| 同作者（moment 类型） | 验证 moment 使用不同的乘法因子 |
| 同作者不同分类 | 仅 author 惩罚，无 category 惩罚 |
| 同分类不同作者 | 仅 category 惩罚，无 author 惩罚 |
| 同作者 + 同分类叠加验证 | 所有惩罚项叠加 |
| 无 author.id 边界 | 跳过 author 惩罚 |
| 无 category.slug 边界 | 跳过 category 惩罚 |
| 同作者出现次数越多惩罚递增 | sameAuthorCount=2 惩罚翻倍 |
| recentItems 检测（作者不在最近 2 项中） | 无 recentItem 惩罚 |

#### `rankFeedItemsByRecommendation` 多样性测试（4 个）

| 测试场景 | 验证内容 |
|---------|---------|
| 同作者重排 | items [1(a1), 2(a1), 3(a2)] → [1, 3, 2] |
| 5 items / 3 作者多样性 | 验证 output 包含所有 items，第二项非重复作者 |
| 10 items 混合作者/分类 | 验证无丢失/重复 |
| 全同作者/同分类 | 验证不丢 item，无重复 |
| `precomputedBaseScores` 使用 | 验证分数传入后正确排序 |
| 原始数组不可变性 | 验证 `rankFeedItemsByRecommendation` 不修改输入 |

### 验证结果

- **lint**: 通过（零新增 error/warning）
- **typecheck**: 通过（仅 `ranking-hot-score.test.ts` 存在预置类型错误，非本任务引入）
- **测试**: 全部 11 个新增测试通过；现有 `posts-recommendation-score.test.ts` 8 个测试通过
- **构建**: 通过

## 8. 风险 / 未解决项

- 无已知风险

## 9. 推荐的下一步

1. 观察推荐页游标分页行为是否因重排导致重复/丢失
2. 如有必要可调整 `buildDiversityPenalty` 的惩罚系数
3. 后续可在 `feed-recommendation.ts` 中进一步优化重排算法
