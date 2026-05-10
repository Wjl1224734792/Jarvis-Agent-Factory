# 任务文档 -- antV G6 可视化 + Claude Code Plugin/Hook/MCP + Token 追踪

> 日期：2026-05-11 | 源需求：[REQ-G6-visualization-hooks-token.md](../requirements/REQ-G6-visualization-hooks-token.md)

---

## 一、任务概览

| TASK | 映射 REQ | 名称 | 类型 | 优先级 | 粒度 | 预估行数 |
|------|----------|------|------|--------|------|----------|
| TASK-001 | REQ-054, REQ-057 | 引擎核心 -- Agent 事件追踪基础设施 | DDD + TDD | P0 | M | ~250 |
| TASK-002 | REQ-058 | Web API 扩展 -- Agent 数据查询端点 | TDD | P1 | M | ~120 |
| TASK-003 | REQ-052, REQ-053, REQ-059, REQ-060 | Plugin + Hook 体系 -- 配置与脚本 | 直接开发 | P1 | M | ~150 |
| TASK-004 | REQ-051, REQ-056, REQ-061 | G6 流程可视化 -- 10-Gate 实时状态图 | 直接开发 | P1 | L | ~380 |
| TASK-005 | REQ-055 | Token 仪表盘 -- 实时消耗统计面板 | 直接开发 | P1 | M | ~220 |
| TASK-006 | REQ-062 | 命令模板优化 -- Agent 名称与路由同步 | 直接开发 | P2 | S | ~80 |

> 总计 6 个任务，覆盖 12 个 REQ，预估变更 ~1200 行，单轮次交付。

---

## 二、依赖关系与并行组

### 2.1 依赖图

```
TASK-001 (DB Schema + MCP 工具) ────┬────> TASK-002 (REST API 扩展)
  [P0, 基础]                         │        [P1, 数据管线]
                                     │          │
                                     │          ├────> TASK-004 (G6 可视化)
                                     │          │        [P1, 前端渲染]
                                     │          │
                                     │          └────> TASK-005 (Token 仪表盘)
                                     │                   [P1, 前端渲染]
                                     │
                                     └────> TASK-003 (Plugin + Hook 体系)
                                              [P1, LLM 端配置]
```

```
TASK-006 (命令模板优化) ─── 独立任务，与前 5 个无共享文件，可全时段并行
  [P2, 文档修复]
```

### 2.2 推荐执行批

| 批次 | 任务 | 并行？ | 理由 |
|------|------|--------|------|
| Batch 1 | TASK-001 | 独占 | 基础设施，所有后续任务依赖它；与 TASK-006 无共享文件，可并行 |
| Batch 1 | TASK-006 | 并行 | 独立文件集，不阻塞也不被阻塞 |
| Batch 2 | TASK-002 + TASK-003 | 并行 | TASK-002 依赖 TASK-001 的 DB；TASK-003 依赖 TASK-001 的 MCP 工具；两者无共享文件 |
| Batch 3 | TASK-004 | 先执行 | 依赖 TASK-002 的 API；TASK-004 负责 Dashboard.tsx + api.ts 主变更 |
| Batch 4 | TASK-005 | 后执行 | 依赖 TASK-002 的 API + TASK-004 的 Dashboard 布局 + api.ts 方法 |

> 最优路径：TASK-001 + TASK-006 并行启动（Batch 1），TASK-002 + TASK-003 并行（Batch 2），TASK-004（Batch 3），TASK-005（Batch 4）。4 个串行批次即可完成。

### 2.3 关键依赖说明

- **TASK-001 是硬阻塞**：没有 `agent_events` 表和 `agent_event` MCP 工具，TASK-002（API 查询）和 TASK-003（Hook 调用 MCP）均无法工作。
- **TASK-004 先于 TASK-005**：两者都修改 `Dashboard.tsx` 和 `api.ts`。TASK-004 作为这两文件的"主写者"，TASK-005 在其变更基础上叠加。
- **TASK-006 完全解耦**：16 个命令模板与引擎/前端均无共享文件，可在任何时间执行。

---

## 三、共享区域文件所有权与串行约束

以下文件存在跨任务修改，必须严格按顺序执行：

| 文件 | 修改任务（按顺序） | 所有权说明 |
|------|-------------------|-----------|
| `src/engine/db.ts` | TASK-001（schema + 查询函数） | TASK-001 独占写入；TASK-002 只读调用 |
| `src/engine/server.ts` | TASK-001（3 个新 MCP 工具） | TASK-001 独占写入 |
| `src/web/routes.ts` | TASK-002（3 个新 REST 端点 + SSE 扩展） | TASK-002 独占写入 |
| `web/src/api.ts` | TASK-004（新增 agent API 客户端方法）→ TASK-005（复用） | TASK-004 主写，TASK-005 只读 |
| `web/src/pages/Dashboard.tsx` | TASK-004（G6 组件嵌入 + 页面布局改造）→ TASK-005（TokenDashboard 嵌入） | TASK-004 主写，TASK-005 在其基础上叠加 |
| `web/package.json` | TASK-004（添加 `@antv/g6` 依赖） | TASK-004 独占写入 |

> **红线**：`Dashboard.tsx` 是唯一跨任务共享的前端文件。TASK-004 必须先于 TASK-005 执行；TASK-005 基于 TASK-004 的版本叠加变更。两个任务不可并行。

---

## 四、任务详细分解

---

### TASK-001：引擎核心 -- Agent 事件追踪基础设施

- **任务 ID**：TASK-001
- **关联需求**：REQ-054（Token 使用追踪系统 -- 数据库层 + MCP 工具）、REQ-057（引擎 MCP 工具扩展 -- agent_event/agent_usage/agent_status）
- **类型**：DDD（数据库 Schema 设计 + 聚合边界）+ TDD（3 个 MCP 工具的核心逻辑）
- **优先级**：P0
- **预估变更行数**：~250 行（M）
- **风险等级**：中 —— 涉及共享 DB Schema 变更 + 3 个 MCP 工具，所有后续任务依赖此项
- **依赖**：无
- **被依赖**：TASK-002, TASK-003

#### 完成标准

1. `agent_events` 表已创建，包含 `total_tokens` 生成列和 `idx_agent_events_run` 索引
2. `agent_event` MCP 工具可接收 start/end/error 事件，写入 DB 并返回累计统计
3. `agent_usage` MCP 工具可按 `run_id` 查询，返回按 `agent_id` 分组的 token 统计 + 总计
4. `agent_status` MCP 工具可按 `run_id` 查询，返回 active/completed/failed Agent 列表
5. 成本估算：Anthropic 模型按单价计算，DeepSeek 模型标记 "N/A -- 非 Anthropic 模型"
6. `agent_event` 对 `end`/`error` 事件计算 `duration_ms`（从对应 `start` 事件到当前的时间差）
7. 所有 MCP 工具参数使用 Zod 校验，`run_id` 可选默认取当前活跃 run
8. 新增 DB 查询辅助函数：`insertAgentEvent()`, `getAgentEvents()`, `getAgentUsage()`, `getAgentStatus()`

#### 文件所有权

| 文件 | 操作 | 预估行数 | 说明 |
|------|------|---------|------|
| `src/engine/db.ts` | 修改 | ~70 | `initSchema()` 中新增 `agent_events` 表；新增 4 个查询/写入函数 |
| `src/engine/server.ts` | 修改 | ~180 | `registerMcpTools()` 中新增 3 个 MCP 工具 + 模型单价常量 |

#### 模型单价硬编码表（需在 server.ts 中定义）

```typescript
const MODEL_PRICES: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00, cacheWrite: 3.75, cacheRead: 0.30 },
  'claude-opus-4-20250514':  { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50 },
  'claude-haiku-4-20250514': { input: 1.00, output: 5.00, cacheWrite: 1.25, cacheRead: 0.10 },
};
```

#### DDD 设计说明

- **聚合根**：`AgentEvent`（一条 event 记录即一个完整生命周期事件）
- **值对象**：`TokenUsage`（input_tokens, output_tokens, cache tokens 为不可变组合）
- **领域服务**：`agent_event` 工具执行 **end 事件时的业务规则**：
  - 查找同 `agent_id` + `run_id` 的最近 `start` 事件，计算 `duration_ms`
  - 累加当前 run 的所有 token，计算总成本
  - DeepSeek 模型：仅累加 token，成本固定 "N/A"

#### 测试策略

- **TDD**：先写测试验证以下场景
  1. `agent_event` start → DB 中 event_type='start', status=null, tokens 全为 0
  2. `agent_event` end → 自动计算 duration_ms，tokens 正确存储
  3. `agent_event` error → status='error', error_message 写入
  4. `agent_usage` 按 agent_id 分组统计正确
  5. `agent_status` active/completed/failed 分类正确
  6. 成本估算：Claude 模型返回 USD，DeepSeek 返回 "N/A"
- 测试文件：`src/engine/__tests__/agent-events.test.ts`（新建）

---

### TASK-002：Web API 扩展 -- Agent 数据查询端点

- **任务 ID**：TASK-002
- **关联需求**：REQ-058（Web REST API 扩展）
- **类型**：TDD（3 个新 REST 端点 + SSE 扩展均为数据处理逻辑）
- **优先级**：P1
- **预估变更行数**：~120 行（M）
- **风险等级**：中 —— 涉及 SSE 广播扩展，可能影响现有会话轮询性能
- **依赖**：TASK-001（需要 `agent_events` 表和 DB 查询函数就绪）
- **被依赖**：TASK-004, TASK-005

#### 完成标准

1. `GET /api/agent-usage?run_id=xxx` 返回与 `agent_usage` MCP 工具相同结构的数据
2. `GET /api/agent-status?run_id=xxx` 返回 active/completed/failed 三组 Agent 列表
3. `GET /api/agent-events?run_id=xxx&agent_id=xxx` 返回单个 Agent 的完整事件历史（按时间排序）
4. SSE `broadcastSSE()` 扩展：每个会话数据中附加 `agent_status` 字段（活跃/最近完成 Agent 列表）
5. `run_id` 参数可选，不传时自动使用当前 session 的活跃 run
6. 空数据返回合理默认值（空数组、0 token），不报错

#### 文件所有权

| 文件 | 操作 | 预估行数 | 说明 |
|------|------|---------|------|
| `src/web/routes.ts` | 修改 | ~100 | 新增 3 个 REST 端点；扩展 `broadcastSSE()` 数据负载 |
| `src/web/routes.ts`（import） | 修改 | ~5 | 新增从 `db.js` 导入 `getAgentEvents`, `getAgentUsage`, `getAgentStatus`（若 TASK-001 已导出） |

> 注意：若 TASK-001 未导出上述 DB 辅助函数，需先补充导出。

#### 测试策略

- **TDD**：先写测试验证以下场景
  1. `GET /api/agent-usage?run_id=valid` 返回正确的 JSON 结构（agents + totals）
  2. `GET /api/agent-status?run_id=valid` 正确分类 active/completed/failed
  3. `GET /api/agent-events?run_id=valid&agent_id=xxx` 按时间排序
  4. SSE 广播数据包含 `agent_status` 字段
  5. 不存在的 `run_id` 返回空数组而非错误
- 测试文件：`src/web/__tests__/agent-api.test.ts`（新建）

---

### TASK-003：Plugin + Hook 体系 -- 配置与脚本

- **任务 ID**：TASK-003
- **关联需求**：REQ-052（Claude Code Plugin 体系创建）、REQ-053（SubagentStart/SubagentEnd Hooks 集成）、REQ-059（Hooks 脚本实现）、REQ-060（Plugin + Hook + MCP 一体化配置）
- **类型**：直接开发（纯配置文件 + Shell/PowerShell 脚本）
- **优先级**：P1
- **预估变更行数**：~150 行（M）
- **风险等级**：中 —— Claude Code hooks 中 `mcp_tool` 类型可能不被支持，需备选方案
- **依赖**：TASK-001（需要 `agent_event` MCP 工具已注册并可用）
- **被依赖**：无（终端用户使用，非代码级依赖）

#### 完成标准

1. `.claude/plugins/jarvis-visualization/` 目录创建完整，结构如下：
   ```
   .claude/plugins/jarvis-visualization/
   ├── plugin.json          # 插件清单
   ├── hooks/
   │   └── hooks.json       # SubagentStart + SubagentEnd hook 配置
   └── hooks/scripts/
       ├── agent-event.sh   # Linux/macOS 脚本
       └── agent-event.ps1  # Windows PowerShell 脚本
   ```
2. `plugin.json` 包含 name/version/description/hooks 字段
3. `hooks.json` 配置 SubagentStart hook（调用 `agent_event` with event="start"）
4. `hooks.json` 配置 SubagentEnd hook（调用 `agent_event` with event="end"/"error" + token_usage）
5. 脚本从环境变量 `CLAUDE_HOOK_EVENT`, `CLAUDE_AGENT_ID` 等获取上下文
6. 脚本通过 HTTP POST 到 `http://localhost:3456/mcp` 调用 MCP 工具
7. `.claude-plugin/marketplace.json` 注册插件条目

#### 备选方案（风险缓解）

若 Claude Code hooks 不支持 `mcp_tool` 类型直接在 hooks.json 中调用 MCP（`/mcp` 端点需要 MCP 协议握手，普通 HTTP POST 可能不兼容）：
- **方案 A**：hooks.json 使用 `command` 类型 + 脚本调用新增的 REST API（`POST /api/agent-event`），而非 MCP
- **方案 B**：脚本内部直接操作 SQLite 数据库（绕过 MCP/API，最高效但侵入性强）
- **推荐**：优先方案 A（新增 REST 端点 `POST /api/agent-event` 在 TASK-002 中实现），脚本调用此端点

> 注意：若采用方案 A，需在 TASK-002 中追加 `POST /api/agent-event` REST 端点（约 +20 行）。在 TASK-003 实现前确认 MCP hook 可行性，再决定是否需要此端点。

#### 文件所有权

| 文件 | 操作 | 预估行数 | 说明 |
|------|------|---------|------|
| `.claude/plugins/jarvis-visualization/plugin.json` | 新建 | ~20 | 插件清单 |
| `.claude/plugins/jarvis-visualization/hooks/hooks.json` | 新建 | ~60 | SubagentStart + SubagentEnd 配置 |
| `.claude/plugins/jarvis-visualization/hooks/scripts/agent-event.sh` | 新建 | ~35 | Linux/macOS 脚本 |
| `.claude/plugins/jarvis-visualization/hooks/scripts/agent-event.ps1` | 新建 | ~30 | Windows PowerShell 脚本 |
| `.claude-plugin/marketplace.json` | 修改 | ~5 | 注册插件条目 |

---

### TASK-004：G6 流程可视化 -- 10-Gate 实时状态图

- **任务 ID**：TASK-004
- **关联需求**：REQ-051（antV G6 Agent 实时状态可视化）、REQ-056（Web 面板增强 -- G6 流程可视化）、REQ-061（G6 主题与 antd 无缝融合）
- **类型**：直接开发（纯前端 UI 组件，Canvas 渲染不涉及 TDD 要求的业务逻辑）
- **优先级**：P1
- **预估变更行数**：~380 行（L）
- **风险等级**：高 -- 预估 >200 行 + 第三方库集成（G6 v5 API 较新）+ Canvas 渲染性能调优
- **风险说明**：此任务为 L 级任务（接近 XL），但由于 G6 组件是一个完整的可视化单元（不可水平拆分为"画节点"和"画边"），保持为一个垂直切片。若后续发现需要拆分为"基础布局"和"动画/交互"两个子任务，可在实现中动态调整。
- **依赖**：TASK-002（需要 `/api/agent-status` REST 端点已就绪）
- **被依赖**：TASK-005（依赖 TASK-004 的 Dashboard 布局改动 + api.ts 扩展）

#### 完成标准

1. **组件创建**：`web/src/components/G6FlowChart.tsx` 可用，接收 props（gates, agentStatus, currentGate）
2. **安装依赖**：`@antv/g6@^5.0` 通过 `cd web && npm install @antv/g6` 安装
3. **布局渲染**：
   - 10 个 Gate 节点（A→B→B1→C→C-impl→C1→C1.5→C2→D→E）使用 dagre 布局（从上到下）
   - 每个 Gate 节点显示 Gate 简称 + 中文标签
   - 已通过的 Gate 为绿色 + 对勾图标
   - 当前 Gate 为蓝色 + 脉冲呼吸动画
   - 未到达 Gate 为灰色
4. **Agent 子状态**：
   - 在每个 Gate 节点内/旁显示该 Gate 下活跃 Agent（名称 + 旋转动画圆点）
   - 已完成的 Agent 显示名称 + 绿色对勾
   - 失败的 Agent 显示名称 + 红色叉号
5. **边样式**：已通过边为绿色实线，未通过边为灰色虚线
6. **交互**：
   - 点击 Gate 节点 → 展开该 Gate 的 Agent 详情
   - 悬停 Gate 节点 → Tooltip 显示 Gate 描述 + 产物列表
   - 滚轮缩放、拖拽平移
   - `fitView: true` + `fitViewPadding: 20`
7. **响应式**：容器 `width: 100%; height: 400px`（桌面）/ `300px`（平板）/ `250px`（移动）
8. **主题融合（REQ-061）**：
   - G6 节点/边颜色通过 `getComputedStyle(document.documentElement)` 读取 antd CSS 变量
   - 监听 `prefers-color-scheme` 变化自动重绘
   - 使用 CSS 变量：`--ant-color-bg-container`, `--ant-color-border`, `--ant-color-text`, `--ant-color-success`, `--ant-color-primary`, `--ant-color-error`
9. **数据轮询**：组件内部每 8 秒轮询 `/api/agent-status?run_id=xxx` 更新状态
10. **Dashboard 集成**：在 Dashboard.tsx 中现有的"Gate 进度"卡片区域上方或旁边嵌入 G6FlowChart

#### 文件所有权

| 文件 | 操作 | 预估行数 | 说明 |
|------|------|---------|------|
| `web/package.json` | 修改 | ~5 | 添加 `@antv/g6` 依赖 |
| `web/src/components/G6FlowChart.tsx` | 新建 | ~280 | G6 核心组件（布局 + 渲染 + 动画 + 交互 + 主题） |
| `web/src/pages/Dashboard.tsx` | 修改 | ~50 | 嵌入 G6FlowChart 组件 + 页面布局调整 |
| `web/src/api.ts` | 修改 | ~45 | 新增 `api.agentStatus()`, `api.agentUsage()`, `api.agentEvents()` |

#### 技术注意事项

- G6 v5 API 与 v4 不兼容：使用 `new Graph({ ... })` 创建实例（v5 API）
- dagre 布局需额外安装 `@antv/layout`（G6 v5 的布局已模块化分离）
- Canvas 渲染在深色模式下需重新设置背景色（`graph.setOptions()` 或销毁重建）
- Agent 状态数据从 `/api/agent-status` 获取，需要解析 `active` 数组并匹配到对应 Gate节点

---

### TASK-005：Token 仪表盘 -- 实时消耗统计面板

- **任务 ID**：TASK-005
- **关联需求**：REQ-055（Web 面板增强 -- Token 仪表盘）
- **类型**：直接开发（纯前端 UI 组件，展示统计数据）
- **优先级**：P1
- **预估变更行数**：~220 行（M-L）
- **风险等级**：中 -- 依赖 TASK-004 的 Dashboard 布局和 api.ts 扩展
- **依赖**：TASK-002（需要 `/api/agent-usage` REST 端点）、TASK-004（需要 TASK-004 完成后的 Dashboard.tsx 和 api.ts）
- **被依赖**：无

#### 完成标准

1. **组件创建**：`web/src/components/TokenDashboard.tsx` 可用，接收 props（runId, sessionId）
2. **实时 Token 计数**：当前 run 已消耗的总 token 数，数字滚动动画（从上次值过渡到新值）
3. **模型分布**：按模型分类的 token 消耗展示（使用 antd `Progress` 组件分段显示）
4. **Agent 排行**：Top 5 token 消耗 Agent 列表（使用 antd `Table` 或 `List`）
5. **成本估算**：总预估成本（仅 Anthropic 模型显示 USD，DeepSeek 显示 "N/A"）
6. **缓存命中率**：`cache_read / (cache_read + input) * 100%` 百分比展示
7. **数据刷新**：组件内部每 8 秒轮询 `/api/agent-usage?run_id=xxx`
8. **Dashboard 集成**：在 Dashboard.tsx 的统计卡片区域下方或 G6 图表旁边嵌入 TokenDashboard
9. **空状态处理**：无数据时显示 antd `Empty` 组件而非空白区域
10. **加载状态**：数据加载中显示 antd `Skeleton` 或 `Spin`

#### 文件所有权

| 文件 | 操作 | 预估行数 | 说明 |
|------|------|---------|------|
| `web/src/components/TokenDashboard.tsx` | 新建 | ~170 | Token 仪表盘组件 |
| `web/src/pages/Dashboard.tsx` | 修改 | ~50 | 嵌入 TokenDashboard 组件 + 向 G6FlowChart 和 TokenDashboard 传递 runId |

> **注意**：Dashboard.tsx 的修改依赖 TASK-004 完成后的版本。TASK-005 在 TASK-004 的布局基础上放置 TokenDashboard 组件。两个任务不修改同一代码块（TASK-004 改页面上半部分 + G6 区，TASK-005 改中下半部分 + Token 区），减少冲突。

---

### TASK-006：命令模板优化 -- Agent 名称与路由同步

- **任务 ID**：TASK-006
- **关联需求**：REQ-062（其他命令流程优化 -- 基于新流水线）
- **类型**：直接开发（文档/模板审核与修正）
- **优先级**：P2
- **预估变更行数**：~80 行（S）
- **风险等级**：低 -- 纯文本模板修正
- **依赖**：无（但需了解最新 Agent 清单，可参考 AGENTS.md 和 `agent-registry.ts`）
- **被依赖**：无

#### 完成标准

1. **审核范围**：16 个命令模板全部审核通过：`src/templates/platforms/claude/commands/*.md`
2. **Agent 名称检查**：
   - 所有引用 `docs-research-expert` 的替换为 `external-resource-expert`（若有）
   - 所有引用 `fix-retest` 的替换为 `remediation-expert`（若有）
   - 所有引用 `remediation-planner` 的替换为 `remediation-expert`（若有）
3. **browser-test.md 专项**：确认修复闭环中引用 `remediation-expert` 而非 `fix-retest`
4. **jarvis.md 专项**：确认 Agent 类型速查表中包含 `external-resource-expert`（已在当前第 161 行存在）和 `remediation-expert`
5. **路由表验证**：所有命令的 Agent 路由表中 `subagent_type` 值与 `.claude/agents/*.md` 文件名一致
6. **审核报告**：输出审核结果清单（哪些命令已正确 / 哪些需要修正 / 修正内容），写入任务日志

#### 文件所有权

| 文件 | 操作 | 预估行数 | 说明 |
|------|------|---------|------|
| `src/templates/platforms/claude/commands/*.md`（共 16 个） | 审核 + 按需修改 | ~80 | 以 jarvis.md, browser-test.md, review-fix.md 为重点 |

#### 审核清单（必须逐项确认）

| 检查项 | 目标文件 | 检查内容 |
|--------|---------|---------|
| external-resource-expert | jarvis.md, 各平台命令 | 是否已在 Agent 路由表中 |
| remediation-expert（替换 fix-retest） | browser-test.md, review-fix.md | 修复闭环引用是否正确 |
| remediation-expert（替换 remediation-planner） | review-fix.md | 是否引用了旧名称 |
| skill-assignment-expert | jarvis.md | 说明是否准确反映其职责 |
| subagent_type 一致性 | 全部 16 个命令 | 值与 Agent 文件名匹配 |

---

## 五、DDD 分类

| DDD 任务 | 聚合根 | 值对象 | 领域服务 | 说明 |
|----------|--------|--------|---------|------|
| TASK-001 | AgentEvent | TokenUsage | agent_event 的 end 事件处理（计算 duration_ms, 成本估算） | 核心业务规则：事件生命周期管理 + 成本计算 + 聚合统计 |

---

## 六、TDD 与直接开发分类

### TDD 任务（必须先写测试，Red -> Green -> Refactor）

| TASK | TDD 理由 |
|------|---------|
| TASK-001 | 核心 MCP 工具逻辑（agent_event 事件写入、agent_usage 统计聚合、agent_status 状态分类）需要 TDD 保障正确性；成本计算涉及资金敏感逻辑 |
| TASK-002 | REST API 端点涉及数据查询和 SSE 广播；查询逻辑需 TDD 验证正确性、边界条件和空数据场景 |

### 直接开发任务

| TASK | 直接开发理由 |
|------|-------------|
| TASK-003 | 纯配置文件 + 脚本，无业务逻辑 |
| TASK-004 | 前端 Canvas 渲染 UI 组件，无复杂业务规则；UI 快照测试不强制 |
| TASK-005 | 前端展示组件，数据来自 API；UI 展示逻辑可由人工验收 |
| TASK-006 | 文档模板审核修改，纯文本 |

---

## 七、风险任务标注

| TASK | 风险等级 | 风险原因 | 缓解措施 |
|------|---------|---------|---------|
| TASK-001 | 中 | DB Schema 变更影响所有现有查询；MCP 工具注册增加引擎启动时间 | 使用 `CREATE TABLE IF NOT EXISTS` 保证幂等；MCP 工具逻辑纯函数化便于测试 |
| TASK-002 | 中 | SSE 广播扩展可能增加推送数据量，影响轮询性能 | agent_status 数据按需精简（仅传概述）；保持 8 秒间隔不变 |
| TASK-003 | 中 | Claude Code hooks 中 `mcp_tool` 类型可能不被支持 | 备选方案：新增 REST 端点 `POST /api/agent-event`（TASK-002 中追加） |
| TASK-004 | **高** | L 级任务（~380 行）+ G6 v5 API 不稳定 + Canvas 主题切换复杂性 | 锁定 `@antv/g6@^5.0` 具体版本；主题切换采用销毁重建策略；先实现基础渲染再叠加动画 |
| TASK-005 | 中 | Dashboard.tsx 与 TASK-004 共享，需严格按顺序执行 | TASK-004 先完成布局框架，TASK-005 在其基础上叠加 Token 面板 |

---

## 八、推荐交付顺序（完整执行流程）

```
阶段 1（启动）：
  TASK-001 ── 引擎核心基础设施 ── 验证：MCP 工具可用
  TASK-006 ── 命令模板审核 ── 验证：所有 16 个模板引用正确

阶段 2（数据管线）：
  TASK-002 ── REST API 扩展 ── 验证：3 个端点返回正确数据
  TASK-003 ── Plugin + Hook 体系 ── 验证：插件目录结构完整

阶段 3（前端可视化）：
  TASK-004 ── G6 流程可视化 ── 验证：10-Gate 图渲染 + 主题切换

阶段 4（前端补充）：
  TASK-005 ── Token 仪表盘 ── 验证：token 统计面板正常展示

阶段 5（收尾）：
  全量构建 + lint + typecheck + test
```

---

## 九、推荐的下一步

1. **立即执行 TASK-001**（引擎核心，P0）：创建 `agent_events` 表 + 3 个 MCP 工具
2. **并行启动 TASK-006**（命令模板，P2）：与引擎无关，可独立进行
3. **TASK-001 完成后**：并行启动 TASK-002 和 TASK-003
4. **TASK-002 完成后**：执行 TASK-004（G6 可视化），随后 TASK-005（Token 仪表盘）
5. **Gate 检查点**：
   - Gate A：TASK-001 单元测试全绿 + MCP 工具手动验证
   - Gate C1：TASK-001 + TASK-002 所有测试通过 + Lint + Type-check + Build
   - Gate C2：TASK-004 G6 可视化在 light/dark 模式下手动验收通过

---

## 十、附录：REQ 到 TASK 追溯矩阵

| REQ | TASK | 说明 |
|-----|------|------|
| REQ-051 | TASK-004 | G6 Agent 实时状态可视化 |
| REQ-052 | TASK-003 | Plugin 体系创建 |
| REQ-053 | TASK-003 | SubagentStart/SubagentEnd Hooks 集成 |
| REQ-054 | TASK-001 | Token 使用追踪系统（DB + MCP 工具） |
| REQ-055 | TASK-005 | Token 仪表盘 |
| REQ-056 | TASK-004 | G6 流程可视化 |
| REQ-057 | TASK-001 | 引擎 MCP 工具扩展 |
| REQ-058 | TASK-002 | Web REST API 扩展 |
| REQ-059 | TASK-003 | Hooks 脚本实现 |
| REQ-060 | TASK-003 | Plugin + Hook + MCP 一体化配置 |
| REQ-061 | TASK-004 | G6 主题与 antd 融合 |
| REQ-062 | TASK-006 | 命令模板优化 |

> 所有 12 个 REQ 均已映射到至少 1 个 TASK，无遗漏。

---

## 十一、验证清单

- [x] 所有 12 个 REQ 均已映射到至少 1 个 TASK
- [x] 任务使用垂直切片策略（每个 TASK 是完整功能切片）
- [x] 无水平切片（未出现"设计全部表"或"实现全部 API"类任务）
- [x] 每个任务有明确的优先级和 test_strategy
- [x] 依赖关系已明确（TASK-001 → TASK-002/003 → TASK-004 → TASK-005）
- [x] 并行机会已识别（TASK-001 + TASK-006 可并行；TASK-002 + TASK-003 可并行）
- [x] 风险任务已标注（TASK-004 为高，其余为中/低）
- [x] 单轮次总变更 ~1200 行，接近 1000 行建议阈值，但需求文档预估 ~1310 行，可接受
- [x] 共享区域已指定唯一责任方（db.ts=TASK-001, routes.ts=TASK-002, Dashboard.tsx=TASK-004→TASK-005）
- [x] 每个任务有可独立验证的完成标准
