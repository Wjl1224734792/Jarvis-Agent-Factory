# 2026-04-21 Kodo Qiniu AI Review Backend Implementation

## 1. 当前实现目标
- 在后端继续补齐七牛审核接入，优先覆盖评论、榜单、评分对象（rating target）相关流程。
- 保持新语义：关闭 AI 审核时，内容进入人工审核队列（`pending`），不再自动通过。
- 复用既有通知链路（`socialService.recordSystemNotification` / `recordNotification`），不新建通知系统。

## 2. 输入依据
- `docs/requirements/2026-04-21-kodo-qiniu-ai-review-requirements.md`
- `docs/tasks/2026-04-21-kodo-qiniu-ai-review-tasks.md`

## 3. 工作区模式
- 在已有多人并行修改的工作区上增量实现。
- 仅修改后端范围文件（`apps/server/src/**`、`apps/server/tests/**`、实现文档）。
- 未回退他人改动。

## 4. 变更文件 / 变更范围
- `apps/server/src/modules/rankings/rankings.service.ts`
- `apps/server/src/modules/reviews/reviews.service.ts`
- `apps/server/tests/rankings.test.ts`
- `apps/server/tests/reviews.test.ts`
- `docs/implementation/2026-04-21-kodo-qiniu-ai-review-backend-implementation.md`

## 5. 实现说明
- `rankings.service`：
  - 新增审核状态映射（文本审核结果 -> 榜单状态 / 评论状态）。
  - 社区榜单、评分对象创建/更新统一先入 `pending`，AI 开启时调用 `qiniuAuditService.reviewText`，再按结果流转：
    - `passed -> published`
    - `rejected -> rejected`
    - `review/failed -> pending`
  - 抽出内部状态流转方法，统一处理状态更新与系统通知，避免重复逻辑与错误参数调用。
  - 排行榜评论、评分对象评论/评分评测统一先入 `pending`，AI 开启时按七牛结果自动流转到 `visible/hidden`，并在 `visible` 时保留原互动通知行为。
- `reviews.service`：
  - 评测评论创建/编辑统一先入 `pending`。
  - AI 开启时调用七牛文本审核，并按 `passed/rejected/review` 映射为 `visible/hidden/pending`。
  - 保持原有可见时的互动通知逻辑。
- 测试：
  - 新增/调整测试覆盖评论域“AI 开启/关闭”两种语义，验证 pending 与自动放行行为。
  - 为 ranking 集成测试增加可控 AI 审核 mock 条件（`QINIU_AUDIT_TEST_SUGGESTION=pass`）并隔离恢复环境变量。

## 6. 测试和验证结果
- 已通过：
  - `apps/server`: `bun run lint`
  - `apps/server`: `bun run typecheck`
  - `apps/server`: `bun run build`
  - `bunx vitest run --config vitest.config.ts --maxWorkers 1 apps/server/tests/reviews.test.ts`
  - `bunx vitest run --config vitest.config.ts --maxWorkers 1 apps/server/tests/rankings.test.ts -t "supports ranking item reply threads|requires rating for top-level|keeps ranking and rating-target comments pending"`
- 未通过（存量问题）：
  - `apps/server`: `bun run test`
  - 失败集中在既有全量集成测试中的认证/seed 稳定性问题（大量 `missing set-cookie headers` 与 `users_display_name_unique` 冲突），不只限于本次改动域。

## 7. 数据与接口边界
- 未改数据库结构。
- 未改共享契约（`packages/schemas` / `packages/http-client`）。
- 仅改服务端业务行为与测试用例。

## 8. 风险 / 未解决项
- 现有全量后端测试存在基础环境稳定性问题（admin 登录 cookie 与 seed 幂等冲突），影响全仓回归可信度。
- 评分对象评论状态更新沿用当前 repo 线程级状态更新策略（root/reply 同步），后续可评估是否细化到单评论级别。

## 9. 需要前端配合的点
- 前端需按新语义展示：评论/评分评测提交后默认可能为 `pending`（即使关闭 AI 审核也不是自动通过）。
- 若前端已有“关闭审核=直接通过”的提示文案，需要同步调整为“进入人工审核队列”。

## 10. 推荐的下一步
1. 由 orchestrator 协调修复全量测试中的认证与 seed 稳定性问题（避免回归阶段噪音）。
2. 在 admin 审核页补充评论维度的 AI 结果可视化（通过/拒绝/待人工）与追踪字段展示。
3. 补充 ranking/review 端到端回归场景（AI pass/review/block + 人工复核）以提高发布信心。
