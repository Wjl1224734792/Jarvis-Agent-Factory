# 项目审查后续优化需求说明

## 需求摘要

- 在现有仓库审查基线之上，复核 `AGENTS.md` 与 `.codex/AGENTS.md` 约束，并针对近期审查报告中仍成立的高置信度建议项做最小优化。
- 本轮优先处理编排配置可用性、测试入口漏跑、E2E 端口漂移、举报详情契约校验缺口，以及后台评论审核页请求扇出问题。
- 变更必须保持现有业务行为、权限语义、数据库结构和环境变量不变，并同步记录审查、实现和验证结果。

## 目标与成功标准

- 管理端评论审核页只加载当前选中评论域的列表数据，不再在页面挂载时并发拉取全部评论域。
- 本地编排配置不再引用当前环境不可用的子代理模型，人工说明文档与 TOML 保持一致。
- `bun run test:server` 覆盖现有 `apps/server/tests/**/*.test.ts` 用例，不再因手写白名单漏跑新增测试。
- `bun run test:e2e` 的 wrapper 与 Playwright 配置使用一致的默认端口，避免等待旧的 `3000/3001/3002`。
- 通用 `/admin/reports/{kind}/{id}` 返回值经过共享 schema 校验，并补齐举报证据图片契约字段。
- 至少运行与本轮变更直接相关的 schema、server、admin 验证；若无法完成全仓默认验证，需要明确说明原因。

## 范围内

- `apps/admin/src/features/posts/post-comments-page.tsx`
- `.codex/agents/*.toml`
- `.codex/skills/agent-orchestration/README.md`
- `scripts/run-e2e.mjs`
- `apps/server/package.json`
- `apps/server/src/modules/admin-reports/admin-reports.route.ts`
- `apps/server/src/modules/admin-reports/admin-reports.service.ts`
- 与上述行为直接相关的测试文件和本轮文档

## 范围外

- 数据库 schema、迁移与 seed 语义调整
- 新业务功能、视觉重设计或后台页面大规模重构
- 微信小程序、App、`apps/mobiles`
- 评分对象审核 N+1 的服务端聚合接口专项建设
- 举报中心的服务端统一聚合接口专项建设
- 前端共享协议全面收敛到 `packages/http-client` 的大规模重构

## 关键模块 / 功能列表

- 后台评论审核页：按 `domain` 选择启用对应评论列表 query，审核开关卡片的待处理数改用管理端 analytics 聚合值。
- 编排配置：将不可用的 `gpt-5.3-codex-spark`、`gpt-5.4-mini` 调整为当前支持的同级模型，并同步 agent-orchestration README。
- 测试入口：服务端测试脚本改为 glob 覆盖现有测试文件。
- E2E wrapper：默认端口与 `playwright.config.ts`、README、`.env.example` 保持一致。
- 举报详情：通用管理端举报详情路由复用 `adminReportRecordsResponseSchema.parse`，service 输出与 schema 对齐。

## 风险与开放问题

- 评论审核页待处理数若改为当前域计数，会与原全域卡片语义不同；本轮优先降低请求扇出，保留后续轻量统计接口作为可选优化。
- 评分对象审核 N+1 仍成立，但可靠修复需要新增服务端聚合/分页接口并同步共享契约，本轮记录为后续专项，不做半套改造。
- E2E wrapper 修改只校正启动等待端口，不改变 Playwright 项目结构和测试数据初始化流程。

## 已收敛结论

- 用户指定使用 `agent-orchestration` 审查项目并根据报告优化。
- 主会话已按仓库边界默认收敛：只维护 `apps/web`、`apps/admin`、`apps/server` 与直接相关的 `packages/*`。
- 本轮不等待额外产品确认，优先处理近期审查报告中已明确指出且仍能复现的低风险工程优化。
