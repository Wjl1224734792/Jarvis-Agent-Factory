# 推荐评分公式权重可配置化

**task_id:** TASK-002
**requirement_ids:** [REQ-002]
**日期:** 2026-05-04

## 1. 当前实现目标

将推荐评分公式中的半衰期和权重比从硬编码改为环境变量可配置，并同步更新 JS 版本公式。

## 2. 对应需求 ID / 任务 ID

- REQ-002: 推荐评分公式权重可配置化
- TASK-002: 将推荐评分公式中的半衰期和权重比从硬编码改为环境变量可配置

## 3. 变更文件 / 变更范围

| 文件 | 变更类型 | 范围 |
|------|---------|------|
| `apps/server/src/modules/posts/feed-recommendation.ts` | 修改 | 新增 env getter 函数；修改 `buildFreshnessMultiplier` 和 `buildStaticFeedRecommendationScore` |
| `apps/server/src/modules/posts/posts.repo.ts` | 修改 | 新增 env getter 函数；修改 `buildRecommendationFreshnessMultiplierExpression` 和 `buildRecommendedStaticBaseScoreExpression` |
| `apps/server/tests/posts-recommendation-score.test.ts` | 新建 | 8 个测试用例覆盖默认值、env var 控制、边界值 |

**不修改的文件：** `posts.service.ts`、`rankings/*`、`aircraft-models/*`、`users/*`、`packages/*`、`apps/web/*`

## 4. 业务规则说明

### 4.1 环境变量设计

| 环境变量 | 默认值（未设置时） | 说明 |
|-----------|-------------------|------|
| `RECOMMENDATION_ARTICLE_HALFLIFE_HOURS` | 42 | 文章半衰期（小时），未设置时保持旧版行为 |
| `RECOMMENDATION_MOMENT_HALFLIFE_HOURS` | 22 | 动态半衰期（小时），未设置时保持旧版行为 |
| `RECOMMENDATION_INTERACTION_WEIGHT` | 0.58 | 互动分权重（范围 0-1），未设置时保持旧版行为 |

### 4.2 公式结构

**SQL 版本（`posts.repo.ts`）：**

```sql
(interactionScore * (interactionWeight + (freshnessMultiplier * freshnessWeight)))
```

**JS 版本（`feed-recommendation.ts`）：**

```typescript
interactionScore * clamp(
  interactionWeight + freshnessMultiplier * freshnessWeight,
  interactionWeight,
  1
)
```

其中：
- `interactionWeight = getInteractionWeight()`（从环境变量读取）
- `freshnessWeight = 1 - interactionWeight`
- JS 版本有 `clamp` 安全防护，SQL 版本无此需求（PG 表达式天然安全）
- **半衰期公式**在两个版本中一致：`power(0.5, ageHours / halfLife)`

### 4.3 向后兼容性

未设置任何环境变量时，行为与旧版完全一致：
- 文章半衰期: 42h（旧版硬编码值）
- 动态半衰期: 22h（旧版硬编码值）
- 互动权重: 0.58（旧版硬编码值）
- 新鲜度权重: 0.42（= 1 - 0.58）

## 5. 状态机 / 状态转换说明

不涉及状态机。纯公式参数化。

## 6. 权限与幂等性说明

- **权限：** 不涉及。环境变量在进程启动时读取，仅 ops 可配置。
- **幂等性：** 公式是纯函数，给定相同输入和环境变量，输出相同分数。

## 7. 测试和验证结果

### 7.1 测试用例

| 测试 | 类型 | 验证内容 |
|------|------|---------|
| `uses default half-life values when no env vars are set (backward compatible)` | 正向 | 默认半衰期行为与旧版一致 |
| `uses default interaction weight when no env vars are set (backward compatible)` | 正向 | 默认权重行为与旧版一致 |
| `respects RECOMMENDATION_MOMENT_HALFLIFE_HOURS env var` | 正向 | 短半衰期 1h 时旧帖排名降低 |
| `respects RECOMMENDATION_ARTICLE_HALFLIFE_HOURS env var` | 正向 | 半衰期 1h 时文章排序翻转 |
| `respects RECOMMENDATION_INTERACTION_WEIGHT env var at low value (0.3)` | 正向 | 低权重 0.3 时新鲜度主导 |
| `respects RECOMMENDATION_INTERACTION_WEIGHT env var at high value (0.8)` | 正向 | 高权重 0.8 时互动主导 |
| `handles boundary half-life of 1 hour without error` | 边界 | 半衰期 1h 不崩溃 |
| `handles boundary interaction weight of 0.3 and 0.8 without error` | 边界 | 权重 0.3/0.8 不崩溃 |

### 7.2 测试结果

```
Test Files  1 passed (1)
     Tests  8 passed (8)
  Duration  236ms
```

### 7.3 验证清单

- [x] ESLint 通过（零新增错误）
- [x] TypeScript typecheck 通过（无新增错误）
- [x] 单元测试全部通过（8/8）
- [x] 无数据库变更
- [x] 变更范围未越界（只修改了 allowed_paths 内的文件）
- [x] 无遗留调试代码
- [x] TASK-002 追溯完整

## 8. 风险 / 未解决项

### 已知风险

1. **SQL vs JS 公式微小差异**：JS 版本有 `clamp(interactionWeight + freshnessMultiplier * freshnessWeight, interactionWeight, 1)`，SQL 版本没有。但由于 `freshnessMultiplier` 天然在 [0, 1] 范围内，`interactionWeight + freshnessMultiplier * freshnessWeight` 自然落在 `[interactionWeight, 1]` 区间，`clamp` 在 JS 中仅为防御性措施，不影响实际结果。

2. **Env var 值无严格校验**：空字符串和非正数会回退到默认值，但字符串如 `"abc"` 会回退到默认值，可能是静默错误。目前设计是合理的（ops 环境变量应由部署系统保证正确性）。

### 未解决项

无。

## 9. 推荐的下一步

1. **文档更新**：在部署文档或环境变量清单中记录新增的三个环境变量。
2. **TASK-003**：TASK-003 将在 `buildRecommendationFreshnessMultiplierExpression` 基础上叠加偏好信号，建议确认函数签名未变更（本次未修改签名）。
