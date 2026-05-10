# 会话列表卡片化布局 — 任务分解

> **需求文档**：[docs/requirements/2026-05-08-session-list-card-layout.md](../requirements/2026-05-08-session-list-card-layout.md)
> **状态**：待执行 | **日期**：2026-05-08 | **范围**：纯前端 UI 重构

## 范围盘点

| 维度 | 说明 |
|------|------|
| 涉及文件 | `src/web/views/pipeline.html`（1073 行） |
| 核心改动函数 | `renderSessions()`（约第 500-558 行） |
| 涉及 CSS | 第 19-20 行 `.session-item:hover .session-actions` / `.session-actions` |
| 后端变更 | 无 |
| 新增依赖 | 无 |
| 总预估变更行数 | ~120 行（M 规模） |

## 任务概览

| TASK | 任务名称 | REQ | 类型 | 优先级 | 预估行数 | test_strategy |
|------|---------|-----|------|--------|---------|---------------|
| TASK-001 | 会话项 2 行垂直排列布局 | SL-001 | 直接开发 | P0 | ~75 行 (S) | manual_only |
| TASK-002 | ⋮ 菜单始终可见 + 禁用态 | SL-002 | 直接开发 | P0 | ~25 行 (XS) | manual_only |
| TASK-003 | 选中态 / 悬停态样式精修 | SL-003 | 直接开发 | P0 | ~15 行 (XS) | manual_only |
| TASK-004 | 现有功能回归验证 | SL-004 | 直接开发 | P0 | 0 行（纯验证） | manual_only |

## 详细任务分解

---

### TASK-001：会话项 2 行垂直排列布局

- **task_name**：会话项 2 行垂直排列布局
- **requirement_ids**：[REQ-SL-001]
- **type**：直接开发（纯 UI 模板重写，无业务逻辑变更）
- **priority**：P0
- **estimated_lines**：~75 行 (S)
- **test_strategy**：manual_only
- **file_ownership**：
  - **唯一修改文件**：`src/web/views/pipeline.html`
    - `renderSessions()` 函数内 HTML 模板字符串（第 532-556 行）
    - CSS 样式块（第 19-20 行）：移除 hover 显隐规则，新增布局相关样式
  - 不触碰：数据逻辑、排序、平台筛选、轮询
- **dependencies**：无（第一个任务）
- **shared_region_conflict**：无（序列首位，暂无其他任务在改同一区域）
- **risk**：低

**变更内容**：

将 `renderSessions()` 内每项的单行水平 flex 布局改为紧凑 2 行垂直排列：

**第一行（顶部）**：
- 标题（加粗 `font-semibold`，`truncate` 截断，至少 180px 可视宽度）
- 右侧：状态指示点（在线 🟢 / 休眠 🟡 / 离线 ⚫）+ 置顶标记 📌

**第二行（底部）**：
- 指令标签（保留现有 `COMMAND_LABELS` + `COMMAND_COLORS`）
- Gate 进度（保留现有 Gate 徽标）
- 平台标识
- ⋮ 更多按钮占位（为 TASK-002 预留）

**CSS 变更**：
- 移除 `.session-item:hover .session-actions { opacity:1; }`
- 移除 `.session-actions { opacity:0; transition:opacity .15s; }`
- 新增：会话项垂直方向的 padding/margin 微调，保证每项高度不超过当前单行高度 2.5 倍

**完成标准**：
1. 侧边栏 288px 宽度下，每个会话项垂直排列为 2 行
2. 标题至少拥有 180px 可视宽度，不再被严重截断
3. 每项高度不超过当前单行高度的 2.5 倍（目测：当前约 44px，目标不超过 110px）
4. 所有现有信息（标题、标签、Gate、状态、平台）均在新布局中可见，不溢出隐藏
5. 置顶排序、平台筛选、状态指示逻辑保持不变

---

### TASK-002：⋮ 菜单始终可见 + 禁用态

- **task_name**：⋮ 菜单始终可见 + 禁用态
- **requirement_ids**：[REQ-SL-002]
- **type**：直接开发（UI 交互调整，无新增业务逻辑）
- **priority**：P0
- **estimated_lines**：~25 行 (XS)
- **test_strategy**：manual_only
- **file_ownership**：
  - **唯一修改文件**：`src/web/views/pipeline.html`
    - `renderSessions()` 内 ⋮ 按钮的渲染逻辑（当前第 544-555 行条件渲染改为始终渲染）
    - CSS 样式块：若有残余 hover 显隐规则，彻底清除
- **dependencies**：[TASK-001]（需基于新 2 行布局定位 ⋮ 按钮）
- **shared_region_conflict**：
  - 与 TASK-001 共享 `renderSessions()` 模板区域 → **必须串行**
  - 与 TASK-003 共享 CSS 样式块 → **必须串行**
- **risk**：低

**变更内容**：

**模板变更**：
- 将 `hasActiveRun ? (⋮ + 下拉菜单) : ''` 条件渲染改为始终渲染 ⋮ 按钮
- 有活跃 run（`hasActiveRun === true`）：按钮可点击，点击展示下拉菜单（置顶/取消置顶、归档、删除）
- 无活跃 run（`hasActiveRun === false`）：按钮显示但置灰（`text-slate-300`），`cursor-not-allowed`，`onclick` 不触发，`title="暂无运行记录"`
- 下拉菜单结构不变（仅在 `hasActiveRun` 时渲染）

**CSS 变更**：
- 确认无残留的 `.session-actions` hover opacity 逻辑干扰新行为

**完成标准**：
1. 每个会话项右侧均显示 ⋮ 按钮（含无活跃 run 的会话）
2. 无 run 的会话项：⋮ 按钮为灰色（`text-slate-300`），点击无反应
3. 有 run 的会话项：⋮ 按钮正常颜色，点击弹出菜单，菜单项（置顶/取消置顶、归档、删除）均可点击
4. 休眠会话的恢复按钮（`rotate-ccw`）仍正常显示和工作

---

### TASK-003：选中态 / 悬停态样式精修

- **task_name**：选中态 / 悬停态样式精修
- **requirement_ids**：[REQ-SL-003]
- **type**：直接开发（纯 CSS/Tailwind 样式调整）
- **priority**：P0
- **estimated_lines**：~15 行 (XS)
- **test_strategy**：manual_only
- **file_ownership**：
  - **唯一修改文件**：`src/web/views/pipeline.html`
    - `renderSessions()` 内会话项外层 `<div>` 的 Tailwind 类名字符串（当前第 532-533 行）
    - CSS `<style>` 块：如需补充 Tailwind 无法表达的 hover 嵌套效果
- **dependencies**：[TASK-001, TASK-002]（基于新布局和 ⋮ 按钮定位来调样式）
- **shared_region_conflict**：
  - 与 TASK-001/TASK-002 共享 `renderSessions()` 模板区域 → **必须串行**
- **risk**：低

**变更内容**：

**选中态**：
- 左侧 border 高亮（保持现有 `border-l-[3px] border-indigo-500` 模式）
- 背景色区分（保持现有 `bg-indigo-50`）
- 复用现有 indigo 主题色，不引入新颜色变量

**悬停态**：
- 会话项背景轻微变化（`hover:bg-slate-50`，保持现有）
- ⋮ 按钮颜色加深（`hover:text-slate-600` 或类似）

**置顶标记**：
- 置顶会话顶部 border 琥珀色标记（保持现有 `border-t-2 border-t-amber-400`）
- 📌 置顶图标 color `text-amber-500`（保持现有）

**完成标准**：
1. 选中会话：左侧 indigo border 可见，背景 `bg-indigo-50`，与未选中会话清晰区分
2. 未选中会话 hover：背景轻微变色，⋮ 按钮颜色加深
3. 置顶会话：顶部琥珀色 border 可见，📌 图标琥珀色
4. 所有颜色变量复用现有 Tailwind 主题色（indigo/amber/slate），不新增

---

### TASK-004：现有功能回归验证

- **task_name**：现有功能回归验证
- **requirement_ids**：[REQ-SL-004]
- **type**：直接开发（纯手动验证，零代码变更）
- **priority**：P0
- **estimated_lines**：0 行
- **test_strategy**：manual_only
- **file_ownership**：无文件修改
- **dependencies**：[TASK-001, TASK-002, TASK-003]（需等所有 UI 变更完成后验证）
- **shared_region_conflict**：无（不修改文件）
- **risk**：低

**验证清单**：

逐一验证以下功能不受影响：

| # | 验证项 | 验证步骤 |
|---|--------|---------|
| 1 | 平台筛选 | 依次点击"全部 / Claude / OpenCode / Codex"，确认列表过滤正确，按钮高亮切换正常 |
| 2 | 置顶排序 | 确认 pinned 会话始终排在列表最前，不受平台筛选影响 |
| 3 | 状态指示 | 确认在线 🟢 / 休眠 🟡 / 离线 ⚫ 三种状态颜色和标签正确 |
| 4 | 会话选中切换 | 点击不同会话，确认选中态切换，主内容区同步刷新 |
| 5 | 休眠会话恢复 | 点击休眠会话的 `rotate-ccw` 恢复按钮，确认发送 POST 请求，会话恢复 |
| 6 | 点击外部关闭下拉菜单 | 展开 ⋮ 菜单后点击空白区域，确认菜单关闭 |
| 7 | 5 秒轮询刷新 | 等待 5 秒以上，确认列表自动刷新，状态和标题更新 |
| 8 | 归档/删除操作 | 对有活跃 run 的会话执行归档和删除，确认操作正常 |
| 9 | 置顶/取消置顶 | 对有活跃 run 的会话执行置顶和取消置顶，确认排序变化 |
| 10 | 手动刷新按钮 | 点击刷新按钮，确认列表重新拉取并渲染 |

**完成标准**：
1. 全部 10 项回归验证通过
2. 无控制台 JavaScript 报错
3. 无 UI 布局错乱或元素重叠

---

## DDD 分类

本需求不涉及 DDD。四个 REQ 均为纯前端 UI 展示层变更，无领域逻辑、无状态机、无聚合边界、无跨聚合交互。

## TDD 与直接开发分类

| 任务 | 分类 | 原因 |
|------|------|------|
| TASK-001 | 直接开发 | HTML 模板重写，无算法逻辑，UI 视觉效果手动目测验证 |
| TASK-002 | 直接开发 | UI 交互调整，条件渲染改为始终渲染加禁用态，手动验证 |
| TASK-003 | 直接开发 | Tailwind/CSS 样式微调，手动验证视觉效果 |
| TASK-004 | 直接开发 | 纯手动回归验证，零代码变更 |

**所有任务均为 `manual_only`**，原因：纯 UI 视觉变更，无业务规则、无数据处理、无 API 逻辑，不适合单元测试覆盖。

## 风险任务

无风险任务。四项任务变更量均在 XS-S 区间，单一文件、无新增依赖、无后端变更、无数据迁移。全链路低风险。

## 文件所有权与共享路径提醒

### 文件所有权

| 文件 | 独占/共享 | 修改任务 |
|------|----------|---------|
| `src/web/views/pipeline.html` | **共享（串行）** | TASK-001, TASK-002, TASK-003 |

### 共享区域冲突

`renderSessions()` 函数（第 500-558 行）是所有 3 个实现任务的**唯一修改区域**。三个任务均修改同一 HTML 模板字符串，无法并行——后续任务必须在前序任务完成的模板基础上叠加变更。

```
TASK-001 ──→ TASK-002 ──→ TASK-003 ──→ TASK-004
(模板结构)   (⋮ 按钮)    (样式精修)   (回归验证)
```

### 不受影响的区域（确认不改）

- `selectSession()` / `resumeSession()` / `archiveRunFromMenu()` / `deleteRunFromMenu()` / `togglePin()` / `toggleRunMenu()` — 所有事件处理函数不变
- `setSessionPlatform()` — 平台筛选逻辑不变
- `refresh()` / `manualRefresh()` / 5 秒轮询 — 数据刷新逻辑不变
- 排序逻辑（pinned 优先）— 不变
- 主内容区 Dashboard 面板 — 不变
- 归档面板 / 智能体配置页 / MCP 状态栏 — 不变

## 推荐交付顺序

```
第 1 步：TASK-001  2 行垂直排列（核心结构变化，~75 行）
第 2 步：TASK-002  ⋮ 菜单始终可见（基于新结构，~25 行）
第 3 步：TASK-003  选中/悬停态精修（基于前两步成品，~15 行）
第 4 步：TASK-004  回归验证（10 项清单，0 行代码）
```

**单轮次交付**：总变更 ~115 行（M 规模），不拆分多轮次。四步串行，预计实现 + 验证总计 1-2 小时。

## 推荐的下一步

1. **planner** 读取本任务文档，确认任务顺序和串行约束
2. **实现者** 按 TASK-001 → TASK-002 → TASK-003 顺序执行，每完成一步手动验证视觉效果
3. **TASK-004** 由实现者在全部 UI 变更完成后执行回归清单，确认无遗漏
4. Gate C1（Lint / Build）在最终验证阶段检查 `pipeline.html` 无语法错误
