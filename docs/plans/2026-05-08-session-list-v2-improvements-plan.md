# 执行计划：会话列表 V2 优化与门禁文档追踪

> **状态**：Ready | **日期**：2026-05-08 | **计划变更行数**：~320 行（单轮次交付）

---

## 1. 需求文档路径

`docs/requirements/2026-05-08-session-list-v2-improvements.md`

## 2. 任务文档路径

`docs/tasks/2026-05-08-session-list-v2-improvements-tasks.md`

## 3. 当前轮次目标

在单轮次内完成 10 个 REQ 的 10 个 TASK，覆盖后端 4 个文件 + 前端 1 个文件的修改。交付完整的会话列表 V2 优化与门禁文档追踪功能。

## 4. 当前轮次范围

| 维度 | 包含 | 不包含 |
|------|------|--------|
| 会话排序 | 按 run 创建时间倒序 + 置顶 | 归档面板排序（不在范围） |
| 状态指示点 | 移到标题左侧 | 颜色/动画变更 |
| 恢复按钮 | 迁移到看板操作栏 | suspend/resume 机制变更 |
| 任务名称 | Agent 自动设置 | 批量重命名 |
| 更多菜单 | 所有会话可操作 | 新增菜单项 |
| 指令标签 | 去掉 / 前缀 | 新增指令类型 |
| 门禁文档 | 按 session 过滤 + 抽屉展示 | 新增 Gate 类型 |
| 文档 API | GET /api/docs/:filepath | 写入/修改文档 |
| 会话名称回退 | 平台名 . 类型 . 时间 格式 | 国际化 |

## 5. 完成标准

当前轮次完成标准（全部通过才可进入 Q/A 评审）：

- [ ] 会话列表按 `latest_run_started_at DESC` 排序，置顶会话始终在顶部，无 run 会话在末尾
- [ ] 状态指示点显示在标题文字左侧（📌] [●] [标题] 布局）
- [ ] 休眠会话侧边栏中无恢复按钮，选中休眠会话后看板操作栏显示恢复按钮
- [ ] Agent `pipeline_init` 自动设置 task_name（格式：`<项目名> 流水线任务 . <MM-DD>`）
- [ ] 所有会话的 ⋮ 按钮可点击，无 run 会话置顶/归档置灰、删除红色可用
- [ ] 指令标签显示为 `jarvis` / `jarvis-lite`（无 `/` 前缀）
- [ ] Gate 卡片文档列表随会话切换变化，无产物显示"暂无产物文件"
- [ ] 点击文档名右侧抽屉滑出，Markdown 正确渲染，关闭按钮和遮罩层可关闭
- [ ] `GET /api/docs/:filepath` 正常返回文件内容，路径遍历攻击返回 400，文件不存在返回 404
- [ ] 无 task_name 会话显示 `平台名 . 流水线类型 . HH:MM` 格式

## 6. 是否需先查阅 code-explore-expert / docs-research-expert

**不需要。** 计划制定者已充分阅读 5 个目标文件的关键代码段，包括：

- `src/engine/db.ts`：`getSessions()` (line 189-192)、`createPipelineRun()` (line 250)、`getActiveRun()` (line 266)
- `src/engine/server.ts`：`pipeline_init` 工具 handler (line 253-267)、`setRunTaskName` 导入 (line 12)
- `src/engine/gates.ts`：`findGateArtifacts()` (line 130-135)、`GATE_DIRS` 常量
- `src/web/routes.ts`：`/api/sessions` (line 166-185)、`/api/pipeline` (line 91-116)、`getDocsDir()` (line 357)、`setupApiRoutes()` 尾部 (line 357-370)
- `src/web/views/pipeline.html`：`COMMAND_LABELS` (line 312-317)、`renderSessions()` (line 480-563)、artifacts 渲染 (line 425-427)、`fetchAPI()` (line 329-332)

## 7. 执行代理分工

| TASK | REQ | 代理类型 | 文件 | 理由 |
|------|-----|---------|------|------|
| TASK-001 | REQ-SL-005 | `backend-data-expert` | `db.ts`、`routes.ts`（1 行） | SQL 查询 + API 响应映射变更 |
| TASK-002 | REQ-SL-008 | `backend-logic-expert` | `server.ts` | MCP 工具 handler 业务逻辑 |
| TASK-003 | REQ-SL-011 | `backend-logic-expert` | `gates.ts`、`routes.ts` | 门禁过滤策略 + API 端点 |
| TASK-004 | REQ-SL-013 | `backend-dev-expert` | `routes.ts`、`tests/docs-api.test.ts`（新增） | TDD 模式，需测试 + 实现 |
| TASK-005 | REQ-SL-005, REQ-SL-014 | `frontend-dev-expert` | `pipeline.html` | 排序逻辑 + 名称回退格式 |
| TASK-006 | REQ-SL-006, REQ-SL-007 | `frontend-dev-expert` | `pipeline.html` | Row 1 布局 + 恢复按钮迁移 |
| TASK-007 | REQ-SL-009 | `frontend-dev-expert` | `pipeline.html` | 更多菜单条件渲染 |
| TASK-008 | REQ-SL-010 | `frontend-dev-expert` | `pipeline.html` | 常量值替换 |
| TASK-009 | REQ-SL-011 | `frontend-dev-expert` | `pipeline.html` | Gate 卡片空状态提示 |
| TASK-010 | REQ-SL-012 | `frontend-dev-expert` | `pipeline.html` | 抽屉组件 + Markdown 渲染 |

## 8. 共享区域改动归属

### 8.1 `src/web/routes.ts`（共享，3 个任务）

| 负责人 | 变更位置 | 变更内容 |
|--------|---------|---------|
| TASK-001（backend-data-expert） | `/api/sessions` 响应映射（~line 180） | 添加 `latest_run_started_at: s.latest_run_started_at` |
| TASK-003（backend-logic-expert） | `/api/pipeline` 端点（~line 100） | 替换 `findGateArtifacts()` 为 session-aware 版本 |
| TASK-004（backend-dev-expert） | 新路由（~line 263 之后） | 新增 `GET /api/docs/:filepath` 端点 |

**唯一责任方规则**：虽修改同一文件，但变更在**非重叠行区间**（~100、~180、~263+）。为遵守"共享区域必须串行"原则，按 TASK-001 → TASK-003 → TASK-004 顺序执行。禁止任意两个任务并行修改此文件。

### 8.2 `src/web/views/pipeline.html`（共享，6 个任务）

| 任务 | 变更区域 | 行（近似） |
|------|---------|-----------|
| TASK-005 | `renderSessions()` 排序逻辑 + `fallbackTitle` | line 492-496, 518 |
| TASK-006 | Row 1 状态点位置 + Row 2 恢复按钮 + 看板操作栏 | line 536-537, 542, 看板区域 |
| TASK-007 | `hasActiveRun` 条件分支 → 统一菜单 | line 524, 544-559 |
| TASK-008 | `COMMAND_LABELS` 常量 | line 312-317 |
| TASK-009 | artifacts 空数组提示 | line 425-427 |
| TASK-010 | CSS 动画 + 抽屉 HTML + JS 函数 + artifacts 按钮化 | 多个区域（style, body, script） |

**唯一责任方规则**：单体 monolithic HTML 文件，**必须严格串行** TASK-005 → TASK-010。每个后续任务在前一个任务的最终 diff 基础上进行。建议由同一实现者（或同一 frontend-dev-expert 实例）连续执行以消除上下文切换。

### 8.3 独占文件（无冲突）

| 文件 | 独占任务 |
|------|---------|
| `src/engine/db.ts` | TASK-001 |
| `src/engine/server.ts` | TASK-002 |
| `src/engine/gates.ts` | TASK-003 |

## 9. parallel_batches

### Batch 1（无依赖，可立即启动）

- **TASK-002** → `subagent_type`: `backend-logic-expert`

> 仅修改 `server.ts`（独占文件），与其他所有任务无文件冲突。

### Batch 2（依赖 Batch 1 完成 — 路由文件串行开始）

- **TASK-001** → `subagent_type`: `backend-data-expert`

> 修改 `db.ts`（独占）+ `routes.ts`（`/api/sessions` 响应映射，1 行添加）。

### Batch 3（依赖 TASK-001 完成 — 路由文件串行继续）

- **TASK-003** → `subagent_type`: `backend-logic-expert`

> 修改 `gates.ts`（独占）+ `routes.ts`（`/api/pipeline` 端点更新）。wait_for: TASK-001（routes.ts 串行约束）。

### Batch 4（依赖 TASK-003 完成 — TDD 端点 + 前端并行启动）

- **TASK-004** → `subagent_type`: `backend-dev-expert`
- **TASK-005** → `subagent_type`: `frontend-dev-expert`

> TASK-004 修改 `routes.ts`（新增端点，TDD）+ `tests/docs-api.test.ts`（新增）。wait_for: TASK-003（routes.ts 串行约束）。
> TASK-005 修改 `pipeline.html`。wait_for: TASK-001（需要 `latest_run_started_at` API 字段）。
> **两个任务修改不同文件，可安全并行。**

### Batch 5（依赖 TASK-005 完成 — 前端串行 2/6）

- **TASK-006** → `subagent_type`: `frontend-dev-expert`

> 修改 `pipeline.html`。wait_for: TASK-005（pipeline.html 串行约束）。

### Batch 6（依赖 TASK-006 完成 — 前端串行 3/6）

- **TASK-007** → `subagent_type`: `frontend-dev-expert`

> 修改 `pipeline.html`。wait_for: TASK-006（pipeline.html 串行约束）。

### Batch 7（依赖 TASK-007 完成 — 前端串行 4/6）

- **TASK-008** → `subagent_type`: `frontend-dev-expert`

> 修改 `pipeline.html`。wait_for: TASK-007（pipeline.html 串行约束）。

### Batch 8（依赖 TASK-008 完成 — 前端串行 5/6）

- **TASK-009** → `subagent_type`: `frontend-dev-expert`

> 修改 `pipeline.html`。wait_for: TASK-008（pipeline.html 串行约束）。
> 注：TASK-003（Batch 3）必须在 TASK-009 启动前完成，但因 Batch 3 远早于 Batch 8，该条件自然满足。

### Batch 9（依赖 TASK-004 + TASK-009 完成 — 前端串行 6/6）

- **TASK-010** → `subagent_type`: `frontend-dev-expert`

> 修改 `pipeline.html`。wait_for: TASK-009（pipeline.html 串行约束）**且** TASK-004（需要 `GET /api/docs/:filepath` API 就绪）。

## 10. 串行/并行策略总览

```
时间轴 →

Batch 1: [TASK-002 ──── server.ts]
              │
              ▼
Batch 2: [TASK-001 ──── db.ts + routes.ts]
              │
              ▼
Batch 3: [TASK-003 ──── gates.ts + routes.ts]
              │
              ├──────────────────────────┐
              ▼                          ▼
Batch 4: [TASK-004 ──── routes.ts TDD]  [TASK-005 ──── pipeline.html 1/6]
              │                          │
              │                          ▼
              │                    Batch 5: [TASK-006 ──── pipeline.html 2/6]
              │                          │
              │                          ▼
              │                    Batch 6: [TASK-007 ──── pipeline.html 3/6]
              │                          │
              │                          ▼
              │                    Batch 7: [TASK-008 ──── pipeline.html 4/6]
              │                          │
              │                          ▼
              │                    Batch 8: [TASK-009 ──── pipeline.html 5/6]
              │                          │
              └──────────────────────────┘
                          │
                          ▼
                    Batch 9: [TASK-010 ──── pipeline.html 6/6]
```

**并行组总结：**

| 并行组 | 任务 | 条件 |
|--------|------|------|
| PG-backend-1 | TASK-002（独立） | 独占文件 server.ts |
| PG-backend-2 | TASK-001（独立） | 独占文件 db.ts；routes.ts 非重叠区 |
| PG-cross | TASK-004 + TASK-005 | 不同文件（routes.ts vs pipeline.html） |

**串行链：**

| 串行链 | 任务 | 原因 |
|--------|------|------|
| routes.ts 链 | TASK-001 → TASK-003 → TASK-004 | 同一文件，必须串行 |
| pipeline.html 链 | TASK-005 → TASK-006 → TASK-007 → TASK-008 → TASK-009 → TASK-010 | 同一文件，必须串行 |

## 11. 风险提醒

### 11.1 高风险点

| 风险 | 等级 | 描述 | 缓解 |
|------|------|------|------|
| routes.ts 三重共享 | 中 | TASK-001/003/004 均修改 routes.ts，串行化损失 parallelism | 变更区域非重叠（~100 / ~180 / ~263+），每个 agent 用 Edit 工具精确匹配 old_string |
| pipeline.html 六重共享 | 高 | 6 个任务修改同一 monolithic HTML 文件，合并冲突风险极高 | 严格串行，每个任务基于前一个 diff；建议同一代理连续执行 |
| TDD 首次集成 | 中 | 项目首次对 API 端点使用 TDD（vitest + Hono 请求级测试） | 复用现有 vitest 基础设施；测试文件放在 `tests/` 目录 |
| marked.js CDN 依赖 | 低 | 外部 CDN 可能不可用或版本变更 | 使用固定版本 pinned URL：`marked@15.0.0`；若 CDN 失败 drawer 内显示 raw text |

### 11.2 计划偏差触发条件（plan patch / contract change request）

以下情况必须回编排者 申请 plan patch，不得擅自继续：

- **contract change**：`/api/sessions` 响应格式、`/api/pipeline` 响应格式、`/api/docs/:filepath` 端点签名发生任何未预期的调整
- **routes.ts 行级冲突**：TASK-001/003/004 的 Edit 工具因 old_string 不再唯一而失败（说明上一步变更了相邻区域）
- **pipeline.html 串行断裂**：前端任务发现前一任务的 diff 无法应用或产生逻辑矛盾
- **数据库 schema 变更需求**：发现需要新增字段/索引才能实现排序（当前预期仅修改 SQL 查询）
- **测试基础设施问题**：vitest 无法在 Hono app 上进行请求级测试，需要 mock 策略调整

### 11.3 任务文档与计划的偏差说明

| 项目 | 任务文档预期 | 计划调整 | 理由 |
|------|-------------|---------|------|
| TASK-001 文件范围 | 仅 `db.ts` | 增加 `routes.ts`（1 行） | 验收标准 #4 要求 `/api/sessions` 响应包含 `latest_run_started_at`；SQL 返回的字段不会自动进入 JSON 响应（map 显式构造对象） |
| TASK-001 与 TASK-003 并行 | 可并行 | 串行化 | 两者均修改 `routes.ts`（虽行区间不同），遵守"共享区域必须串行"原则 |
| TASK-002 与 TASK-001 并行 | 可并行 | 仍需串行 | TASK-002 独占 `server.ts`，可与 TASK-001 并行；但 TASK-001 被放入 Batch 2 等待 Batch 1 完成——这是为了简化批次管理而非技术约束。实际可让 TASK-002 与 TASK-001 同时启动。调整：Batch 1 与 Batch 2 可合并启动。 |

### 11.4 Batch 1+2 合并优化

> **编排者注意**：Batch 1（TASK-002）和 Batch 2（TASK-001）之间无技术依赖（修改不同文件），可在实现时同时 launch 两个 subagent。计划中分拆为两个 Batch 仅为标注 routes.ts 串行链的入口点——TASK-001 是 `routes.ts` 链的起始任务。

## 12. 实现者交接信息

### 12.1 TASK-001 (backend-data-expert) → TASK-003 (backend-logic-expert)

- TASK-001 在 `routes.ts` 的 `/api/sessions` 响应映射中添加 `latest_run_started_at: s.latest_run_started_at`（1 行）
- 该行添加在 `pinned: run?.pinned || 0` 之后、对象闭合 `}` 之前
- TASK-003 修改 `/api/pipeline` 端点（line ~100），不涉及 `/api/sessions` 区域
- 交接点：TASK-001 完成后 `routes.ts` 的 line range ~91-116（pipeline 端点）应未发生行号漂移（因 TASK-001 的变更在 ~180 行区域）

### 12.2 TASK-003 (backend-logic-expert) → TASK-004 (backend-dev-expert)

- TASK-003 修改 `/api/pipeline` 端点中 `findGateArtifacts(getDocsDir(root), g)` 调用
- TASK-004 在 `routes.ts` 尾部 ~263 行之后新增 `GET /api/docs/:filepath` 端点
- 交接点：TASK-003 的变更不改变 `routes.ts` 行数太多（替换调用参数），TASK-004 基于 TASK-003 的最终 diff 在文件末尾新增即可

### 12.3 TASK-001 (backend-data-expert) → TASK-005 (frontend-dev-expert)

- TASK-001 确保 `/api/sessions` 响应包含 `latest_run_started_at` 字段（ISO 日期字符串或 null）
- TASK-005 使用该字段进行 `sorted.sort()`：`(b.latest_run_started_at || '') - (a.latest_run_started_at || '')`
- 契约格式：`latest_run_started_at: string | null`（SQLite datetime 格式，如 `"2026-05-08 14:30:00"`）

### 12.4 TASK-003 (backend-logic-expert) → TASK-009 (frontend-dev-expert)

- TASK-003 确保 `/api/pipeline` 返回的 `g.artifacts` 仅包含当前 session 的产物
- TASK-009 在前端仅需处理空数组场景（显示"暂无产物文件"）

### 12.5 TASK-004 (backend-dev-expert) → TASK-010 (frontend-dev-expert)

- TASK-004 确保 `GET /api/docs/:filepath` 端点可用
- 请求格式：`GET /api/docs/<URL 编码的相对路径>`，如 `/api/docs/requirements%2F2026-05-08-session-list-v2-improvements.md`
- 成功响应：200 + text/plain 原始 Markdown 内容
- 错误响应：400（路径遍历/非 .md）/ 404（文件不存在）

## 13. Execution Packets

---

### task_id: TASK-002
### task_name: Agent 自动设置任务名称
### requirement_ids: REQ-SL-008
### owner: backend-logic-expert
### objective: 在 `pipeline_init` MCP 工具 handler 中自动设置 task_name
### in_scope:
- 在 `pipeline_init` 工具 handler（`server.ts:253-267`）中，`createPipelineRun()` 之后自动调用 `setRunTaskName()` 设置默认任务名
- 默认名称格式：`"<项目名> 流水线任务 . <MM-DD>"`（如 `"jarvis 流水线任务 . 05-08"`）
- 从 `project_name` 参数提取最后一段路径名（`E:\CodeStore\jarvis` → `jarvis`）
- 用户显式传入 `task_name` 参数时使用用户指定的名称（新增可选参数）
- `setRunTaskName` 已从 `db.js` 导入（line 12），直接使用
### out_of_scope:
- 不修改 `pipeline_init` 的 MCP schema 签名（保持向后兼容）
- 不创建数据库迁移
- 不修改已有 run 的 task_name
- 不涉及 UI
### input_documents: docs/requirements/2026-05-08-session-list-v2-improvements.md
### allowed_paths: src/engine/server.ts
### forbidden_paths: src/engine/db.ts, src/engine/gates.ts, src/web/routes.ts, src/web/views/pipeline.html
### dependencies: 无（`setRunTaskName` 已导入，`createPipelineRun` 已就绪）
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-001（无共享文件冲突；编排者可同时 launch）
### wait_for: []
### acceptance_criteria:
1. `pipeline_init` 创建新 run 后自动调用 `setRunTaskName()` 设置默认 task_name
2. 默认名称格式：`"<项目名最后段> 流水线任务 . <MM-DD>"`（如 `"jarvis 流水线任务 . 05-08"`）
3. 使用 `new Date()` 获取当前日期并格式化为 `MM-DD`
4. 从 `project_name` 中提取：`project_name.split(/[\\/]/).pop()`
5. 若用户传入 `task_name` 参数，跳过自动命名
6. 已有 task_name 的 run 不受影响
### test_strategy: manual_only（通过 MCP 工具调用验证）
### handoff_notes: 验证方式：启动 Jarvis Engine → 调用 pipeline_init → 检查数据库 pipeline_runs 表的 task_name 字段。后端 API 无变更。
### escalation_rule: 如需调整 `pipeline_init` MCP schema 签名，必须先回编排者确认。

---

### task_id: TASK-001
### task_name: 按 Run 创建时间排序 — 后端
### requirement_ids: REQ-SL-005
### owner: backend-data-expert
### objective: 修改 `getSessions()` 查询使会话按 run 创建时间倒序排列
### in_scope:
**db.ts (~15 行)：**
- 修改 `getSessions()`（line 189-192）：增加 LEFT JOIN `pipeline_runs`，获取 `MAX(started_at)` AS `latest_run_started_at`
- 排序改为 `ORDER BY pinned DESC, latest_run_started_at DESC NULLS LAST`
- statusFilter 分支同样应用排序逻辑

**routes.ts（1 行）：**
- 在 `/api/sessions` 响应映射（line ~180）中添加 `latest_run_started_at: s.latest_run_started_at`
### out_of_scope:
- 不修改 SSE 广播（`broadcastSSE()` 使用不同的映射逻辑，前端排序基于 REST API）
- 不新增数据库索引
- 不修改 `pipeline_runs` 表结构
### input_documents: docs/requirements/2026-05-08-session-list-v2-improvements.md
### allowed_paths: src/engine/db.ts, src/web/routes.ts
### forbidden_paths: src/engine/server.ts, src/engine/gates.ts, src/web/views/pipeline.html
### dependencies: 无
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-002（无共享文件冲突；编排者可同时 launch）
### wait_for: []
### acceptance_criteria:
1. `getSessions()` 返回的每行包含 `latest_run_started_at` 字段（SQLite datetime 或 null）
2. 会话按 `pinned DESC, latest_run_started_at DESC NULLS LAST` 排序
3. 无 run 的会话 `latest_run_started_at` = null，排在列表末尾
4. `/api/sessions` 响应 JSON 中包含 `latest_run_started_at` 字段
5. 现有测试 `tests/db.test.ts` 的 `getSessions 返回所有会话` 用例仍通过（排序变化不影响断言）
### test_strategy: test_after（运行 vitest 验证 db.test.ts 通过，再手动 curl /api/sessions 验证字段存在和排序正确性）
### handoff_notes: `routes.ts` 中仅添加 1 行（`latest_run_started_at`），位于现有 map 对象内部。TASK-003 依赖此变更在 routes.ts 上完成（但修改不同行区间）。完成后通知 TASK-003 可启动。
### escalation_rule: 如 LEFT JOIN 查询性能有问题（session 数量 <100 时预期无影响），或需要新增数据库索引，回编排者评估。

---

### task_id: TASK-003
### task_name: 门禁文档按会话过滤 — 后端
### requirement_ids: REQ-SL-011
### owner: backend-logic-expert
### objective: 修改 `findGateArtifacts()` 使 Gate 文档列表仅展示当前会话的产物文件
### in_scope:
**gates.ts (~25 行)：**
- 新增 `findSessionGateArtifacts(docsDir, gate, sessionId, db)` 函数
- 逻辑：查询 `checkpoints` 表获取 session 相关的日期范围（`passed_at` 日期）
- 无 checkpoint 或精确映射时，回退到扫描 `docsDir/<subdir>/` 目录，按文件名日期匹配
- 若当前会话无产物，返回空数组 `[]`

**routes.ts (~20 行)：**
- 修改 `/api/pipeline` 端点（line 100）：将 `findGateArtifacts(getDocsDir(root), g)` 替换为 `findSessionGateArtifacts(getDocsDir(root), g, s.id, db)`
- 修改 `/api/gate/:gate/enforce` 端点（line 120）同样支持 session 过滤（可选：端点已有 `session_id` query param）
- 修改 `/api/gate/advance` 端点（line 149）同样替换
### out_of_scope:
- 不修改 `findGateArtifacts()` 原函数（保持向后兼容）
- 不创建新数据库表
- 不修改 Gate 定义或流水线状态机
- 不修改 SSE 广播
### input_documents: docs/requirements/2026-05-08-session-list-v2-improvements.md
### allowed_paths: src/engine/gates.ts, src/web/routes.ts
### forbidden_paths: src/engine/db.ts, src/engine/server.ts, src/web/views/pipeline.html
### dependencies: 无（需 wait_for TASK-001 因 `routes.ts` 串行约束）
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: []（routes.ts 串行化禁止并行）
### wait_for: TASK-001
### acceptance_criteria:
1. `findSessionGateArtifacts()` 被 `/api/pipeline` 端点调用
2. 不同 session 的 Gate 卡片展示**不同**的 artifacts 列表
3. 无产物的 session 返回空 artifacts 数组
4. 原 `findGateArtifacts()` 函数不变（其他调用方不受影响）
5. `GET /api/pipeline` 响应结构不变（仅 artifacts 内容变化）
### test_strategy: test_after（启动应用 → 切换不同 session → 验证 /api/pipeline 返回的 artifacts 列表变化）
### handoff_notes: 完成后通知 TASK-004（依赖 routes.ts）和 TASK-009（依赖 artifacts 过滤逻辑）可启动。`routes.ts` 的 3 处 `findGateArtifacts` → `findSessionGateArtifacts` 替换需注意：新函数多出 `sessionId` 和 `db` 两个参数。
### escalation_rule: 如需修改 `gates.ts` 的导出签名（影响 server.ts 中 MCP 工具的引用），必须先回编排者。若 checkpoint 表缺少必要的数据字段进行日期匹配，回编排者。

---

### task_id: TASK-004
### task_name: 新增文档读取 API（TDD）
### requirement_ids: REQ-SL-013
### owner: backend-dev-expert
### objective: 新增 `GET /api/docs/:filepath` 端点，安全读取 docs 目录下的 Markdown 文件
### in_scope:
**TDD Red Phase（先写全部 6 个测试并验证失败）：**
- 新建 `tests/docs-api.test.ts`，使用 vitest + Hono 的 `app.request()` 进行请求级测试
- 覆盖 6 个场景：正常读取 / 路径遍历攻击 / URL 编码路径遍历 / 文件不存在 / 非 .md 文件 / 空路径

**TDD Green Phase（最小实现使测试通过）：**
- 在 `routes.ts` ~263 行之后新增路由处理函数
- 路径安全校验：`decodeURIComponent(filepath)` → `resolve(docsDir, filepath)` → 验证解析后路径仍在 docsDir 前缀内
- 拒绝 `..` 路径和 `.md` 以外扩展名
- 文件存在性检查 + `readFileSync` 读取
- 响应头 `Content-Type: text/plain; charset=utf-8`

**TDD Refactor Phase：**
- 确认测试全绿后，检查代码是否可简化（路径校验逻辑提取为独立函数?）
- 确保注释完整（`@param`、`@returns`、`@throws`）
### out_of_scope:
- 不创建新文件（除 `tests/docs-api.test.ts`）
- 不支持文件写入/修改
- 不支持非 .md 扩展名
- 不支持子目录列表 API
- 不引入 npm 依赖
### input_documents: docs/requirements/2026-05-08-session-list-v2-improvements.md
### allowed_paths: src/web/routes.ts, tests/docs-api.test.ts
### forbidden_paths: src/engine/db.ts, src/engine/server.ts, src/engine/gates.ts, src/web/views/pipeline.html
### dependencies: 无（需 wait_for TASK-003 因 `routes.ts` 串行约束）
### required_skills: behavioral-guidelines, code-standards, test-driven-development, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-005（不同文件，可安全并行）
### wait_for: TASK-003
### acceptance_criteria:
1. `GET /api/docs/requirements/2026-05-08-session-list-v2-improvements.md` → 200 + 文件原始内容
2. `GET /api/docs/../../../etc/passwd` → 400
3. `GET /api/docs/..%2F..%2F..%2Fetc%2Fpasswd` → 400
4. `GET /api/docs/nonexistent.md` → 404
5. `GET /api/docs/script.js` → 400
6. `GET /api/docs/` → 400
7. 响应 Content-Type 为 `text/plain; charset=utf-8`
8. `npm test` 全部通过（含新增的 `tests/docs-api.test.ts`）
### test_strategy: tdd

**TDD 测试用例（写入 `tests/docs-api.test.ts`，Red Phase 先写此文件）：**

| # | describe | it | 输入 | 预期 |
|---|----------|----|------|------|
| 1 | `GET /api/docs/:filepath` | 正常读取存在的 .md 文件 | `/api/docs/requirements/<test-file>` | 200 + 非空内容 + `text/plain` Content-Type |
| 2 | 路径遍历防护 | 拒绝包含 `..` 的路径 | `/api/docs/../../../etc/passwd` | 400 |
| 3 | URL 编码路径遍历防护 | 拒绝 URL 编码的 `..` | `/api/docs/..%2F..%2F..%2Fetc%2Fpasswd` | 400 |
| 4 | 文件不存在 | 返回 404 | `/api/docs/nonexistent.md` | 404 |
| 5 | 非 .md 扩展名 | 拒绝 .js 文件 | `/api/docs/script.js` | 400 |
| 6 | 空路径 | 拒绝空文件路径 | `/api/docs/` | 400 |

> 测试需要创建临时 .md 文件于 `docs/` 目录或 mock 文件系统。推荐在 `beforeAll` 中创建测试用 .md 文件，`afterAll` 中清理。

### handoff_notes:
- 确认 `npm run typecheck` 和 `npm run build` 通过
- TASK-010 依赖此端点，建议在 handoff 中注明端点的精确 URL 格式和错误码
- 测试文件 `tests/docs-api.test.ts` 需 review（新文件）
### escalation_rule: 若 vitest 的 Hono app.request() 无法工作（需要完整的 node server context），改为使用 `node:http` 的 `createServer` + `fetch` 的集成测试方式，需先回编排者确认测试策略调整。

---

### task_id: TASK-005
### task_name: 排序前端 + 会话名称回退优化
### requirement_ids: REQ-SL-005, REQ-SL-014
### owner: frontend-dev-expert
### objective: 前端实现会话按 `latest_run_started_at` 排序 + 优化无 task_name 会话的回退标题
### in_scope:
**排序（REQ-SL-005）：**
- 在 `renderSessions()` 中（line 492-496），修改排序逻辑：
  - 当前仅按 `pinned` 排序
  - 改为 `pinned` 优先 + `latest_run_started_at` DESC（字符串比较即可，SQLite datetime 格式 `"YYYY-MM-DD HH:MM:SS"` 天然可字符串排序）
  - null 值排在最后

**名称回退（REQ-SL-014）：**
- 修改 `fallbackTitle`（line 518）：
  - 当前：`ptName + (timeStr ? ' ' + timeStr : '')`
  - 改为：`s.platform + ' · ' + ptName + ' · ' + timeStr`
  - 平台名映射（如 `claude` → `Claude`、`opencode` → `OpenCode`、`codex` → `Codex`）
  - 若心跳时间不存在则省略时间部分
### out_of_scope:
- 不修改 SSE 推送的排序（SSE 为原始数据推送，前端排序覆盖）
- 不新增 UI 元素
- 不修改 tooltip 格式
### input_documents: docs/requirements/2026-05-08-session-list-v2-improvements.md
### allowed_paths: src/web/views/pipeline.html
### forbidden_paths: src/engine/db.ts, src/engine/server.ts, src/engine/gates.ts, src/web/routes.ts
### dependencies: TASK-001（需 `/api/sessions` 返回 `latest_run_started_at`）
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-004（修改不同文件）
### wait_for: TASK-001
### acceptance_criteria:
1. 会话列表按 `latest_run_started_at` 倒序排列（最新的 run 在最前）
2. 置顶会话不受时间排序影响，始终在顶部
3. 无 run 的会话排在列表末尾（`latest_run_started_at` 为 null）
4. 平台筛选后排序规则不变（在 `sorted` 之前已做 `filter`）
5. 无 task_name 的会话显示 `Claude . 完整流水线 . 23:03` 格式
6. 有 task_name 的会话保持显示 task_name（不受影响）
7. 平台名正确映射（`claude` → `Claude`，`opencode` → `OpenCode`，`codex` → `Codex`）
### test_strategy: manual_only（UI 视觉验证：启动应用 → 检查会话排序 → 检查回退标题格式）
### handoff_notes: `latest_run_started_at` 格式为 SQLite datetime 字符串（如 `"2026-05-08 14:30:00"`），可直接用于字符串比较。平台名映射使用简单对象字面量（不超过 3 个平台）。完成后通知 TASK-006 可启动。
### escalation_rule: 如果 `latest_run_started_at` 字段在 API 响应中不存在（TASK-001 未正确传递），回编排者确认 TASK-001 完成状态。

---

### task_id: TASK-006
### task_name: 状态指示点左移 + 恢复按钮迁移到看板操作栏
### requirement_ids: REQ-SL-006, REQ-SL-007
### owner: frontend-dev-expert
### objective: 将状态指示点移到标题左侧、删除侧边栏恢复按钮、在看板操作栏新增恢复按钮
### in_scope:
**状态指示点左移（REQ-SL-006）：**
- Row 1（line 536-537）：将状态指示圆点 `<span class="w-2 h-2...">` 从标题右侧移到标题左侧
- 新布局：`[📌 pinIcon] [● statusDot] [标题文字 displayTitle]`
- 调整 flex 布局使标题正确填充剩余空间

**恢复按钮迁移（REQ-SL-007）：**
- Row 2（line 542）：删除休眠会话的恢复按钮（`isInactive` 条件分支的 `<button>`）
- 看板操作栏：在 `pipeline.html` 看板区域（Gate 卡片上方、标题旁边）新增恢复按钮
- 仅当 `selectedSession` 对应会话状态为 `inactive` 时显示
- 点击调用 `resumeSession(sid)`（函数已在 line 573 定义）
- 按钮样式与操作栏协调
### out_of_scope:
- 不修改恢复按钮的 API 调用逻辑（复用 `resumeSession()`）
- 不修改看板其他按钮布局
- 不修改归档面板
### input_documents: docs/requirements/2026-05-08-session-list-v2-improvements.md
### allowed_paths: src/web/views/pipeline.html
### forbidden_paths: src/engine/db.ts, src/engine/server.ts, src/engine/gates.ts, src/web/routes.ts
### dependencies: TASK-005（同一文件 pipeline.html，需在其变更基础上修改）
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: []
### wait_for: TASK-005
### acceptance_criteria:
1. 状态指示圆点显示在标题文字的左侧（📌 和标题之间）
2. 置顶标记（📌）仍在状态点左侧
3. Row 1 布局：`[📌] [●] [标题文字]`
4. 休眠会话的侧边栏项中无恢复按钮
5. 选中休眠会话后，看板顶部操作栏出现「恢复会话」按钮
6. 点击恢复按钮发送 `POST /api/sessions/:id/resume`，行为不变
7. 选中活跃会话时恢复按钮不显示
8. 恢复按钮样式与现有操作栏协调
### test_strategy: manual_only（UI 交互验证：检查不同状态会话的侧边栏布局 → 选中休眠会话 → 验证看板按钮 → 点击恢复）
### handoff_notes: 恢复按钮的 HTML/CSS 需与现有操作栏风格一致。`resumeSession()` 函数已通过 `refresh()` 处理后续状态更新，无需修改。完成后通知 TASK-007。
### escalation_rule: 如果操作栏结构复杂（按钮组合/响应式布局），需要帮助定位最佳放置位置，可回编排者讨论方案。

---

### task_id: TASK-007
### task_name: 更多（⋮）菜单所有会话可操作
### requirement_ids: REQ-SL-009
### owner: frontend-dev-expert
### objective: 使所有会话的更多菜单按钮可点击，根据 run 状态动态禁用/启用菜单项
### in_scope:
- 修改 `hasActiveRun` 条件渲染逻辑（line 524, 544-559）
- 移除两套分支（有 run 可点击 vs 无 run 禁用），合并为统一渲染
- 所有会话的 ⋮ 按钮始终渲染为可点击
- 菜单内三个选项根据 `hasActiveRun` 动态设置 class：
  - 有 run：全部可用
  - 无 run：置顶 + 归档 → `text-slate-300 cursor-not-allowed pointer-events-none`；删除 → 始终 `text-red-500 hover:bg-red-50`
- 确保 `event.stopPropagation()` 不丢失
### out_of_scope:
- 不新增菜单项
- 不修改归档/删除的实际 API 调用逻辑
- 不修改置顶/取消置顶逻辑
### input_documents: docs/requirements/2026-05-08-session-list-v2-improvements.md
### allowed_paths: src/web/views/pipeline.html
### forbidden_paths: src/engine/db.ts, src/engine/server.ts, src/engine/gates.ts, src/web/routes.ts
### dependencies: TASK-006（同一文件 pipeline.html）
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: []
### wait_for: TASK-006
### acceptance_criteria:
1. 点击任意会话的 ⋮ 按钮均弹出菜单（无 run 会话也不例外）
2. 无 run 会话：置顶/归档选项置灰禁用（`text-slate-300 cursor-not-allowed`），不可点击
3. 有 run 会话：全部三个选项正常可用
4. 删除选项始终使用危险红色（`text-red-500 hover:bg-red-50`）
5. 菜单始终显示三个选项：置顶/取消置顶、归档、删除
6. 点击菜单项不触发 `selectSession`（event.stopPropagation 生效）
### test_strategy: manual_only（UI 交互验证：点击有 run 会话的 ⋮ → 验证 3 个选项可用 → 点击无 run 会话的 ⋮ → 验证置顶/归档禁用 → 验证删除红色可用）
### handoff_notes: 当前两套分支差异较大（有 run：完整菜单 HTML；无 run：单个禁用按钮）。合并后需确保 DOM 结构一致。`pointer-events-none` 是 Tailwind 的 `pointer-events: none` 工具类。完成后通知 TASK-008。
### escalation_rule: 如果 `toggleRunMenu`、`deleteRunFromMenu`、`archiveRunFromMenu`、`togglePin` 等函数因菜单项动态禁用而需要适配，回编排者确认函数签名是否需要调整。

---

### task_id: TASK-008
### task_name: 去掉指令标签 "/" 前缀
### requirement_ids: REQ-SL-010
### owner: frontend-dev-expert
### objective: 修改 `COMMAND_LABELS` 常量，去掉 label 值的 "/" 前缀
### in_scope:
- 修改 `COMMAND_LABELS` 对象（line 312-317），将 4 个 label 的 `/` 前缀去掉：
  - `/jarvis` → `jarvis`
  - `/jarvis-lite` → `jarvis-lite`
  - `/jarvis-fe` → `jarvis-fe`
  - `/jarvis-be` → `jarvis-be`
- 检查所有对 `cmd.label` 的引用（`renderSessions` line 511/540、runs 列表 line 952），确认无 `startsWith('/')` 等依赖前缀的逻辑
### out_of_scope:
- 不新增指令类型
- 不修改 CSS 类名
- 不修改平台筛选逻辑
### input_documents: docs/requirements/2026-05-08-session-list-v2-improvements.md
### allowed_paths: src/web/views/pipeline.html
### forbidden_paths: src/engine/db.ts, src/engine/server.ts, src/engine/gates.ts, src/web/routes.ts
### dependencies: TASK-007（同一文件 pipeline.html）
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: []
### wait_for: TASK-007
### acceptance_criteria:
1. 侧边栏会话项显示的指令标签为 `jarvis` / `jarvis-lite` / `jarvis-fe` / `jarvis-be`（无 `/`）
2. Runs 历史面板中的指令标签同样无 `/` 前缀（line 952 处的 `COMMAND_LABELS` 引用）
3. 平台筛选、状态判断等其他逻辑不受影响
### test_strategy: manual_only（UI 视觉验证：打开看板 → 检查侧边栏指令标签文本 → 检查 Runs 面板指令标签文本）
### handoff_notes: 这是本次最小的变更（~5 行，4 个常量值替换）。确认 `cmd.label` 在 `pipeline.html` 中的使用处仅做展示用途（`renderSessions` line 540 和 runs 渲染 line 952），无额外的字符串匹配逻辑。完成后通知 TASK-009。
### escalation_rule: 若发现有代码依赖 `cmd.label.startsWith('/')` 做逻辑判断，回编排者确认处理方式。

---

### task_id: TASK-009
### task_name: 门禁文档会话过滤 — 前端
### requirement_ids: REQ-SL-011
### owner: frontend-dev-expert
### objective: Gate 卡片空状态提示 + 确认 artifacts 已按 session 过滤
### in_scope:
- 修改 artifacts 渲染（line 425-427）：当 `g.artifacts` 为空数组时，显示「暂无产物文件」提示文字
- 提示文字样式：`text-[10px] text-slate-300 italic`
- 确认 artifacts 列表只显示当前 session 的文档（后端 TASK-003 已完成过滤）
### out_of_scope:
- 不修改 artifacts 的文件名显示格式
- 不新增 artifacts 操作按钮（点击功能在 TASK-010）
- 不修改 Gate 卡片的其他部分
### input_documents: docs/requirements/2026-05-08-session-list-v2-improvements.md
### allowed_paths: src/web/views/pipeline.html
### forbidden_paths: src/engine/db.ts, src/engine/server.ts, src/engine/gates.ts, src/web/routes.ts
### dependencies: TASK-003（后端过滤）、TASK-008（pipeline.html 串行）
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: []
### wait_for: TASK-008
### acceptance_criteria:
1. Gate 卡片中有 artifacts 时正常展示文件名列表（与目前行为一致）
2. Gate 卡片中无 artifacts 时显示「暂无产物文件」
3. 提示文字样式符合设计（小号、浅灰、斜体）
4. 切换会话后 artifacts 列表自动更新（通过 refresh 轮询 + 后端过滤）
### test_strategy: manual_only（切换不同 session → 验证 Gate 卡片 artifacts 列表变化 → 验证无产物 session 显示提示文字）
### handoff_notes: TASK-003 确保 `/api/pipeline` 返回的 artifacts 已过滤。前端仅需添加空状态 UI。完成后通知 TASK-010（需要 artifacts 点击事件的基础——当前为 `<span>`，TASK-010 将其改为 `<button>`）。
### escalation_rule: 如果切换会话后 artifacts 始终为空或始终显示全部文档，说明后端过滤未生效，回编排者检查 TASK-003 完成状态。

---

### task_id: TASK-010
### task_name: 文档名点击滑出抽屉展示 MD
### requirement_ids: REQ-SL-012
### owner: frontend-dev-expert
### objective: 点击 Gate 卡片中文档名时，右侧滑出抽屉面板展示 Markdown 渲染内容
### in_scope:
**CSS（`<style>` 块，~20 行）：**
- 新增 `.drawer-overlay`（遮罩层）：`fixed inset-0 bg-black/30 z-40` + transition opacity
- 新增 `.drawer-panel`（抽屉面板）：`fixed right-0 top-0 h-full z-50` + `translateX(100%)` → `translateX(0)` transition
- 新增 `.drawer-open` / `.drawer-closed` 状态类

**HTML（`<body>` 底部，~15 行）：**
- 遮罩层 `<div class="drawer-overlay">` + onclick 关闭
- 抽屉面板 `<div class="drawer-panel">` 包含：标题栏（文件名 + 关闭按钮）+ 内容区 `<div id="drawerContent">`

**CDN 引入（`<script>` 标签，1 行）：**
- `<script src="https://cdn.jsdelivr.net/npm/marked@15.0.0/marked.min.js"></script>`（固定版本）

**JS 逻辑（`<script>` 块，~40 行）：**
- `openDocDrawer(filepath)`：调用 `fetch('/api/docs/' + encodeURIComponent(filepath))` → 获取内容 → 调用 `renderMarkdown(text)` → 插入抽屉内容区 → 显示抽屉
- `closeDocDrawer()`：隐藏抽屉
- `renderMarkdown(text)`：使用 `marked.parse()` 渲染 Markdown 为 HTML
- 错误处理：fetch 失败显示「文件读取失败」+ 错误信息
- Escape 键关闭：`document.addEventListener('keydown', ...)`
- 点击另一文档名：更新抽屉内容而非重新打开

**artifacts 渲染修改（~5 行）：**
- 将 `<span class="text-[10px]...">` 改为 `<button class="text-[10px]...">` 并添加 `onclick="openDocDrawer('<path>')"`
### out_of_scope:
- 不支持编辑文档
- 不支持文档内搜索
- 不支持代码语法高亮（marked.js 默认仅渲染标准 Markdown）
- 不新增 npm 依赖
- 不支持移动端响应式（视口宽度按 % 自适应）
### input_documents: docs/requirements/2026-05-08-session-list-v2-improvements.md
### allowed_paths: src/web/views/pipeline.html
### forbidden_paths: src/engine/db.ts, src/engine/server.ts, src/engine/gates.ts, src/web/routes.ts
### dependencies: TASK-004（文档读取 API）、TASK-009（pipeline.html 串行 + artifacts 渲染基础）
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: []
### wait_for: TASK-004, TASK-009
### acceptance_criteria:
1. 点击 Gate 卡片中的文档文件名 → 右侧抽屉从右滑入（~0.3s transition）
2. 抽屉宽度约 50-60% 视口宽度（`w-[55vw]` 或 `min-w-[50vw]`）
3. 抽屉内正确渲染 Markdown（标题 `#`~`####`、列表 `-`、代码块 \`\`\`、粗体/斜体）
4. 抽屉顶部显示文件名（用 `split('/').pop()` 提取）和关闭按钮（X 图标）
5. 点击关闭按钮 → 抽屉滑回关闭
6. 点击遮罩层 → 抽屉滑回关闭
7. 按 Escape 键 → 抽屉关闭
8. 文件读取失败时，抽屉内显示红色错误提示（如「文件读取失败：<错误信息>」）
9. 再次点击另一文档名 → 抽屉内容更新为新文档（不重新打开动画）
10. 点击文档名时的事件不冒泡触发 Gate 卡片其他行为
### test_strategy: manual_only（UI 交互验证：点击文档名 → 抽屉滑出 → 验证 MD 渲染 → 关闭测试 → 错误测试 → 切换文档测试 → Escape 键测试）
### handoff_notes:
- `fetchAPI()` 返回的是 JSON，不适合文档内容获取（文档返回 text/plain）。需使用原生 `fetch()` 或修改 `fetchAPI` 使其支持 text 响应。建议新增 `fetchDoc(path)` 辅助函数。
- `marked.parse()` 若 CDN 加载失败会抛出 ReferenceError，请在调用前检查 `typeof marked !== 'undefined'`，失败时直接显示原始文本。
- 确保 `<button>` 的 `onclick` 中调用 `event.stopPropagation()` 防止冒泡。
- 抽屉 HTML 放在 `</body>` 之前、`</script>` 闭合标签之后。
### escalation_rule: 若 marked.js CDN 加载失败（网络问题），可降级为 `<pre>` 展示原始 Markdown 文本。若降级方案仍不可行，回编排者。

---

## 14. plan patch / contract change request 触发条件

以下情况触发 plan patch（回编排者）：

1. **数据库查询性能问题**：LEFT JOIN 导致 `getSessions()` 查询时间显著增加（> 50ms for <100 sessions）
2. **routes.ts 合并冲突**：任意两个任务的 Edit 因 old_string 不再唯一而失败
3. **pipeline.html 串行断裂**：前端任务无法在前一任务 diff 基础上正确应用变更
4. **API 响应格式变更**：任何端点的响应 JSON 键名/类型/结构发生变化
5. **类型检查失败**：`npm run typecheck` 因本次变更报错且无法在任务内修复
6. **vitest 基础设施问题**：Hono 的 `app.request()` 在测试中不可用，需调整测试策略
7. **CDN 不可用**：marked.js CDN 无法加载且无合适的替代方案

## 15. 推荐的下一步

1. **编排者** 按 Batch 1-9 顺序 launch subagent，每个 Batch 完成后检查输出
2. **优先启动 Batch 1+2**（TASK-002 + TASK-001 同时启动），这是后端基础
3. **Batch 3**（TASK-003）紧随其后，完成 routes.ts 的核心变更
4. **Batch 4**（TASK-004 + TASK-005 并行）最大化吞吐
5. **Batch 9**（TASK-010）完成后，启动 `qa-review-expert` 做全量审查
6. 审查通过后运行 `npm test && npm run typecheck && npm run build` 做最终验证

---

## 附录 A：文件变更汇总

| 文件 | 任务 | 变更行数 | 变更类型 |
|------|------|---------|---------|
| `src/engine/db.ts` | TASK-001 | ~15 | SQL 查询修改 |
| `src/engine/server.ts` | TASK-002 | ~20 | 业务逻辑新增 |
| `src/engine/gates.ts` | TASK-003 | ~25 | 新增函数 |
| `src/web/routes.ts` | TASK-001, TASK-003, TASK-004 | ~60 | 3 处修改 + 1 新增端点 |
| `src/web/views/pipeline.html` | TASK-005~TASK-010 | ~245 | 6 次串行修改 |
| `tests/docs-api.test.ts` | TASK-004 | ~50 | 新增测试文件（TDD） |
| **总计** | | **~415** | 含测试代码 ~415 行，不含约 ~365 行 |

> 变更行数略超任务文档预估的 ~320 行（差额主要来自 TASK-004 测试代码 ~50 行）。仍在 <1000 行安全阈值内。

## 附录 B：Gate B 检查结果

| 检查项 | 状态 |
|--------|------|
| 任务 ID 完整（TASK-XXX 格式） | 通过 |
| 每个任务映射到至少一个 REQ-XXX | 通过（见任务文档 REQ -> TASK 追溯矩阵） |
| 类型完整（前端/后端/测试） | 通过 |
| 优先级 + 完成标准完整 | 通过 |
| DDD 分类完整 | 通过（全部 Direct 或 TDD） |
| TDD / Direct 分类完整 | 通过（仅 TASK-004 为 TDD） |
| 风险任务已标注 | 通过（TASK-003, TASK-004, TASK-010 标注为中风险） |
| 文件所有权提醒已写明 | 通过（见任务文档文件所有权矩阵） |
| test_strategy 全部指定 | 通过（tdd: 1, test_after: 2, manual_only: 7） |
| 单轮次变更 <1000 行 | 通过（~415 行） |
| 无水平切片 | 通过（全部垂直切片） |
| E2E 测试不与其他测试同 Batch | 通过（本轮次无 E2E 测试任务） |

## 附录 C：垂直切片检查

| 任务 | 是否端到端可验证 | 验证方式 |
|------|-----------------|---------|
| TASK-001 | 是 | curl /api/sessions → 检查排序和 latest_run_started_at 字段 |
| TASK-002 | 是 | MCP pipeline_init 调用 → 检查数据库 task_name |
| TASK-003 | 是 | 切换 session → curl /api/pipeline → 检查 artifacts 不同 |
| TASK-004 | 是 | vitest 测试 + curl /api/docs/:filepath |
| TASK-005 | 是 | 启动应用 → 检查 UI 排序 + 回退标题 |
| TASK-006 | 是 | 启动应用 → 检查 UI 布局 + 恢复按钮 |
| TASK-007 | 是 | 启动应用 → 检查更多菜单交互 |
| TASK-008 | 是 | 启动应用 → 检查指令标签文本 |
| TASK-009 | 是 | 切换 session → 检查 Gate 卡片空状态 |
| TASK-010 | 是 | 点击文档名 → 检查抽屉滑出 + MD 渲染 |

全部 10 个任务均为垂直切片，无水平切片。
