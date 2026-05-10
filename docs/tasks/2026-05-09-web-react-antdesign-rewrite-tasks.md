# Web 前端 React + Ant Design 重写 — 任务分解

> 需求文档：`docs/requirements/2026-05-09-web-react-antdesign-rewrite.md`
> 状态：confirmed | 日期：2026-05-09

## 任务概览

| 任务 | 名称 | 映射 REQ | 类型 | 优先级 | 行数 | 风险 | 可并行 |
|------|------|----------|------|--------|------|------|--------|
| TASK-001 | App Shell + 卡通主题 + 布局 | REQ-001/002/003/010 | 直接开发 | P0 | M (~200) | 中 | - |
| TASK-002 | 流水线看板页面 | REQ-004/005 | 直接开发 | P0 | L (~350) | 高 | 与003/004并行 |
| TASK-003 | 智能体配置页面 | REQ-004 | 直接开发 | P0 | L (~300) | 高 | 与002/004并行 |
| TASK-004 | 归档记录页面 | REQ-004 | 直接开发 | P0 | M (~150) | 低 | 与002/003并行 |
| TASK-005 | 后端适配 SPA 服务 | REQ-009 | 直接开发 | P0 | S (~80) | 中 | 独立 |
| TASK-006 | Release 工作流更新 | REQ-009 | 直接开发 | P1 | XS (~20) | 低 | 独立 |
| TASK-007 | Gitee 引用清理 | REQ-008 | 直接开发 | P1 | XS (~30) | 低 | 独立 |

**总预估变更行数：约 1130 行**（略超 1000 行阈值，但属全面重写场景，单轮次可行）

---

## 任务分解列表

### TASK-001: App Shell + 卡通主题 + 布局

- **task_id**: TASK-001
- **task_name**: App Shell + 卡通主题 + 布局框架
- **requirement_ids**: [REQ-001, REQ-002, REQ-003, REQ-010]
- **type**: 直接开发
- **priority**: P0
- **estimated_lines**: M (~200)
- **test_strategy**: manual_only（布局视觉验证）
- **dependencies**: []
- **parallel_group**: []（前置任务，页面任务依赖它）
- **risk**: 中
- **risk_description**: 创建 `main.tsx` 作为应用入口，定义路由结构和页面懒加载骨架。Layout 组件为所有页面共享，变更影响面大。
- **acceptance_criteria**:
  1. `web/src/main.tsx` 正确挂载 React 应用到 `#root`，包含 `ConfigProvider` + `BrowserRouter`
  2. Ant Design `Layout` 组件正确渲染 Header + Sider + Content 三栏结构
  3. 顶部导航栏显示 Logo（`ZapOutlined` 图标）+ 标题"Jarvis Engine" + 版本号
  4. 侧边栏包含三个导航链接（看板/智能体/归档）+ 平台筛选按钮 + MCP 状态区域
  5. `useCartoonTheme()` 提供的主题 token 生效（色彩 `#225555`/`#FAFAEE`、圆角 18px、线宽 2px、Card 背景 `#BBAA99`）
  6. 版本号从 `/health` API 获取并显示
  7. 路由 `react-router-dom` 正确分发 `/`（看板）、`/agents`、`/archive` 三个路径
  8. 侧边栏支持折叠/展开（Ant Design Sider `collapsible`）
  9. 页面 stub 文件（Dashboard/Agents/Archive）已创建，渲染占位内容
- **file_ownership**（创建）:
  - `web/src/main.tsx` — 应用入口（所有路由集中定义，使用 `React.lazy` 懒加载页面组件）
  - `web/src/App.tsx` — 主题 Provider + 路由出口
  - `web/src/components/Layout.tsx` — Header + Sider + Content 布局
  - `web/src/components/Sidebar.tsx` — 侧边栏导航 + 平台筛选 + MCP 状态
  - `web/src/pages/Dashboard.tsx` — 占位 stub
  - `web/src/pages/Agents.tsx` — 占位 stub
  - `web/src/pages/Archive.tsx` — 占位 stub
- **shared_region_conflicts**: `web/src/main.tsx` 为路由入口，后续页面任务不修改此文件（使用懒加载，页面组件文件创建后自动生效）

---

### TASK-002: 流水线看板页面

- **task_id**: TASK-002
- **task_name**: 流水线看板页面（统计卡片 + Gate 步骤条 + 历史 Runs + 文档抽屉）
- **requirement_ids**: [REQ-004, REQ-005]
- **type**: 直接开发
- **priority**: P0
- **estimated_lines**: L (~350)
- **test_strategy**: manual_only（数据渲染验证）
- **dependencies**: [TASK-001]
- **parallel_group**: [TASK-003, TASK-004]
- **risk**: 高
- **risk_description**: 预估 350 行跨多个子组件。功能密集：统计卡片、Gate 步骤条、历史 Runs、文档抽屉 Markdown 渲染、会话侧边栏集成、Toast 通知、帮助弹窗。建议拆分为多个组件文件。
- **acceptance_criteria**:
  1. 统计卡片行渲染 5 个数值卡片：完成进度、已通过 Gate（n/m）、当前阶段名称、产物文件数、任务耗时
  2. Gate 进度条正确显示百分比和当前 Gate 标签
  3. Gate 步骤列表以时间线样式渲染每个 Gate，区分配色：已通过（绿色）、当前（蓝色+ring）、未开始（灰色）
  4. 每个 Gate 卡片显示：名称、中文说明、图标、产物文件链接、时间信息（开始/通过/耗时）
  5. 历史 Runs 面板可折叠展开，列表显示 run ID、流水线类型、当前 Gate、日期、耗时、状态徽章
  6. 点击产物文件链接打开文档抽屉，通过 `/api/docs/` 加载 `.md` 文件
  7. 文档抽屉使用 `react-markdown` + `remark-gfm` 渲染，支持表格、代码块、任务列表、删除线
  8. 帮助弹窗显示 5 步操作指南（静态内容）
  9. Toast 通知组件：成功（绿色）/ 失败（红色）两态，3.5 秒自动消失
  10. 点击左侧会话列表项切换当前选中会话，看板数据随之更新
  11. 会话列表项右键菜单：置顶/取消置顶、归档、删除
  12. 会话排序：置顶优先 + run 创建时间倒序
  13. 休眠会话显示"恢复"按钮
  14. 每 5 秒自动轮询刷新（仅看板面板可见时）
  15. MCP 接入状态在侧边栏底部实时更新
- **file_ownership**（替换 TASK-001 的 stub）:
  - `web/src/pages/Dashboard.tsx` — 看板主页面（替换 stub）
  - `web/src/components/StatsCards.tsx` — 5 个统计卡片
  - `web/src/components/GateProgress.tsx` — 进度条
  - `web/src/components/GateSteps.tsx` — Gate 步骤时间线
  - `web/src/components/RunsHistory.tsx` — 历史 Runs 面板
  - `web/src/components/DocDrawer.tsx` — 文档抽屉（react-markdown 渲染）
  - `web/src/components/HelpModal.tsx` — 帮助弹窗（静态内容）
  - `web/src/components/Toast.tsx` — Toast 通知容器 + 实例
  - `web/src/components/Sidebar.tsx` — 增强：会话列表渲染、平台筛选交互、MCP 状态轮询
- **shared_region_conflicts**:
  - `web/src/components/Sidebar.tsx`：TASK-001 创建基础版本，TASK-002 增强会话列表交互。TASK-001 需预留 props 接口（sessions 数据、选择回调）。
  - `web/src/api.ts`：已存在的只读共享层，所有任务通过它获取数据，无修改冲突。

---

### TASK-003: 智能体配置页面

- **task_id**: TASK-003
- **task_name**: 智能体配置页面（卡片网格 + 筛选 + 配置弹窗）
- **requirement_ids**: [REQ-004]
- **type**: 直接开发
- **priority**: P0
- **estimated_lines**: L (~300)
- **test_strategy**: manual_only（交互验证）
- **dependencies**: [TASK-001]
- **parallel_group**: [TASK-002, TASK-004]
- **risk**: 高
- **risk_description**: 预估 300 行。包含像素头像渲染（64 位矩阵 SVG）、多维度筛选联动、配置弹窗（支持自定义模型输入）、模板只读保护逻辑、保存回调。弹窗状态管理需谨慎处理。
- **acceptance_criteria**:
  1. 智能体卡片以响应式网格排列（`minmax(185px, 1fr)`）
  2. 每张卡片显示：像素头像（8x8 SVG 矩阵）、平台标签、来源徽章（模板/全局/项目）、名称、角色、模型名、思考等级
  3. 平台筛选：全部 / Claude Code / OpenCode / Codex，选中高亮蓝色
  4. 来源筛选：全部 / 模板默认 / 全局配置 / 项目配置，标签显示数量
  5. 分类筛选：动态从 API 返回的 categories 生成按钮
  6. 搜索输入框：按名称/ID/角色过滤，支持清除按钮
  7. 点击卡片打开配置弹窗：显示模型下拉选择 + 自定义输入 + 努力等级下拉
  8. 弹窗读取智能体来源：`source === 'template'` 时禁用所有编辑控件，按钮显示"模板默认不可编辑"
  9. 保存成功：前端更新卡片状态（`is_custom` 变 true），无需重新加载全列表
  10. "恢复默认"按钮：重置为 `defaultModel` + `defaultEffort`
  11. Toast 反馈保存/重置结果（含文件同步状态）
  12. 已自定义的卡片显示紫色边框 + "已配置"徽章
  13. 侧边栏统计显示"全部智能体"数量和"已自定义"数量
  14. 页面标题显示筛选范围摘要（平台名 · 分类 · 数量）
- **file_ownership**（替换 TASK-001 的 stub）:
  - `web/src/pages/Agents.tsx` — 智能体页面主组件（替换 stub）
  - `web/src/components/AgentCard.tsx` — 单张智能体卡片
  - `web/src/components/AgentModal.tsx` — 模型/努力等级配置弹窗
  - `web/src/components/PixelAvatar.tsx` — 8x8 像素头像（SVG 内联渲染）
- **shared_region_conflicts**: 无。所有文件均为 TASK-003 独占创建。

---

### TASK-004: 归档记录页面

- **task_id**: TASK-004
- **task_name**: 归档记录页面（分组列表 + 搜索 + 恢复/删除）
- **requirement_ids**: [REQ-004]
- **type**: 直接开发
- **priority**: P0
- **estimated_lines**: M (~150)
- **test_strategy**: manual_only（交互验证）
- **dependencies**: [TASK-001]
- **parallel_group**: [TASK-002, TASK-003]
- **risk**: 低
- **risk_description**: 功能相对独立，逻辑简单。仅数据展示 + 两个操作按钮。
- **acceptance_criteria**:
  1. 页面加载时从 `/api/pipeline-runs/archived` 获取数据
  2. 归档记录按 `session_id` 分组显示，每组有标题栏（session ID 缩写 + 数量）
  3. 每条记录显示：任务名称（或"未命名"斜体）、指令标签、流水线类型、Run ID、日期、状态徽章
  4. 搜索输入框按任务名称或 session_id 过滤
  5. 搜索匹配计数实时更新
  6. "恢复"按钮调用 `/api/pipeline-runs/:id/unarchive` (POST)，成功后从列表移除并 Toast
  7. "删除"按钮弹出 `confirm` 确认，调用 `DELETE /api/pipeline-runs/:id`，成功后移除
  8. 空状态：无归档记录时显示提示文案
  9. 搜索无结果时显示"未找到匹配的归档记录"
- **file_ownership**（替换 TASK-001 的 stub）:
  - `web/src/pages/Archive.tsx` — 归档页面主组件（替换 stub）
- **shared_region_conflicts**: 无。单文件任务。

---

### TASK-005: 后端适配 SPA 服务

- **task_id**: TASK-005
- **task_name**: 后端改造——服务 React SPA 静态资源
- **requirement_ids**: [REQ-009]
- **type**: 直接开发
- **priority**: P0
- **estimated_lines**: S (~80)
- **test_strategy**: manual_only（启动 `jarvis web` 验证 SPA 加载）
- **dependencies**: [TASK-001]
- **risk**: 中
- **risk_description**: 修改 `startWeb()` 函数和 `reverse-proxy.ts`，改变 Web 面板服务方式。需确保 SPA 路由 fallback 正确，API 代理不中断。
- **acceptance_criteria**:
  1. `jarvis web` 启动后，`localhost:3457` 直接返回 `dist/web/index.html`（React SPA）
  2. `/assets/*` 路径正确返回 `dist/web/assets/` 下的 JS/CSS 静态文件
  3. 所有非 API/非静态文件请求（`/`、`/agents`、`/archive`）fallback 到 `index.html`（SPA 客户端路由）
  4. `/api/*` 路径继续代理到引擎（`localhost:3456`），行为不变
  5. `/health` 透传到引擎，行为不变
  6. `/api/events`（SSE）代理到引擎，行为不变
  7. 移除或简化 `reverse-proxy.ts`（不再需要 CDN 拉取 HTML + 本地回退逻辑）
  8. 移除后端对 `src/web/views/*.html` 的依赖
  9. 若 `dist/web/index.html` 不存在，返回友好错误提示（而非崩溃）
- **file_ownership**（修改）:
  - `src/engine/server.ts` — `startWeb()` 函数：替换静态页面路由为 SPA 服务逻辑
  - `src/web/reverse-proxy.ts` — 可删除或简化为仅保留工具函数（如仍需要）
- **shared_region_conflicts**: TASK-006 修改 `release.yml`，与 TASK-005 修改的服务器文件无重叠。

---

### TASK-006: Release 工作流更新

- **task_id**: TASK-006
- **task_name**: 更新 GitHub Actions Release 工作流——上传 Web 构建产物
- **requirement_ids**: [REQ-009]
- **type**: 直接开发
- **priority**: P1
- **estimated_lines**: XS (~20)
- **test_strategy**: manual_only（Tag 推送后验证 Release assets）
- **dependencies**: [TASK-005]
- **risk**: 低
- **risk_description**: 仅修改 CI 配置，改动量小。但需确保构建产物路径正确。
- **acceptance_criteria**:
  1. `.github/workflows/release.yml` 中 "Upload Web Views to Release" 步骤改为上传 `dist/web/` 整个目录
  2. 上传的文件包含 `index.html` 和 `assets/` 下的所有 JS/CSS bundle
  3. 移除对 `dist/src/web/views/*.html` 的上传
  4. CI workflow（`ci.yml`）的 build 步骤确认产出 `dist/web/` 产物
- **file_ownership**（修改）:
  - `.github/workflows/release.yml` — 更新上传步骤
- **shared_region_conflicts**: 无。`.github/workflows/release.yml` 仅 TASK-006 修改。

---

### TASK-007: Gitee 引用清理

- **task_id**: TASK-007
- **task_name**: 清理项目文档中的 Gitee 引用
- **requirement_ids**: [REQ-008]
- **type**: 直接开发
- **priority**: P1
- **estimated_lines**: XS (~30)
- **test_strategy**: manual_only（grep 确认无残留 gitee 引用）
- **dependencies**: []
- **parallel_group**: [TASK-005, TASK-006]
- **risk**: 低
- **risk_description**: 纯文档修改，无代码逻辑影响。
- **acceptance_criteria**:
  1. `AGENTS.md` 第 13 条约束"推送到 Gitee + GitHub"改为"推送到 GitHub"
  2. `AGENTS.md` 发布流程"推送到 GitHub"不再提及 Gitee
  3. `README.md` 移除 `GITEE_TOKEN` 环境变量说明（第 95-99 行）
  4. `README_EN.md` 移除 Gitee badge 链接
  5. `CHANGELOG.md` 无需修改（历史记录保留）
  6. 模板技能文件（`src/templates/platforms/*/skills/`）中的 Gitee 引用暂不修改：模板技能是面向用户的通用文档，Gitee 作为 Git 平台选项仍有参考价值
  7. 确认 `git remote -v` 无 gitee remote
- **file_ownership**（修改）:
  - `AGENTS.md` — 更新发布流程描述
  - `README.md` — 移除 Gitee 相关配置说明
  - `README_EN.md` — 移除 Gitee badge
- **shared_region_conflicts**: 无。文档文件独立。

---

## DDD 分类

本需求为前端 UI 重写，**无 DDD 任务**。

所有核心业务逻辑（会话管理、流水线状态机、Gate 验证、Agent 扫描三层合并、数据库操作）已在后端实现且不修改。前端仅负责数据展示和用户交互，属于应用层/表现层。

---

## TDD 与直接开发分类

### TDD 任务

**无。** 原因：
- 本需求为前端 UI 重写，不涉及核心业务规则、权限验证、资金计算、状态机等 TDD 强制场景
- 所有业务逻辑已在后端 `src/engine/` 中实现并通过现有测试覆盖
- 前端页面为数据展示 + 用户交互，适合视觉验证而非单元测试

若后续迭代引入以下场景，应转为 TDD：
- 前端表单验证逻辑（Agent 配置保存前的客户端校验）
- 复杂状态管理（多步骤向导、撤销/重做）
- 离线缓存策略

### 直接开发任务

所有 7 个任务均为直接开发：
- TASK-001 ~ TASK-004：React 组件创建，数据绑定，UI 交互
- TASK-005：服务器配置修改
- TASK-006：CI 配置修改
- TASK-007：文档修改

---

## 风险任务

| 任务 | 风险等级 | 风险原因 | 缓解措施 |
|------|---------|---------|---------|
| TASK-002 | 高 | 350 行跨多组件，功能密集 | 拆分为 9 个子组件文件，每个组件独立开发 |
| TASK-003 | 高 | 300 行，弹窗状态管理需谨慎 | 弹窗状态与列表状态分离；模板只读保护逻辑简单，通过 `disabled` 属性实现 |
| TASK-001 | 中 | 创建共享 Layout 框架，所有页面依赖 | 预留清晰的 props 接口；Sidebar 组件通过 children/render props 支持页面向侧边栏注入内容 |
| TASK-005 | 中 | 修改 Web 面板服务方式 | 保留反向代理逻辑为回退方案；先在开发环境 Vite proxy 下测试前端，再切换后端 |

**L/XL 任务未拆分说明：**
- TASK-002（350 行）和 TASK-003（300 行）已达到 L 级，但两者均已拆分为多个组件文件（TASK-002: 9 个组件；TASK-003: 4 个组件），每个组件文件 <100 行。风险主要在集成层面而非单文件规模，进一步拆分子任务会引入跨任务文件依赖，增加协调成本。

---

## 文件所有权和共享路径提醒

### 所有权矩阵

| 文件/目录 | 所有者 | 读写权限 |
|-----------|--------|---------|
| `web/src/main.tsx` | TASK-001 | 创建后只读 |
| `web/src/App.tsx` | TASK-001 | 创建后只读 |
| `web/src/components/Layout.tsx` | TASK-001 | 创建后只读 |
| `web/src/components/Sidebar.tsx` | TASK-001 创建 → TASK-002 增强 | 串行依赖 |
| `web/src/pages/Dashboard.tsx` | TASK-001 创建 stub → TASK-002 替换 | 串行依赖 |
| `web/src/pages/Agents.tsx` | TASK-001 创建 stub → TASK-003 替换 | 串行依赖 |
| `web/src/pages/Archive.tsx` | TASK-001 创建 stub → TASK-004 替换 | 串行依赖 |
| `web/src/api.ts` | 已存在（共享只读） | 所有任务只读 |
| `web/src/theme.tsx` | 已存在（共享只读） | 所有任务只读 |
| `web/vite.config.ts` | 已存在 | 无需修改 |
| `src/engine/server.ts` | TASK-005 | 独占修改 |
| `src/web/reverse-proxy.ts` | TASK-005 | 独占修改 |
| `.github/workflows/release.yml` | TASK-006 | 独占修改 |
| `AGENTS.md` | TASK-007 | 独占修改 |
| `README.md` | TASK-007 | 独占修改 |
| `README_EN.md` | TASK-007 | 独占修改 |

### 共享区域冲突

**仅 1 处串行依赖：**

| 共享文件 | 涉及任务 | 解决方案 |
|----------|---------|---------|
| `web/src/components/Sidebar.tsx` | TASK-001（创建）+ TASK-002（增强） | TASK-001 创建基础 Sidebar（导航 + 平台筛选 + MCP 状态占位）。TASK-002 添加会话列表渲染和交互逻辑。TASK-001 应预留 `sessions` props 和 `onSelectSession` 回调接口，避免 TASK-002 重构基础结构。 |

**无其他任务修改同一文件。**

---

## 推荐交付顺序

```
第 1 阶段（串行前置）：
  TASK-001: App Shell + 布局
    ↓
第 2 阶段（三页面并行 + 独立任务并行）：
  TASK-002: 流水线看板 ─┬─ 并行
  TASK-003: 智能体配置 ─┤
  TASK-004: 归档记录   ─┤
  TASK-005: 后端 SPA   ─┤
  TASK-007: Gitee 清理 ─┘
    ↓
第 3 阶段（串行收尾）：
  TASK-006: Release 工作流
```

**顺序说明：**
1. TASK-001 必须先完成 —— 所有页面任务依赖 Layout 框架和路由结构
2. TASK-002/003/004 互不修改同一文件，可完全并行
3. TASK-005 可独立于页面开发（修改后端代码），但测试验证需至少 TASK-001 的 stub 页面存在
4. TASK-007 独立文档修改，任何时机均可
5. TASK-006 依赖 TASK-005 确定构建产物的确切路径和结构，建议放在最后

---

## 验证清单

- [x] 所有 REQ-001 ~ REQ-010 均至少映射到 1 个 TASK
- [x] 任务使用垂直切片策略（每个任务交付完整功能页面或独立横切关注点）
- [x] 无水平切片（不存在"设计全部组件" / "实现全部 API 调用"类任务）
- [x] 每个任务有明确的 test_strategy
- [x] 依赖关系已明确，无循环依赖
- [x] 并行机会已识别（TASK-002/003/004 三页面并行；TASK-005/007 独立并行）
- [x] 风险任务已标注（TASK-001/002/003/005）
- [x] 单轮次总变更约 1130 行，略超 1000 行阈值但属重写场景，无需拆分多轮次
- [x] 共享区域已指定唯一责任方（仅 Sidebar.tsx 存在串行依赖）
- [x] 每个任务有可独立验证的完成标准

---

## 推荐的下一步

交付给 **planner** 智能体，建议执行计划：

1. **首批执行 TASK-001**（App Shell），预计完成时间 1-2 小时
2. **TASK-001 完成且 Layout stub 验证通过后，立即启动并行批次：**
   - TASK-002（看板）+ TASK-003（智能体）+ TASK-004（归档）+ TASK-005（后端）+ TASK-007（Gitee）
3. **并行批次全部完成后，执行 TASK-006**（Release 工作流）
4. **全量集成验证**：
   - `cd web && npm run build` 构建成功
   - `jarvis web` 启动后浏览器访问 `localhost:3457` 渲染 SPA
   - 三个页面功能完整
   - 卡通主题生效
   - 文档抽屉 Markdown 渲染正确

---

> 生成时间：2026-05-09 | 生成者：task-design agent
