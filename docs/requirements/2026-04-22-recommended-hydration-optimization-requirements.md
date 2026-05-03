# 2026-04-22 推荐流水合优化需求

## 背景
- 推荐流已经具备轻量多样性重排和随页扩张的候选窗口。
- 当前仍存在一个明显性能点：`recommended` feed 会先对整批候选集做媒体/cover URL 水合，再排序分页，导致大量不会返回到当前页的数据也做了额外工作。

## 本轮目标
- 将推荐流改成“先排序分页，再只为当前页结果水合媒体/cover URL”。
- 保持现有 API 响应结构不变。
- 继续保留现有推荐排序与分页语义。

## 范围内
- `apps/server/src/modules/posts/posts.service.ts`
- 必要时 `apps/server/src/modules/posts/feed-recommendation.ts`
- `apps/server/tests/posts.test.ts`
- 本轮相关文档

## 范围外
- 修改数据库 schema、migrate、seed、env。
- 改动前端/共享契约。
- 重写整个 feed repo 查询模型。

## 成功标准
- 推荐流只对当前页命中的 item 做媒体水合。
- 排序、多样性、分页行为不回归。
- 相关测试通过，完整 `lint / typecheck / test / build` 通过。
