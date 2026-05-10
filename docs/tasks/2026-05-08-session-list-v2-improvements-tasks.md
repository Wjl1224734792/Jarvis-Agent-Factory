# 任务分解：会话列表 V2 优化与门禁文档追踪

> **需求文档**：`docs/requirements/2026-05-08-session-list-v2-improvements.md`
> **日期**：2026-05-08
> **状态**：Draft
> **总预估变更行数**：~320 行（<1000，单轮次交付）

## 任务概览

| TASK | REQ | 名称 | 类型 | 文件 | 估行 | 优先级 | 依赖 |
|------|-----|------|------|------|------|--------|------|
| TASK-001 | REQ-SL-005 | 按 Run 创建时间排序 — 后端 | Direct | db.ts (15行) | XS | P0 | — |
| TASK-002 | REQ-SL-008 | Agent 自动设置任务名 | Direct | server.ts (20行) | XS | P0 | — |
| TASK-003 | REQ-SL-011 | 门禁文档按会话过滤 — 后端 | Direct | gates.ts (25行) / routes.ts (20行) | S | P0 | — |
| TASK-004 | REQ-SL-013 | 新增文档读取 API | **TDD** | routes.ts (35行) | S | P0 | — |
| TASK-005 | REQ-SL-005, REQ-SL-014 | 排序前端 + 名称回退优化 | Direct | pipeline.html (30行) | S | P1 | TASK-001 |
| TASK-006 | REQ-SL-006, REQ-SL-007 | 状态点左移 + 恢复按钮迁移 | Direct | pipeline.html (45行) | S | P1 | TASK-005 |
| TASK-007 | REQ-SL-009 | ⋮ 菜单所有会话可操作 | Direct | pipeline.html (30行) | S | P1 | TASK-006 |
| TASK-008 | REQ-SL-010 | 去掉指令标签 "/" 前缀 | Direct | pipeline.html (5行) | XS | P2 | TASK-007 |
| TASK-009 | REQ-SL-011 | 门禁文档会话过滤 — 前端 | Direct | pipeline.html (15行) | XS | P1 | TASK-003, TASK-005 |
| TASK-010 | REQ-SL-012 | 文档名点击滑出抽屉展示 MD | Direct | pipeline.html (120行) | M | P0 | TASK-004, TASK-009 |

---

## 任务分解列表

---

### TASK-001：按 Run 创建时间排序 — 后端

- **task_id**：TASK-001
- **requirement_ids**：[REQ-SL-005]
- **type**：Direct
- **priority**：P0
- **estimated_lines**：~15
- **test_strategy**：test_after（SQL 查询结果人工验证）
- **files**：
  - `src/engine/db.ts`：修改 `getSessions()` 查询
- **dependencies**：无
- **parallel_group**：PG-backend（与 TASK-002、TASK-003、TASK-004 并行）
- **risk**：低
- **shared_region_conflict**：`db.ts` 仅本任务修改，无冲突
- **acceptance_criteria**：
  1. `getSessions()` 返回数据包含 `latest_run_started_at` 字段
  2. 会话按 `pinned DESC, latest_run_started_at DESC NULLS LAST` 排序
  3. 无 run 的会话 `latest_run_started_at` 为 null，排在列表末尾
  4. `/api/sessions` 响应中包含 `latest_run_started_at` 字段
- **implementation_notes**：
  - 当前代码：`db.ts:189-192`，`getSessions()` 使用 `ORDER BY created_at`
  - 改为 LEFT JOIN `pipeline_runs` 获取 `MAX(started_at)` 作为 `latest_run_started_at`
  - 排序：`ORDER BY pinned DESC, latest_run_started_at DESC NULLS LAST`
  - 需同步更新 `/api/sessions` 端点在 `routes.ts:166-185` 中的映射字段

---

### TASK-002：Agent 自动设置任务名称

- **task_id**：TASK-002
- **requirement_ids**：[REQ-SL-008]
- **type**：Direct
- **priority**：P0
- **estimated_lines**：~20
- **test_strategy**：manual_only（通过 MCP 工具调用验证）
- **files**：
  - `src/engine/server.ts`：修改 `pipeline_init` MCP 工具 handler
- **dependencies**：无
- **parallel_group**：PG-backend（与 TASK-001、TASK-003、TASK-004 并行）
- **risk**：低
- **shared_region_conflict**：`server.ts` 仅本任务修改，无冲突
- **acceptance_criteria**：
  1. `pipeline_init` 创建新 run 时，若未传入 `task_name`，自动生成默认名称
  2. 默认名称格式：`"<project_name> 流水线任务"`（如 `"jarvis 流水线任务"`）
  3. 包含当前日期后缀以增加辨识度（如 `"jarvis 流水线任务 · 05-08"`）
  4. 用户显式传入 `task_name` 时，使用用户指定的名称（不覆盖）
  5. 已有 task_name 的 run 不受影响（向后兼容）
- **implementation_notes**：
  - 在 `createPipelineRun()` 之后调用 `setRunTaskName()` 设置默认名称
  - 从 `project_name` 提取最后一段路径名（如 `E:\CodeStore\jarvis` → `jarvis`）
  - 需检查 `setRunTaskName` 的导入状态（`db.ts` 中已存在）

---

### TASK-003：门禁文档按会话过滤 — 后端

- **task_id**：TASK-003
- **requirement_ids**：[REQ-SL-011]
- **type**：Direct
- **priority**：P0
- **estimated_lines**：~45
- **test_strategy**：test_after（不同会话切换验证产物列表）
- **files**：
  - `src/engine/gates.ts`：新增或修改 `findGateArtifacts()` 支持 session 过滤
  - `src/web/routes.ts`：修改 `/api/pipeline` 端点传入 session 过滤参数
- **dependencies**：无
- **parallel_group**：PG-backend（与 TASK-001、TASK-002、TASK-004 并行）
- **risk**：中 — `gates.ts` 和 `routes.ts` 均由本任务修改，且涉及文件过滤逻辑
- **shared_region_conflict**：
  - `gates.ts`：仅本任务修改
  - `routes.ts`：**与 TASK-004 共享**（不同端点位置，低冲突风险，但建议 TASK-003 先于 TASK-004）
- **acceptance_criteria**：
  1. `findGateArtifacts()` 支持按 session 过滤产物文件
  2. `/api/pipeline` 端点返回的 `artifacts` 仅包含当前 session 的产物文件
  3. 过滤逻辑：通过 `checkpoints` 表匹配 session 在 docs 目录中对应日期/主题的文档
  4. 无 session 级精确映射时，使用日期匹配策略（文件名前缀 `YYYY-MM-DD` 匹配 checkpoint `passed_at` 日期）
  5. 切换不同会话时，Gate 卡片中的文档列表随之变化
- **implementation_notes**：
  - 当前 `findGateArtifacts(docsDir, gate)` 扫描全局 `docs/` 目录
  - 方案 A：新增 `findSessionGateArtifacts(docsDir, gate, sessionId, db)` 函数，查询 `checkpoints` 表获取 session 相关的日期范围
  - 方案 B：在 `routes.ts:91-116` `/api/pipeline` 端点中，将 `findGateArtifacts(getDocsDir(root), g)` 替换为 session-aware 版本
  - 推荐方案 A：保持函数职责分离，在 `gates.ts` 新增函数，`routes.ts` 调用新函数

---

### TASK-004：新增文档读取 API（TDD）

- **task_id**：TASK-004
- **requirement_ids**：[REQ-SL-013]
- **type**：**TDD**
- **priority**：P0
- **estimated_lines**：~35（不含测试代码）
- **test_strategy**：tdd（先写失败测试再实现）
- **files**：
  - `src/web/routes.ts`：新增 `GET /api/docs/:filepath` 端点
- **dependencies**：无
- **parallel_group**：PG-backend（与 TASK-001、TASK-002、TASK-003 并行）
- **risk**：中 — 涉及文件系统读取和路径遍历防护，安全敏感
- **shared_region_conflict**：
  - `routes.ts`：**与 TASK-003 共享**（不同端点位置，低冲突风险，建议 TASK-003 先于 TASK-004）
- **acceptance_criteria**：
  1. `GET /api/docs/requirements/2026-05-08-session-list-v2-improvements.md` 返回该文件的原始 Markdown 内容
  2. 路径包含 `..` 的请求返回 400 状态码
  3. 不存在的文件返回 404 状态码
  4. 响应 Content-Type 为 `text/plain; charset=utf-8`
  5. 仅允许 `.md` 后缀文件（拒绝其他扩展名）
- **implementation_notes**：
  - 新增端点位于 `routes.ts` 中（建议在 `/api/sessions` 之后区域）
  - 文件路径通过 URL 编码参数传递，需先 `decodeURIComponent`
  - 路径解析基于 `docs/` 目录（使用 `resolve(docsDir, filepath)`）
  - 必须校验解析后的路径仍在 `docsDir` 前缀范围内，防止目录遍历攻击
  - 读取文件使用 `readFileSync` 或 `existsSync` + `readFileSync`

**TDD 测试用例（需在实现前编写）：**

| # | 场景 | 输入 | 预期 |
|---|------|------|------|
| 1 | 正常读取 | `/api/docs/requirements/test.md`（文件存在） | 200 + 文件内容 |
| 2 | 路径遍历攻击 | `/api/docs/../../../etc/passwd` | 400 |
| 3 | URL 编码的路径遍历 | `/api/docs/..%2F..%2F..%2Fetc%2Fpasswd` | 400 |
| 4 | 文件不存在 | `/api/docs/nonexistent.md` | 404 |
| 5 | 非 .md 文件 | `/api/docs/script.js` | 400 |
| 6 | 空路径 | `/api/docs/` | 400 |

---

### TASK-005：排序前端 + 会话名称回退优化

- **task_id**：TASK-005
- **requirement_ids**：[REQ-SL-005, REQ-SL-014]
- **type**：Direct
- **priority**：P1
- **estimated_lines**：~30
- **test_strategy**：manual_only（UI 视觉验证）
- **files**：
  - `src/web/views/pipeline.html`：修改排序逻辑 + 名称回退格式
- **dependencies**：[TASK-001]（需要 API 返回 `latest_run_started_at` 字段）
- **parallel_group**：无（pipeline.html 同一文件，必须串行于所有修改该文件的任务中）
- **risk**：低
- **shared_region_conflict**：
  - `pipeline.html`：**与 TASK-006~TASK-010 共享**（同一文件，必须按序执行）
- **acceptance_criteria**：
  **排序部分（REQ-SL-005）：**
  1. 会话列表按 `latest_run_started_at DESC` 排序
  2. 置顶会话不受时间排序影响，始终在顶部
  3. 无 run 的会话排在列表末尾
  4. 平台筛选后排序规则不变

  **名称回退部分（REQ-SL-014）：**
  5. 无 task_name 的会话显示格式：`平台名 · 流水线类型 · HH:MM`（如 `Claude · 完整流水线 · 23:03`）
  6. 有 task_name 的会话保持显示 task_name（不受影响）
- **implementation_notes**：
  - 排序：在 `renderSessions()` 中（`pipeline.html:480-563`），对 `filtered` 数组执行 `sort()` 后再渲染
  - 排序键：`s.pinned`（置顶优先）、`s.latest_run_started_at`（时间倒序）
  - 名称回退：修改 `fallbackTitle` 构建逻辑（`pipeline.html:518`），当前为 `ptName + ' ' + timeStr`，改为 `s.platform + ' · ' + ptName + ' · ' + timeStr`
  - 平台名需映射为中文显示名（如 `claude-code` → `Claude`），参考现有的 `s.platform` 字段

---

### TASK-006：状态指示点左移 + 恢复按钮迁移到看板操作栏

- **task_id**：TASK-006
- **requirement_ids**：[REQ-SL-006, REQ-SL-007]
- **type**：Direct
- **priority**：P1
- **estimated_lines**：~45
- **test_strategy**：manual_only（UI 交互验证）
- **files**：
  - `src/web/views/pipeline.html`：修改 Row 1 布局 + Row 2 恢复按钮 + 看板操作栏
- **dependencies**：[TASK-005]（同一文件，需在其基础上修改）
- **parallel_group**：无
- **risk**：低
- **shared_region_conflict**：
  - `pipeline.html`：**与 TASK-005, TASK-007~TASK-010 共享**
- **acceptance_criteria**：
  **状态指示点（REQ-SL-006）：**
  1. 状态指示圆点显示在标题文字的左侧
  2. 置顶标记（📌）在状态点左侧
  3. Row 1 布局：`[📌] [●] [标题文字]`

  **恢复按钮（REQ-SL-007）：**
  4. 休眠会话的侧边栏项中**无**恢复按钮
  5. 选中休眠会话后，看板顶部操作栏出现「恢复会话」按钮
  6. 点击恢复按钮发送 `POST /api/sessions/:id/resume`，行为不变
  7. 选中活跃会话时恢复按钮不显示（或置灰不可点击）
  8. 恢复按钮样式与现有操作栏协调
- **implementation_notes**：
  - 状态点：当前在标题右侧 `pipeline.html:537`，移到标题左侧 `pipeline.html:536` 之前、置顶标记之后
  - 恢复按钮：当前在 Row 2 中 `pipeline.html:542`（`isInactive` 条件），删除该段代码
  - 看板操作栏：在看板顶部的统计卡区域或页面标题旁新增恢复按钮，使用 `v-if="selectedSession & isInactive"` 类似逻辑
  - 恢复函数 `resumeSession()` 已在 `pipeline.html:573` 定义，直接复用

---

### TASK-007：⋮ 菜单所有会话可操作

- **task_id**：TASK-007
- **requirement_ids**：[REQ-SL-009]
- **type**：Direct
- **priority**：P1
- **estimated_lines**：~30
- **test_strategy**：manual_only（UI 交互验证）
- **files**：
  - `src/web/views/pipeline.html`：修改 ⋮ 菜单的条件渲染逻辑和样式
- **dependencies**：[TASK-006]（同一文件，需在其基础上修改）
- **parallel_group**：无
- **risk**：低
- **shared_region_conflict**：
  - `pipeline.html`：**与 TASK-005, TASK-006, TASK-008~TASK-010 共享**
- **acceptance_criteria**：
  1. 点击**任意**会话的 ⋮ 按钮均弹出菜单
  2. 无 run 会话：置顶/归档选项置灰禁用（`text-slate-300 cursor-not-allowed`），仅删除可用
  3. 有 run 会话：全部三个选项正常可用
  4. 删除选项始终使用危险红色（`text-red-500 hover:bg-red-50`）
  5. 菜单始终显示三个选项：置顶/取消置顶、归档、删除
- **implementation_notes**：
  - 当前 `hasActiveRun` 判断在 `pipeline.html:544-559`，两套分支（可点击 vs 灰色禁用）
  - 改为统一渲染可点击按钮，菜单项根据 `hasActiveRun` 动态设置 class
  - 无 run 时置顶/归档添加 `text-slate-300 cursor-not-allowed pointer-events-none`
  - 删除按钮始终使用 `text-red-500 hover:bg-red-50`（当前已是红色，确认 hover 为浅红）
  - 确保 `event.stopPropagation()` 不丢失（防止冒泡触发 `selectSession`）

---

### TASK-008：去掉指令标签 "/" 前缀

- **task_id**：TASK-008
- **requirement_ids**：[REQ-SL-010]
- **type**：Direct
- **priority**：P2
- **estimated_lines**：~5
- **test_strategy**：manual_only（UI 视觉验证）
- **files**：
  - `src/web/views/pipeline.html`：修改 `COMMAND_LABELS` 常量定义
- **dependencies**：[TASK-007]（同一文件，需在其基础上修改）
- **parallel_group**：无
- **risk**：低
- **shared_region_conflict**：
  - `pipeline.html`：**与 TASK-005~TASK-007, TASK-009~TASK-010 共享**
- **acceptance_criteria**：
  1. 侧边栏会话项显示的指令标签为 `jarvis` / `jarvis-lite` / `jarvis-fe` / `jarvis-be`（无 `/` 前缀）
  2. 平台筛选、状态判断等其他逻辑不受影响
- **implementation_notes**：
  - 修改 `COMMAND_LABELS` 对象 `pipeline.html:312-317`，去掉 `label` 值中的 `/` 前缀
  - 检查是否有代码对 `cmd.label` 做字符串匹配（如 `startsWith('/')`），若有则同步修改

---

### TASK-009：门禁文档会话过滤 — 前端

- **task_id**：TASK-009
- **requirement_ids**：[REQ-SL-011]
- **type**：Direct
- **priority**：P1
- **estimated_lines**：~15
- **test_strategy**：manual_only（切换会话验证产物列表）
- **files**：
  - `src/web/views/pipeline.html`：Gate 卡片渲染逻辑（产物提示文字）
- **dependencies**：[TASK-003, TASK-005]（需后端过滤 + 前端排序基础就绪）
- **parallel_group**：无
- **risk**：低
- **shared_region_conflict**：
  - `pipeline.html`：**与 TASK-005~TASK-008, TASK-010 共享**
- **acceptance_criteria**：
  1. Gate 卡片中的文档列表仅显示当前会话产出的文档
  2. 若当前会话无产物，显示「暂无产物文件」提示
  3. 切换会话后文档列表动态更新
- **implementation_notes**：
  - 产物渲染在 `pipeline.html:425-427`，`g.artifacts` 数组由后端 `/api/pipeline` 返回
  - 后端 TASK-003 已实现 session 过滤，前端仅需添加空数组提示文字
  - 在 `artifactsHtml` 为空时显示「暂无产物文件」（`text-[10px] text-slate-300 italic`）

---

### TASK-010：文档名点击滑出抽屉展示 MD

- **task_id**：TASK-010
- **requirement_ids**：[REQ-SL-012]
- **type**：Direct
- **priority**：P0
- **estimated_lines**：~120
- **test_strategy**：manual_only（UI 交互验证）
- **files**：
  - `src/web/views/pipeline.html`：新增抽屉 HTML 结构 + CSS 动画 + JS 交互逻辑
- **dependencies**：[TASK-004, TASK-009]（需文档读取 API + 门禁文档列表就绪）
- **parallel_group**：无
- **risk**：中 — 新增 UI 组件，涉及 CSS 动画、Markdown 渲染、错误处理
- **shared_region_conflict**：
  - `pipeline.html`：**与 TASK-005~TASK-009 共享**
- **acceptance_criteria**：
  1. 点击 Gate 卡片中的文档文件名 → 右侧抽屉从右滑入
  2. 抽屉宽度约 50-60% 视口宽度
  3. 抽屉内正确渲染 Markdown 内容（标题、列表、代码块等）
  4. 抽屉顶部显示文件名和关闭按钮
  5. 点击关闭按钮 → 抽屉滑回关闭
  6. 点击抽屉外部遮罩层 → 抽屉滑回关闭
  7. 文件读取失败时，抽屉内显示错误提示（如「文件读取失败」）
  8. 再次点击另一文档名 → 抽屉内容更新为新文档
- **implementation_notes**：
  - **CSS 动画**：新增 `.drawer-overlay` 和 `.drawer-panel` 类，使用 `transition: transform 0.3s ease` + `translateX(100%)` → `translateX(0)`
  - **遮罩层**：半透明黑色背景（`bg-black/30`），点击关闭
  - **Markdown 渲染**：通过 CDN 引入 `marked.js`（`<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>`），不新增 npm 依赖
  - **API 调用**：使用现有 `fetchAPI()` 函数调用 `GET /api/docs/${encodeURIComponent(path)}`
  - **文档名点击**：在 `pipeline.html:426` 的 artifacts 渲染中，`<span>` 改为 `<button>` 并绑定 `onclick="openDocDrawer('${a}')"`
  - **错误状态**：API 返回非 200 时显示错误消息，超时也需处理
  - **Escape 键关闭**：监听 `keydown` 事件，`Escape` 键关闭抽屉（可访问性增强）

**文件变更清单（TASK-010）：**

| 位置 | 内容 |
|------|------|
| `<style>` 块 | 新增抽屉动画 CSS（`.drawer-overlay`, `.drawer-panel`, `.drawer-open`, `.drawer-closed`） |
| `<body>` 底部 | 新增抽屉 HTML 结构（遮罩层 + 面板 + 标题栏 + 内容区） |
| `<script>` 引入 | 新增 CDN 引入 `marked.js` |
| `<script>` 逻辑 | 新增 `openDocDrawer()`, `closeDocDrawer()`, `renderMarkdown()` 函数 |
| `renderGateCards` | artifacts 渲染中 `<span>` 改为可点击按钮 |

---

## DDD 分类

**本次需求无 DDD 标注任务。**

本次 10 条 REQ 均为 UI 布局调整、简单的数据处理或 API 端点新增，不涉及：
- 复杂的领域聚合交互
- 多实体一致性事务
- 领域事件
- 状态机建模

因此全部任务归类为 Direct 或 TDD。

---

## TDD 与直接开发分类

### TDD 任务

| TASK | REQ | TDD 理由 |
|------|-----|---------|
| TASK-004 | REQ-SL-013 | 安全敏感端点（路径遍历防护）；文件不存在/权限/编码边界条件多；符合"高风险接口契约"条件 |

### 直接开发任务

| TASK | REQs | 理由 |
|------|------|------|
| TASK-001 | REQ-SL-005 | 简单 SQL 查询变更，无复杂业务规则 |
| TASK-002 | REQ-SL-008 | 简单字符串拼接逻辑，单路径 |
| TASK-003 | REQ-SL-011 | 文件过滤策略，无安全敏感操作 |
| TASK-005 | REQ-SL-005, SL-014 | UI 排序 + 显示文本变更 |
| TASK-006 | REQ-SL-006, SL-007 | UI 布局调整 |
| TASK-007 | REQ-SL-009 | UI 条件渲染变更 |
| TASK-008 | REQ-SL-010 | 纯常量值替换 |
| TASK-009 | REQ-SL-011 | UI 空状态提示 |
| TASK-010 | REQ-SL-012 | UI 组件新增（无核心业务规则） |

---

## 风险任务

| TASK | 风险等级 | 原因 | 缓解措施 |
|------|---------|------|---------|
| TASK-004 | 中 | 新增安全敏感端点；路径遍历防护；文件系统操作 | TDD 策略：先写 6 个测试用例覆盖所有边界条件再实现 |
| TASK-003 | 中 | 涉及文件过滤策略变更；`gates.ts` 和 `routes.ts` 双文件修改 | 方案 A（新增独立函数）隔离变更；`routes.ts` 与 TASK-004 建议顺序执行 |
| TASK-010 | 中 | 新增 UI 组件 ~120 行；CSS 动画 + Markdown 渲染 + CDN 依赖 | 分步实现：先做抽屉骨架（开关逻辑）→ 再做 API 集成 → 最后 Markdown 渲染 |

---

## 文件所有权和共享路径提醒

### 文件所有权矩阵

| 文件 | 修改任务 | 串行/并行 | 说明 |
|------|---------|----------|------|
| `src/engine/db.ts` | TASK-001 | 独占 | 仅 TASK-001 修改 |
| `src/engine/server.ts` | TASK-002 | 独占 | 仅 TASK-002 修改 |
| `src/engine/gates.ts` | TASK-003 | 独占 | 仅 TASK-003 修改 |
| `src/web/routes.ts` | TASK-003, TASK-004 | **串行** | 两个任务修改同一文件，需按序执行 |
| `src/web/views/pipeline.html` | TASK-005~TASK-010（6 个任务） | **必须串行** | 单一 monolithic HTML 文件，所有前端变更均在此文件内 |

### 共享路径风险详细说明

**`src/web/routes.ts` 共享**：
- TASK-003 修改 `/api/pipeline` 端点（`routes.ts:91-116`）
- TASK-004 新增 `GET /api/docs/:filepath` 端点（`routes.ts` 新增区域）
- 风险：TASK-003 和 TASK-004 可能产生行级冲突（新增的端点插在相邻位置）
- 缓解：TASK-003 先执行，TASK-004 在 TASK-003 变更基础上新增端点

**`src/web/views/pipeline.html` 高频共享**：
- 6 个任务修改同一文件，这是本次最大的串行瓶颈
- 每个任务修改文件的不同区域（排序逻辑、渲染模板、CSS、事件处理），但合并冲突风险仍高
- 缓解：严格按照 TASK-005 → TASK-010 顺序执行，每个任务在前一个任务的最终 diff 基础上进行

---

## 推荐交付顺序

### 阶段 1：后端基础（可并行）

```
Phase 1 — 4 个任务并行执行，互不阻塞
┌────────────────────────────────────────────────┐
│  TASK-001 (db.ts)       TASK-002 (server.ts)   │
│  排序字段 + 查询变更     pipeline_init 命名     │
│  ~15行                  ~20行                   │
│                                                  │
│  TASK-003 (gates+route) TASK-004 (routes.ts)    │
│  门禁文档 session 过滤   文档读取 API (TDD)      │
│  ~45行                  ~35行                    │
└────────────────────────────────────────────────┘
                     ↓
             所有后端 API 就绪
```

### 阶段 2：前端功能（严格串行）

```
Phase 2 — pipeline.html 按序修改
┌─────────────────────────────────────────┐
│  TASK-005：  排序前端 + 名称回退  (~30行)  │
│       ↓                                    │
│  TASK-006：  状态点左移 + 恢复按钮  (~45行) │
│       ↓                                    │
│  TASK-007：  ⋮ 菜单所有会话可操作  (~30行)  │
│       ↓                                    │
│  TASK-008：  去掉 "/" 前缀         (~5行)   │
│       ↓                                    │
│  TASK-009：  门禁文档前端过滤      (~15行)   │
│       ↓                                    │
│  TASK-010：  文档抽屉 + MD 渲染   (~120行)   │
└─────────────────────────────────────────┘
```

### 并行机会总结

| 并行组 | 任务 | 并行条件 |
|--------|------|---------|
| PG-backend | TASK-001, TASK-002, TASK-003, TASK-004 | 修改不同文件（`routes.ts` 有共享但不同区域，建议 TASK-003 → TASK-004 顺序） |
| PG-frontend | TASK-005~TASK-010 | 无并行可能（同一文件 pipeline.html，必须串行） |

---

## REQ → TASK 追溯矩阵

| REQ | TASK | 验证方式 |
|-----|------|---------|
| REQ-SL-005 | TASK-001（后端）、TASK-005（前端） | 启动应用 → 检查会话列表排序 → 确认最新 run 在最前 |
| REQ-SL-006 | TASK-006 | 查看侧边栏 Row 1 布局 → 状态点在标题左侧 |
| REQ-SL-007 | TASK-006 | 选中休眠会话 → 看板顶部出现恢复按钮 → 侧边栏无恢复按钮 |
| REQ-SL-008 | TASK-002 | Agent 调用 pipeline_init → 新会话 task_name 不为 null |
| REQ-SL-009 | TASK-007 | 点击无 run 会话的 ⋮ → 弹出菜单 → 删除可用红色 |
| REQ-SL-010 | TASK-008 | 查看指令标签 → 无 "/" 前缀 |
| REQ-SL-011 | TASK-003（后端）、TASK-009（前端） | 切换会话 → Gate 卡文档列表变化 → 无产物显示提示 |
| REQ-SL-012 | TASK-010 | 点击文档名 → 右侧抽屉滑出 → MD 正确渲染 → 关闭正常 |
| REQ-SL-013 | TASK-004（TDD） | curl API → 正常返回内容 / 路径遍历返回 400 / 404 |
| REQ-SL-014 | TASK-005 | 无 task_name 会话 → 显示 `平台 · 类型 · 时间` |

---

## 验证清单

- [x] 所有 REQ-XXX 都至少映射到 1 个 TASK（10 REQ → 10 TASK，每个 REQ 均已覆盖）
- [x] 任务使用垂直切片策略（每个任务交付可验证的端到端功能增量）
- [x] 无水平切片（没有"设计全部数据库表"或"实现全部 API"类任务）
- [x] 每个任务有明确优先级和 test_strategy
- [x] 依赖关系已明确，无循环依赖
- [x] 并行机会已识别（PG-backend）
- [x] 风险任务已标注（TASK-003, TASK-004, TASK-010）
- [x] 单轮次总变更 ~320 行（<1000）
- [x] 共享区域已指定唯一责任方和串行约束
- [x] 每个任务有可独立验证的完成标准

---

## 推荐的下一步

1. **Planner** 读取本文档，制定执行计划
2. 优先启动 **Phase 1 后端**（4 个并行任务），因它们是 Phase 2 前端的基础
3. TASK-004 的 TDD 测试应在 router 注册时编写（可使用 `vitest` 或 `node:test` 对 Hono app 进行请求级测试）
4. Phase 2 前端任务严格串行，建议由同一实现者完成（减少上下文切换）
