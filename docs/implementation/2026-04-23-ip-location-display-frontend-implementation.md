# 2026-04-23 IP 属地展示前端实现

## 1. 当前实现目标
- 调整 `apps/web` 内 IP 属地展示位置与文案。
- 信息流与列表页不显示属地。
- 详情页将属地追加到发布时间 / 时间信息行，作者区域不显示属地。
- 个人主页与他人主页显示 `IP属地:<location>`。
- 评论与回复仅显示 `<location>`。
- 评分对象详情页在 TASK-007 公开 `createdAt` 后，消费共享类型中的 `createdAt` 展示时间与 `<location>`。
- 继续复用公开字段 `ipLocationLabel`，不公开原始 IP。

## 2. 输入依据
- `docs/requirements/2026-04-23-ip-location-display-requirements.md`
- `docs/tasks/2026-04-23-ip-location-display-tasks.md`
- `docs/plans/2026-04-23-ip-location-display-plan.md`
- `docs/contracts/2026-04-23-rating-target-detail-time-contract-change.md`
- 根 `AGENTS.md` L0-L2、`apps/AGENTS.md`、`apps/web/AGENTS.md`

## 3. 工作区模式
- 仓库路径：`E:\CodeStore\feijia`
- 执行角色：`frontend_implementer`
- 改动策略：仅在 orchestrator 分配的 write set 内做最小 diff，不改共享契约、后端、测试配置和测试文件。

## 4. 变更文件 / 变更范围
- `apps/web/src/components/ip-location-text.tsx`
- `apps/web/src/routes/home-page.tsx`
- `apps/web/src/routes/circle-page-feed.tsx`
- `apps/web/src/routes/rankings-page.tsx`
- `apps/web/src/routes/post-detail-page.tsx`
- `apps/web/src/routes/circle-page-detail.tsx`
- `apps/web/src/routes/ranking-detail-page.tsx`
- `apps/web/src/routes/rating-target-detail-header.tsx`
- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/routes/user-profile-page.tsx`
- `apps/web/src/features/posts/post-comment-thread.tsx`
- `apps/web/src/routes/model-comments-section.tsx`
- `apps/web/src/routes/rating-target-detail-comment-card.tsx`
- `docs/implementation/2026-04-23-ip-location-display-frontend-implementation.md`

## 5. 实现说明
- `IpLocationText` 改为显式 `variant`：
  - `plain` 输出 `<location>`。
  - `profile` 输出 `IP属地:<location>`。
  - `label` 为空、空白、`null` 或 `undefined` 时不渲染。
- 首页、圈子信息流、榜单列表移除属地 UI，只保留数据字段。
- 帖子详情、圈子详情、榜单详情将属地放到时间信息行，作者区域不显示属地。
- 评分对象详情页：
  - 作者区域继续只显示作者名，不显示属地。
  - 时间信息行消费 `props.item.createdAt`，显示日期。
  - `ipLocationLabel` 存在时追加分隔符与 `<location>`；为空时不渲染分隔符或占位文本。
  - 未使用 `updatedAt` 或其它未批准字段兜底。
- 当前用户主页与他人主页使用 `variant="profile"`，显示 `IP属地:<location>`。
- 帖子评论、帖子回复、机型评论、评分对象评论使用 `variant="plain"`，仅显示 `<location>`。

## 6. 测试和验证结果
- TASK-001 ~ TASK-005 实现后已执行：
  - `bun run --cwd apps/web typecheck`：通过
  - `bun run --cwd apps/web lint`：通过
  - `bun run --cwd apps/web build`：通过
- TASK-008 实现后已执行：
  - `bun run --cwd apps/web typecheck`：通过
  - `bun run --cwd apps/web build`：通过
- 未修改 `apps/web/tests/**`；页面级回归测试与文本扫描交由后续 `frontend_test_worker`。

## 7. 边界和异常处理
- `ipLocationLabel` 为空时不渲染属地、不渲染冒号、不渲染分隔符。
- 评分对象详情页只使用共享类型自然推导出的 `createdAt`。
- `createdAt` 缺失时不回退到 `updatedAt` 或其它本地推断字段。
- 不新增 `clientIp` 或任何原始 IP 字段依赖。
- 不修改请求结构、响应结构、schema、shared types、server serializer。

## 8. 风险 / 未解决项
- 评分对象详情页依赖 TASK-007 公开 `createdAt`。若后续共享契约回归导致 `createdAt` 丢失，前端 typecheck 会失败，应回到契约任务修复。
- 榜单详情当前通过“发布时间”卡片追加属地；后续若该卡片结构重构，需要回归测试覆盖该调用点。

## 9. 需要后端配合的点
- TASK-008 已基于 TASK-007 公开的 `createdAt` 完成前端消费。
- 当前前端无新增后端需求；继续依赖公开字段 `createdAt` 与 `ipLocationLabel`。

## 10. 推荐的下一步
1. 由 `frontend_test_worker` 覆盖：
   - 三个列表 / 信息流页不显示属地。
   - 帖子详情、圈子详情、榜单详情、评分对象详情的时间信息行显示 `<location>`，作者区域不显示属地。
   - 两个主页显示 `IP属地:<location>`。
   - 评论与回复仅显示 `<location>`。
   - 空属地无残留前缀、冒号、分隔符。
2. 由 `review_qa` 统一评审 TASK-007 / TASK-008 / TASK-006 的契约、实现和测试闭环。
