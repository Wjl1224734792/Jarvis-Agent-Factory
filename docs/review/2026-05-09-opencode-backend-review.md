# 后端代码审查报告 — OpenCode 集成增强

- 审查日期: 2026-05-09
- 审查范围: Gate D OpenCode 集成变更（插件增强、原生工具、Hook 扩展、Platform Info、新 Agent 模板）
- 审查者: backend-code-reviewer
- 变更行数: ~500 行（含测试）

---

## 审查结论: 有条件通过（conditionally approved）

存在 **2 项必须修复项**（含 1 项安全漏洞）和 **4 项建议修复项**。安全漏洞修复前不建议合并。

---

## 一、变更文件清单

| 文件 | 操作 | 关联任务 | 行数（估） |
|------|------|---------|-----------|
| `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts` | 增强（42→126行） | TASK-001 | +84 |
| `src/templates/platforms/opencode/tools/jarvis-gate-check.ts` | 新增 | TASK-002 | 31 |
| `src/templates/platforms/opencode/tools/jarvis-gate-advance.ts` | 新增 | TASK-002 | 30 |
| `src/templates/platforms/opencode/tools/jarvis-pipeline-status.ts` | 新增 | TASK-002 | 61 |
| `src/templates/platforms/opencode/tools/jarvis-report.ts` | 新增 | TASK-002 | 26 |
| `src/templates/platforms/opencode/tools/jarvis-agent-config.ts` | 新增 | TASK-002 | 39 |
| `src/hook.ts` | 扩展（新增2个子命令） | TASK-002 | +100 |
| `src/templates/platforms/opencode/agents/jarvis.md` | 修改 | TASK-003 | -5/+1 |
| `src/templates/platforms/opencode/agents/api-test-worker.md` | 新增 | TASK-003 | 116 |
| `src/templates/platforms/opencode/agents/backend-code-reviewer.md` | 新增 | TASK-003 | 115 |
| `src/templates/platforms/opencode/agents/frontend-code-reviewer.md` | 新增 | TASK-003 | 113 |
| `src/engine/server.ts` | 增强（platform_info） | TASK-005 | +75 |
| `package.json` | 修改（build 脚本） | TASK-006 | +1行 |
| `tests/gate-hook.test.ts` | 新增 | TASK-001 | 202 |
| `tests/tools.test.ts` | 新增 | TASK-002 | 283 |
| `tests/mcp-platform-info.test.ts` | 新增 | TASK-005 | 175 |

---

## 二、维度检查结果

### 1. API 设计审查 — 通过

- OpenCode 原生工具采用 `@opencode-ai/plugin` 框架的 `tool()` 定义，模式统一。
- hook.ts 子命令扩展遵循现有 `--flag value` CLI 约定，新增 `report-status` 和 `agent-config` 子命令命名清晰。
- `platform_info` MCP 工具新增 `features` 字段，向后兼容（原字段全部保留）。
- `agent-config` 工具支持三种模式（查询全部 / 查询单个 / 设置），模式由参数组合隐式推断，API 语义合理。
- REST `/api/platforms` 端点（routes.ts:355）缺少 `features` 字段，与 MCP `platform_info` 不一致（见 FIX_REQUIRED #6）。

### 2. 业务逻辑审查 — 有条件通过（含不一致）

- **GATE_OPS 数据不一致**（FIX_REQUIRED #2）：`hook.ts` 中的本地 GATE_OPS 副本与 `gates.ts` 权威定义存在差异。虽然当前功能上只检查 `allow` 列表（deny 列表未被代码使用），但这是双源真理（two sources of truth）反模式，维护风险高。
- **GATE_CHECK_TOOLS 工具列表合理**：`['Task', 'Agent', 'task']` 覆盖了 OpenCode 的 Task 工具和可能的别名（小写 `task`），符合业务需要。
- **BLOCKABLE_TOOLS 列表合理**：`['Task', 'Agent', 'Write', 'Edit', 'Bash']` 覆盖了有副作用的工具，`Read`/`Grep` 等只读工具不在阻断范围。
- Gate 推进逻辑正确：`advance_gate` MCP 工具的 FSM 规则（不可回退、不可跳级）在 hook.ts 的 REST API 层和 MCP 层一致。

### 3. 数据层审查 — 通过

- 本轮变更不涉及数据库 Schema 修改。
- `platform_info` 的 `resolvePlatformInfo()` 函数是纯计算函数，无数据库写操作，安全。
- `agent-config` 的 REST API (`POST /api/agents`) 有 effort 白名单校验（routes.ts:336），防止无效数据落库。

### 4. 错误处理审查 — 有条件通过

- **3 个工具文件的 execSync 异常处理正确**：通过检查 `err.stdout` / `err.stderr` 返回有意义的中文错误信息。
- **`tool.execute.before` 缺少 try/catch**：execSync 调用若因 jarvis CLI 未安装而抛出异常，会升级为未捕获错误，可能中断 OpenCode 会话（见 WARNING #3）。
- **`postEvent` 函数静默吞错误**：所有 fetch 网络错误被静默捕获，引擎不可达时不影响 Agent 执行，设计合理。但未检查 HTTP 响应状态码（见 WARNING #4）。
- hook.ts 中所有 API 调用失败时统一通过 catch 块输出友好错误信息并 `process.exit(2)`，符合预期。

### 5. 性能审查 — 通过

- 工具执行均为单次 `execSync` 调用 + 超时 10 秒，无循环/批量操作。
- `platform_info` 的 `resolvePlatformInfo()` 调用 `getAgentList(true)` 强制刷新缓存，密集调用时可能产生文件 I/O 开销。当前场景调用频率低（仅 on-demand），可接受。
- 无 N+1 查询、无全表扫描、无内存泄漏风险。

### 6. 代码质量 — 有条件通过

- TypeScript 类型检查通过（`tsc --noEmit` 零错误）。
- ESLint 对核心文件零错误（模板文件因 `.eslintignore` 排除，预期行为）。
- 全部 37 个单元测试通过。
- 命名遵循项目约定：中文注释、驼峰命名、`kebab-case` 文件名。
- `resolvePlatformInfo()` 提取为独立纯函数，便于测试，设计良好。
- `api-test-worker.md` 代理模板协作描述中引用的所有下游代理（`api-docs-worker`、`test-executor`、`fix-retest`、`backend-test-worker`）均在模板目录中实际存在。

---

## 三、问题列表

### [FIX_REQUIRED] #1: 命令注入风险 — 工具文件

**文件**: `src/templates/platforms/opencode/tools/jarvis-gate-check.ts:19-21`
`src/templates/platforms/opencode/tools/jarvis-gate-advance.ts:19-21`
`src/templates/platforms/opencode/tools/jarvis-agent-config.ts:26-31`

**证据**:
```typescript
// jarvis-gate-check.ts:19-21 — args.operation 直接拼入 shell 命令
const result = execSync(
  `jarvis hook gate-check --operation ${args.operation}`,
  { encoding: 'utf-8', timeout: 10_000 },
);

// jarvis-gate-advance.ts:19-21 — args.gate 有双引号但不防 $(...) 注入
const result = execSync(
  `jarvis hook gate-advance --gate "${args.gate}"`,
  { encoding: 'utf-8', timeout: 10_000 },
);

// jarvis-agent-config.ts:26-31 — 参数完全无转义拼入 shell
const cmdParts = ['jarvis hook agent-config', `--agent-id ${args.agent_id}`];
if (args.model) cmdParts.push(`--model ${args.model}`);
if (args.effort) cmdParts.push(`--effort ${args.effort}`);
const result = execSync(cmdParts.join(' '), { encoding: 'utf-8', timeout: 10_000 });
```

**影响**: `execSync` 传入字符串（非数组）时会启动 shell（Windows: cmd.exe, Linux: /bin/sh），攻击者可通过 `args.operation` 注入 shell 元字符（`;`, `|`, `$()`, `` ` ``）。虽然当前这些工具由编排 Agent 调用而非直接暴露给终端用户，但防御深度不足。

**严重度**: **[FIX_REQUIRED]** — 安全漏洞，不符合安全编码规范。

**建议修复**:
```typescript
// 方案 A: 使用 execFileSync 替代 execSync（推荐）
import { execFileSync } from 'node:child_process';
const result = execFileSync('jarvis', [
  'hook', 'gate-check', '--operation', args.operation,
], { encoding: 'utf-8', timeout: 10_000 });

// 方案 B: 参数白名单校验 + execSync
const VALID_OPS = ['read','write_doc','write_code','sweep_arch',
  'spawn_impl','spawn_test','lint','build','preview',
  'review','audit','deploy','fix'];
if (!VALID_OPS.includes(args.operation)) {
  return `无效操作类型: ${args.operation}`;
}
```

---

### [FIX_REQUIRED] #2: GATE_OPS 数据不一致 — hook.ts 与 gates.ts 双源真理

**文件**: `src/hook.ts:16-25` vs `src/engine/gates.ts:81-89`

**证据**: hook.ts 中 Gate A 的 deny 列表比 gates.ts 多出 5 个操作项：

| Gate | hook.ts deny 列表（多出的项） | gates.ts deny 列表 |
|------|------------------------------|-------------------|
| Gate A | 多了 `lint`, `review`, `audit`, `fix`, `preview` | `write_code`, `spawn_impl`, `spawn_test`, `build`, `deploy` |

**影响**: 当前代码仅检查 `allow` 列表，deny 列表未在逻辑中使用，因此**不影响当前功能**。但这是"双源真理"反模式：
- 未来若有人基于 deny 列表添加逻辑（如更详细的错误提示），会得到误导性结果。
- `gates.ts` 更新时 hook.ts 不会同步，导致逻辑分歧。
- 注释写明"本地副本 — 避免跨模块循环依赖"，但该依赖实际上并不存在（hook.ts 不导入 gates.ts 是因为它是 CLI 入口文件，但可以共享同一个数据常量文件）。

**严重度**: **[FIX_REQUIRED]** — 数据完整性风险，维护债务。

**建议修复**:
- 方案 A（推荐）：将 `GATE_OPERATIONS` 从 `gates.ts` 导出到独立常量文件（如 `src/engine/gate-ops.ts`），hook.ts 和 gates.ts 共同导入。去除 deny 列表（代码不使用），精简常量。
- 方案 B：统一 hook.ts 的 GATE_OPS 与 gates.ts 的 GATE_OPERATIONS 值（删除多余 deny 项），并添加注释：`// 与 src/engine/gates.ts 中的 GATE_OPERATIONS 保持同步`。

---

### [WARNING] #3: tool.execute.before 中 execSync 未包裹 try/catch

**文件**: `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts:50-54`

**证据**:
```typescript
'tool.execute.before': async (input: any) => {
  const toolName = getToolName(input);
  if (BLOCKABLE_TOOLS.has(toolName)) {
    const result = execSync('jarvis hook gate-check', {  // ← 无 try/catch
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 10_000,
    });
    if (result.includes('NOT met') || result.includes('BLOCKED')) {
      throw new Error(`[Jarvis] Gate BLOCKED: ${result.trim()}`);
    }
  }
},
```

**影响**: 若 `jarvis` CLI 未安装或引擎未运行，`execSync` 抛出异常未被捕获，会向上传播到 OpenCode 插件框架，可能中断整个 Agent 会话。而 `tool.execute.after` 中的同类调用已正确包裹 try/catch。

**严重度**: **[WARNING]** — 与 `tool.execute.after` 的错误处理策略不一致，可能导致 Agent 意外中断。

**建议修复**: 与 `tool.execute.after` 保持一致，包裹 try/catch：
```typescript
try {
  const result = execSync('jarvis hook gate-check', { ... });
  if (result.includes('NOT met') || result.includes('BLOCKED')) {
    throw new Error(`[Jarvis] Gate BLOCKED: ${result.trim()}`);
  }
} catch (err: any) {
  if (err.stderr) console.error('[Jarvis] Gate check failed:', err.stderr.trim());
  // 引擎不可达时允许通过（降级策略），避免阻断 Agent
}
```

---

### [WARNING] #4: postEvent 未检查 HTTP 响应状态码 — 事件静默丢失

**文件**: `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts:23-33`
`src/engine/server.ts` 的 routes.ts（无对应 POST 处理器）

**证据**:
```typescript
async function postEvent(path: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
    });  // ← 未检查 response.ok
  } catch {
    // 引擎不可达时静默降级 [OK]
  }
}
```

同时，引擎端 `routes.ts` 中：
- `GET /api/events` — SSE 流端点，无 `POST` 处理器
- `GET /api/pipeline` — 流水线查询端点，无 `POST` 处理器

**影响**: `session.idle`、`session.error`、`permission.asked` 和 `tool.execute.after` 四个钩子中的事件上报实际全部**静默丢失**，因为接收端没有 POST 处理器。Hono 对未匹配方法的请求返回 404，而 `fetch()` 不因 HTTP 4xx 状态码 reject。

**严重度**: **[WARNING]** — 功能不完整。事件上报是 TASK-001 的核心新功能之一（`session.error`、`permission.asked`），但接收端未实现。功能不阻塞系统运行（静默降级），但用户预期的事件审计记录不会生成。

**建议修复**:
- 在 `routes.ts` 中添加 `POST /api/events` 处理器，接收并持久化事件（写入日志文件或数据库）。
- 或在 `postEvent` 中添加 `response.ok` 检查，至少在开发阶段输出 console.warn 以便调试。

---

### [WARNING] #5: API_BASE 硬编码，与 ENGINE_URL 环境变量模式不一致

**文件**: `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts:16`

**证据**:
```typescript
// 插件中硬编码
const API_BASE = 'http://localhost:3456';

// 与 hook.ts 中的做法不一致：
const ENGINE_URL = process.env.JARVIS_ENGINE_URL || 'http://localhost:3456';
```

**影响**: 非标准端口部署时（如同时运行多个 Jarvis 实例），插件无法通过环境变量适配。hook.ts 已有此模式，插件应保持一致。

**严重度**: **[WARNING]** — 配置刚性，非标准部署场景下不可用。

**建议修复**: 改为 `const API_BASE = process.env.JARVIS_ENGINE_URL || 'http://localhost:3456';`

---

### [WARNING] #6: REST /api/platforms 端点缺少 features 字段

**文件**: `src/web/routes.ts:355-368`

**证据**: MCP `platform_info` 工具新增了 `features` 字段（claude: `['commands']`, opencode: `['plugins']`, codex: `[]`），但同义的 REST 端点 `GET /api/platforms` 未同步更新：

```typescript
// routes.ts:358-366 — 缺少 features 字段
summary[p] = {
  agent_count: agents.length,
  available_models: models[p] || [],
  template_dir: `src/templates/platforms/${p}/`,
  // 缺少: features: PLATFORM_FEATURES[p] || [],
};
```

**影响**: Dashboard 或外部工具通过 REST API 查询平台信息时无法获知平台特性。

**严重度**: **[WARNING]** — MCP 与 REST 数据不一致。

**建议修复**: 添加 `features` 字段，或提取 `PLATFORM_FEATURES` 到共享常量文件，MCP 和 REST 端点共同引用。

---

### [INFO] #7: package.json build 脚本 rmSync 安全性分析 — 安全

**文件**: `package.json:43`

**证据**:
```javascript
try {
  rmSync('dist/src/templates/platforms/opencode/node_modules', { recursive: true, force: true });
} catch {}
```

**分析**:
- 路径是编译输出目录下的固定子路径，不存在用户可控的路径注入。
- `force: true` 是必要的：目录可能存在（首次构建后 `cpSync` 会复制 `node_modules`）也可能不存在（首次构建）。
- try/catch 包裹确保即使路径不存在或权限问题，构建不会因清理步骤失败而中断。
- `rmSync` 只作用于 `dist/` 编译产物目录，不会影响源码。

**严重度**: **[INFO]** — 无安全风险，设计合理。

---

### [INFO] #8: 行为准则 3（精准修改）违规 — jarvis.md 删除了无关章节

**文件**: `src/templates/platforms/opencode/agents/jarvis.md`（diff 行 -5/+1）

**证据**: TASK-003 的任务描述为"修改（1行MCP引用替换）"，实际 diff 包含：
1. MCP 引用替换（符合任务描述）：`mcp__jarvis-engine__gate_enforce` → `jarvis-gate-check`
2. 额外删除（不在任务描述内）：`## 必读规范` 章节（4行），该章节内容为"开始任何分析、规划、审查或实现前，必须先读取任务范围内的根 AGENTS.md..."

**违反准则**:
- 准则 3（精准修改）："每个改动行都应能直接追溯到用户的请求"、"不'优化'相邻代码、注释或格式"

**严重度**: **[INFO]** — 不影响功能，但违反精准修改原则。若此删除为有意的架构决策（如"规范读取逻辑已移至 behavioral-guidelines 技能"），应在 PR 描述中说明。

---

## 四、必须修复项

| # | 严重度 | 描述 | 文件 |
|---|--------|------|------|
| 1 | **[FIX_REQUIRED]** | 命令注入：工具文件中 `execSync` 直接拼接用户参数 | `tools/jarvis-gate-check.ts`, `tools/jarvis-gate-advance.ts`, `tools/jarvis-agent-config.ts` |
| 2 | **[FIX_REQUIRED]** | GATE_OPS 数据不一致：hook.ts 与 gates.ts 双源真理 | `src/hook.ts:16-25` |

---

## 五、优化建议

| # | 严重度 | 描述 |
|---|--------|------|
| 3 | WARNING | `tool.execute.before` 中 `execSync` 添加 try/catch |
| 4 | WARNING | `postEvent` 检查 HTTP 响应状态码 / 引擎端添加 POST 处理器 |
| 5 | WARNING | `API_BASE` 改为从环境变量读取 |
| 6 | WARNING | REST `/api/platforms` 端点同步添加 `features` 字段 |

---

## 六、测试覆盖评估

| 测试文件 | 用例数 | 通过 | 状态 |
|---------|--------|------|------|
| `tests/gate-hook.test.ts` | 9 | 9 | 全部通过 — 覆盖 before/after/idle/error/permission/错误处理 |
| `tests/tools.test.ts` | 16 | 16 | 全部通过 — 覆盖 5 个工具的正常/异常路径 |
| `tests/mcp-platform-info.test.ts` | 12 | 12 | 全部通过 — 覆盖单平台/全平台/未知平台/数据一致性 |

**测试缺口**:
- `postEvent` 的行为测试不验证 HTTP 响应状态码（当前 mock 返回 `status: 200`），无法发现端点不匹配问题。
- `agent-config` 工具未测试 `effort` 参数无效值场景（工具层无校验，期望 REST API 层捕获）。
- `hook.ts` 的 `report-status` 和 `agent-config` 子命令缺少独立的单元测试（目前仅通过 tools.test.ts 间接测试）。

---

## 七、Residual Risk（审查后仍存在的风险）

1. **事件审计记录不可用**：由于事件接收端点未实现，`session.error` / `permission.asked` 等审计事件不会被持久化。若 Gate D 要求可审计的操作记录，此功能存在证据缺口。
2. **多实例部署**：`API_BASE` 硬编码 + PID 文件固定路径，同一机器上运行两个 Jarvis 实例时端口冲突和状态冲突未处理。
3. **OpenCode 插件框架依赖**：工具文件使用 `@opencode-ai/plugin` 的 `tool()` API，若该库的 API 发生变化（当前为 alpha 阶段），6 个工具文件需同步更新。

---

## 八、变更规模评估

- 总变更行数：~1450 行（含 3 个测试文件 ~660 行）
- 生产代码变更：~790 行
- 评估：偏大但可接受，因为变更覆盖 6 个关联任务且测试代码占比较高。单次审查可行。
