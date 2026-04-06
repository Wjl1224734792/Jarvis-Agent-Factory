# 登录验证码重发、短信错误修复与发布菜单中文化执行计划

## 当前轮次目标

以最小改动解决登录验证码重发、短信 500 和发布菜单英文文案问题，并在收尾阶段重新推模拟数据与执行全量验证。

## Execution Packet

### task_id
TASK-001 / TASK-002 / TASK-003 / TASK-004

### objective
修复登录相关错误路径并完善发布入口交互。

### in_scope
- `/auth/sms/request` 业务错误映射
- 登录页验证码重新发送逻辑
- 发布下拉菜单中文化
- 模拟数据推库
- 全量验证、提交、推送

### out_of_scope
- 全站验证码流程重构
- 非当前发布入口的大范围文案调整
- 小程序或 App 仓库改动

### allowed_paths
- `apps/server/src/modules/auth/*`
- `apps/server/tests/*`
- `apps/web/src/features/auth/*`
- `apps/web/src/routes/*`
- `packages/db/*`
- `docs/*`

### forbidden_paths
- 非本轮需求相关的共享协议大改
- 独立客户端仓库

### test_strategy
test_after

### acceptance_criteria
- 短信接口不再因限流等业务错误返回 500
- 登录页支持重新发送验证码
- 发布下拉菜单为中文
- 模拟数据成功推入数据库
- `bun run check` 通过
