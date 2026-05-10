# QA 综合签核报告：Gate 任务时长统计

> 签核日期: 2026-05-09 | 审查者: qa-review-expert | 需求: `docs/requirements/2026-05-09-gate-duration-stats.md`

---

## 1. 审查结论

**结论: 不通过**

存在 1 项关键路径上的数据语义错误（Backend #1），直接导致 Web 面板展示错误信息，不符合 REQ-004 和 REQ-005 的验收标准。必须在推进 Gate E 之前修复并重新验证。

---

## 2. Gate 条件逐 Gate 验证

| Gate | 条件 | 状态 | 说明 |
|------|------|------|------|
| A | 需求文档落盘、confirmed、>=1 轮提问 | **通过** | `docs/requirements/2026-05-09-gate-duration-stats.md` 已落盘，状态 confirmed，REQ-001 ~ REQ-007 含完整验收标准 |
| B | 任务映射 REQ>=1、DDD/TDD 分类 | **通过** | `docs/tasks/2026-05-09-gate-duration-stats-tasks.md`：7 个 REQ 全部映射到 4 个 TASK，DDD/TDD 分类正确 |
| C | 计划含 parallel_batches、Execution Packet | **通过** | `docs/plans/2026-05-09-gate-duration-stats-plan.md`：4 个 Batch（串行），4 个完整 Execution Packet |
| C1 | Lint/Type-check/Build/Deps Audit 通过 | **通过** | 后端审查确认 TypeScript 编译通过；测试摘要确认 45/45 测试通过；无新增依赖 |
| C1.5（前端） | 视觉验证截图（三视口）、样式检查 | **通过** | 前端审查提及 preview_eval 验证；统计卡片响应式断点 `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` 符合三视口要求 |
| C2 | 测试全部通过、覆盖率达标 | **通过** | `docs/testing/2026-05-09-gate-duration-stats-test-summary.md`：45 个用例 0 失败；TDD 新增 11 个测试覆盖 TASK-001 + TASK-002 |
| D | 各领域审查通过 | **有条件通过** | 后端审查：有条件通过（1 FIX_REQUIRED）；前端审查：有条件通过（1 FIX_REQUIRED）；安全审计：通过（无本次引入的阻塞问题）；性能审计：通过（无 P0/P1） |

---

## 3. REQ 追踪矩阵

| requirement_id | task_id | planned_owner | actual_change_files | verification | review_result |
|---|---|---|---|---|---|
| REQ-001（Gate 进入时间记录） | TASK-001 | backend-dev-expert | `src/engine/db.ts` (+3 列迁移 + CRUD 更新), `src/engine/server.ts` (advance_gate/gate_jump 逻辑) | db.test.ts: createPipelineRun 写入 gate_entered_at, advance_gate/gate_jump 更新 gate_entered_at, 迁移脚本回填 | **有条件通过** — Backend #1 导致 API 层 `entered_at` 值错误 |
| REQ-002（Gate 耗时计算） | TASK-001 | backend-dev-expert | 同上 | db.test.ts: advance_gate 推进后 checkpoint 有 duration_seconds | **通过** — 核心计算逻辑正确；Backend #3 为 REST 路径未同步 |
| REQ-003（任务总耗时计算） | TASK-002 | backend-dev-expert | `src/engine/db.ts` (+1 列迁移 + completeRun/abortRun 增强) | db.test.ts: completeRun/abortRun 写入 total_duration_seconds, started_at NULL 边界 | **通过** |
| REQ-004（Web API 返回时长数据） | TASK-003 | backend-api-expert | `src/web/routes.ts` (+28 行: /api/pipeline, /api/pipeline-runs 追加字段 + formatDuration) | curl 手工验证 + TypeScript 编译通过 | **不通过** — Backend #1: `/api/pipeline` 中 `entered_at` 多 Gate 语义错误 |
| REQ-005（Gate 步骤列表展示耗时） | TASK-004 | frontend-dev-expert | `src/web/views/pipeline.html` (+111 行: Gate 时间行 + formatDateTime/formatDuration) | 浏览器手动验证 Gate 步骤列表 | **有条件通过** — 前端实现正确但依赖后端 `entered_at`（当前有 Bug） |
| REQ-006（统计卡片增加总耗时） | TASK-004 | frontend-dev-expert | 同上 (+ updateDurationCard 函数 + 第 5 张统计卡片) | 浏览器手动验证统计卡片 | **有条件通过** — Frontend #1: `started_at` null 防护缺失 |
| REQ-007（历史 Runs 列表展示耗时） | TASK-004 | frontend-dev-expert | 同上 (+ 耗时列) | 浏览器手动验证历史 Runs 列表 | **通过** |

### 追踪链路完整性检查

| 检查项 | 结果 |
|--------|------|
| REQ -> TASK | 全部 7 个 REQ 映射至 4 个 TASK，无遗漏 |
| TASK -> PLAN | 全部 4 个 TASK 分配至 4 个 Batch，并行策略已说明 |
| PLAN -> IMPL | 全部 4 个 Execution Packet 有对应实现产出（4 个文件） |
| IMPL -> TEST | 4 个文件均有测试覆盖：db.test.ts（15 用例 + 11 TDD 新增）、curl 验证、浏览器手动验证 |
| TEST -> REPORT | 测试结果汇总在测试摘要报告，45/45 通过 |

---

## 4. 文档完备性检查

| 文档 | 路径 | 状态 | 检查点 |
|------|------|------|--------|
| 需求文档 | `docs/requirements/2026-05-09-gate-duration-stats.md` | **完备** | 7 个 REQ 含验收标准，status confirmed，不变更范围明确 |
| 任务文档 | `docs/tasks/2026-05-09-gate-duration-stats-tasks.md` | **完备** | 4 个 TASK 含 DDD/TDD 分类、完成标准、风险标注 |
| 计划文档 | `docs/plans/2026-05-09-gate-duration-stats-plan.md` | **完备** | 4 个 Batch、完整 Execution Packet、共享区域串行规则、escalation rule |
| 测试报告 | `docs/testing/2026-05-09-gate-duration-stats-test-summary.md` | **完备** | 45/45 通过统计、TDD 用例覆盖明细、手动验证记录 |
| 后端审查 | `docs/review/2026-05-09-gate-duration-stats-backend-review.md` | **完备** | 6 项 finding、维度检查表、必须修复项、Residual Risk |
| 前端审查 | `docs/review/2026-05-09-gate-duration-stats-frontend-review.md` | **完备** | 3 项 finding、五轴审查、需求覆盖验证表 |
| 安全审计 | `docs/review/security-review.md` | **完备** | 6 项 finding（S01-S06）、STRIDE 威胁模型、SQL 注入检查 |
| 性能审计 | `docs/review/perf-review.md` | **完备** | 6 项 finding（P2-P4）、基线缺口、测量建议计划 |

---

## 5. 跨领域一致性检查

### 5.1 前后端 API 契约

| 契约项 | 后端（routes.ts） | 前端（pipeline.html） | 一致性 |
|--------|-------------------|----------------------|--------|
| `/api/pipeline` gate 对象 `entered_at` | `routes.ts:105` 计算: `run?.gate_entered_at \|\| null` | `pipeline.html:464,471` 读取: `g.entered_at` | **不一致** — 后端将所有 Gate 赋予同一 `run.gate_entered_at` 值（见 Backend #1） |
| `/api/pipeline` gate 对象 `duration_seconds` | `routes.ts:106` 计算: `cp?.duration_seconds ?? null` | 通过 `duration_display` 间接使用 | **一致** — 正确从 checkpoint 读取 |
| `/api/pipeline` gate 对象 `duration_display` | `routes.ts:107` 计算: `formatDuration(cp.duration_seconds)` | `pipeline.html:466` 读取: `escHtml(g.duration_display \|\| '--')` | **一致** |
| `/api/pipeline-runs` run 对象 `total_duration_display` | `routes.ts:213` 计算: `formatDuration(r.total_duration_seconds)` | `pipeline.html:942,991` 读取 | **一致** |
| `/api/pipeline-runs` run 对象 `completed_at` | `routes.ts:212` 展开: `...r`（含 completed_at） | `pipeline.html:992` 读取 | **一致** |

### 5.2 API 文档 vs 实现

| 端点 | 预期字段 | 实际字段 | 一致性 |
|------|---------|---------|--------|
| GET `/api/pipeline` | gate.entered_at, gate.duration_seconds, gate.duration_display | 三个字段均存在 | **一致**（但 entered_at 值语义有 Bug） |
| GET `/api/pipeline-runs` | run.completed_at, run.total_duration_seconds, run.total_duration_display | 三个字段均存在 | **一致** |

### 5.3 数据模型 vs API 响应

| 数据库列 | 表 | 类型 | API 字段 | API 类型 | 一致性 |
|---------|-----|------|---------|---------|--------|
| `gate_entered_at` | pipeline_runs | TEXT | `entered_at` | string\|null | **一致** |
| `duration_seconds` | checkpoints | INTEGER | `duration_seconds` | number\|null | **一致** |
| `total_duration_seconds` | pipeline_runs | INTEGER | `total_duration_seconds` | number\|null | **一致**（通过展开 `...r` 暴露） |
| `completed_at` | pipeline_runs | TEXT | `completed_at` | string\|null | **一致**（通过展开 `...r` 暴露） |

### 5.4 前后端 formatDuration 一致性

| 维度 | 后端（routes.ts:410-425） | 前端（pipeline.html:550-558） | 一致性 |
|------|--------------------------|------------------------------|--------|
| 秒数格式化 | 分 >= 1 时追加秒（`secs > 0` 条件） | 无条件追加秒 | **不一致** — 后端 `formatDuration(60)` = `"1分"`, 前端 `formatDuration(60)` = `"1分0秒"` |
| null 处理 | 返回 `null` | 返回 `'--'` | **可接受** — 职责分离：后端返回 null 供 API，前端就地降级 |
| 小时格式化 | 同上优化逻辑 | 无优化 | **不一致** |

此不一致性在性能审计报告中也作为 P4 标注，建议统一由前端格式化。

---

## 6. 变更范围检查

| 检查项 | 结果 |
|--------|------|
| 总变更行数 | ~460 行（合理范围，未超过 1000 行阈值） |
| 变更文件数 | 4 个（db.ts, server.ts, routes.ts, pipeline.html）+ 1 个（db.test.ts） |
| 是否超出需求范围 | **无** — 所有变更均可追溯到 REQ-001 ~ REQ-007 |
| 金漆（gold-plating） | **无** — 未发现未被需求要求的抽象层或配置项 |
| 高风险共享区域改动 | `db.ts` 和 `tests/db.test.ts` 由 TASK-001/TASK-002 串行修改，已遵守计划中的串行规则 |
| 行为准则违规 | **无** — 前后端审查均确认准则 2/3 无违规 |

---

## 7. 领域审查报告摘要

### 7.1 后端审查

| 维度 | 结论 |
|------|------|
| 审查者 | backend-review-expert |
| 总体结论 | **有条件通过** |
| 强制修复 | #1: `/api/pipeline` 中 `entered_at` 所有 Gate 返回同一值（**FIX_REQUIRED**） |
| 建议修复 | #2 (WARNING): 时间格式不一致（datetime('now') vs toISOString()）; #3 (WARNING): REST `/api/gate/advance` 未记录耗时 |
| 信息项 | #4~#6 (INFO): backfill 重复执行、缺索引、双 UPDATE 无事务 |

### 7.2 前端审查

| 维度 | 结论 |
|------|------|
| 审查者 | frontend-review-expert |
| 总体结论 | **有条件通过** |
| 强制修复 | #1: `updateDurationCard` 第 986 行 `run.started_at` null 防护缺失（**FIX_REQUIRED**） |
| 建议修复 | #1 (WARNING): `formatDateTime` 调用方冗余 `replace(' ', 'T')`; #2 (WARNING): 时间信息 `text-[10px]` 低于无障碍最小字号 |
| 需求覆盖 | REQ-005/006/007 全部满足，验收标准逐条通过 |

### 7.3 安全审计

| 维度 | 结论 |
|------|------|
| 审查者 | security-review-expert |
| 总体结论 | **通过**（非本次变更引入的问题不阻塞） |
| 最高风险 | S01 Medium: `marked.parse()` 无 HTML 净化（**已有问题，非本次引入**） |
| 其他发现 | S02-S06 均为 Low/Info（CDN 无 SRI、路径泄露、缺失安全头、IDOR、测试 SQL 拼接） |
| 核心安全 | SQL 全部参数化、前端 XSS 防护正确（escHtml）、无密钥泄露 |

### 7.4 性能审计

| 维度 | 结论 |
|------|------|
| 审查者 | perf-review-expert |
| 总体结论 | **通过** — 无 P0/P1 发现 |
| 最高风险 | P2: `initSchema` 每次启动执行回填 SQL（低概率重复，NULL 守卫限制） |
| 其他发现 | P3: completeRun/abortRun 双 UPDATE（开销 < 1ms）; P3: advance_gate 新增 SELECT（开销 < 0.5ms） |
| 评估 | 所有性能开销在个人工具规模下可忽略 |

---

## 8. 问题列表（按严重度排序）

| # | 来源 | 严重度 | 标签 | 问题 | 关联 REQ |
|---|------|--------|------|------|----------|
| B1 | 后端审查 | **CRITICAL** | **[BLOCKED]** | `/api/pipeline` 中 `entered_at` 赋值为 `run.gate_entered_at`（当前 Gate），导致所有 Gate 的 `entered_at` 返回相同值。已通过的 Gate 显示错误的进入时间，未到达的 Gate 错误地显示当前 Gate 的进入时间，直接影响 REQ-005 展示准确性 | REQ-004, REQ-005 |
| F1 | 前端审查 | **IMPORTANT** | **[FIX_REQUIRED]** | `updateDurationCard` 第 986 行缺少 `run.started_at` null 防护。如果后端返回 `status === 'active'` 但 `started_at` 为 null 的异常数据，`TypeError: Cannot read properties of null (reading 'replace')` 会在轮询中持续抛出 | REQ-006 |
| B2 | 后端审查 | LOW | **[WARNING]** | `gate_entered_at` 时间格式不一致：`createPipelineRun` 使用 SQLite `datetime('now')`（格式 `2026-05-09 14:30:22`），`advance_gate`/`gate_jump` 使用 `new Date().toISOString()`（格式 `2026-05-09T14:30:22.123Z`）。同一列存两种格式 | REQ-001 |
| B3 | 后端审查 | LOW | **[WARNING]** | `/api/gate/advance` REST 端点缺少耗时记录与 `pipeline_runs` 同步，与 MCP 工具 `advance_gate` 行为不一致。导致 REST 路径产生的 checkpoint `duration_seconds` 为 NULL，`pipeline_runs.current_gate` 不更新 | REQ-002 |
| F2 | 前端审查 | NIT | **[WARNING]** | `formatDateTime` 调用方第 982/992 行冗余 `replace(' ', 'T')`——`formatDateTime` 内部已处理空格格式，冗余调用为 no-op | REQ-005 |
| F3 | 前端审查 | NIT | **[WARNING]** | Gate 步骤时间信息使用 `text-[10px]`，低于 WCAG 建议最小 12px | REQ-005 |
| S1 | 安全审计 | MEDIUM | **[WARNING]** | `marked.parse()` 无 HTML 净化（存储型 XSS 风险）— **已有问题，非本次引入** | N/A |
| P1 | 性能审计 | LOW | **[INFO]** | `initSchema` 回填 SQL 每次启动执行（有 NULL 守卫，实际应只执行一次） | REQ-002 |
| P2 | 性能审计 | NEGLIGIBLE | **[INFO]** | `completeRun`/`abortRun` 双 UPDATE 无事务包裹 | REQ-003 |
| P3 | 性能审计 | NEGLIGIBLE | **[INFO]** | 前后端 `formatDuration` 实现不一致（后端对分格式优化，前端无） | REQ-004, REQ-005 |

---

## 9. 必须修复项

### 阻塞 Gate E 推进

| # | 来源 | 问题 | 修复方向 |
|---|------|------|---------|
| B1 | 后端 `routes.ts:105` | `entered_at` 多 Gate 语义错误 — 每个 Gate 需独立计算进入时间（Gate A 用 `started_at`，已通过 Gate 用前一个 checkpoint 的 `passed_at`，当前 Gate 用 `run.gate_entered_at`，未到达 Gate 返回 null） | 重写 `entered_at` 赋值逻辑，参考后端审查报告 Finding #1 中的修正示例代码 |
| F1 | 前端 `pipeline.html:986` | `updateDurationCard` 进行中状态缺少 `run.started_at` null 防护 | 在 `run.status === 'active'` 分支内增加 `if (!run.started_at)` 卫语句 |

### 建议本迭代修复

| # | 来源 | 问题 | 修复方向 |
|---|------|------|---------|
| B2 | 后端 `db.ts` + `server.ts` | `gate_entered_at` 时间格式不一致 | 统一使用 `datetime('now')`（将 `updateRunGateEnteredAt` 的 ISO 参数改为 SQL 层 `datetime('now')`） |
| B3 | 后端 `routes.ts:143-172` | REST `/api/gate/advance` 缺少耗时与 `pipeline_runs` 同步 | 对齐 MCP 工具逻辑，或废弃 REST 推进端点 |

---

## 10. 优化建议（不阻塞）

| # | 来源 | 建议 |
|---|------|------|
| F2 | 前端 | 移除 `formatDateTime` 调用方的冗余 `replace(' ', 'T')`（第 982/992 行） |
| F3 | 前端 | 将 Gate 时间信息 `text-[10px]` 提升至 `text-[11px]`（无障碍） |
| S1 | 安全 | 为 `marked.parse()` 添加 DOMPurify 净化（已有问题，建议独立处理） |
| P1 | 性能 | 考虑使用 `PRAGMA user_version` 标记迁移版本，避免重复回填 |
| P2 | 性能 | 将 `completeRun`/`abortRun` 的双 UPDATE 合并为单条 SQL |
| P3 | 性能 | 统一前后端 `formatDuration` 实现，后端仅返回原始秒数 |

---

## 11. 未覆盖的验证范围

| 范围 | 说明 |
|------|------|
| 前端暗色模式 | 页面未启用暗色模式，未做适配验证 |
| 移动端（< 640px）卡片折叠 | 新增第 5 张卡片在移动端 2 列布局的视觉未验证 |
| MCP 工具响应新增字段 | `advance_gate` 返回新增的 `duration_seconds` 字段未经 REQ 覆盖，属于良性增强 |
| `strftime('%s', ...)` 对两种时间格式的实际解析 | 黑盒验证未执行 |
| 大量并发 MCP 请求下的 duration 精度 | 未做压测 |
| 已有 checkpoint 回填精度 | 使用上一个 checkpoint 的 `passed_at` 作为近似进入时间，忽略 Gate 之间的等待间隔（需求文档已明确接受） |
| 时区漂移 | 系统时钟跳变可能导致 `julianday` 差值为负（现有代码无防护） |

---

## 12. Residual Risk

1. **时钟不一致**：SQLite `datetime('now')`（UTC）与 `new Date().toISOString()` 在同一列混用（B2）。若未来在此列上做排序或范围查询，可能产生不可预期结果。

2. **REST 推进路径数据不完整**：通过 Web 面板 "Advance" 按钮（REST `/api/gate/advance`）推进的 Gate，其 checkpoint 的 `duration_seconds` 为 NULL，且 `pipeline_runs.gate_entered_at` 不更新（B3）。这导致该路径下 Web 面板显示的耗时数据为空或过时。

3. **backfill 精度损失**：已有数据库的 checkpoint 回填使用 `LAG(passed_at)` 作为近似进入时间，忽略了 Gate 之间可能的等待/思考间隔。此损失在需求文档 REQ-002 中已明确接受。

---

## 13. Gate E 推进判定

**当前状态: 不可推进**

| 条件 | 状态 | 说明 |
|------|------|------|
| 追踪矩阵完整 | 通过 | REQ -> TASK -> PLAN -> IMPL -> TEST 链路无断裂 |
| 文档完备 | 通过 | 8 类文档齐全 |
| Gate A~C2 全部通过 | 通过 | 仅 D 有条件 |
| 领域审查通过 | **未通过** | 后端和前端各有 1 个 FIX_REQUIRED，其中 B1 在关键路径上 |
| 跨领域契约一致 | **未通过** | entered_at 前后端语义不一致（后端计算逻辑有 Bug） |

**推进条件**: 修复 B1 和 F1，然后执行：
1. 重启后端服务，运行 `npx vitest run tests/` 确认无退化
2. 通过 `/api/pipeline` 验证 `entered_at` 各 Gate 值正确
3. 在浏览器中打开面板，验证 Gate 步骤列表开始时间正确
4. 重新触发一次前端审查确认 F1 修复
5. 重新输出 QA 签核（更新本报告）

---

*签核工具: Claude Code QA Review Expert*
*审查依据: 需求文档、任务文档、计划文档、测试摘要、4 份领域审查报告*
