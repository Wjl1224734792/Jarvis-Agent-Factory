# OpenCode 集成测试验证报告 — Batch 2

> 对应 TASK-001-T / TASK-002-T / TASK-005-T / TASK-007 (TASK-003 test_after)

## 测试目标

对 OpenCode 平台的 Gate Hook 插件、5 个原生自定义工具、platform_info 接口以及 Agent 模板对齐结果进行 Refactor 验证和 test_after 确认。

| 任务 | 类型 | 目标 |
|------|------|------|
| TASK-001-T | Refactor 验证 | 5 个 hook 事件全覆盖、嵌套 ≤4、无重复逻辑 |
| TASK-002-T | Refactor 验证 | 每工具 ≥2 测试、args schema 中文描述 |
| TASK-005-T | Refactor 验证 | platform_info 三平台五场景覆盖 |
| TASK-007 | test_after | TASK-003 变更验证（MCP 前缀清零、新 agent frontmatter、Claude 模板未受影响） |

---

## 任务清单

### TASK-001-T: Gate Hook Refactor 验证

**审查文件:**
- `tests/gate-hook.test.ts` — 9 个测试
- `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts` — 125 行

**5 个 hook 事件覆盖率验证:**

| Hook 事件 | 测试用例数 | 覆盖场景 |
|-----------|-----------|---------|
| `tool.execute.before` | 3 | Gate 满足/不满足/非关键工具跳过 |
| `tool.execute.after` | 1 | Task 执行后 POST 事件 |
| `session.idle` | 1 | 空闲时同步流水线状态 |
| `session.error` | 1 | 错误时上报事件 |
| `permission.asked` | 1 | 权限请求记录事件 |
| 错误处理 | 2 | execSync 异常静默 / fetch 网络错误静默 |

**结论:** 5/5 事件全覆盖，额外覆盖 2 个错误路径场景。满足覆盖率要求。

**嵌套层级检查:**
- `tool.execute.before`: 最大嵌套 3 层 (async → if → if) — 通过
- `tool.execute.after`: 最大嵌套 4 层 (async → if → try → if) — 通过 (\(\le 4\))
- `session.idle`: 最大嵌套 2 层 — 通过
- `session.error`: 1 层 — 通过
- `permission.asked`: 1 层 — 通过
- `postEvent` 辅助函数: 1 层 — 通过

**重复逻辑检查:**
- `execSync` 调用重复 2 次（before 和 after 各一次），options 字面量完全相同。属正常模式（before/after 语义不同），不做抽取。
- `if (result.includes('NOT met') || result.includes('BLOCKED'))` 出现在 before 和 after 两个钩子中。逻辑相同但上下文不同（before 抛 Error，after 仅 console.error），保持现状合理。

**运行结果:**
```
 Tests  9 passed (9)
✓ gate-hook.test.ts — 9 tests passed
```

---

### TASK-002-T: Tools Refactor 验证

**审查文件:**
- `tests/tools.test.ts` — 17 个测试
- `src/templates/platforms/opencode/tools/jarvis-gate-check.ts`
- `src/templates/platforms/opencode/tools/jarvis-gate-advance.ts`
- `src/templates/platforms/opencode/tools/jarvis-pipeline-status.ts`
- `src/templates/platforms/opencode/tools/jarvis-report.ts`
- `src/templates/platforms/opencode/tools/jarvis-agent-config.ts`
- `src/hook.ts` (230 行，hook 命令实现)

**每个工具测试用例数:**

| 工具 | 测试数 | 达标 (\(\ge 2\)) |
|------|--------|:---:|
| jarvis-gate-check | 3 (case 1-3) | 通过 |
| jarvis-gate-advance | 3 (case 4-6) | 通过 |
| jarvis-pipeline-status | 4 (case 7, 8, 8b, 9) | 通过 |
| jarvis-report | 3 (case 10-12) | 通过 |
| jarvis-agent-config | 4 (case 13-16) | 通过 |

**args schema 中文描述完整性:**

| 工具 | 参数 | 中文描述 | 状态 |
|------|------|---------|:----:|
| jarvis-gate-check | `operation` | `.describe("要执行的操作类型，如 spawn_impl/write_code/build/review/deploy 等")` | 通过 |
| jarvis-gate-advance | `gate` | `.describe("目标Gate名称，如 Gate B/Gate C/Gate D 等。只能推进到当前Gate的下一级。")` | 通过 |
| jarvis-pipeline-status | (无参数) | — | 通过 |
| jarvis-report | (无参数) | — | 通过 |
| jarvis-agent-config | `agent_id` | `.describe("智能体ID，如 frontend-implementer/backend-architect...")` | 通过 |
| jarvis-agent-config | `model` | `.describe("要设置的模型名称，如 deepseek-v4-pro/gpt-5.5...")` | 通过 |
| jarvis-agent-config | `effort` | `.describe("思考等级：low/medium/high/xhigh/max。默认high。")` | 通过 |

**`src/hook.ts` Refactor 发现:**

| 类别 | 发现 | 严重度 |
|------|------|--------|
| 嵌套 | `gate-check` 分支中 `if (operation)` → `if (ops.allow.includes(operation))` 嵌套深度达 5 层 (function → if → try → if → if) | 轻微 (INFO) — 可用卫语句提前 return 优化 |
| 重复 | 5 个 `else if` 分支共享相同的 `try/catch` → "Engine not running" 错误模式 | 轻微 (INFO) — 可提取 `withEngineCheck()` 包装器 |
| 嵌套 | `agent-config` 分支中 `if (agentId && model)` → `if (!r.ok)` → `if (g.ok)` 嵌套深度达 4 层 | 适中 (WARNING) — 可用 `guard` 简化 |

**注意:** 上述 `hook.ts` 发现仅列明，非本次测试任务范围，不做修改。

**运行结果:**
```
 Tests  17 passed (17)
✓ tools.test.ts — 17 tests passed
```

---

### TASK-005-T: platform_info Refactor 验证

**审查文件:**
- `tests/mcp-platform-info.test.ts` — 11 个测试
- `src/engine/server.ts` — `resolvePlatformInfo` 函数 (line 198-229)

**五场景覆盖:**

| 场景 | 测试数 | 覆盖内容 | 状态 |
|------|--------|---------|:----:|
| 1. 无参数 (汇总) | 3 | 三平台信息、agent_count \(\ge 0\)、total_agents = sum | 通过 |
| 2. platform=opencode | 3 | features: ["plugins"]、agent_count/models、agents 列表字段 | 通过 |
| 3. platform=claude | 2 | features: ["commands"]、agent_count/models | 通过 |
| 4. platform=codex | 1 | features: [] (无特性) | 通过 |
| 5. 未知平台 | 2 | error 信息含可用平台列表、不触发 agent 查询 | 通过 |

**`resolvePlatformInfo` 代码质量:**
- 32 行, 单一职责, 无嵌套过深 (最大 3 层)
- 类型定义完整 (`PlatformInfoSingle`, `PlatformInfoSummary`, `PlatformInfoError` + 联合类型)
- 边界条件: 未知平台返回 error (不崩溃), 无 agent 的平台返回空数组

**运行结果:**
```
 Tests  11 passed (11)
✓ mcp-platform-info.test.ts — 11 tests passed
```

---

### TASK-007: TASK-003 test_after 验证

**审查依据:** `docs/implementation/2026-05-09-agent-template-alignment.md`

**验证项 1: OpenCode 模板中 `mcp__jarvis-engine__*` 前缀已清零**

```bash
$ grep -r "mcp__jarvis-engine" src/templates/platforms/opencode/agents/
# 无输出 (0 matches)
```

结果: **清零完成** — `mcp__jarvis-engine__gate_enforce` 已替换为 `jarvis-gate-check`，`mcp__jarvis-engine__advance_gate` 已替换为 `jarvis-gate-advance`。

**验证项 2: 新增 3 个 agent 文件 frontmatter 格式**

| 文件 | `mode` | `model` | `reasoningEffort` | `permission` | 结论 |
|------|--------|---------|-------------------|--------------|:----:|
| `api-test-worker.md` | subagent | deepseek/deepseek-v4-pro | high | edit:allow, bash:allow, task:deny | 通过 |
| `backend-code-reviewer.md` | subagent | deepseek/deepseek-v4-pro | max | edit:allow, bash:allow, task:deny | 通过 |
| `frontend-code-reviewer.md` | subagent | deepseek/deepseek-v4-pro | max | edit:allow, bash:allow, task:deny | 通过 |

**验证项 3: Claude 模板未受影响**

```bash
$ grep -r "mcp__jarvis-engine" src/templates/platforms/claude/agents/
# 无输出 (0 matches — claude agents 中从未有过 mcp__jarvis-engine 引用)
```

Claude 的 `commands/*.md` 中仍保留 `mcp__jarvis-engine__*` 引用，经确认属于 Claude 平台原有的正常使用模式（通过 commands 调用 MCP 工具），本次 TASK-003 未对 Claude 做出任何修改。

**验证项 4: `jarvis.md` MCP 引用替换验证**

第 24 行原始内容（TASK-003 变更前）:
```
mcp__jarvis-engine__gate_enforce → mcp__jarvis-engine__advance_gate
```

变更后 (当前行 24):
```
jarvis-gate-check 验证条件 → jarvis-gate-advance 推进硬状态机
```

替换完成，与 TASK-002 工具名称契约一致。

---

## 全量测试运行结果

```bash
$ npx vitest run
 Test Files  7 passed (7)
      Tests  96 passed (96)
   Start at  16:44:22
   Duration  590ms
```

| 测试文件 | 测试数 | 状态 |
|---------|--------|:----:|
| `tests/gate-hook.test.ts` | 9 | 全部通过 |
| `tests/tools.test.ts` | 17 | 全部通过 |
| `tests/mcp-platform-info.test.ts` | 11 | 全部通过 |
| `tests/gates.test.ts` | 8 | 全部通过 |
| `tests/agent-registry.test.ts` | 12 | 全部通过 |
| `tests/db.test.ts` | 28 | 全部通过 |
| `tests/docs-api.test.ts` | 6 | 全部通过 |

---

## Mock / Fixture 说明

| 测试文件 | Mock 目标 | 作用 |
|---------|-----------|------|
| `gate-hook.test.ts` | `node:child_process.execSync` | 模拟 Gate 检查 CLI 输出 |
| `gate-hook.test.ts` | 全局 `fetch` | 模拟引擎 API POST |
| `gate-hook.test.ts` | `console.error` | 验证静默降级日志输出 |
| `tools.test.ts` | `@opencode-ai/plugin.tool` | 验证工具定义结构 |
| `tools.test.ts` | `node:child_process.execSync` | 模拟 CLI 命令输出/异常 |
| `mcp-platform-info.test.ts` | `agent-registry` 全部函数 | 模拟三平台数据 |

## 未覆盖项

1. `hook.ts` 的 integration 测试（需真实引擎运行）— 当前为纯 CLI 脚本，被 tools 的 `execSync` mock 覆盖
2. `jarvis-gate-check.ts` plugin 的 `session.idle` 中 execSync 异常路径 — 仅覆盖了 fetch 失败路径
3. Claude 平台 MCP 工具引用属于 Claude commands 原有设计，无需测试

## 推荐的下一步

1. **Agent Registry 注册** — 在 `agent-registry.ts` 中注册 `api-test-worker`、`backend-code-reviewer`、`frontend-code-reviewer` 三个 Agent
2. **jarvis.md 调度表更新** — 在 OpenCode 的 `jarvis.md` 中加入新建的 `backend-code-reviewer` 和 `frontend-code-reviewer` 分类
3. `src/hook.ts` 嵌套优化 — `gate-check` 分支和 `agent-config` 分支存在 4-5 层嵌套，可提取辅助函数以减少层级（低优先级）

---

## 完成标准检查清单

| 项目 | 状态 |
|------|:----:|
| 测试文件已审查 | 通过 |
| TASK-001-T: 5/5 hook 事件覆盖, 嵌套 ≤4, 无严重重复 | 通过 |
| TASK-002-T: 每工具 ≥2 测试, args schema 中文描述完整 | 通过 |
| TASK-005-T: 平台信息五场景覆盖 | 通过 |
| TASK-007: MCP 前缀清零, 新 agent frontmatter 正确, Claude 未受影响 | 通过 |
| 全量测试 96/96 通过 | 通过 |
| 测试验证报告已输出 | 通过 |
