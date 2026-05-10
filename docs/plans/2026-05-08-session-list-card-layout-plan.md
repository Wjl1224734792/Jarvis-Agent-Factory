# 执行计划：会话列表卡片化布局

> **需求文档**：[docs/requirements/2026-05-08-session-list-card-layout.md](../requirements/2026-05-08-session-list-card-layout.md)
> **任务文档**：[docs/tasks/2026-05-08-session-list-card-layout-tasks.md](../tasks/2026-05-08-session-list-card-layout-tasks.md)
> **状态**：待执行 | **日期**：2026-05-08 | **轮次**：单轮次

---

## 1. 需求文档路径

`docs/requirements/2026-05-08-session-list-card-layout.md`

## 2. 任务文档路径

`docs/tasks/2026-05-08-session-list-card-layout-tasks.md`

## 3. 当前轮次目标

将会话列表从单行水平排列改为紧凑的上下两行排列，同时将 ⋮ 菜单改为始终可见（含禁用态），精修选中/悬停交互样式，并回归验证所有现有功能不受影响。

## 4. 当前轮次范围

| 维度 | 说明 |
|------|------|
| 涉及文件 | `src/web/views/pipeline.html`（唯一文件） |
| 核心改动区域 | `renderSessions()` 函数内 HTML 模板（第 532-556 行） + `<style>` 块（第 19-20 行） |
| 总预估变更行数 | ~115 行（M 规模，在 1000 行限制内） |
| 后端变更 | 无 |
| 新增依赖 | 无 |
| 数据流/路由变更 | 无 |

## 5. 完成标准

1. 侧边栏 288px 宽度下，每个会话项垂直排列为 2 行，标题可视宽度 >= 180px
2. 每项高度不超过当前单行高度的 2.5 倍（约 110px）
3. 所有会话项右侧均显示 ⋮ 按钮（含无活跃 run 的会话），无 run 时置灰不可点击
4. 选中态左 indigo border + bg-indigo-50 清晰可辨
5. 悬停态背景变化 + ⋮ 按钮颜色加深
6. 10 项回归验证全部通过，无 JS 报错，无 UI 错乱

## 6. 是否需要先查阅 code-explore-expert / docs-research-expert

**不需要**。当前代码结构已由任务文档和计划者直接阅读确认：
- `renderSessions()` 函数位于 `pipeline.html` 第 500-558 行
- 相关 CSS 位于第 19-20 行
- 单个文件、单个函数、无外部依赖、无多文件引用关系

## 7. 执行代理分工

| 任务 | 代理 | 原因 |
|------|------|------|
| TASK-001 | `frontend-ui-expert` | HTML 模板重写 + CSS 布局调整，纯 UI 变更 |
| TASK-002 | `frontend-ui-expert` | 条件渲染改为始终渲染 + 禁用态样式，UI 交互调整 |
| TASK-003 | `frontend-ui-expert` | Tailwind/CSS 样式精修，纯视觉变更 |
| TASK-004 | `frontend-ui-expert` | 手动回归验证，零代码，由同一代理执行最熟悉改动 |

**说明**：四个任务全部由 `frontend-ui-expert` 执行。虽然任务文档标注 TASK-001/002/003 必须在同一文件中串行，但同一代理顺序执行即可，无需跨代理协调。

## 8. 共享区域改动归属

| 共享区域 | 唯一责任方 | 说明 |
|----------|-----------|------|
| `src/web/views/pipeline.html` | `frontend-ui-expert` | 全部四个任务均由同一代理修改此文件，无冲突 |
| `renderSessions()` 函数模板（第 532-556 行） | `frontend-ui-expert` | 三个实现任务均修改此区域，由同一代理顺序叠加变更 |
| CSS `<style>` 块（第 19-20 行） | `frontend-ui-expert` | 移除 hover 显隐规则，由同一代理按 TASK 顺序操作 |

**无跨代理共享区域冲突**：所有修改集中在单一文件，由唯一代理执行。

## 9. 并行 / 串行策略

### 串行判断

四个任务全部修改同一文件 `pipeline.html` 中的同一函数 `renderSessions()`。三个实现任务（TASK-001/002/003）均修改同一 HTML 模板字符串，后续任务的变更必须基于前序任务已完成的模板结构。因此：

**全部串行，单 Batch 交付。**

```
TASK-001 ──→ TASK-002 ──→ TASK-003 ──→ TASK-004
(模板布局)   (⋮ 按钮)    (样式精修)   (回归验证)
```

### 并行组

无并行组。所有任务均在同一 Batch 内串行执行。

## 10. 风险提醒

| 风险点 | 级别 | 缓解措施 |
|--------|------|---------|
| 模板字符串 JavaScript 语法错误 | 低 | 每步完成后在浏览器中手动验证渲染，注意 HTML 标签闭合和引号转义 |
| 高度约束超标（>2.5x） | 低 | 使用紧凑 Tailwind 类名（`py-1.5`、`text-xs`），控制 padding |
| 标题截断仍不足 180px | 低 | 使用 `min-w-[180px]` 或 `flex-1` 配合 `truncate` 确保充裕空间 |
| 现有 hover 显隐规则残留 | 低 | TASK-001 中彻底删除 `.session-item:hover .session-actions` 和 `.session-actions` 两条规则 |
| 无 run 会话的 ⋮ 按钮事件冒泡 | 低 | 禁用态使用 `onclick="event.stopPropagation()"` + `cursor-not-allowed` |

**无高风险点**。四项任务变更量均在 XS-S 区间，单一文件、无新增依赖、无后端变更、无数据迁移。

## 11. 实现者交接信息

- **前序 Agent**：无（本轮次首次执行）
- **上游产出**：任务文档通过 Gate B，需求文档通过 Gate A
- **交付物**：`src/web/views/pipeline.html` 中 `renderSessions()` 和 `<style>` 块的变更
- **下游 qa-review-expert 关注点**：
  - 10 项回归验证清单（TASK-004）是否全部完成
  - 浏览器实际渲染效果是否符合预期（标题宽度、行高、⋮ 按钮一致性）
  - 无 JavaScript 控制台错误
- **退出条件**：全部 4 个 TASK 验收标准通过，`pipeline.html` 无语法警告

## 12. Execution Packets

---

### task_id: TASK-001
### task_name: 会话项 2 行垂直排列布局
### requirement_ids: REQ-SL-001
### owner: frontend-ui-expert
### objective: 将 `renderSessions()` 内会话项从单行水平 flex 布局改为紧凑 2 行垂直排列。
### in_scope:
- 重写 `renderSessions()` 中每个会话项的 HTML 模板（当前第 532-556 行），改为 2 行结构：
  - **第一行**（顶部）：标题（加粗 `font-semibold`，`truncate`，至少 180px 可视宽度）+ 状态指示点 + 置顶标记
  - **第二行**（底部）：指令标签 + Gate 进度 + 平台标识 + ⋮ 更多按钮占位（为 TASK-002 预留）
- 删除 `<style>` 中第 19 行 `.session-item:hover .session-actions { opacity:1; }`
- 删除 `<style>` 中第 20 行 `.session-actions { opacity:0; transition:opacity .15s; }`
- 调整会话项 `padding`/`margin`，确保每项高度不超过当前单行高度 2.5 倍（约 110px）
### out_of_scope:
- ⋮ 按钮的始终可见逻辑（由 TASK-002 负责）
- 选中态/悬停态颜色精修（由 TASK-003 负责）
- 回归验证（由 TASK-004 负责）
- 所有后台逻辑（排序、筛选、轮询、事件处理函数）
### input_documents: docs/requirements/2026-05-08-session-list-card-layout.md
### allowed_paths:
- `src/web/views/pipeline.html`（`renderSessions()` 函数模板，第 500-558 行；`<style>` 块第 19-20 行）
### forbidden_paths:
- `src/web/views/pipeline.html` 中除 `renderSessions()` 模板和 `<style>` 块外的所有区域
- 所有后端文件
- 所有前端 JS 事件处理函数（`selectSession`、`resumeSession`、`togglePin` 等）
### dependencies: 无（首个任务）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: 无（串行首位）
### wait_for: 无
### acceptance_criteria:
1. 侧边栏 288px 宽度下，每个会话项垂直排列为 2 行
2. 标题至少拥有 180px 可视宽度，不再被严重截断
3. 每项高度不超过当前单行高度的 2.5 倍（目测：当前约 44px，目标不超过 110px）
4. 所有现有信息（标题、标签、Gate、状态、平台）均在新布局中可见，不溢出隐藏
5. 置顶排序、平台筛选、状态指示逻辑保持不变
6. 浏览器中手动验证渲染效果，无 JS 报错
### test_strategy: manual_only
### handoff_notes:
- 本任务产出的是新 2 行布局模板，TASK-002 将在此模板基础上修改 ⋮ 按钮渲染逻辑
- 确保布局使用 `flex-col` 或 `grid` 实现垂直排列，外层保持 `relative` 定位以支持后续下拉菜单
- 标题区域使用 `flex-1 min-w-0 truncate font-semibold` 确保在 288px 侧边栏中有足够空间
### escalation_rule: 如需调整共享区域（`renderSessions()` 函数签名、数据变量、事件绑定方式），先回编排者。本次变更仅限于模板字符串和 CSS 规则，不改 JavaScript 逻辑。

---

### task_id: TASK-002
### task_name: ⋮ 菜单始终可见 + 禁用态
### requirement_ids: REQ-SL-002
### owner: frontend-ui-expert
### objective: 将 ⋮ 更多操作按钮从"仅活跃 run 时条件渲染"改为"始终渲染，无 run 时置灰禁用"。
### in_scope:
- 修改 `renderSessions()` 中 ⋮ 按钮渲染逻辑（当前第 544-555 行）：
  - `hasActiveRun === true`：按钮可点击，`onclick` 正常触发 `toggleRunMenu`，颜色正常，渲染下拉菜单
  - `hasActiveRun === false`：按钮始终渲染但置灰，`text-slate-300`，`cursor-not-allowed`，`onclick="event.stopPropagation()"`（不触发菜单），`title="暂无运行记录"`
  - 下拉菜单结构保持不变（仅在 `hasActiveRun` 时渲染）
- 确认无残留的 `.session-actions` hover opacity 逻辑干扰（TASK-001 应已删除）
### out_of_scope:
- 2 行布局结构调整（TASK-001 已完成）
- 选中态/悬停态颜色精修（TASK-003 负责）
- 下拉菜单功能变更（保持现有的置顶、归档、删除操作）
- 会话恢复按钮（`rotate-ccw`）的逻辑和样式
### input_documents: docs/requirements/2026-05-08-session-list-card-layout.md
### allowed_paths:
- `src/web/views/pipeline.html`（`renderSessions()` 函数内 ⋮ 按钮相关模板，第 544-555 行区域）
### forbidden_paths:
- `src/web/views/pipeline.html` 中除 `renderSessions()` ⋮ 按钮区域外的所有模板
- 所有后端文件
- 下拉菜单内的事件处理函数（`togglePin`、`archiveRunFromMenu`、`deleteRunFromMenu`）
### dependencies: TASK-001（需基于新 2 行布局中 ⋮ 按钮的定位标签）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: 无
### wait_for: TASK-001
### acceptance_criteria:
1. 每个会话项右侧均显示 ⋮ 按钮（含无活跃 run 的会话）
2. 无 run 的会话项：⋮ 按钮为灰色（`text-slate-300`），点击无反应，hover 显示 title="暂无运行记录"
3. 有 run 的会话项：⋮ 按钮正常颜色，点击弹出菜单，菜单项（置顶/取消置顶、归档、删除）均可点击
4. 休眠会话的恢复按钮（`rotate-ccw`）仍正常显示和工作
### test_strategy: manual_only
### handoff_notes:
- 注意无 run 会话的 ⋮ 按钮必须阻止事件冒泡（`event.stopPropagation()`），防止触发 `selectSession`
- 按钮的 `cursor-not-allowed` 需添加，确保视觉上明确不可交互
- TASK-003 将在此基础上调整 ⋮ 按钮的 hover 颜色加深效果
### escalation_rule: 如需修改 `hasActiveRun` 判断逻辑或新增数据字段，先回编排者。本次变更仅限于模板中的条件渲染改为始终渲染加禁用态。

---

### task_id: TASK-003
### task_name: 选中态 / 悬停态样式精修
### requirement_ids: REQ-SL-003
### owner: frontend-ui-expert
### objective: 精修会话项的选中态、悬停态和置顶标记样式，确保交互状态清晰可辨且复用现有主题色。
### in_scope:
- **选中态**：
  - 左侧 border 高亮（`border-l-[3px] border-indigo-500`，保持现有模式）
  - 背景色区分（`bg-indigo-50`，保持现有）
- **悬停态**：
  - 会话项背景轻微变化（`hover:bg-slate-50`，保持现有基调）
  - ⋮ 按钮颜色加深（`hover:text-slate-600`）
- **置顶标记**：
  - 顶部 border 琥珀色标记（`border-t-2 border-t-amber-400`，保持现有）
  - 📌 图标 color（`text-amber-500`，保持现有）
- 确认不引入新颜色变量，全部复用现有 Tailwind 主题色（indigo/amber/slate）
### out_of_scope:
- 2 行布局结构调整（TASK-001 已完成）
- ⋮ 按钮渲染逻辑（TASK-002 已完成）
- 新增颜色变量或自定义 CSS
- 响应式断点调整
### input_documents: docs/requirements/2026-05-08-session-list-card-layout.md
### allowed_paths:
- `src/web/views/pipeline.html`（`renderSessions()` 内会话项外层 `<div>` 的 Tailwind 类名字符串，第 532-533 行；CSS `<style>` 块如需补充 Tailwind 无法表达的嵌套效果）
### forbidden_paths:
- `src/web/views/pipeline.html` 中非样式相关的模板和 JavaScript 逻辑
- 所有后端文件
### dependencies: TASK-001, TASK-002（基于新布局和新 ⋮ 按钮行为调整样式）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: 无
### wait_for: TASK-001, TASK-002
### acceptance_criteria:
1. 选中会话：左侧 indigo border 可见，背景 `bg-indigo-50`，与未选中会话清晰区分
2. 未选中会话 hover：背景轻微变色，⋮ 按钮颜色加深
3. 置顶会话：顶部琥珀色 border 可见，📌 图标琥珀色
4. 所有颜色变量复用现有 Tailwind 主题色（indigo/amber/slate），不新增
5. 浏览器中手动验证三种状态（选中/悬停/置顶）视觉效果
### test_strategy: manual_only
### handoff_notes:
- 这是最后一个代码变更任务，完成后直接进入 TASK-004 回归验证
- 重点关注：选中态在 2 行布局下左侧 border 是否完整跨越会话项高度
- ⋮ 按钮在未选中 hover 时的颜色变化是否与背景对比度足够
### escalation_rule: 如需新增 Tailwind 自定义颜色或 `@apply` 指令，先回编排者（项目规范禁止 `@apply`）。所有样式调整必须使用内联 Tailwind 类名或已有的 `<style>` 块。

---

### task_id: TASK-004
### task_name: 现有功能回归验证
### requirement_ids: REQ-SL-004
### owner: frontend-ui-expert
### objective: 逐一验证所有现有交互功能在新布局下不受影响，确认零回归缺陷。
### in_scope:
- 按 10 项清单手动验证每个功能点
- 检查浏览器控制台是否有 JavaScript 错误
- 检查 UI 是否有布局错乱或元素重叠
### out_of_scope:
- 任何代码修改（纯验证任务）
- 自动化测试编写
- 性能测试
### input_documents: docs/requirements/2026-05-08-session-list-card-layout.md
### allowed_paths: 无需修改文件
### forbidden_paths: 所有文件（只读验证）
### dependencies: TASK-001, TASK-002, TASK-003（所有 UI 变更完成后验证）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `verification-before-completion`
- `debugging-and-error-recovery`
### parallel_group: 无
### wait_for: TASK-001, TASK-002, TASK-003
### acceptance_criteria:
1. 全部 10 项回归验证通过（见下方验证清单）
2. 无控制台 JavaScript 报错
3. 无 UI 布局错乱或元素重叠

### 验证清单

| # | 验证项 | 验证步骤 |
|---|--------|---------|
| 1 | 平台筛选 | 依次点击"全部 / Claude / OpenCode / Codex"，确认列表过滤正确，按钮高亮切换正常 |
| 2 | 置顶排序 | 确认 pinned 会话始终排在列表最前，不受平台筛选影响 |
| 3 | 状态指示 | 确认在线 / 休眠 / 离线 三种状态颜色和标签正确 |
| 4 | 会话选中切换 | 点击不同会话，确认选中态切换，主内容区同步刷新 |
| 5 | 休眠会话恢复 | 点击休眠会话的 `rotate-ccw` 恢复按钮，确认发送 POST 请求，会话恢复 |
| 6 | 点击外部关闭下拉菜单 | 展开 ⋮ 菜单后点击空白区域，确认菜单关闭 |
| 7 | 5 秒轮询刷新 | 等待 5 秒以上，确认列表自动刷新，状态和标题更新 |
| 8 | 归档/删除操作 | 对有活跃 run 的会话执行归档和删除，确认操作正常 |
| 9 | 置顶/取消置顶 | 对有活跃 run 的会话执行置顶和取消置顶，确认排序变化 |
| 10 | 手动刷新按钮 | 点击刷新按钮，确认列表重新拉取并渲染 |
### test_strategy: manual_only
### handoff_notes:
- 如果任何一项验证失败，记录失败项和现象，根据严重程度决定：
  - 布局/样式问题：回退到对应 TASK 修复
  - 功能回归问题：记录根因，提交 plan patch
- 全部通过后标记本轮次完成
### escalation_rule: 若发现功能回归（非样式问题），记录具体复现步骤后回编排者。不做任何代码修改。

---

## 13. plan patch / contract change request 触发条件

以下情况需要触发 plan patch（实现代理暂停执行，回编排者）：

| 触发条件 | 说明 |
|----------|------|
| TASK-004 回归验证发现功能回归 | 非样式类功能 bug，需根因分析后调整计划 |
| 模板重写后发现需要修改 JS 事件绑定逻辑 | 当前计划假设事件处理函数不变，若发现不兼容需重新评估 |
| 标题 180px 可视宽度在 288px 侧边栏中无法达成 | 可能需要对侧边栏宽度或布局方案重新决策 |
| `renderSessions()` 函数签名或外部变量需要变更 | 当前计划禁止修改，若必要则触发 patch |

**不触发 plan patch 的情况**：
- Tailwind 类名微调（padding、margin、font-size 等数值调整）
- ⋮ 按钮颜色值微调（仍使用 Tailwind 内置色阶）
- CSS 不在 `<style>` 块的范围内的样式（纯类名替换）

## 14. 推荐的下一步

1. **执行 TASK-001**：`frontend-ui-expert` 先完整阅读 `pipeline.html` 第 490-560 行，理解当前模板结构和数据变量，然后重写为 2 行布局
2. **执行 TASK-002**：在同一会话内，基于 TASK-001 的输出修改 ⋮ 按钮逻辑
3. **执行 TASK-003**：在同一会话内，基于前两步的输出精修选中/悬停态样式
4. **执行 TASK-004**：在同一会话内，启动 Web 面板并逐一核对 10 项回归清单
5. **Gate C1**：最终确认无 JS 语法错误（`pipeline.html` 为纯 HTML/内联 JS，无 lint/typecheck/build 流程）

---

## parallel_batches

### Batch 1（串行执行，无依赖）
- TASK-001 → subagent_type: frontend-ui-expert
- TASK-002 → subagent_type: frontend-ui-expert（依赖 TASK-001 完成）
- TASK-003 → subagent_type: frontend-ui-expert（依赖 TASK-001, TASK-002 完成）
- TASK-004 → subagent_type: frontend-ui-expert（依赖 TASK-001, TASK-002, TASK-003 完成）

**说明**：本批次内四个任务由同一 `frontend-ui-expert` 代理顺序执行。虽然 `parallel_batches` 命名暗示并行，但此处全部串行——同一代理、同一文件、同一函数区域，必须逐步叠加变更。无与其他代理的并行机会。
