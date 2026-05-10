# Web 前端 React + Ant Design 重写 — 执行计划

> 需求文档：`docs/requirements/2026-05-09-web-react-antdesign-rewrite.md`
> 任务文档：`docs/tasks/2026-05-09-web-react-antdesign-rewrite-tasks.md`
> 状态：confirmed | 日期：2026-05-09 | 生成者：planner

## 1. 需求文档路径

`docs/requirements/2026-05-09-web-react-antdesign-rewrite.md`

## 2. 任务文档路径

`docs/tasks/2026-05-09-web-react-antdesign-rewrite-tasks.md`

## 3. 当前轮次目标

完成 React + Ant Design 5.x 前端重写全流程：App Shell 框架搭建、三个核心页面实现、后端 SPA 服务适配、Release 工作流更新、Gitee 引用清理。最终交付可构建、可运行的 SPA 前端。

## 4. 当前轮次范围

7 个任务全部纳入本轮次（一次性重写）：

| 任务 | 名称 | 预估行数 | 类型 |
|------|------|---------|------|
| TASK-001 | App Shell + 卡通主题 + 布局 | ~200 | 直接开发 |
| TASK-002 | 流水线看板页面 | ~350 | 直接开发 |
| TASK-003 | 智能体配置页面 | ~300 | 直接开发 |
| TASK-004 | 归档记录页面 | ~150 | 直接开发 |
| TASK-005 | 后端适配 SPA 服务 | ~80 | 直接开发 |
| TASK-006 | Release 工作流更新 | ~20 | 直接开发 |
| TASK-007 | Gitee 引用清理 | ~30 | 直接开发 |

**总预估变更行数：约 1130 行。** 略超 1000 行阈值，但属全面重写场景，单轮次可行。所有任务均为直接开发模式，无 TDD/DDD 要求。

## 5. 完成标准

1. `cd web && npm run build` 构建成功，产物位于 `dist/web/`
2. `jarvis web` 启动后浏览器访问 `localhost:3457` 渲染 React SPA
3. 三个页面（看板 / 智能体 / 归档）功能完整，交互正常
4. 卡通手绘主题生效（色彩 `#225555`/`#FAFAEE`、圆角 18px、粗边框 2px、Card 背景 `#BBAA99`）
5. Markdown 文档抽屉正确渲染（表格、代码块、任务列表、删除线）
6. 版本号在前端页面显示
7. 会话列表展示任务标题（回退显示平台+类型+时间）
8. GitHub Release 包含 `dist/web/` 构建产物
9. 项目文档无残留 Gitee 引用
10. 代码检查通过：`npm run lint`、`npm run typecheck`、`npm run build`、`npm run test`

## 6. 是否需要先查阅 code-explore-expert / docs-research-expert

**不需要。** 任务文档已提供完整的文件所有权矩阵和依赖关系。现有关键文件已在规划阶段审阅完毕：
- `web/src/api.ts` — API 客户端（43 个导出接口 + 25 个方法），所有前端任务只读使用
- `web/src/theme.tsx` — 卡通主题配置（`useCartoonTheme`），所有前端任务只读使用
- `web/vite.config.ts` — Vite 配置（outDir: `../dist/web`，proxy 到 `:3456`），无需修改
- `web/index.html` — Vite 入口（`<div id="root">` + `<script src="/src/main.tsx">`），已就绪
- `web/tsconfig.json` — TypeScript 配置（JSX react-jsx，strict），已就绪
- `web/package.json` — 依赖完整（react 18、antd 5、react-router-dom 6、react-markdown 9、remark-gfm 4、vite 5）
- `src/engine/server.ts` — `startWeb()` 函数（740 行，含 API 代理 + SPA 路由），TASK-005 独占修改
- `src/web/reverse-proxy.ts` — 反向代理（CDN 拉取 HTML + 本地回退），仅 `server.ts` 引用，TASK-005 可安全移除
- `.github/workflows/release.yml` — Release 工作流（上传 `dist/src/web/views/*.html`），TASK-006 独占修改

## 7. 执行代理分工

| 任务 | 代理 | 理由 |
|------|------|------|
| TASK-001 | `frontend-dev-expert` | 全栈前端任务：路由定义 + 布局组件 + 主题集成 + stub 页面创建 |
| TASK-002 | `frontend-dev-expert` | 全栈前端任务：多组件看板页面，涉及数据获取、状态管理、SSE 轮询 |
| TASK-003 | `frontend-dev-expert` | 全栈前端任务：卡片网格 + 筛选联动 + 弹窗状态管理 |
| TASK-004 | `frontend-dev-expert` | 全栈前端任务：数据展示 + 搜索过滤 + CRUD 操作 |
| TASK-005 | `backend-api-expert` | 后端代码修改：Hono 路由改造 + SPA fallback + 静态资源服务 |
| TASK-006 | `remediation-expert` | CI 配置文件修改：GitHub Actions workflow 更新 |
| TASK-007 | `remediation-expert` | 文档批量修改：AGENTS.md + README.md + README_EN.md |

## 8. 共享区域改动归属

### 8.1 关键共享文件所有权

| 文件 | 所有者 | 权限规则 |
|------|--------|---------|
| `web/src/main.tsx` | **TASK-001** | 创建后只读。路由集中定义于此，使用 `React.lazy` 懒加载页面组件。后续页面任务仅需创建对应的页面组件文件，路由自动生效，无需修改此文件。 |
| `web/src/App.tsx` | **TASK-001** | 创建后只读。包含 `ConfigProvider` + `useCartoonTheme` + `<Outlet />`，所有主题和布局在此注入。 |
| `web/src/components/Layout.tsx` | **TASK-001** | 创建后只读。Header + Sider + Content 三栏结构，所有页面共享。页面任务只需替换 Content 区域的 stub 组件。 |
| `web/src/components/Sidebar.tsx` | **TASK-001** 创建基础 → **TASK-002** 增强 | **串行依赖**。TASK-001 创建基础 Sidebar（导航链接 + 平台筛选按钮 + MCP 状态占位），预留 `sessions` props 和 `onSelectSession` 回调。TASK-002 在 Batch 2 增强：添加会话列表渲染、平台筛选交互、MCP 状态实时轮询。TASK-002 只能扩展现有接口，不得重构 TASK-001 的基础结构。 |
| `web/src/api.ts` | 已存在（共享只读） | 所有任务只读，通过其接口获取数据，不修改。 |
| `web/src/theme.tsx` | 已存在（共享只读） | 所有任务只读，通过 `useCartoonTheme()` 使用主题配置。 |
| `web/vite.config.ts` | 已存在 | 已配置 `outDir: ../dist/web`，`base: '/'`，proxy 到 `:3456`。所有任务无需修改。 |
| `web/index.html` | 已存在 | Vite 入口已就绪（`#root` + `main.tsx` 引用）。所有任务无需修改。 |
| `web/package.json` | 已存在 | 依赖完整。无需修改。 |
| `src/engine/server.ts` | **TASK-005** | 独占修改。替换 `startWeb()` 中的静态 HTML 路由为 SPA 服务逻辑。 |
| `src/web/reverse-proxy.ts` | **TASK-005** | 独占修改/移除。仅 `server.ts` 引用，TASK-005 处理后无其他引用方可安全删除。 |
| `.github/workflows/release.yml` | **TASK-006** | 独占修改。更新上传步骤路径。 |
| `AGENTS.md` | **TASK-007** | 独占修改。更新 Gitee 相关描述。 |
| `README.md` | **TASK-007** | 独占修改。移除 `GITEE_TOKEN` 环境变量说明。 |
| `README_EN.md` | **TASK-007** | 独占修改。移除 Gitee badge 链接。 |

### 8.2 共享区域冲突检查

仅有 **1 处串行依赖**：`web/src/components/Sidebar.tsx`（TASK-001 → TASK-002）。已在并行批次中通过分 Batch 处理（TASK-001 在 Batch 1，TASK-002 在 Batch 2）。

无其他文件同时被两个及以上任务修改。

## 9. 并行 / 串行策略

### 策略概览

```
Batch 1（并行，无依赖）
  ├── TASK-001: App Shell + 布局 [frontend-dev-expert]
  └── TASK-007: Gitee 引用清理 [remediation-expert]
      ↓
Batch 2（依赖 Batch 1，4 任务并行）
  ├── TASK-002: 流水线看板 [frontend-dev-expert]
  ├── TASK-003: 智能体配置 [frontend-dev-expert]
  ├── TASK-004: 归档记录   [frontend-dev-expert]
  └── TASK-005: 后端 SPA   [backend-api-expert]
      ↓
Batch 3（依赖 Batch 2 中 TASK-005）
  └── TASK-006: Release 工作流 [remediation-expert]
```

### 串行链

- **TASK-001 → TASK-002**：Sidebar.tsx 串行依赖（TASK-001 创建基础 → TASK-002 增强）
- **TASK-001 → TASK-003**：依赖 Layout 框架和路由结构
- **TASK-001 → TASK-004**：依赖 Layout 框架和路由结构
- **TASK-005 → TASK-006**：TASK-006 需要 TASK-005 确定的构建产物路径

### 并行组

| 并行组 | 任务 | 无冲突理由 |
|--------|------|-----------|
| Batch 1 并行 | TASK-001, TASK-007 | TASK-001 修改 `web/src/**`，TASK-007 修改 `*.md`，零文件重叠 |
| Batch 2 并行 | TASK-002, TASK-003, TASK-004, TASK-005 | TASK-002 修改 `web/src/pages/Dashboard.tsx` + 独占组件文件；TASK-003 修改 `web/src/pages/Agents.tsx` + 独占组件文件；TASK-004 修改 `web/src/pages/Archive.tsx`；TASK-005 修改 `src/engine/**`。四者无共享文件。 |

## 10. 风险提醒

| 风险 | 等级 | 涉及任务 | 缓解措施 |
|------|------|---------|---------|
| Sidebar.tsx 接口不匹配 | 中 | TASK-001 → TASK-002 | TASK-001 必须在 Sidebar.tsx 中导出明确的 `SidebarProps` 类型（含 `sessions`、`onSelectSession`、`selectedSessionId`），TASK-002 只能扩展不可重构基础结构 |
| 构建产物路径不一致 | 中 | TASK-005 → TASK-006 | TASK-005 完成后，TASK-006 必须验证 `dist/web/` 结构与 TASK-005 的 SPA 路由逻辑一致 |
| TASK-002 功能密集 | 高 | TASK-002 | 350 行拆分为 9 个子组件文件，每个文件独立开发；Dashboard.tsx 作为编排层组装子组件 |
| TASK-003 弹窗状态管理 | 高 | TASK-003 | 弹窗状态与列表状态分离；模板只读保护通过 `disabled` 属性实现，逻辑简单 |
| Vite 构建失败 | 中 | 全部前端 | 单个页面任务完成后立即验证 `web/` TypeScript 编译通过 |
| SPA fallback 遗漏 API 路由 | 中 | TASK-005 | `/api/*`、`/api/events`（SSE）、`/health` 必须在 fallback 规则之前注册 |

## 11. 实现者交接信息

### TASK-001 实现者需要为下游预留的接口

1. **Sidebar.tsx 导出 `SidebarProps`：**
   ```typescript
   export interface SidebarProps {
     sessions?: Session[];
     onSelectSession?: (sessionId: string) => void;
     selectedSessionId?: string | null;
   }
   ```
2. **Layout.tsx** 通过 `<Outlet />` 渲染子路由，页面任务只需创建对应组件文件即可自动接入
3. **页面 stub 文件** (`Dashboard.tsx`/`Agents.tsx`/`Archive.tsx`) 至少导出一个默认 React 组件，渲染页面标题占位内容

### TASK-005 实现者注意事项

- 移除 `import { getHtml, preloadCache } from '../web/reverse-proxy.js'` 后，`reverse-proxy.ts` 无其他引用方可安全删除
- SPA fallback 路由必须在 `/api/*` 和 `/health` 路由之后注册（通配符会拦截所有请求）
- `dist/web/index.html` 不存在时应返回友好错误提示，不崩溃

## 12. Execution Packet

---

### task_id: TASK-001
### task_name: App Shell + 卡通主题 + 布局框架
### requirement_ids: REQ-001, REQ-002, REQ-003, REQ-010
### owner: frontend-dev-expert
### objective: 创建 React SPA 应用骨架，包含路由、主题、布局和页面占位 stub，为后续页面任务提供基础框架。
### in_scope:
- 创建 `web/src/main.tsx`：React 应用入口，挂载到 `#root`，包裹 `ConfigProvider` + `BrowserRouter`
- 创建 `web/src/App.tsx`：集成 `useCartoonTheme()` 主题配置，使用 `<Outlet />` 渲染子路由
- 创建 `web/src/components/Layout.tsx`：Ant Design `Layout` 组件（Header + Sider + Content），Sider 使用 `collapsible`
- 创建 `web/src/components/Sidebar.tsx`：左侧导航（NavLink 三个菜单项：看板/智能体/归档）+ 平台筛选按钮行 + MCP 状态占位区域。导出 `SidebarProps` 接口（含 `sessions`、`onSelectSession`、`selectedSessionId`）
- 创建三个页面 stub 文件：`web/src/pages/Dashboard.tsx`、`web/src/pages/Agents.tsx`、`web/src/pages/Archive.tsx`，每个默认导出 React 组件，渲染页面标题
- 在 `main.tsx` 中定义路由：`/` → Dashboard，`/agents` → Agents，`/archive` → Archive，使用 `React.lazy` 懒加载
- 顶部导航栏：Logo（`ZapOutlined` 图标）+ 标题"Jarvis Engine" + 版本号（从 `/health` API 获取）
- 确认主题生效：验证 `useCartoonTheme()` 提供的 token（colorPrimary `#225555`、colorBgBase `#FAFAEE`、borderRadius 18、lineWidth 2、Card 背景 `#BBAA99`）
### out_of_scope:
- 会话列表渲染和交互逻辑（由 TASK-002 实现）
- 页面实际业务内容（由 TASK-002/003/004 实现）
- 修改 `web/src/api.ts` 或 `web/src/theme.tsx`
- 修改 `web/index.html`（已就绪）
### input_documents: docs/requirements/2026-05-09-web-react-antdesign-rewrite.md
### allowed_paths:
- `web/src/main.tsx`
- `web/src/App.tsx`
- `web/src/components/Layout.tsx`
- `web/src/components/Sidebar.tsx`
- `web/src/pages/Dashboard.tsx`
- `web/src/pages/Agents.tsx`
- `web/src/pages/Archive.tsx`
### forbidden_paths:
- `web/src/api.ts`（共享只读）
- `web/src/theme.tsx`（共享只读）
- `web/vite.config.ts`
- `web/index.html`
- `web/package.json`
- `src/**`
- `.github/**`
### dependencies:
- `web/src/api.ts` — 使用 `api.health()` 获取版本号
- `web/src/theme.tsx` — 使用 `useCartoonTheme()` 获取主题配置
- `react-router-dom` v6 — 路由定义
- `antd` 5.x — Layout, Menu, Button, Typography 组件
- `@ant-design/icons` — ZapOutlined 等图标
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-007]
### wait_for: []
### acceptance_criteria:
1. `web/src/main.tsx` 正确挂载 React 应用到 `#root`，包含 `ConfigProvider` + `BrowserRouter`
2. Ant Design `Layout` 组件正确渲染 Header + Sider + Content 三栏结构
3. 顶部导航栏显示 Logo（`ZapOutlined` 图标）+ 标题"Jarvis Engine" + 版本号
4. 侧边栏包含三个导航链接（看板/智能体/归档）+ 平台筛选按钮 + MCP 状态区域预留
5. `useCartoonTheme()` 提供的主题 token 生效（色彩 `#225555`/`#FAFAEE`、圆角 18px、线宽 2px、Card 背景 `#BBAA99`）
6. 版本号从 `/health` API 获取并显示
7. 路由正确分发 `/`（看板）、`/agents`、`/archive` 三个路径
8. 侧边栏支持折叠/展开
9. 页面 stub 文件已创建，渲染占位内容（如页面标题）
10. TypeScript 编译通过（`npx tsc --noEmit` 从 `web/` 目录）
### test_strategy: manual_only
### handoff_notes:
- 验证 Sidebar.tsx 导出了 `SidebarProps` 接口，否则 TASK-002 无法集成
- 验证三个页面 stub 文件已作为默认导出组件，否则路由懒加载会失败
- 验证 `useCartoonTheme()` 在 App.tsx 中正确集成到 ConfigProvider 的 `theme` prop
### escalation_rule: 如需变更 `web/src/theme.tsx` 或 `web/src/api.ts`，必须先回编排者，不得直接修改。

---

### task_id: TASK-002
### task_name: 流水线看板页面（统计卡片 + Gate 步骤条 + 历史 Runs + 文档抽屉）
### requirement_ids: REQ-004, REQ-005
### owner: frontend-dev-expert
### objective: 实现流水线看板完整页面，包含统计卡片、Gate 进度条、步骤时间线、历史 Runs、文档抽屉（Markdown 渲染）、Toast 通知、帮助弹窗，并增强侧边栏会话列表交互。
### in_scope:
- **StatsCards**：5 个统计卡片（完成进度百分比、已通过 Gate 数、当前阶段名、产物文件数、任务耗时）
- **GateProgress**：进度条显示百分比和当前 Gate 标签
- **GateSteps**：Gate 步骤时间线，配色区分（已通过绿色、当前蓝色+ring、未开始灰色），每项含名称、中文说明、图标、产物文件链接、时间信息
- **RunsHistory**：可折叠展开面板，显示 run ID、流水线类型、当前 Gate、日期、耗时、状态徽章
- **DocDrawer**：点击产物文件链接打开抽屉，通过 `/api/docs/` 加载 `.md` 文件，使用 `react-markdown` + `remark-gfm` 渲染（支持表格、代码块、任务列表、删除线）
- **HelpModal**：帮助弹窗显示 5 步操作指南（静态内容）
- **Toast**：通知组件，成功（绿色）/ 失败（红色）两态，3.5 秒自动消失
- **Sidebar 增强**：在 TASK-001 的 Sidebar.tsx 基础上添加会话列表渲染（含任务标题、置顶标记、在线状态）、右键菜单（置顶/取消置顶、归档、删除）、平台筛选交互、MCP 状态轮询（每 5 秒通过 SSE）
- **Dashboard.tsx 主组件**：替换 TASK-001 的 stub，编排所有子组件，管理选中会话状态，处理数据加载和 5 秒轮询
- 会话排序：置顶优先 + run 创建时间倒序
- 休眠会话显示"恢复"按钮
### out_of_scope:
- 智能体配置页面（TASK-003）
- 归档记录页面（TASK-004）
- 后端 API 逻辑（所有 API 通过 `web/src/api.ts` 调用，已实现）
- 修改 Sidebar.tsx 的基础导航布局结构（TASK-001 创建的基础结构保持不变）
### input_documents: docs/requirements/2026-05-09-web-react-antdesign-rewrite.md
### allowed_paths:
- `web/src/pages/Dashboard.tsx`（替换 stub）
- `web/src/components/StatsCards.tsx`
- `web/src/components/GateProgress.tsx`
- `web/src/components/GateSteps.tsx`
- `web/src/components/RunsHistory.tsx`
- `web/src/components/DocDrawer.tsx`
- `web/src/components/HelpModal.tsx`
- `web/src/components/Toast.tsx`
- `web/src/components/Sidebar.tsx`（仅增强，不重构基础结构）
### forbidden_paths:
- `web/src/main.tsx`（TASK-001 所有，路由已定义，只读）
- `web/src/App.tsx`（TASK-001 所有，只读）
- `web/src/components/Layout.tsx`（TASK-001 所有，只读）
- `web/src/api.ts`（共享只读）
- `web/src/theme.tsx`（共享只读）
- `web/src/pages/Agents.tsx`（TASK-003 所有）
- `web/src/pages/Archive.tsx`（TASK-004 所有）
- `src/**`
### dependencies:
- `web/src/api.ts` — `api.sessions()`, `api.pipeline()`, `api.pipelineRuns()`, `api.docContent()`, `api.pinRun()`, `api.unpinRun()`, `api.archiveRun()`, `api.deleteRun()`, `api.resumeSession()`
- `web/src/theme.tsx` — `useCartoonTheme()` 用于组件样式一致性
- `web/src/components/Sidebar.tsx` — TASK-001 创建的基础 Sidebar，依赖其 `SidebarProps` 接口
- `react-markdown` + `remark-gfm` — Markdown 渲染
- `antd` 5.x — Card, Progress, Timeline, Collapse, Drawer, Modal, Button, Badge, Tag, Dropdown, Menu 组件
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-003, TASK-004, TASK-005]
### wait_for: [TASK-001]
### acceptance_criteria:
1. 统计卡片行渲染 5 个数值卡片
2. Gate 进度条正确显示百分比和当前 Gate 标签
3. Gate 步骤列表以时间线样式渲染，配色正确（已通过/当前/未开始）
4. 每个 Gate 卡片显示完整信息（名称、中文说明、图标、产物文件链接、时间）
5. 历史 Runs 面板可折叠展开，列表信息完整
6. 点击产物文件链接打开文档抽屉，通过 `/api/docs/` 加载 `.md` 文件
7. 文档抽屉使用 `react-markdown` + `remark-gfm` 渲染，支持 GFM 扩展语法
8. 帮助弹窗显示 5 步操作指南
9. Toast 通知组件两态 + 3.5 秒自动消失
10. 点击左侧会话列表项切换选中会话，看板数据更新
11. 会话列表项右键菜单功能完整
12. 会话排序：置顶优先 + 创建时间倒序
13. 休眠会话显示"恢复"按钮
14. 每 5 秒自动轮询刷新
15. MCP 接入状态实时更新
16. 不修改 Sidebar.tsx 的基础导航结构（仅扩展会话列表区域）
### test_strategy: manual_only
### handoff_notes:
- Sidebar.tsx 增强时，必须基于 TASK-001 导出的 `SidebarProps` 接口扩展，不可重构基础布局
- DocDrawer 需处理 Markdown 渲染失败时的降级展示（显示纯文本）
- SSE 连接断开时应有静默重连机制
### escalation_rule: 如需修改 Sidebar.tsx 的基础结构（导航菜单、折叠逻辑），必须先回编排者进行 plan patch。如需新增 API 接口，回编排者评估后端影响。

---

### task_id: TASK-003
### task_name: 智能体配置页面（卡片网格 + 筛选 + 配置弹窗）
### requirement_ids: REQ-004
### owner: frontend-dev-expert
### objective: 实现智能体配置页面，包含卡片网格展示、多维度筛选、搜索、模型/努力等级编辑弹窗、像素头像渲染。
### in_scope:
- **Agents.tsx**：页面主组件，管理筛选状态、搜索关键词、选中卡片、弹窗开关
- **AgentCard**：单张卡片，显示像素头像（8x8 SVG 矩阵）、平台标签、来源徽章（模板/全局/项目）、名称、角色、模型名、思考等级。已自定义卡片显示紫色边框 + "已配置"徽章
- **AgentModal**：配置弹窗，模型下拉选择 + 自定义输入 + 努力等级下拉。模板来源禁止编辑（`disabled`）
- **PixelAvatar**：8x8 像素头像，从 AgentItem.icon（64 位 hex 矩阵）解析为内联 SVG `<rect>` 元素
- 平台筛选按钮：全部 / Claude Code / OpenCode / Codex
- 来源筛选：全部 / 模板默认 / 全局配置 / 项目配置（含数量标签）
- 分类筛选：动态从 `AgentsData.categories` 生成按钮
- 搜索输入框：按名称/ID/角色过滤，支持清除
- 保存成功：前端更新卡片状态，无需重新加载全列表
- "恢复默认"按钮：重置为 defaultModel + defaultEffort
- Toast 反馈保存/重置结果
- 侧边栏统计：全部智能体数量和已自定义数量
- 页面标题：筛选范围摘要（平台名 · 分类 · 数量）
- 卡片网格：`minmax(185px, 1fr)` 响应式
### out_of_scope:
- 流水线看板页面（TASK-002）
- 归档记录页面（TASK-004）
- 后端 agent-registry 扫描逻辑（REQ-007，已实现，只读使用）
- 修改 `web/src/api.ts` 中的 Agent 接口定义
### input_documents: docs/requirements/2026-05-09-web-react-antdesign-rewrite.md
### allowed_paths:
- `web/src/pages/Agents.tsx`（替换 stub）
- `web/src/components/AgentCard.tsx`
- `web/src/components/AgentModal.tsx`
- `web/src/components/PixelAvatar.tsx`
### forbidden_paths:
- `web/src/main.tsx`（TASK-001 所有，只读）
- `web/src/App.tsx`（TASK-001 所有，只读）
- `web/src/components/Layout.tsx`（TASK-001 所有，只读）
- `web/src/components/Sidebar.tsx`（TASK-001/002 所有，只读）
- `web/src/api.ts`（共享只读）
- `web/src/theme.tsx`（共享只读）
- `web/src/pages/Dashboard.tsx`（TASK-002 所有）
- `web/src/pages/Archive.tsx`（TASK-004 所有）
- `src/**`
### dependencies:
- `web/src/api.ts` — `api.agents()`, `api.saveAgent()`，以及接口类型 `AgentItem`, `AgentsData`
- `web/src/theme.tsx` — `useCartoonTheme()` 用于组件样式一致性
- `antd` 5.x — Card, Input, Button, Select, Modal, Tag, Badge, Empty 组件
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-002, TASK-004, TASK-005]
### wait_for: [TASK-001]
### acceptance_criteria:
1. 智能体卡片以响应式网格排列（`minmax(185px, 1fr)`）
2. 每张卡片显示完整信息（像素头像、平台标签、来源徽章、名称、角色、模型名、思考等级）
3. 平台筛选三按钮（Claude Code / OpenCode / Codex），选中高亮蓝色
4. 来源筛选含数量标签，可用
5. 分类筛选动态生成按钮
6. 搜索输入框按名称/ID/角色过滤，支持清除
7. 点击卡片打开配置弹窗，显示模型选择 + 自定义输入 + 努力等级
8. 模板来源（`source === 'template'`）禁用编辑，按钮显示"模板默认不可编辑"
9. 保存成功后前端更新卡片状态，不重新加载全列表
10. "恢复默认"按钮重置为默认值
11. Toast 反馈保存/重置结果
12. 已自定义卡片显示紫色边框 + "已配置"徽章
13. 页面标题显示筛选范围摘要
### test_strategy: manual_only
### handoff_notes:
- PixelAvatar 组件需要正确处理 64 位 hex 字符串解析。AgentItem.icon 格式为每字符代表一个像素的颜色索引
- 弹窗的"自定义输入"模式需要额外的 Select `mode="tags"` 或 Input + Select 组合
- 模板只读保护通过 `disabled` 属性实现，不做过多的 UI 条件渲染
### escalation_rule: 如需修改 `AgentItem` 接口或新增 API 调用，回编排者评估。

---

### task_id: TASK-004
### task_name: 归档记录页面（分组列表 + 搜索 + 恢复/删除）
### requirement_ids: REQ-004
### owner: frontend-dev-expert
### objective: 实现归档记录单页面，包含按 session_id 分组展示、搜索过滤、恢复和删除操作。
### in_scope:
- **Archive.tsx**：页面主组件，数据获取、分组逻辑、搜索过滤、恢复/删除操作
- 从 `/api/pipeline-runs/archived` 获取数据
- 按 `session_id` 分组显示，每组标题栏显示 session ID 缩写 + 数量
- 每条记录显示：任务名称（或"未命名"斜体）、指令标签、流水线类型、Run ID、日期、状态徽章
- 搜索输入框按任务名称或 session_id 过滤，实时更新匹配计数
- "恢复"按钮调用 `POST /api/pipeline-runs/:id/unarchive`，成功后从列表移除 + Toast
- "删除"按钮弹出 Ant Design `Modal.confirm` 确认，调用 `DELETE /api/pipeline-runs/:id`，成功后移除 + Toast
- 空状态：无归档记录时显示 `Empty` 组件 + 提示文案
- 搜索无结果时显示"未找到匹配的归档记录"
### out_of_scope:
- 流水线看板页面（TASK-002）
- 智能体配置页面（TASK-003）
- 多组件拆分（单文件页面，约 150 行，无需拆分）
- 恢复后自动刷新看板（由 TASK-002 的轮询机制处理）
### input_documents: docs/requirements/2026-05-09-web-react-antdesign-rewrite.md
### allowed_paths:
- `web/src/pages/Archive.tsx`（替换 stub）
### forbidden_paths:
- `web/src/main.tsx`（TASK-001 所有，只读）
- `web/src/App.tsx`（TASK-001 所有，只读）
- `web/src/components/Layout.tsx`（TASK-001 所有，只读）
- `web/src/api.ts`（共享只读）
- `web/src/theme.tsx`（共享只读）
- `web/src/pages/Dashboard.tsx`（TASK-002 所有）
- `web/src/pages/Agents.tsx`（TASK-003 所有）
- `src/**`
### dependencies:
- `web/src/api.ts` — `api.archivedRuns()`, `api.unarchiveRun()`, `api.deleteRun()`，以及 `PipelineRun` 接口
- `web/src/theme.tsx` — `useCartoonTheme()` 用于组件样式一致性
- `antd` 5.x — Input, Button, Tag, Badge, Empty, Modal 组件
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-002, TASK-003, TASK-005]
### wait_for: [TASK-001]
### acceptance_criteria:
1. 页面加载时从 `/api/pipeline-runs/archived` 获取数据
2. 归档记录按 `session_id` 分组显示，每组有标题栏（session ID 缩写 + 数量）
3. 每条记录显示完整信息（任务名称/未命名斜体、指令标签、流水线类型、Run ID、日期、状态徽章）
4. 搜索输入框按任务名称或 session_id 过滤，匹配计数实时更新
5. "恢复"按钮调用 API，成功后移除 + Toast
6. "删除"按钮弹出确认框，确认后调用 API，成功后移除 + Toast
7. 空状态显示提示文案
8. 搜索无结果显示"未找到匹配的归档记录"
### test_strategy: manual_only
### handoff_notes:
- 单文件任务，约 150 行。使用 useMemo 对分组和搜索过滤做优化
- 删除操作使用 `Modal.confirm` 而非内联确认，与项目规范一致
### escalation_rule: 无共享区域冲突。如需新增 API 接口，回编排者评估。

---

### task_id: TASK-005
### task_name: 后端改造——服务 React SPA 静态资源
### requirement_ids: REQ-009
### owner: backend-api-expert
### objective: 修改 `startWeb()` 函数，从 CDN 拉取 HTML 模式切换为本地 SPA 静态资源服务模式。
### in_scope:
- 修改 `src/engine/server.ts` 中的 `startWeb()` 函数：
  - 移除 `import { getHtml, preloadCache } from '../web/reverse-proxy.js'`
  - 将 `/dashboard`、`/agents`、`/archive` 的单独路由替换为 SPA fallback 逻辑
  - 添加 `/assets/*` 静态资源路由（映射到 `dist/web/assets/`）
  - 添加 SPA fallback：所有非 API、非 assets、非 health 的 GET 请求返回 `dist/web/index.html`
  - 添加 `dist/web/index.html` 文件存在性检查，不存在时返回友好错误
- 简化或删除 `src/web/reverse-proxy.ts`：确认无其他引用后安全删除
- 验证 `/api/*`、`/api/events`（SSE）、`/health` 路由优先级高于 fallback
- 更新 Web 面板启动日志
### out_of_scope:
- 修改引擎端口或 Web 端口默认值
- 修改 API 路由逻辑
- 修改 `src/web/routes.ts`（引擎端 API 路由，不涉及）
- 创建 `dist/web/` 目录或构建产物（由 `npm run build` 产生）
### input_documents: docs/requirements/2026-05-09-web-react-antdesign-rewrite.md
### allowed_paths:
- `src/engine/server.ts`
- `src/web/reverse-proxy.ts`
### forbidden_paths:
- `web/**`（前端代码，不修改）
- `src/engine/db.ts`（数据库，不修改）
- `src/engine/gates.ts`（Gate 逻辑，不修改）
- `src/engine/agent-registry.ts`（Agent 扫描，不修改）
- `src/web/routes.ts`（API 路由，不修改）
- `src/cli.ts`（CLI 入口，不修改）
- `.github/**`
### dependencies:
- `dist/web/index.html` — 构建产物，由 `cd web && npm run build` 产生
- `dist/web/assets/` — 静态资源目录，构建产物
- Hono `serveStatic` 或 `c.html()` + `readFileSync` 用于服务静态文件
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-002, TASK-003, TASK-004]
### wait_for: [TASK-001]
### acceptance_criteria:
1. `jarvis web` 启动后，`localhost:3457` 直接返回 `dist/web/index.html`
2. `/assets/*` 路径正确返回 `dist/web/assets/` 下的 JS/CSS 静态文件
3. 所有非 API/非静态文件请求 fallback 到 `index.html`（SPA 客户端路由）
4. `/api/*` 路径继续代理到引擎，行为不变
5. `/health` 透传到引擎，行为不变
6. `/api/events`（SSE）代理到引擎，行为不变
7. `reverse-proxy.ts` 已删除或移除所有未使用代码
8. 后端移除对 `src/web/views/*.html` 的依赖（不再 import `getHtml`/`preloadCache`）
9. 若 `dist/web/index.html` 不存在，返回友好错误提示（而非崩溃）
10. fallback 路由在 `/api/*`、`/api/events`、`/health` 之后注册（确保 API 优先）
### test_strategy: manual_only
### handoff_notes:
- 测试前需先执行 `cd web && npm run build` 确保 `dist/web/` 存在
- 验证 SPA 路由 fallback：浏览器直接访问 `localhost:3457/agents` 应返回 `index.html` 而非 404
- 验证 API 不受影响：`curl localhost:3457/health` 应返回引擎响应
- 验证 `/api/events` SSE 连接正常
### escalation_rule: 如需修改 API 路由逻辑或引擎端口配置，回编排者评估。

---

### task_id: TASK-006
### task_name: 更新 GitHub Actions Release 工作流——上传 Web 构建产物
### requirement_ids: REQ-009
### owner: remediation-expert
### objective: 修改 `.github/workflows/release.yml`，将 Web 构建产物上传步骤从 `dist/src/web/views/*.html` 改为 `dist/web/` 整个目录。
### in_scope:
- 修改 "Upload Web Views to Release" 步骤：
  - 替换 `for f in dist/src/web/views/*.html` 为上传 `dist/web/` 目录
  - 确保上传的文件包含 `index.html` 和 `assets/` 下的所有 JS/CSS bundle
- 移除对 `dist/src/web/views/*.html` 的引用
- 确认 `npm run build`（在 check job 中）产出 `dist/web/` 产物
- 更新步骤名称（可选：从 "Upload Web Views" 改为 "Upload Web SPA"）
### out_of_scope:
- 修改 `ci.yml`（CI workflow）
- 添加新的构建步骤
- 修改 npm publish 步骤
- 修改 Release 创建步骤
### input_documents: docs/requirements/2026-05-09-web-react-antdesign-rewrite.md
### allowed_paths:
- `.github/workflows/release.yml`
### forbidden_paths:
- `.github/workflows/ci.yml`
- `web/**`
- `src/**`
- `*.md`
### dependencies:
- TASK-005 确定的构建产物路径：`dist/web/index.html` + `dist/web/assets/`
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `verification-before-completion`
### parallel_group: []
### wait_for: [TASK-005]
### acceptance_criteria:
1. "Upload Web Views to Release" 步骤改为上传 `dist/web/` 整个目录或递归上传
2. 上传的文件包含 `index.html` 和 `assets/` 下的所有 JS/CSS bundle
3. 移除对 `dist/src/web/views/*.html` 的上传引用
4. 使用 `gh release upload` 命令，支持目录上传或通配符递归
### test_strategy: manual_only
### handoff_notes:
- `gh release upload` 不支持直接上传目录，需使用 `find` 或 `for` 循环遍历文件
- 建议实现方式：`find dist/web -type f -exec gh release upload "$RELEASE_TAG" {} --clobber \;`
- 需确认 `npm run build` 在 Release workflow 的 check job 中已包含 Web 构建步骤
### escalation_rule: 无共享冲突。如需修改 `ci.yml`，回编排者评估。

---

### task_id: TASK-007
### task_name: 清理项目文档中的 Gitee 引用
### requirement_ids: REQ-008
### owner: remediation-expert
### objective: 从项目 Markdown 文档中移除所有 Gitee 相关引用，将推送目标统一为 GitHub。
### in_scope:
- `AGENTS.md` 第 93 行：将"推送到 Gitee + GitHub"改为"推送到 GitHub"
- `AGENTS.md` 发布流程中的推送命令：仅保留 `git push origin main`
- `README.md` 第 95 行：移除 `GITEE_TOKEN=xxx` 环境变量说明
- `README_EN.md` 第 4 行：将 Gitee badge 链接替换为 GitHub 链接
- 确认 `git remote -v` 无 gitee remote
### out_of_scope:
- `CHANGELOG.md`（历史记录保留）
- 模板技能文件 `src/templates/platforms/*/skills/` 中的 Gitee 引用（面向用户的通用文档，保留）
- 修改任何代码文件
- 修改 `.github/workflows/` 下的 CI 文件
### input_documents: docs/requirements/2026-05-09-web-react-antdesign-rewrite.md
### allowed_paths:
- `AGENTS.md`
- `README.md`
- `README_EN.md`
### forbidden_paths:
- `src/templates/platforms/**`（模板技能文件，保留 Gitee 引用）
- `CHANGELOG.md`
- `web/**`
- `src/**`
- `.github/**`
### dependencies: 无
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `verification-before-completion`
### parallel_group: [TASK-001]
### wait_for: []
### acceptance_criteria:
1. `AGENTS.md` 第 13 条约束"推送到 Gitee + GitHub"改为"推送到 GitHub"
2. `AGENTS.md` 发布流程"推送到 GitHub"不再提及 Gitee
3. `README.md` 移除 `GITEE_TOKEN` 环境变量说明（第 95-99 行区域）
4. `README_EN.md` 第 4 行 Gitee badge 替换为 GitHub badge
5. `CHANGELOG.md` 保持不变
6. 模板技能文件保持不变
7. 确认 `git remote -v` 无 gitee remote（如存在则移除）
### test_strategy: manual_only
### handoff_notes:
- 使用 `grep -r "gitee\|GITEE\|Gitee" --include="*.md" AGENTS.md README.md README_EN.md` 确认无残留
- README.md 中移除 GITEE_TOKEN 时注意不要破坏环境变量表格的结构
- README_EN.md badge 替换需使用正确的 GitHub badge URL 格式：`https://img.shields.io/badge/version-v{VERSION}-green`
### escalation_rule: 无共享冲突。仅修改文档文件，不影响代码逻辑。

---

## 13. plan patch / contract change request 触发条件

以下情况发生时，实现代理必须暂停执行并通过编排者发起 plan patch：

| 触发条件 | 影响范围 | 处理方式 |
|---------|---------|---------|
| TASK-001 需要修改 `web/src/theme.tsx` 中 theme token | 所有页面视觉 | 编排者评估是否影响 REQ-002，可能需所有前端任务同步 |
| TASK-002 需要重构 Sidebar.tsx 基础结构（非扩展） | TASK-001、TASK-003 | 编排者协调 TASK-001 修改 + TASK-002 适配 |
| TASK-005 发现 `dist/web/` 路径需要变更 | TASK-006 | 编排者同步 TASK-006 中的上传路径 |
| `web/src/api.ts` 需要新增字段或方法 | 所有前端任务 | 编排者统一修改共享 API 层，各任务读取更新 |
| `web/package.json` 需要新增依赖 | 所有前端任务 | 编排者评估依赖是否必要，避免版本冲突 |
| SPA 路由结构需要调整（如新增路由） | TASK-001 `main.tsx` | 编排者协调 TASK-001 补充路由注册 |
| 发现 `web/index.html` 需要修改 | Vite 入口 | 仅 TASK-001 可修改，编排者审批 |

## 14. 推荐的下一步

1. **启动 Batch 1**：同时 spawn `frontend-dev-expert`（TASK-001）和 `remediation-expert`（TASK-007）
2. **Batch 1 验收**：
   - TASK-001：验证三个页面 stub 可渲染，主题生效，侧边栏导航可点击
   - TASK-007：验证 `grep -ri "gitee" AGENTS.md README.md README_EN.md` 无残留引用
3. **启动 Batch 2**：Batch 1 全部通过后，同时 spawn 4 个代理（TASK-002/003/004/005）
4. **Batch 2 验收**：各页面独立验证通过后，运行 `cd web && npm run build` 确认全量构建成功
5. **启动 Batch 3**：TASK-005 验收通过后，spawn `remediation-expert`（TASK-006）
6. **全量集成验证**：
   - `npm run lint && npm run typecheck && npm run build && npm run test`
   - `jarvis web` 启动验证 SPA 加载
   - 浏览器访问 `localhost:3457` 验证三个页面功能完整
7. **Gate C2 审查**：交付 `qa-review-expert` 进行代码质量评审

---

## parallel_batches

### Batch 1（无依赖，可同时启动）
- TASK-001 → subagent_type: frontend-dev-expert
- TASK-007 → subagent_type: remediation-expert

### Batch 2（依赖 Batch 1 全部完成）
- TASK-002 → subagent_type: frontend-dev-expert
- TASK-003 → subagent_type: frontend-dev-expert（可与 TASK-002 并行）
- TASK-004 → subagent_type: frontend-dev-expert（可与 TASK-002/003 并行）
- TASK-005 → subagent_type: backend-api-expert（可与 TASK-002/003/004 并行）

### Batch 3（依赖 Batch 2 中 TASK-005 完成）
- TASK-006 → subagent_type: remediation-expert

---

> 生成时间：2026-05-09 | 生成者：planner
