# 2026-04-15 项目审查后续优化任务拆解

## 需求文档路径

- `docs/requirements/2026-04-15-project-audit-optimization-requirements.md`

## 任务概览

- 本轮聚焦 4 类可立即落地的高置信度问题：
  - 编排配置模型不可用
  - E2E / server 测试入口漂移
  - 通用举报详情契约边界缺口
  - Admin 评论审核页请求扇出
- 评分对象审核 N+1 继续保留为后续共享契约专项，不在本轮直接改动。

## 任务分解列表

### TASK-AUDOPT-001

- 任务名称：修复编排代理模型兼容性与说明文档
- 类型：共享
- 优先级：P1
- 完成标准：
  - `.codex/agents` 中当前环境不可用的模型被替换为受支持模型
  - `agent-orchestration/README.md` 的模型摘要与 TOML 保持一致
  - 文档明确本轮发现的编排兼容性问题已被消除
- DDD 分类：direct
- test_strategy：manual_only
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 共享责任方：主会话
  - 仅改 `.codex/agents/*.toml` 与 `.codex/skills/agent-orchestration/README.md`
  - 不改实现代理职责边界文案

### TASK-AUDOPT-002

- 任务名称：修复测试入口与 E2E 默认端口漂移
- 类型：后端
- 优先级：P1
- 完成标准：
  - `apps/server/package.json` 的 `test` 能覆盖 `apps/server/tests/**/*.test.ts`
  - `scripts/run-e2e.mjs` 默认等待地址与 `playwright.config.ts` 一致
  - 相关验证命令可实际运行到正确入口
- DDD 分类：direct
- test_strategy：test_after
- 风险任务：否
- 文件所有权 / 共享路径提醒：
  - 主会话负责根脚本与 server script
  - 不改 Playwright 用例本身，不改 README 和 `.env.example` 中既有端口说明

### TASK-AUDOPT-003

- 任务名称：补齐通用举报详情共享契约校验
- 类型：后端
- 优先级：P1
- 完成标准：
  - `/admin/reports/{kind}/{id}` 返回值经 `adminReportRecordsResponseSchema` 校验
  - `adminReportsService` 输出字段与 schema 对齐
  - 新增至少一条 server 行为测试，能覆盖该路由的成功响应契约
- DDD 分类：direct
- test_strategy：tdd
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 共享责任方：主会话
  - 允许修改 `apps/server/src/modules/admin-reports/**`、`apps/server/tests/**`
  - 若需调整 `packages/schemas/src/reports.ts`，必须保持与已有专用举报详情路由一致

### TASK-AUDOPT-004

- 任务名称：收敛 Admin 评论审核页按域请求
- 类型：前端
- 优先级：P1
- 完成标准：
  - 评论审核页仅启用当前 `domain` 对应的 query
  - 查询 key 能反映当前 `domain/status`
  - 页面 loading / 数据选择逻辑与新查询方式一致
  - 新增一条与按域启用相关的单测或辅助函数测试
- DDD 分类：direct
- test_strategy：tdd
- 风险任务：否
- 文件所有权 / 共享路径提醒：
  - 允许修改 `apps/admin/src/features/posts/**`、`apps/admin/tests/**`
  - 不改后台信息架构，不引入新的服务端统计接口

## DDD 分类

- `direct`
  - TASK-AUDOPT-001
  - TASK-AUDOPT-002
  - TASK-AUDOPT-003
  - TASK-AUDOPT-004

## TDD 与直接开发分类

- `tdd`
  - TASK-AUDOPT-003
  - TASK-AUDOPT-004
- `test_after`
  - TASK-AUDOPT-002
- `manual_only`
  - TASK-AUDOPT-001

## 风险任务

- TASK-AUDOPT-001：影响仓库内编排工作流的可用性，需要确保只替换模型，不改变角色职责。
- TASK-AUDOPT-003：涉及共享 schema 边界，若 service 输出字段不完整，路由会直接抛出校验失败。

## 文件所有权和共享路径提醒

- 主会话统一负责：
  - `.codex/agents/**`
  - `.codex/skills/agent-orchestration/README.md`
  - `scripts/run-e2e.mjs`
  - `apps/server/package.json`
  - `apps/server/src/modules/admin-reports/**`
  - `apps/server/tests/**`
  - `apps/admin/src/features/posts/**`
  - `apps/admin/tests/**`
  - `docs/**`
- 本轮不修改：
  - `packages/db/**`
  - `apps/web/**`
  - `apps/server/src/modules/rankings/**`
  - `packages/http-client/**`

## 推荐交付顺序

1. TASK-AUDOPT-003：先写失败测试，再补齐通用举报详情契约。
2. TASK-AUDOPT-004：先写按域启用辅助测试，再改 Admin 评论审核页请求逻辑。
3. TASK-AUDOPT-002：修复 server 测试脚本与 E2E wrapper 默认端口。
4. TASK-AUDOPT-001：最后更新编排代理模型配置与 README，避免影响当前主会话判断。

## 推荐的下一步

- 基于本任务文档生成执行计划与 Execution Packet。
- 若后续继续推进评分对象审核 N+1，需单开共享契约任务，覆盖 `packages/schemas`、`packages/http-client`、`apps/server`、`apps/admin` 与 OpenAPI。
