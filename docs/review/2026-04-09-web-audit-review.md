# 2026-04-09 Web 阶段审查报告

## 审查结论

- 结论：有条件通过
- 说明：`apps/web` 已完成本阶段高置信度问题修复与验证，可进入 `admin` 阶段；但仍存在若干结构性建议项，留待后续阶段或专项优化处理。

## 主要发现

### [已修复] 受保护路由在 auth bootstrap 完成前可能放行

- 风险：本地残留用户态存在时，`/settings`、`/profile`、`/notifications` 可能先渲染私有页面并触发私有请求，再被异步会话校验打回匿名态。
- 处理：为 `ProtectedRoute` 增加 `isBootstrapped` 前置判断，在 bootstrap 完成前统一停留在骨架态，不再提前放行。

### [已修复] 鉴权切换后 React Query 缓存未隔离

- 风险：登录、登出、401 失效或账号切换后，通知和带 `viewer` 字段的页面数据可能短暂复用上一位用户的缓存。
- 处理：
  - 引入 auth scope 比较逻辑，在 auth scope 变化时统一 `queryClient.clear()`
  - 通知 query key 从固定 `["notifications"]` 改为按用户隔离

### [已修复] 富文本清洗允许危险 `data:` 链接进入 `<a href>`

- 风险：文章详情页和发布预览都会渲染清洗后的 HTML，若 `<a href>` 允许 `data:`，会把风险扩大到点击跳转层面。
- 处理：
  - `ADD_DATA_URI_TAGS` 仅保留 `img`
  - SSR fallback 补充对危险 `href="data:..."` 的移除
  - 兼容不同运行环境下 DOMPurify 的导出形态

### [已修复] Web 首屏分包拓扑不合理，低频依赖被提前带入

- 证据：
  - 改造前 `vendor` 约 `1,125.43 kB`，公开页会提前预加载大量低频依赖
  - 改造后 `vendor` 降至 `263.76 kB`，`@wangeditor` 被拆到 `editor-vendor`，`qrcode` 被拆到 `share-vendor`，`react-virtuoso` 被拆到 `feed-vendor`
- 处理：
  - `CirclePage` 改为懒加载
  - 手工分包补齐 `@wangeditor/*`、`qrcode`、`react-virtuoso`
  - 分享二维码改为打开浮层后再按需生成

### [已修复] Web 统一包错会丢失 `ApiClientError.code`

- 风险：登录注册页依赖 `DISPLAY_NAME_TAKEN` 做字段级提示，但统一错误翻译会把 `ApiClientError` 退化为普通 `Error`。
- 处理：保留 `ApiClientError` 类型与 `code`，并补充“用户名已被占用”安全文案映射。

## 本轮未处理但建议继续跟进

### [建议后续处理] `apps/web/src/lib/api-client.ts` 仍重复定义部分共享响应结构

- 影响：共享协议边界仍不够清晰，后续字段漂移时容易出现页面层 `unknown/as` 兜底。
- 建议：后续把模型、评分对象等重复响应逐步收回 `packages/http-client` 与 `packages/schemas`。

### [建议后续处理] 互动链路的 cache invalidation 仍偏粗

- 影响：点赞、评论、关注会让首页、圈子、详情、通知一并失效，容易造成额外重拉与闪烁。
- 建议：后续按页面域细化失效范围，或引入更局部的 cache update。

### [建议后续处理] `editor-vendor` 仍较大

- 现状：`editor-vendor` 约 `798.78 kB`，虽然已从首屏剥离，但发布页首次进入仍会承担较重编辑器成本。
- 建议：后续继续评估富文本依赖收敛、CSS 颗粒度和编辑器组件拆分。

## 验证结果

- `bun test` 全量执行 `apps/web/tests/*.test.ts`：`70 pass / 0 fail`
- `bun run --cwd apps/web typecheck`：通过
- `bun run --cwd apps/web build`：通过
  - 剩余 Vite 大 chunk 提示仅针对懒加载的 `editor-vendor`
- `bunx eslint apps/web/src apps/web/tests`：无错误，存在 1 条既有 warning
  - 文件：`apps/web/src/components/publish-aircraft-live-preview.tsx`
  - 类型：`react-hooks/exhaustive-deps`
- Playwright 浏览器验证：
  - 首页公开访问成功，最终 URL 为 `/home`
  - 伪造本地残留登录态直开 `/settings` 后，页面跳转到 `/login?redirect=%2Fsettings`
  - 该场景下未触发 `/users/me/profile`、`/notifications` 等私有 API 请求
  - 登录页表单元素 `#login-phone`、`#login-sms` 已渲染

## 追踪矩阵

| requirement | task | changed_files | tests / verification | result |
|---|---|---|---|---|
| Web 健壮性审查与修复 | TASK-AUDIT-002 | `apps/web/src/features/auth/*`, `apps/web/src/routes/notifications-page.tsx`, `apps/web/src/lib/api-client.ts`, `apps/web/src/lib/sanitize.ts`, `apps/web/tests/*` | `bun test`(web), `typecheck`, `build`, Playwright smoke | 完成 |
| Web 首屏与运行时性能优化 | TASK-AUDIT-002 | `apps/web/src/app.tsx`, `apps/web/src/hooks/use-share-qr-data-url.ts`, `apps/web/src/components/page-share-control.tsx`, `apps/web/vite.config.ts` | 构建产物对比 + 浏览器 smoke | 完成 |
