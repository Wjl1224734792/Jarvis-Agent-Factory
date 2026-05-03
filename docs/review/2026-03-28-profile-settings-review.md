# 个人中心与设置页审查

## 1. 需求文档
- 路径：`docs/requirements/2026-03-27-profile-settings-requirements.md`

## 2. 任务文档
- 路径：`docs/tasks/2026-03-27-profile-settings-tasks.md`

## 3. 计划文档
- 路径：无单独落盘文件；本轮仅有会话内 `planner` 输出

## 4. 前端实现文档
- 路径：无单独落盘文件；以前端代码变更与验证输出为准

## 5. 后端实现文档
- 路径：无；本轮无后端实现

## 6. 审查结论
- 有条件通过

## 7. 需求覆盖情况
- `/me`、`/settings`、`/notifications` 已接入真实路由，并通过 `ProtectedRoute` 受保护。
- 桌面端 `UserMenu` 与移动端 `WebLayout` sheet 已补个人入口。
- 个人中心与设置页视觉风格基本对齐现有 `site-shell` / `Card` / `Button` 体系。
- profile/settings 未伪装为已有后端能力，主要行为明确为本地前端态。
- 现有登录、注销、通知页面入口仍可从代码路径上走通。

## 8. 计划一致性
- `W1` 已完成：路由与用户入口接线到位。
- `W2` 已完成：个人中心页重构完成。
- `W3` 已完成：设置页重构完成。
- `W4` 已完成：本地状态与派生逻辑收口到 `profile-settings-state.ts`。
- `W5` 部分完成：有状态辅助测试、类型检查、构建证据，但缺少路由/入口的直接验证证据与浏览器走查记录。

## 9. 前后端边界一致性
- 本轮没有扩展后端接口，整体边界基本保持清晰。
- 但本地存储采用全局 key，未按用户隔离，导致“本地前端态”跨账号串数据，破坏了个人中心/设置页与当前登录用户之间的边界。

## 10. 测试覆盖状态
- 已验证：
  - `bunx vitest run --config vitest.config.ts apps/web/tests/profile-settings-state.test.ts apps/web/tests/model-review-form.test.ts apps/web/tests/query-client.test.ts`
  - `bun run --cwd apps/web typecheck`
  - `bun run --cwd apps/web build`
- 现有自动化测试主要覆盖 `profile-settings-state.ts` 的纯函数逻辑。
- 缺失：
  - `/me`、`/settings`、`/notifications` 路由可达性验证
  - `UserMenu` / mobile sheet 入口回归验证
  - 未登录访问跳转登录的回归验证
  - 浏览器层手工走查记录

## 11. 问题列表

### 阻塞
- 无

### 高
- `apps/web/src/features/auth/profile-settings-state.ts:4`
  - `SETTINGS_STORAGE_KEY` 是全局常量，`readStoredSettingsDraft()` / `persistSettingsDraft()` 未按 `user.id` 做隔离。只要同一浏览器上切换账号，后一位用户就会读取到前一位用户保存的本地 `bio`、`homeBase`、`phone`、`visibility` 和 `lastSavedLabel`。`ProfilePage` 在 `apps/web/src/features/auth/profile-page.tsx:51` 也会直接消费这份跨账号数据。这个问题会造成个人中心与设置页展示错绑到错误账号。

### 中
- `apps/web/src/routes/settings-page.tsx:361`
  - 设置页新增的 `Textarea` / `Input` 字段没有程序化关联的 `<label htmlFor>`，密码区输入框也只有 placeholder，没有可关联 label。视觉上有说明文字，但对屏幕阅读器、自动填充和表单可访问性不够。
- `apps/web/src/app.tsx:47`
  - 当前测试没有直接覆盖 W1/W5 的关键回归点：路由可达、用户入口跳转、未登录重定向、移动端 sheet 入口。现有 `apps/web/tests/profile-settings-state.test.ts` 只覆盖纯状态函数，无法替代页面级验证。

### 低
- `apps/web/src/features/auth/profile-settings-state.ts:295`
  - `deletionArmed` 切换不会把 `hasPendingChanges` 置为 `true`，但 danger zone 文案又使用了“staged locally”。表现上会出现顶部状态仍显示 `In sync`，而危险区文案认为已 staged 的不一致。

## 12. 必须修复项
- 将本地设置存储按当前用户隔离，至少包含 `user.id` 维度，或在登录态变化时清理不属于当前用户的本地数据。
- 为 W1/W5 补一类直接证据：页面级自动化验证，或明确记录的浏览器手工回归结果。

## 13. 优化建议
- 为设置页字段补 `label`、`id`、`name`、合适的 `autoComplete`。
- danger zone 的 staged 状态与页面顶部“是否有未保存更改”的状态模型保持一致。
- 如后续继续扩展本地设置，考虑把“当前 section”与 URL 或 query 参数同步，便于直达与回归测试。

## 14. 回归建议
- 增加至少一个页面级测试，覆盖：
  - 已登录访问 `/me`、`/settings`
  - 未登录访问两页重定向 `/login?redirect=...`
  - `UserMenu` / mobile sheet 能进入 profile/settings/notifications
  - logout 后回到首页
- 增加“同一浏览器切换账号”的本地存储回归用例。
- 浏览器手工检查移动端布局、hover/focus、键盘导航。

## 15. 推荐的下一步
- 先修复本地存储跨账号污染，再补一条页面级回归验证链路，然后重新做一次 review。

## 16. 审查文档路径
- `docs/review/2026-03-28-profile-settings-review.md`
