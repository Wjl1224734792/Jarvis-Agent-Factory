# MVP 第2迭代账号与身份体系设计

**工作区：** `E:\CodeStore\feijia\.worktrees\mvp2-auth-identity`

## 1. 目标

在现有 MVP 第1迭代骨架上补齐统一身份底座，覆盖：

- `web` 手机号 + 图形验证码 + 本地 mock 短信验证码登录/注册
- `admin` 账号密码登录
- `HttpOnly Cookie + 服务端校验` 会话恢复
- `/me`、退出登录、受保护接口、管理员校验
- `web` 顶部用户入口与个人中心最小入口

## 2. 范围

- `packages/schemas`：认证、会话、用户摘要、角色、验证码、错误响应契约
- `packages/http-client`：认证相关调用与统一错误映射
- `apps/server`：认证模块、会话模块、权限中间件、mock 验证码与 mock 短信码逻辑
- `apps/web`：手机号验证码登录/注册、身份恢复、退出、个人中心最小入口
- `apps/admin`：账号密码登录、管理员身份恢复、退出、受保护首页守卫

## 3. 非范围

- 真实短信服务商接入
- 找回密码、修改密码、账号注销
- 完整 RBAC、后台用户管理、审核流
- 数据库存储与跨服务持久化
- 第三方登录

## 4. 架构方案

### 4.1 服务端

在 `apps/server/src/modules/` 下新增：

- `auth/`：图形验证码、短信验证码申请、web 登录/注册、admin 登录、登出、`/me`
- `session/`：session 创建、读取、删除、Cookie 封装
- `users/`：最小用户摘要与管理员账号读取

服务端使用内存存储作为当前迭代最小实现：

- `captchaChallenges`
- `smsChallenges`
- `sessions`
- `users`
- `admins`

这样可以先验证身份链路和前后端契约，不提前引入数据库范围。

### 4.2 会话模型

- 会话 Cookie 名称统一，例如 `feijia_session`
- Cookie 使用 `HttpOnly`
- `/auth/me` 根据 session 解析当前用户
- `/auth/admin/me` 在已有 session 基础上再校验管理员角色
- `/auth/logout` 删除 session 并清除 Cookie

### 4.3 Web 登录流

1. 获取图形验证码
2. 输入手机号和图形验证码申请短信码
3. 服务端返回 mock 短信码（仅开发态）
4. 输入短信码完成登录/注册
5. 服务端写入 Cookie
6. 前端调用 `/auth/me` 恢复身份

### 4.4 Admin 登录流

1. 输入账号密码
2. 服务端校验管理员账号
3. 写入 Cookie
4. 前端调用 `/auth/admin/me` 恢复管理员身份
5. 受保护页面未登录时跳转登录页

## 5. 前端状态策略

- `web` 和 `admin` 仅保留轻量 auth store
- store 只保存：
  - 当前用户摘要
  - 当前管理员摘要
  - 是否正在恢复身份
  - 是否已认证
- 真实身份来源始终以 `/me` 接口为准

## 6. 契约设计原则

- 所有请求/响应结构集中放在 `packages/schemas`
- `packages/http-client` 只做 transport 与错误映射，不承载业务规则
- `web` 和 `admin` 不直接依赖 `apps/server` 内部结构

## 7. 风险与约束

- 本轮使用内存存储，服务重启后 session 和验证码会失效
- mock 短信码必须明确标记为开发专用，避免与真实实现混淆
- 共享认证契约、session 结构、Cookie 策略必须由主代理单线程收敛
- `admin` 与 `web` 共用身份底座，但登录入口不同，不能混成一套页面逻辑

## 8. 完成标准

- `web` 用户可完成验证码登录/注册、刷新后恢复身份、退出登录
- `admin` 用户可完成账号密码登录、刷新后恢复身份、退出登录
- `server` 能稳定识别普通用户与管理员
- 受保护接口能区分未登录、普通用户、管理员
- `bun run check` 在 worktree 中通过
