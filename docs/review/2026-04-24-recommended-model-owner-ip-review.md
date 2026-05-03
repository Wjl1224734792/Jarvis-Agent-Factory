# 2026-04-24 推荐流 deep-page / model owner IP 审查

## 1. 需求文档路径
- `docs/requirements/2026-04-22-recommended-hydration-optimization-requirements.md`
- `docs/requirements/2026-04-23-ip-location-display-requirements.md`
- 额外对齐输入：主会话明确补充“修复推荐流 deep-page / candidate pool 失败用例，并补齐 model-detail 的 owner IP 展示链路”。

## 2. 任务文档路径
- `docs/tasks/2026-04-22-recommended-hydration-optimization-tasks.md`
- `docs/tasks/2026-04-23-ip-location-display-tasks.md`

## 3. 计划文档路径
- `docs/plans/2026-04-22-recommended-hydration-optimization-plan.md`
- `docs/plans/2026-04-23-ip-location-display-plan.md`

## 4. 前端实现文档路径
- `docs/implementation/2026-04-23-ip-location-display-frontend-implementation.md`
- `docs/implementation/2026-04-23-ip-location-display-test-implementation.md`

## 5. 后端实现文档路径
- `docs/implementation/2026-04-20-recommended-feed-window-implementation.md`
- `docs/implementation/2026-04-22-recommended-feed-backend-implementation.md`
- `docs/implementation/2026-04-23-ip-location-display-backend-implementation.md`

## 6. 审查结论
有条件通过。

本次 diff 在功能上完成了两条目标链路：
- 推荐流 deep-page 查询窗改为从候选前缀重取，避免 repo offset 裁剪导致的 candidate pool 漏项。
- `model-detail` 现在能从 `schemas -> server -> web` 透出并显示 owner 的公开 IP 属地。

未发现阻塞性的功能错误，也复核通过了本次最相关的定向测试；但仍存在两项中风险残余：
- `model-detail` owner 摘要存在可避免的串行查询链，给热点详情页新增了不必要延迟。
- 新增的 owner IP 前端展示没有对应 `apps/web/tests/**` 回归覆盖，UI 放置与空值兜底目前主要依赖人工/类型检查而非自动化保护。

## 7. 需求覆盖情况
### 推荐流 deep-page / candidate pool
- 已覆盖“推荐流先排序分页，再为当前页水合”的大方向，且当前 patch 进一步修正了 deep-page 场景下 repo 侧候选裁剪。
- `apps/server/src/modules/posts/posts.service.ts` 的 `resolveRecommendedQueryWindow(...)` 现在固定从 `queryOffset: 0` 开始取更大的前缀窗口，解决了深页请求只取后半段 coarse-ranked rows 时遗漏高价值候选的问题。
- `apps/server/tests/posts-recommended-window.test.ts` 新断言验证 page 12 / 13 时 repo 实际收到的窗口参数。

### model-detail owner IP 展示链路
- 已覆盖 contract 扩展：`packages/schemas/src/models.ts` 为 `modelDetailSchema` 新增 `owner`。
- 已覆盖后端输出：`apps/server/src/modules/aircraft-models/aircraft-models.service.ts` 在详情响应中补齐 `owner` 摘要，并透出公开 `ipLocationLabel`。
- 已覆盖页面消费：`apps/web/src/routes/model-detail-page.tsx` 在详情头部显示 owner 名称和公开属地。

### 未完全覆盖点
- 2026-04-23 的 IP 属地任务文档与计划文档没有显式列出“机型详情页 owner IP 展示”这条任务，当前实现依赖主会话补充目标对齐，文档追踪不完整。

## 8. 计划一致性
### 一致部分
- 推荐流改动仍限制在 `apps/server` 与测试文件内，没有越过 `packages/*` 或前端边界，符合 2026-04-22 计划的 backend-only 收口。
- owner IP 链路采用了 `packages/schemas -> apps/server -> apps/web` 的共享契约顺序，没有在 `apps/web` 私写本地响应类型，边界处理正确。

### 偏差部分
- `model-detail` owner IP 展示并不在 `docs/tasks/2026-04-23-ip-location-display-tasks.md` 的显式任务列表内，现有任务/计划主要覆盖 feed/detail/comment/profile/rating-target，不包含 aircraft model owner summary。这是追踪矩阵中的未计划实现项。

## 9. 前后端边界一致性
- `packages/schemas/src/models.ts` 新增 `modelDetail.owner`，前后端通过共享 schema 对齐，`packages/http-client` 可继续直接复用 schema 解析，无需手写重复类型，边界合理。
- server 端没有暴露 raw `clientIp`，只透出 `ipLocationLabel`，符合 IP 属地需求边界。
- web 端只消费 `ModelDetail.owner` 并通过 `IpLocationText` 展示，没有把后端拼文案逻辑或 IP 解析逻辑带入前端，职责清晰。
- `adminModelInputSchema` 补齐 `ownerId` / `sourceSubmissionId` 与现有 route/service/repo 行为保持一致，避免 admin 创建模型时字段被 schema 静默剥离。

## 10. 测试覆盖状态
### 已有证据
- 用户提供：`bun run lint` 通过。
- 用户提供：`bun run typecheck` 通过。
- 用户提供：`bun run build` 通过。
- 用户提供：`bun run test` 通过。
- 用户提供：相关 server 定向测试通过。

### 本次复核补跑
- `bunx vitest run packages/schemas/tests/models.test.ts`：通过。
- `bunx vitest run --root . --config vitest.config.ts --maxWorkers 1 --testTimeout 30000 apps/server/tests/posts-recommended-window.test.ts`：通过。
- `bunx vitest run --root . --config vitest.config.ts --maxWorkers 1 --testTimeout 30000 apps/server/tests/ip-location.test.ts -t "exposes ip location on model comments and rating target comments"`：通过。

### 覆盖缺口
- 当前 diff 没有新增或修改 `apps/web/tests/**`，因此 `model-detail-page.tsx` 新增 owner IP UI 的显示位置、空 `owner`、空 `ipLocationLabel` 三类场景没有前端回归测试保护。

## 11. 问题列表（阻塞 / 高 / 中 / 低）
### 阻塞
- 无。

### 高
- 无。

### 中
- `apps/server/src/modules/aircraft-models/aircraft-models.service.ts:90`
  `buildModelOwnerSummary(...)` 先查 owner，再串行查 IP，再串行查 avatar URL；而 IP 与 avatar 在 owner 行已拿到后彼此独立，可以并行。当前实现给 `getModelDetail(...)` 新增了可避免的串行延迟，详情页每次命中 owner 都会多等一段链式 I/O。至少 `users` 基础字段可并入 `findBySlug`，且 `resolvePublicIpLocationLabelMap` / `resolvePublicUploadedFileUrl` 应并行。
- `apps/web/src/routes/model-detail-page.tsx:446`
  新增了 owner IP 展示 UI，但当前 diff 没有对应的 `apps/web/tests/**` 回归。现有新增证据只覆盖了 server payload 与 schema parse，没覆盖页面渲染位置、`owner === null`、`owner.ipLocationLabel === null`、以及后续 `IpLocationText` 变更对该页的影响。

### 低
- `apps/web/src/routes/model-detail-page.tsx:446`
  这条 owner IP 展示链路由主会话补充目标驱动，但在 `docs/tasks/2026-04-23-ip-location-display-tasks.md` 与 `docs/plans/2026-04-23-ip-location-display-plan.md` 中没有显式任务归属，当前 patch 的文档追踪不完整。不是代码阻塞项，但会降低后续审计可追溯性。

## 12. 必须修复项
- 将 `buildModelOwnerSummary(...)` 的 owner 基础信息查询和后续 IP / avatar 解析改成最小额外 I/O。
- 为 `model-detail-page.tsx` 新增至少一条 web 回归，覆盖 owner 展示存在值与空值两类路径。

## 13. 优化建议
- 推荐流查询窗补一条更明确的断言：验证 deep-page 请求“从 0 取前缀窗口”的目的不是单纯扩大窗口，而是避免 coarse ranking offset 裁剪。这样后续维护者更难把它误改回 offset 方案。
- 如果机型详情页后续继续扩展 owner 信息，优先在 repo 层一次性补齐 owner 基础字段，而不是在 service 层继续叠加额外查询。
- 为本次 patch 增补一份实现说明或在既有实现文档中补记本次 delta，避免后续 reviewer 只能靠 diff 反推范围。

## 14. 回归建议
- 回归 `model-detail` 在三种状态下的 UI：有 owner 且有属地、有 owner 但属地为空、owner 为空。
- 回归 `admin` 创建/编辑模型时携带 `ownerId` / `sourceSubmissionId` 的输入解析，确认 schema 与 route 不再剥字段。
- 回归推荐流 page 12+ 的连续翻页行为，重点看：
  - 无重复。
  - `hasMore` 与 `total` 一致。
  - deep-page 高价值 candidate 不会被 repo coarse window 裁掉。

## 15. 追踪矩阵
| requirement_id | task_id | planned_owner | actual_change_files | verification | review_result |
|---|---|---|---|---|---|
| RHO-001 推荐流仅对当前页水合且保持分页语义稳定 | TASK-RHO-001 | 未在计划中显式命名，实际为后端实现 | `apps/server/src/modules/posts/posts.service.ts`; `apps/server/tests/posts-recommended-window.test.ts` | 用户提供 `lint/typecheck/test/build` 全通过；复核 `bunx vitest run --root . --config vitest.config.ts --maxWorkers 1 --testTimeout 30000 apps/server/tests/posts-recommended-window.test.ts` 通过 | pass |
| RHO-002 deep-page / candidate pool 不因 repo 裁剪而漏项 | TASK-RHO-002 | 未在计划中显式命名，实际为后端测试收口 | `apps/server/src/modules/posts/posts.service.ts`; `apps/server/tests/posts-recommended-window.test.ts` | 同上，且结合既有 `apps/server/tests/posts.test.ts` 深页用例证据 | pass |
| USER-2026-04-24-MODEL-OWNER-IP model-detail 展示 owner 公开属地 | 未在 `docs/tasks/2026-04-23-ip-location-display-tasks.md` 中显式建项 | 未规划 | `apps/server/src/modules/aircraft-models/aircraft-models.service.ts`; `packages/schemas/src/models.ts`; `packages/schemas/tests/models.test.ts`; `apps/server/tests/ip-location.test.ts`; `apps/web/src/routes/model-detail-page.tsx` | 用户提供 `lint/typecheck/test/build` 全通过；复核 `bunx vitest run packages/schemas/tests/models.test.ts` 与 `bunx vitest run --root . --config vitest.config.ts --maxWorkers 1 --testTimeout 30000 apps/server/tests/ip-location.test.ts -t "exposes ip location on model comments and rating target comments"` 通过 | conditional |
| IPL-BOUNDARY-001 继续只暴露公开 `ipLocationLabel`，不暴露 raw IP | TASK-007 / TASK-008 的边界约束被复用，但本次 model owner 场景未单列 | `backend_implementer` / `frontend_implementer` 既有边界约束 | `apps/server/src/modules/aircraft-models/aircraft-models.service.ts`; `packages/schemas/src/models.ts`; `apps/web/src/routes/model-detail-page.tsx` | 代码检查确认未新增 `clientIp`；server 定向测试通过 | pass |

## 16. 推荐的下一步
1. 先补 `model-detail` owner 摘要的查询并行化 / 合并查询，再补 web 回归测试。
2. 若本轮要直接合并，建议按“有条件通过”处理，并在合并后最近一轮性能回归里关注机型详情接口耗时。
3. 把“model-detail owner IP 展示”补回任务/实现文档，避免后续追踪矩阵继续出现未计划实现项。
