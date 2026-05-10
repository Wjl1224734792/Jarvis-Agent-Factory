# Web 前端 React + Ant Design 重写 —— 架构审查报告

> 审查日期: 2026-05-09 | 审查者: frontend-architect | 状态: 审查完成

## 审查范围

基于以下文档和源码的静态架构审查：

- `docs/requirements/2026-05-09-web-react-antdesign-rewrite.md` (需求)
- `docs/tasks/2026-05-09-web-react-antdesign-rewrite-tasks.md` (任务分解)
- `web/` (React 项目脚手架, 已有 `api.ts`, `theme.tsx`)
- `src/engine/server.ts` (后端 startWeb 函数)
- `src/web/routes.ts` (REST API 路由)
- `src/web/reverse-proxy.ts` (CDN 回退代理)
- `.github/workflows/ci.yml` 与 `release.yml` (CI/CD)
- `package.json` (根构建脚本)

审查方式: 只读审查, 不编写任何代码。

---

## 一、组件树结构评估

### 1.1 Layout (Header + Sider + Content) + 懒加载页面

**结论: 模式正确, 但 Sidebar 双所有权存在交接风险。**

Ant Design 的 `Layout` 组件 (Header + Sider + Content) 是标准且成熟的布局方案, 配合 `React.lazy` + `Suspense` 做页面级代码分割, 架构方向正确。

**确认无误的点:**

- 三栏布局适合 Dashboard 类应用, Content 区域根据路由切换页面
- `React.lazy` 懒加载三个页面组件 (Dashboard / Agents / Archive) 可实现按需加载, 减少首屏 Bundle 体积
- Sidebar `collapsible` 属性已纳入验收标准, 满足响应式需求

**识别到的风险:**

| 风险 | 严重度 | 说明 |
|------|--------|------|
| Sidebar 双所有权 | 中 | TASK-001 创建基础 Sidebar (导航 + 平台筛选 + MCP 状态占位), TASK-002 增强会话列表渲染和交互。两任务串行依赖同一文件, TASK-001 输出的 props 接口质量直接决定 TASK-002 是否需要重写。任务文档注明了 "预留 props 接口", 但预留接口是否准确需要在 TASK-001 完成时做 Gate check |
| 共享状态位置不明确 | 中 | 会话列表数据由 Sidebar 消费, 会话选中状态同时被 Sidebar (高亮当前项) 和 Dashboard (看板数据切换) 消费。当前设计未明确指定 "选中会话" 状态的归属位置: 是放在 Layout 层通过 props 下传, 还是放在路由状态 (URL 参数) 中, 还是使用 Context |
| 无 ErrorBoundary 定义 | 低 | 懒加载页面若加载失败 (chunk 404), 缺少 ErrorBoundary 会导致白屏, 用户体验差 |

**建议 (供 planner 决策, 不强制):**

1. 明确 "选中会话" 状态放在 Layout 组件中, 由 `useState` 管理, 通过 props 传递给 Sidebar 和 Content
2. 为 `React.lazy` 的每个页面包裹 `<ErrorBoundary fallback={...}>`
3. TASK-001 的 Sidebar 应至少暴露以下 props 接口: `sessions`, `selectedSessionId`, `onSelectSession`, `platformFilter`, `onPlatformFilterChange`

---

## 二、数据流架构评估

### 2.1 fetch-based API Client + 5 秒轮询

**结论: 架构存在冗余——后端已有 SSE 推送, 前端用轮询是倒退。**

`api.ts` 模块结构清晰, 类型定义完备 (`Session`, `PipelineSession`, `AgentItem` 等接口均完整声明), `fetchJSON` 包装函数统一错误处理。这本身没问题。

**但 5 秒轮询方案存在以下问题:**

| 问题 | 严重度 | 说明 |
|------|--------|------|
| **SSE 已存在但未使用** | 高 | 后端 `routes.ts` 已实现 `/api/events` SSE 端点, 每 8 秒广播全量会话数据。前端用 5 秒间隔 `fetch` 轮询, 不仅浪费带宽 (每次请求完整 HTTP 开销 + 响应), 还与后端推送节奏不一致 (5s vs 8s 时间差会产生无效请求) |
| 轮询生命周期管理缺失 | 中 | 任务文档只说 "仅看板页面可见时轮询", 但未定义实现机制: 是用 `useEffect` cleanup 在页面卸载时清除 interval, 还是用 `visibilitychange` 事件在 Tab 隐藏时暂停? 若实现不正确, 多页面切换会导致多个 interval 泄漏 |
| 无退避策略 | 低 | 固定 5 秒不区分正常和错误状态。若后端短暂不可用, 应在错误时增加间隔而非持续高频请求 |
| 无请求去重 | 低 | 快速切换会话时可能触发并发 fetch, 旧请求的响应可能覆盖新请求 (race condition) |

**关于 SSE 替代方案的技术分析:**

```
当前轮询: fetch → 全量 HTTP 请求 (headers + body) → parse → setState
SSE 方案:  EventSource → 增量推送 → parse → setState
```

对比:
- 轮询每次产生完整 HTTP 往返, SSE 只有初次连接开销
- SSE 数据由后端主动推送, 前端无需管理 interval 生命周期
- SSE 天然支持 `visibilitychange` 暂停 (浏览器自动降低后台 Tab 的 EventSource 优先级)
- 轮询 5s 与后端 SSE 8s 广播频率不一致, 约 37.5% 的轮询请求不会产生新数据 (浪费)

**建议:** 将 SSE 作为主要数据通道, `fetch` 作为 on-demand 补充 (如页面初始加载、用户手动刷新)。若担心 SSE 兼容性, 可保留轮询作为 fallback。具体实现不在本审查范围内。

### 2.2 状态管理方案

**结论: `useState/useEffect` 足以覆盖当前复杂度, 但缺少明确的分层策略。**

需求文档第 94 行声明 "页面状态简单, 不需要全局状态库", 这一判断基本正确。但跨组件共享状态 (会话选中、平台筛选) 仍需明确的存放策略, 否则会出现 props drilling 或状态不同步问题。

**当前缺失的状态管理约定:**

| 状态 | 建议存放位置 | 理由 |
|------|-------------|------|
| 会话列表 + 选中会话 | Layout 组件 | 被 Sidebar 和 Dashboard 同时消费 |
| 平台筛选 | Layout 组件 | 被 Sidebar 过滤和 Dashboard 请求参数同时使用 |
| 看板数据 (统计/Gate/Runs) | Dashboard 组件内部 | 仅本页面使用, 切换会话时重新 fetch |
| Agent 列表/筛选 | Agents 组件内部 | 仅本页面使用 |
| 归档列表 | Archive 组件内部 | 仅本页面使用 |
| Toast 通知 | App 级别 (Context 或 Portal) | 跨所有页面 |

---

## 三、主题架构评估

### 3.1 antd-style + ConfigProvider

**结论: CSR-only 场景下方案可行, 但存在一个 CSS 变量解析时序问题。**

`theme.tsx` 使用 `antd-style` 的 `createStyles` 生成共享样式 (border/inner shadow), 返回 `ConfigProviderProps` 对象。由于项目为纯 CSR (无 SSR), `antd-style` 的运行时 CSS-in-JS 方案完全适用, 不存在水合 (hydration) 问题。

**确认无误的点:**

- `ConfigProvider` 的 `theme.token` 配置与需求文档第 26-28 行的手绘风格参数一致
- 组件级 `components.Card.colorBgContainer: '#BBAA99'` 覆盖正确
- 按钮/Modal 的 `shadow: 'none'` 已正确配置
- 无 SSR → 无水合不匹配风险

**识别到的风险:**

| 风险 | 严重度 | 说明 |
|------|--------|------|
| **`createStyles` 模块级调用时序** | 中 | `theme.tsx` 第 6 行 `const useStyles = createStyles(...)` 在模块顶层调用。`createStyles` 内部依赖 `cssVar` 函数, 该函数需要 `ConfigProvider` 的 theme context 来解析 CSS 变量值。在 `ConfigProvider` 挂载之前 (首次渲染最外层), `cssVar` 返回的可能是默认 antd 值而非自定义主题值 (`colorPrimary: '#225555'`)。第一次渲染可能出现短暂的默认样式闪烁 (FOUC) |
| `cssVar.lineWidth` 语义 | 低 | `createStyles` 中使用 `cssVar.lineWidth` 和 `cssVar.lineType`, 但 antd-style v3.7 的 `cssVar` 函数是否暴露 `lineType` 属性需要验证。`lineType` 不是标准的 Ant Design token, 若不存在会返回空字符串导致 border 样式不生效 |

**建议:** 在 `App.tsx` 中将 `ConfigProvider` 包裹在最外层, 确保 `useCartoonTheme` 返回的配置在 React 树挂载前即生效。验证 `cssVar.lineType` 的实际返回值。

---

## 四、构建集成评估

### 4.1 Vite 输出到 dist/web/ + 主项目 tsc 集成

**结论: 构建流水线存在集成缺口——根 build 脚本未包含 web 子项目构建。**

当前构建配置分析:

| 层面 | 配置 | 问题 |
|------|------|------|
| `web/vite.config.ts` | `outDir: '../dist/web/'`, `emptyOutDir: true` | 正确, 产物路径 `dist/web/` |
| `web/package.json` | `build: "tsc -b && vite build"` | `web/tsconfig.json` 设置了 `noEmit: true`, `tsc -b` 在 build mode 下的行为需要确认 |
| 根 `package.json` | `build: "tsc && ..."` (纯后端编译) | **未包含 `web/` 构建**, 仅 `cpSync` 了 `src/web/views/` (旧 HTML 视图) |
| CI `ci.yml` | `npm run build` (仅根脚本) | **不会构建 React SPA** |
| `release.yml` | 上传 `dist/src/web/views/*.html` | 需改为上传 `dist/web/` |

**关键问题:**

1. **`tsc -b` 与 `noEmit` 冲突**: `web/tsconfig.json` 设置了 `noEmit: true`, 而 `-b` (build mode) 期望有 emit。实际上 `tsc -b` 配合 `noEmit` 会只做类型检查不产出文件, 在 Vite 项目中这是合理用法 (Vite 负责构建, tsc 仅做检查), 但组合语义需要确认。更稳妥的写法是 `tsc --noEmit && vite build`, 与 TASK-005 的意图一致。

2. **TypeScript 版本不一致**: 根 `package.json` 使用 `typescript: ^6.0.3`, `web/package.json` 使用 `typescript: ^5.5.3`。两者在同一个 monorepo 中但版本不同, CI 环境下取决于 `npm install` 的执行位置。若 CI 只在根目录执行 `npm ci`, `web/node_modules/` 不会被安装, web 构建会失败。

3. **`dist/` 覆盖风险**: Vite 的 `emptyOutDir: true` 会清空 `dist/web/`。若根 `build` 脚本在 Vite 之前先执行 `tsc` (输出到 `dist/src/`), 两者互不干扰。但若将来有人在根 `build` 脚本开头加了 `rm -rf dist/`, 必须先执行 Vite 构建再执行根 tsc, 否则 Vite 产物会被 tsc 的清空操作删除。

4. **根 build 脚本仍需保留旧逻辑**: 当前根 `build` 脚本的最后一步是对 `dist/src/web/views/*.html` 做版本号注入替换。迁移到 React SPA 后, 此逻辑需要移除, 但版本号注入仍需通过 Vite 的 `define` 配置 (`__JARVIS_VERSION__`) 实现。

**建议:**

1. 根 `package.json` 的 `build` 脚本应包含 `cd web && npm ci && npm run build` (或在 CI 中单独步骤)
2. `web/package.json` 的 `build` 脚本改为 `tsc --noEmit && vite build` 以明确意图
3. CI 的 `check` job 需要确认 web 的依赖被安装。可选择: (a) 根目录使用 workspaces 统一管理, 或 (b) CI 中显式 `cd web && npm ci`
4. 版本号注入改为在 `web/vite.config.ts` 中使用 `define: { __JARVIS_VERSION__: JSON.stringify(version) }`

---

## 五、路由设计评估

### 5.1 react-router-dom v6 + 三个路由

**结论: 路由结构正确, 但需确认 SPA fallback 在服务端的正确实现。**

三个路由 (`/`, `/agents`, `/archive`) 是标准的 SPA 路由方案。从旧 HTML hash 路由 (`#/dashboard`, `#/agents`, `#/archive`) 迁移到 History API 路由 (`/`, `/agents`, `/archive`) 是正确的方向。

**需确认的变更点:**

| 变更项 | 旧方案 | 新方案 | 影响 |
|--------|--------|--------|------|
| 路由方式 | Hash (`#/dashboard`) | History API (`/`) | 服务端需支持 SPA fallback |
| 服务端路由 | 每个路径返回独立 HTML | 所有非 API/非资产路径返回 `index.html` | `startWeb()` 需要完全重写路由逻辑 |
| 静态资源路径 | 无 (CDN 加载) | `/assets/*` 映射到 `dist/web/assets/` | 新增静态文件服务中间件 |
| 首页 | `/` 重定向到 `/dashboard` | `/` 直接渲染看板 | 移除重定向 |
| AGENTS.md 文档 | 引用 `#/dashboard` | 需更新为 `/` | 文档同步 |

**SPA fallback 的关键实现细节:**

```
服务端路由优先级 (TASK-005 需实现):
1. /health          → 透传到引擎
2. /api/*           → 代理到引擎
3. /assets/*        → 服务 dist/web/assets/ 静态文件 (含 hashed JS/CSS)
4. /*               → 返回 dist/web/index.html (SPA fallback)
```

注意: `index.html` 中的 `<script type="module" src="/src/main.tsx">` 在构建后会被 Vite 替换为 `<script type="module" src="/assets/index-abc123.js">`。因此 `/assets/*` 路由必须在 `/*` fallback 之前注册, 否则浏览器请求 hashed bundle 时会得到 `index.html` 文本内容, 导致 MIME 类型错误。

**AGENTS.md 需更新:** 第 48-52 行的路由表格目前引用 Hash 路由, 需在 TASK-007 或文档同步阶段更新。

---

## 六、SPA 部署架构评估

### 6.1 Hono 静态文件服务 + CDN fallback

**结论: reverse-proxy.ts 的 CDN fallback 模式在 SPA 场景下存在结构性问题, 需要重新设计。**

当前 `reverse-proxy.ts` 的工作方式:
1. 从 `https://github.com/.../releases/latest/download/<page>.html` 拉取单个 HTML 文件
2. 缓存 1 小时
3. 失败时回退到本地 `src/web/views/<page>.html`

**SPA 场景下的结构性问题:**

| 问题 | 说明 |
|------|------|
| **Hashed 资源引用断裂** | `index.html` 引用 `<script src="/assets/index-a1b2c3.js">`。若客户端从 CDN 获取了旧版 `index.html`, 但 CDN 上的 `assets/index-a1b2c3.js` 已被新版本替换 (或被清理), 页面加载失败。HTML 和 JS/CSS 的版本必须原子性地匹配 |
| **多文件上传复杂度** | 旧方案只需上传若干 `.html` 文件。新方案需上传整个 `dist/web/` 目录 (含所有 hashed JS/CSS), `release.yml` 的批量上传逻辑需要改变 |
| **CDN 缓存策略** | GitHub Release 的 CDN 缓存行为不透明。`index.html` 应永不缓存或短缓存, hashed 资源应永久缓存。但 GitHub Release 对所有文件使用相同缓存策略, 无法区分 |
| **npm 用户降级** | 移除 CDN fallback 后, 通过 `npm i -g jarvis-agent-factory` 安装的用户只能使用本地构建的 Web 面板。若 `dist/web/` 不在 npm 包中, Web 面板不可用。需确认 npm `files` 字段是否包含 `dist/web/` |

**TASK-005 的职责边界:** 任务文档说明 "移除或简化 reverse-proxy.ts", 但未明确最终方案。需要决策:

1. **方案 A (移除 CDN, 纯本地)**: `dist/web/` 纳入 npm 包, `startWeb()` 直接从本地服务。优点: 简单可靠。缺点: 非 npm 用户需本地构建。
2. **方案 B (保留 CDN, 但适配 SPA)**: 从 CDN 拉取 `dist/web.tar.gz`, 解压到临时目录, 服务其内容。优点: 保留动态更新能力。缺点: 复杂度高, 需处理解压、权限、清理。
3. **方案 C (混合)**: 本地文件优先, CDN 仅用于检查更新通知 (不自动替换)。优点: 平衡可靠性和时效性。缺点: 需要用户手动触发更新。

**当前架构倾向于方案 A** (任务文档和 `startWeb()` 的改造方向都指向纯本地服务), 这是最务实的选择。若选择此方案, 需确保 `package.json` 的 `files` 字段包含 `dist/web/`。

---

## 七、架构风险与反模式汇总

### 7.1 严重问题

| # | 问题 | 影响范围 | 说明 |
|---|------|---------|------|
| A | **SSE 闲置, 轮询浪费** | 数据流 | 后端已实现 SSE 广播 (8s 间隔), 前端却用 5s fetch 轮询。每个活跃的 Web 面板都会向引擎发起 720 次/小时的额外 HTTP 请求, 其中约 37% 不回新数据。SSE 连接是长连接, 服务端开销远低于反复的 HTTP 握手 |
| B | **根 build 脚本未集成 web 构建** | CI/CD | CI 和 Release 流程均只执行根 `npm run build`, 不会触发 `web/` 的 Vite 构建。除非手动执行 `cd web && npm run build`, 否则 `dist/web/` 永远不会被生成。这是一个阻塞性问题 |
| C | **SPA fallback 缺失会导致硬刷新白屏** | 服务端 | 用户直接访问 `localhost:3457/agents` (或在 `/agents` 页面刷新浏览器) 时, 服务端必须返回 `index.html` 而非 404。若 TASK-005 未正确实现 catch-all 路由, 任何非首页路径的硬刷新都会失败 |

### 7.2 中等问题

| # | 问题 | 影响范围 | 说明 |
|---|------|---------|------|
| D | **Sidebar 串行依赖的交接风险** | 组件架构 | TASK-001 和 TASK-002 先后修改同一个 `Sidebar.tsx`。若 TASK-001 未正确预留接口, TASK-002 需重构基础结构, 增加返工成本 |
| E | **`createStyles` 模块级调用时序** | 主题 | CSS 变量可能在 `ConfigProvider` 挂载前解析为默认值, 首次渲染出现样式闪烁 |
| F | **缺少统一的错误/加载/空状态模式** | 全架构 | 三个页面各自实现 loading spinner、error message、empty state。若不一致, 用户体验碎片化 |
| G | **TypeScript 版本不一致** | 构建 | 根 `typescript: ^6.0.3` vs web `typescript: ^5.5.3`, 类型检查行为可能不一致 |
| H | **CDN fallback 设计不再适用** | 部署 | reverse-proxy.ts 的 `fetchRemoteHtml` 逐个拉取 HTML 的设计在 SPA 场景下不适用, 需要整体重新设计或移除 |
| I | **版本号注入方式需变更** | 构建 | 旧方案在 build 后用 Node 脚本对 HTML 做字符串替换 `__JARVIS_VERSION__`。新方案应在 Vite 配置中通过 `define` 注入, 避免构建后修改产物的脆弱性 |

### 7.3 低优先级关注点

| # | 问题 | 影响范围 | 说明 |
|---|------|---------|------|
| J | **无请求竞态处理** | 数据流 | 快速切换会话时, 旧请求的响应可能覆盖新请求。建议使用 `AbortController` 或请求序列号 |
| K | **无 Tab 可见性感知** | 数据流 | 轮询在 Tab 不可见时仍继续, 浪费资源。应使用 `Page Visibility API` |
| L | **Toast 组件架构未定义** | 组件架构 | TASK-002 创建 Toast, 但 TASK-003 和 TASK-004 也需要 Toast。若 Toast 实现为 Dashboard 私有组件, 其他页面无法复用 |
| M | **`cssVar.lineType` 属性存在性** | 主题 | antd-style v3.7 的 `cssVar` 是否包含 `lineType` 需运行时验证, 若不包含则 border 样式不生效 |

### 7.4 非架构问题 (记录但不阻塞)

| # | 观察 | 说明 |
|---|------|------|
| N | 安全架构未在设计文档中提及 | 虽然本项目为本地工具 (localhost only), CSP/XSS/CSRF 的威胁面极小, 但 `dangerouslySetInnerHTML` (react-markdown 内部使用) 和 API 代理的安全性仍应简要记录 |
| O | `web/index.html` 的 favicon 使用 data URI emoji | 非阻塞, 但实际部署时 emoji 在不同操作系统上渲染不一致, 建议后续替换为 SVG icon |
| P | `web/tsconfig.json` 中 `noUnusedLocals` 和 `noUnusedParameters` 设为 `false` | 可能导致未使用的变量残留。建议在 TASK 全部完成后开启并修复 |

---

## 八、架构评分矩阵

| 维度 | 评分 (1-5) | 说明 |
|------|-----------|------|
| 技术选型合理性 | 4/5 | React 18 + Vite 5 + Ant Design 5 + react-router-dom v6 是标准的现代 SPA 技术栈, 选型合理。唯一扣分: 开发依赖中指定 TypeScript 5.5 而根使用 6.0, 版本不一致 |
| 组件架构清晰度 | 3.5/5 | Layout + 懒加载页面模式正确, 但 Sidebar 双所有权和共享状态位置不明确扣分 |
| 数据流设计 | 3/5 | API client 封装良好, 但 SSE 闲置、无退避/去重/可见性管理, 明显有改进空间 |
| 构建集成可靠性 | 2.5/5 | 这是当前最薄弱的环节。根 build 未集成 web 构建, CI 不会产出 SPA 产物, TS 版本不一致, 这三个问题都是阻塞性的 |
| 部署架构适配性 | 3/5 | SPA fallback 逻辑需完全重写, CDN 模式需要重新设计。方向正确但实现细节可能踩坑 |
| 可维护性 | 4/5 | 每个页面组件独立文件, `api.ts` 集中管理数据层, 可维护性好 |
| 安全性 | 4/5 | localhost-only 部署天然隔离了大量攻击面。唯一关注点是 react-markdown 的 XSS 风险和 API 代理的路径遍历防护 (后端已实现) |
| 性能设计 | 3.5/5 | 懒加载、代码分割到位。但 5s 轮询而非 SSE 浪费资源, 缺少预加载/缓存策略 |

**综合评分: 3.3/5** — 技术选型和组件架构基本正确, 但构建集成和数据流设计存在阻塞性缺陷。

---

## 九、关键修复建议 (优先级排序)

### P0 (阻塞发布, 必须在 TASK-005 之前解决)

1. **修复构建集成**: 确保根 build 流程 (及 CI) 产出 `dist/web/`。两个可行路径:
   - 路径 A: 在根 `package.json` 的 `build` 脚本末尾追加 `cd web && npm ci && npm run build`
   - 路径 B: 在 CI 中新增独立步骤 `cd web && npm ci && npm run build`
2. **修复 SPA fallback**: `startWeb()` 必须实现 catch-all 路由, 所有非 API/非 assets 路径返回 `index.html`
3. **同步 TypeScript 版本**: `web/package.json` 的 TypeScript 版本应与根保持一致 (`^6.0.3`), 或明确确认版本差异无害

### P1 (影响用户体验, 建议在并行批次中解决)

4. **SSE 替代轮询**: 将 5s 轮询改为 EventSource 监听 `/api/events`, 数据推送间隔保持后端 8s
5. **定义共享状态位置**: 明确 "选中会话" 状态在 Layout 层管理, 接口文档化
6. **Toast 提升为全局组件**: 使用 React Context 在 App 层提供 Toast, 所有页面通过 `useToast()` 调用
7. **版本号注入改为 Vite define**: 移除根 build 脚本中的 HTML 字符串替换逻辑

### P2 (改进项, 不阻塞当前迭代)

8. **添加 ErrorBoundary**: 为懒加载页面包裹错误边界
9. **Tab 可见性感知**: 轮询/SSE 连接在 Tab 隐藏时暂停
10. **请求竞态处理**: 使用 AbortController 取消过时请求

---

## 十、与现有系统的兼容性分析

| 现有组件 | 影响 | 迁移动作 |
|----------|------|---------|
| `src/web/views/pipeline.html` | 删除 | 不再需要 HTML 视图文件, 由 React SPA 替代 |
| `src/web/views/agents.html` | 删除 | 同上 |
| `src/web/reverse-proxy.ts` | 重写或删除 | CDN 拉取 HTML 逻辑不再适用, 但工具函数可保留 |
| `src/engine/server.ts` | 修改 | `startWeb()` 路由逻辑完全重写为 SPA 服务 |
| `src/web/routes.ts` | 不变 | API 路由不变, 前端 `api.ts` 已对接所有端点 |
| `.github/workflows/release.yml` | 修改 | 上传目标从 `dist/src/web/views/*.html` 改为 `dist/web/` |
| `.github/workflows/ci.yml` | 修改 | 需增加 web 构建步骤 |
| `package.json` (根) | 修改 | `build` 脚本需集成 web 构建, 版本号注入方式变更 |
| `AGENTS.md` | 修改 | 更新 Web 面板路由表格和发布流程描述 |

---

## 十一、审查结论

该架构方案在**技术选型**和**组件设计**方向上是正确的 —— React 18 + Vite 5 + Ant Design 5 + react-router-dom v6 是成熟的 SPA 技术栈, Layout + 懒加载页面的组件树模式也符合 Dashboard 类应用的最佳实践。

但架构存在**三个阻塞性缺陷**, 必须在实现开始前解决:

1. **构建流水线不完整**: 根 build 流程不产出 SPA 产物, CI 无法验证前端构建
2. **SPA fallback 未定义**: 服务端路由逻辑需要从 "多页面独立 HTML" 模式完全重写为 "单入口 index.html + 静态资源 + API 代理" 模式
3. **数据推送方案冗余**: 已有 SSE 却不用, 5 秒轮询增加不必要的服务器负载和数据延迟

这三个问题都不是实现细节 —— 它们影响部署可行性、用户体验和后端负载。建议在 TASK-001 启动前, 由 planner 确认并更新 Exec Packet 中的对应任务描述。

---

> 审查完成。本报告不包含代码修改建议, 仅指出架构层面的风险和改进方向。具体实现由 worker agent 在各自任务中按需处理。
