# Agent 模板对齐实现报告 — TASK-003

## 当前实现目标
对齐 OpenCode Agent 模板集与 Claude Agent 模板集：按功能维度对比并补全缺失项、统一 frontmatter 格式、替换 OpenCode 模板中的 MCP 工具引用前缀。

## 对应需求 ID / 任务 ID
- REQ-003
- TASK-003

## 输入依据
- Execution Packet: TASK-003（本任务描述）
- TASK-002 的工具名称契约（5 个工具名）
- 两个平台的现有 Agent 模板文件

## 变更文件 / 变更范围

### 修改文件（1 个）
| 文件 | 变更说明 |
|------|---------|
| `src/templates/platforms/opencode/agents/jarvis.md` | 替换第 24 行 MCP 工具引用前缀 |

### 新增文件（3 个）
| 文件 | 对应 Claude 模板 | 功能角色 |
|------|-----------------|---------|
| `src/templates/platforms/opencode/agents/api-test-worker.md` | `api-test-expert.md` | API 功能测试 |
| `src/templates/platforms/opencode/agents/backend-code-reviewer.md` | `backend-review-expert.md` | 后端代码审查 |
| `src/templates/platforms/opencode/agents/frontend-code-reviewer.md` | `frontend-review-expert.md` | 前端代码审查 |

### 未修改的路径
- Claude 模板（`src/templates/platforms/claude/agents/*.md`）：**零变更**
- 禁止路径（plugins/、tools/、engine/、web/）：**未触碰**

## 实现说明

### 步骤 1：清单对比

**数量汇总：**
| 指标 | Claude | OpenCode（变更前） | OpenCode（变更后） |
|------|--------|-------------------|-------------------|
| 总文件数 | 53 | 58 | 61 |
| 功能性 Agent | 53 | 50 | 53 |
| 元编排 Agent | 0 | 8 | 8 |

**功能性差异（变更前）：**

OpenCode 缺失的 3 个功能角色：
1. **API 功能测试** — Claude: `api-test-expert` / OpenCode 已新增: `api-test-worker`
2. **后端代码审查** — Claude: `backend-review-expert` / OpenCode 已新增: `backend-code-reviewer`
3. **前端代码审查** — Claude: `frontend-review-expert` / OpenCode 已新增: `frontend-code-reviewer`

OpenCode 多出的 8 个 Agent（`android.md`、`backend.md`、`expo.md`、`flutter.md`、`frontend.md`、`ios.md`、`jarvis.md`、`taro.md`）均为 `mode: primary` 的元编排 Agent，是 OpenCode 平台独有的编排架构（类似不同技术栈的入口编排器）。Claude 平台使用不同的编排模型，无需对应创建。

**完整功能映射表（53 对）：**

| Claude Agent | OpenCode Agent | 功能维度 |
|-------------|---------------|---------|
| algorithm-expert | algorithm-expert | 算法设计 |
| android-dev-expert | android-worker | Android 开发 |
| android-state-expert | android-state-worker | Android 状态 |
| android-ui-expert | android-ui-worker | Android UI |
| api-contract-expert | api-docs-worker | API 文档/契约 |
| api-test-expert | **api-test-worker** (NEW) | API 测试 |
| backend-api-expert | backend-api-worker | 后端 API |
| backend-architect | backend-architect | 后端架构 |
| backend-data-expert | backend-data-worker | 后端数据层 |
| backend-dev-expert | backend-implementer | 后端全栈实现 |
| backend-logic-expert | backend-service-worker | 后端业务逻辑 |
| backend-review-expert | **backend-code-reviewer** (NEW) | 后端审查 |
| backend-test-expert | backend-test-worker | 后端测试 |
| browser-test-expert | browser-test-worker | 浏览器测试 |
| change-review-expert | post-change-reviewer | 变更后审查 |
| code-explore-expert | repo-explorer | 仓库探索 |
| database-architect | database-specialist | 数据库架构 |
| diff-review-expert | diff-code-reviewer | Diff 审查 |
| docs-research-expert | docs-researcher | 文档研究 |
| e2e-test-expert | e2e-test-worker | E2E 测试 |
| fix-retest | fix-retest | 修复重测 |
| flutter-dev-expert | flutter-worker | Flutter 开发 |
| flutter-state-expert | flutter-state-worker | Flutter 状态 |
| flutter-ui-expert | flutter-ui-worker | Flutter UI |
| frontend-architect | frontend-architect | 前端架构 |
| frontend-dev-expert | frontend-implementer | 前端全栈实现 |
| frontend-review-expert | **frontend-code-reviewer** (NEW) | 前端审查 |
| frontend-state-expert | frontend-state-worker | 前端状态 |
| frontend-test-expert | frontend-test-worker | 前端测试 |
| frontend-ui-expert | frontend-ui-worker | 前端 UI |
| infra-deploy-expert | infra-worker | 基础设施 |
| ios-dev-expert | ios-worker | iOS 开发 |
| ios-state-expert | ios-state-worker | iOS 状态 |
| ios-ui-expert | ios-ui-worker | iOS UI |
| perf-review-expert | performance-audit-reviewer | 性能审查 |
| perf-test-expert | performance-test-worker | 性能测试 |
| planner | planner | 执行规划 |
| project-review-expert | project-audit-reviewer | 项目审查 |
| qa-review-expert | review-qa | 质量审查 |
| react-native-dev-expert | react-native-worker | RN 开发 |
| react-native-state-expert | rn-state-worker | RN 状态 |
| react-native-ui-expert | rn-ui-worker | RN UI |
| remediation-expert | remediation-worker | 修复执行 |
| remediation-planner | remediation-planner | 修复规划 |
| review-fix-optimize | review-fix-optimize | 审查修复优化 |
| review-only | review-only | 只读审查 |
| security-review-expert | security-auditor | 安全审查 |
| taro-dev-expert | taro-worker | Taro 开发 |
| taro-state-expert | taro-state-worker | Taro 状态 |
| taro-ui-expert | taro-ui-worker | Taro UI |
| task-design | task-design | 任务分解 |
| test-executor | test-executor | 测试执行 |
| test-doc-writer | test-doc-writer | 测试文档 |

### 步骤 2：Frontmatter 格式检查

对全部 58 个原始 OpenCode Agent 逐一检查，结果：
- `mode:` 字段：58/58 存在
- `permission:` 字段：58/58 存在
- `reasoningEffort:` 字段：58/58 存在
- `model:` 字段：58/58 存在
- `name:` 字段：0/58 存在（OpenCode 规范以文件名为 agent name，无需 frontmatter name 字段）
- `color:` 字段：8 个 `mode: primary` 元编排 Agent 带有（Android/Backend/Frontend/iOS/Flutter/Expo/Taro/Jarvis），属平台特有约定

**结论：** 所有现有 OpenCode Agent 的 frontmatter 格式已符合规范，无需修正。

新增的 3 个 Agent 均使用标准 OpenCode frontmatter 格式：
```yaml
---
description: "..."
mode: subagent
model: deepseek/deepseek-v4-pro
reasoningEffort: max (或 high)
permission:
  edit: allow
  bash: allow
  task: deny
---
```

### 步骤 3：MCP 工具引用替换

**搜索结果：** 仅 `jarvis.md` 第 24 行包含 2 处 MCP 引用。

**替换明细：**

| 原始引用 | 替换为 | 匹配的工具契约 |
|---------|--------|-------------|
| `mcp__jarvis-engine__gate_enforce` | `jarvis-gate-check` | 对应 TASK-002 gate_check |
| `mcp__jarvis-engine__advance_gate` | `jarvis-gate-advance` | 对应 TASK-002 advance_gate |

替换后搜索验证：OpenCode agents 目录下 `mcp__jarvis-engine__` 引用 = 0 处。

Claude 模板搜索验证：`mcp__jarvis-engine__` 引用 = 0 处（Claude 模板自身不含 MCP 引用，因此未受影响）。

### 步骤 4：新增 Agent 内容适配

新增的 3 个 Agent 模板基于 Claude 源码改编，适配要点：
1. **Frontmatter 格式**：Claude `name:` + `tools:` + `effort:` → OpenCode `mode:` + `permission:` + `reasoningEffort:`
2. **术语替换**：
   - `编排者` → `主 Build Agent`
   - `backend-dev-expert` → `backend-implementer`
   - `backend-api-expert` → `backend-api-worker`
   - `backend-logic-expert` → `backend-service-worker`
   - `backend-data-expert` → `backend-data-worker`
   - `qa-review-expert` → `review-qa`
   - `api-contract-expert` → `api-docs-worker`
   - `security-review-expert` → `security-auditor`
   - `perf-review-expert` → `performance-audit-reviewer`
   - `diff-review-expert` → `diff-code-reviewer`
3. **技能加载格式**：Claude 的 `Skill(skill="...")` 调用方式 → OpenCode 的内联行为准则块

## 测试和验证结果

| 验证项 | 方法 | 结果 |
|--------|------|------|
| OpenCode MCP 引用清零 | `grep mcp__jarvis-engine__ **/*.md` | 0 matches |
| Claude 模板未受影响 | `git diff src/templates/platforms/claude/` | 无变更 |
| 新文件 frontmatter 完整性 | Read 验证 mode/permission/reasoningEffort/model | 全部通过 |
| 功能角色一一对应 | 逐文件对比 | 53/53 覆盖 |
| 禁止路径未触碰 | `git diff src/templates/platforms/opencode/plugins/` | 无变更（前置修改除外） |

## 数据与接口边界

- 本次变更仅涉及 `src/templates/platforms/opencode/agents/*.md` 模板文件
- 不影响任何运行时数据、API 接口、数据库结构
- 新增的 Agent 名称（`api-test-worker`、`backend-code-reviewer`、`frontend-code-reviewer`）需后续在 Agent Registry 中注册方可被调度使用（此注册不在本任务 scope 内）

## 风险 / 未解决项

1. **Agent Registry 未同步**：新增的 3 个 OpenCode Agent 模板尚未在 `src/engine/agent-registry.ts` 中注册。`agent-registry.ts` 在本任务的 `forbidden_paths` 中，需编排者在后续任务中安排注册。
2. **jarvis.md 中 agent 调度表未更新**：jarvis.md 的代理分类表中未包含新创建的 `backend-code-reviewer` 和 `frontend-code-reviewer`，需编排者在后续任务中补充。
3. **MCP 引用映射的变体**：jarvis.md 中实际使用的是 `gate_enforce` 而非 `gate_check`，当前按功能等价映射为 `jarvis-gate-check`，需与 TASK-002 实现的工具名称最终确认一致。

## 需要前端配合的点
无。本次变更纯后端模板，不涉及前端。

## 推荐的下一步
1. 编排者在 Agent Registry 中注册新增的 3 个 Agent
2. 更新 jarvis.md 中的代理分类表，加入 backend-code-reviewer 和 frontend-code-reviewer
3. TASK-002 完成后验证 gate_check/gate_enforce 工具名一致性
