<!-- Generated: 2026-06-03 -->
<!-- Parent: ../AGENTS.md -->

# web — Web 仪表盘（前端 SPA + 后端 API）

## Role
Jarvis Engine 的运营仪表盘。前端 React 19 SPA 提供流水线看板实时监控、Agent 配置、归档审查、Wiki 浏览；后端 Hono API 路由提供 REST 端点 + SSE 事件流。对引擎使用者提供可视化管理后台。

## Key Abstractions
| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| `AppLayout` | src/components/Layout.tsx | React Comp | 主布局：侧边栏(会话列表+乐观更新)+导航+SSE 实时分发 |
| `Dashboard` | src/pages/Dashboard.tsx | React Comp + Constants | 流水线看板 + 共享常量(GATE_COLORS/LABELS/DESCRIPTIONS) |
| `Agents` | src/pages/Agents.tsx | React Comp | Agent 配置页：三级筛选+模型/effort 编辑 |
| `setupApiRoutes` | src/web/routes.ts | fn | 后端 API 核心：18+ REST 端点 + SSE 流 + PubSub 广播 |
| `api` (前端) | src/api.ts | HTTP Client | 前端 API 客户端，封装全部后端调用 |
| `broadcastSSE` | src/web/routes.ts | fn | SSE 推送，500ms 去抖 + 2s maxWait + 并发锁 |

## Key Files
| File | Role | Description |
|------|------|-------------|
| `src/main.tsx` | 前端入口 | React 19 createRoot + BrowserRouter |
| `src/App.tsx` | 路由 | lazy + Suspense 路由注册(7 路径) |
| `src/components/Layout.tsx` | 数据中枢 | 556行：SSE/乐观更新/Context Provider |
| `src/pages/Dashboard.tsx` | 流水线看板 | Gate 步骤+文档预览+Run 列表 |
| `src/pages/Agents.tsx` | Agent 配置 | 卡片网格+编辑弹窗+模型配置 |
| `src/pages/SessionDetail.tsx` | 会话详情 | Gate 时间线+可拖拽分割栏 |
| `src/web/routes.ts` | 后端 API | 888行：18+ 端点+SSE+PubSub |
| `src/web/reverse-proxy.ts` | HTML 代理 | CDN 优先+1h 内存缓存+本地回退 |

## Conventions
- 中文 UI、中文注释
- Antd 6 + CSS Variables（暗色模式适配）
- React.lazy + Suspense 懒加载所有页面
- SSE 实时更新，JSON.stringify 浅比较避免无效渲染
- 乐观更新 + 快照回滚（pin/archive/delete）
- 路径遍历防护（resolve + startsWith 检查）

## For AI Agents
- 前端页面在 `src/pages/`，需同步 `App.tsx` 路由 + `api.ts` 契约
- 后端端点需同步更新 `setupApiRoutes` + 前端 `api` 对象
- SSE 数据格式需前后端兼容
- GATE_COLORS/LABELS/DESCRIPTIONS 共享常量在 `Dashboard.tsx` 中定义

<!-- MANUAL:START -->
<!-- MANUAL:END -->
