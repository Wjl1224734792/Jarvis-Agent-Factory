# 2026-04-22 Posts 推荐流 SQL 前移优化（Backend Implementation）

## 1. 当前实现目标
- 在不改 API 契约的前提下，把推荐流更多候选过滤/粗排前移到 `repo / SQL` 层，降低 `service` 层重排输入规模与无效候选占比。
- 保留现有 `service` 层多样性重排逻辑，不做删除。

## 2. 输入依据
- 上游已确认：推荐流已有多样性重排、候选窗口扩张、分页后按页水合策略。
- 本次只做 `apps/server`，且不改 `packages/*`、`apps/web/*`、`apps/admin/*`、DB schema/migration/env。
- 采用 TDD：先补测试，再实现 SQL 前移。

## 3. 工作区模式
- 仓库工作区存在并行开发中的未提交改动。
- 本次遵循“最小增量追加，不回滚他人改动”。

## 4. 变更文件 / 变更范围
- `apps/server/src/modules/posts/posts.repo.ts`
  - 推荐候选 SQL 过滤条件前移
  - 推荐粗排 SQL 评分表达式增强
  - `recommended` 排序支持 `currentUserId` 维度的 follow boost（SQL 侧）
- `apps/server/tests/posts.test.ts`
  - 增加/对齐推荐 repo 层过滤与粗排相关测试（在现有测试文件中增量追加）
- `docs/implementation/2026-04-22-posts-recommendation-sql-prefilter-backend-implementation.md`

## 5. 实现说明
- 推荐候选过滤前移到 SQL（`postsRepo.listFeed`）：
  - 增加“高举报低信任”过滤条件，优先在 SQL 层剔除高风险低价值候选，减少进入 service 重排的输入。
  - 增加“超旧低价值”过滤条件（保留有互动/有传播/有浏览的历史内容），避免长尾低质候选占用推荐窗口。
- 推荐粗排前移到 SQL（`buildFeedOrder`）：
  - 在原互动计分基础上，增加浏览量对数项、分段新鲜度加分、互动量分段加分。
  - 对登录用户增加 follow 关系加分（SQL `exists` 子查询），让候选粗排更接近最终排序目标。
- service 层多样性重排：
  - 未删除，仍由 `rankFeedItemsByRecommendation` 执行。

## 6. 测试和验证结果
- TDD 红灯（新增用例先失败）：
  - `bun run --cwd apps/server test -- --testNamePattern "filters low-value reported candidates in recommended repo query"`
  - 失败点：`moment_repo_filtered_reported` 仍出现在候选结果中。
- 实现后回归：
  - `bun run --cwd apps/server test -- --testNamePattern "filters low-value reported candidates in recommended repo query"` 通过
  - `bun run --cwd apps/server test -- --testNamePattern "keeps high-share moments inside the recommended candidate pool|filters low-value reported candidates in recommended repo query"` 通过
  - `bun run --cwd apps/server typecheck` 通过
- 全量 `apps/server` 测试现状：
  - `bun run --cwd apps/server test` 当前非绿（存在多文件失败，含 `posts/rankings/search` 的登录会话与部分断言问题）。
  - 这些失败点与本次推荐 repo/SQL 前移改动不在同一最小变更域内，需由编排统一处理。

## 7. 数据与接口边界
- 未改数据库 schema / migration。
- 未改路由与响应结构（API 契约保持不变）。
- 改动仅发生在服务端查询与排序策略内部实现。

## 8. 风险 / 未解决项
- 推荐粗排与过滤阈值属于策略参数，后续可能需按线上反馈继续调参（召回率、内容多样性、投诉率）。
- SQL 中引入 follow boost `exists` 子查询后，建议关注推荐请求高并发时的查询计划与索引命中情况。
- 当前工作区有并行改动，全量测试失败需由 orchestrator 统一收敛后再做最终绿灯判定。

## 9. 需要前端配合的点
- 无需前端改造。
- API 字段与响应结构未变化，前端无需调整契约调用。

## 10. 推荐的下一步
- 在 orchestrator 层合并并行 worker 改动后，统一跑一次全量 `lint/typecheck/test/build` 并按失败域拆分修复。
- 对推荐 SQL 前移策略补充一组稳定的“窗口边界 + 举报阈值 + follow boost”回归测试，避免后续策略调参引发回归。
