# 2026-04-09 分阶段项目审查任务

## TASK-AUDIT-001 | 建立本轮审查基线与编排文档

- 类型：共享 / 审查流程
- 优先级：高
- 完成标准：补齐本轮 requirements / tasks / plan 文档，明确三阶段顺序、共享边界、验证要求和提交推送节奏。
- DDD 分类：supporting
- test_strategy：manual_only
- 风险任务：否
- 文件所有权 / 共享路径提醒：仅主会话维护 `docs/**`

## TASK-AUDIT-002 | Web 阶段审查与修复

- 类型：前端
- 优先级：高
- 完成标准：对 `apps/web` 形成独立审查报告，修复一批高置信度健壮性/性能/架构问题，补充必要测试并完成浏览器自动化验证。
- DDD 分类：application
- test_strategy：test_after
- 风险任务：是
- 文件所有权 / 共享路径提醒：如触及 `packages/shared` / `packages/http-client` 仅允许主会话统一修改

## TASK-AUDIT-003 | Admin 阶段审查与修复

- 类型：前端
- 优先级：高
- 完成标准：对 `apps/admin` 形成独立审查报告，修复高置信度问题并完成针对性测试验证，阶段结束后提交推送。
- DDD 分类：application
- test_strategy：test_after
- 风险任务：是
- 文件所有权 / 共享路径提醒：后台权限、共享路由常量、共享 API 契约不得绕过 `packages/*`

## TASK-AUDIT-004 | Server 阶段审查与修复

- 类型：后端
- 优先级：高
- 完成标准：对 `apps/server` 形成独立审查报告，修复高置信度问题并完成测试验证，阶段结束后提交推送。
- DDD 分类：application
- test_strategy：test_after
- 风险任务：是
- 文件所有权 / 共享路径提醒：若触及共享协议，必须同步检查 `packages/schemas`、`packages/http-client`、`apps/web`、`apps/admin`

## TASK-AUDIT-005 | OpenAPI 与根脚本收尾

- 类型：共享 / 工程
- 优先级：高
- 完成标准：确认 `/docs`、`/openapi.json` 对应文档是最新且完整；优化根目录 `package.json` 中 seed/test-data/reset 脚本命名与职责；完成最终全仓验证。
- DDD 分类：supporting
- test_strategy：test_after
- 风险任务：是
- 文件所有权 / 共享路径提醒：涉及环境变量或文档说明时同步更新 `README.md` 与 `.env.example`
