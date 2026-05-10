# 需求文档 — antV G6 可视化 + Claude Code Plugin/Hook/MCP 深度集成 + Token 追踪

> 日期：2026-05-11 | 状态：confirmed

---

## REQ-051：antV G6 Agent 实时状态可视化

**问题**：当前 Web 面板的 Dashboard 页面使用静态 Gate 流程图（10 个 Gate Card），无法实时展示每个 Gate 下启动了哪些子 Agent、哪些已完成、哪些正在运行。编排者和用户无法一目了然看到流水线的实际运行状态。

**要求**：
- 在 Dashboard 页面新增 G6 可视化区域，展示 10-Gate 流程图
- 每个 Gate 节点内动态显示：
  - 当前 Gate 高亮（动画脉冲效果）
  - 已通过的 Gate（绿色对勾）
  - 该 Gate 下当前活跃的 Agent（名称 + 运行中动画）
  - 该 Gate 下已完成的 Agent（名称 + ✓）
  - 该 Gate 下失败的 Agent（名称 + ✗ 红色）
- G6 使用 `@antv/g6` v5（最新稳定版），通过 Canvas 渲染确保高性能
- 节点样式使用 antd 主题 CSS 变量（`var(--ant-color-*)`）保持主题一致性
- 支持深色/浅色主题自动切换
- G6 图表响应式：窗口/侧边栏 resize 时自动重绘

---

## REQ-052：Claude Code Plugin 体系创建

**问题**：当前 `.claude/plugins/` 目录不存在。虽然 MCP 工具（`session_join`、`advance_gate`、`gate_check` 等）已可用，但缺乏 Plugin 级别的自动化集成——特别是子 Agent 的生命周期事件无法自动触发引擎状态更新。

**要求**：
- 创建 `.claude/plugins/jarvis-visualization/` 插件目录
- `plugin.json` 清单包含：
  - `name`: `jarvis-visualization`
  - `version`: `1.0.0`
  - `description`: "Jarvis Agent 实时可视化与 Token 追踪"
  - `hooks`: 指向 `hooks/hooks.json`
- 插件通过 `.claude-plugin/marketplace.json` 注册（本地项目插件）
- 插件的 hooks 配置调用 MCP 工具上报 Agent 状态

---

## REQ-053：SubagentStart/SubagentEnd Hooks 集成

**问题**：Claude Code 在 spawn 子 Agent 时触发 `SubagentStart` 和 `SubagentEnd`（已确认 Claude Code v2.0.43+ 支持），但当前无任何 hook 配置来捕获这些事件。

**要求**：
- 在 `hooks/hooks.json` 中配置以下 hooks：

### SubagentStart Hook
- **触发时机**：编排者 spawn 子 Agent 时
- **Hook 类型**：`command`
- **作用**：调用 jarvis-engine MCP 工具 `agent_event`
- **传递数据**：
  - `event`: `"start"`
  - `agent_id`: 子 Agent 名称（从 hook 上下文获取）
  - `session_id`: 当前会话 ID
  - `run_id`: 当前 pipeline run ID
  - `timestamp`: ISO 8601 时间戳

### SubagentEnd Hook
- **触发时机**：子 Agent 完成（成功或失败）
- **Hook 类型**：`command`
- **作用**：调用 jarvis-engine MCP 工具 `agent_event`
- **传递数据**：
  - `event`: `"end"` 或 `"error"`
  - `agent_id`: 子 Agent 名称
  - `session_id`: 当前会话 ID
  - `run_id`: 当前 pipeline run ID
  - `token_usage`: 从 Agent result 中提取的 `usage` 对象（input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens）
  - `status`: `"success"` | `"error"`
  - `error_message`: 失败时的错误信息
  - `timestamp`: ISO 8601 时间戳

---

## REQ-054：Token 使用追踪系统

**问题**：当前没有任何方式追踪子 Agent 的 token 消耗。Claude Code 的 Agent SDK 在子 Agent 返回结果中包含 `usage` 字段（input_tokens, output_tokens, cache tokens），但这些数据未被收集和展示。

**要求**：

### 数据库层
- 新增 `agent_events` 表：
  ```sql
  CREATE TABLE agent_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    event_type TEXT NOT NULL,  -- 'start' | 'end' | 'error'
    status TEXT,               -- 'success' | 'error' | null (start时为空)
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_creation_input_tokens INTEGER DEFAULT 0,
    cache_read_input_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (
      input_tokens + output_tokens + cache_creation_input_tokens + cache_read_input_tokens
    ) STORED,
    error_message TEXT,
    started_at TEXT,
    ended_at TEXT,
    duration_ms INTEGER
  );
  CREATE INDEX idx_agent_events_run ON agent_events(run_id, agent_id);
  ```

### MCP 工具
- 新增 `agent_event` MCP 工具：
  - 参数：`event`（start/end/error）、`agent_id`、`run_id`、`session_id`、
    `input_tokens`（可选）、`output_tokens`（可选）、
    `cache_creation_input_tokens`（可选）、`cache_read_input_tokens`（可选）、
    `status`（可选）、`error_message`（可选）
  - 作用：记录 Agent 生命周期事件 + token 使用数据
  - 返回：事件 ID + 当前 run 累计统计

- 新增 `agent_usage` MCP 工具（查询）：
  - 参数：`run_id`（可选，默认当前活跃 run）
  - 返回：按 agent_id 分组的 token 统计、总计、按 event_type 的统计
  - 格式：
    ```json
    {
      "run_id": "xxx",
      "agents": {
        "frontend-ui-expert": {
          "calls": 2,
          "total_input_tokens": 15000,
          "total_output_tokens": 3200,
          "total_tokens": 18200,
          "estimated_cost_usd": 0.054
        }
      },
      "totals": {
        "total_agents_spawned": 12,
        "total_input_tokens": 120000,
        "total_output_tokens": 45000,
        "total_tokens": 165000,
        "estimated_cost_usd": 0.495
      }
    }
    ```

- 新增 `agent_status` MCP 工具（实时查询）：
  - 参数：`run_id`（可选）
  - 返回：当前活跃的 Agent 列表（event_type='start' 但无对应 'end' 的）、最近完成的 Agent 列表

### Token 成本估算
- 根据 Agent 配置的 `defaultModel` 查询对应模型单价
- 模型单价参考（USD/1M tokens）：
  | 模型 | Input | Output | Cache Write | Cache Read |
  |------|-------|--------|-------------|-------------|
  | claude-sonnet-4-20250514 | $3.00 | $15.00 | $3.75 | $0.30 |
  | claude-opus-4-20250514 | $15.00 | $75.00 | $18.75 | $1.50 |
  | claude-haiku-4-20250514 | $1.00 | $5.00 | $1.25 | $0.10 |
  | deepseek-v4-pro | — | — | — | — |
  | deepseek-v4-flash | — | — | — | — |
- DeepSeek 模型显示 token 数但成本标记为 "N/A"（非 Anthropic 模型无法追踪价格）

---

## REQ-055：Web 面板增强 — Token 仪表盘

**问题**：Dashboard 页面当前只显示 Gate 状态和产物文档，缺少 Agent 运行状态和 Token 消耗的实时展示。

**要求**：

### Token 统计面板（Dashboard 侧边或底部）
- **实时 Token 计数**：当前 run 已消耗的总 token 数（数字滚动动画）
- **模型分布**：按模型分类的 token 消耗饼图/柱状图
- **Agent 排行**：Top 5 token 消耗 Agent 列表
- **成本估算**：总预估成本（仅 Anthropic 模型）
- **缓存命中率**：cache_read / (cache_read + input) 百分比

### 数据刷新
- SSE 推送 token 更新事件（broadcastSSE 扩展）
- 或 Web 面板每 5 秒轮询 `/api/agent-usage?run_id=xxx`
- G6 可视化区域实时更新 Agent 状态（出现/消失动画）

---

## REQ-056：Web 面板增强 — G6 流程可视化

**问题**：Dashboard 当前是 10 个独立的 Card 组件排列，缺乏流程感和实时状态感。

**要求**：

### G6 图表布局
- 使用 G6 v5 的 `dagre` 布局（从上到下 Tree 布局）
- 节点：
  - 10 个 Gate 节点（A, B, B1, C, C-impl, C1, C1.5, C2, D, E）
  - 每个 Gate 节点显示：Gate 简称 + 中文标签 + 状态图标
- 边：
  - Gate 之间的有向边（A→B→B1→C→C-impl→C1→C1.5→C2→D→E）
  - 已通过的边为绿色实线
  - 未通过的边为灰色虚线
- 动画：
  - 当前 Gate 节点：脉冲呼吸动画（pulse）
  - 运行中的 Agent：小圆点在 Gate 节点旁旋转
  - Gate 通过时：节点从灰色过渡到绿色（过渡动画 500ms）

### 交互
- 点击 Gate 节点 → 展开该 Gate 的 Agent 详情（运行中/已完成/失败）
- 悬停 Gate 节点 → Tooltip 显示 Gate 描述、产物列表、Agent 统计
- 滚轮缩放、拖拽平移

### 响应式
- 图表容器 `width: 100%; height: 400px`（桌面）/ `300px`（平板）/ `250px`（手机）
- G6 使用 `fitView: true` + `fitViewPadding: 20`

---

## REQ-057：引擎 MCP 工具扩展 — agent_event + agent_usage + agent_status

**问题**：当前 MCP 工具集（session_join, advance_gate, gate_check 等）不涵盖 Agent 运行时状态追踪。

**要求**：
- 在 `server.ts` 的 `registerMcpTools` 中新增以下工具：

### agent_event
```
名称: agent_event
描述: 上报 Agent 生命周期事件（start/end/error）和 token 使用数据
参数:
  - event: 'start' | 'end' | 'error'
  - agent_id: string（Agent 名称/ID）
  - run_id: string（可选，默认当前活跃 run）
  - session_id: string（可选，自动解析）
  - input_tokens: number（可选）
  - output_tokens: number（可选）
  - cache_creation_input_tokens: number（可选）
  - cache_read_input_tokens: number（可选）
  - status: 'success' | 'error'（可选）
  - error_message: string（可选）
返回: 事件记录 ID + 当前 run 累计 token 统计
```

### agent_usage
```
名称: agent_usage
描述: 查询当前或指定 run 的 Agent token 使用统计
参数:
  - run_id: string（可选，默认当前活跃 run）
返回: 按 agent_id 分组的 token 统计 + 总计
```

### agent_status
```
名称: agent_status
描述: 查询当前 run 的 Agent 实时状态（活跃/已完成/失败）
参数:
  - run_id: string（可选，默认当前活跃 run）
返回: { active: [...], completed: [...], failed: [...] }
```

---

## REQ-058：Web REST API 扩展

**问题**：Web 面板需要 REST API 来查询 Agent 状态和 Token 数据，当前 API 不涵盖这些功能。

**要求**：
- 新增路由（在 `src/web/routes.ts` 中）：
  - `GET /api/agent-usage?run_id=xxx` — Token 使用统计
  - `GET /api/agent-status?run_id=xxx` — Agent 实时状态
  - `GET /api/agent-events?run_id=xxx&agent_id=xxx` — 单个 Agent 的事件历史
- SSE 广播扩展：在 `broadcastSSE` 中增加 agent 状态数据

---

## REQ-059：Hooks 脚本实现

**问题**：`hooks.json` 中的 `command` 类型 hook 需要实际的可执行脚本。

**要求**：
- 创建 `hooks/scripts/agent-event.sh`（Linux/macOS）和 `hooks/scripts/agent-event.ps1`（Windows）
- 脚本逻辑：
  1. 从环境变量接收 hook 上下文（`CLAUDE_HOOK_EVENT`, `CLAUDE_AGENT_ID`, `CLAUDE_SESSION_ID` 等）
  2. 调用 jarvis-engine MCP 工具 `agent_event`
  3. 通过 HTTP POST 到 `http://localhost:3456/mcp`（StreamableHTTP transport）
- 或在 `hooks.json` 中直接使用 `mcp_tool` 类型调用 jarvis-engine 的 `agent_event`（如果 Claude Code 支持在 hook 中调用 MCP 工具）

---

## REQ-060：Plugin + Hook + MCP 一体化配置

**问题**：Plugin、Hook、MCP 三个体系独立配置，缺乏统一的"安装即用"体验。

**要求**：
- `.claude/plugins/jarvis-visualization/plugin.json` 作为统一入口
- 插件安装后自动：
  1. 注册 MCP 工具（通过 `.mcp.json` 或 plugin 的 mcp 配置）
  2. 激活 hooks（SubagentStart/SubagentEnd）
  3. 引擎端无需额外配置——`agent_event` 等工具随引擎启动自动注册
- `jarvis update --workspace` 或 `jarvis upgrade` 时自动部署插件文件
- 用户无需手动编辑任何配置文件

---

## REQ-061：G6 主题与 antd 无缝融合

**问题**：G6 Canvas 渲染的图形与 antd 组件（Card、Tag、Progress）的视觉风格需要统一。

**要求**：
- G6 节点/边颜色使用 `getComputedStyle(document.documentElement)` 读取 antd CSS 变量
- 或通过 `antd` 的 `theme.useToken()` hook 获取 token 后传入 G6 配置
- 监听 `prefers-color-scheme` 变化，自动切换 G6 主题
- G6 节点样式参考：
  - 背景：`var(--ant-color-bg-container)`
  - 边框：`var(--ant-color-border)`
  - 文字：`var(--ant-color-text)`
  - 成功色：`var(--ant-color-success)`
  - 主色：`var(--ant-color-primary)`
  - 错误色：`var(--ant-color-error)`

---

## REQ-062：其他命令流程优化（基于新流水线）

**问题**：16 个 Claude Code 命令模板中，部分命令的提示词和流程未反映最新的 Agent 清单（如 external-resource-expert 替代 docs-research-expert、remediation-expert 合并了 remediation-planner 和 fix-retest）。

**要求**：
- 审核所有 16 个命令模板（`src/templates/platforms/claude/commands/*.md`）
- 确保所有引用使用最新 Agent 名称
- 在适当的位置增加 `external-resource-expert` 使用提示
- 更新 browser-test 命令中 `fix-retest` → `remediation-expert` 引用
- 优化 jarvis.md 主命令中关于 skill-assignment-expert 的说明
- 确保所有命令的 Agent 路由表使用正确的 `subagent_type`

---

## 优先级排序

| 优先级 | REQ | 理由 |
|--------|-----|------|
| P0 | REQ-057 | 引擎 MCP 工具是先决条件——所有其他功能依赖 `agent_event`/`agent_usage` |
| P0 | REQ-054 | 数据库 Schema 变更是基础——需先创建表才能存储数据 |
| P1 | REQ-058 | REST API 是 Web 面板的数据来源 |
| P1 | REQ-053 | Hooks 配置依赖 MCP 工具已就绪 |
| P1 | REQ-052 | Plugin 体系依赖 hooks 和 MCP 配置 |
| P1 | REQ-051 | G6 可视化依赖 REST API 数据 |
| P1 | REQ-055 | Token 仪表盘依赖 `agent_usage` API |
| P1 | REQ-056 | G6 流程可视化与 Token 仪表盘同为 Web 前端功能 |
| P2 | REQ-059 | Hooks 脚本实现——依赖 MCP 工具已部署 |
| P2 | REQ-060 | 一体化配置——聚合前几项的工作成果 |
| P2 | REQ-061 | 主题融合——UI 细节打磨 |
| P2 | REQ-062 | 命令优化——收尾工作 |

---

## 变更影响范围估算

| 类别 | 涉及文件数 | 预估总变更行数 |
|------|---------|--------------|
| 引擎核心（db.ts + server.ts + gates.ts） | 3 | ~250 |
| Web 前端（Dashboard + G6 组件 + Layout + api.ts + routes.ts） | 5 | ~600 |
| Plugin/Hook 配置（新建 .claude/plugins/） | 5 | ~150 |
| 数据库迁移（Schema 变更） | 1 | ~30 |
| 命令模板优化 | 16 | ~80 |
| 测试（新增 + 更新） | 4 | ~200 |

> **总预估: ~34 文件, ~1310 行变更。单轮次，引擎→Web→配置有依赖关系。**

---

## 技术风险

| 风险 | 缓解措施 |
|------|---------|
| G6 v5 API 不稳定（较新版本） | 锁定 `@antv/g6@^5.0` 具体版本，不使用 `latest` |
| Claude Code hooks 中调用 MCP 工具可能不支持 `mcp_tool` 类型 | 备选方案：使用 `command` 类型 + curl/Invoke-RestMethod 调用引擎 HTTP API |
| DeepSeek 模型无法获取 token 成本 | 仅展示 token 数量，成本显示 "N/A — 非 Anthropic 模型" |
| SubagentEnd hook 中获取 token usage 需 Claude Code Agent SDK 支持 | 备选方案：SubagentEnd 仅上报 end 事件，token 数据由编排者通过解析 Agent result 获取后调用 `agent_event` 补充 |

---

