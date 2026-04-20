# 共享 Client 边界收口 Slice 2 实施计划

> **面向 AI 代理的工作者：** 在 Slice 1 基础上继续推进 `rankings / rating-targets / admin messages` 边界收口。本轮优先处理 rankings/rating-targets，messages 仅在无需扩大改动面时顺手收敛。

**目标：** 继续将 Admin 侧本地业务读模型和二次 `fetch` 包装压回 `packages/http-client`，让应用层更多只保留运行时适配。

**架构：** 共享层负责业务接口与业务读模型；Admin 本地只保留 base URL、auth invalid 事件和少量 UI 适配。

**技术栈：** Bun、TypeScript、Vitest、React、Ant Design、`@feijia/http-client`、`@feijia/schemas`

---

## 文件结构

- 创建：
  - `docs/implementation/2026-04-20-client-boundary-slice2-implementation.md`
- 修改：
  - `apps/admin/src/lib/api-client.ts`
  - `apps/admin/src/features/rankings/rankings-admin-helpers.ts`
  - `apps/admin/src/features/rankings/rankings-page.tsx`
  - 可能涉及 `apps/admin/src/features/rankings/rating-targets-page.tsx`

## 任务 1：移除 Admin 本地 Ranking 业务 DTO

- [ ] 识别并删除 `apps/admin/src/lib/api-client.ts` 中的：
  - `AdminRankingItem`
  - `AdminRankingListItem`
  - `AdminRankingDetail`
  - `legacyOfficialDefinitions`
  - `normalizeOfficialRankings`

- [ ] 用共享 client / 共享 schema 类型替代本地 DTO

## 任务 2：收口 Admin rankings 业务接口

- [ ] `listOfficialRankings()` 改为基于 `sharedClient.listAdminRankings()` 的过滤，而不是本地 `getJson("/admin/rankings?...")`
- [ ] `listCommunityRankingsForModeration()` 改为基于 `sharedClient.listAdminRankings()` 的过滤
- [ ] `getRankingDetail()` 直接委托 `sharedClient.getRankingDetail()`
- [ ] `createRanking()` 直接委托 `sharedClient.createRanking()`
- [ ] `updateRanking()` 直接委托 `sharedClient.updateRanking()`
- [ ] `updateRankingStatus()` 直接委托 `sharedClient.updateAdminRankingStatus()`

## 任务 3：收口 Admin rating-target 业务接口

- [ ] 优先确认 `listAdminRatingTargets()`、`updateRatingTargetStatus()` 已经是共享边界
- [ ] 仅在必要时调整 `listRatingTargetsForModeration()`，避免无意义保留本地读模型重组

## 任务 4：页面层类型跟随共享边界

- [ ] `rankings-admin-helpers.ts` 改为基于共享读模型类型
- [ ] `rankings-page.tsx` 和 `rating-targets-page.tsx` 去掉对本地 API DTO 的不必要依赖

## 任务 5：验证与说明

- [ ] 运行：
  - `bun run --cwd apps/admin typecheck`
  - `bun run lint`
  - `bun run typecheck`
- [ ] 补 `docs/implementation/2026-04-20-client-boundary-slice2-implementation.md`
