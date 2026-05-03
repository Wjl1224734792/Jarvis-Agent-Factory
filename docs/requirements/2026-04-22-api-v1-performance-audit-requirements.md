# 2026-04-22 API v1 与交付质量审查需求

## 背景
- 用户要求按 `agent-orchestration` 思路审查项目，并在项目尚未上线、无需兼容生产数据的前提下直接优化。
- 用户关注点包括：功能完善、架构、性能、注释、算法、测试，以及补上可支撑后续 API 迭代的 `v1` 路由版本控制。

## 本轮目标
- 将业务 API 统一迁移到 `v1` 版本前缀，形成后续 `v2` 演进的稳定入口。
- 清理前后端客户端与测试中的关键硬编码路径，避免版本化后出现隐性 404。
- 补充围绕 API 版本化的测试与文档，使本轮改造具备可验证性。
- 落地一个直接收益明确、风险较低的性能优化点。
- 输出本轮审查结论，记录已修复项、基线问题与剩余风险。

## 范围内
- `packages/shared`
- `packages/http-client`
- `apps/server`
- `apps/web`
- `apps/admin`
- `docs/requirements`
- `docs/tasks`
- `docs/plans`
- `docs/review`

## 范围外
- 大规模重写业务模块或重做领域模型。
- 为了“顺手整洁”处理与本轮目标无关的历史代码。
- 修改数据库 schema、迁移、seed 或环境变量语义。
- 解决当前仓库内所有既有 server 集成测试失败用例。

## 成功标准
- 业务 API 统一使用 `v1` 前缀，health 与 docs 保持稳定根路径。
- `packages/shared`、`packages/http-client`、`apps/server`、`apps/web`、`apps/admin` 的关键入口全部对齐新路径。
- 至少补齐以下验证：
  - 共享路由常量版本化测试
  - server 端版本化路径行为测试
  - OpenAPI 路径断言更新
  - http-client URL 断言更新
- 有一项明确的性能优化随本轮一起落地，并能说明优化动机。
- 输出本轮审查/优化总结，明确剩余未解问题与原因。

## 已知约束
- 根 `AGENTS.md` 要求在完成前至少执行 `lint`、`typecheck`、`test`、`build`；若存在非本轮引入的失败，需要明确说明。
- 当前工作区已存在用户未提交改动，本轮不得回滚或覆盖无关更改。
