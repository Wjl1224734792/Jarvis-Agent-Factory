# Web 前端 React + Ant Design 重写需求文档

> 状态: confirmed | 日期: 2026-05-09 | 流水线: full

## 背景

当前 Jarvis Web 面板使用纯 HTML + Tailwind CSS CDN 实现，存在以下问题:
- 代码耦合在单一 HTML 文件中，难以维护
- Tailwind CSS CDN 加载慢，样式定制受限
- 无组件化，代码复用率低
- Markdown 渲染依赖 CDN 加载 marked.js，可靠性差
- 会话列表缺少任务标题，重连后无法区分

## 核心需求

### REQ-001: React + Ant Design 技术栈迁移
- 使用 React 18 + TypeScript 重写整个 Web 前端
- 使用 Ant Design 5.x 组件库 + @ant-design/icons 图标
- 使用 Vite 5.x 作为构建工具
- **移除** Tailwind CSS，不使用 CDN 加载
- 输出为 SPA（单页应用），构建产物上传 GitHub Release

### REQ-002: 卡通手绘风格主题
- 使用 antd-style 的 `createStyles` 实现主题
- 使用用户提供的 `useCartoonTheme` 配置（色彩、边框粗细、圆角等）
- 关键 token: `colorPrimary: '#225555'`, `colorBgBase: '#FAFAEE'`, `borderRadius: 18`, `lineWidth: 2`
- Card 背景色: `#BBAA99`
- 按钮无阴影，Modal 无阴影

### REQ-003: 新布局——顶部导航栏 + 侧边栏 + 主内容区
- 顶部导航栏：Logo + 标题 + 版本号 + 全局操作入口
- 侧边栏：平台筛选 + 会话列表（含任务标题、置顶标记、在线状态）+ MCP 接入状态
- 主内容区：根据路由切换流水线看板 / 智能体配置 / 归档记录
- 使用 Ant Design Layout 组件（Header + Sider + Content）

### REQ-004: 三个核心页面
- **流水线看板**（/）：统计卡片 + Gate 进度条 + 历史 Runs + Gate 步骤列表 + 文档抽屉
- **智能体配置**（/agents）：平台/来源/分类筛选 + 搜索 + Agent 卡片网格 + 模型/思考等级编辑弹窗
- **归档记录**（/archive）：会话分组展示 + 搜索过滤 + 恢复/删除操作

### REQ-005: Markdown 渲染
- 使用 `react-markdown` + `remark-gfm` 渲染文档
- 支持 GFM 表格、任务列表、删除线等扩展语法
- 替代当前 CDN 加载的 marked.js

### REQ-006: 会话持久化与任务标题
- 所有会话列表和状态存储在 SQLite 数据库（`~/.jarvis/engine.db`）
- 每次 `/jarvis` 启动时自动创建 pipeline_run 并设置任务标题（格式: `项目名 · MM-DD`）
- MCP `session_join` / `pipeline_init` 自动调用 `setRunTaskName` 设置默认任务名
- 会话侧边栏：优先显示 task_name，回退显示平台+流水线类型+时间
- **已实现**：数据库已有 `pipeline_runs.task_name` 列和 `setRunTaskName()` 函数

### REQ-007: 智能体扫描逻辑
- 三层合并保持不变：模板默认 → 全局用户配置 → 当前项目配置
- 不扫描"激活过的项目"（不跨项目目录扫描 agent 配置）
- 模板目录优先从 `dist/src/templates/platforms/` 读取，回退到 `src/templates/platforms/`
- 全局配置目录：`~/.claude/agents/`, `~/.opencode/agents/`, `~/.codex/agents/`
- 项目配置目录：`<project>/.claude/agents/`, `<project>/.opencode/agents/`, `<project>/.codex/agents/`
- **已实现**：`agent-registry.ts` 中的 `getAgentList(root)` 三层合并

### REQ-008: 移除 Gitee 维护
- 不再推送 Gitee remote
- 如有 gitee remote 配置，移除
- **已确认**：当前仓库无 gitee remote，只有 origin (GitHub)

### REQ-009: GitHub Release 发布
- 构建产物 `dist/web/` 上传到 GitHub Release
- 更新 `.github/workflows/release.yml`：上传 Web 构建产物替代原 HTML 文件
- 更新 `reverse-proxy.ts`：适配 SPA 静态资源加载
- 更新 `server.ts`：服务 SPA 入口文件 `index.html`

### REQ-010: 版本号显示
- Web 页面显示当前 Jarvis 版本号
- 通过 `/health` API 获取版本
- 构建时注入版本号占位符 `__JARVIS_VERSION__` 或运行时从 API 获取

## 非功能需求

- **构建性能**：Vite 构建 < 30s
- **页面加载**：首屏渲染 < 2s
- **响应式**：支持 Desktop (1280px+) 布局；侧边栏可折叠
- **浏览器兼容**：Chrome/Edge 最新两个大版本

## 技术决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 构建工具 | Vite 5 | React 项目标准，HMR 快，构建产物小 |
| UI 库 | Ant Design 5 | 用户指定，组件丰富 |
| CSS 方案 | antd-style | 用户提供主题代码使用此库 |
| 路由 | react-router-dom v6 | SPA 标准路由方案 |
| MD 渲染 | react-markdown + remark-gfm | 成熟稳定，GFM 扩展支持好 |
| 数据获取 | fetch API | 无需额外依赖，Hono 提供 REST API |
| 状态管理 | React useState/useEffect | 页面状态简单，不需要全局状态库 |

## 验收标准

1. `npm run build` 从 `web/` 目录成功构建 React SPA
2. 构建产物位于 `dist/web/`，含 `index.html` + JS/CSS bundle
3. `jarvis web` 启动后浏览器访问 `localhost:3457` 渲染新 UI
4. 三个页面（看板/智能体/归档）功能完整
5. 卡通主题生效（色彩、圆角、粗边框）
6. 会话列表显示任务标题
7. 文档抽屉可渲染 Markdown（含表格、代码块）
8. GitHub Release 包含 Web 构建产物
