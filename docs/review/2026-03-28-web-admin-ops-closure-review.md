# 2026-03-28 Web/Admin Ops Closure Review

## 1. 需求文档
- 路径：未单独落盘；本次审查以主会话已确认需求与 `docs/tasks/2026-03-28-web-admin-ops-closure-tasks.md` 为准

## 2. 任务文档
- 路径：`docs/tasks/2026-03-28-web-admin-ops-closure-tasks.md`

## 3. 计划文档
- 路径：未单独落盘；本次审查以主会话对话中的执行计划和任务拆分为准

## 4. 前端实现文档
- 路径：`docs/implementation/2026-03-28-admin-frontend-implementation.md`
- 补充：web 侧本轮未单独落实现文档

## 5. 后端实现文档
- 路径：`docs/implementation/2026-03-28-web-admin-ops-backend-implementation.md`

## 6. 审查结论
- 通过

## 7. 需求覆盖情况
- 已覆盖：
  - web 顶栏用户块在桌面端和移动端都可进入个人中心
  - 榜单列表/详情/条目详情评分展示按要求收敛，榜单本体评分已移除，条目评分强化为蓝色大数字
  - 飞行器库筛选布局压缩为左侧紧凑筛选 + 右侧结果区
  - 设置页已改为紧凑布局，移除“同步后端”暴露文案，增加手机号换绑流程与脱敏显示
  - 首页/文章详情已增加官方标签展示
  - admin 首页已改为 dashboard，具备图表、快捷入口、审核开关、官方文章发布和投稿审核入口
- 复核补充：
  - 移动端浏览器定向回归已通过：登录后顶部 `/me` 入口可见
  - 设置页先改昵称再换绑手机号后，昵称草稿仍保留

## 8. 计划一致性
- 后端共享部分符合任务文档中的 `SC1`、`SC2`、`BE1`、`BE2`、`BE3`、`BE4`。
- web 前端符合 `FE1`~`FE5`。
- admin 前端符合 `FE6`、`FE7`，并额外补了 helper 级测试与实现文档。
- 根测试入口已更新，`apps/admin/tests` 已纳入 `bun run test`，符合最终集成验证预期。

## 9. 前后端边界一致性
- `API_ROUTES.admin.siteSettings`、`API_ROUTES.users.mePhoneChangeRequest`、`API_ROUTES.users.mePhoneChangeConfirm` 已在 shared/http-client/server 三层对齐。
- `currentUserProfile.phoneMasked` 已在 schema、server 和 web 页面使用上对齐。
- 官方标签依赖 `author.role === "admin"`，web 首页/详情与后台官方文章发布链路一致。
- 审核开关仅作用于帖子直发，不影响飞行器投稿审核，边界符合计划。
- admin `site settings` 已收回 `API_ROUTES.admin.siteSettings`，未再使用硬编码路径。

## 10. 测试覆盖状态
- 已有证据：
  - `bun run test`
  - `bun run typecheck`
  - `bun run build`
  - 浏览器联调：登录、设置换绑、个人中心、消息、飞友圈、飞行器库、榜单详情/条目、admin 登录、审核开关、官方文章发布、投稿审核入口
  - 补充定向回归：移动端顶部 `/me` 入口、设置页“先改昵称再换绑手机号”
- TDD 证据：
  - 后端实现文档记录了 `apps/server/tests/auth.test.ts` 与 `apps/server/tests/posts.test.ts` 的 Red/Green 命令和失败原因
  - 当前主工作区已通过 `bun run test`，包含 server 全量测试
- 覆盖评价：
  - 后端审核开关、手机号换绑、管理员直发的自动化覆盖充分
  - web/admin 前端以 helper 测试 + 浏览器联调为主，符合 `test_after` / `manual_only` 约束

## 11. 问题列表
### 阻塞
- 无

### 高
- 无

### 中
- 无

### 低
- 无

## 12. 必须修复项
- 无

## 13. 优化建议
- 后端仍保留 `users/me/profile` 直接更新 `phone` 的兼容入口。若后续要强制所有手机号修改都走换绑流程，建议单独立项收口。

## 14. 回归建议
- 重点回归移动端 web 壳层：已登录态下顶部用户区、侧边抽屉和个人中心跳转的一致性。
- 重点回归设置页复合操作：先改昵称/简介，再执行手机号换绑，再保存资料，确认所有本地修改都保留。
- 重点回归 admin 官方文章列表与首页官方标签链路：管理员发文后首页最新流与详情页都应保持“官方”标识。
- 重点回归审核开关：关闭审核后普通用户文章/动态直发，重新开启后恢复进入审核队列。

## 15. 推荐的下一步
1. 将本轮结果作为可交付版本进入下一轮需求或发布流程。
2. 若后续继续演进账号安全，单独规划“禁止通过 `/users/me/profile` 直接改手机号”的收口任务。
