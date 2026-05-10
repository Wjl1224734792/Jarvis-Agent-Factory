# 执行计划：Session Model B + 统一数据目录

> 日期：2026-05-08 | 状态：ready

---

## 1. 需求文档路径

`docs/requirements/2026-05-08-session-model-b-and-unified-directory.md`（已通过 Gate A，状态 confirmed）

## 2. 任务文档路径

`docs/tasks/2026-05-08-session-model-b-and-unified-directory-tasks.md`（已通过 Gate B）

## 3. 当前轮次目标

本计划覆盖全部 6 个任务（TASK-001 ~ TASK-006），分 5 个串行批次交付。不拆分为多轮次，因为：
- 总变更量约 905 行，在 1000 行限制内
- 5 个批次之间有严格的逻辑依赖链，无法跳过中间批次
- 每个批次产出独立可验证的增量

## 4. 当前轮次范围

| 批次 | 任务 | 变更行数 | 产出 |
|------|------|---------|------|
| Batch 1 | TASK-001 | ~120 行 | 统一数据目录 `~/.jarvis/` |
| Batch 2 | TASK-002 + TASK-003 | ~250 行 | FSM 会话隔离 + MCP 心跳修复 |
| Batch 3 | TASK-004 | ~320 行 | Pipeline Runs 表（Session Model B） |
| Batch 4 | TASK-005 | ~200 行 | Web Dashboard Runs 历史展示 |
| Batch 5 | TASK-006 | ~15 行 | 版本发布 v3.23.0 |

**总预估变更**：约 905 行

## 5. 完成标准

- [ ] 引擎启动后所有数据统一在 `~/.jarvis/` 下（DB、PID、file-hashes.json）
- [ ] 旧数据库自动迁移到新位置，不丢失数据
- [ ] 多会话并发时 Gate 推进互不干扰（FSM 隔离）
- [ ] stdio 模式下 Web 面板正确显示 MCP 连接状态
- [ ] 每次 `/jarvis` 调用产生独立 Pipeline Run 记录
- [ ] Web Dashboard 可查看会话历史 Runs
- [ ] `node --check` 全部通过（无构建步骤）
- [ ] 所有 TDD 任务单元测试通过
- [ ] 版本号递增至 3.23.0，三平台发布

## 6. 是否需要先查阅 code-explore-expert / docs-research-expert

**不需要**。代码结构已验证，所有文件路径和行号与任务文档一致：
- `src/engine/db.js`：193 行，openDb 在 L5，initSchema 在 L15
- `src/engine/server.js`：8 个 MCP 工具在 L210-L390，session_heartbeat 在 L180-L186
- `src/install.js`：loadHashes/saveHashes 在 L218-L227，mergeDir 在 L236-L280
- `src/web/routes.js`：enforce 在 L109-L122，advance 在 L125-L153
- `src/web/views/pipeline.html`：isOnline 在 L410，checkGate 在 L450，advanceGate 在 L461
- `package.json`：当前版本 3.22.2
- 无 test 目录（TDD 任务需创建测试文件）

## 7. 执行代理分工

| 任务 | subagent_type | 理由 |
|------|--------------|------|
| TASK-001 | `backend-dev-expert` | 后端基础设施变更：db.js openDb 签名 + install.js 路径重构 |
| TASK-002 | `backend-dev-expert` | 后端核心业务修复：8 个 MCP 工具 session 隔离 + Web API 参数校验 |
| TASK-003 | `backend-dev-expert` | 后端心跳修复 + 前端 isOnline 对齐（主要工作量在后端） |
| TASK-004 | `backend-dev-expert` | DDD 聚合根：db.js CRUD + server.js 工具适配 + routes.js 端点（全后端） |
| TASK-005 | `frontend-dev-expert` | 纯前端 UI 扩展：pipeline.html 历史 panels + JavaScript 渲染逻辑 |
| TASK-006 | `backend-dev-expert` | 发布流程：版本号 + changelog + git tag + npm publish |

> 注：TASK-003 包含少量 pipeline.html 前端变更（`isOnline` 1 行），但仍以后端为主，由 backend-dev-expert 统一处理。

## 8. 共享区域改动归属

| 共享文件 | 唯一责任方 | 串行约束 |
|---------|-----------|---------|
| `src/engine/db.js` | TASK-001 先行（L5-L13），TASK-004 在后（L15-L116） | **强制串行**：TASK-004 等待 TASK-001 完成 |
| `src/engine/server.js` | 严格顺序：TASK-001(L62) → TASK-002/003 → TASK-004(L147-L389) | **强制串行**：每批基于前批稳定代码 |
| `src/web/routes.js` | TASK-002(L109-L153) → TASK-004(新端点) → TASK-005(响应微调) | **强制串行**：按批次顺序 |
| `src/web/views/pipeline.html` | TASK-002/003 并行 → TASK-005 | 低冲突可伪并行 |
| `src/install.js` | TASK-001 独占 | 无冲突 |
| `package.json` | TASK-006 独占 | 无冲突 |

**并行安全规则**：
- TASK-002 和 TASK-003 可并行，因为二者修改 `server.js` 的行范围不重叠（TASK-002: L210-L389，TASK-003: L20, L65, L180-L186），且 `pipeline.html` 修改不同函数/行。
- 但若出现合并冲突（尽管概率低），TASK-002 先提交，TASK-003 rebase 后提交。

## 9. 并行 / 串行策略

```
Batch 1（串行先行）
  └── TASK-001 单独执行
        └── 产出：稳定 DB 路径（openDb() 签名固定）

Batch 2（并行组：TASK-002 ∥ TASK-003）
  ├── 依赖：Batch 1 完成
  ├── TASK-002 和 TASK-003 并行启动
  ├── 并行理由：
  │   ├── server.js 修改行范围不重叠
  │   ├── pipeline.html 修改不同函数
  │   ├── routes.js 仅 TASK-002 修改（TASK-003 不改 routes.js）
  │   └── 两个 TDD 任务 Red 阶段可并行
  ├── 合并策略：TASK-002 先提交 → TASK-003 rebase
  └── 产出：FSM 会话隔离 + MCP 状态修复

Batch 3（串行）
  └── TASK-004 单独执行
        ├── 依赖：Batch 1 + Batch 2 全部完成
        ├── 风险任务（L 级别，320 行）
        └── 产出：Pipeline Runs 表 + API 端点

Batch 4（串行）
  └── TASK-005 单独执行
        ├── 依赖：Batch 3 完成（GET /api/pipeline-runs 端点就绪）
        └── 产出：Web Dashboard Runs 历史 UI

Batch 5（串行收尾）
  └── TASK-006 单独执行
        ├── 依赖：Batch 1-4 全部完成
        └── 产出：v3.23.0 三平台发布
```

## 10. 风险提醒

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| TASK-004 为 L 级别（320 行）变更，涉及新增聚合根 + 修改 8 个工具签名 + 数据迁移 | 高 | 严格 TDD；分两次 commit（DB 层 + 工具适配）；迁移脚本事务包裹 + 幂等检测 |
| TASK-001 数据迁移涉及文件系统操作，跨平台路径差异 | 中 | 迁移失败不阻塞引擎启动（try-catch + 日志）；Windows/Linux 分别验证 homedir() |
| TASK-002 修改 8 个工具函数签名，影响所有 Gate 操作 | 中 | TDD 覆盖所有 8 个工具的错误分支；前端 toast 优雅处理 400 响应 |
| TASK-002 与 TASK-003 并行可能产生 server.js 合并冲突 | 低 | 行范围不重叠，但如冲突则 TASK-002 先提交，TASK-003 rebase |
| TASK-001 无独立测试任务（test_after 但依赖手动集成验证） | 低 | 实现代理自行验证：启动引擎 + 检查 DB 位置 + Web 面板数据读取 |

### 风险：TASK-004 单任务行数较大

TASK-004 预估 320 行，接近 L 级别上限。任务文档提供了不拆分理由：
1. `pipeline_runs` 是完整聚合根，DB 表 + CRUD + 工具适配 + API 不可再分
2. 迁移逻辑与表定义必须原子化（同一次启动完成）
3. 8 个工具函数统一适配，拆分导致逻辑不一致

**本计划接受此风险**，以 TDD + 两次 commit 作为缓解。实现代理如发现复杂度超预期，应提交 plan patch 建议拆分。

### 风险：无独立测试 Batch

任务文档中 TASK-001（test_after）和 TASK-005（manual_only）未分配独立测试任务。考虑到：
- TASK-001 验证简单（检查文件位置、Web 面板数据读取），由实现代理自行完成
- TASK-005 为 UI 变更，浏览器手动验证即可
- TDD 任务（TASK-002/003/004）的测试内嵌于任务本身

**不阻塞执行**。qa-review-expert 在全部完成后统一评审。

## 11. 实现者交接信息

- **TASK-001 实现者**：完成后通知编排者，产出稳定 `openDb()` 签名供下游使用
- **TASK-002/003 实现者**：并行启动时各自基于 Batch 1 的干净代码
- **TASK-004 实现者**：等待 Batch 2 全部完成后启动，确保 `session_join` 和 8 个工具签名已稳定
- **TASK-005 实现者**：等待 TASK-004 完成，确认 `GET /api/pipeline-runs` 端点格式后启动
- **TASK-006 实现者**：等待所有功能任务完成并通过验证后启动

## 12. Execution Packets

---

### task_id: TASK-001
### task_name: 统一数据目录到 `~/.jarvis/`
### requirement_ids: REQ-001
### owner: backend-dev-expert
### objective: 将所有 Jarvis Engine 运行时数据统一到 `~/.jarvis/` 目录，移除 `projectRoot` 参数依赖
### in_scope:
- 修改 `openDb(root)` → `openDb()`：使用 `homedir()` 计算统一路径 `<homedir>/.jarvis/engine.db`
- 旧数据库迁移：检测 `<projectRoot>/.jarvis/engine.db`，存在则迁移到 `~/.jarvis/engine.db`
- `startEngine()` 中 `openDb(root)` 调用改为 `openDb()`
- `loadHashes(root)` / `saveHashes(root)` 改为使用 `homedir()` 统一路径（`~/.jarvis/file-hashes.json`）
- `mergeDir()` 移除 `root` 参数传递链
- 确保引擎启动后不再自动创建 `<projectRoot>/.jarvis/` 目录
### out_of_scope:
- 不修改 `PID_FILE` 逻辑（已在 `~/.jarvis/engine.pid`，无需变更）
- 不修改 `sessions` / `pipeline` / `checkpoints` 表结构（TASK-004 负责）
- 不修改 `initSchema()` 中的 schema 定义
### input_documents:
- `docs/requirements/2026-05-08-session-model-b-and-unified-directory.md`（REQ-001 章节）
- `docs/tasks/2026-05-08-session-model-b-and-unified-directory-tasks.md`（TASK-001 章节）
### allowed_paths:
- `src/engine/db.js`（仅 `openDb` 函数体，L5-L13）
- `src/engine/server.js`（仅 L62，`openDb(root)` → `openDb()`）
- `src/install.js`（`loadHashes`/`saveHashes`/`mergeDir` 函数）
### forbidden_paths:
- `src/engine/db.js` 中 `initSchema()` 及其后的所有函数（L15-L193）
- `src/engine/server.js` 中 MCP 工具定义（L140-L390）
- `src/web/routes.js`
- `src/web/views/pipeline.html`
- `package.json`
### dependencies: 无
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: 无（Batch 1 唯一任务）
### wait_for: 无
### acceptance_criteria:
- `openDb()` 不再接收 `projectRoot` 参数，DB 创建于 `<homedir>/.jarvis/engine.db`
- 引擎启动后，`<projectRoot>/.jarvis/` 目录不会被自动创建
- `engine.pid` 仍然在 `<homedir>/.jarvis/engine.pid`
- 旧数据库 `<projectRoot>/.jarvis/engine.db` 若存在，自动迁移到 `<homedir>/.jarvis/engine.db`
- `file-hashes.json` 统一读写 `<homedir>/.jarvis/file-hashes.json`
- `node --check` 通过
- 引擎可正常启动，Web 面板正常读取会话和流水线数据
- 数据迁移失败不阻塞引擎启动（try-catch + 日志输出）
### test_strategy: test_after
### handoff_notes:
- 验证方式：启动引擎后检查 `<homedir>/.jarvis/` 下是否存在 `engine.db`、`engine.pid`、`file-hashes.json`
- 改为 `homedir()` 后，`import { homedir }` 已存在于 `server.js`（L9），`db.js` 和 `install.js` 需新增 import
- 迁移逻辑需事务包裹，失败回滚并记录日志，不阻止 `openDb()` 返回正常 DB 实例
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-002
### task_name: 修复 FSM 会话不一致
### requirement_ids: REQ-005
### owner: backend-dev-expert
### objective: 废弃 `'legacy'` 回退逻辑，强制 MCP 工具和 Web API 使用精确 `session_id`，修复多会话并发时的状态污染
### in_scope:
- 8 个 MCP 工具（pipeline_init, pipeline_status, gate_enforce, advance_gate, gate_jump, report_status, gate_check, pipeline_guide）：将 `extra?.sessionId || 'legacy'` 替换为 sessionId 存在检查 + 缺失时返回明确错误
- `session_leave` 工具：同样移除 `|| 'legacy'`，缺失时安全返回 `{ ok: true }`
- Web API `/api/gate/:gate/enforce`（L112）：移除 `|| (getSessions(db)[0]?.id)`，缺失 `session_id` 时返回 HTTP 400
- Web API `POST /api/gate/advance`（L127）：移除 `body.session_id || (getSessions(db)[0]?.id)`，缺失时返回 HTTP 400
- Web 前端 `checkGate()`（L450-L458）：`selectedSession` 为空时 toast 提示"请先选择会话"，不发起请求
- Web 前端 `advanceGate()`（L461-L475）：`selectedSession` 为空时 toast 提示"请先选择会话"，不发起请求
- 新增单元测试文件，覆盖 session_id 缺失返回错误、并发会话互不干扰
### out_of_scope:
- 不修改 `session_join` 的 session 创建逻辑（TASK-004 负责）
- 不修改 `pipeline` 表结构（TASK-004 负责）
- 不修改 `session_heartbeat`（TASK-003 负责）
- 不修改 `session_list`（无需 session_id）
### input_documents:
- `docs/requirements/2026-05-08-session-model-b-and-unified-directory.md`（REQ-005 章节）
- `docs/tasks/2026-05-08-session-model-b-and-unified-directory-tasks.md`（TASK-002 章节）
### allowed_paths:
- `src/engine/server.js`（L210-L389：8 个 Gate 工具 + session_leave L202-L208）
- `src/web/routes.js`（L109-L153：enforce 和 advance 端点）
- `src/web/views/pipeline.html`（L450-L475：checkGate 和 advanceGate 函数）
- 新建测试文件（路径与 TASK-003 协调，避免文件名冲突）
### forbidden_paths:
- `src/engine/db.js`
- `src/engine/server.js` L1-L65（startEngine、常量定义）、L140-L178（session_join）、L180-L186（session_heartbeat）
- `src/web/routes.js` 非 enforce/advance 端点
- `src/install.js`
- `package.json`
### dependencies: TASK-001（`openDb()` 签名稳定）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `test-driven-development`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: TASK-003
### wait_for: TASK-001
### acceptance_criteria:
- 8 个 Gate 工具在 `extra?.sessionId` 缺失时返回 `{ error: 'session_id required. Call session_join first.' }`
- `session_leave` 在 `extra?.sessionId` 缺失时安全返回 `{ ok: true }`（无操作，不删除错误会话）
- Web API `/api/gate/:gate/enforce` 缺少 `session_id` 参数返回 HTTP 400
- Web API `POST /api/gate/advance` 缺少 `session_id` 参数返回 HTTP 400
- Web 前端未选中会话时点击"推进"提示"请先选择会话"
- 两个并发会话的 Gate 推进互不干扰（新增测试验证）
- 所有新增单元测试通过
### test_strategy: tdd
### handoff_notes:
- Red 阶段：先编写 8 个工具的 session_id 缺失测试（返回错误）和并发隔离测试
- Green 阶段：逐工具替换回退逻辑，同步修改 routes.js 和 pipeline.html
- Refactor 阶段：检查 8 个工具的错误消息格式一致性
- 测试文件命名建议：`tests/unit/fsm-session-isolation.test.js` 或类似，避免与 TASK-003 测试文件冲突
- `session_join`（L147-L178）不在本任务范围内，它的修改属于 TASK-004
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-003
### task_name: 修复 Web 面板 MCP 连接状态显示
### requirement_ids: REQ-006
### owner: backend-dev-expert
### objective: 修复 stdio 模式下心跳链路断裂，使 Web 面板正确显示 MCP 连接状态
### in_scope:
- `SESSION_TIMEOUT` 常量：600_000 (10min) → 1_800_000 (30min)
- `session_heartbeat` 工具（L180-L186）：不依赖 `extra?.sessionId`，改为遍历所有 active 会话进行心跳更新
- 新增引擎内部自动心跳定时器（`broadcastHeartbeat`）：`setInterval` 对所有 active 会话自动心跳，作为 stdio 模式兜底
- Web 前端 `renderSessions()` 中 `isOnline`（L410）：120000 (2min) → 600000 (10min)
- 新增单元测试：stdio 模式心跳更新、30min 超时标记、内部定时器工作正常
### out_of_scope:
- 不修改 `markStaleSessions` 函数签名（超时通过 `SESSION_TIMEOUT` 常量传递自动生效）
- 不修改 8 个 Gate 工具的 session_id 逻辑（TASK-002 负责）
- 不修改 `session_join` / `session_leave`（TASK-002/004 负责）
- 不修改 `GET /api/sessions` 的查询逻辑（`status` 过滤已正确）
### input_documents:
- `docs/requirements/2026-05-08-session-model-b-and-unified-directory.md`（REQ-006 章节）
- `docs/tasks/2026-05-08-session-model-b-and-unified-directory-tasks.md`（TASK-003 章节）
### allowed_paths:
- `src/engine/server.js`（仅 L20、L65、L180-L186 + 新增内部心跳定时器）
- `src/web/views/pipeline.html`（仅 L410，`isOnline` 判断行）
- 新建测试文件（路径与 TASK-002 协调，避免文件名冲突）
### forbidden_paths:
- `src/engine/db.js`
- `src/engine/server.js` L62（openDb 调用）、L140-L178（session_join）、L202-L389（MCP 工具）
- `src/web/routes.js`
- `src/install.js`
- `package.json`
### dependencies: TASK-001（`openDb()` 签名稳定）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `test-driven-development`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: TASK-002
### wait_for: TASK-001
### acceptance_criteria:
- stdio 模式下启动 `/jarvis` 后，Web 面板左侧边栏立即显示对应平台为"在线"（绿色圆点）
- 会话在活跃使用期间（AI 持续调用工具），不会因心跳缺失被标记为 inactive
- 引擎内部自动心跳确保 `last_heartbeat` 在 10 分钟内持续更新（内部定时器频率可设为 5 分钟）
- 会话闲置超过 30 分钟后正确显示为"休眠"（amber 圆点）
- Web 前端 `isOnline` 窗口从 2 分钟对齐到 10 分钟（600000ms）
- 所有新增单元测试通过
### test_strategy: tdd
### handoff_notes:
- Red 阶段：先编写心跳更新测试（模拟 stdio 模式下 `session_heartbeat` 调用成功更新 `last_heartbeat`）
- Green 阶段：修改 `session_heartbeat` 实现 + 新增内部定时器 + 修改前端 isOnline + 修改 SESSION_TIMEOUT
- Refactor 阶段：检查定时器清理逻辑（setInterval 返回值应保存，进程退出时 clearInterval）
- 测试文件命名建议：`tests/unit/heartbeat-fix.test.js`
- 内部心跳定时器频率建议：每 5 分钟执行一次 `broadcastHeartbeat()`，确保 `last_heartbeat` 在 10 分钟窗口内更新
- `markStaleSessions` 的 30 分钟超时通过 `SESSION_TIMEOUT` 常量自动生效，L65 无需修改（已通过常量传递）
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-004
### task_name: 引入 Pipeline Runs 表（Session Model B）
### requirement_ids: REQ-002
### owner: backend-dev-expert
### objective: 新增 `pipeline_runs` 聚合根，使每次 `/jarvis` 调用产生独立的流水线运行记录，支持历史追溯
### in_scope:
- `initSchema()` 中新增 `pipeline_runs` 表 DDL（含 `(session_id, started_at DESC)` 索引）
- 新增 CRUD 函数：`createPipelineRun()`, `getPipelineRun()`, `getActiveRun()`, `getSessionRuns()`, `updateRunGate()`, `completeRun()`, `abortRun()`
- 旧数据迁移：检测 `pipeline` 表有数据但 `pipeline_runs` 为空，自动为每个 session 创建首条 run
- `session_join` 修改：恢复/新建会话时自动创建新 `pipeline_run`
- `pipeline_init` 修改：创建新 `pipeline_run`（不再覆盖旧 pipeline 快照）
- 8 个 Gate 工具新增可选 `run_id` 参数：无 `run_id` 时默认使用当前 session 最新活跃 run
- 新增 `GET /api/pipeline-runs?session_id=` 端点
- `GET /api/pipeline` 返回数据中增加 `run_id` 字段
- 新增单元测试：CRUD、session_join 创建 run、多次调用多条 run、旧数据迁移、run_id 解析
### out_of_scope:
- 不删除 `pipeline` 表（保留作为当前活跃 run 的缓存快照）
- 不修改 Web 前端 UI（TASK-005 负责）
- 不修改 `SESSION_TIMEOUT` 或心跳逻辑（TASK-003 负责）
- 不修改 `openDb()` 函数签名（TASK-001 负责）
### input_documents:
- `docs/requirements/2026-05-08-session-model-b-and-unified-directory.md`（REQ-002 章节）
- `docs/tasks/2026-05-08-session-model-b-and-unified-directory-tasks.md`（TASK-004 章节）
### allowed_paths:
- `src/engine/db.js`（`initSchema()` 新增表 + 新增 CRUD 函数 + 迁移逻辑，L15 之后）
- `src/engine/server.js`（`session_join` L147-L178 + `pipeline_init` L210-L221 + 8 个 Gate 工具 L223-L389）
- `src/web/routes.js`（新增 `GET /api/pipeline-runs` 端点 + `GET /api/pipeline` 调整）
- 新建测试文件
### forbidden_paths:
- `src/engine/db.js` `openDb()` 函数体（L5-L13，TASK-001 已稳定）
- `src/engine/server.js` 常量定义 L20、心跳定时器 L65、session_heartbeat L180-L186（TASK-003 已稳定）
- `src/web/views/pipeline.html`（TASK-005 负责）
- `src/install.js`
- `package.json`
### dependencies:
- TASK-001（`openDb()` 签名稳定，`initSchema()` 基础就绪）
- TASK-002（`session_join` 和 8 个工具签名已修复，session_id 逻辑已稳定）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `test-driven-development`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: 无（Batch 3 唯一任务）
### wait_for: TASK-001, TASK-002, TASK-003
### acceptance_criteria:
- `pipeline_runs` 表在 `initSchema()` 中自动创建，含 `(session_id, started_at DESC)` 索引
- `pipeline_runs` 表结构：`id TEXT PK, session_id TEXT NOT NULL, project TEXT NOT NULL, pipeline_type TEXT DEFAULT 'full', current_gate TEXT DEFAULT 'Gate A', status TEXT DEFAULT 'active', started_at TEXT NOT NULL, completed_at TEXT`
- 每次 `session_join` 调用后自动创建一条新的 `pipeline_run`（status=active）
- 同一 session 多次 `/jarvis` 调用产生多条独立 `pipeline_run` 记录，互不覆盖
- 所有 Gate 工具支持可选 `run_id` 参数；不传时默认操作当前 session 的最新活跃 run
- `GET /api/pipeline-runs?session_id=` 返回按时间倒序的 runs 列表（含 Gate 进度详情）
- 旧 session（仅有 `pipeline` 表无 `pipeline_runs`）启动时自动迁移为首条 run（幂等）
- `pipeline` 表保留作为当前活跃 run 的缓存快照（向后兼容，`advance_gate` 等工具同步更新 pipeline 表）
- WAL 模式支持多会话并发读写
- 所有新增单元测试通过
### test_strategy: tdd
### handoff_notes:
- **这是 L 级别风险任务（320 行），建议分两次 commit**：
  - Commit 1：`initSchema()` + CRUD 函数 + 迁移逻辑 + 单元测试
  - Commit 2：`session_join`/`pipeline_init`/8 个工具适配 + API 端点 + 更新测试
- 迁移脚本必须幂等（启动前检查 `pipeline_runs` 是否为空，已迁移则跳过）
- 迁移脚本必须事务包裹（BEGIN/COMMIT），失败回滚不阻塞引擎启动
- `createPipelineRun` 的 `run_id` 生成策略：`run_<timestamp>` 或 UUID（建议 timestamp 简单可排序）
- `getActiveRun(sessionId)` = 查询 `WHERE session_id=? AND status='active' ORDER BY started_at DESC LIMIT 1`
- 8 个工具的 `run_id` 参数为可选（z.string().optional()），不传时调用 `getActiveRun()` 取默认值
- `advance_gate` 需要**同时更新** `pipeline_runs.current_gate` 和 `pipeline.current_gate`（快照同步）
- `completeRun`/`abortRun` 设置 `completed_at` 和 `status`
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-005
### task_name: Web Dashboard 展示 Pipeline Runs 历史
### requirement_ids: REQ-003
### owner: frontend-dev-expert
### objective: 扩展 Web Dashboard（pipeline.html）展示会话下的多个 pipeline runs，支持查看历史运行记录
### in_scope:
- 确认/微调 `GET /api/pipeline-runs?session_id=` 端点响应格式以适配前端展示
- 顶部统计卡片新增"历史运行"计数
- 进度条下方新增"历史 Runs"折叠面板（按时间倒序）
- 每条 run 卡片显示：pipeline_type、当前 Gate、开始时间、状态标签（active/completed/aborted）、Gate 进度 mini 展示
- 当前活跃 run 高亮边框（indigo 主题色）
- 历史 run 使用浅灰样式
- JavaScript：新增 `fetchPipelineRuns(sessionId)` 和 `renderRunsHistory()` 函数
- 前端分页：默认显示最近 20 条 runs，"加载更多"按钮
### out_of_scope:
- 不修改 `pipeline_runs` 表结构或后端 CRUD（TASK-004 负责）
- 不修改侧边栏会话列表逻辑（TASK-002/003 已稳定）
- 不修改 `checkGate`/`advanceGate` 逻辑（TASK-002 已修复）
- 不修改 `isOnline` 判断（TASK-003 已修复）
### input_documents:
- `docs/requirements/2026-05-08-session-model-b-and-unified-directory.md`（REQ-003 章节）
- `docs/tasks/2026-05-08-session-model-b-and-unified-directory-tasks.md`（TASK-005 章节）
### allowed_paths:
- `src/web/views/pipeline.html`
- `src/web/routes.js`（仅响应格式微调，不修改已有端点逻辑）
### forbidden_paths:
- `src/engine/db.js`
- `src/engine/server.js`
- `src/install.js`
- `package.json`
### dependencies: TASK-004（`GET /api/pipeline-runs` 端点就绪，响应格式已知）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: 无（Batch 4 唯一任务）
### wait_for: TASK-004
### acceptance_criteria:
- Dashboard 选中会话后，展示该会话的所有 pipeline runs（按时间倒序）
- 活跃 run 有明显视觉标识（indigo 边框/徽章）
- 历史 run 可展开查看 Gate 进度（复用现有 Gate 状态渲染逻辑）
- 历史 runs 面板支持折叠/展开
- 前端分页：默认显示最近 20 条 runs，更多通过"加载更多"按钮
- 页面不因 runs 数量增多而明显卡顿
- 浏览器手动验证：多会话、多 run 场景下 UI 显示正确
### test_strategy: manual_only
### handoff_notes:
- 使用现有 Tailwind CSS 样式体系，禁止 `@apply`
- 参考现有 `renderSessions()` 的卡片样式进行设计
- `fetchPipelineRuns(sessionId)` 应在 `selectSession()` 或 `refresh()` 时调用
- 响应格式预期（由 TASK-004 定义）：`{ runs: [{ id, session_id, pipeline_type, current_gate, status, started_at, completed_at, gates: [...] }], count: N }`
- 如端点响应格式与预期不符，先与 TASK-004 实现者沟通确认后微调 routes.js
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-006
### task_name: 版本发布 v3.23.0
### requirement_ids: REQ-004
### owner: backend-dev-expert
### objective: 递增版本号、更新 changelog、创建 git tag、发布 npm 包到三平台
### in_scope:
- `package.json` 版本号 `3.22.2` → `3.23.0`
- `CHANGELOG.md`（若存在）记录 v3.23.0 变更要点
- `git tag v3.23.0` 创建并推送 Gitee + GitHub
- `npm publish` 或 `npm pack --dry-run` 验证通过
### out_of_scope:
- 不修改代码逻辑
- 不修改数据库结构
- 不修改 Web UI
### input_documents:
- `docs/requirements/2026-05-08-session-model-b-and-unified-directory.md`（REQ-004 章节）
- `docs/tasks/2026-05-08-session-model-b-and-unified-directory-tasks.md`（TASK-006 章节）
### allowed_paths:
- `package.json`（仅 `version` 字段）
- `CHANGELOG.md`（若存在）
### forbidden_paths:
- 所有 `src/` 目录
- 所有测试文件
### dependencies: TASK-001, TASK-002, TASK-003, TASK-004, TASK-005（全部完成）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `shipping-and-launch`
- `git-workflow-and-versioning`
- `finishing-a-development-branch`
### parallel_group: 无（Batch 5 唯一任务）
### wait_for: TASK-001, TASK-002, TASK-003, TASK-004, TASK-005
### acceptance_criteria:
- `package.json` 版本号递增至 `3.23.0`
- `git tag v3.23.0` 创建并推送到 Gitee + GitHub
- `npm publish` 执行成功（或 `npm pack --dry-run` 验证通过）
- changelog 记录本次变更要点（统一数据目录、Pipeline Runs 表、FSM 修复、MCP 状态修复、Dashboard Runs 历史）
- 三平台（Gitee + GitHub + npm）均可见 v3.23.0
### test_strategy: manual_only
### handoff_notes:
- 发布前确认所有功能任务已通过验证
- 检查 git 状态为 clean（无未提交变更）
- changelog 格式参考项目现有风格
- 推送 tag 时注意 Gitee 和 GitHub 两个 remote
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

## 13. parallel_batches

### Batch 1（无依赖，可立即启动）

- **TASK-001** → subagent_type: `backend-dev-expert`

**验证命令**：
```bash
node --check src/engine/db.js src/engine/server.js src/install.js
node --check src/web/routes.js
# 启动引擎，检查 ~/.jarvis/ 下是否存在 engine.db、engine.pid
# 检查是否不再创建 <projectRoot>/.jarvis/ 目录
# 访问 Web 面板确认数据正常读取
```

---

### Batch 2（依赖 Batch 1 全部完成）

- **TASK-002** → subagent_type: `backend-dev-expert`
- **TASK-003** → subagent_type: `backend-dev-expert`

> TASK-002 和 TASK-003 可安全并行（修改行范围不重叠，见冲突分析）。合并策略：TASK-002 先提交，TASK-003 rebase 后提交。

**验证命令**：
```bash
# 语法检查（两个任务修改的区域）
node --check src/engine/server.js src/web/routes.js src/web/views/pipeline.html

# TASK-002 测试
node --test tests/unit/fsm-session-isolation.test.js

# TASK-003 测试
node --test tests/unit/heartbeat-fix.test.js

# 手动验证：两个并发会话 Gate 推进互不干扰
# 手动验证：stdio 模式下 Web 面板显示"在线"
```

---

### Batch 3（依赖 Batch 2 全部测试通过）

- **TASK-004** → subagent_type: `backend-dev-expert`

> 风险任务（L 级别，320 行）。严格 TDD 流程。建议分两次 commit（DB 层 + 工具适配）。

**验证命令**：
```bash
node --check src/engine/db.js src/engine/server.js src/web/routes.js
node --test tests/unit/pipeline-runs.test.js
# 手动验证：多次 /jarvis 调用产生多条独立 run 记录
# 手动验证：GET /api/pipeline-runs?session_id=xxx 返回正确数据
```

---

### Batch 4（依赖 Batch 3 全部完成）

- **TASK-005** → subagent_type: `frontend-dev-expert`

**验证命令**：
```bash
node --check src/web/routes.js src/web/views/pipeline.html
# 浏览器手动验证：选中会话 → 查看历史 Runs → 展开/折叠 → 活跃 run 高亮
# 浏览器手动验证：多会话、多 run 场景下 UI 显示正确
# 浏览器手动验证：分页"加载更多"按钮正常工作
```

---

### Batch 5（依赖 Batch 1-4 全部完成并通过验证）

- **TASK-006** → subagent_type: `backend-dev-expert`

**验证命令**：
```bash
node --check package.json
git status                                 # 确认 clean
npm pack --dry-run                         # 验证包内容
git tag v3.23.0
git push origin v3.23.0
# 检查 Gitee + GitHub + npm 三平台可见
```

---

## 14. plan patch / contract change request 触发条件

| 触发条件 | 响应 |
|---------|------|
| TASK-001 实现者发现 `homedir()` 在 Windows 下路径异常 | 提交 plan patch，建议条件编译或回退方案 |
| TASK-002/003 并行时 server.js 产生不可自动合并的冲突 | 编排者介入，改为串行（先 TASK-002 后 TASK-003） |
| TASK-004 实现者发现聚合根设计过于复杂，需要拆分 | 提交 plan patch，建议拆分为 2 个子任务 |
| TASK-005 实现者发现 API 响应格式与 UI 需求不匹配 | 先与 TASK-004 实现者沟通，无法达成一致时回编排者 |
| 任一任务发现需要修改 `package.json` 依赖 | 立即停止，回编排者批准 |
| 任一任务发现需要修改 `initSchema()` 中已有表的 DDL | 立即停止，回编排者评估向后兼容风险 |
| 迁移脚本执行失败率超过预期 | 回编排者，评估是否需要手动迁移指引 |

## 15. 推荐的下一步

1. **立即启动 Batch 1**：`spawn backend-dev-expert` 执行 TASK-001（统一数据目录），这是最低风险的基础设施变更
2. **Batch 1 完成后**：并行启动 Batch 2 的 TASK-002 和 TASK-003
3. **Batch 2 全部测试通过后**：启动 Batch 3 的 TASK-004（核心功能，需最谨慎）
4. **TASK-004 完成后**：启动 Batch 4 的 TASK-005（UI 增强）
5. **全部完成后**：qa-review-expert 综合评审 → Batch 5 发布
