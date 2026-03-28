# 2026-03-28 Web/Admin Ops Closure Backend Implementation

## 1. 当前实现目标
- 新增站点帖子审核开关（持久化 + admin GET/PUT 接口）。
- 接入发帖状态决策：普通用户受审核开关控制，管理员发文始终直发。
- 新增手机号换绑请求/确认接口，复用图形码和短信码能力，确认阶段校验手机号唯一性。
- `current user profile` 增加 `phoneMasked` 读模字段，保留 `phone` 兼容。
- 同步更新共享路由常量、schema、http-client，并补齐后端测试闭环。

## 2. 输入依据
- 需求与计划：主会话已确认计划与任务包。
- 任务文档：[docs/tasks/2026-03-28-web-admin-ops-closure-tasks.md](/E:/CodeStore/feijia/docs/tasks/2026-03-28-web-admin-ops-closure-tasks.md)
- 执行约束：仅修改 backend/shared 允许路径，不改前端页面。

## 3. 工作区模式
- 执行环境：`danger-full-access`
- 协作模式：与主会话并行，未回滚他人改动，基于当前工作树兼容实现。

## 4. 变更文件 / 变更范围
- `packages/shared/src/index.ts`
- `packages/schemas/src/social.ts`
- `packages/schemas/src/site-settings.ts` (new)
- `packages/schemas/src/index.ts`
- `packages/http-client/src/index.ts`
- `packages/db/src/schema.ts`
- `packages/db/src/index.ts`
- `packages/db/src/seed.ts`
- `packages/db/drizzle/0011_post_moderation_switch.sql` (new)
- `packages/db/drizzle/meta/_journal.json`
- `apps/server/src/app.ts`
- `apps/server/src/modules/site-settings/site-settings.repo.ts` (new)
- `apps/server/src/modules/site-settings/site-settings.service.ts` (new)
- `apps/server/src/modules/site-settings/site-settings.route.ts` (new)
- `apps/server/src/modules/posts/posts.repo.ts`
- `apps/server/src/modules/posts/posts.service.ts`
- `apps/server/src/modules/posts/posts.route.ts`
- `apps/server/src/modules/auth/auth.repo.ts`
- `apps/server/src/modules/auth/auth.service.ts`
- `apps/server/src/modules/social/social.repo.ts`
- `apps/server/src/modules/social/social.service.ts`
- `apps/server/src/modules/social/social.route.ts`
- `apps/server/tests/auth.test.ts`
- `apps/server/tests/posts.test.ts`

## 5. 实现说明
- 站点设置：
  - 新增 `site_settings` 表，字段 `post_moderation_enabled`。
  - 新增 `site-settings` 模块（repo/service/route），提供 admin `GET/PUT /admin/site-settings`。
  - 默认行为：未配置行时按 `postModerationEnabled = true` 处理。
- 发帖决策：
  - `postsService.createPost` 新增 `authorRole` 输入。
  - 规则：
    - `authorRole === "admin"` -> `published` + `publishedAt = now`
    - 普通用户且 `postModerationEnabled = false` -> `published`
    - 普通用户且 `postModerationEnabled = true` -> `pending`
  - `postsRepo.createPost` 接收 `status/publishedAt` 并按入参落库。
- 手机号换绑：
  - 新增路由：
    - `POST /users/me/phone/change/request`
    - `POST /users/me/phone/change/confirm`
  - 请求阶段复用 `authService.requestSmsCode`（图形码校验 + 发送短信）。
  - 确认阶段使用 `requestId + phone + smsCode` 校验；新增 `authRepo.validateSmsCodeByRequest`。
  - 确认阶段手机号唯一性校验：若被其他用户占用，返回 `409 CONFLICT`。
- 用户资料读模：
  - `currentUserProfile` 增加 `phoneMasked`。
  - 脱敏规则：`****` + 后四位；无手机号返回 `null`。
- 共享契约：
  - `API_ROUTES` 新增：
    - `API_ROUTES.admin.siteSettings`
    - `API_ROUTES.users.mePhoneChangeRequest`
    - `API_ROUTES.users.mePhoneChangeConfirm`
  - `@feijia/schemas` 新增 `site-settings` schema 与手机号换绑输入/输出 schema。
  - `@feijia/http-client` 新增：
    - `getAdminSiteSettings`
    - `updateAdminSiteSettings`
    - `requestPhoneChange`
    - `confirmPhoneChange`

## 6. 测试和验证结果
- Red（失败）：
  - `bunx vitest run --root ../.. --config vitest.config.ts apps/server/tests/auth.test.ts`
    - 失败点：`phoneMasked` 缺失；换绑路由未定义/状态码不符。
  - `bunx vitest run --root ../.. --config vitest.config.ts apps/server/tests/posts.test.ts`
    - 失败点：`API_ROUTES.admin.siteSettings` 缺失；管理员发文仍 `pending`。
- Green（通过）：
  - `bunx vitest run --root ../.. --config vitest.config.ts apps/server/tests/auth.test.ts` -> 7 passed
  - `bunx vitest run --root ../.. --config vitest.config.ts apps/server/tests/posts.test.ts` -> 10 passed
- 额外类型检查（通过）：
  - `bun run --cwd packages/shared typecheck`
  - `bun run --cwd packages/schemas typecheck`
  - `bun run --cwd packages/http-client typecheck`
  - `bun run --cwd packages/db typecheck`
  - `bun run --cwd apps/server typecheck`

## 7. 数据与接口边界
- 数据边界：
  - 新增单例表 `site_settings`，当前仅承载 `post_moderation_enabled`。
  - `users.phone` 仍是真实手机号存储字段；`phoneMasked` 仅为响应读模字段，不入库。
- 接口边界：
  - 管理接口 `admin/site-settings` 仅 admin 可访问。
  - 手机号换绑接口仅登录用户可访问，确认接口以 `requestId+phone+smsCode` 做校验并在确认时做唯一性校验。
  - 未修改现有 `users/me/profile` 更新接口的 `phone` 字段兼容行为。

## 8. 风险 / 未解决项
- `users/me/profile` 仍允许直接改 `phone`，与“换绑流程”并存；若后续要强制换绑路径，需要产品与主会话确认后收口。
- `site_settings` 当前为单例行模型，后续若扩展多租户/多环境设置需重构键模型。
- 当前仅验证后端集成测试与类型检查，未在本任务内执行全量 `bun run test` / `bun run build`。

## 9. 需要 frontend_implementer 配合的点
- Web 设置页改用 `requestPhoneChange` + `confirmPhoneChange` 两段式换绑接口，不再直接依赖 `updateCurrentUserProfile` 改手机号。
- Web 设置页与个人信息页显示 `phoneMasked`，不直接展示完整手机号。
- Admin 首页审核开关卡片接入：
  - `getAdminSiteSettings`
  - `updateAdminSiteSettings`
- 首页“官方标签”判断可继续使用现有 `author.role === "admin"`。

## 10. 推荐的下一步
1. `frontend_implementer` 接入新增 client 方法并完成页面联调。
2. 主会话在前后端合流后跑一次根级 `bun run test`、`bun run typecheck`、`bun run build`。
3. 由 `review_qa` 核对 Red/Green 证据与跨模块回归影响。

