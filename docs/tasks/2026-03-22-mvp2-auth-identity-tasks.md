# MVP 第2迭代账号与身份体系任务拆分

## 1. 需求文档路径

- [PRD V1.0](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/project/PRDs/%E9%A3%9E%E5%8A%A0%E7%BD%91%20-%20%E4%BA%A7%E5%93%81%E9%9C%80%E6%B1%82%E6%96%87%E6%A1%A3%20(PRD)%20V1.0.md)
- [MVP 第1-第6迭代清单](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/project/mvp/MVP%20%E7%AC%AC1-%E7%AC%AC6%E8%BF%AD%E4%BB%A3%E6%B8%85%E5%8D%95.md)
- [MVP 第1迭代基础骨架任务拆分](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/tasks/2026-03-22-mvp1-basis-slice-tasks.md)

## 2. 任务概览

本轮只做账号与身份体系，不扩展到机型库、评分、发帖、榜单或消息。

已确认的实现边界：

- `web` 采用手机号 + 图形验证码 + 本地 mock 短信验证码
- `admin` 采用账号密码登录
- 会话采用 `HttpOnly Cookie + 服务端校验`
- 范围覆盖 `web + admin + server`
- 共享契约、会话模型、`auth` schema 必须单线程收敛，不并行抢改

本轮目标不是“做全量账号平台”，而是先把登录、注册、退出、身份恢复、受保护接口和管理员校验打通，给后续业务模块提供统一身份底座。

## 3. 任务分解列表

| 任务 ID | 名称 | 类型 | 优先级 | 完成标准 | 最小验证 |
|---|---|---|---|---|---|
| T1 | 共享认证契约与数据模型 | TDD + 契约设计 | P0 | `packages/schemas` 输出登录、注册、验证码、会话、用户摘要、角色、错误响应的稳定 schema 与类型出口，前后端统一引用 | `bun run test` 中契约测试通过 |
| T2 | 服务端认证模块 | DDD + TDD | P0 | `apps/server` 具备 `auth`、`users`、`session` 的最小模块边界，支持验证码申请、手机号登录/注册、账号密码登录、`/auth/me`、`/auth/logout`、管理员校验 | `bun run --cwd apps/server test` 通过，且 `/auth/me`、`/auth/logout`、管理员登录路径可冒烟 |
| T3 | 会话与权限中间件 | DDD + TDD | P0 | 服务端具备基于 Cookie 的会话解析、用户校验、管理员校验、未登录/无权限统一错误返回 | 会话测试覆盖未登录、已登录、管理员拒绝/通过 |
| T4 | Web 登录与身份恢复 | 直接开发 + 冒烟 | P0 | `apps/web` 具备登录/注册入口、图形验证码、mock 短信验证码、退出登录、身份恢复、顶部用户入口和个人中心最小入口 | `bun run --cwd apps/web typecheck` 通过，浏览器可完成登录后刷新恢复 |
| T5 | Admin 登录与守卫 | 直接开发 + 冒烟 | P0 | `apps/admin` 具备独立账号密码登录页、登录态恢复、退出登录和后台首页守卫 | `bun run --cwd apps/admin typecheck` 通过，未登录访问受保护页会跳转登录页 |
| T6 | 统一请求层认证接口 | TDD + 直接开发 | P0 | `packages/http-client` 提供登录、注册、验证码、`me`、`logout`、管理员登录相关调用封装和统一错误映射 | 请求层测试覆盖路径、payload 与错误映射 |
| T7 | 前端身份状态壳 | 直接开发 | P1 | `web` 和 `admin` 仅保存轻量身份态与加载态，真实身份来源始终以服务端 `/me` 为准 | 前端类型检查通过，身份态更新不影响路由 |
| T8 | 迭代交付说明 | 直接开发 | P1 | 启动方式、环境变量、接口入口、登录流和验证方式记录清楚，便于后续接手 | `bun run check` 通过，文档可直接给 planner 继续拆分 |

## 4. DDD 分类

### 需要 DDD 的任务

- T2 服务端认证模块
- T3 会话与权限中间件

原因：

- 登录态、会话、角色、权限校验集中在同一边界
- `web` 与 `admin` 共用会话底座，但登录入口和权限规则不同
- 未登录、已登录、管理员、普通用户属于明确的状态和权限分层

### 不需要 DDD 的任务

- T1 共享认证契约与数据模型
- T4 Web 登录与身份恢复
- T5 Admin 登录与守卫
- T6 统一请求层认证接口
- T7 前端身份状态壳
- T8 迭代交付说明

## 5. TDD 与直接开发分类

### 必须 TDD

- T1 共享认证契约与数据模型
- T2 服务端认证模块
- T3 会话与权限中间件
- T6 统一请求层认证接口

### 可以直接开发

- T4 Web 登录与身份恢复
- T5 Admin 登录与守卫
- T7 前端身份状态壳
- T8 迭代交付说明

## 6. 风险任务

- T1 是最高风险共享区，任何字段命名、角色枚举或错误结构不稳定，都会同步影响 `web`、`admin` 和 `server`
- T2 涉及登录、注册、验证码和会话写入，最容易把 mock 逻辑和真实逻辑混在一起
- T3 直接决定权限边界，`HttpOnly Cookie`、`me`、`logout`、管理员校验一旦混乱，后续所有受保护接口都会返工
- T4 和 T5 依赖前端路由守卫，若先做页面再定契约，容易出现重复登录态和状态漂移
- T6 如果把错误映射做得过重，会把请求层变成第二套业务逻辑

## 7. 文件所有权和共享路径提醒

以下区域必须单线程收敛，不能并行抢改：

- 根级 `package.json`、`bunfig.toml`、`tsconfig*.json`
- `packages/shared`
- `packages/schemas`
- `packages/http-client`
- `apps/server/src/modules/auth`
- `apps/server/src/modules/users`
- `apps/server/src/modules/session`
- `apps/server/src/middlewares`

前后端边界建议如下：

- `apps/server` 只拥有认证、会话、权限和用户摘要，不向前端泄露内部存储细节
- `apps/web` 只通过 `packages/http-client` 调用认证接口，不直接依赖服务端内部模块
- `apps/admin` 同样只通过 `packages/http-client` 调用认证接口，不直连 `apps/server` 内部实现
- `packages/schemas` 只放契约与类型，不放实现逻辑

## 8. 推荐交付顺序

1. 先定 T1，把共享认证契约和错误结构收敛
2. 再做 T3，把会话解析、权限中间件和错误返回固定
3. 然后做 T2，把服务端认证模块、验证码和登录/退出闭环补齐
4. 接着做 T6，把 `http-client` 的认证接口统一起来
5. 再做 T4 和 T5，把 `web`、`admin` 的登录入口和守卫接上
6. 最后补 T7 和 T8，整理前端身份壳和交付说明

## 9. 推荐的下一步

把这份任务拆分交给 `planner`，并把实现任务分发给 `backend_implementer` 和 `frontend_implementer`，但保留 T1、T3、T6 的单线程收敛权。
