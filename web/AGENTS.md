<!-- Generated: 2026-06-04T10:30:00+08:00 -->
<!-- Parent: ../AGENTS.md -->

# web/ — React 前端面板

## Role
Jarvis Engine 的 Web 管理面板，提供 Agentic AI 编排引擎的实时可视化仪表盘。独立 Vite + React 19 SPA 子项目，通过 REST API 和 SSE 与引擎通信。

## Architecture
React 19 SPA, 7 个懒加载路由页面。无全局状态管理库——状态通过 useState + useContext (SessionContext/PipelineDataContext) 传递。SSE 通过 EventSource 在 Layout useEffect 中维护连接 (指数退避重连)。样式 100% 内联 style 对象 (仅 Wiki.css 一个外部 CSS)。

## Key Abstractions

| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| `api` | api.ts | object | 所有后端 API 调用的 fetchJSON 封装, 20+ 端点方法 |
| `Session` / `PipelineSession` / `PipelineRun` | api.ts | interface | 核心数据模型 |
| `SessionContext` / `PipelineDataContext` | Layout.tsx | Context | 会话选择 + SSE 数据分发 |
| `GATE_COLORS` / `GATE_LABELS` / `GATE_DESCRIPTIONS` | Dashboard.tsx | const | Gate 颜色/标签/描述映射 (被 3 页面共享) |
| `LazyMarkdown` | Dashboard.tsx | component | 懒加载 Markdown 渲染器 (react-markdown + syntax-highlighter) |
| `matchPipelineType()` | matchPipelineType.ts | function | Agent ID → 流水线类型分类 |
| `applyPinOptimistic` / `applyArchiveOptimistic` / `applyDeleteOptimistic` | Layout.tsx | function | 乐观更新纯函数 |

## Key Files

| File | Role | Description |
|------|------|-------------|
| App.tsx | 路由定义 | 7 个懒加载路由 + ConfigProvider + Layout |
| Layout.tsx | 主布局 | Header + 可折叠 Sider (会话列表) + SSE 连接 (指数退避) + Context 提供 |
| api.ts | API 层 | 统一 fetchJSON, 所有类型定义 (Session/Gate/Pipeline/Agent/Wiki) |
| DashboardHome.tsx | 首页看板 | 统计卡片 + 活跃/休眠会话网格 |
| SessionDetail.tsx | 会话详情 | Gate Steps + Run 历史卡片 + 文档预览 + 可拖拽侧栏 |
| Agents.tsx | 智能体配置 | 网格 + 搜索 + 编辑弹窗 (模型/effort 配置) |
| Archive.tsx | 归档 | 分组列表 + 恢复/删除 |
| Wiki.tsx | 知识库 | 列表 + 搜索 + 分类筛选 + Markdown 阅读 |
| Guide.tsx | 使用指南 | 流水线类型 + Gate 说明 + 指令参考 |

## Conventions
- **样式**: 100% 内联 style 对象, 引用 Ant Design CSS 变量 (var(--ant-color-*)). 不引入 CSS modules.
- **路由**: React Router v6, 所有页面 React.lazy + Suspense
- **API**: api.fetchJSON 成功返回 JSON, 失败抛异常——不检查 .ok, 直接 try/catch
- **SSE**: EventSource 在 Layout.tsx useEffect 中, 指数退避 1s→2s→4s→...→max 30s
- **Markdown**: LazyMarkdown (Dashboard.tsx) 和 Wiki.tsx 各自渲染, 均用 react-syntax-highlighter
- **乐观更新**: Layout.tsx 中的纯函数: applyPinOptimistic, applyArchiveOptimistic, applyDeleteOptimistic, applyRollback

## Entry Points
- Vite dev: `cd web && npm run dev` (port 5173, proxy API → 3456/3457)
- Build: `npm run build:web` → dist/web/index.html (单文件)
- Routes: / → DashboardHome, /session/:id → SessionDetail, /agents → Agents, /archive → Archive, /archive/:runId → RunDetail, /wiki → Wiki, /guide → Guide

## Dependencies
- **Internal:** 后端 API (localhost:3456/3457), SSE /api/events
- **External:** react 19, react-router-dom 6, antd 6, react-markdown 9, react-syntax-highlighter 16, vite 8

## For AI Agents
- **共享常量风险**: GATE_COLORS/LABELS/DESCRIPTIONS/MARKDOWN_CSS 从 Dashboard.tsx 导出, 被 SessionDetail/RunDetail 导入. 修改需检查所有 import 来源.
- **样式**: 跟随内联 style 模式, 使用 var(--ant-color-*). 不引入新 CSS 方案.
- **API 调用**: 在 api.ts 新增方法, 不检查 .ok, 直接 try/catch.
- **SSE**: 从 PipelineDataContext 消费, 不建立新连接.
- **构建**: vite-plugin-singlefile 打包为单 HTML. 开发模式 Vite dev server proxy API.
- **测试**: 2 个测试文件 (Layout 乐观更新 + matchPipelineType). 纯函数有覆盖, UI 组件无覆盖.

<!-- MANUAL:START -->
<!-- MANUAL:END -->
