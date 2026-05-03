# Admin 用户管理任务拆解

## 任务列表

| 任务 ID | 名称 | 类型 | 优先级 | 完成标准 | DDD | 测试策略 | 文件所有权 |
|---|---|---|---|---|---|---|---|
| TASK-001 | 共享契约与路由 | 共享 | P0 | schema、route 常量、http-client 方法与测试齐全 | 需要 | TDD | `packages/schemas`、`packages/shared`、`packages/http-client` |
| TASK-002 | DB 用户状态字段 | 数据 | P0 | users 表有状态、封禁字段、迁移与类型可用 | 需要 | test_after | `packages/db` |
| TASK-003 | Server 用户管理 API | 后端 | P0 | admin list/detail/ban/unban 可用，非 admin 拒绝 | 需要 | TDD | `apps/server/src/modules/users/**` |
| TASK-004 | Auth 封禁链路 | 后端 | P0 | 封禁用户登录/刷新/me/保护接口失败，封禁撤销会话 | 需要 | TDD | `apps/server/src/modules/auth/**` |
| TASK-005 | Admin 用户管理页面 | 前端 | P0 | 新导航、新路由、列表、详情、封禁/解封交互完成 | 需要 | TDD | `apps/admin/src/features/users/**`、admin 路由/nav |
| TASK-006 | 回归与质量门 | 验证 | P0 | 相关测试、lint、typecheck、test、build 结果记录 | 不需要 | test_after | 不改文件 |

## 风险任务

- TASK-002、TASK-004 改动权限与数据库，是本批次最高风险。
- TASK-001 触碰共享契约，只能由一个 owner 串行修改。
- TASK-005 只能消费共享 client，不在页面直接写 fetch。

## 推荐顺序

1. 先写 schema/shared/client/server/admin helper 红灯测试。
2. 实现共享契约与 DB schema / migration。
3. 实现 server API 与 auth 封禁链路。
4. 实现 admin 页面、路由和导航。
5. 运行针对性测试与根级质量门。
