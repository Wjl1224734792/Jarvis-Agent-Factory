# 前端架构评审报告 -- G6 流程可视化 + Token 仪表盘

**日期**: 2026-05-11 | **评审者**: 前端架构师 | **评审范围**: TASK-004 + TASK-005

**源需求**: REQ-051, REQ-055, REQ-056, REQ-061
**任务文档**: TASK-004（G6 流程可视化）, TASK-005（Token 仪表盘）

---

## 一、执行确认

```
## Execution Acknowledgement
- 我本次设计的前端架构域：G6 流程可视化组件 + Token 仪表盘组件 + Dashboard 页面重构
- 对应需求 ID / 任务 ID：REQ-051/055/056/061（TASK-004, TASK-005）
- 候选技术栈 / 方案：@antv/g6 v5 + dagre 布局、antd useToken / getComputedStyle 主题同步、统一轮询 hook vs 独立轮询
- 我不会修改：后端引擎代码、数据库 Schema、MCP 工具、Plugin/Hook 配置
- 我预计输出的文件 / 路径：docs/2026-05-11/architecture/frontend-review-G6-token.md
- 我会编写的原型范围：无原型（纯架构评审）
- 若发现架构冲突，我将回退给编排者：已发现主题架构冲突（见第三节）
```

---

## 二、现状分析

### 2.1 现有技术栈（实际版本）

| 依赖 | 版本 | 备注 |
|------|------|------|
| React | **19.2.6**（非任务文档所述的 18） | 任务文档中"React 18 + antd 5"描述有误 |
| antd | **6.3.7**（非任务文档所述的 5） | antd v6 使用了部分废弃 API 的迁移（见 commit 7064950） |
| react-router-dom | 6.26.0 | 客户端路由 |
| Vite | 8.0.11 | 构建工具 |
| TypeScript | 5.8.0 | 严格模式开启 |

### 2.2 当前架构特征

1. **主题架构**：当前使用**硬编码纯亮色主题**（`theme.tsx` 中仅定义 `defaultTheme`，无暗色切换）。最近 3 个 commit 的历史显示主题切换功能已被主动移除：
   - `7953c45`: "恢复 antd 默认风格，移除所有主题切换"
   - `55ce8f2`: "简化主题为纯 light/dark，移除玻璃态和 antd-style"
   - `c1a45dd`: "重写 theme.tsx 为完整玻璃态主题 + 暗色纯 antd dark"

2. **样式方案**：100% 内联样式（`style={{}}`），通过 CSS 变量 `var(--ant-color-*)` 引用 antd token。**无任何 `.css` 文件**。

3. **数据刷新**：Dashboard 页面已有 8 秒轮询（`setInterval(loadData, 8000)`），Layout.tsx 另有 8 秒 MCP 状态轮询。

4. **代码分割**：Dashboard 使用 `React.lazy()` 懒加载。

5. **组件粒度**：Dashboard.tsx 为单文件 ~476 行，无子组件拆分。

---

## 三、架构级发现（Architecture Findings）

### AF-1：主题架构冲突（严重度：高）

**发现**：REQ-061 要求"监听 `prefers-color-scheme` 变化，自动切换 G6 主题"，但项目在 commit `7953c45` 中**明确移除了主题切换功能**。当前 `theme.tsx` 仅提供硬编码的亮色主题。

**分析**：
- 若仅 G6 Canvas 支持暗色而其他 antd 组件保持亮色，将产生视觉不一致——G6 暗色背景下的节点和文字无法与周围的 antd Card 组件协调
- 若需为 G6 重新引入暗色模式，则需一并恢复 antd 的主题切换（改动范围远超 TASK-004）
- `getComputedStyle` 读取的 CSS 变量 `--ant-color-bg-container` 等由 antd 的 `ConfigProvider` 动态注入，不切换 `ConfigProvider` 主题时这些变量值始终为亮色值

**裁决**：**阻塞性**。需与编排者确认：
  - 方案 A：接受 G6 仅支持亮色模式（降级 REQ-061）
  - 方案 B：恢复 antd 主题切换功能并同步 G6（超范围，需 plan patch）
  - 方案 C：G6 独立暗色——仅在 `prefers-color-scheme: dark` 时 Canvas 切换暗色，其他组件不变（视觉不一致但功能可用）

---

### AF-2：多轮询源性能风险（严重度：中）

**发现**：实现后 Dashboard 页面将存在 **4 个独立的 8 秒轮询定时器**：

| 轮询源 | 位置 | 频率 | 端点 |
|--------|------|------|------|
| 现有 | Dashboard.tsx line 167 | 8s | `api.pipeline()` + `api.pipelineRuns()` |
| 现有 | Layout.tsx line 237 | 8s | `api.status()` |
| 新增 | G6FlowChart.tsx | 8s | `GET /api/agent-status` |
| 新增 | TokenDashboard.tsx | 8s | `GET /api/agent-usage` |

**分析**：
- 4 个定时器不同步触发，实际请求频率为 ~2 次/秒（4 req / 8s），对 `localhost:3456` 后端影响可接受
- 真正的问题是：每个子组件独立管理自己的 `useEffect` + `setInterval`，卸载/重挂载时可能出现**僵尸轮询**（组件卸载但定时器未清理）
- TokenDashboard 和 G6FlowChart 的数据来源于**同一 `run_id`**，独立轮询导致数据不一致窗口（两个组件可能展示不同时刻的快照）

**建议**：将 agent 数据轮询提升到 Dashboard 层级或创建共享 `usePolling` hook，统一管理 `agent-status` + `agent-usage` 两个端点，通过单一数据源向下分发。

---

### AF-3：G6 与 React 生命周期协调风险（严重度：中）

**发现**：G6 v5 使用 `new Graph({ container: domElement, ... })` 创建 Canvas 实例，而 React 使用声明式虚拟 DOM。

**具体风险点**：

1. **React.StrictMode 双重挂载**（`main.tsx` line 8 已启用）：
   - 开发模式下 React 会 mount → unmount → mount 组件两次
   - 若 `useEffect` 中 `new Graph()` 而 cleanup 中 `graph.destroy()`，Canvas 将被创建-销毁-再创建
   - G6 v5 的 `destroy()` 是否完全清理内部状态（包括事件监听器、动画帧、WebGL 上下文）需要验证

2. **ResizeObserver 竞争**：
   - G6 内部通常使用 `ResizeObserver` 自动适应容器变化
   - Dashboard 中布局变化（侧边栏折叠/展开、G6 区域与 TokenDashboard 之间的空间竞争）会触发多次 resize
   - 频繁 resize → 频繁 `graph.render()` → Canvas 重绘 → 性能抖动

3. **组件卸载时序**：
   - `useEffect` cleanup 函数在组件卸载时运行，但 G6 的 `destroy()` 是异步的吗？如果 cleanup 返回了但 Canvas 仍在清理中，可能出现内存泄漏

**建议**：
- 在 `useEffect` cleanup 中显式调用 `graph.destroy()` 并置空 ref
- 对 resize 做防抖处理（300ms debounce）
- 使用 `useRef` 存储 graph 实例，使用单独的 `useEffect` 处理数据更新（`graph.updateData()` / `graph.setData()`）而非每次数据变化都销毁重建

---

### AF-4：CSS 变量读取时机（严重度：低-中）

**发现**：REQ-061 要求通过 `getComputedStyle(document.documentElement)` 读取 antd CSS 变量配置 G6 主题。

**分析**：
- 当前项目通过 antd `ConfigProvider` 注入主题，CSS 变量在组件挂载后才注入到 `document.documentElement`
- G6 组件的 `useEffect`（`[]` 依赖）执行时 antd CSS 变量可能尚未就绪
- `getComputedStyle` 读取的值是**字符串**（如 `"#1677ff"`），G6 的 `color` / `fill` 配置接受字符串，类型兼容
- 但 G6 的某些配置（如 `labelCfg.style.fill`）可能需要与节点状态关联，静态读取的 CSS 变量无法表达"当前运行中为蓝色、已完成绿色、失败红色"的动态语义

**建议**：
- 优先使用 antd 的 `theme.useToken()` hook（react 层直接获取 token 对象，类型安全且无需 DOM 查询）
- 当前 `theme.useToken()` 在 antd v6 中返回 `Token` 对象，无需 `getComputedStyle`
- 如果 REQ-061 坚持 `getComputedStyle` 方案（考虑未来扩展性），需确保在 `useEffect` + `requestAnimationFrame` 或 `queueMicrotask` 后再读取，确保 antd 已注入 CSS 变量

---

### AF-5：Dashboard.tsx 共享文件修改冲突（严重度：中）

**发现**：TASK-004 和 TASK-005 都需要修改 `Dashboard.tsx`。任务文档明确 TASK-004（G6）先执行，TASK-005（Token）在其基础上叠加。

**分析**：
- 当前 `Dashboard.tsx` 为单文件 476 行，没有子组件拆分
- TASK-004 新增 ~50 行（嵌入 G6FlowChart），TASK-005 新增 ~50 行（嵌入 TokenDashboard）
- 两个任务修改的是**同一文件的相邻区域**（页面布局），合并冲突概率高
- 如果 Dashboard.tsx 在 TASK-004 交付后有独立变更（如其他修复），TASK-005 的 base 将失效

**建议**：
- 将 G6 区域和 Token 区域预先拆分为独立的布局插槽：
  - `Dashboard.tsx` 提供 `<DashboardG6Slot />` 和 `<DashboardTokenSlot />` 两个 extension point
  - 或者：两个任务合并为一个大任务（Batch 3 合二为一），由同一 Agent 一次完成 Dashboard.tsx 的完整改造
  - 或者：TASK-004 在 Dashboard.tsx 中仅添加 `{enableG6 && <G6FlowChart />}` 条件渲染占位，TASK-005 仅添加 `{enableToken && <TokenDashboard />}`，减少相互干扰

---

### AF-6：包体积影响（严重度：低）

**发现**：新增 `@antv/g6@^5.0` + `@antv/layout`（dagre 布局已模块化分离）。

**包体积估算**（以 v5.0.x 参考，未压缩/minified）：

| 依赖 | 预估大小（min） | 预估大小（gzip） |
|------|----------------|-----------------|
| @antv/g6 core | ~180 KB | ~55 KB |
| @antv/layout (dagre) | ~40 KB | ~12 KB |
| 合计 | ~220 KB | ~67 KB |

**分析**：
- Dashboard 已通过 `React.lazy()` 懒加载，G6FlowChart 和 TokenDashboard 也将在 Dashboard chunk 内按需加载
- Vite 的 tree-shaking 对 ESM 格式的 `@antv/g6` 有效——如果代码中仅使用 `Graph`、`register`、`Rect` 等 API，未引用的布局算法和图形类型会被移除
- 当前 web chunk 基线：antd + react 约 120KB gzip，新增 G6 后 Dashboard chunk 预计增至 ~190KB gzip，仍在可接受范围
- `@antv/layout` 的 dagre 导入需要确认引用路径，避免引入全量 layout 算法（如 force、circular 等）

**建议**：
- 安装后运行 `vite build --debug` 确认实际 bundle 增量
- 使用 `import { Graph } from '@antv/g6'` 具名导入而非 `import G6 from '@antv/g6'` 默认导入
- 确认 `@antv/layout` 支持按需导入 dagre：`import { DagreLayout } from '@antv/layout'`

---

### AF-7：缺少无障碍（a11y）考量（严重度：低-中）

**发现**：Canvas 渲染的内容对屏幕阅读器完全不可见。10 个 Gate 节点、Agent 运行状态、动画效果——这些信息对视觉障碍用户是"黑盒"。

**分析**：
- G6 v5 没有内建 ARIA 支持（Canvas 天然缺乏语义结构）
- 任务文档和需求文档均未提及无障碍要求
- 但 REQ-056 的 Tooltip 交互（悬停展示信息）依赖纯鼠标操作，无键盘替代方案

**建议**：
- 在 G6FlowChart 容器外提供隐藏的语义列表（`aria-live="polite"` 区域），用结构化 HTML 描述当前 Gate 状态
- 为 G6 Canvas 容器添加 `role="img"` + `aria-label` 描述图表内容
- 键盘缩放：响应 `Ctrl+/Ctrl-` 快捷键调整 G6 zoom

---

## 四、技术选型评审

### 4.1 G6 v5 决策矩阵

| 维度 | @antv/g6 v5 | @xyflow/react (React Flow) | 纯 SVG/D3 手写 |
|------|-------------|---------------------------|---------------|
| Canvas 渲染性能 | 5/5 (Canvas) | 3/5 (DOM/SVG) | 2/5 (SVG) |
| React 集成度 | 2/5 (命令式 API) | 5/5 (React 原生组件) | 3/5 (依赖 d3-react) |
| 布局算法 | 5/5 (dagre 内建) | 4/5 (dagre 插件) | 2/5 (需自行实现) |
| 动画生态 | 4/5 (内建动画) | 3/5 (CSS transitions) | 2/5 (需手写) |
| Bundle 大小 | 3/5 (~180KB) | 4/5 (~120KB) | 5/5 (~30KB) |
| 主题定制 | 3/5 (CSS-in-JS) | 4/5 (CSS 变量原生) | 5/5 (完全控制) |
| 学习成本 | 3/5 | 4/5 | 1/5 (高) |
| 社区活跃度 | 4/5 | 5/5 | 3/5 |

**结论**：G6 v5 在 Canvas 渲染性能和 dagre 布局方面有优势，适合 10 节点中等规模的流程可视化场景。但 React 集成度低（命令式 API）是主要风险点，需要仔细管理生命周期。

### 4.2 主题同步方案决策矩阵

| 维度 | getComputedStyle（需求方案） | theme.useToken()（建议方案） |
|------|---------------------------|---------------------------|
| 类型安全 | 2/5（字符串返回值，需手动解析） | 5/5（Token 类型定义完整） |
| 与 antd 一致性 | 4/5（读取 antd 注入的变量） | 5/5（antd 官方 hook） |
| 暗色切换响应 | 3/5（需监听 prefers-color-scheme） | 5/5（ConfigProvider 变化自动触发重渲染） |
| 运行时开销 | 3/5（DOM API 调用） | 4/5（React context 读取） |
| 未来扩展性 | 3/5（CSS 变量可跨框架使用） | 4/5（仅 react+antd 场景） |

**结论**：建议使用 `theme.useToken()`，理由：类型安全、自动响应主题变化、无需 DOM 查询。如果未来有非 React 场景（如 Web Worker 中渲染），可回退到 `getComputedStyle`。

---

## 五、响应式设计评审

### 5.1 断点设计

需求定义三档断点：

| 设备 | G6 高度 | 分析 |
|------|---------|------|
| 桌面（>= 992px） | 400px | 合理，10 节点 dagre 布局在 400px 高度下可完整展示 |
| 平板（768-991px） | 300px | 可行，但 dagre 布局可能拥挤（节点间距缩小） |
| 手机（< 768px） | 250px | 250px 高度对于 10 个节点的 dagre 分层布局可能不够，节点会非常紧凑 |

**问题**：
- 当前 Dashboard.tsx 使用 antd 的 `xs/sm/md/lg` Col 断点（576/768/992/1200），未定义自定义断点
- 响应式高度调整需要 JavaScript 监听窗口尺寸变化（`window.matchMedia` 或 `useResizeObserver`），而不仅是 CSS media query
- G6 的 `fitView: true` + `fitViewPadding: 20` 在极端高度不足时会缩小节点至不可读

**建议**：
- 将响应式断点与 antd Grid 断点对齐：使用 md (>=768px) / lg (>=992px) 作为分界
- 在 250px 手机上考虑横向布局（LR 而非 TB）作为替代，或接受节点缩小但确保文字仍有 11px 最小字号

---

## 六、代码架构建议

### 6.1 Dashboard 重构建议

当前 Dashboard.tsx（476 行）混合了数据获取、状态管理、UI 渲染、样式定义。建议在 TASK-004 中按职责拆分：

```
web/src/pages/Dashboard.tsx        # 页面容器（数据获取 + 布局编排，~100 行）
web/src/components/Dashboard/
  ├── DashboardStats.tsx           # 统计卡片行（当前 lines 261-287）
  ├── GateTimeline.tsx             # Gate 进度条 + Timeline（当前 lines 291-368）
  ├── RunHistory.tsx               # 历史 Runs 列表（当前 lines 370-413）
  └── MarkdownDrawer.tsx           # 文档抽屉（当前 lines 417-433）
```

G6FlowChart 和 TokenDashboard 保持独立的顶级 components。

### 6.2 数据层建议

创建共享 polling hook 统一管理轮询：

```typescript
// web/src/hooks/useAgentData.ts（新建）
function useAgentData(runId: string | null, intervalMs: number = 8000) {
  // 统一管理 /api/agent-status 和 /api/agent-usage 轮询
  // 返回 { agentStatus, agentUsage, loading, error }
}
```

G6FlowChart 和 TokenDashboard 共享此 hook 的输出，避免各自独立轮询。

### 6.3 api.ts 扩展

按任务文档要求，`api.ts` 新增以下方法：

```typescript
agentStatus: (runId?: string) => fetchJSON(`/api/agent-status${runId ? `?run_id=${encodeURIComponent(runId)}` : ''}`),
agentUsage:  (runId?: string) => fetchJSON(`/api/agent-usage${runId ? `?run_id=${encodeURIComponent(runId)}` : ''}`),
agentEvents: (runId: string, agentId: string) =>
  fetchJSON(`/api/agent-events?run_id=${encodeURIComponent(runId)}&agent_id=${encodeURIComponent(agentId)}`),
```

需定义对应的 TypeScript 接口（`AgentStatusResponse`, `AgentUsageResponse`, `AgentEvent[]`）。

---

## 七、风险汇总与缓解措施

| 编号 | 风险 | 严重度 | 可能后果 | 缓解措施 |
|------|------|--------|---------|---------|
| R1 | 主题架构冲突 | **高** | G6 暗色实现与 antd 亮色不一致，或被迫恢复主题切换（超出 scope） | 在 TASK-004 启动前确认主题方向（方案 A/B/C） |
| R2 | 双重挂载导致 Canvas 泄漏 | **中** | React.StrictMode 开发环境 Canvas 异常，难以调试 | useEffect cleanup 中强制 `graph.destroy()`；使用 G6 专用的 `useStrictModeEffect` 包装 |
| R3 | 多轮询僵尸定时器 | **中** | 组件卸载后仍发送请求，内存泄漏 | 统一 polling hook，强类型 cleanup |
| R4 | Dashboard.tsx 修改冲突 | **中** | TASK-004/005 代码合并冲突，延迟交付 | 合并为一个 Batch 或预拆分布局插槽 |
| R5 | @antv/layout 额外依赖 | **低** | 任务文档已指出但 package.json 未体现 | 安装 @antv/g6 时确认 dagre 是否需要额外安装 @antv/layout |
| R6 | G6 v5 API 不稳定 | **低** | API 变更导致后续升级困难 | 锁定具体版本（`5.0.x` 而非 `^5.0`） |

---

## 八、ADR 记录

### ADR-0001：选择 @antv/g6 v5 作为流程可视化库

**状态 (Status)**: Proposed

**日期 (Date)**: 2026-05-11

**决策者 (Deciders)**: 前端架构师（评审）

#### 上下文 (Context)

Dashboard 页面需要展示 10-Gate 流程可视化，包含实时 Agent 状态更新、动画效果、节点交互。候选方案有 @antv/g6 v5、React Flow、纯 SVG/D3 手写。

#### 决策 (Decision)

接受 @antv/g6 v5 作为流程可视化方案，条件如下：
- 锁定版本 `5.0.x`（不自动升级 minor/patch）
- 在 `useEffect` cleanup 中严格管理 Canvas 生命周期（`graph.destroy()`）
- 主题配置通过 antd `theme.useToken()` hook 获取 token，非 `getComputedStyle`

#### 后果 (Consequences)

- **正面**：高性能 Canvas 渲染，内建 dagre 布局和动画，适合 10 节点规模
- **负面**：React 集成需仔细管理生命周期（命令式 API），bundle 增加约 67KB gzip
- **缓解**：Dashboard 已懒加载，生命周期管理文档化

#### 考虑的替代方案 (Alternatives Considered)

- **React Flow**: React 集成更好但 SVG/DOM 渲染 10+ 节点时性能不如 Canvas，且无内建 dagre 布局
- **纯 SVG/D3**：体积小但需自行实现布局和交互，开发成本高
- **弃用理由**：G6 v5 在本次需求的核心竞争力（Canvas 性能 + dagre 布局 + 动画）上综合最优

---

### ADR-0002：统一数据轮询层

**状态 (Status)**: Proposed

**日期 (Date)**: 2026-05-11

**决策者 (Deciders)**: 前端架构师（评审）

#### 上下文 (Context)

G6FlowChart 和 TokenDashboard 两个组件都需要轮询 `agent-status` 和 `agent-usage` 端点，频率均为 8 秒。如果各自独立轮询，存在数据不一致窗口和僵尸定时器风险。

#### 决策 (Decision)

创建共享 `useAgentData` hook（`web/src/hooks/useAgentData.ts`），统一管理 agent 数据轮询。Dashboard 层调用此 hook，通过 props 向 G6FlowChart 和 TokenDashboard 分发数据。

#### 后果 (Consequences)

- **正面**：单一定时器，数据一致，组件逻辑更纯粹（纯展示）
- **负面**：Dashboard 将持有更多状态，Hooks 规则约束（不能在条件分支中调用）需注意
- **缓解**：`useAgentData` 接受 `runId: string | null`，`null` 时不发起请求，自动跳过

#### 考虑的替代方案 (Alternatives Considered)

- **各自独立轮询**：简单但数据不一致、僵尸定时器风险高
- **SSE 推送替代轮询**：需求文档提及 SSE 扩展（REQ-058），但目前 SSE 仅在 Layout 层使用，扩展需要后端配合，暂不采用
- **弃用理由**：独立轮询方案简单但风险较高，SSE 方案需要跨层协调

---

## 九、执行建议

### 9.1 前置确认（阻塞项）

在 TASK-004 开始前，**必须**获得以下确认：

1. **[AF-1] 主题方案**：选择方案 A（降级）/ B（恢复切换）/ C（独立暗色）？**此决定影响 G6FlowChart 的 `useEffect` 依赖设计和颜色常量定义。**

2. **[AF-7] 无障碍接受标准**：是否接受 Canvas 无原生 a11y 支持？是否需要提供隐藏语义层？

### 9.2 TASK-004/005 合并建议

鉴于 Dashboard.tsx 是共享文件且两个任务修改相邻区域，建议将 TASK-004 和 TASK-005 作为一个 Batch 由同一前端 Agent 顺序完成（非并行），减少合并冲突和上下文切换。

### 9.3 验证重点

TASK-004 完成后，架构层面需验证：

- [ ] G6FlowChart 在 React.StrictMode 开发模式下无 Canvas 泄漏（Chrome DevTools → Performance → Memory 检查）
- [ ] 组件卸载后 8 秒内无来自已卸载组件的网络请求（Network 面板验证）
- [ ] `vite build` 后 Dashboard chunk 增量不超过 +80KB gzip
- [ ] G6 节点在侧边栏折叠/展开时正确 resize（无重叠、无空白）
- [ ] 10 个 Gate 节点在 400px/300px/250px 三档高度下均可完整展示且文字可读

---

## 十、评审结论

| 维度 | 结论 |
|------|------|
| 技术栈选择 | 通过（G6 v5 适合此场景，需锁定版本） |
| React 生命周期协调 | 条件通过（需严格实现 cleanup + 防抖 resize） |
| 主题同步 | **阻塞**（需确认主题方向，见 AF-1） |
| 轮询架构 | 条件通过（建议统一为单一 hook） |
| 包体积影响 | 通过（Dashboard 已懒加载，增量可接受） |
| 响应式设计 | 条件通过（250px 移动端需验证文字可读性） |
| 无障碍 | 条件通过（需补充隐藏语义层） |
| 共享文件冲突风险 | 条件通过（建议 TASK-004/005 合并执行） |

**总体评级**：**条件通过（Conditional Pass）** -- 3 个条件需在 TASK-004 开始前满足，1 项阻塞需编排者决策。
