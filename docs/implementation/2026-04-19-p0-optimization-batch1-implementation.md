# 2026-04-19 P0 优化第一批实现说明

## 本轮范围

- 品牌申请状态机修复
- 榜单评分/评论写入解耦
- server 测试与 seed 基础设施降重

## 已完成

### 1. 品牌申请状态机

- 统一品牌申请状态为：
  - `pending`
  - `approved`
  - `rejected`
- 移除了 `hidden` 在 schema、service、本地类型守卫中的可接受性。
- 现在管理端提交 `hidden` 会在输入校验阶段直接返回 `400`，不再拖到 DB 层报 `500`。

### 2. 榜单评分/评论写入

- `submitRatingTargetRating` 现在只更新评分，不再隐式创建评论。
- `upsertRatingTargetReview` 现在会更新用户已有的顶层 review comment，而不是每次都新增一条。
- 这样修复了：
  - 纯评分导致评论数膨胀
  - 重复评分/补评持续追加评论
  - 评论数反向污染榜单排序

### 3. 测试与 seed 降重

- 为 `seedDatabase` 增加了轻量 `profile: "catalog"` 模式。
- 当前已切换到轻量 seed 的测试：
  - `apps/server/tests/models.test.ts`
  - `apps/server/tests/search.test.ts`
- 这两个文件不再默认灌整套 demo 数据，只加载基础数据和机型目录数据。

## 已验证

- 品牌申请与榜单定向用例：
  - `apps/server/tests/content-closure.test.ts`
  - `apps/server/tests/rankings.test.ts`
- 轻量 seed 定向用例：
  - `apps/server/tests/models.test.ts`
  - `apps/server/tests/search.test.ts`

## 残余风险

- `seedDatabase({ profile: "catalog" })` 目前只先收敛了 `models/search` 两个热点文件，仍有其他 server 测试继续走整库 demo seed。
- 榜单 review comment 的“更新哪一条顶层评论”仍采用当前用户该条目下最近一条顶层评论的策略；如果未来要区分“评分型评论”和“普通评论”，应单独设计持久化语义。
- 共享 client / 契约边界收口仍未进入本轮实现，需按路线图单独起下一批任务。
