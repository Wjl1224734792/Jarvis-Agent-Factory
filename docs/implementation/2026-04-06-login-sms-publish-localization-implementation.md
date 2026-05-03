# 登录验证码重发、短信错误修复与发布菜单中文化实现记录

## 实现内容

- 修复 `/auth/sms/request` 在短信频率限制场景下返回 500 的问题
- 登录页新增重新发送验证码逻辑与 60 秒冷却提示
- 发送短信后自动刷新图形验证码
- 发布菜单选项改为中文
- 重新执行海量测试数据脚本，推送模拟数据到 PostgreSQL、Redis、MinIO

## 关键文件

- `apps/server/src/modules/auth/auth.service.ts`
- `apps/server/tests/auth.test.ts`
- `apps/web/src/features/auth/login-page.tsx`
- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/routes/publish-aircraft-page.tsx`

## 验证

- `bun run db:seed:test-data`
- `bun run check`
