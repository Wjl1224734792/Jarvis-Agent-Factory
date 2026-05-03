# 登录验证码重发、短信错误修复与发布菜单中文化任务清单

## TASK-001

- task_name：修复短信发送业务错误映射
- type：后端
- priority：P0
- acceptance_criteria：
  - `/auth/sms/request` 在频率限制等可预期错误场景下不再返回 500
  - 对应接口维持明确的 4xx 状态码
- test_strategy：test_after
- 文件所有权：
  - `apps/server/src/modules/auth/*`
  - `apps/server/tests/auth.test.ts`

## TASK-002

- task_name：补登录页重新发送验证码逻辑
- type：前端
- priority：P0
- acceptance_criteria：
  - 登录页支持重新发送短信验证码
  - 发送后有倒计时或防抖逻辑
  - 重新发送前会刷新图形验证码，避免使用已消费 challenge
- test_strategy：test_after
- 文件所有权：
  - `apps/web/src/features/auth/login-page.tsx`

## TASK-003

- task_name：发布下拉菜单中文化
- type：前端
- priority：P1
- acceptance_criteria：
  - 发布入口下拉文案全部改为中文
- test_strategy：test_after
- 文件所有权：
  - `apps/web/src/features/auth/web-layout.tsx`
  - 相关发布页面中与该入口直接关联的文案文件

## TASK-004

- task_name：模拟数据重新推库并完成验证
- type：验证
- priority：P0
- acceptance_criteria：
  - 模拟数据成功推入数据库
  - `bun run check` 通过
- test_strategy：manual_only
- 文件所有权：
  - 根目录脚本
  - `packages/db`
