# 认证密码与内容来源声明执行计划

## Gate B / C

- 需求文档：`docs/requirements/2026-04-28-auth-password-source-requirements.md`
- 任务文档：`docs/tasks/2026-04-28-auth-password-source-tasks.md`
- 共享区域唯一 owner：主会话。
- 用户已授权不再澄清，按文档假设执行。

## Execution Packet 1：共享契约与 DB

- 需求：REQ-001..005
- 路径：`packages/schemas/**`、`packages/shared/**`、`packages/http-client/**`、`packages/db/**`
- 操作：新增强密码 schema、Web 密码登录/改密 schema、Admin 登录验证码字段、帖子来源 schema、posts 表来源字段和 migration。
- 禁止：改 env/CORS/OpenAPI/上传策略。

## Execution Packet 2：Server

- 需求：REQ-001..005
- 路径：`apps/server/src/modules/auth/**`、`apps/server/src/modules/posts/**`
- 操作：注册写入密码哈希、密码登录校验验证码、普通用户改密并撤销会话、Admin 登录验证码、帖子来源持久化和序列化。
- 禁止：新增第三方风控服务或改变短信登录语义。

## Execution Packet 3：Web

- 需求：REQ-001、REQ-002、REQ-004、REQ-005
- 路径：`apps/web/src/features/auth/**`、`apps/web/src/routes/**`
- 操作：登录页短信/密码切换、注册密码字段、设置页改密表单、文章/动态来源输入与展示。
- 禁止：页面内散落 fetch 细节。

## Execution Packet 4：Admin

- 需求：REQ-003、REQ-004、REQ-005
- 路径：`apps/admin/src/features/**`、`apps/admin/src/lib/**`
- 操作：Admin 登录图形验证码、改密强策略、官方文章来源编辑和审核/列表展示。
- 禁止：绕过共享 client 或重复定义 API 结构。

## Execution Packet 5：验证

- 命令：`bun run db:generate`、针对性测试、`bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`
- 如基础设施缺失导致 DB 迁移或集成测试无法执行，记录具体错误，不宣称通过。
