# 认证密码与内容来源声明任务拆解

| 任务 ID | 需求 | 名称 | 类型 | 优先级 | 验收 |
|---|---|---|---|---|---|
| TASK-001 | REQ-001..004 | 共享认证契约 | 共享 | P0 | auth schema、route 常量、http-client 方法和错误码同步 |
| TASK-002 | REQ-005 | 共享帖子来源契约 | 共享 | P0 | posts schema 支持来源输入和响应 |
| TASK-003 | REQ-005 | DB 来源字段与迁移 | 数据 | P0 | posts 表新增 `source_label`、`source_url`，迁移生成 |
| TASK-004 | REQ-001..004 | Server 认证能力 | 后端 | P0 | 注册写密码、Web 密码登录、Admin 登录验证码、普通用户改密 |
| TASK-005 | REQ-005 | Server 帖子来源能力 | 后端 | P0 | create/update/admin/list/detail 序列化来源 |
| TASK-006 | REQ-001..004 | Web 认证 UI | 前端 | P0 | 登录模式切换、注册密码、设置页改密 |
| TASK-007 | REQ-005 | Web 来源 UI | 前端 | P0 | 发布/编辑文章和动态可填来源，feed/detail 显示 |
| TASK-008 | REQ-003..005 | Admin UI | 前端 | P0 | 登录验证码、改密强策略、官方文章来源编辑/展示、审核展示 |
| TASK-009 | REQ-001..005 | 验证 | 验证 | P0 | 运行针对性测试和根级 lint/typecheck/test/build |

## 风险

- TASK-001..003 是共享区域，只由主会话串行修改。
- TASK-004 涉及登录与会话撤销，需避免破坏短信登录和现有 Admin 改密。
- TASK-006/008 涉及 UI 表单，必须避免在页面内重复定义应由 schema/client 承担的请求结构。

## 测试策略

- schema 单测覆盖密码策略和来源契约。
- 后端集成/单测如现有入口允许，覆盖密码登录验证码和改密关键分支。
- 前端 helper 可用现有测试覆盖，UI 通过 typecheck/build 兜底。
