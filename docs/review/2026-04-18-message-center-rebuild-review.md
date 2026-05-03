# 2026-04-18 消息中心重建交付评审

## 交付结论

- 结论：通过
- 说明：本轮已完成消息中心域模型重建、server 系统消息接入、web 单列虚拟长列表消息中心，以及个人主页/他人主页与消息入口的联动优化。

## 已完成范围

- 重建共享消息 DTO：
  - `packages/schemas/src/social.ts`
- 重建消息表结构并补齐迁移：
  - `packages/db/src/schema.ts`
  - `packages/db/drizzle/0000_message_center_rebuild.sql`
  - `packages/db/drizzle/meta/_journal.json`
- 重构 server 消息域与系统消息生产：
  - `apps/server/src/modules/social/**`
  - `apps/server/src/modules/posts/**`
  - `apps/server/src/modules/rankings/**`
  - `apps/server/src/modules/aircraft-submissions/**`
  - `apps/server/src/modules/brand-applications/**`
- 重做 web 消息中心：
  - `apps/web/src/routes/notifications-page.tsx`
  - `apps/web/src/features/notifications/message-center.ts`
- 优化个人主页与他人主页入口概览：
  - `apps/web/src/features/auth/profile-page.tsx`
  - `apps/web/src/routes/user-profile-page.tsx`
  - `apps/web/src/features/auth/profile-overview.ts`
  - `apps/web/src/features/auth/profile-surface.tsx`
- 补齐 seed / test-data 与消息相关测试。

## 关键结果

- 新消息中心按 4 个一级分类渲染：
  - `点赞和收藏`
  - `新增关注`
  - `评论和@`
  - `系统消息`
- `system` 类消息已接入：
  - 帖子/动态状态变更
  - 榜单状态变更
  - 评分对象状态变更
  - 机型投稿状态变更
  - 品牌申请状态变更
- 消息中心使用单列虚拟长列表渲染，并支持：
  - 分类切换
  - 单条已读
  - 批量已读
  - 刷新
  - 错误态/空态
  - 目标跳转
- 个人主页已补入消息中心概览卡与入口。
- 他人主页已补入关系状态概览与更完整的内容/可见性说明。

## 已执行验证

- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run build`
- `bun run --cwd apps/web typecheck`
- `bun run --cwd apps/web lint`
- `bunx vitest run --config ./vitest.config.ts apps/web/tests/message-center.test.ts apps/web/tests/profile-overview.test.ts`
- `bun run --cwd apps/server test`

## 残余风险

- 当前消息中心虽然已经重建，但 `@` 仍以评论/回复语义为主，若后续要支持更精细的 mention 解析，建议单开专项。
- `seed.test-data.ts` 中的系统消息目标仍以可联调为主，未来若要做更精细的数据真实性，可继续扩充。
- `apps/admin` 本轮未触发兼容阻塞，因此未做额外适配；若后续 admin 要消费新消息域，再单独规划。
