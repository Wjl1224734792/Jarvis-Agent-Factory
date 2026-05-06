# AGENTS.md — 项目级约束

Jarvis Agent Factory 项目级上下文入口。所有智能体启动时必须读取此文件。

> 详细架构见 [CLAUDE.md](./CLAUDE.md) 和 [README.md](./README.md)

## v1.5.13 三平台架构

| | Claude Code | OpenCode | Codex |
|---|------------|----------|-------|
| **入口** | `/` 斜杠命令 + Agent 切换 | 智能体切换 | Skill 触发 |
| **Agents** | 47 | 55 | 45 |
| **Commands** | 15 | 0 | 0 |
| **Skills** | 27 | 27 | 42 |

## 项目类型

跨平台多智能体配置工程（非业务应用代码），三平台：`.claude/`、`.codex/`、`.opencode/`。

## 生命周期流水线

```
想法细化 → 需求澄清 → 任务分解 → 执行规划 → 并行实现 → 代码质量 → 视觉验证 → 测试 → 评审 → 发布
  Gate 0     Gate A     Gate B     Gate C     Gate C     Gate C1   Gate C1.5  Gate C2  Gate D  Gate E
```

## 工作模式

| 模式 | Claude Code | OpenCode | Codex |
|------|------------|----------|-------|
| 全栈编排 | `/jarvis` | 切换到 `jarvis` agent | 加载 `jarvis` skill |
| 前端生命周期 | `/frontend` | 切换到 `frontend` agent | 加载 `frontend` skill |
| 后端生命周期 | `/backend` | 切换到 `backend` agent | 加载 `backend` skill |
| 移动端开发 | `/taro` `/android` `/ios` `/expo` `/flutter` | 切换到对应 agent | 加载对应 skill |
| 浏览器测试 | `/browser-test` | 切换到 `browser-test-worker` | 加载 `browser-test` skill |
| Bug 修复 | `/bug-fix` | 切换到编排者触发 | 加载 `bug-fix` skill |
| 只读审查 | `/review` | 切换到 `review-only` agent | 加载 `review-only` skill |
| 审查修复闭环 | `/review-fix` | 切换到 `review-fix-optimize` agent | 加载 `review-fix-optimize` skill |
| 算法专家 | `/algorithm-expert` | 切换到 `algorithm-expert` agent | 加载 `algorithm-expert` skill |
| 架构对话 | `/frontend-architect` `/backend-architect` | 切换到对应 agent | 加载对应 skill |

## 浏览器自动化

统一使用 **agent-browser** CLI（Vercel Labs，80+ 命令），替代 Claude in Chrome MCP 和 browser-use。

```bash
npm i -g agent-browser && agent-browser install
```

- 快照+引用机制：`agent-browser snapshot -i` → `@e1, @e2` 元素引用
- Chrome profile 复用登录态：`agent-browser --profile "Default" open <url>`
- 网络监控、控制台日志、性能追踪、视觉回归
- Claude Code 额外搭配 Preview MCP 做本地预览

## 关键约束（不可绕过）

1. **禁止凭记忆编码** — 修改前必须读取相关源码、测试、契约
2. **修改技能前先读 writing-skills** — 技能文件需遵循 TDD 规范
3. **三平台技能同步** — `.claude/skills/`、`.codex/skills/`、`.opencode/skills/` 同名目录内容须一致
4. **子智能体不可递归** — 子智能体不得再 spawn 其他子智能体
5. **闸门不可绕过** — Gate A→B→C→C1→C1.5→C2→D→E 顺序不可跳跃
6. **同 Batch 并行** — 无依赖任务必须在同一消息中批量发起
7. **敏感信息不入库** — `.claude/settings.local.json` 和 `.agents/` 已 gitignore
8. **不修改共享区域** — 共享契约/配置变更需提交 plan patch
9. **垂直切片优先** — 任务按端到端功能拆分，非技术层级
10. **Agent 失败重试** — 超时重试最多 2 次 / 3 次全失败标记 BLOCKED

## 技能体系

| 类别 | 技能 |
|------|------|
| **基础** | `behavioral-guidelines` `context-engineering` `using-agent-skills` |
| **需求** | `spec-driven-development` `idea-refine` |
| **规划** | `planning-and-task-breakdown` |
| **实现** | `source-driven-development` `incremental-implementation` `test-driven-development` `code-standards` `code-simplification` |
| **质量** | `code-quality-gate` `code-review-and-quality` `verification-before-completion` |
| **调试** | `debugging-and-error-recovery` |
| **浏览器** | `agent-browser` `browser-testing` |
| **安全** | `security-and-hardening` |
| **流程** | `shipping-and-launch` `git-workflow-and-versioning` `finishing-a-development-branch` |
| **文档** | `chinese-documentation` `documentation-and-adrs` `writing-skills` |
| **探索** | `find-docs` `find-skills` |
| **工具** | `mcp-builder` |

## 智能体体系

### 实现类
`frontend-implementer` `frontend-ui-worker` `frontend-state-worker` `frontend-test-worker` `backend-implementer` `backend-api-worker` `backend-service-worker` `backend-data-worker` `backend-test-worker` `taro-worker` `taro-ui-worker` `taro-state-worker` `android-worker` `android-ui-worker` `android-state-worker` `ios-worker` `ios-ui-worker` `ios-state-worker` `react-native-worker` `rn-ui-worker` `rn-state-worker` `flutter-worker` `flutter-ui-worker` `flutter-state-worker`

### 测试类
`browser-test-worker` `e2e-test-worker` `performance-test-worker`

### 规划评审类
`task-design` `planner` `review-qa`

### 审查类
`diff-code-reviewer` `project-audit-reviewer` `performance-audit-reviewer` `security-auditor` `post-change-reviewer` `remediation-planner` `remediation-worker`

### 架构/专家类
`algorithm-expert` `frontend-architect` `backend-architect` `database-specialist`

### 探索/支撑类
`repo-explorer` `docs-researcher` `api-docs-worker` `infra-worker`

### 编排主控类（OpenCode Primary）
`jarvis` `frontend` `backend` `android` `ios` `flutter` `expo` `taro` `review-only` `review-fix-optimize`
