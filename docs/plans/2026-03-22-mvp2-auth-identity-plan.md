# MVP 第2迭代账号与身份体系实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在 worktree `E:\CodeStore\feijia\.worktrees\mvp2-auth-identity` 上交付第2迭代最小身份体系，打通 web、admin、server 的登录、会话恢复与权限校验闭环。

**架构：** 主代理先收敛共享认证契约、请求层与 session 约束，再并行推进 `apps/server` 认证模块与 `apps/web`、`apps/admin` 的登录流程。服务端先用内存存储承接验证码、用户和 session，保证最小可用链路，不提前扩到数据库。

**技术栈：** Bun Workspace、React、React Router、Zustand、TanStack Query、Hono、Zod、Vitest

---

## 文件结构

- 修改：`packages/schemas/src/index.ts`
- 创建：`packages/schemas/src/auth.ts`
- 创建：`packages/schemas/tests/auth.test.ts`
- 修改：`packages/http-client/src/index.ts`
- 修改：`apps/server/src/app.ts`
- 创建：`apps/server/src/modules/auth/*`
- 创建：`apps/server/src/modules/session/*`
- 创建：`apps/server/src/modules/users/*`
- 创建：`apps/server/src/middlewares/*`
- 创建：`apps/server/tests/auth.test.ts`
- 修改：`apps/web/src/app.tsx`
- 创建：`apps/web/src/routes/login-page.tsx`
- 创建：`apps/web/src/routes/profile-page.tsx`
- 创建：`apps/web/src/components/auth/*`
- 创建：`apps/web/src/store/use-auth-store.ts`
- 修改：`apps/web/src/lib/api-client.ts`
- 修改：`apps/admin/src/app.tsx`
- 创建：`apps/admin/src/routes/login-page.tsx`
- 创建：`apps/admin/src/routes/dashboard-page.tsx`
- 创建：`apps/admin/src/store/use-admin-auth-store.ts`
- 修改：`README.md`

## 任务 1：共享认证契约

**文件：**
- 创建：`packages/schemas/src/auth.ts`
- 修改：`packages/schemas/src/index.ts`
- 测试：`packages/schemas/tests/auth.test.ts`

- [ ] 编写认证契约测试，覆盖角色、验证码、登录请求、用户摘要、session 相关响应
- [ ] 运行 `bunx vitest run --config vitest.config.ts packages/schemas/tests/auth.test.ts`，确认先失败
- [ ] 实现 `auth.ts` 并从 `index.ts` 导出
- [ ] 重跑认证契约测试，确认通过

## 任务 2：服务端认证与 session 底座

**文件：**
- 创建：`apps/server/src/modules/auth/*`
- 创建：`apps/server/src/modules/session/*`
- 创建：`apps/server/src/modules/users/*`
- 创建：`apps/server/src/middlewares/*`
- 修改：`apps/server/src/app.ts`
- 测试：`apps/server/tests/auth.test.ts`

- [ ] 编写服务端认证红灯测试，覆盖 web 登录、`/auth/me`、管理员登录、管理员接口拒绝/通过、退出登录
- [ ] 运行 `bunx vitest run --config vitest.config.ts apps/server/tests/auth.test.ts`，确认失败
- [ ] 实现最小 auth/session/users/middleware 模块
- [ ] 重跑认证测试，确认通过

## 任务 3：统一请求层认证接口

**文件：**
- 修改：`packages/http-client/src/index.ts`

- [ ] 扩展请求层认证方法：captcha、sms、web login、admin login、me、logout
- [ ] 统一 `credentials: "include"` 与错误映射
- [ ] 运行 `bun run --cwd packages/http-client typecheck`

## 任务 4：Web 登录流与个人入口

**文件：**
- 修改：`apps/web/src/app.tsx`
- 创建：`apps/web/src/routes/login-page.tsx`
- 创建：`apps/web/src/routes/profile-page.tsx`
- 创建：`apps/web/src/components/auth/*`
- 创建：`apps/web/src/store/use-auth-store.ts`
- 修改：`apps/web/src/lib/api-client.ts`

- [ ] 接入 web 登录页与身份恢复逻辑
- [ ] 顶部用户入口根据 `/auth/me` 切换
- [ ] 添加退出登录和个人中心最小入口
- [ ] 运行 `bun run --cwd apps/web typecheck`

## 任务 5：Admin 登录流与守卫

**文件：**
- 修改：`apps/admin/src/app.tsx`
- 创建：`apps/admin/src/routes/login-page.tsx`
- 创建：`apps/admin/src/routes/dashboard-page.tsx`
- 创建：`apps/admin/src/store/use-admin-auth-store.ts`

- [ ] 接入 admin 登录页
- [ ] 添加管理员身份恢复和首页守卫
- [ ] 添加退出登录
- [ ] 运行 `bun run --cwd apps/admin typecheck`

## 任务 6：联调与文档

**文件：**
- 修改：`README.md`

- [ ] 记录 web/admin/server 启动方式、默认登录流、mock 验证码行为
- [ ] 运行 `bun run check`
- [ ] 记录残余风险：内存存储、开发态 mock 短信

## 分工

- 主代理：
  - `packages/schemas`
  - `packages/http-client`
  - session/Cookie 结构与中间件边界
  - 联调与最终验证
- `backend_implementer`：
  - `apps/server/src/modules/auth`
  - `apps/server/src/modules/session`
  - `apps/server/src/modules/users`
  - `apps/server/tests/auth.test.ts`
- `frontend_implementer`：
  - `apps/web` 登录流、入口、个人中心
  - `apps/admin` 登录页、守卫、退出

## 验证序列

1. `bunx vitest run --config vitest.config.ts packages/schemas/tests/auth.test.ts`
2. `bunx vitest run --config vitest.config.ts apps/server/tests/auth.test.ts`
3. `bun run --cwd packages/http-client typecheck`
4. `bun run --cwd apps/web typecheck`
5. `bun run --cwd apps/admin typecheck`
6. `bun run check`
