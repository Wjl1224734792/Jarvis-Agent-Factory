# OpenCode 原生自定义工具 — 后端实现文档

## 1. 当前实现目标

在 `src/templates/platforms/opencode/tools/` 创建 5 个语义化包装工具，每个工具包装对应的引擎 MCP 工具，作为 OpenCode 原生工具供 Agent 直接调用，返回中文格式化结果。

## 2. 对应需求 ID / 任务 ID

- **需求**: REQ-002
- **任务**: TASK-002
- **并行组**: TASK-001, TASK-003, TASK-005, TASK-006

## 3. 输入依据

- Execution Packet TASK-002（编排者分配）
- `@opencode-ai/plugin` 包 `tool()` 函数 API（v1.14.33）
- 引擎 MCP 工具契约（`gate_check`, `advance_gate`, `pipeline_status`, `report_status`, `agent_config`）
- `jarvis hook` CLI 机制（`src/hook.ts`）

## 4. 变更文件 / 变更范围

### 新增文件

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/templates/platforms/opencode/tools/jarvis-gate-check.ts` | 31 | Gate 操作检查工具 |
| `src/templates/platforms/opencode/tools/jarvis-gate-advance.ts` | 30 | Gate 推进工具 |
| `src/templates/platforms/opencode/tools/jarvis-pipeline-status.ts` | 61 | 流水线状态工具（含 JSON 解析 + 中文格式化） |
| `src/templates/platforms/opencode/tools/jarvis-report.ts` | 26 | 流水线报告工具 |
| `src/templates/platforms/opencode/tools/jarvis-agent-config.ts` | 39 | Agent 配置工具 |
| `tests/tools.test.ts` | 283 | 17 个测试用例（超出要求的 10 个） |

### 修改文件

| 文件 | 变更说明 |
|------|----------|
| `src/hook.ts` | 扩展 CLI 子命令：添加 `--operation` 支持到 `gate-check`、添加 `--gate` 到 `gate-advance`、新增 `report-status` 和 `agent-config` 子命令 |

### 未修改文件（按契约）

- `src/engine/server.ts` — 未修改
- `src/templates/platforms/opencode/plugins/` — 未修改
- `src/templates/platforms/opencode/agents/` — 未修改

## 5. 实现说明

### 5.1 架构设计

```
OpenCode Agent
  └── tool("jarvis-gate-check", ...)  ← OpenCode 原生工具
        └── execSync("jarvis hook gate-check --operation ...")
              └── hook.ts: hookCommand()
                    └── fetch("http://localhost:3456/api/...")  ← 引擎 REST API
```

每个工具使用 `@opencode-ai/plugin` 的 `tool()` 函数定义，在 `execute()` 内通过 `node:child_process.execSync` 调用 `jarvis hook <subcommand>`，hook 层再通过 HTTP 调用引擎 REST API。

### 5.2 工具清单

#### jarvis-gate-check
- **Args**: `operation: string` — 操作类型（如 `spawn_impl`）
- **调用**: `jarvis hook gate-check --operation <op>`
- **返回**: 中文文本 "✅ Gate C: 操作 'spawn_impl' 允许执行" 或 "🚫 Gate C: 操作 'deploy' 被禁止"
- **错误**: 捕获 execSync 异常，返回 stderr/stdout 内容

#### jarvis-gate-advance
- **Args**: `gate: string` — 目标 Gate 名称（如 `Gate C1`）
- **调用**: `jarvis hook gate-advance --gate "<gate>"`
- **返回**: 中文文本 "🚀 Gate C → Gate C1 (next: Gate C1.5)"
- **错误**: 捕获 BLOCKED 输出并返回

#### jarvis-pipeline-status
- **Args**: 无
- **调用**: `jarvis hook status --json`
- **返回**: 解析 JSON 后格式化为中文文本，包含会话ID、平台、流水线名、当前Gate、进度百分比、各Gate详情（✅/⬜ 标记 + 耗时）
- **空会话**: 返回提示语 "暂无活跃流水线会话。请先通过编排工具初始化流水线。"

#### jarvis-report
- **Args**: 无
- **调用**: `jarvis hook report-status`
- **返回**: 流水线完整报告（各会话进度、Gate状态、完成百分比）

#### jarvis-agent-config
- **Args**: `agent_id: string`, `model?: string`, `effort?: string`
- **调用**: `jarvis hook agent-config --agent-id <id> [--model <model>] [--effort <effort>]`
- **查询模式**（只传 agent_id）: 返回单个 Agent 配置
- **设置模式**（传 agent_id + model）: POST 设置并返回确认
- **列表模式**（不传参数）: 返回全部 Agent 配置

### 5.3 hook.ts 扩展

为支持 5 个工具的 CLI 调用，扩展了 `src/hook.ts`：

1. **gate-check --operation**: 从 `GET /api/pipeline` 获取当前 Gate，使用本地 GATE_OPS 映射表检查操作是否允许。GATE_OPS 是引擎 `getGateOperations()` 的本地副本，避免循环依赖。

2. **gate-advance --gate**: 将目标 Gate 传递给 `POST /api/gate/advance`。

3. **report-status**: 调用 `GET /api/pipeline`，计算进度百分比，输出中文报告。支持 `--json` 输出原始数据。

4. **agent-config**: 设置模式调用 `POST /api/agents`，查询模式调用 `GET /api/agents`。

### 5.4 TDD 过程

**Red**: 先编写 `tests/tools.test.ts`（17 个测试用例），mock `@opencode-ai/plugin` 和 `node:child_process`。

**Green**: 逐步创建 5 个工具文件 + 扩展 hook.ts。

**Refactor**: 
- 移除 `jarvis-gate-check.ts` 中未使用的 `VALID_OPERATIONS` 常量
- 重构 `jarvis-pipeline-status.ts` 从原始 JSON 输出改为中文格式化文本
- 修复测试中 `expect.stringContain` → `expect.stringContaining` 拼写

## 6. 测试和验证结果

### 测试执行

```
$ npm run check

> lint
  (no errors)

> typecheck
  (no errors)

> vitest run
  Test Files  7 passed (7)
  Tests       96 passed (96)
```

### 测试覆盖

| 工具 | 测试数量 | 覆盖场景 |
|------|---------|---------|
| jarvis-gate-check | 3 | 定义验证、正常调用、BLOCKED 异常 |
| jarvis-gate-advance | 3 | 定义验证、正常推进、BLOCKED 异常 |
| jarvis-pipeline-status | 4 | 定义验证、带会话格式化、空会话提示、异常 |
| jarvis-report | 3 | 定义验证、正常报告、引擎未运行提示 |
| jarvis-agent-config | 4 | 定义验证、设置模式、查询模式、Agent 未找到 |

### 代码质量

- ESLint: 零错误
- TypeScript: 零类型错误
- 嵌套层级: 最大 3 层
- 无循环依赖
- 条件分支: ≤2（使用 if-else 清晰逻辑）

## 7. 数据与接口边界

### 输入边界
- `operation`: 任意字符串，由 `hook.ts` 的 GATE_OPS 映射验证
- `gate`: 任意字符串，"Gate A" 至 "Gate E" 及 "Gate C1/C1.5/C2"
- `agent_id`: 可选，由引擎 `/api/agents` 验证存在性
- `model`/`effort`: 可选，传递给引擎 API

### 输出边界
- 成功: 中文格式化文本（操作确认、推进确认、状态报告、配置信息）
- 失败: 明确的错误信息（被禁止、未找到、引擎未运行）
- 引擎不可达: 友好提示 "Engine: not running. Start with: jarvis engine start"

### 依赖
- `@opencode-ai/plugin` v1.14.33（OpenCode 环境中已安装）
- `jarvis` CLI（全局安装或 npx）
- 引擎运行在 `http://localhost:3456`

## 8. 风险 / 未解决项

| 风险 | 等级 | 说明 |
|------|------|------|
| GATE_OPS 副本不同步 | 低 | `hook.ts` 中 GATE_OPS 是引擎 `GATE_OPERATIONS` 的本地副本，若引擎 Gate 操作定义变更需手动同步 |
| pipeline-status 行数超标 | 低 | 61 行超过 ~30-40 目标，因 JSON 解析 + 中文格式化逻辑需要。可后续提取格式化函数 |
| execSync 超时 | 低 | 设置 10 秒超时，引擎不可达时 fallback 到错误信息 |

## 9. 需要前端配合的点

无。此任务为纯后端 OpenCode 工具实现，不涉及前端 UI。

## 10. 推荐的下一步

1. **TASK-003**: 创建 OpenCode 命令目录和命令文件（依赖本任务的工具契约）
2. **集成测试**: 在真实 OpenCode 环境中验证工具调用链路（需要引擎运行）
3. **GATE_OPS 同步**: 考虑从引擎模块导入而非本地副本，消除不同步风险
