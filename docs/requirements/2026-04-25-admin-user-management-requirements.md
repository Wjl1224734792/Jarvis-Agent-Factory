# Admin 用户管理全链路需求

## 需求摘要

为管理端新增用户管理能力，覆盖用户列表、检索、详情、封禁、解封，并让封禁状态贯穿登录、刷新、当前用户、受保护接口和后台管理入口。该批次先完成用户管理闭环，后续再按 server、web、admin 分批审查优化。

## 关键假设

- 不新增独立 admin 表，继续以 `users.role = 'admin'` 表示管理员。
- 用户状态落在 `users` 表，最小状态集为 `active` / `banned`。
- 封禁立即撤销该用户所有现存会话，包括 web、app、admin。
- 管理员不能在后台封禁自己，也不能封禁其它管理员账号；管理员账号安全另走更严格流程。
- 未设置头像时继续保持 `avatarUrl = null`，由前端 fallback 展示。

## 目标与成功标准

- 管理员可以在后台按关键词、状态、角色分页查看用户。
- 管理员可以打开用户详情，看到基础资料、状态、最近会话和内容计数摘要。
- 管理员可以输入原因封禁普通用户，并可解封。
- 被封禁用户无法登录、刷新会话或访问受保护接口；封禁后既有会话立即失效。
- 共享契约集中在 `packages/schemas`、`packages/shared`、`packages/http-client`，admin 页面不散落请求细节。
- 关键行为有 schema、shared routes、http-client、server、admin helper 测试。

## 范围内

- `packages/db` 用户表新增状态与封禁元数据字段及迁移。
- `packages/schemas` 新增 admin users 请求/响应契约，并补 `USER_BANNED` 错误码。
- `packages/shared` 新增 admin users API 路由常量。
- `packages/http-client` 新增 admin users client 方法。
- `apps/server` 新增 users repo / route，并扩展 users service 与 auth 封禁校验。
- `apps/admin` 新增用户管理路由、导航、页面和 helper。

## 范围外

- 不实现管理员创建、升降权、重置密码、批量封禁、导出、审计流水。
- 不修改 CORS、OpenAPI 默认开关、上传策略、短信 provider 或生产部署配置。
- 不恢复 `apps/mobiles`，不扩展小程序/App。
- 不做全仓审查优化的代码改动；这些排入后续 server → web → admin 批次。

## 风险与控制

- 权限风险：封禁操作必须要求 `requireAdmin`，且禁止封禁自己和管理员。
- 会话风险：封禁必须调用 `authRepo.revokeUserSessions`，避免旧 cookie / token 继续可用。
- 契约漂移风险：路由、schema、client、server、admin 一起修改，测试覆盖 URL 与方法。
- DB 风险：新增字段带默认值，避免已有 seed 与测试数据缺字段。

## Gate A 检查

- 摘要、目标、范围、模块、风险与已收敛假设齐全。
- 共享区域唯一责任方在计划中指定。
- 用户已明确要求“不用询问”，因此关键假设由主会话收敛并留痕。
