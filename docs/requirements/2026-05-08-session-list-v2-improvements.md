# 需求文档：会话列表 V2 优化与门禁文档追踪

> **状态**：confirmed | **日期**：2026-05-08 | **范围**：前端 UI + 后端 API + 数据库

## 背景

v3.26.0 完成了会话列表的卡片化布局（2 行垂直排列），但存在以下遗留问题：
1. 排序逻辑缺失——会话按数据库原始顺序排列，最新的 run 没排在最前
2. 状态指示点位置不合理——在标题右侧，用户期望在左侧
3. 恢复按钮分散在每个休眠会话项中，占用侧边栏空间
4. 会话名称依赖用户手动设置，Agent 不会自动命名
5. ⋮ 更多菜单仍仅对活跃 run 可用，无 run 会话无法删除
6. 指令标签保留 `/` 前缀，不利于未来多平台扩展
7. 门禁文档展示全局所有文档（非当前会话专属），点击无详情查看能力

## 需求

### REQ-SL-005：按 Run 创建时间排序

会话列表排序规则改为：
- **第一优先级**：置顶（pinned=1 的会话始终在最前）
- **第二优先级**：最新的 pipeline run 创建时间（`started_at DESC`），无 run 的会话排在最后

**验收标准**：
- 有活跃/历史 run 的会话按 run 创建时间倒序排列
- 无任何 run 的会话排在列表末尾，按 session 创建时间倒序
- 置顶会话不受时间排序影响，始终在顶部
- 平台筛选后排序规则不变

**后端改动**：修改 `getSessions()` 或 `/api/sessions` 返回数据，附带 `latest_run_started_at` 字段供前端排序。

### REQ-SL-006：状态指示点移到标题左侧

当前状态点（🟢在线 / 🟡休眠 / ⚫离线）在 Row 1 的最右侧（标题后面），改为放在标题左侧（置顶标记和标题之间）。

**验收标准**：
- 状态指示圆点显示在标题文字的左侧
- 置顶标记（📌）仍在状态点左侧
- Row 1 布局：`[📌] [●] [标题文字]`

### REQ-SL-007：恢复按钮移到看板顶部操作栏

当前每个休眠会话项在 Row 2 显示独立的恢复按钮（`rotate-ccw` 图标），占用空间且每个会话重复。

改为：
- 侧边栏会话项中**移除**恢复按钮
- 在看板（右侧主内容区）的顶部操作栏增加「恢复会话」按钮，仅当选中休眠会话时显示
- 按钮样式与现有操作栏协调

**验收标准**：
- 休眠会话的侧边栏项中无恢复按钮
- 选中休眠会话后，看板顶部出现「恢复会话」按钮
- 点击恢复按钮发送 `POST /api/sessions/:id/resume`，行为不变
- 选中活跃会话时恢复按钮不显示（或置灰）

### REQ-SL-008：Agent 自动设置任务名称

当 Agent 调用 `pipeline_init` 初始化流水线时，根据项目名称和用户意图自动生成合理的 `task_name` 并存储。

**实现方式**：在 `pipeline_init` MCP 工具的 handler 中，若未显式传入 `task_name`，则根据 `project_name` 和当前日期自动生成默认名称（如 `"E:\CodeStore\jarvis 流水线任务"` → `"jarvis 流水线任务"`）。

**验收标准**：
- 新初始化的 pipeline run 自动拥有 task_name（非 null）
- 用户仍可通过 `session_set_name` 或 `PATCH /api/pipeline-runs/:id/name` 覆盖
- 现有无名称的 run 不受影响（向后兼容）

### REQ-SL-009：⋮ 菜单所有会话可操作

当前 ⋮ 更多菜单仅对 `hasActiveRun === true` 的会话显示可点击按钮，无 run 会话的按钮灰色禁用（仅显示占位）。

改为：
- **所有会话的 ⋮ 按钮均可点击**，始终弹出菜单
- 菜单始终显示三个选项：置顶/取消置顶、归档、删除
- 无活跃 run 的会话：置顶和归档选项**置灰禁用**（`text-slate-300 cursor-not-allowed`），仅删除可用
- 有活跃 run 的会话：全部三个选项正常可用
- **删除选项始终使用危险红色**（`text-red-500 hover:bg-red-50`）

**验收标准**：
- 点击任意会话的 ⋮ 按钮均弹出菜单
- 无 run 会话：置顶/归档灰色不可点击，删除红色可点击
- 有 run 会话：三个选项均可点击，删除为红色
- 删除 hover 背景为浅红色（`hover:bg-red-50`）

### REQ-SL-010：去掉指令标签的 "/" 前缀

当前 `COMMAND_LABELS` 定义中指令带有 `/` 前缀（如 `/jarvis`、`/jarvis-lite`），因为起初只支持 Claude Code 的斜杠命令。

改为去掉 `/` 前缀，适配多平台（OpenCode 用 `--agent`、Codex 用 skill 名）。

**验收标准**：
- 侧边栏会话项显示的指令标签为 `jarvis` / `jarvis-lite` / `jarvis-fe` / `jarvis-be`（无 `/`）
- 不影响平台筛选、状态判断等其他逻辑

### REQ-SL-011：门禁文档按会话过滤

当前 `findGateArtifacts()` 扫描全局 `docs/` 目录，返回所有 `.md` 文件（不区分会话）。导致看板 Gate 卡片中展示的文档列表包含其他会话的产物。

**后端改动**：
- 修改 `findGateArtifacts()` 或 `/api/pipeline` 端点，只返回**当前选中会话**的产物文件
- 关联逻辑：通过 `checkpoints` 表找到该 session 在 docs 目录中对应日期/主题的文档
- 若无 session 级别的精确映射，使用日期匹配策略：匹配文件名前缀 `YYYY-MM-DD` 与 checkpoint `passed_at` 日期

**前端改动**：看板 Gate 卡片中只显示当前会话的产物文件名。

**验收标准**：
- 切换到不同会话时，Gate 卡片中的文档列表随之变化
- 每个 Gate 只展示该会话产出的文档（非全局文档）
- 若当前会话无产物，显示"暂无产物文件"

### REQ-SL-012：点击文档名右侧滑出抽屉展示 MD

点击 Gate 卡片中的文档文件名时，从右侧滑出一个抽屉面板，展示该 Markdown 文件的渲染内容。

**前端实现**：
- 抽屉宽度约 50-60% 视口宽度，从右侧滑入（CSS transition）
- 抽屉内渲染 Markdown 为 HTML（使用 marked.js CDN 或纯文本展示）
- 抽屉顶部显示文件名和关闭按钮
- 点击抽屉外部遮罩层或关闭按钮关闭抽屉

**后端 API**（REQ-SL-013）：
新增 `GET /api/docs/:filepath` 端点，读取 `docs/` 目录下的 `.md` 文件并返回原始 Markdown 内容。

**验收标准**：
- 点击文档文件名 → 右侧抽屉滑出
- 抽屉内正确渲染 Markdown 内容（标题、列表、代码块等）
- 点击关闭按钮或遮罩层 → 抽屉滑回关闭
- 若文件读取失败，抽屉内显示错误提示

### REQ-SL-013：新增文档读取 API

新增 `GET /api/docs/:filepath` REST 端点：
- 接受 URL 编码的文件路径参数（相对 `docs/` 目录）
- 读取文件内容并以 `text/plain; charset=utf-8` 返回
- 路径遍历防护（拒绝 `..` 路径）
- 文件不存在返回 404

**验收标准**：
- `GET /api/docs/requirements/2026-05-08-session-list-v2-improvements.md` 返回该文件内容
- 包含 `..` 的路径返回 400
- 不存在的文件返回 404

### REQ-SL-014：会话名称自动回退优化

当前 `renderSessions()` 中无 `task_name` 时的回退标题为「流水线中文名 + 时间戳」（如"完整流水线 23:03"），辨识度低。

改为更友好的回退格式：`"平台名 · 流水线类型 · HH:MM"`（如 `"Claude · 完整流水线 · 23:03"`）。

**验收标准**：
- 无 task_name 的会话显示 `平台名 · 类型 · 时间` 格式（添加 `.` 分隔符提升可读性；`·` 作为分隔符增加了辨识度）
- 有 task_name 的会话保持显示 task_name（不受影响）

---

## 不在范围

- 不修改归档面板布局
- 不修改智能体配置页
- 不修改历史 Runs 面板
- 不修改 SSE 推送机制
- 不引入新的数据库表（仅修改查询逻辑）
- 不涉及 npm 包依赖变更（marked.js 通过 CDN 引入）

## 技术约束

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/web/views/pipeline.html` | 修改 | 排序、状态点位置、恢复按钮移除、⋮菜单、指令标签、Gate文档抽屉 |
| `src/engine/db.ts` | 修改 | `getSessions()` 增加 `latest_run_started_at` 字段 |
| `src/engine/gates.ts` | 修改 | `findGateArtifacts()` 按 session 过滤 |
| `src/engine/server.ts` | 修改 | `pipeline_init` 自动设置 task_name |
| `src/web/routes.ts` | 修改 | 新增 `GET /api/docs/:filepath`、`/api/pipeline` 过滤文档 |

不新增文件，不引入新 npm 依赖。
