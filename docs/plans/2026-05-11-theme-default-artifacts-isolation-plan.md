# 执行计划：主题默认化 + Artifacts 数据库隔离 + Bug 修复 + 文档更新

**日期**：2026-05-11
**计划者**：planner
**关联需求文档**：`docs/requirements/2026-05-10-theme-default-artifacts-isolation.md`
**关联任务文档**：`docs/tasks/2026-05-10-theme-default-artifacts-isolation-tasks.md`
**关联架构评审**：
- `docs/architecture/2026-05-11-artifacts-db-backend-review.md`（后端）
- `docs/architecture/2026-05-11-artifacts-db-schema-review.md`（数据库）

---

## 1. 当前轮次目标

在单个轮次内完成全部 9 个 TASK，覆盖 7 个 REQ（REQ-025 ~ REQ-031），交付：
- antd 显式 token 主题配置（REQ-025）
- Artifacts 数据库精确关联（REQ-026）
- 会话列表乐观更新 + 回滚（REQ-027）
- MD 预览抽屉 resizable 修复（REQ-028）
- 项目文档更新（REQ-029）
- 16 个 Mermaid 命令流程图（REQ-030）
- 旧数据库清理 + 全局重装（REQ-031）

## 2. 当前轮次范围

全部 9 个 TASK，分为 3 个 Batch，含 1 个 TDD 任务的前端状态测试。

| 维度 | 详情 |
|------|------|
| 前端变更 | 4 个文件（theme.tsx, App.tsx, Layout.tsx, Dashboard.tsx） |
| 后端变更 | 3 个文件（db.ts, gates.ts, server.ts） + 1 个微调（routes.ts） |
| 文档变更 | 3 个文件（README.md, AGENTS.md, CLAUDE.md） + 16 个新建（docs/flows/*.md） |
| 运维操作 | 1 项（清理旧数据库 + 全局重装） |
| 预估总变更行数 | ~860 行（≤1000 行安全阈值） |

## 3. 完成标准

- [ ] `ConfigProvider` 使用显式 token 而非仅 `defaultAlgorithm`（REQ-025）
- [ ] Artifacts 表自动创建，`findSessionGateArtifacts` 通过 run_id 精确查询（REQ-026）
- [ ] 置顶/归档/删除操作后 UI 立即更新，失败时回滚（REQ-027）
- [ ] Drawer 拖拽手柄可见，可调整 380-900px 宽度（REQ-028）
- [ ] README 含平台维护声明 + 产物目录规范；AGENTS.md 含 OpenCode/Codex 不同步约束（REQ-029）
- [ ] 16 个 Mermaid 流程图覆盖所有命令，README 含链接（REQ-030）
- [ ] 旧数据库已删除，引擎重启后侧边栏会话数为 0（REQ-031）
- [ ] `npm run lint` + `npm run typecheck` + `npm run build:web` 全部通过

## 4. 是否需要先查阅 code-explore-expert / docs-research-expert

**不需要**。计划者已完整读取以下源文件，架构评审已提供充分上下文：
- `src/engine/db.ts` — 当前 schema 和所有 CRUD 函数
- `src/engine/gates.ts` — 当前 `findSessionGateArtifacts` 和 `findGateArtifacts` 实现
- `src/engine/server.ts` — 当前 `advance_gate` MCP 工具完整流程
- `src/web/routes.ts` — 当前 API handler 调用 `findSessionGateArtifacts` 的位置
- `web/src/theme.tsx` — 当前仅使用 `theme.defaultAlgorithm`
- `web/src/App.tsx` — 当前 `{...defaultTheme}` 展开方式
- `web/src/components/Layout.tsx` — 当前 `handlePin`/`handleArchive`/`handleDelete`（无乐观更新）
- `web/src/pages/Dashboard.tsx` — 当前 Drawer（仅 `resizable` 无 `minWidth`/`maxWidth`）
- `README.md` — 当前结构和内容
- `AGENTS.md` — 当前 16 条关键约束
- `CLAUDE.md` — 当前极简引用（仅指向 AGENTS.md）

## 5. 执行代理分工

| 任务 | 代理类型 | 理由 |
|------|---------|------|
| TASK-001 | `frontend-ui-expert` | 主题/token 配置为视觉展示层变更，修改 `theme.tsx` |
| TASK-002 | `backend-data-expert` | 数据库 schema 设计 + CRUD 函数，操作 `db.ts` |
| TASK-003 | `backend-dev-expert` | 多文件后端实现（gates.ts + server.ts + routes.ts），涉及领域服务和查询策略重构 |
| TASK-004 | `frontend-state-expert` | TDD 状态管理，乐观更新/SSE 覆盖/失败回滚 |
| TASK-005 | `frontend-ui-expert` | UI 属性修复，antd Drawer `minWidth`/`maxWidth` 配置 |
| TASK-006 | `backend-dev-expert` | 项目级文档更新，需理解引擎架构和产物目录规范 |
| TASK-007 | `backend-dev-expert` | AGENTS.md + CLAUDE.md 约束更新，需理解全项目架构 |
| TASK-008 | `backend-dev-expert` | 16 个 Mermaid 流程图需逐一理解命令 Gate 序列和 Agent 调度逻辑 |
| TASK-009 | `infra-deploy-expert` | 运维操作：停止引擎、删除数据库、全局重装、重启引擎 |

## 6. 共享区域改动归属

| 共享文件 | 唯一责任方 | 处理方式 |
|---------|-----------|---------|
| `src/engine/db.ts` | TASK-002 | TASK-002 独占修改（新增表 + CRUD），TASK-003 仅引用其导出 |
| `src/engine/gates.ts` | TASK-003 | TASK-003 独占修改，无外部冲突 |
| `src/engine/server.ts` | TASK-003 | TASK-003 独占修改，无外部冲突 |
| `src/web/routes.ts` | TASK-003 | TASK-003 独占修改（仅传参调整），无外部冲突 |
| `README.md` | TASK-006 → TASK-008 | 串行：TASK-006 先完成结构调整 → TASK-008 在此基础上添加链接 |
| `web/src/theme.tsx` | TASK-001 | TASK-001 独占修改 |
| `web/src/App.tsx` | TASK-001 | TASK-001 独占修改 |
| `web/src/components/Layout.tsx` | TASK-004 | TASK-004 独占修改 |
| `web/src/pages/Dashboard.tsx` | TASK-005 | TASK-005 独占修改 |
| `AGENTS.md` | TASK-007 | TASK-007 独占修改 |
| `CLAUDE.md` | TASK-007 | TASK-007 独占修改 |
| `docs/flows/*.md`（16 个） | TASK-008 | TASK-008 独占创建，全部新文件 |

## 7. 并行 / 串行策略

### 依赖链

```
TASK-002 (db.ts 建表+CRUD) ──→ TASK-003 (重构查询 + artifacts 记录)
TASK-006 (README 结构调整) ──→ TASK-008 (README 加链接 + 16 流程图)
```

### 同批并行判断

| 任务对 | 是否冲突 | 判断依据 |
|--------|---------|---------|
| TASK-001 vs TASK-005 | 无冲突 | theme.tsx/App.tsx vs Dashboard.tsx — 不同文件 |
| TASK-001 vs TASK-004 | 无冲突 | theme.tsx/App.tsx vs Layout.tsx — 不同文件 |
| TASK-004 vs TASK-005 | 无冲突 | Layout.tsx vs Dashboard.tsx — 不同文件 |
| TASK-002 vs TASK-006 | 无冲突 | db.ts vs README.md — 不同文件，不同层 |
| TASK-001/004/005/007 vs TASK-002/006 | 无冲突 | 前端文件 vs 后端/文档文件 — 完全隔离 |
| TASK-003 vs TASK-008 | 无冲突 | gates.ts/server.ts/routes.ts vs docs/flows/*.md — 完全隔离 |

### 总并行策略

```
Round 1: Batch 1（6 个任务同时启动，完全无文件冲突）
  ├── TASK-001 (frontend-ui-expert) — theme.tsx + App.tsx
  ├── TASK-002 (backend-data-expert) — db.ts artifacts 表+CRUD
  ├── TASK-004 (frontend-state-expert) — Layout.tsx TDD
  ├── TASK-005 (frontend-ui-expert) — Dashboard.tsx Drawer
  ├── TASK-006 (backend-dev-expert) — README.md 更新
  └── TASK-007 (backend-dev-expert) — AGENTS.md + CLAUDE.md

Round 2: Batch 2（依赖 Batch 1 特定任务完成）
  ├── TASK-003 (backend-dev-expert) — 依赖 TASK-002 完成
  └── TASK-008 (backend-dev-expert) — 依赖 TASK-006 完成
  （TASK-003 和 TASK-008 无共享文件冲突，可并行）

Round 3: Batch 3（依赖 Batch 1 + Batch 2 全部代码变更完成）
  └── TASK-009 (infra-deploy-expert) — 清理旧数据库 + 全局重装
```

## 8. 风险提醒

| # | 风险 | 等级 | 缓解措施 |
|---|------|------|---------|
| 1 | TASK-002 使用 `node:sqlite` (DatabaseSync) 同步 API，误用异步模式 | 中 | Execution Packet 中明确标注技术栈约束，backend-data-expert 启动时需读取 `src/engine/db.ts` 确认现有 API 风格 |
| 2 | TASK-003 修改 `advance_gate` 核心路径，扫描错误可能阻塞 Gate 推进 | 中 | 使用 try/catch 包裹扫描逻辑，扫描失败不影响 Gate advance；INSERT OR IGNORE 确保幂等 |
| 3 | TASK-003 `findSessionGateArtifacts` 函数签名变更，routes.ts 调用点在 Batch 中同步修改 | 中 | TASK-003 负责全部 3 个文件（gates.ts + server.ts + routes.ts），不拆分 |
| 4 | TASK-004 乐观更新 + SSE 覆盖可能导致 UI 闪烁 | 中 | TDD 先写测试覆盖竞态场景；SSE 覆盖用 ref 避免 stale closure |
| 5 | TASK-008 16 个流程图文件需保持一致的 Mermaid 模板风格 | 中 | 提供统一模板，按命令类别分批创建：先核心编排类 → 再开发生命周期类 → 最后审查/专家类 |
| 6 | TASK-009 删除旧数据库不可逆 | 低 | 执行前提示备份；WAL/SHM 文件一并删除 |
| 7 | 单轮次 9 个任务，编排复杂度高 | 低 | 清晰的 3 Batch 结构 + 明确依赖关系 + 6 个并行任务无文件冲突 |

### 垂直切片检查

所有任务均满足垂直切片原则：
- TASK-001：完整主题配置（从 theme.tsx 到 App.tsx 集成）→ 可独立验证视觉
- TASK-002：完整数据层（表创建 + CRUD 导出）→ 可独立验证 engine 启动
- TASK-003：完整业务逻辑（写入 + 查询 + API 集成）→ 可独立验证产物关联
- TASK-004：完整交互功能（乐观更新 + API 调用 + 回滚）→ 可独立验证 UI 行为
- TASK-005：完整 UI 修复（属性配置 + 拖拽交互）→ 可独立验证抽屉可调
- TASK-006/007/008：独立文档交付物 → 可独立验证内容
- TASK-009：独立运维操作 → 可独立验证数据库状态

**结论：无水平切片问题，无需回退 task-design。**

## 9. 实现者交接信息

### 对 qa-review-expert 的说明

- **TASK-004 是唯一 TDD 任务**：review 时重点检查测试是否在实现前编写、测试是否覆盖了回滚和竞态场景
- **TASK-002 + TASK-003 是 DDD 任务**：review 时检查 artifacts 表的聚合边界是否正确、INSERT OR IGNORE 幂等性是否生效
- **架构评审 P0 项已全部嵌入 Execution Packet**：实现者必须遵守

### 对 orchestration-expert 的说明

- Batch 1 的 6 个任务完全独立，可在同一轮 `Task` spawn 中并行发送
- Batch 2 必须在 Batch 1 全部完成后启动（TASK-002 和 TASK-006 完成后才能开始 TASK-003 和 TASK-008）
- Batch 2 的两个任务（TASK-003 和 TASK-008）无互相依赖，可再次并行
- Batch 3 必须在所有代码变更完成后执行

## 10. Execution Packets

---

## parallel_batches

### Batch 1（无依赖，可同时启动）

- TASK-001 → subagent_type: frontend-ui-expert
- TASK-002 → subagent_type: backend-data-expert
- TASK-004 → subagent_type: frontend-state-expert
- TASK-005 → subagent_type: frontend-ui-expert
- TASK-006 → subagent_type: backend-dev-expert
- TASK-007 → subagent_type: backend-dev-expert

### Batch 2（依赖 Batch 1 全部完成，内部 TASK-003/TASK-008 可并行）

- TASK-003 → subagent_type: backend-dev-expert（须等待 TASK-002 完成）
- TASK-008 → subagent_type: backend-dev-expert（须等待 TASK-006 完成）

### Batch 3（依赖 Batch 1 + Batch 2 全部代码变更完成）

- TASK-009 → subagent_type: infra-deploy-expert

---

### task_id: TASK-001
### task_name: 替换主题为 antd 显式 token 配置
### requirement_ids: REQ-025
### owner: frontend-ui-expert
### objective: 将 `theme.tsx` 从仅使用 `theme.defaultAlgorithm` 替换为显式 token 配置，主色改为蓝色 `#1677ff`
### in_scope:
- 重写 `web/src/theme.tsx`，使用显式 token 配置
- 主色 `#1677ff`，成功 `#52c41a`，警告 `#faad14`，错误 `#ff4d4f`
- 圆角 `borderRadius: 6`，各级别 XS=2 / SM=4 / LG=8
- 间距体系 padding/margin：16/12/24
- 阴影使用 antd 默认 boxShadow/boxShadowSecondary 值
- 检查 `web/src/App.tsx` 中 `{...defaultTheme}` 展开方式是否兼容
### out_of_scope:
- `algorithm` 字段（使用显式 token 后不再需要 darkAlgorithm/defaultAlgorithm）
- 其他页面样式修改
- 组件级 token 覆盖（仅全局 ConfigProvider token）
### input_documents:
- `docs/requirements/2026-05-10-theme-default-artifacts-isolation.md`（REQ-025）
- `docs/tasks/2026-05-10-theme-default-artifacts-isolation-tasks.md`（TASK-001）
### allowed_paths:
- `web/src/theme.tsx`
- `web/src/App.tsx`
### forbidden_paths:
- `src/engine/` 下所有文件
- `web/src/components/` 下所有文件
- `web/src/pages/` 下所有文件
- `README.md`、`AGENTS.md`、`CLAUDE.md`
### dependencies: 无外部依赖
### required_skills: behavioral-guidelines code-standards source-driven-development incremental-implementation verification-before-completion
### parallel_group: TASK-004, TASK-005, TASK-007
### wait_for: 无
### acceptance_criteria:
1. `ConfigProvider` 使用显式 token 而非仅 `defaultAlgorithm`
2. 主色为蓝色 `#1677ff`（非之前的绿色 `#52C41A`）
3. 圆角/间距/阴影与指定值一致
4. 所有页面（Dashboard/Agents/Archive）视觉正常，无样式错乱
5. `npm run build:web` 成功
### test_strategy: manual_only（纯配置替换，无业务逻辑。验证方式：`npm run build:web` 构建成功 + 视觉检查）
### handoff_notes: 确认 `App.tsx` 中 `{...defaultTheme}` 展开仍然有效（新 theme 结构为 `{ theme: { token: {...} } }`，与 antd ConfigProviderProps 类型兼容）
### escalation_rule: 如需变更 `App.tsx` 的 ConfigProvider 包裹方式，先报告不能直接改

---

### task_id: TASK-002
### task_name: 新增 artifacts 数据库表与 CRUD 函数
### requirement_ids: REQ-026
### owner: backend-data-expert
### objective: 在 `initSchema` 中新增 artifacts 表并导出 3 个 CRUD 函数
### in_scope:
- `initSchema()` 中新增 `CREATE TABLE IF NOT EXISTS artifacts` DDL
- 字段：id (PK AUTOINCREMENT), run_id (TEXT NOT NULL), gate (TEXT NOT NULL), filepath (TEXT NOT NULL), created_at (TEXT DEFAULT datetime('now'))
- 唯一约束：`UNIQUE(run_id, gate, filepath)`
- 导出 `insertArtifact(db, runId, gate, filepath)` — 使用 `INSERT OR IGNORE`
- 导出 `getArtifactsByRun(db, runId)` — 获取某 run 的所有产物
- 导出 `getArtifactsByRunAndGate(db, runId, gate)` — 按 run+gate 精确查询
- engine 启动时建表不报错（`IF NOT EXISTS`）
- 同步清理 `deleteRun()` — 删除 pipeline_run 时级联删除关联 artifacts 记录
### out_of_scope:
- 修改现有表结构（pipeline/checkpoints/sessions/agent_models/pipeline_runs）
- `findSessionGateArtifacts` 重构（属于 TASK-003）
- `advance_gate` 中的 artifact 写入逻辑（属于 TASK-003）
- session_id 冗余列（按数据库架构评审建议：不添加，通过 JOIN pipeline_runs 获取）
- file_size / file_mtime 等元数据列（P2 建议，不纳入本轮）
- deleted 软删除列（P2 建议，不纳入本轮）
### input_documents:
- `docs/requirements/2026-05-10-theme-default-artifacts-isolation.md`（REQ-026）
- `docs/tasks/2026-05-10-theme-default-artifacts-isolation-tasks.md`（TASK-002）
- `docs/architecture/2026-05-11-artifacts-db-backend-review.md`
- `docs/architecture/2026-05-11-artifacts-db-schema-review.md`
### allowed_paths:
- `src/engine/db.ts`
### forbidden_paths:
- `src/engine/gates.ts`
- `src/engine/server.ts`
- `src/web/routes.ts`
- `web/` 下所有文件
### dependencies: 无外部依赖。现有 `pipeline_runs` 表已在 `initSchema` 中创建。
### required_skills: behavioral-guidelines code-standards source-driven-development incremental-implementation verification-before-completion
### parallel_group: TASK-001, TASK-004, TASK-005, TASK-006, TASK-007
### wait_for: 无
### acceptance_criteria:
1. `initSchema()` 中包含 `CREATE TABLE IF NOT EXISTS artifacts` 语句，ENGINE 启动无报错
2. `insertArtifact` 使用 `INSERT OR IGNORE`，同一 (run_id, gate, filepath) 第二次调用静默忽略
3. `getArtifactsByRunAndGate` 返回精确的结果集（无跨 run 污染）
4. `deleteRun` 删除 pipeline_runs 记录时同步删除关联 artifacts 记录
5. filepath 存储格式为相对路径（如 `requirements/REQ-001.md`），非绝对路径
6. 不使用 `better-sqlite3` API，所有操作使用 `DatabaseSync` 的 `db.prepare().run()/.get()/.all()`
### test_strategy: manual_only（数据层，无独立测试文件。验证方式：启动引擎确认建表无报错）
### handoff_notes:
- **关键约束**：必须使用 `node:sqlite` 的 `DatabaseSync` 同步 API（`db.prepare().run()/.get()/.all()`），不得使用 `better-sqlite3` 风格
- **filepath 格式**：存储相对于 `docs/` 根目录的路径，如 `"requirements/REQ-001.md"`（含子目录前缀）
- **幂等性**：`INSERT OR IGNORE` 不是 `INSERT OR REPLACE`（后者会触发 AUTOINCREMENT id 增长）
- **级联删除**：同步修改现有 `deleteRun()` 函数，在删除 pipeline_run 前先删除其 artifacts 记录
- 函数签名需与 TASK-003 的调用方式对齐（见 TASK-003 的 `input_documents` 中的实现指引）
- 导出函数供 TASK-003 使用，需确保 TypeScript 类型导出正确
### escalation_rule: 如需修改现有表结构（pipeline/checkpoints/sessions 等），必须先回编排者

---

### task_id: TASK-003
### task_name: 自动记录 artifact + 重构 findSessionGateArtifacts
### requirement_ids: REQ-026
### owner: backend-dev-expert
### objective: 在 Gate 推进时自动扫描产物目录并写入 artifacts 表，并将 `findSessionGateArtifacts` 改为 DB 精确查询（优先）+ 日期匹配回退（兼容）
### in_scope:
- `gates.ts`：重构 `findSessionGateArtifacts` — 新增可选参数 `runId`，优先 artifacts 表精确查询，空时回退日期匹配
- `server.ts`：在 `advance_gate` MCP 工具的 checkpoint 写入前，扫描 `docs/{gate_subdir}/` 下的 .md 文件并写入 artifacts 表
- `routes.ts`：修改 `/api/pipeline` handler — 传递 `run.id` 给 `findSessionGateArtifacts`（已有 `run` 变量）
- `routes.ts`：修改 `/api/gate/:gate/enforce` handler — 传递 `run_id` 给 `findSessionGateArtifacts`（需获取活跃 run）
- `routes.ts`：修改 `POST /api/gate/advance` handler — 同样在 advance 时扫描并写入 artifacts
- 向后兼容：旧 run 无 artifacts 记录时回退日期匹配，不影响现有功能
### out_of_scope:
- artifacts 表的 DDL 和 CRUD 函数（属于 TASK-002）
- `findGateArtifacts`（server.ts 使用的非 session 感知版本）的改造（架构评审 P1 建议，本轮不纳入）
- 新增 `register_artifact` MCP 工具（架构评审长期建议）
- 事务化写入（使用现有写入模式，不引入 `BEGIN IMMEDIATE`）
### input_documents:
- `docs/requirements/2026-05-10-theme-default-artifacts-isolation.md`（REQ-026）
- `docs/tasks/2026-05-10-theme-default-artifacts-isolation-tasks.md`（TASK-003）
- `docs/architecture/2026-05-11-artifacts-db-backend-review.md`
- `docs/architecture/2026-05-11-artifacts-db-schema-review.md`
### allowed_paths:
- `src/engine/gates.ts`
- `src/engine/server.ts`
- `src/web/routes.ts`
### forbidden_paths:
- `src/engine/db.ts`（TASK-002 独占，仅引用其导出）
- `web/` 下所有文件
### dependencies:
- TASK-002 的 3 个导出函数：`insertArtifact`, `getArtifactsByRun`, `getArtifactsByRunAndGate`
### required_skills: behavioral-guidelines code-standards source-driven-development incremental-implementation verification-before-completion
### parallel_group: TASK-008（无共享文件，可并行）
### wait_for: TASK-002
### acceptance_criteria:
1. `advance_gate`（MCP 工具）推进 Gate 后，`docs/{gate_subdir}/` 下 .md 文件自动写入 artifacts 表
2. `findSessionGateArtifacts` 优先查 artifacts 表（精确），空时回退日期匹配（兼容）
3. `/api/pipeline` 返回的 artifacts 准确反映当前 run 的产出
4. 不同 session 在同一天的产物不再互相污染
5. `INSERT OR IGNORE` 保证重复扫描不报错
6. 文件扫描失败不影响 Gate 推进（try/catch 包裹）
### test_strategy: manual_only（需运行中引擎验证。验证方式：触发一次流水线，在 Web Dashboard 确认产物列表准确）
### handoff_notes:
- **文件归属判断**：按架构评审 P0 建议 — 扫描 `docs/{gate_subdir}/` 下所有 .md 文件，不做文件名日期过滤（简化方案：只记录该 Gate 目录下当前存在的 .md 文件）
- **函数签名变更**：`findSessionGateArtifacts(docsDir, gate, sessionId, db, runId?)` — `runId` 为可选参数，用于兼容旧调用
- **routes.ts 修改重点**：
  - `/api/pipeline`（第 127 行）：已有 `run` 变量（`getActiveRun(db, s.id)`），传给 `findSessionGateArtifacts`
  - `/api/gate/:gate/enforce`（第 152 行）：需新增 `getActiveRun(db, sid)` 获取 run_id
  - `POST /api/gate/advance`（第 180-195 行）：已有 `run` 变量可用
- **server.ts 修改重点**：在 `addCheckpoint` 调用前（第 490 行附近）插入 artifact 扫描逻辑
- **扫描失败不阻塞 Gate**：用 try/catch 包裹扫描逻辑，失败时仅 console.warn
### escalation_rule: 如需变更 `findSessionGateArtifacts` 的返回值结构（如从 string[] 变为对象数组），必须先回编排者

---

### task_id: TASK-004
### task_name: 会话列表操作乐观更新 + 回滚
### requirement_ids: REQ-027
### owner: frontend-state-expert
### objective: 修改 Layout.tsx 的 handlePin/handleArchive/handleDelete，在 API 调用前先乐观更新本地状态，失败时回滚，SSE 推送最终覆盖
### in_scope:
- 修改 `handlePin`：乐观更新 pinned 状态 + 本地重排序，失败回滚
- 修改 `handleArchive`：乐观移除归档项，失败回滚
- 修改 `handleDelete`：乐观移除删除项，失败回滚
- **TDD 先行**：编写测试用例覆盖以下场景：
  1. 乐观置顶后列表立即重新排序（置顶项移到顶部）
  2. API 失败时状态回滚到操作前
  3. SSE 推送覆盖乐观状态（最终一致性）
  4. 短时间内连续操作不产生竞态（乐观更新基于函数式 setState）
- SSE onmessage 保持不变（覆盖本地状态实现最终一致性）
### out_of_scope:
- SSE 推送逻辑修改（SSE 广播在 `routes.ts` 中，不由前端控制）
- API 层修改（`src/api` 文件）
- 其他 SessionItem 交互（如 onResume、onSelect）
- 视觉样式修改
### input_documents:
- `docs/requirements/2026-05-10-theme-default-artifacts-isolation.md`（REQ-027）
- `docs/tasks/2026-05-10-theme-default-artifacts-isolation-tasks.md`（TASK-004）
### allowed_paths:
- `web/src/components/Layout.tsx`
- `web/src/components/__tests__/Layout.test.tsx`（新建测试文件，参考 `web/src/pages/__tests__/` 目录模式）
### forbidden_paths:
- `src/engine/` 下所有文件
- `web/src/theme.tsx`、`web/src/App.tsx`、`web/src/pages/`
- `README.md`、`AGENTS.md`、`CLAUDE.md`
### dependencies: 无外部依赖。依赖现有 `api` 模块和 SSE 事件流。
### required_skills: behavioral-guidelines code-standards test-driven-development source-driven-development incremental-implementation verification-before-completion
### parallel_group: TASK-001, TASK-005, TASK-007
### wait_for: 无
### acceptance_criteria:
1. 置顶后列表立即重新排序（置顶项移到顶部），不等待 SSE 推送
2. 归档后列表项立即从会话列表消失
3. 删除后列表项立即消失
4. SSE 推送到达时覆盖本地状态（最终一致性）
5. API 调用失败时回滚本地状态到操作前，并显示错误提示 `message.error`
6. 短时间内连续操作不会产生竞态冲突
7. TDD 测试（Red→Green→Refactor）全部通过：`npm test` 无失败
### test_strategy: tdd
### handoff_notes:
- **TDD 流程**：先写测试（Red，确认失败）→ 实现乐观更新（Green，测试通过）→ 检查代码质量（Refactor）
- **测试文件位置**：创建 `web/src/components/__tests__/Layout.test.tsx`，参考现有 `web/src/pages/__tests__/matchPipelineType.test.ts` 的测试配置
- **乐观更新模式**：使用函数式 setState（`setSessions(prev => prev.map(...))`）避免 stale closure
- **SSE 覆盖**：现有 SSE onmessage 使用 `selectedSessionRef` 避免 stale closure，此机制保持不变
- **回滚策略**：保存操作前快照 → try 乐观更新 + API 调用 → catch 恢复快照
- `message` 来自 antd，已在 `Layout.tsx` 中导入
### escalation_rule: 如需修改 SSE 监听逻辑或 `api` 模块的返回值类型，必须先回编排者

---

### task_id: TASK-005
### task_name: 修复 MD 预览抽屉 resizable 不工作
### requirement_ids: REQ-028
### owner: frontend-ui-expert
### objective: 为 Dashboard.tsx 的 Drawer 组件添加 `minWidth={380}` 和 `maxWidth={900}` 属性，使 resizable 拖拽手柄可见且可交互
### in_scope:
- 在 `web/src/pages/Dashboard.tsx` 第 435-441 行的 `<Drawer>` 组件上添加 `minWidth={380}` 和 `maxWidth={900}`
- 验证拖拽手柄可见
- 验证拖拽可调整宽度（380-900px）
### out_of_scope:
- Drawer 内部 Markdown 渲染逻辑
- 其他页面或组件的 Drawer
- CSS 自定义样式
### input_documents:
- `docs/requirements/2026-05-10-theme-default-artifacts-isolation.md`（REQ-028）
- `docs/tasks/2026-05-10-theme-default-artifacts-isolation-tasks.md`（TASK-005）
### allowed_paths:
- `web/src/pages/Dashboard.tsx`
### forbidden_paths:
- `src/engine/` 下所有文件
- `web/src/theme.tsx`、`web/src/App.tsx`、`web/src/components/`
- `README.md`、`AGENTS.md`、`CLAUDE.md`
### dependencies: 无外部依赖
### required_skills: behavioral-guidelines code-standards source-driven-development incremental-implementation verification-before-completion
### parallel_group: TASK-001, TASK-004, TASK-007
### wait_for: 无
### acceptance_criteria:
1. 抽屉左边缘出现拖拽手柄
2. 拖拽可在 380px ~ 900px 范围内调整宽度
3. 拖拽过程中内容正常渲染（Markdown 懒加载不会闪烁/崩溃）
4. `size={560}` 属性不与 `resizable` 冲突
### test_strategy: manual_only（UI 交互验证，需浏览器实际拖拽测试。验证方式：`npm run build:web` 成功 + 浏览器拖拽测试）
### handoff_notes:
- **antd v6 注意**：`resizable` 在 v6.3.x 中需要 `minWidth`/`maxWidth` 配合才能显式约束拖拽范围
- 如果加属性后拖拽手柄仍不出现，检查 CSS — 可能需要确保 `.ant-drawer-body` 的 overflow 不阻断鼠标事件
- 当前代码在第 435-450 行
### escalation_rule: 如需添加 CSS 或修改 Drawer 的 `styles` 属性，先报告

---

### task_id: TASK-006
### task_name: 更新 README（平台范围 + 产物目录规范）
### requirement_ids: REQ-029
### owner: backend-dev-expert
### objective: 在 README.md 中新增"平台维护状态"声明和"产物目录规范"章节
### in_scope:
- 新增"平台维护状态"小节（在"核心特性"表之前或"架构"章节之前）
  - 当前只维护 Claude Code 平台
  - OpenCode/Codex 暂不维护，后续按需启动
- 新增"产物目录规范"章节
  - 临时产物 `docs/tmp/*`
  - 智能产出按 Gate 存入 `docs/{requirements|tasks|architecture|plans|implementation|testing|review|shipping}/`
  - 临时文档 `docs/tmp/*`
### out_of_scope:
- 修改 README badge 的版本号（由发布流程控制）
- 修改架构图
- 修改"快速开始"和"核心特性"已有内容（仅追加新章节）
### input_documents:
- `docs/requirements/2026-05-10-theme-default-artifacts-isolation.md`（REQ-029）
- `docs/tasks/2026-05-10-theme-default-artifacts-isolation-tasks.md`（TASK-006）
### allowed_paths:
- `README.md`
### forbidden_paths:
- `src/engine/` 下所有文件
- `web/` 下所有文件
- `AGENTS.md`、`CLAUDE.md`（属于 TASK-007）
- `docs/flows/`（属于 TASK-008）
### dependencies: 无外部依赖
### required_skills: behavioral-guidelines code-standards source-driven-development documentation-and-adrs
### parallel_group: TASK-001, TASK-002, TASK-004, TASK-005, TASK-007
### wait_for: 无
### acceptance_criteria:
1. README 明确声明当前只维护 Claude Code 平台
2. 说明 OpenCode/Codex 暂不维护，后续按需启动
3. 产物目录规范明确：临时产物 `docs/tmp/*`，智能产出按 Gate 存入对应子目录
### test_strategy: manual_only（纯文档，验证方式：人工阅读确认）
### handoff_notes:
- README.md 同时被 TASK-008 修改（添加流程图链接）。TASK-006 负责结构调整，TASK-008 在此基础上叠加链接
- 产物目录规范需与 AGENTS.md（TASK-007）保持一致，参考 AGENTS.md 第 15 条约束格式
- 保留现有 README 结构和所有已有内容，仅追加新章节
### escalation_rule: 如发现 README 中版本号或统计数字与当前代码不一致，不修改（属于发布流程），记录到 handoff

---

### task_id: TASK-007
### task_name: 更新 AGENTS.md + CLAUDE.md
### requirement_ids: REQ-029
### owner: backend-dev-expert
### objective: 在 AGENTS.md 关键约束中新增 OpenCode/Codex 不同步约束和产物目录规范；酌情更新 CLAUDE.md
### in_scope:
- AGENTS.md 第 16 条后新增 2 条约束：
  - **16. OpenCode/Codex 不同步约束**：不做 OpenCode/Codex 平台的同步修改或优化，除非用户明确说明要开始维护对应平台
  - **17. 产物目录规范**：临时产物 `docs/tmp/`，智能体正式产出按 Gate 存入 `docs/{requirements|tasks|architecture|plans|implementation|testing|review|shipping}/`
- 检查 CLAUDE.md 是否需要同步更新（当前仅 `# Jarvis Agent Factory` + 引用 `[AGENTS.md](./AGENTS.md)`），仅在有实质内容需补充时才修改
- 确保产物目录规范与 README（TASK-006）一致
### out_of_scope:
- 修改 AGENTS.md 现有 16 条约束内容
- 修改 AGENTS.md 的 Agent 列表、技能列表、统计数字
- 修改 README.md（属于 TASK-006）
- 修改 OpenCode/Codex 模板文件
### input_documents:
- `docs/requirements/2026-05-10-theme-default-artifacts-isolation.md`（REQ-029）
- `docs/tasks/2026-05-10-theme-default-artifacts-isolation-tasks.md`（TASK-007）
### allowed_paths:
- `AGENTS.md`
- `CLAUDE.md`
### forbidden_paths:
- `src/engine/` 下所有文件
- `web/` 下所有文件
- `README.md`（属于 TASK-006/TASK-008）
- `docs/flows/`（属于 TASK-008）
### dependencies: 无外部依赖
### required_skills: behavioral-guidelines code-standards source-driven-development documentation-and-adrs
### parallel_group: TASK-001, TASK-004, TASK-005, TASK-006
### wait_for: 无
### acceptance_criteria:
1. AGENTS.md 关键约束中新增 OpenCode/Codex 不同步约束（第 16 条后）
2. AGENTS.md 关键约束中新增产物目录规范（第 17 条）
3. 产物目录规范与 README（TASK-006）语义一致
### test_strategy: manual_only（纯文档，验证方式：人工阅读确认）
### handoff_notes:
- 新增约束保持与现有 15 条约束相同的编号格式和语气
- CLAUDE.md 当前极简（仅指向 AGENTS.md），可能不需要修改。如 CLAUDE.md 无实质内容需补充，仅 review 不修改
- 注意：AGENTS.md 第 15 条已有"临时文件统一存放"约束，第 17 条为扩展规范
### escalation_rule: 如需修改现有约束编号或重排约束顺序，先报告

---

### task_id: TASK-008
### task_name: 创建 16 个 Mermaid 命令流程图
### requirement_ids: REQ-030
### owner: backend-dev-expert
### objective: 为 16 个 Claude Code 命令创建 Mermaid 流程图，纳入 `docs/flows/` 目录，README 中添加章节链接
### in_scope:
- 创建 `docs/flows/` 目录
- 为以下 16 个命令各创建一个 `.md` 文件，含完整 Mermaid flowchart：
  - 核心编排类：`jarvis.md`, `jarvis-lite.md`
  - 开发生命周期类：`frontend.md`, `backend.md`, `android.md`, `ios.md`, `flutter.md`, `expo.md`, `taro.md`
  - 测试/修复类：`browser-test.md`, `bug-fix.md`
  - 审查类：`review.md`, `review-fix.md`
  - 架构/专家类：`frontend-architect.md`, `backend-architect.md`, `algorithm-expert.md`
- 每个流程图正确反映该命令的 Gate 序列（含条件性 Gate B1/C1.5）
- 每个流程图展示 Agent spawn 关系和并行/串行逻辑
- 在 README.md 中新增"命令流程图"章节，含 16 个链接指向 `docs/flows/` 下的文件
### out_of_scope:
- 其他平台（OpenCode/Codex）的流程图
- README 结构调整（属于 TASK-006）
- 流程图之外的文档内容
### input_documents:
- `docs/requirements/2026-05-10-theme-default-artifacts-isolation.md`（REQ-030）
- `docs/tasks/2026-05-10-theme-default-artifacts-isolation-tasks.md`（TASK-008）
- 16 个命令模板源文件：`src/templates/platforms/claude/commands/` 下对应 `.md` 文件
- `AGENTS.md`（Gate 序列说明和工作模式表）
### allowed_paths:
- `docs/flows/jarvis.md`
- `docs/flows/jarvis-lite.md`
- `docs/flows/frontend.md`
- `docs/flows/backend.md`
- `docs/flows/android.md`
- `docs/flows/ios.md`
- `docs/flows/flutter.md`
- `docs/flows/expo.md`
- `docs/flows/taro.md`
- `docs/flows/browser-test.md`
- `docs/flows/bug-fix.md`
- `docs/flows/review.md`
- `docs/flows/review-fix.md`
- `docs/flows/frontend-architect.md`
- `docs/flows/backend-architect.md`
- `docs/flows/algorithm-expert.md`
- `README.md`
### forbidden_paths:
- `src/engine/` 下所有文件
- `web/` 下所有文件
- `AGENTS.md`、`CLAUDE.md`（属于 TASK-007）
### dependencies:
- TASK-006（README 结构调整完成后再添加流程图链接）
- 需要读取 `src/templates/platforms/claude/commands/` 下 16 个命令文件以了解各自的 Gate 序列和 Agent 调度逻辑
### required_skills: behavioral-guidelines code-standards source-driven-development documentation-and-adrs incremental-implementation verification-before-completion
### parallel_group: TASK-003（无共享文件，可并行）
### wait_for: TASK-006
### acceptance_criteria:
1. `docs/flows/` 目录下存在 16 个 `.md` 文件，每个包含完整的 Mermaid flowchart
2. 每个流程图正确反映该命令的 Gate 序列（含条件性 Gate B1/C1.5 判断）
3. 每个流程图展示 Agent spawn 关系和并行/串行逻辑
4. README 中新增"命令流程图"章节，含 16 个链接指向各流程图
5. 所有流程图 Mermaid 语法正确（可用在线 Mermaid Live Editor 验证）
6. 风格统一：使用 `flowchart TD` 方向，Gate 节点用 `[Gate A: 需求澄清]` 格式，spawn 用 `spawn xxx` 节点
### test_strategy: manual_only（纯文档/图表，验证方式：Mermaid 语法检查 + README 链接检查）
### handoff_notes:
- **创建顺序建议**：先核心编排类（jarvis/jarvis-lite）→ 再开发生命周期类（7个）→ 再测试审查类（4个）→ 最后架构专家类（3个）
- **参考 Mermaid 模板**：任务文档 TASK-008 中提供了 `jarvis.md` 的完整 Mermaid 模板
- **读取命令源文件**：每个流程图需先读取 `src/templates/platforms/claude/commands/<name>.md` 理解该命令的 Gate 序列和 Agent 调度逻辑
- **README 链接添加时机**：16 个流程图全部完成后，在 README 末尾（TASK-006 新增的产物目录规范之后）添加"命令流程图"章节
- **保持 README 已有结构**：TASK-006 已完成结构调整，TASK-008 仅叠加链接，不修改已有内容
### escalation_rule: 如需为流程图创建辅助 CSS/JS 或修改 README 中 TASK-006 新增的内容，先报告

---

### task_id: TASK-009
### task_name: 清理旧数据库 + 全局重装
### requirement_ids: REQ-031
### owner: infra-deploy-expert
### objective: 停止引擎，删除旧数据库文件，全局重新安装最新代码，重启引擎
### in_scope:
- 停止引擎（`jarvis engine stop`）
- 删除旧数据库文件及 WAL/SHM 辅助文件（`~/.jarvis/engine.db`）
- 全局安装新版（`npm install -g .`）
- 更新工作区依赖（`npm ci`）
- 重启引擎（`jarvis engine start`）
### out_of_scope:
- 代码修改
- 数据库备份（如需备份由用户手动决定）
- 其他项目的工作区依赖更新
### input_documents:
- `docs/requirements/2026-05-10-theme-default-artifacts-isolation.md`（REQ-031）
- `docs/tasks/2026-05-10-theme-default-artifacts-isolation-tasks.md`（TASK-009）
### allowed_paths: 无代码文件修改
### forbidden_paths:
- `src/engine/` 下所有文件（不得修改代码）
- `web/` 下所有文件
### dependencies: 所有代码变更（Batch 1 + Batch 2）已完成
### required_skills: behavioral-guidelines code-standards shipping-and-launch git-workflow-and-versioning
### parallel_group: 无（独立最后执行）
### wait_for: TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008
### acceptance_criteria:
1. 旧数据库 `~/.jarvis/engine.db` 及 WAL/SHM 文件已删除
2. `npm install -g .` 成功
3. `npm ci` 成功
4. 引擎启动后侧边栏会话数为 0（新数据库）
### test_strategy: manual_only（运维操作，验证方式：引擎启动后检查 Web 面板侧边栏）
### handoff_notes:
- **不可逆操作**：删除数据库前先提示用户确认。如需保留，手动备份 `cp ~/.jarvis/engine.db ~/.jarvis/engine.db.bak`
- **WAL/SHM 文件**：SQLite WAL 模式会产生 `engine.db-wal` 和 `engine.db-shm`，必须一并删除
- **引擎停止**：使用 `jarvis engine stop` 命令，或查找 PID 文件 `~/.jarvis/engine.pid` 后 kill
- **工作区依赖**：`npm ci` 而非 `npm install`（更可靠，基于 lock 文件）
### escalation_rule: 如 `npm install -g .` 失败，报告错误日志，由编排者介入

---

## 11. Plan Patch / Contract Change Request 触发条件

以下情况发生时，实现 Agent 必须提交 plan patch（回编排者）而非自行决策：

| # | 触发条件 | 影响范围 |
|---|---------|---------|
| 1 | TASK-002 需要修改现有表结构（pipeline/checkpoints/sessions 等） | 全引擎数据层 |
| 2 | TASK-003 需要修改 `findSessionGateArtifacts` 的返回值类型（如从 `string[]` 改为对象数组） | routes.ts + Dashboard.tsx |
| 3 | TASK-004 需要修改 SSE 监听逻辑或 `api` 模块 | 前端全局状态 |
| 4 | TASK-001 需要修改 `App.tsx` 的 ConfigProvider 包裹方式 | 前端根组件 |
| 5 | TASK-005 需要添加自定义 CSS | 前端样式层 |
| 6 | TASK-006/007 需要修改 README/AGENTS 已有章节结构（非追加） | 项目文档 |
| 7 | `findGateArtifacts`（server.ts 使用的非 session 感知版本）需要改造 | 后端 MCP 工具层 |
| 8 | 任何任务发现需要新增 npm 依赖 | 构建系统 |

## 12. 推荐的下一步

1. **编排者** 按 Batch 1 → Batch 2 → Batch 3 顺序 spawn Agent
2. **Batch 1** 6 个 Agent 同时启动，并行执行
3. **Batch 1 完成后** 验证：`npm run lint && npm run typecheck && npm run build:web` 全部通过
4. **Batch 2** 2 个 Agent（TASK-003 和 TASK-008）并行启动
5. **Batch 2 完成后** 验证：引擎启动正常，TASK-003 的 artifacts 记录功能可用
6. **Batch 3** TASK-009 执行运维操作
7. **最终验证**：qa-review-expert 评审全部变更

---

## 13. 验证检查清单（Batch 完成后）

### Batch 1 验证
- [ ] `npm run lint` 无新增 error
- [ ] `npm run typecheck` 通过
- [ ] `npm run build:web` 成功
- [ ] `node --experimental-sqlite src/engine/db.ts` 建表无报错（验证 artifacts 表创建）
- [ ] TASK-004 测试文件存在且通过（`npm test`）

### Batch 2 验证
- [ ] 引擎启动正常（`jarvis engine start`）
- [ ] artifacts 表为空（新数据库），但 schema 包含 artifacts
- [ ] README 链接可点击且目标文件存在

### Batch 3 验证
- [ ] 旧数据库已删除（确认 `~/.jarvis/engine.db` 不存在）
- [ ] `jarvis engine start` 成功
- [ ] Web 面板侧边栏会话数为 0
- [ ] 新 engine.db 包含 artifacts 表

---

*执行计划完成，可交付给编排者按 Batch 调度。*
