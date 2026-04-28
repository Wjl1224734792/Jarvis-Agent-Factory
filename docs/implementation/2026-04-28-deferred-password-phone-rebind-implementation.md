# 注册密码后置与手机号换绑前置密码实现记录

## 实现摘要

- 注册完成请求不再携带或要求密码，创建用户时允许 `password_hash` 为空。
- 当前用户资料响应增加 `hasPassword`，用于设置页展示账号安全状态。
- Web 用户改密接口支持首次设置密码：无旧密码时只校验新密码策略，不撤销当前会话。
- 已有密码用户改密仍校验当前密码，并撤销旧会话。
- 手机号换绑 request/confirm 均要求账号已设置密码，未设置时返回 `PASSWORD_REQUIRED`。
- 普通资料更新不再提交或处理手机号字段，手机号变更收束到专用换绑流程。
- Web 注册页移除密码输入；设置页根据 `hasPassword` 展示“设置密码”或“修改密码”，未设置密码时阻止手机号换绑并提示先设置密码。

## 已验证

- schema / http-client / web helper 关键测试通过。
- server auth / OpenAPI 集成测试通过。
- `bun run typecheck` 通过。
## Follow-up Implementation

- User password setup/change now requires `smsRequestId` and `smsCode`.
- Server validates the SMS code against the current user's bound phone before updating the password.
- Server validates the bound-phone SMS proof before checking the existing password, so an invalid SMS proof cannot be used to probe the current password.
- Settings page now requests a captcha before sending the password-change SMS code.
- Password login and registration behavior remain unchanged.
