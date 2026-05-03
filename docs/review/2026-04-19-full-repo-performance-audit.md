# 2026-04-19 全仓性能与扩展性审查

## 审查结论

- 结论：开发与验证链路的性能/稳定性风险高于单点运行时微优化
- 说明：仓库确实存在运行时热点，但更高杠杆的问题是整库 reset+seed、超大热点文件、全量取数后重排以及前端 bundle 体积缺少门禁。这些问题会直接放大后续所有优化成本。

## 审查方法

- 检查热点文件规模
- 抽样检查列表/推荐/搜索/日志链路的分页与排序模式
- 检查测试 reset/seed 策略
- 检查构建脚本与产物体积告警

## 已确认问题

### 1. `[P1][列表聚合]` 排行榜列表是“全量取数后再内存重排/分页”

- 证据：
  - `apps/server/src/modules/rankings/rankings.service.ts:346`
  - `apps/server/src/modules/rankings/rankings.service.ts:363`
  - `apps/server/src/modules/rankings/rankings.service.ts:473`
  - `apps/server/src/modules/rankings/rankings.repo.ts:75`
  - `apps/server/src/modules/rankings/rankings.repo.ts:369`
- 影响：
  - 榜单和条目数量增长后，CPU、内存和 DB 往返都会线性放大
- 建议：
  - 将排序/分页更多地下推到查询层或预聚合层
- 分类：
  - `confirmed`
  - 下一阶段建议：`must_tdd`

### 2. `[P1][列表聚合]` 机型列表也是全量查询后在服务层排序分页

- 证据：
  - `apps/server/src/modules/aircraft-models/aircraft-models.repo.ts:26`
  - `apps/server/src/modules/aircraft-models/aircraft-models.repo.ts:134`
  - `apps/server/src/modules/aircraft-models/aircraft-models.service.ts:211`
  - `apps/server/src/modules/aircraft-models/aircraft-models.service.ts:228`
- 影响：
  - 数据扩容后会优先放大 API 延迟和内存峰值
- 建议：
  - 筛选、排序、分页职责前移
- 分类：
  - `confirmed`
  - 下一阶段建议：`must_tdd`

### 3. `[P1][推荐流]` 推荐流存在“大窗口取数 + 服务层重排 + 再分页”的固定热点

- 证据：
  - `apps/server/src/modules/posts/posts.service.ts:287`
  - `apps/server/src/modules/posts/posts.service.ts:335`
  - `apps/server/src/modules/posts/posts.repo.ts:371`
  - `apps/server/src/modules/posts/posts.repo.ts:435`
- 影响：
  - 深页浪费明显，候选窗也放大补全成本
- 建议：
  - 重做推荐候选与排序职责划分
- 分类：
  - `confirmed`
  - 下一阶段建议：`must_tdd`

### 4. `[P1][日志链路]` 日志写入与读取两端都存在明显瓶颈

- 证据：
  - `apps/server/src/lib/logger.ts:71`
  - `apps/server/src/lib/logger.ts:101`
  - `apps/server/src/lib/logger.ts:149`
  - `apps/server/src/modules/admin-logs/admin-logs.service.ts:142`
  - `apps/server/src/modules/admin-logs/admin-logs.service.ts:181`
  - `apps/server/src/modules/admin-logs/admin-logs.service.ts:210`
- 影响：
  - 写入侧为全局串行队列
  - 读取侧按文件全量读完再截尾，属于 O(文件大小) 读放大
- 建议：
  - 写入侧按类别拆队列或接入成熟 logger
  - 读取侧支持 tail/分页读取
- 分类：
  - `confirmed`
  - 下一阶段建议：`can_direct_dev`

### 5. `[P0][验证链路]` 多个 server 测试文件在 `beforeEach` 执行整库 reset + seed

- 证据：
  - `apps/server/tests/posts.test.ts:320`, `:305-306`
  - `apps/server/tests/models.test.ts:119`, `:122-123`
  - `apps/server/tests/search.test.ts:171`, `:174-175`
- 影响：
  - server 测试耗时高
  - seed/migration 变动的影响面被放大
- 建议：
  - 评估基础 seed / 轻量 fixture / 针对性 seed 分层
- 分类：
  - `confirmed`
  - 下一阶段建议：`can_direct_dev`

### 6. `[P1][前端构建]` 前端已有重型 vendor chunk，但构建链路没有体积门禁

- 证据：
  - `apps/admin/dist/assets/charts-grammar-vendor-CkJu59Tb.js`
  - `apps/web/dist/assets/editor-vendor-CROGCyFG.js`
  - 根 `package.json:47` 的 `build` 只做串行构建，没有 budget 校验
- 影响：
  - 包体继续增长不会阻断合入，性能退化会无声积累
- 建议：
  - 为 Web/Admin 引入 bundle budget 与产物 diff
- 分类：
  - `confirmed`
  - 下一阶段建议：`can_direct_dev`

### 7. `[P1][基础设施热点]` `packages/db` 的 seed 与 schema 已是大型热点文件

- 证据：
  - `packages/db/src/seed.test-data.ts` 约 56764 字节
  - `packages/db/src/seed.ts` 约 46440 字节
  - `packages/db/src/schema.ts` 约 33454 字节
- 影响：
  - 测试数据和 schema 变更都集中撞到少数文件
- 建议：
  - 按基础 seed / demo seed / test fixture / 领域 schema 分层拆分
- 分类：
  - `confirmed`
  - 下一阶段建议：`can_direct_dev`

## 仅记录 / 待补证据问题

- `inferred`：`web` 与 `admin` 的本地 `api-client` 包装层可能还存在重复请求控制与错误映射开销，需要结合具体页面请求图补证据。
- 说明：当前用户明确不接受数据库外键，因此“无 FK”视为既定策略而非缺陷；但这意味着完整性更多依赖应用层与测试层补偿。

## 建议方向

- 先优化测试与 seed 基础设施，因为它会放大后续所有成本。
- 再治理全量取数后重排的 API 热点。
- 最后给前端构建加体积门禁和更细的拆包策略。
