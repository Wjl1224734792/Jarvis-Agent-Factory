# 需求文档：OpenCode 原生插件/工具机制集成

> 状态: confirmed | 日期: 2026-05-09 | 版本: 1.0

---

## 背景

Jarvis 当前已支持三个平台（Claude Code / OpenCode / Codex），其中 Claude Code 平台最为成熟（53 个 Agent 模板、18 个命令、完整 Gate 流水线）。OpenCode 平台虽有 58 个 Agent 模板和基础插件，但存在以下差距：

1. **插件覆盖不足**：仅有 `jarvis-gate-check.ts` 实现 `tool.execute.after` 和 `session.idle` 两个 hook，缺少 `tool.execute.before`（Gate 执行前拦截）、事件上报等
2. **无自定义工具**：OpenCode 平台没有使用 OpenCode 原生 `tool()` 机制（`.opencode/tools/`），引擎 MCP 工具直接暴露给 AI，缺乏中间层
3. **Agent 模板集不一致**：Claude（53 个）与 OpenCode（58 个）命名体系不同（`-expert` vs `-worker`/`-implementer`），需确保功能覆盖一致
4. **Web 面板 OpenCode 状态未完全验证**：需确认智能体配置页面、流水线面板在 OpenCode 平台数据下正常工作

---

## 需求列表

### REQ-001：增强 OpenCode 原生插件（Hook 全覆盖）

**背景**：当前 `jarvis-gate-check.ts` 仅监听 `tool.execute.after(Task)` 做事后 gate-check + `session.idle` 显示状态。缺少事前拦截和 web 状态同步。

**修复**：
- 增加 `tool.execute.before` hook：在 Task/Agent/Write/Edit/Bash 工具执行前调用 `jarvis hook gate-check`，Gate 不满足时中断操作（throw Error），实现硬阻断
- 增加 `session.idle` → 调用 web API 同步流水线状态到 dashboard
- 增加 `tool.execute.after` 完善：Task 执行后自动上报状态变更到 web API
- 增加 `session.error` 事件处理：错误时记录到引擎
- 增加 `permission.asked` 事件处理：记录权限请求用于审计

**验收标准**：
- `tool.execute.before` 在 Gate 不满足时能阻断 Task 工具调用
- Web dashboard 能看到 OpenCode 会话的实时流水线状态
- 引擎中能查到 OpenCode 会话的 checkpoints 和 events

### REQ-002：创建 OpenCode 原生自定义工具（`.opencode/tools/`）

**背景**：OpenCode 支持在 `.opencode/tools/*.ts` 定义原生工具（基于 `@opencode-ai/plugin` 的 `tool()` 函数）。当前项目未利用此机制，引擎 MCP 工具直接暴露给 AI 但缺少语义化封装。

**修复**：
- 创建 `jarvis-gate-check` 工具：包装 `mcp__jarvis-engine__gate_check`，返回中文可读结果
- 创建 `jarvis-gate-advance` 工具：包装 `mcp__jarvis-engine__advance_gate`，推进流水线 Gate
- 创建 `jarvis-pipeline-status` 工具：包装 `mcp__jarvis-engine__pipeline_status`，返回格式化流水线状态
- 创建 `jarvis-report` 工具：包装 `mcp__jarvis-engine__report_status`，生成完整报告
- 创建 `jarvis-agent-config` 工具：包装 `mcp__jarvis-engine__agent_config`，配置智能体模型/思考等级

**验收标准**：
- OpenCode 会话中 AI 可通过这些工具完成完整 Gate 流水线
- 工具返回结果格式化为中文可读文本
- 工具的 args schema 有完整的中文 `describe()`

### REQ-003：对齐 OpenCode Agent 模板集与 Claude

**背景**：Claude 平台有 53 个 Agent、OpenCode 有 58 个。两者命名体系不同（Claude 用 `-expert` 后缀，OpenCode 用 `-worker`/`-implementer` 后缀）。需确保功能覆盖一致，且两类 Agent 类型在 Web 面板中都能正确显示和配置。

**修复**：
- 对比两个平台的 Agent 清单，列出差异
- 缺失的 Agent 类型补充到对应平台
- 确保每个 Agent 的 OpenCode 模板使用正确的 OpenCode frontmatter 格式（`mode: subagent/primary`、`permission:`、`model:`）
- 确保 Agent 模板中不包含平台特定的工具引用（如 OpenCode 模板中不应有 `mcp__jarvis-engine__*` 前缀，应使用 `jarvis-*` 工具名）

**验收标准**：
- 两个平台的 Agent 类型功能覆盖一致（同一角色在两边都有对应 Agent）
- OpenCode 模板的 frontmatter 格式符合 OpenCode 规范
- Web 面板切换 OpenCode 平台显示 50+ Agent

### REQ-004：Web 面板 OpenCode 适配验证与修复

**背景**：`agent-registry.ts` 中 `PLATFORM_CONFIG.opencode` 定义了 `subdirs: ['agents', 'plugins']`，与 Claude 的 `['agents', 'commands']` 不同。安装时 OpenCode 使用插件目录而非 commands 目录。需确保 Web 面板智能体配置页面正确显示 OpenCode 的 agents 和 plugins。

**修复**：
- 验证 Web 面板 `/agents` 页面切换 OpenCode 平台时正确显示 Agent 列表
- 验证 plugin 类型项目在列表中正确标注（区分 agent vs plugin）
- 验证平台切换时的缓存刷新正常
- 确保 `platform_info` MCP 工具返回的 OpenCode 数据准确

**验收标准**：
- `/agents` 页面选择 OpenCode 平台后显示 50+ 项（agents + plugins）
- Plugin 项有明确的类型标识
- 点击各 Agent 能查看详情

### REQ-005：引擎 MCP 工具 OpenCode 适配

**背景**：引擎 MCP 工具（`gate_check`、`advance_gate`、`platform_info` 等）当前在 OpenCode 的 MCP 配置中通过 `jarvis engine start --stdio` 提供。需要确保：
- MCP 工具在 OpenCode 中正确注册
- 工具参数和返回格式对 OpenCode AI 友好
- 工具描述语义清晰

**修复**：
- 检查 `mcp-opencode.json` 模板配置正确性
- `server.ts` 中 MCP 工具定义增加平台适配注释（当 platform=opencode 时的行为说明）
- `platform_info` 工具在查询 opencode 时返回准确信息（agent 数量、可用模型）

**验收标准**：
- `jarvis engine start --stdio` 在 OpenCode 环境中正常启动
- MCP 工具列表正确注册到 OpenCode
- `platform_info` 查询 opencode 返回非空正确数据

### REQ-006：`platform_info` MCP 工具完善

**背景**：`platform_info` 工具当前可能未正确反映各平台实际 Agent 数量、可用模型列表。这是 Web 面板和 CLI 获取平台信息的关键入口。

**修复**：
- 实现 `platform_info` 根据缓存/实际扫描返回各平台 agent 数量
- 返回各平台支持的模型列表
- 返回平台特有功能（如 OpenCode 有 plugins、Claude 有 commands）

**验收标准**：
- `platform_info` 不传参数时返回三个平台完整信息
- 传 `platform=opencode` 时返回 OpenCode 详细信息
- 统计数据与实际模板文件一致

### REQ-007：确保 `jarvis add/upgrade` 对 OpenCode 正常工作

**背景**：`install.ts` 中已有 OpenCode 安装逻辑（MCP 配置写入 `.opencode/opencode.json`、插件安装到 `.opencode/plugins/`、agents 安装到 `.opencode/agents/`）。需确认所有路径在生产环境（npm 全局安装 `dist/` 目录）下正常工作。

**修复**：
- 验证 `jarvis add opencode` 完整安装流程（解压模板 → 写入配置 → 安装插件）
- 验证 `jarvis upgrade` 更新 OpenCode 配置
- 确认 `dist/src/templates/platforms/opencode/` 包含所有必要文件（agents/、plugins/、skills/）
- 检查 `node_modules/` 是否应该打入 npm 包（当前在 `dist/` 中可能不应包含）

**验收标准**：
- `jarvis add opencode` 创建 `.opencode/` 目录并包含 agents/plugins/skills
- `jarvis upgrade` 能更新已有 OpenCode 配置
- npm pack 后的包中包含 OpenCode 模板

---

## 涉及文件

| 文件 | 变更类型 | 关联需求 |
|------|---------|----------|
| `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts` | 增强 | REQ-001 |
| `src/templates/platforms/opencode/tools/*.ts` | **新增** | REQ-002 |
| `src/templates/platforms/opencode/agents/*.md` | 审核/修改 | REQ-003 |
| `src/templates/platforms/claude/agents/*.md` | 审核/可能新增 | REQ-003 |
| `src/engine/agent-registry.ts` | 修改 | REQ-004, REQ-006 |
| `src/engine/server.ts` | 修改 | REQ-005, REQ-006 |
| `src/web/views/agents.html` | 可能修改 | REQ-004 |
| `src/templates/mcp-opencode.json` | 审核 | REQ-005 |
| `src/install.ts` | 审核/可能修改 | REQ-007 |
| `package.json` (build 脚本) | 审核 | REQ-007 |

## 不变更范围

- 数据库 Schema
- Gate 流水线核心逻辑（`gates.ts`）
- Claude 平台模板和命令
- Codex 平台模板
- Web 面板视觉效果（仅数据适配）
- 路由结构

## 技术决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| Hook 拦截策略 | `tool.execute.before` + engine MCP 双保险 | 用户明确选择"两者结合"：hook 做自动拦截，engine MCP 工具供 Agent 主动调用 |
| Commands 目录 | 不创建 | 用户确认"OpenCode 用切换主智能体的方式，不用指令" |
| 自定义工具命名 | `jarvis-*` 前缀 | 与 OpenCode 生态区分，避免冲突 |
| 工具实现方式 | `@opencode-ai/plugin` 的 `tool()` 函数 | 使用 OpenCode 原生机制，非 MCP stdio |
