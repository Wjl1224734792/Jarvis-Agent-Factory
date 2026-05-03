# 注册密码后置与手机号换绑前置密码任务拆解

## TASK-001 共享契约调整

对应需求：`REQ-001`、`REQ-002`、`REQ-003`、`REQ-004`

- 移除注册完成 schema 中的 `password` 要求。
- 调整 Web 用户改密 schema：允许首次设置密码时省略 `currentPassword`。
- 当前用户资料 schema 增加 `hasPassword`。
- 普通资料更新 schema 移除 `phone`。

## TASK-002 服务端认证逻辑调整

对应需求：`REQ-001`、`REQ-002`

- 注册创建用户时允许 `passwordHash = null`。
- Web 用户首次设置密码时跳过旧密码校验且不撤销当前会话。
- 已设置密码用户修改密码时继续校验旧密码并撤销会话。

## TASK-003 服务端手机号换绑约束

对应需求：`REQ-003`、`REQ-004`

- 当前用户资料响应返回 `hasPassword`。
- 手机号换绑 request/confirm 在消耗短信能力前检查是否已设置密码。
- 资料更新不再处理手机号变更。
- OpenAPI 补充换绑接口 `403` 响应。

## TASK-004 Web 设置页调整

对应需求：`REQ-001`、`REQ-002`、`REQ-003`、`REQ-004`

- 注册页移除密码输入、强密码校验和密码提交。
- 设置页登录密码项按 `hasPassword` 展示首次设置或修改状态。
- 未设置密码时点击换绑手机号给出提示并阻止弹窗流程。
- 资料保存 payload 不再包含手机号。

## TASK-005 测试与回归

对应需求：`REQ-001`、`REQ-002`、`REQ-003`、`REQ-004`

- 更新 schema、HTTP client、Web helper 测试。
- 更新认证集成测试覆盖首次设置密码、改密撤销会话、手机号换绑前置密码。
- 运行类型检查、lint、测试和构建。
## Follow-up Tasks

- TASK-006 Update auth schemas and HTTP client password-change payloads with `smsRequestId` and `smsCode`.
- TASK-007 Verify password setup/change against the current user's bound phone SMS code on the server.
- TASK-008 Add settings-page captcha-before-SMS flow for password setup/change.
- TASK-009 Extend tests for missing/invalid SMS code, unchanged registration behavior, and password login with captcha.
