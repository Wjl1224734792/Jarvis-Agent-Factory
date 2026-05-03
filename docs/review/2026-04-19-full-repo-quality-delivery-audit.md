# 2026-04-19 全仓测试、工程质量与交付风险审查

## 审查结论

- 结论：仓库拥有完整的 lint/typecheck/test/build 闭环，但交付质量仍高度依赖少数共享热点文件和基础设施稳定性
- 说明：问题不是“完全没有护栏”，而是护栏发现问题后，修复半径往往会波及共享 client、共享 seed、超大 service/page 文件，导致交付风险集中。

## 审查方法

- 审查根级脚本和分层验证入口
- 盘点 server 测试与 DB seed/reset 模式
- 抽样检查共享 client、本地 client、迁移与日志链路

## 已确认问题

### 1. `[P0][交付风险]` 根级护栏完整，但风险高度集中在少数共享热点文件

- 证据：
  - 根 `package.json` 提供 `lint`、`typecheck`、`test`、`build`
  - 但 `packages/http-client/src/index.ts`、`apps/admin/src/app.tsx`、`apps/server/src/modules/*/*.service.ts` 已形成明显热点
- 影响：
  - 一旦共享热点文件偏离，多个 app 和验证层会同时受影响
- 建议：
  - 路线图优先治理热点文件，再追求更快交付
- 分类：
  - `confirmed`
  - 下一阶段建议：`needs_ddd_first`

### 2. `[P1][共享基础设施]` `packages/db` 缺少独立测试层，基础设施风险主要靠 server 集成测试间接暴露

- 证据：
  - 根 `package.json:42` 的 `test:unit` 未覆盖 `packages/db`
  - `packages/db` 当前无独立 `tests` 目录
- 影响：
  - schema、seed、migration 契约问题更容易后置暴露
- 建议：
  - 给 `packages/db` 增加基础设施测试
- 分类：
  - `confirmed`
  - 下一阶段建议：`can_direct_dev`

### 3. `[P1][验证策略]` server 测试稳定性更多依赖串行化，而不是更强隔离

- 证据：
  - `vitest.config.ts:5` 设置 `fileParallelism: false`
  - `apps/server/package.json:12` 使用 `--maxWorkers 1`
  - 多个 server 测试文件共用整库 reset + seed
- 影响：
  - 验证更慢
  - 并发类问题不容易自然暴露
- 建议：
  - 后续把串行化从“兜底策略”升级为“更轻量隔离 + fixture”
- 分类：
  - `confirmed`
  - 下一阶段建议：`can_direct_dev`

### 4. `[P1][契约漂移]` Web/Admin 本地 client 包装层会放大“测试通过但语义漂移”的交付风险

- 证据：
  - `apps/web/src/lib/api-client.ts`
  - `apps/admin/src/lib/api-client.ts`
  - `packages/http-client/src/index.ts`
- 影响：
  - 共享契约变更不一定能被单层完全兜住
- 建议：
  - 明确“必须共享”和“允许本地包装”的边界
- 分类：
  - `confirmed`
  - 下一阶段建议：`needs_ddd_first`

### 5. `[P1][E2E覆盖]` E2E 更像开发态联调，而不是完整发布态验收

- 证据：
  - `playwright.config.ts:8`
  - `playwright.config.ts:23`
  - `scripts/run-e2e.mjs:97`
- 事实：
  - E2E 主要覆盖 `apps/web/e2e`
  - 运行前会直接启动 dev server 并重置 mock DB
- 影响：
  - Admin UI 与发布态构建产物不在同一条验收链路里
- 建议：
  - 后续补更贴近发布态的验收路径
- 分类：
  - `confirmed`
  - 下一阶段建议：`plan_patch_required`

## 仅记录 / 待补证据问题

- `inferred`：当前文档与实现总体同步度尚可，但部分中文文案与历史遗留测试文本仍有编码/表达噪音，后续应安排一次文档与测试文本清理。

## 建议方向

- 保持根级验证闭环不变，但补一层“热点文件治理”和“基础设施测试”目标。
- 后续实现阶段必须严格按任务边界推进，避免多个任务同时改同一热点文件。
