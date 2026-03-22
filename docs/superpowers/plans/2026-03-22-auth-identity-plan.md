# 第 2 迭代账号与身份体系实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在当前 monorepo 骨架上实现 `web` 用户手机号验证码登录、`admin` 账号密码登录，以及统一的 `HttpOnly Cookie` 会话与身份恢复能力。

**架构：** 服务端在 `auth/users` 模块中统一处理验证码、登录、会话与 `/me` 校验；共享契约全部收敛到 `packages/schemas`，请求封装收敛到 `packages/http-client`。`web` 和 `admin` 只保留轻量身份状态，真实身份一律从服务端恢复。

**技术栈：** Bun Workspace、TypeScript、React、React Router、Zustand、TanStack Query、Hono、Zod、Vitest

---

## 文件结构

- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/auth/auth.schema.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/auth/auth.service.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/auth/auth.route.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/auth/auth.middleware.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/auth/auth.repo.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/users/users.schema.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/users/users.service.ts`
- 修改：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/app.ts`
- 修改：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/packages/schemas/src/index.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/packages/schemas/src/auth.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/packages/schemas/tests/auth.test.ts`
- 修改：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/packages/http-client/src/index.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/tests/auth.test.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/web/src/features/auth/*`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/admin/src/features/auth/*`
- 修改：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/web/src/app.tsx`
- 修改：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/admin/src/app.tsx`
- 修改：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/README.md`

## 任务 1：共享认证契约

**文件：**
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/packages/schemas/src/auth.ts`
- 修改：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/packages/schemas/src/index.ts`
- 测试：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/packages/schemas/tests/auth.test.ts`

- [ ] **步骤 1：编写失败的 schema 测试**

覆盖：
- web 登录请求/响应
- admin 登录请求/响应
- `/me` 用户摘要
- 统一认证错误码

- [ ] **步骤 2：运行测试验证失败**

运行：`bunx vitest run --config vitest.config.ts packages/schemas/tests/auth.test.ts`
预期：FAIL，缺少 auth schema 导出

- [ ] **步骤 3：实现最小 auth schema**

要求：
- 仅定义契约，不写业务逻辑
- 区分 `user` / `admin`
- 统一错误结构

- [ ] **步骤 4：运行测试验证通过**

运行：`bunx vitest run --config vitest.config.ts packages/schemas/tests/auth.test.ts`
预期：PASS

## 任务 2：服务端会话与认证模块

**文件：**
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/auth/auth.schema.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/auth/auth.service.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/auth/auth.route.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/auth/auth.middleware.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/auth/auth.repo.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/users/users.schema.ts`
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/users/users.service.ts`
- 修改：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/app.ts`
- 测试：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/tests/auth.test.ts`

- [ ] **步骤 1：编写失败的服务端认证测试**

覆盖：
- 申请图形验证码
- 请求短信验证码
- web 登录后写入 cookie
- `/auth/me` 恢复身份
- admin 账号密码登录
- 普通用户访问管理员受保护接口被拒绝
- logout 失效

- [ ] **步骤 2：运行测试验证失败**

运行：`bunx vitest run --config vitest.config.ts apps/server/tests/auth.test.ts`
预期：FAIL，缺少 auth route/service

- [ ] **步骤 3：实现最小服务端模块**

要求：
- 先使用内存仓储或开发仓储
- mock 短信与图形验证码抽象成 service
- cookie 会话边界清晰

- [ ] **步骤 4：运行测试验证通过**

运行：`bunx vitest run --config vitest.config.ts apps/server/tests/auth.test.ts`
预期：PASS

## 任务 3：统一请求封装

**文件：**
- 修改：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/packages/http-client/src/index.ts`

- [ ] **步骤 1：补 auth client 接口**

包含：
- `requestCaptchaChallenge`
- `requestSmsCode`
- `loginWeb`
- `loginAdmin`
- `getCurrentUser`
- `logout`

- [ ] **步骤 2：运行类型检查**

运行：`bun run --cwd packages/http-client typecheck`
预期：PASS

## 任务 4：Web 登录与身份恢复

**文件：**
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/web/src/features/auth/*`
- 修改：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/web/src/app.tsx`

- [ ] **步骤 1：实现 web auth store 与 me 恢复**

- [ ] **步骤 2：实现手机号验证码登录页或入口**

- [ ] **步骤 3：实现顶部用户入口、退出与个人中心最小页**

- [ ] **步骤 4：运行类型检查与冒烟验证**

运行：`bun run --cwd apps/web typecheck`
预期：PASS

## 任务 5：Admin 登录与守卫

**文件：**
- 创建：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/admin/src/features/auth/*`
- 修改：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/admin/src/app.tsx`

- [ ] **步骤 1：实现 admin 登录页与账号密码表单**

- [ ] **步骤 2：实现管理员会话恢复与路由守卫**

- [ ] **步骤 3：实现退出登录**

- [ ] **步骤 4：运行类型检查与冒烟验证**

运行：`bun run --cwd apps/admin typecheck`
预期：PASS

## 任务 6：整体验证与交付说明

**文件：**
- 修改：`E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/README.md`

- [ ] **步骤 1：补充第 2 迭代启动与验证说明**

- [ ] **步骤 2：运行全量验证**

运行：`bun run check`
预期：PASS

- [ ] **步骤 3：补充手工验收清单**

至少包含：
- web 登录
- web 刷新恢复
- web 登出
- admin 登录
- admin 守卫
- 非管理员拒绝

## 并行策略

- 主代理先独占完成任务 1 与任务 2 的共享契约、session 边界和路由骨架。
- `backend_implementer` 可在共享契约稳定后接手任务 2 的实现细化与测试补齐。
- `frontend_implementer` 可在 `packages/http-client` 接口稳定后并行处理任务 4、任务 5。
- `packages/schemas`、`packages/http-client`、`apps/server/src/modules/auth` 在未稳定前不得并行抢改。
