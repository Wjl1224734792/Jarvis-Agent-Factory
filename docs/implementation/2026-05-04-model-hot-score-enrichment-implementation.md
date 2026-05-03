# 实现文档：丰富热门机型评分维度

**日期:** 2026-05-04
**TASK-ID:** TASK-004
**Requirement IDs:** [REQ-004]

## 1. 当前实现目标

扩展 `buildModelHotScore` 函数，引入浏览热度（recentViewCount）、搜索频次（recentSearchCount）、榜单引用次数（rankingReferenceCount）三个新评分维度。

## 2. 变更文件/变更范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/server/src/modules/aircraft-models/model-hot-score.ts` | 修改 | ModelHotSeed 从 type 转为 interface；新增 3 个可选字段；新增 3 个权重 getter 函数；更新公式 |
| `apps/server/src/modules/aircraft-models/aircraft-models.repo.ts` | 修改 | 新增 `ratingTargetsTable` 导入；新增 `getModelHotExtraData` 批量查询方法 |
| `apps/server/src/modules/aircraft-models/aircraft-models.service.ts` | 修改 | `listModels` 方法在 `tab=recommended` 时调用新 repo 方法传递新维度数据 |
| `apps/server/tests/model-hot-score.test.ts` | 新建 | 12 个单元测试覆盖新因子、向后兼容、权重配置 |

## 3. 业务规则说明

### 新公式

```
score = favoriteCount*4 + commentCount*3 + reviewCount*2 + max(0, 72 - hoursSinceCreation)
      + recentViewCount * W_view + recentSearchCount * W_search + rankingReferenceCount * W_ranking_ref
```

### 权重设计

| 因子 | 默认权重 | 环境变量 |
|------|---------|---------|
| recentViewCount（近 7 天浏览量） | 0.5 | `MODEL_HOT_VIEW_WEIGHT` |
| recentSearchCount（近 7 天搜索次数） | 2.0 | `MODEL_HOT_SEARCH_WEIGHT` |
| rankingReferenceCount（被榜单引用次数） | 8.0 | `MODEL_HOT_RANKING_REF_WEIGHT` |

权重通过模块顶层的 getter 函数读取 process.env，每次调用 `buildModelHotScore` 时获取。当环境变量无效（NaN）时自动回退默认值。

### 向后兼容

新字段均为可选（`?: number`），缺失时通过 `?? 0` 默认处理。旧格式数据无需修改即可正常工作。

## 4. ModelHotSeed 类型变更

```typescript
// Before (type)
type ModelHotSeed = {
  favoriteCount: number;
  commentCount: number;
  reviewCount: number;
  createdAt?: Date | string | null;
};

// After (interface)
interface ModelHotSeed {
  favoriteCount: number;
  commentCount: number;
  reviewCount: number;
  createdAt?: Date | string | null;
  recentViewCount?: number;
  recentSearchCount?: number;
  rankingReferenceCount?: number;
}
```

## 5. 数据源说明

| 字段 | 数据来源 | 备注 |
|------|---------|------|
| `recentViewCount` | `aircraftModelsTable.viewCount` | 现有总浏览量的代理值，后续可接入细粒度近 7 天浏览统计 |
| `recentSearchCount` | 硬编码为 0 | 暂无搜索统计数据源，留接口待后续接入 |
| `rankingReferenceCount` | `ratingTargetsTable.linkedModelId` 聚合计数 | 统计被榜单条目引用的次数（仅 count 已发布的榜单条目） |

## 6. 权限与幂等性说明

- `buildModelHotScore` 是纯函数，无副作用，天然幂等
- 新增 repo 方法 `getModelHotExtraData` 是只读查询，无副作用
- `sortModelsByHotScore` 保持不可变排序（`[...items].sort`），不修改原数组

## 7. 测试验证结果

**测试文件:** `apps/server/tests/model-hot-score.test.ts`
**测试框架:** vitest
**结果:** 12/12 通过

| 测试套件 | 测试数 | 覆盖场景 |
|---------|-------|---------|
| buildModelHotScore | 10 | 原有因子保留；新因子分别贡献分数；全因子组合计算；向后兼容（缺失字段默认 0）；3 个环境变量权重覆盖测试；无效环境变量回退默认 |
| sortModelsByHotScore | 2 | 高维度值排前面；向后兼容旧格式数据 |

**Lint:** 零错误，零警告

## 8. 风险/未解决项

1. **recentViewCount 数据精度**: 当前使用 `aircraftModelsTable.viewCount`（总浏览量）作为 `recentViewCount`（近 7 天浏览量）的代理。需要后续接入独立近 7 天浏览统计系统时替换。
2. **recentSearchCount**: 目前返回 0，因项目暂无每个机型的搜索次数统计。后续可在搜索系统中加装计数逻辑后修改 repo 方法。
3. **数据库迁移**: 如新增浏览/搜索统计专用表或字段，属共享区域变更，需先返回主 Build Agent 评估。
4. **外部测试套件**: `apps/server/tests/models.test.ts` 因测试数据库状态问题跳过（非本次变更导致）。

## 9. 推荐的下一步

- 接入独立近 7 天浏览统计模块，替换 `recentViewCount` 数据源
- 在搜索系统中记录每个机型的搜索频次，接入 `recentSearchCount`
- 考虑为权重提供运行时动态配置（如通过 Redis/数据库），替代当前环境变量方式
