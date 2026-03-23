# 第 2 迭代账号与身份体系设计

**日期：** 2026-03-22
**工作区：** `E:\CodeStore\feijia\.worktrees\mvp2-auth-identity`
**对应迭代：** MVP 第 2 迭代

## 1. 目标

在第 1 迭代基础骨架上落地最小可用的账号与身份体系，让主站用户可以登录进入系统，让后台管理员可以独立登录，并让后续需要身份的动作都能接入统一会话能力。

## 2. 已确认决策

- `web` 使用手机号登录。
- `web` 登录链路包含图形验证码与短信验证码，但短信和图形验证码先走本地开发版。
- `admin` 使用账号密码登录，不复用手机号验证码方案。
- 会话采用 `HttpOnly Cookie + 服务端校验`。
- 本轮实现需要使用 `spawn` 分工完成。
- 本轮在 `.worktrees/` 隔离工作区内推进。

## 3. 范围

### 3.1 `web`

- 手机号 + 图形验证码 + 本地 mock 短信验证码登录/注册主链路
- 登录态持久化与刷新恢复
- 顶部用户入口
- 退出登录
- 个人中心最小入口
- 至少一个需要登录的受保护页面或受保护请求示例

### 3.2 `admin`

- 独立登录页
- 账号密码登录
- 管理员身份校验
- 登录态恢复
- 退出登录
- 后台首页守卫

### 3.3 `server`

- `auth` 模块
- `users` 最小资料读取
- session cookie 写入与校验
- `web` 登录与 `admin` 登录能力
- `me` / `admin me` 接口
- 至少一个受保护接口和一个管理员受保护接口

### 3.4 共享层

- `packages/schemas` 增加认证相关 schema 与接口契约
- `packages/http-client` 增加认证调用封装
- `packages/shared` 增加认证相关常量与路由常量

## 4. 非范围

- 不接真实短信服务商
- 不接真实图形验证码服务
- 不做找回密码
- 不做手机号换绑
- 不做复杂 RBAC，仅区分普通用户与管理员
- 不做后台用户管理功能
- 不做第三方登录

## 5. 会话与安全模型

### 5.1 `web`

- 登录成功后写入 `HttpOnly Cookie`
- 前端不直接持有敏感 token
- 页面刷新后通过 `/auth/me` 恢复身份

### 5.2 `admin`

- 登录成功后写入后台会话 cookie
- 所有后台受保护接口必须附带管理员身份判断
- 非管理员身份访问后台接口返回统一错误

### 5.3 开发期验证码策略

- 图形验证码：服务端生成 challenge，前端展示最小可读文本或 SVG
- 短信验证码：服务端生成一次性验证码并通过 mock 通道返回开发可见值
- 所有开发期 mock 能力应通过服务抽象封装，后续可替换真实服务

## 6. 服务端模块建议

## 6.1 `apps/server/src/modules/auth`

- `auth.route.ts`
- `auth.schema.ts`
- `auth.service.ts`
- `auth.repo.ts`
- `auth.session.ts`
- `auth.middleware.ts`

## 6.2 `apps/server/src/modules/users`

- `users.route.ts`
- `users.schema.ts`
- `users.service.ts`

## 7. 前端落点

### 7.1 `apps/web`

- 登录页或登录弹层
- 顶部导航用户入口
- 个人中心页
- 鉴权 store 与 `me` 恢复逻辑
- 受保护路由包装

### 7.2 `apps/admin`

- 登录页
- 后台首页
- 管理员路由守卫
- 鉴权 store 与 `me` 恢复逻辑

## 8. API 轮廓

### 8.1 `web` 相关

- `POST /auth/captcha/challenge`
- `POST /auth/sms/request`
- `POST /auth/web/login`
- `POST /auth/logout`
- `GET /auth/me`

### 8.2 `admin` 相关

- `POST /auth/admin/login`
- `POST /auth/admin/logout`
- `GET /auth/admin/me`

### 8.3 受保护示例

- `GET /auth/protected/ping`
- `GET /auth/admin/protected/ping`

## 9. 数据模型最小集合

- `users`
  - `id`
  - `phone`
  - `displayName`
  - `role`
  - `passwordHash`（仅管理员账号需要）
  - `createdAt`
- `sessions`
  - `id`
  - `userId`
  - `scope`
  - `token`
  - `expiresAt`
- `captchaChallenges`
  - `id`
  - `code`
  - `expiresAt`
- `smsVerificationCodes`
  - `id`
  - `phone`
  - `code`
  - `expiresAt`

本轮允许先以内存仓储或轻量开发仓储实现，只要边界可替换。

## 10. 错误处理

- 所有认证相关接口返回统一错误结构
- 验证码错误、验证码过期、未登录、权限不足、账号密码错误分别有稳定错误码
- 前端不直接拼接业务错误文本，优先读取共享错误契约

## 11. 测试策略

- `packages/schemas`：认证 schema 测试
- `apps/server`：登录、会话、登出、`me`、管理员拒绝/通过测试
- `web/admin`：至少完成类型检查、路由守卫与最小冒烟验证

## 12. 风险

- 如果共享认证契约先天不稳，前后端会来回返工
- 如果把 mock 验证码逻辑写死在路由层，后续接真实服务会拆得很痛
- 如果 `web` 和 `admin` 会话边界不清，后续会出现身份串用风险
- 如果本轮同时展开过多页面，会偏离“先把身份体系接稳”的目标
