# 任务文档：Session Model B + 统一数据目录

> 日期：2026-05-08 | 基于需求文档：`docs/requirements/2026-05-08-session-model-b-and-unified-directory.md`

---

## 1. 需求文档路径

`docs/requirements/2026-05-08-session-model-b-and-unified-directory.md`（已通过 Gate A，状态 confirmed）

---

## 2. 任务概览

| 任务 ID | 关联 REQ | 名称 | 类型 | 优先级 | 预估行数 | 风险 |
|---------|---------|------|------|--------|---------|------|
| TASK-001 | REQ-001 | 统一数据目录到 `~/.jarvis/` | 直接开发 | P0 | M (120) | 中 |
| TASK-002 | REQ-005 | 修复 FSM 会话不一致 | TDD | P0 | M (180) | 中 |
| TASK-003 | REQ-006 | 修复 Web 面板 MCP 连接状态显示 | TDD | P1 | S (70) | 低 |
| TASK-004 | REQ-002 | 引入 Pipeline Runs 表（Session Model B） | DDD | P0 | L (320) | 高 |
| TASK-005 | REQ-003 | Web Dashboard 展示 Pipeline Runs 历史 | 直接开发 | P1 | M (200) | 中 |
| TASK-006 | REQ-004 | 版本发布 v3.23.0 | 直接开发 | P2 | XS (15) | 低 |

**总预估变更**：约 905 行（6 个任务，可分 5 轮次）

---

## 3. 任务分解列表

### TASK-001：统一数据目录到 `~/.jarvis/`

- **任务 ID**：TASK-001
- **映射 REQ**：REQ-001
- **任务类型**：直接开发（含数据迁移脚本）
- **优先级**：P0（基础架构变更，所有后续任务依赖）
- **预估变更行数**：M (~120 行)
- **test_strategy**：test_after（迁移需集成验证，TDD 不适用）
- **依赖**：无
- **被依赖**：TASK-002, TASK-003, TASK-004（均依赖 `openDb()` 签名稳定）

#### 变更范围

| 文件 | 变更描述 | 预估行数 |
|------|---------|---------|
| `src/engine/db.js` | `openDb(root)` → `openDb()`：移除 `root` 参数，使用 `homedir()` 计算统一路径；添加 `import { homedir }` | ~25 |
| `src/engine/db.js` | `openDb()` 内部：检测 `<projectRoot>/.jarvis/engine.db` 旧路径，存在则迁移到 `~/.jarvis/engine.db` | ~30 |
| `src/engine/server.js` | `startEngine()` 中 `openDb(root)` 调用改为 `openDb()`（仅第 62 行） | ~2 |
| `src/install.js` | `loadHashes(root)` / `saveHashes(root)`：移除 `root` 参数，使用 `homedir()` 统一路径 | ~30 |
| `src/install.js` | `mergeDir()`：移除 `root` 参数传递链，统一使用 home 目录 | ~15 |

#### 完成标准

- [x] `openDb()` 不再接收 `projectRoot` 参数，DB 创建于 `~/.jarvis/engine.db`
- [x] 引擎启动后，`<projectRoot>/.jarvis/` 目录不会被自动创建
- [x] `engine.pid` 仍然在 `~/.jarvis/engine.pid`（不变）
- [x] 旧数据库 `<projectRoot>/.jarvis/engine.db` 若存在，自动迁移到 `~/.jarvis/engine.db`
- [x] `file-hashes.json` 统一读写 `~/.jarvis/file-hashes.json`
- [x] `node --check` 通过，引擎可正常启动
- [x] Web 面板正常读取会话和流水线数据

#### 并行可行性
- 独占 `src/install.js`，其他任务不修改此文件
- `src/engine/server.js` 第 62 行与 TASK-002（第 213-389 行）、TASK-003（第 20, 65, 180-186 行）不重叠
- `src/engine/db.js` 第 5-13 行与 TASK-004 的 `initSchema()` 扩展不重叠（TASK-004 新增表在 `initSchema()` 内部）

#### 风险
- **数据迁移风险（中）**：旧 DB 文件可能很大，迁移需保证原子性（事务包裹）。迁移失败不应阻塞引擎启动。
- **路径解析**：Windows 与 Linux 下 `homedir()` 行为需验证。

---

### TASK-002：修复 FSM 会话不一致

- **任务 ID**：TASK-002
- **映射 REQ**：REQ-005
- **任务类型**：TDD（核心会话隔离逻辑，必测）
- **优先级**：P0（修复多会话并发时的状态污染 Bug）
- **预估变更行数**：M (~180 行)
- **test_strategy**：tdd
- **依赖**：TASK-001（`openDb()` 签名稳定后，测试环境一致）
- **被依赖**：TASK-004（`pipeline_runs` 的 session_id 校验基于此修复）

#### 变更范围

| 文件 | 变更描述 | 预估行数 |
|------|---------|---------|
| `src/engine/server.js` | 8 个工具（`pipeline_init`, `pipeline_status`, `gate_enforce`, `advance_gate`, `gate_jump`, `report_status`, `gate_check`, `pipeline_guide`）：移除 `extra?.sessionId \|\| 'legacy'` 回退，替换为 `extra?.sessionId` 存在检查 + 缺失时返回 `{ error: 'session_id required. Call session_join first.' }` | ~80 |
| `src/engine/server.js` | `session_leave` 工具（第 203-207 行）：同样移除 `|| 'legacy'` 无脑删除逻辑，改为精确按 `extra?.sessionId` 操作 | ~5 |
| `src/web/routes.js` | `/api/gate/:gate/enforce`（第 112 行）：移除 `\|\| (getSessions(db)[0]?.id)`，缺少 `session_id` 时返回 400 | ~10 |
| `src/web/routes.js` | `POST /api/gate/advance`（第 127 行）：同样移除回退，缺少 `session_id` 时返回 400 | ~10 |
| `src/web/views/pipeline.html` | `checkGate()` 函数（第 451 行）：确保 `selectedSession` 非空时才发起请求，空时 toast 提示"请先选择会话" | ~10 |
| `src/web/views/pipeline.html` | `advanceGate()` 函数（第 462 行）：确保 `selectedSession` 非空时才发送，空时 toast 提示 | ~5 |
| 测试文件（新增） | 单元测试：session_id 缺失时各工具返回明确错误；两个并发会话 Gate 推进互不干扰 | ~60 |

#### 完成标准

- [ ] 8 个 Gate 工具在 `extra?.sessionId` 缺失时返回 `{ error: 'session_id required. Call session_join first.' }` 而非静默使用 `'legacy'`
- [ ] `session_leave` 在 `extra?.sessionId` 缺失时安全返回 `{ ok: true }`（无操作）
- [ ] Web API `/api/gate/:gate/enforce` 缺少 `session_id` 参数返回 HTTP 400
- [ ] Web API `POST /api/gate/advance` 缺少 `session_id` 参数返回 HTTP 400
- [ ] Web 前端未选中会话时点击"推进"提示"请先选择会话"
- [ ] 两个并发会话的 Gate 推进互不干扰（手动测试或集成测试）
- [ ] 新增单元测试全部通过

#### 并行可行性
- 与 TASK-003 修改 `server.js` 的不同行范围（本任务 213-389 行，TASK-003 第 20, 65, 180-186 行），合并冲突概率低
- 与 TASK-003 修改 `pipeline.html` 的不同函数（本任务 `checkGate`/`advanceGate`，TASK-003 `renderSessions` 第 410 行）

---

### TASK-003：修复 Web 面板 MCP 连接状态显示

- **任务 ID**：TASK-003
- **映射 REQ**：REQ-006
- **任务类型**：TDD（心跳修复是核心业务逻辑，必须测试验证）
- **优先级**：P1（影响用户体验，但不阻塞核心流水线功能）
- **预估变更行数**：S (~70 行)
- **test_strategy**：tdd
- **依赖**：TASK-001（`openDb()` 签名稳定）
- **被依赖**：无

#### 变更范围

| 文件 | 变更描述 | 预估行数 |
|------|---------|---------|
| `src/engine/server.js` | `SESSION_TIMEOUT` 常量：`600_000` (10min) → `1_800_000` (30min)（第 20 行） | ~1 |
| `src/engine/server.js` | `session_heartbeat` 工具（第 180-186 行）：不依赖 `extra?.sessionId`，改为遍历所有 active 会话进行心跳更新；或维护引擎内部最近活跃会话映射 | ~20 |
| `src/engine/server.js` | `markStaleSessions` 调用（第 65 行）：超时参数已通过常量传递，无需额外修改（`SESSION_TIMEOUT` 常量变更自动生效） | 0 |
| `src/engine/server.js` | 新增内部心跳定时器：`setInterval` 对当前活跃会话自动心跳（`broadcastHeartbeat`），作为 stdio 模式心跳的兜底方案 | ~15 |
| `src/web/views/pipeline.html` | `renderSessions()` 中 `isOnline` 判断（第 410 行）：`120000` (2min) → `600000` (10min)，与服务端 `markStaleSessions` 的 30min 超时保持合理的安全系数 | ~1 |
| 测试文件（新增） | 单元测试：stdio 模式下 `session_heartbeat` 正确更新 `last_heartbeat`；30 分钟超时正确标记 stale；引擎内部心跳定时器工作正常 | ~30 |

#### 完成标准

- [ ] stdio 模式下启动 `/jarvis` 后，Web 面板左侧边栏立即显示对应平台为"已连接"（绿色圆点）
- [ ] 会话在活跃使用期间（AI 持续调用工具），不会因心跳缺失被标记为 inactive
- [ ] 引擎内部自动心跳确保 `last_heartbeat` 在 10 分钟内持续更新
- [ ] 会话闲置超过 30 分钟后正确显示为"休眠"（琥珀色圆点）
- [ ] Web 前端 `isOnline` 窗口从 2 分钟对齐到 10 分钟
- [ ] 新增单元测试全部通过

#### 并行可行性
- 与 TASK-002 修改 `server.js` 的不同行范围（本任务第 20, 65, 180-186 行），合并冲突概率低
- 与 TASK-002 修改 `pipeline.html` 的不同区域（本任务仅改 `isOnline` 判断行）

---

### TASK-004：引入 Pipeline Runs 表（Session Model B）

- **任务 ID**：TASK-004
- **映射 REQ**：REQ-002
- **任务类型**：DDD（核心领域模型变更：新增 `PipelineRun` 聚合根，影响多个 MCP 工具和 API）
- **优先级**：P0（Session Model B 是本次变更的核心功能）
- **预估变更行数**：L (~320 行)
- **风险等级**：高
- **test_strategy**：tdd（核心聚合根和状态转换必须 TDD）
- **依赖**：TASK-001（DB 路径统一）、TASK-002（session 模型稳定后，`session_join` 逻辑需在此之上构建）
- **被依赖**：TASK-005（Web Dashboard 需要 pipeline_runs 数据）

#### 变更范围

| 文件 | 变更描述 | 预估行数 |
|------|---------|---------|
| `src/engine/db.js` | `initSchema()` 中新增 `pipeline_runs` 表 DDL（含索引） | ~20 |
| `src/engine/db.js` | 新增 CRUD 函数：`createPipelineRun()`, `getPipelineRun()`, `getActiveRun()`, `getSessionRuns()`, `updateRunGate()`, `completeRun()`, `abortRun()` | ~60 |
| `src/engine/db.js` | 数据迁移：首次启动时检测旧 `pipeline` 表有数据但 `pipeline_runs` 为空，自动为每个 session 创建首条 run | ~30 |
| `src/engine/server.js` | `session_join`（第 147-178 行）：恢复会话时先创建新 `pipeline_run`；新会话时创建首条 run | ~25 |
| `src/engine/server.js` | `pipeline_init`（第 210-221 行）：不再覆盖旧 pipeline，改为创建新 `pipeline_run` | ~15 |
| `src/engine/server.js` | 所有 Gate 工具（`gate_enforce`, `advance_gate`, `gate_jump`, `pipeline_status`, `report_status`, `gate_check`, `pipeline_guide`）：新增可选 `run_id` 参数；无 `run_id` 时默认使用当前 session 最新活跃 run | ~80 |
| `src/web/routes.js` | 新增 `GET /api/pipeline-runs?session_id=` 端点：返回指定会话的所有 runs（按时间倒序），含 Gate 进度详情 | ~30 |
| `src/web/routes.js` | `GET /api/pipeline` 调整：返回数据中增加 `run_id` 字段 | ~10 |
| 测试文件（新增） | 单元测试：`pipeline_runs` CRUD、`session_join` 创建新 run、多次调用产生多条 run、旧数据自动迁移、`run_id` 参数解析 | ~50 |

#### 完成标准

- [ ] `pipeline_runs` 表在 `initSchema()` 中自动创建，含 `(session_id, started_at DESC)` 索引
- [ ] 每次 `session_join` 调用后自动创建一条新的 `pipeline_run`（status=active）
- [ ] 同一 session 多次 `/jarvis` 调用产生多条独立 `pipeline_run` 记录，互不覆盖
- [ ] 所有 Gate 工具支持可选 `run_id` 参数；不传时默认操作当前 session 的最新活跃 run
- [ ] `GET /api/pipeline-runs?session_id=` 返回按时间倒序的 runs 列表
- [ ] 旧 session（仅有 `pipeline` 表无 `pipeline_runs`）启动时自动迁移为首条 run
- [ ] `pipeline` 表保留作为当前活跃 run 的缓存快照（向后兼容）
- [ ] WAL 模式正常，多会话并发读写不冲突
- [ ] 新增单元测试全部通过

#### 风险说明（不拆分理由）

此任务预估 320 行，属于 L 级别风险任务。不拆分的理由：
1. **垂直切片不可再分**：`pipeline_runs` 是一个完整的聚合根，DB 表、CRUD、工具适配、API 端点是一个不可拆分的功能单元。拆分为 DB→工具→API 的水平切片违反垂直切片原则，且中间状态无法独立验证。
2. **迁移逻辑与表定义必须原子化**：旧数据迁移脚本与 `pipeline_runs` 表创建必须在同一次启动中完成，否则启动两次可能导致数据重复迁移。
3. **工具函数适配是批量操作**：8 个 Gate 工具需要统一添加 `run_id` 参数支持，拆分会导致合并冲突和逻辑不一致。

**缓解措施**：
- 严格 TDD：先写聚合根测试，再实现 CRUD，再适配工具
- 分两步提交：Commit 1 = DB 层 + 迁移，Commit 2 = 工具适配 + API
- 代码审查重点：迁移脚本的幂等性和事务安全

---

### TASK-005：Web Dashboard 展示 Pipeline Runs 历史

- **任务 ID**：TASK-005
- **映射 REQ**：REQ-003
- **任务类型**：直接开发（UI 扩展，无复杂业务逻辑）
- **优先级**：P1（UI 增强，不阻塞核心功能）
- **预估变更行数**：M (~200 行)
- **test_strategy**：manual_only（UI 变更，手动浏览器验证即可）
- **依赖**：TASK-004（需要 `GET /api/pipeline-runs` 端点就绪）
- **被依赖**：无

#### 变更范围

| 文件 | 变更描述 | 预估行数 |
|------|---------|---------|
| `src/web/routes.js` | 确认/完善 `GET /api/pipeline-runs?session_id=` 端点（已在 TASK-004 中定义，此处可能需微调响应格式以适配前端展示） | ~15 |
| `src/web/views/pipeline.html` | 顶部统计卡片：新增"历史运行"计数 | ~20 |
| `src/web/views/pipeline.html` | 进度条下方新增"历史 Runs"折叠面板：展示当前会话的所有 pipeline runs，按时间倒序 | ~80 |
| `src/web/views/pipeline.html` | 每条 run 卡片显示：pipeline_type、当前 Gate、开始时间、状态标签（active/completed/aborted）、Gate 进度 mini 展示 | ~60 |
| `src/web/views/pipeline.html` | 当前活跃 run 高亮边框（indigo 主题色），历史 run 使用浅灰样式 | ~15 |
| `src/web/views/pipeline.html` | JavaScript：新增 `fetchPipelineRuns(sessionId)` 函数和 `renderRunsHistory()` 函数 | ~30 |

#### 完成标准

- [ ] Dashboard 选中会话后，展示该会话的所有 pipeline runs（按时间倒序）
- [ ] 活跃 run 有明显视觉标识（indigo 边框或徽章）
- [ ] 历史 run 可展开查看 Gate 进度（复用现有 Gate 状态组件）
- [ ] 历史 runs 面板支持折叠/展开
- [ ] 前端分页：默认显示最近 20 条 runs，更多通过"加载更多"按钮
- [ ] 页面不因 runs 数量增多而明显卡顿（渲染性能可接受）
- [ ] 浏览器手动验证：多会话、多 run 场景下 UI 显示正确

#### 并行可行性
- `src/web/routes.js` 微调与 TASK-002（已完成）互不冲突
- `src/web/views/pipeline.html` 新增区域与 TASK-002/TASK-003 修改区域不重叠（本任务新增 runs 面板在进度条下方，其他任务修改现有会话列表和 MCP 状态区域）

---

### TASK-006：版本发布 v3.23.0

- **任务 ID**：TASK-006
- **映射 REQ**：REQ-004
- **任务类型**：直接开发（发布流程，无业务逻辑）
- **优先级**：P2（发布依赖所有功能完成）
- **预估变更行数**：XS (~15 行)
- **test_strategy**：manual_only（发布流程手动验证）
- **依赖**：TASK-001, TASK-002, TASK-003, TASK-004, TASK-005（全部完成）
- **被依赖**：无

#### 变更范围

| 文件 | 变更描述 | 预估行数 |
|------|---------|---------|
| `package.json` | 版本号 `3.22.2` → `3.23.0` | ~1 |
| `CHANGELOG.md`（若存在） | 记录 v3.23.0 变更：统一数据目录、Pipeline Runs 表、FSM 修复、MCP 状态修复 | ~10 |

#### 完成标准

- [ ] `package.json` 版本号递增至 `3.23.0`
- [ ] `git tag v3.23.0` 创建并推送到 Gitee + GitHub
- [ ] `npm publish` 执行成功（或 `npm pack --dry-run` 验证通过）
- [ ] changelog 记录本次变更要点
- [ ] 三平台（Gitee + GitHub + npm）均可见 v3.23.0

---

## 4. DDD 分类

| 任务 ID | DDD 理由 |
|---------|---------|
| **TASK-004** | 新增 `PipelineRun` 聚合根，涉及复杂的生命周期状态转换（active → completed/aborted）、与 `Session` 及 `Pipeline`（缓存快照）的多聚合交互、旧数据迁移的领域事件。属于 DDD 战术设计的典型场景。 |

其余任务（TASK-001/002/003/005/006）不涉及新聚合根或复杂状态机，无需 DDD。

---

## 5. TDD 与直接开发分类

### TDD 任务（必须 Red → Green → Refactor）

| 任务 ID | TDD 理由 |
|---------|---------|
| **TASK-002** | 修复 FSM 会话不一致是核心业务规则修复。移除 `'legacy'` 回退后，必须验证：①session_id 缺失时返回明确错误（不静默操作错误会话）；②两个并发会话互不干扰。这些是高风险契约行为，必须 TDD。 |
| **TASK-003** | 心跳修复涉及状态同步（stdio 模式心跳链路），超时窗口变更可能引入边界条件 Bug。必须 TDD 验证：①stdio 模式下心跳成功更新；②30 分钟超时正确；③引擎内部自动心跳不泄漏。 |
| **TASK-004** | `PipelineRun` 聚合根的 CRUD、状态转换、默认 run 选择逻辑、旧数据迁移幂等性。这些是核心领域逻辑，必须 TDD 覆盖所有状态路径和边界条件。 |

### 直接开发任务

| 任务 ID | 理由 |
|---------|------|
| **TASK-001** | 路径重构 + 文件迁移是基础设施变更。迁移逻辑的正确性通过集成测试验证（启动引擎 + 检查 DB 位置），TDD 不适用（Mock 文件系统成本过高）。 |
| **TASK-005** | UI 扩展，无复杂业务逻辑。手动浏览器验证即可。 |
| **TASK-006** | 版本号递增 + git tag + npm publish 是纯发布流程。 |

---

## 6. 风险任务

| 任务 ID | 风险等级 | 风险描述 | 缓解措施 |
|---------|---------|---------|---------|
| **TASK-004** | **高** | L 级别变更（~320 行），涉及新增聚合根、修改 8 个 MCP 工具签名、数据迁移。且修改 `db.js`（共享区域）和 `server.js`（共享区域），是本次变更最复杂的任务。 | ①严格 TDD；②分两次提交（DB 层 + 工具适配）；③迁移脚本用事务包裹 + 幂等检测；④代码审查重点检查 session_id/run_id 逻辑一致性 |
| **TASK-001** | **中** | 修改 `db.js`（openDb 函数签名变更）影响所有调用方；数据迁移涉及文件系统操作，跨平台（Windows/Linux）行为需验证。 | ①迁移失败不阻塞引擎启动（try-catch + 日志）；②在 Windows 和 Linux 环境分别验证 `homedir()` 路径解析 |
| **TASK-002** | **中** | 修改 8 个 MCP 工具函数签名，涉及所有 Gate 操作的参数校验逻辑；Web API 的 400 错误处理需前端适配。 | ①TDD 覆盖所有 8 个工具的错误分支；②Web 前端 toast 提示 graceful 处理 400 响应 |

---

## 7. 文件所有权与共享路径冲突检查

### 共享文件矩阵

| 文件 | TASK-001 | TASK-002 | TASK-003 | TASK-004 | TASK-005 | TASK-006 |
|------|----------|----------|----------|----------|----------|----------|
| `src/engine/db.js` | **L5-L13** (openDb) | - | - | **L15-L116** (initSchema + CRUD) | - | - |
| `src/engine/server.js` | **L62** (openDb 调用) | **L213-L389** (8 个工具) | **L20**, **L65**, **L180-L186** (心跳+超时) | **L147-L178** (session_join), **L210-L389** (全部工具签名) | - | - |
| `src/web/routes.js` | - | **L109-L153** (enforce/advance) | - | **新增端点** (pipeline-runs) | **微调端点** (响应格式) | - |
| `src/web/views/pipeline.html` | - | **checkGate/advanceGate** 函数 | **L410** (isOnline) | - | **新增区域** (runs面板) | - |
| `src/install.js` | **L218-L227**, **L236-L280** | - | - | - | - | - |
| `package.json` | - | - | - | - | - | **L3** (version) |

### 冲突分析

| 冲突组 | 涉及任务 | 冲突程度 | 解决方案 |
|--------|---------|---------|---------|
| `server.js` 多任务修改 | TASK-001/002/003/004 | **高**（4 个任务） | 非重叠行范围：TASK-001(L62)、TASK-003(L20,65,180-186)、TASK-002(L213-389)。TASK-004 在 TASK-002 基础上增加 `run_id` 参数，需确保 TASK-002 完成后才启动 TASK-004 |
| `db.js` 双任务修改 | TASK-001/004 | **中** | TASK-001 修改 `openDb()` 函数体（L5-L13），TASK-004 在 `initSchema()` 内新增表（L15 之后）。非重叠区域，TASK-001 必须先行 |
| `routes.js` 三任务修改 | TASK-002/004/005 | **中** | TASK-002 修改 enforce/advance 参数校验，TASK-004 新增 pipeline-runs 端点，TASK-005 微调响应格式。建议 TASK-002 → TASK-004 → TASK-005 严格串行 |
| `pipeline.html` 三任务修改 | TASK-002/003/005 | **中** | 三个任务修改不同函数/区域，冲突概率低。建议 TASK-002 和 TASK-003 在并行批次中完成，TASK-005 延后 |

### 唯一责任方

| 共享文件 | 唯一责任方 | 说明 |
|---------|-----------|------|
| `src/engine/db.js` | **TASK-001 先行，TASK-004 在后** | TASK-001 变更函数签名后 TASK-004 基于新签名扩展 |
| `src/engine/server.js` | **严格串行：TASK-001 → TASK-002/003 → TASK-004** | 每个任务基于前一个任务的稳定版本迭代 |
| `src/web/routes.js` | **TASK-002 → TASK-004 → TASK-005** | 强制串行 |
| `src/web/views/pipeline.html` | **TASK-002/003 → TASK-005** | 低冲突，可伪并行 |

---

## 8. 推荐交付顺序

```
第 1 轮：基础设施 — TASK-001（统一数据目录）
  ├── 变更：~120 行
  ├── 验证：引擎启动，DB 在 ~/.jarvis/，Web 面板正常
  └── 产出：稳定 DB 路径

第 2 轮：Bug 修复（并行批次）— TASK-002 + TASK-003
  ├── TASK-002（FSM 修复）：~180 行，修改 server.js L213-389
  ├── TASK-003（MCP 状态修复）：~70 行，修改 server.js L20,65,180-186
  ├── 并行理由：非重叠行范围 + 非重叠 pipeline.html 区域 + 非重叠 routes.js 区域
  ├── 合并策略：TASK-002 先提交，TASK-003 rebase 后提交
  └── 产出：稳定 session 隔离 + 正确的 MCP 状态显示

第 3 轮：核心功能 — TASK-004（Pipeline Runs 表）
  ├── 变更：~320 行（风险任务）
  ├── 依赖：第 1 轮 + 第 2 轮全部完成
  ├── 验证：多次 /jarvis 调用产生多条 run，API 可查询
  └── 产出：Session Model B 就绪

第 4 轮：UI 增强 — TASK-005（Web Dashboard Runs 历史）
  ├── 变更：~200 行
  ├── 依赖：第 3 轮（pipeline-runs API 就绪）
  ├── 验证：浏览器查看 runs 列表、历史 Gate 进度
  └── 产出：完整 Dashboard

第 5 轮：发布 — TASK-006（v3.23.0）
  ├── 变更：~15 行
  ├── 依赖：全部完成
  └── 产出：npm + Gitee + GitHub 三平台发布
```

---

## 9. 推荐的下一步

1. **Planner 接收此任务文档**，按推荐交付顺序制定执行计划
2. **第 1 轮优先**：TASK-001（统一数据目录）是最低风险的基础设施变更，先行完成可为后续任务提供稳定基础
3. **TDD 任务提前准备测试文件**：TASK-002、TASK-003、TASK-004 在编码前需先编写测试用例
4. **TASK-004 需额外评审**：作为 L 级别风险任务，建议在启动前进行简短的实现方案评审（确认聚合根设计、迁移方案、向后兼容策略）

---

## 10. 验证清单（任务分解质量自检）

- [x] 所有 REQ（001-006）均至少映射到 1 个 TASK
- [x] 任务使用垂直切片策略（每个任务交付完整功能路径）
- [x] 无水平切片（按技术层级拆分的任务）
- [x] 每个任务有明确的优先级和 test_strategy
- [x] 依赖关系已明确，无循环依赖
- [x] 并行机会已识别（第 2 轮 TASK-002 + TASK-003）
- [x] 风险任务已标注（TASK-004 高、TASK-001 中、TASK-002 中）
- [x] 单轮次总变更不超过 1000 行
- [x] 共享区域冲突已分析，串行约束已标注
- [x] 每个任务有可独立验证的完成标准
