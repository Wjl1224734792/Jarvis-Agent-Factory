# Autopilot Spec: 低优先级项完善

## 差距 1：15 个 orphan skills 未在命令中加载

### 现状
15 个技能模板目录存在于 `src/templates/platforms/claude/skills/` 但从未被任何命令通过 `Skill()` 加载。之前假设它们由 agent .md 提示词内部加载——但验证后发现 agent 提示词中也未引用。

### 修复方案
按语义分配给对应命令的步骤 0（初始化阶段加载）：

| Skill | 分配命令 | 理由 |
|-------|---------|------|
| `chinese-documentation` | `/sync` `/jarvis` | 文档维护和中文项目开发 |
| `code-review-and-quality` | `/review` `/review-fix` | 代码审查和质量把关 |
| `context-engineering` | `/jarvis` `/auto` | 上下文工程是编排基础 |
| `debugging-deep` | `/debug` | 深度调试补充基础调试技能 |
| `documentation-and-adrs` | `/sync` `/research` | 文档和架构决策记录 |
| `frontend-design` | `/frontend` | 前端设计 |
| `incremental-implementation` | `/jarvis` `/auto` | 增量实现模式 |
| `perf-testing` | `/test-perf` | 性能测试 |
| `security-testing` | `/test-security` | 安全测试 |
| `test-data-factory` | `/test-unit` `/test-integration` | 测试数据生成 |
| `verification-before-completion` | `/jarvis` `/auto` | 完成前验证 |
| `find-docs` | (系统级，不修改) | 由 CLI 自动加载 |
| `find-skills` | (系统级，不修改) | 由 CLI 自动加载 |
| `mcp-builder` | (保留备用) | 特殊工具类，不常加载 |
| `writing-skills` | (系统级，不修改) | 技能编写时手动调用 |
| `browser-use` | `/browser-explore` `/browser-test` | 浏览器自动化 |

## 差距 2：browser-use skill 未加载

### 修复
在 `/browser-explore` 和 `/browser-test` 命令的步骤 0 中加载 `browser-use` 技能（与 `agent-browser` 配合使用）。

## 差距 3：平台 Agent 不在 GATE_AGENT_GUIDE

### 现状
34 个移动端/跨端 Agent（android/flutter/ios/react-native/taro/expo 的 dev/ui/state/test/review）只通过各自的命令模板（`/android`, `/flutter` 等）直接路由，不在 `GATE_AGENT_GUIDE` 管道注册中。

### 修复方案（参考 OMC 插件路由模式）
参考 OMC `autopilot`（任务→自动选流水线）和 `ralplan`（自动路由到最优审查者）的设计：

1. **在 GATE_AGENT_GUIDE 中添加平台 Agent 的"按需路由"备注** —— 不修改 `can_spawn` 列表（保持管道纯净），但在 note 中添加"平台任务→spawn 对应平台 Agent"的指引

2. **增强 `/auto` 命令的平台路由** —— 当检测到移动端/跨端平台任务时，自动路由到 `/android` `/ios` `/flutter` `/expo` `/taro` `/react-native` 等平台命令，由这些命令各自的 Gate 序列执行

3. **平台命令的 GATE_AGENT_GUIDE 自洽** —— 每个平台命令内部有完整的 Agent spawn 逻辑，不需要在主 GATE_AGENT_GUIDE 中重复注册

### 实际改动
- 在 GATE_AGENT_GUIDE 中添加平台 Agent 的 `can_spawn` 到实现门（Gate C-impl）中，使平台 Agent 在 Team 模式下也可通过管道调度
- 注意：平台 Agent 数量多（34个），需要合理分组避免 `can_spawn` 列表过长

## 实现范围

### 命令模板修改（添加 Skill 加载）

1. `/debug` — 添加 `Skill("debugging-deep")`
2. `/frontend` — 添加 `Skill("frontend-design")`
3. `/jarvis` — 添加 `Skill("context-engineering")` `Skill("incremental-implementation")` `Skill("verification-before-completion")`
4. `/review` — 添加 `Skill("code-review-and-quality")`
5. `/review-fix` — 添加 `Skill("code-review-and-quality")`
6. `/research` — 添加 `Skill("documentation-and-adrs")`
7. `/sync` — 添加 `Skill("chinese-documentation")` `Skill("documentation-and-adrs")`
8. `/test-perf` — 添加 `Skill("perf-testing")`
9. `/test-security` — 添加 `Skill("security-testing")`
10. `/test-unit` — 添加 `Skill("test-data-factory")`
11. `/test-integration` — 添加 `Skill("test-data-factory")`
12. `/browser-explore` — 添加 `Skill("browser-use")`
13. `/browser-test` — 添加 `Skill("browser-use")`
14. `/auto` — 添加 `Skill("context-engineering")` `Skill("incremental-implementation")` `Skill("verification-before-completion")`

### GATE_AGENT_GUIDE 修改

将平台实现 Agent（14个 -dev-expert/-ui-expert/-state-expert）添加到 Gate C-impl
将平台测试 Agent（6个）添加到 Gate C2
将平台审查 Agent（6个）添加到 Gate D

### 文档同步

- AGENTS.md 技能表更新覆盖说明
- README.md 版本摘要更新
