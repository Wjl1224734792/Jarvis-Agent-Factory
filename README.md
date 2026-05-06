# Jarvis Agent Factory · 贾维斯智能体工厂

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-v1.5.12-green)](https://gitee.com/wujl1124/JarvisAgentFactory/releases)

一套跨平台的多智能体（Multi-Agent）AI 编程助手配置集，定义了一条**从想法到交付的完整软件开发流水线**。支持 Claude Code、OpenCode、Codex 三平台，共享同一套工作流规范与技能体系。

> **当前版本** — Claude Code 47 智能体 + 15 命令，OpenCode 55 智能体 + 15 命令（10 主智能体支持双入口），Codex 45 智能体。跨平台共享 27 个方法论技能（Codex 29 含审查技能）。已集成 browser-use 浏览器自动化测试与 Bug 复现闭环。

> For English readers: [README_EN.md](./README_EN.md)

## 核心概念

**Jarvis（贾维斯）**——唯一的编排中枢，直接与用户对话，通过 Agent/Task 工具调度所有子智能体。子智能体职责单一、不可递归调度，所有阶段必须通过对应闸门（Gate）检查。

### 工作流

```
想法细化 → 需求澄清 → 需求文档 → 任务分解 → 执行规划 → 并行实现 → 代码质量 → 测试验证 → 评审交付 → 安全审计 → 发布上线
   │         │        │         │         │         │         │         │         │         │         │
   └─ 阶段 0           Gate A    Gate B    Gate C    │    Gate C1    Gate C2    Gate D   Gate E1   Gate E2
                                                     │
                                          ┌──────────┘
                                          │ 同 Batch 内任务并行
                                          │ Batch 之间串行等待
                                          └── 无共享依赖 → 可跨 Batch 提前启动
```

### 故障恢复

| 维度 | 策略 |
|------|------|
| **Agent 重试** | 4 种失败类型差异化重试，最多 3 次 |
| **Batch 部分失败** | 成功产物保留，仅重试失败任务 |
| **回滚/中止** | 可修复→重试→回退→中止，同 Gate 最多回退 2 次 |
| **会话检查点** | 每个 Gate 通过后输出检查点，支持中断恢复 |
| **冲突解决** | Plan patch 排队，数据层 > API 层 > UI 层，10 分钟超时 |

## 闭环体系

| # | 闭环 | 触发 | 流程 |
|---|------|------|------|
| 1 | **开发闭环** | `/jarvis` Gate C→C1→C2 | 实现 → 质量检查 → 测试 → 失败回退 |
| 2 | **测试闭环** | `/browser-test` | 写用例 → 浏览器执行 → 截图 → 失败→修复→重测 |
| 3 | **Bug 闭环** | `/bug-fix` | Bug → 浏览器复现 → 定位根因 → 修复 → 验证 |
| 4 | **审查闭环** | `/review-fix` | 初审 → 规划 → 执行 → 验证 → 复审关闭 |
| 5 | **安全闭环** | Gate E | security-auditor → 威胁建模 + CVE + SAST → 修复 → 重扫 |

失败自动路由到修复闭环，最多 2 轮；第 3 轮仍失败标记 BLOCKED 并保留产物。

## 使用方法

### Claude Code（推荐）

```bash
cp -r path/to/.claude/ your-project/
npx skills add browser-use/browser-use@browser-use -g -y
claude
```

**领域开发命令**（完整生命周期 A→B→C→C1→C2→D→E，不可绕过）：

| 命令 | 领域 | 专属 Agent |
|------|------|-----------|
| **`/backend`** | 后端 | backend-implementer, backend-api/data/service-worker, backend-test-worker, database-specialist, performance-test-worker, security-auditor, api-docs-worker, infra-worker |
| **`/frontend`** | 前端 | frontend-implementer, frontend-ui/state-worker, frontend-test-worker, browser-test-worker, e2e-test-worker, performance-audit-reviewer, security-auditor, infra-worker |
| **`/taro`** | Taro 小程序/H5 | taro-worker, taro-ui/state-worker, browser-test-worker, e2e-test-worker |
| **`/android`** | Android | android-worker, android-ui/state-worker, e2e-test-worker |
| **`/ios`** | iOS | ios-worker, ios-ui/state-worker, e2e-test-worker |
| **`/expo`** | Expo 跨端 | react-native-worker, rn-ui/state-worker, browser-test-worker, e2e-test-worker |
| **`/flutter`** | Flutter | flutter-worker, flutter-ui/state-worker, browser-test-worker, e2e-test-worker |

**专项命令**：

| 命令 | 用途 |
|------|------|
| **`/jarvis`** | 全栈流水线编排（跨领域完整生命周期） |
| **`/browser-test`** | 浏览器自动化测试闭环 |
| **`/bug-fix`** | Bug 修复闭环（浏览器复现→修复→验证） |
| **`/review`** | 只读审查模式（不修改文件） |
| **`/review-fix`** | 审查修复优化闭环（初审→规划→执行→验证→复审） |
| **`/algorithm-expert`** | 算法专家（选型/复杂度/性能优化） |
| **`/frontend-architect`** | 前端架构师（技术选型/组件架构/构建策略） |
| **`/backend-architect`** | 后端架构师（微服务/数据库/分布式） |

### OpenCode

```bash
opencode --agent frontend       # 智能体模式（切换至前端编排中枢）
opencode --agent backend        # 智能体模式（切换至后端编排中枢）
opencode --agent jarvis         # 智能体模式（全栈编排中枢）
opencode                        # 命令模式（/jarvis /frontend /backend ...）
```

55 智能体 + 15 命令，**双入口架构**：每个领域同时支持切换主智能体或 `/command` 指令，两种方式等价且各自完整闭环（Gate A→B→C→C1→C2→D→E）。

| 入口 | 方式 | 数量 |
|------|------|------|
| 切换主智能体 | 直接切换到对应 primary agent | 10 个 |
| `/command` 指令 | 在当前智能体装载领域模式 | 15 条 |

### Codex

将 `.codex/` 复制到项目根目录，启动后自动加载编排流程。审查通过技能启用：

```toml
# .codex/config.toml — 完整工作流已配置
# 审查模式: 加载 review-only / review-fix-optimize 技能
```

45 智能体 + 29 技能。

## 智能体体系

| 类别 | 智能体 |
|------|--------|
| **编排中枢（Primary）** | `jarvis`（全栈）、`frontend`、`backend`、`android`、`ios`、`flutter`、`expo`、`taro` |
| **审查主控（Primary）** | `review-only`（只读）、`review-fix-optimize`（审查修复闭环） |
| **规划与评审** | `task-design`、`planner`、`review-qa` |
| **探索与资料** | `repo-explorer`、`docs-researcher` |
| **架构设计** | `algorithm-expert`、`frontend-architect`、`backend-architect`、`database-specialist` |
| **审查与修复** | `project-audit-reviewer`、`diff-code-reviewer`、`performance-audit-reviewer`、`security-auditor`、`remediation-planner`、`remediation-worker`、`post-change-reviewer` |
| **后端实现** | `backend-implementer`、`backend-api-worker`、`backend-service-worker`、`backend-data-worker`、`backend-test-worker` |
| **前端实现** | `frontend-implementer`、`frontend-ui-worker`、`frontend-state-worker`、`frontend-test-worker` |
| **移动端** | `taro-worker`、`android-worker`、`ios-worker`、`react-native-worker`（Expo）、`flutter-worker`（各含 ui/state 子变体，共 15 个） |
| **测试与文档** | `browser-test-worker`、`e2e-test-worker`、`performance-test-worker`、`api-docs-worker` |
| **基础设施** | `infra-worker` |

> **10 个 Primary 智能体**（OpenCode 专属）：支持 `opencode --agent <name>` 直接切换，每个都是完整的领域编排中枢，含独立 Gate A→B→C→C1→C2→D→E 闭环。Claude Code 中通过 `/command` 等价的领域命令触发，无需独立 primary agent。

## 技能系统

**27 个方法论技能**（+ `browser-use` 外部全局技能），覆盖全生命周期：

| 类别 | 技能 |
|------|------|
| **基础** | `behavioral-guidelines`（5 准则 + 注释语言约定）、`context-engineering`、`using-agent-skills` |
| **需求** | `spec-driven-development`、`idea-refine` |
| **规划** | `planning-and-task-breakdown` |
| **实现** | `source-driven-development`、`incremental-implementation`、`test-driven-development`、`verification-before-completion`、`debugging-and-error-recovery`、`code-simplification`、`code-quality-gate`、`browser-testing`、**`code-standards`**（编程规范） |
| **审查** | `code-review-and-quality` |
| **安全** | `security-and-hardening` |
| **发布** | `shipping-and-launch`、`git-workflow-and-versioning`、`finishing-a-development-branch` |
| **文档** | `chinese-documentation`、`documentation-and-adrs`、`find-docs`、`find-skills` |
| **工具** | `mcp-builder`、`writing-skills` |

## 目录结构

```
.claude/                         # Claude Code（主推平台）
  settings.json                  #   权限与全局设置
  commands/                      #   15 个 slash 命令
  agents/                        #   47 个智能体
  skills/                        #   27 个技能

.opencode/                       # OpenCode
  commands/                      #   15 个命令（与 .claude 完全对齐）
  agents/                        #   55 个智能体（10 主智能体 + 45 子智能体）
  skills/                        #   27 个技能

.codex/                          # Codex
  config.toml                    #   主配置
  agents/                        #   45 个智能体
  skills/                        #   29 个技能（含 review-only / review-fix-optimize）
```

## 设计原则

- **垂直切片** — 任务按端到端功能拆分，非技术层级
- **闸门控制** — 每阶段必须满足条件才推进，不可绕过
- **需求可追溯** — 每条代码变更追溯到 `REQ-XXX`
- **共享区域唯一责任方** — 避免并行写入冲突
- **最大并发** — 无依赖任务同消息批量调度
- **注释语言约定** — 遵循 `behavioral-guidelines` 准则 5

## 致谢

- **[browser-use](https://github.com/browser-use/browser-use)** — 浏览器自动化，支撑测试与 Bug 闭环
- **[superpowers](https://github.com/obra/superpowers)** — 技能即文档方法论
- **[superpowers-zh](https://github.com/jnMetaCode/superpowers-zh)** — 中文技能体系参考

## License

MIT
