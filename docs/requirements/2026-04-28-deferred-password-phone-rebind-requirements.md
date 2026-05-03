# 注册密码后置与手机号换绑前置密码需求

## 摘要

本次变更是对 `2026-04-28-auth-password-source-requirements.md` 中注册密码策略的产品口径修正：注册阶段不再要求用户设置密码，用户登录后在设置页完成首次密码设置。手机号换绑属于高风险账号操作，必须在账号已设置登录密码后才允许发起。

## 假设

- 注册仍通过手机号短信完成，注册资料只保留昵称、头像等资料字段。
- 首次设置密码不强制退出当前会话；已有密码的用户修改密码后继续撤销旧会话。
- `hasPassword` 只暴露在当前用户资料接口，不进入公开用户摘要。
- 手机号变更只允许走专用换绑流程，不再通过普通资料更新接口承载。

## REQ-001 注册不设置密码

Web 和 App 注册完成请求不再要求 `password` 字段。新注册用户的 `password_hash` 允许为空，仍可通过短信登录进入站内。

验收标准：
- 注册完成 payload 省略 `password` 时通过。
- 新注册用户初始 `password_hash` 为 `null`。
- 未设置密码用户不能通过密码登录。

## REQ-002 设置页支持首次设置与修改密码

设置页的登录密码项根据 `hasPassword` 展示不同状态。未设置密码时提示设置密码，提交只需要新密码和确认密码；已设置密码时要求当前密码、新密码和确认密码。

验收标准：
- 未设置密码用户可在设置页设置符合策略的新密码。
- 首次设置密码后当前会话保持有效。
- 已设置密码用户修改密码必须校验当前密码，成功后撤销旧会话并要求重新登录。

## REQ-003 手机号换绑必须先设置密码

用户换绑手机号前必须已有登录密码。未设置密码时，前端提示先设置密码，服务端拒绝发起和确认换绑。

验收标准：
- `GET /users/me/profile` 返回 `hasPassword`。
- 未设置密码用户请求手机号换绑返回 `PASSWORD_REQUIRED`。
- 已设置密码用户可继续通过图形验证码、短信验证码完成换绑。

## REQ-004 资料更新不承载手机号换绑

普通资料更新接口不再提交或处理手机号字段，手机号变更只走换绑流程。

验收标准：
- Web 设置页保存普通资料时不提交 `phone`。
- 资料更新 schema 不再包含 `phone`。
- 既有手机号展示仍可从当前用户资料读取。
## Follow-up: Password SMS Verification

- REQ-005 Web user password setup/change must require an SMS verification code for the current bound phone.
- REQ-006 Sending the password-change SMS code must require a captcha challenge first.
- REQ-007 Existing behavior remains: registration does not require a password; SMS login remains available; password login remains available only for users with a password and must pass captcha.
