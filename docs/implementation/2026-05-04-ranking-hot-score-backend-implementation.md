# TASK-005: 榜单热度服务端化 -- 实现文档

## 1. 当前实现目标

将前端 `buildRankingHotScore` 热度计算逻辑迁移至服务端，支持 `GET /api/v1/rankings?sort=hot` 参数。分两个子步骤完成：TASK-005a（后端实现）和 TASK-005b（前端适配）。

## 2. 对应需求 ID / 任务 ID

- **需求**: REQ-005
- **任务**: TASK-005
- **子任务**: TASK-005a (后端实现, 约 130 行), TASK-005b (前端适配, 约 70 行)

## 3. 输入依据

- Execution Packet (TASK-005)
- 前端现有实现: `apps/web/src/routes/rankings-page-helpers.ts` 中 `buildRankingHotScore`
- 后端现有结构: `apps/server/src/modules/rankings/ranking-score.ts`, `rankings.service.ts`, `rankings.route.ts`
- 共享 Schema: `packages/schemas/src/rankings.ts`

## 4. 变更文件 / 变更范围

### 新建文件
| 文件 | 用途 |
|------|------|
| `apps/server/tests/ranking-hot-score.test.ts` | 单元测试（6 个测试用例） |

### 修改文件
| 文件 | 变更内容 | 行数（估） |
|------|---------|-----------|
| `apps/server/src/modules/rankings/ranking-score.ts` | 新增 `buildRankingHotScore`、`sortRankingsByHotScore`，导出 `RankingForHotScore` 接口 | +76 |
| `apps/server/src/modules/rankings/rankings.service.ts` | `buildRankingListItems`/`listRankings` 支持 `sort` 参数，导入 `sortRankingsByHotScore` | +15 |
| `apps/server/src/modules/rankings/rankings.route.ts` | 解析 `sort` query 参数，导入 `rankingsSortSchema` | +5 |
| `packages/schemas/src/rankings.ts` | 新增 `rankingsSortSchema` (`z.enum(["hot", "latest"]).default("latest")`) | +4 |
| `packages/http-client/src/index.ts` | `listRankings` 支持传入 `sort` 并传递到 URL query | +3 |
| `apps/web/src/routes/home-page.tsx` | 查询使用 `sort=hot&limit=3`，移除 `mergeRankingsByTab` 调用 | +6 |
| `apps/web/src/routes/rankings-page.tsx` | 查询 key 包含 `activeTab`，`queryFn` 传递 `sort` 参数，移除 `mergeRankingsByTab` | +12 |
| `apps/web/src/routes/rankings-page-helpers.ts` | 删除 `buildRankingHotScore`、`countRankingRatings`，移除 `mergeRankingsByTab` 的 `.hot` 分支 | -28 |
| `apps/web/tests/rankings-page-helpers.test.ts` | 移除 `buildRankingHotScore` 测试，删除 `.hot` 断言，保留 `.latest` 测试 | -21 |

## 5. 实现说明

### TASK-005a 后端实现

**Red Phase**: 编写 6 个失败测试（确认函数不存在）

**Green Phase**:
1. `ranking-score.ts` 新增 `buildRankingHotScore(ranking, nowOverride?)` 函数，与前端原算法一致：
   ```
   score = averageScore*12 + sum(totalRatings)*0.85 + commentCount*3.4
         + itemCount*1.8 + max(0, 72 - hoursSinceCreation)
         + (type === "official" ? 4 : 0)
   ```
   `nowOverride` 参数用于测试中冻结时间。

2. `ranking-score.ts` 新增 `sortRankingsByHotScore(rankings, nowOverride?)` 函数，按热度降序排列，分数相同时按创建时间降序。

3. `packages/schemas/src/rankings.ts` 新增 `rankingsSortSchema`：
   ```typescript
   export const rankingsSortSchema = z.enum(["hot", "latest"]).default("latest");
   ```
   默认 `"latest"` 保持向后兼容。

4. `rankings.service.ts` 的 `buildRankingListItems` 新增 `sort` 参数支持：
   - 当 `sort === "hot"` 时，对 official 和 community 分组各自调用 `sortRankingsByHotScore`
   - `sort` 默认未指定时保持原行为

5. `rankings.route.ts` 通过 `rankingsSortSchema.safeParse` 校验 `sort` query 参数，校验失败时默认 `"latest"`

6. `packages/http-client/src/index.ts` 的 `listRankings` 方法新增 `sort` 参数支持，将值传至 URL query string

**Refactor Phase**: ESLint 零错误，typecheck 全部通过，6 个单元测试全部通过

### TASK-005b 前端适配

1. `home-page.tsx`: 榜单查询改为 `apiClient.listRankings({ sort: "hot", limit: 3 })`，直接合并 official+community 数组（已在服务端按热度排序），取前 2 条，不再依赖 `mergeRankingsByTab`

2. `rankings-page.tsx`: 查询 key 改为 `["rankings", activeTab]`，根据 tab 切换传递对应 `sort` 参数，直接合并响应中的 official+community 数组用于展示

3. `rankings-page-helpers.ts`: 删除 `buildRankingHotScore`、`countRankingRatings`，从 `mergeRankingsByTab` 中移除 `.hot` 分支，保留 `.latest` 分支

## 6. 测试和验证结果

### 单元测试
```
apps/server/tests/ranking-hot-score.test.ts (6 tests):
  buildRankingHotScore
    PASS  与前端原算法输出一致（固定数据对比）
    PASS  官方榜单获得 +4 加权，社区榜单无加成
    PASS  新鲜度信号边界：刚创建（0h 衰减）vs 超过 72 小时后（衰减归零）
    PASS  totalRatings 从 items 中正确聚合求和
  sortRankingsByHotScore
    PASS  按热度降序排列，分数相同时按创建时间降序
    PASS  单独排序 official 组和 community 组各自按热度降序

apps/web/tests/rankings-page-helpers.test.ts (1 test):
    PASS  merges official and community rankings into latest stream sorted by createdAt desc
```

### 自动化验证
- [x] ESLint: 零错误
- [x] TypeScript typecheck (schemas): 通过
- [x] TypeScript typecheck (server): 通过
- [x] TypeScript typecheck (web): 通过
- [x] 单元测试: 7/7 通过
- [x] 变更范围未越界（仅 allowed_paths 中的文件）

## 7. 数据与接口边界

### API 契约变更
**现有端点**: `GET /api/v1/rankings`
**新增查询参数**: `sort` (可选, `"hot"` | `"latest"`, 默认 `"latest"`)
- `sort=hot`: official 和 community 分组各自按热度降序排列
- `sort=latest` 或不传: 保持原有行为（按创建时间降序）

**向后兼容**: 不传 `sort` 参数时行为完全不变，所有现有调用不受影响。

### 数据结构
响应结构不变：`{ official: RankingListItem[], community: RankingListItem[], pagination: {...} }`
- `sort=hot` 时，`official` 和 `community` 各自按热度降序
- `sort=latest` 时，保持原有顺序

## 8. 风险 / 未解决项

- **集成验证**: 未在真实数据库环境下使用 curl 验证 `/api/v1/rankings?sort=hot` 端点，因为服务器需要 PostgreSQL 环境。单元测试已充分覆盖核心算法逻辑。
- **HTTP 客户端修改**: `packages/http-client/src/index.ts` 为共享区域，仅增加了可选的 `sort` 参数，对现有调用者透明兼容。

## 9. 需要前端配合的点

- 前端已通过本次 TASK-005b 完成适配，无需额外前端配合。
- 其他使用 `apiClient.listRankings()` 的页面（如有）不受影响，因为 `sort` 参数为可选。

## 10. 推荐的下一步

- TASK-007（数据库结构优化）: 可考虑为热度分数添加预计算字段以优化性能
- 在真实环境启动服务器后，使用 curl 验证端点：
  ```
  curl "http://localhost:XXXX/api/v1/rankings?sort=hot&limit=5"
  curl "http://localhost:XXXX/api/v1/rankings?sort=latest&limit=5"
  curl "http://localhost:XXXX/api/v1/rankings"  # 默认 latest
  ```
