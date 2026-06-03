<!-- Generated: 2026-06-03T16:32:00+08:00 -->
<!-- Parent: ../AGENTS.md -->

# templates — Agent/Command/Skill 模板数据层

## Purpose
Jarvis 的"内容层"——所有 AI Agent 定义（88 个）、命令定义（43 条）、技能定义（34 个）和 Hook 配置（5 个）的模板。这些 `.md` 文件在 `jarvis init` 时安装到用户项目，构成 Claude Code 插件的内容基础。

## Architecture

```
templates/
├── memory/                    # 记忆模板（context/decisions/notes）
└── platforms/claude/
    ├── agents/                # 88 个 Agent 定义 (.md)
    │   ├── frontend-*         # 前端（5 实现 + 2 测试/审查）
    │   ├── backend-*          # 后端（6 实现 + 4 测试/审查）
    │   ├── react-* / vue-*    # Web 框架（各 5）
    │   ├── flutter-* / expo-* # 移动端（各 5）
    │   ├── swift-* / kotlin-* # 原生（各 5）
    │   ├── taro-* / uni-app-* / miniprogram-* # 小程序（各 5）
    │   ├── *-review-* / *-test-* # 审查/测试通用
    │   └── 工具/通用（planner/remediation/code-explore 等）
    ├── commands/              # 43 条命令定义 (.md)
    ├── skills/                # 34 个技能定义 (SKILL.md)
    │   ├── behavioral-guidelines/
    │   ├── code-standards/
    │   ├── browser-testing/
    │   ├── jarvis-reference/
    │   └── ...（31 个更多）
    └── hooks/                 # 5 个 Hook 配置
        ├── PreToolUse.md      # Gate 权限硬约束
        ├── PostToolUse.md     # 产物自动记录
        ├── SessionStart.md    # 引擎注册提醒
        ├── Stop.md            # 会话结束归档
        └── UserPromptSubmit.md # 命令路由检测
```

## Key Statistics

| 类别 | 数量 |
|------|------|
| Agents | 88 |
| Commands | 43 |
| Skills | 34 |
| Hooks | 5 |

## Agent Categories

| 类别 | 数量 | 示例 |
|------|------|------|
| 前端实现 | 5 | frontend-dev/ui/state-expert, frontend-architect, frontend-debug-expert |
| 前端测试/审查 | 2 | frontend-review/test-expert |
| 后端实现 | 6 | backend-dev/api/logic/data-expert, backend-architect, database-architect |
| 后端测试/审查 | 4 | backend-review/test-expert, api-test/contract-expert |
| React | 5 | react-dev/ui/state/review/test-expert |
| Vue | 5 | vue-dev/ui/state/review/test-expert |
| Flutter | 5 | flutter-dev/ui/state/review/test-expert |
| Expo | 5 | expo-dev/ui/state/review/test-expert |
| Swift | 5 | swift-dev/ui/state/review/test-expert |
| Kotlin | 5 | kotlin-dev/ui/state/review/test-expert |
| Taro | 5 | taro-dev/ui/state/review/test-expert |
| uni-app | 5 | uni-app-dev/ui/state/review/test-expert |
| 小程序 | 5 | miniprogram-dev/ui/state/review/test-expert |
| 移动架构 | 1 | mobile-architect |
| 测试通用 | 5 | browser-test/e2e/perf-test-expert, test-doc-writer, test-executor |
| 审查通用 | 8 | review-only/qa/security/perf/project/diff/change-review-expert, review-fix-optimize |
| 工具/通用 | 12 | planner, task-design, code-explore, remediation, docs-engineer, verify 等 |

## Skill Categories

| 类别 | 技能 |
|------|------|
| 基础/方法论 | behavioral-guidelines, source-driven-development, code-standards, context-engineering, concurrency-policy |
| 实现 | incremental-implementation, spec-driven-development, test-driven-development, mcp-builder, frontend-design |
| 测试 | browser-testing, test-data-factory, perf-testing, security-testing |
| 审查/质量 | code-review-and-quality, code-simplification, refactoring, verification-before-completion |
| 流程 | git-workflow-and-versioning, finishing-a-development-branch, shipping-and-launch, documentation-and-adrs, planning-and-task-breakdown |
| 特殊/工具 | code-quality-gate, debugging-deep, security-and-hardening, session-memory, chinese-documentation |

## For AI Agents
- **新增 Agent**: 在 `agents/` 创建 `.md`，frontmatter 含 name/description/tools/model/effort
- **新增命令**: 在 `commands/` 创建 `.md`，frontmatter 含 name/description/model/argument-hint
- **新增技能**: 在 `skills/` 创建目录 + `SKILL.md`
- **所有新增必须同步更新** `skills/jarvis-reference/SKILL.md`

<!-- MANUAL:START -->
<!-- MANUAL:END -->
