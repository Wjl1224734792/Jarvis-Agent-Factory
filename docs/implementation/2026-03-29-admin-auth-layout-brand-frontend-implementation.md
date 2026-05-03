# 当前实现目标

- 在 `apps/admin` 范围内完成品牌 Logo 管理、富文本工具栏 icon 化、固定布局和最近登录会话面板。

# 输入依据

- 用户确认的“飞加网认证、品牌与机型筛选一揽子改造计划”。
- 主会话分配的 admin 前端子任务范围。
- `AGENTS.md`、`apps/admin/AGENTS.md` 的边界和验证要求。

# 工作区模式

- 仓库：`E:\CodeStore\feijia`
- 作用域：仅修改 `apps/admin/*` 和实现文档
- 不触碰：`packages/*`、`apps/server/*`、`apps/web/*`

# 变更文件 / 变更范围

- `apps/admin/src/features/models/brands-page.tsx`
- `apps/admin/src/components/admin-rich-text-editor.tsx`
- `apps/admin/src/components/admin-rich-text-toolbar.ts`
- `apps/admin/src/features/auth/admin-shell.tsx`
- `apps/admin/src/features/auth/admin-overview-page.tsx`
- `apps/admin/src/features/auth/admin-session-helpers.ts`
- `apps/admin/src/lib/api-client.ts`
- `apps/admin/src/styles.css`
- `apps/admin/tests/admin-rich-text-toolbar.test.ts`
- `apps/admin/tests/admin-session-helpers.test.ts`
- `docs/implementation/2026-03-29-admin-auth-layout-brand-frontend-implementation.md`

# 实现说明

## 品牌管理

- 品牌管理页新增 Logo 上传、预览和移除能力。
- 品牌列表表格新增 Logo 列。
- 创建表单去掉了前端主导的排序输入，保留编辑态排序字段，等待后端自动递增排序策略生效。
- `api-client` 已前向兼容 `logoUrl` 字段和创建/更新 payload。

## 富文本工具栏

- `AdminRichTextEditor` 改为 icon-only 工具栏。
- 所有按钮通过 `Tooltip` 提供中文 hover 文案。
- 抽出 `admin-rich-text-toolbar.ts` 存放 tooltip 配置，方便测试和后续统一维护。

## 布局

- Admin shell 调整为固定 header、固定 sider、固定 content 视窗。
- 内容区改为 `content-inner` 内部滚动，避免整页随着主内容一起滚动。

## 最近登录设备 / IP

- Admin 总览页新增最近登录会话面板。
- 前端通过 `/admin/auth/sessions` 拉取最近会话，展示账号、端类型、状态、设备、IP 和最近活跃时间。
- 抽出 `admin-session-helpers.ts` 统一格式化 scope/status/时间展示。

# 测试和验证结果

- 已通过：
  - `bun x vitest run --config vitest.config.ts apps/admin/tests/admin-navigation.test.ts apps/admin/tests/official-articles-helpers.test.ts apps/admin/tests/admin-rich-text-toolbar.test.ts apps/admin/tests/admin-session-helpers.test.ts`

- 当前阻塞：
  - `bun run --cwd apps/admin typecheck`
  - 阻塞原因：主会话正在修改 `packages/http-client/src/index.ts`，当前共享契约处于半完成状态，TypeScript 在 workspace 依赖处报错，不是本次 admin 文件自身的首个报错。

# 边界和异常处理

- 最近登录面板对接口失败和空数据都做了兜底展示。
- 品牌 Logo 上传失败会复用页面错误提示，不会污染表单字段。
- 由于不允许修改后端和共享契约，当前 `logoUrl` 和 `/admin/auth/sessions` 仅做前向适配，需主会话补齐后端。

# 风险 / 未解决项

- 当前未做浏览器级烟测，布局滚动和 Tooltip 交互仍需主会话联调。
- 品牌创建时“自动递增排序”依赖后端真正忽略前端传入排序值。
- `Tooltip` 对禁用按钮的 hover 体验取决于 antd 包装行为，建议联调时实际确认。

# 需要 backend_implementer 配合的点

- `GET /admin/auth/sessions` 返回以下字段：
  - `id`
  - `scope`
  - `clientIp`
  - `userAgent`
  - `deviceLabel`
  - `createdAt`
  - `lastSeenAt`
  - `revokedAt`
  - `expiresAt`
  - `status`
  - `user.id`
  - `user.displayName`
  - `user.role`
  - `user.phone`
- 品牌接口返回并接收 `logoUrl`
- 品牌创建时后端执行自动排序递增

# 推荐的下一步

- 主会话合入共享契约和后端接口后，重新跑 `apps/admin` typecheck/build。
- 用真实数据联调品牌 Logo、最近登录会话和 admin 固定布局滚动。
