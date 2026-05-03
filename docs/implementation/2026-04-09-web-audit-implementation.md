# 2026-04-09 Web 阶段实施记录

## 本轮改动

1. 保护路由与 auth bootstrap
   - 新增 `shouldSuspendProtectedRoute`
   - `ProtectedRoute` 在 bootstrap 完成前不再提前放行

2. 鉴权切换缓存隔离
   - 新增 `auth-cache-helpers.ts`
   - `WebLayout` 监听 auth scope 变化并清空 Query Cache
   - 通知 query key 改为按用户隔离
   - 通知页面刷新逻辑同步更新

3. 富文本安全收口
   - `sanitize.ts` 去掉 `<a>` 的 `data:` 放行
   - SSR fallback 额外清理危险 `href`
   - 增加 DOMPurify 不同导出形态兼容

4. 首屏分包与分享二维码按需化
   - `CirclePage` 改为懒加载
   - `vite.config.ts` 新增 `@wangeditor/*`、`qrcode`、`react-virtuoso` 的手工分包
   - 分享二维码生成改为打开浮层后按需执行

5. Web 错误映射保留 `ApiClientError.code`
   - `mapWebApiError` 保留 `ApiClientError`
   - 新增“用户名已被占用”相关测试

## 关键结果

- 首屏公共 `vendor` 从约 `1,125.43 kB` 降到 `263.76 kB`
- 编辑器依赖被移动到懒加载 `editor-vendor`
- 伪造过期本地登录态访问 `/settings` 时，不再触发私有资料/通知请求
- `apps/web/tests` 全量通过

## 本轮变更文件

- `apps/web/src/app.tsx`
- `apps/web/src/components/page-share-control.tsx`
- `apps/web/src/features/auth/auth-cache-helpers.ts`
- `apps/web/src/features/auth/notification-state.ts`
- `apps/web/src/features/auth/protected-route-helpers.ts`
- `apps/web/src/features/auth/protected-route.tsx`
- `apps/web/src/features/auth/use-notifications.ts`
- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/hooks/use-share-qr-data-url.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/lib/sanitize.ts`
- `apps/web/src/routes/notifications-page.tsx`
- `apps/web/tests/api-client-sanitization.test.ts`
- `apps/web/tests/auth-cache-helpers.test.ts`
- `apps/web/tests/notification-state.test.ts`
- `apps/web/tests/publish-route-guard.test.ts`
- `apps/web/tests/sanitize.test.ts`
- `apps/web/vite.config.ts`

## 验证记录

- `bun test`(apps/web/tests 全量)：通过
- `bun run --cwd apps/web typecheck`：通过
- `bun run --cwd apps/web build`：通过
- `bunx eslint apps/web/src apps/web/tests`：无错误，1 条既有 warning
- Playwright 自动化验证：通过
