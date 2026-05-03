# 阶段一/二风险收口任务拆分

## 1. 需求文档路径

- [PRD V1.0](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/project/PRDs/%E9%A3%9E%E5%8A%A0%E7%BD%91%20-%20%E4%BA%A7%E5%93%81%E9%9C%80%E6%B1%82%E6%96%87%E6%A1%A3%20(PRD)%20V1.0.md)
- [MVP 第1-第6迭代清单](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/project/mvp/MVP%20%E7%AC%AC1-%E7%AC%AC6%E8%BF%AD%E4%BB%A3%E6%B8%85%E5%8D%95.md)
- [MVP Roadmap](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/project/mvp/mvp-roadmap.md)
- [MVP 第2迭代账号与身份体系任务拆分](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/tasks/2026-03-22-mvp2-auth-identity-tasks.md)

## 2. 任务概览

本轮只收口第 1、2 阶段的底座风险，不展开 `storage`、OpenAPI 或第 3 阶段页面。

固定范围如下：

- 新增 `packages/db`
- 引入 Drizzle + PostgreSQL 基线
- 落最小表 `users`、`sessions`、`aircraft_categories`、`brands`、`aircraft_models`
- 补 migration / seed
- 将第 2 迭代 `auth repo` 从内存切换到数据库

本轮目标不是增加新的业务页面，而是把登录态、用户数据与后续机型库依赖的持久化底座补稳，避免第 3 阶段再回头改基础结构。

## 3. 任务分解列表

| 任务 ID | 名称 | 类型 | 优先级 | 完成标准 | 最小验证 |
|---|---|---|---|---|---|
| T1 | `packages/db` 基线与连接配置 | 直接开发 | P0 | 新增 `packages/db` 包，具备 Drizzle 数据源配置、连接封装、基础导出和环境变量约定，`apps/server` 可引用而不直接散落数据库初始化 | `bun run --cwd packages/db typecheck` 通过 |
| T2 | 数据模型、迁移与 seed | DDD + TDD | P0 | 落地 `users`、`sessions`、`aircraft_categories`、`brands`、`aircraft_models` 的最小表结构、外键/唯一约束、迁移脚本和 seed 脚本，表字段能支撑第 2 迭代 auth 持久化和第 3 迭代机型库 | `bun run --cwd packages/db test` 或迁移/seed 验证通过；本地 PostgreSQL 可成功建表并回填 seed |
| T3 | auth 持久化仓储切换 | DDD + TDD | P0 | `apps/server/src/modules/auth` 从内存仓储切换到数据库仓储，会话、验证码、用户创建/查找、管理员账号校验均通过 DB 完成，外部路由契约保持不变 | `bun run --cwd apps/server test` 通过；`/auth/me`、`/auth/logout`、管理员登录路径可冒烟 |
| T4 | server 回归测试与边界校验 | TDD | P0 | 为数据库版 auth 增加回归测试，覆盖登录、注册、退出、`/auth/me`、管理员拒绝/通过、重启后持久化预期等关键路径，防止内存版行为回流 | `bun run --cwd apps/server test` 通过 |
| T5 | 启动说明与风险收口文档 | 直接开发 | P1 | 更新根 README、环境变量说明和数据库启动步骤，明确 PostgreSQL、迁移、seed 和 auth 持久化的验证方式，便于后续第 3 阶段直接接手 | `bun run check` 通过，文档可直接交付 |

## 4. DDD 分类

### 需要 DDD 的任务

- T2 数据模型、迁移与 seed
- T3 auth 持久化仓储切换

原因：

- `users`、`sessions`、`brands`、`aircraft_categories`、`aircraft_models` 已经不是单纯的文件/配置问题，而是后续业务可以稳定依赖的持久化边界。
- `auth` 的登录态、会话和管理员校验属于集中状态与权限边界，切换到数据库后需要明确聚合/仓储边界。

### 不需要 DDD 的任务

- T1 `packages/db` 基线与连接配置
- T4 server 回归测试与边界校验
- T5 启动说明与风险收口文档

## 5. TDD 与直接开发分类

### 必须 TDD

- T2 数据模型、迁移与 seed
- T3 auth 持久化仓储切换
- T4 server 回归测试与边界校验

### 可以直接开发

- T1 `packages/db` 基线与连接配置
- T5 启动说明与风险收口文档

## 6. 风险任务

- T1 是共享入口，`packages/db` 一旦设计不稳，后续所有持久化访问都会重复修。
- T2 直接决定第 2 阶段 auth 和第 3 阶段机型库能否在同一套表结构上继续推进，表字段和约束不能随意变。
- T3 最容易把内存逻辑和数据库逻辑混在一起，导致“看起来通过，重启就失效”的假完成。
- T4 如果没有覆盖重启与会话失效场景，仍然会把风险留给后续联调。
- T5 如果文档不补，后续第 3 阶段很难快速进入并行实现。

## 7. 文件所有权和共享路径提醒

以下区域必须单线程收敛，不要并行抢改：

- 根级 `package.json`、`bunfig.toml`、`tsconfig*.json`
- `packages/db`
- `packages/schemas`
- `apps/server/src/modules/auth`
- `apps/server/src/modules/users`
- `apps/server/src/modules/session`
- `apps/server/src/routes`

建议边界如下：

- `packages/db` 负责数据库连接、schema、migration、seed 和基础导出，不承载业务 service。
- `packages/schemas` 只放契约和类型，不放数据库实现。
- `apps/server` 只通过 `packages/db` 访问持久化，不直接分散初始化和 SQL。
- `apps/web`、`apps/admin` 不直接接触数据库层。

## 8. 推荐交付顺序

1. 先做 T1，把 `packages/db` 和数据库连接入口固定下来。
2. 再做 T2，把表结构、迁移和 seed 收口。
3. 然后做 T3，把 auth 仓储从内存切到数据库。
4. 接着做 T4，把关键回归测试补齐。
5. 最后做 T5，把启动和验证说明补到 README。

## 9. 推荐的下一步

把这份任务拆分交给 `planner`，并在实现阶段继续保持 `packages/db`、`packages/schemas` 和 `apps/server/src/modules/auth` 的单线程收敛。
