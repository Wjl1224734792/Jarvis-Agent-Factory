# Jarvis Agent Factory · 贾维斯智能体工厂

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-v1.5.7-green)](https://gitee.com/wujl1124/JarvisAgentFactory/releases)

一套跨平台的多智能体（Multi-Agent）AI 编程助手配置集，定义了一条**从想法到交付的完整软件开发流水线**。支持在 Claude Code、OpenCode、Codex 三个平台上运行，共享同一套工作流规范。

> **当前版本** — Claude Code 47 智能体 + 15 斜杠命令，OpenCode 48 智能体 + 15 命令，Codex 45 智能体，跨平台共享 26 个方法论技能。已集成 browser-use 浏览器自动化测试与 Bug 复现闭环。

> For English readers: [README_EN.md](./README_EN.md) | English readers please refer to the English version linked above.

## 核心概念

**Jarvis（贾维斯）**——唯一的编排中枢，直接与用户对话，通过 Agent/Task 工具调度所有子智能体。子智能体职责单一、不可递归调度，所有阶段推进必须经过对应闸门（Gate）检查。

### 工作流

```
                    ┌─ 并行 ─┐     ┌─ 并行 ─┐
                    │         │     │         │
想法细化 → 需求澄清 → 需求文档 → 任务分解 → 执行规划 → 并行实现 → 代码质量 → 测试验证 → 评审交付 → 安全审计 → 发布上线
   │         │        │         │         │         │         │         │         │         │         │
   └─ 阶段 0           Gate A    Gate B    Gate C    │    Gate C1    Gate C2    Gate D   Gate E1   Gate E2
                                                     │
                                          ┌──────────┘
                                          │ 同 Batch 内任务并行
                                          │ Batch 之间串行等待
                                          └── 无共享依赖 → 可跨 Batch 提前启动
```

### 故障恢复与韧性框架

流水线内置完整故障处理机制，覆盖五个维度：

| 维度 | 策略 |
|------|------|
| **Agent 失败重试** | 4 种失败类型差异化重试（超时/工具错误/输出不完整/越界修改），最多 3 次 |
| **Batch 部分失败** | 成功产物保留，仅重试失败任务，依赖分析决定是否阻塞后续 Batch |
| **回滚/中止协议** | 决策树：可修复→重试→回退→中止，同 Gate 最多回退 2 次 |
| **会话检查点** | 每个 Gate 通过后输出结构化检查点，支持中断后恢复 |
| **冲突解决** | Plan patch 冲突串行化排队，数据层 > API 层 > UI 层裁决，10 分钟超时 |

## 闭环体系

流水线内置 **5 个独立闭环**，确保任何环节出问题都能自愈：

| # | 闭环 | 触发方式 | 流程 |
|---|------|---------|------|
| 1 | **开发闭环** | `/jarvis` Gate C→C1→C2 | 实现 → Lint/Type-check/Build/Deps Audit → 测试 → 失败回退 |
| 2 | **测试闭环** | `/browser-test` | 写用例 → 浏览器执行 → 截图 → 失败→`/review-fix`→ 重测 |
| 3 | **Bug 闭环** | `/bug-fix` | Bug → 浏览器复现 → 截图 → 定位根因 → 修复 → 验证 |
| 4 | **审查闭环** | `/review-fix` | 初审 → 规划 → 执行 → Lint/Test 验证 → 复审关闭 |
| 5 | **安全闭环** | Gate E（发布前强制） | security-auditor → 威胁建模 + CVE + SAST → 修复 → 重扫 |

任何环节的失败都会自动路由到对应的修复闭环，最多 2 轮；第 3 轮仍失败则标记 BLOCKED，保留所有产物和诊断信息。

## 使用方法

### Claude Code（推荐）

将 `.claude/` 目录复制到项目根目录，通过 slash 命令切换工作模式：

```bash
cp -r path/to/.claude/ your-project/
npx skills add browser-use/browser-use@browser-use -g -y
claude
```

**领域开发命令**（完整生命周期：需求→实现→质量→测试→评审→发布）：

| 命令 | 领域 | 专属 Agent |
|------|------|-----------|
| **`/backend`** | 后端开发 | backend-implementer, backend-api/data/service-worker, backend-test-worker, database-specialist, performance-test-worker, security-auditor, api-docs-worker, infra-worker |
| **`/frontend`** | 前端开发 | frontend-implementer, frontend-ui/state-worker, frontend-test-worker, browser-test-worker, e2e-test-worker, performance-audit-reviewer, security-auditor, infra-worker |
| **`/taro`** | Taro 小程序/H5 | taro-worker, taro-ui/state-worker, browser-test-worker, e2e-test-worker, security-auditor, infra-worker |
| **`/android`** | Android 原生 | android-worker, android-ui/state-worker, e2e-test-worker, security-auditor, infra-worker |
| **`/ios`** | iOS 原生 | ios-worker, ios-ui/state-worker, e2e-test-worker, security-auditor, infra-worker |
| **`/expo`** | Expo 跨端 | react-native-worker, rn-ui/state-worker, browser-test-worker, e2e-test-worker, security-auditor, infra-worker |
| **`/flutter`** | Flutter 跨端 | flutter-worker, flutter-ui/state-worker, browser-test-worker, e2e-test-worker, security-auditor, infra-worker |

**全栈与专项命令**：

| 命令 | 用途 |
|------|------|
| **`/jarvis`** | 启动贾维斯编排全流水线（跨领域完整生命周期） |
| **`/browser-test`** | 浏览器自动化测试闭环——写用例→执行→截图→失败驱动修复 |
| **`/bug-fix`** | Bug 修复闭环——浏览器复现→定位根因→修复→验证 |
| **`/review`** | 只读审查模式（审查代码/项目/风险，不修改文件） |
| **`/review-fix`** | 审查修复优化闭环（初审→规划→执行→验证→复审） |
| **`/algorithm-expert`** | 直接对话算法专家（算法选型、复杂度分析、性能优化） |
| **`/frontend-architect`** | 直接对话前端架构师（技术选型、组件架构、构建策略） |
| **`/backend-architect`** | 直接对话后端架构师（微服务、数据库、分布式设计） |

### OpenCode

将 `.opencode/` 目录复制到项目根目录，加载 `jarvis` agent 或直接使用 slash 命令：

```bash
opencode --agent jarvis         # 智能体模式
opencode                        # 命令模式（/jarvis /backend /frontend ...）
```

支持与 Claude Code 几乎相同的智能体体系（48 个，含 jarvis 编排 Agent），通过 `@opencode-ai/plugin` 提供代码级插件扩展。

### Codex

将 `.codex/` 目录复制到项目根目录，启动 Codex 后自动加载编排流程（45 个智能体）。审查流程通过技能启用：

```toml
# .codex/config.toml 已配置完整工作流
# 默认使用 gpt-5.5，可自行修改 model 字段
# 审查模式：加载 review-only / review-fix-optimize 技能
```

## 自定义配置

### 切换 LLM 模型

各平台配置文件中的 `model` 字段均可修改：

```yaml
# Claude Code / OpenCode（Markdown frontmatter）
model: deepseek-v4-pro        # 深度推理
model: deepseek-v4-flash      # 快速执行
model: claude-sonnet-4-20250514
```

```toml
# Codex（TOML / OpenAI 格式）
model = "gpt-5.5"
model_reasoning_effort = "xhigh"   # GPT: xhigh/high/medium/low
```

### 添加/修改 slash 命令

在 `.claude/commands/` 目录下创建或编辑 `*.md` 文件。`.opencode/commands/` 同步镜像。

## 智能体体系

各平台智能体数量不同（Claude Code 47 个、OpenCode 48 个、Codex 45 个），按职责分为十大类：

| 类别 | 智能体 |
|------|--------|
| **规划与评审** | `jarvis`（编排中枢）、`task-design`、`planner`、`review-qa` |
| **探索与资料** | `repo-explorer`、`docs-researcher` |
| **架构设计** | `algorithm-expert`、`frontend-architect`、`backend-architect`、`database-specialist` |
| **审查与修复** | `review-only`、`review-fix-optimize`、`project-audit-reviewer`、`diff-code-reviewer`、`performance-audit-reviewer`、`security-auditor`、`remediation-planner`、`remediation-worker`、`post-change-reviewer` |
| **后端实现** | `backend-implementer`、`backend-api-worker`、`backend-service-worker`、`backend-data-worker`、`backend-test-worker` |
| **前端实现** | `frontend-implementer`、`frontend-ui-worker`、`frontend-state-worker`、`frontend-test-worker` |
| **移动端实现** | `taro-worker`、`taro-ui-worker`、`taro-state-worker`、`android-worker`、`android-ui-worker`、`android-state-worker`、`ios-worker`、`ios-ui-worker`、`ios-state-worker`、`react-native-worker`（Expo）、`rn-ui-worker`（Expo）、`rn-state-worker`（Expo）、`flutter-worker`、`flutter-ui-worker`、`flutter-state-worker` |
| **测试与文档** | `browser-test-worker`、`e2e-test-worker`、`performance-test-worker`、`api-docs-worker` |
| **基础设施** | `infra-worker` |

> 注：Claude Code 中 jarvis 为斜杠命令（`.claude/commands/jarvis.md`），OpenCode 中为独立 Agent。Codex 的 review-only 和 review-fix-optimize 以技能形式实现。browser-test-worker 三平台均有，依赖 browser-use 全局技能。

## 技能系统

**26 个方法论技能**（+ 1 个全局外部技能 `browser-use`），覆盖从想法细化到发布部署的全生命周期：

| 类别 | 技能 |
|------|------|
| **基础** | `behavioral-guidelines`、`context-engineering`、`using-agent-skills` |
| **需求** | `spec-driven-development`、`idea-refine` |
| **规划** | `planning-and-task-breakdown` |
| **实现** | `source-driven-development`、`incremental-implementation`、`test-driven-development`、`verification-before-completion`、`debugging-and-error-recovery`、`code-simplification`、`code-quality-gate`、`browser-testing` |
| **审查** | `code-review-and-quality` |
| **安全** | `security-and-hardening` |
| **发布** | `shipping-and-launch`、`git-workflow-and-versioning`、`finishing-a-development-branch` |
| **文档** | `chinese-documentation`、`documentation-and-adrs`、`find-docs`、`find-skills` |
| **工具** | `mcp-builder`、`writing-skills` |

## 目录结构

```
.claude/                         # Claude Code 配置（主推）
  settings.json                  #   权限与全局设置
  commands/                      #   15 个 slash 命令
  agents/                        #   47 个智能体定义
  skills/                        #   26 个方法论技能

.opencode/                       # OpenCode 配置
  commands/                      #   15 个 slash 命令（镜像 .claude）
  agents/                        #   48 个智能体定义
  skills/                        #   26 个方法论技能

.codex/                          # Codex 配置
  config.toml                    #   主配置与编排流程
  agents/                        #   45 个子智能体
  skills/                        #   28 个方法论技能（含 review-only / review-fix-optimize）
```

## 设计原则

- **垂直切片**——任务按端到端功能拆分，而非技术层级
- **闸门控制**——每个阶段必须满足对齐条件才能推进，不可绕过
- **需求可追溯**——每条代码变更都能追溯到 `REQ-XXX` 需求条目
- **共享区域唯一责任方**——避免并行写入冲突
- **最大并发**——无依赖的任务必须在同一条消息中批量调度
- **注释语言约定**——代码注释跟随项目已有语言：中文项目用中文注释，英文项目用英文注释

## 致谢

本项目受以下优秀开源项目启发并参考了它们的方法论：

- **[browser-use](https://github.com/browser-use/browser-use)** — 浏览器自动化工具，为本项目的 `/browser-test` 和 `/bug-fix` 闭环提供基于真实浏览器的测试与复现能力
- **[superpowers](https://github.com/obra/superpowers)**（英文原版）— 智能体技能系统的方法论基础，定义了技能即文档（Skills as Documentation）的核心理念
- **[superpowers-zh](https://github.com/jnMetaCode/superpowers-zh)**（中文版）— superpowers 的中文翻译与本地化，为本项目的中文技能体系提供了参考范式

## License

MIT
