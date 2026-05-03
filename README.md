# Collaborative Agents（协作智能体工厂）

[![GitHub](https://img.shields.io/badge/license-MIT-blue)]()

一套跨平台的多智能体（Multi-Agent）AI 编程助手配置集，定义了一条**从想法到交付的完整软件开发流水线**。支持在 Codex、OpenCode、Claude Code 三个平台上运行，使用同一套工作流规范。

## 核心概念

**Jarvis（贾维斯）**——唯一的编排中枢，直接与用户对话，通过 Agent/Task 工具调度所有子智能体。子智能体职责单一、不可递归调度，所有阶段推进必须经过对应闸门（Gate）检查。

### 工作流总览

```
想法细化 ─→ 需求澄清 ─→ 需求文档 ─→ 任务分解 ─→ 执行规划 ─→ 并行实现 ─→ 评审交付 ─→ 发布上线
                │             │             │             │             │             │
             Gate A       Gate B       Gate C       Gate D       Gate E
```

每个阶段标记为不可绕过：

| 阶段 | 执行者 | 产出 | 闸门要求 |
|------|--------|------|---------|
| **0. 想法细化** | Jarvis + idea-refine | 结构化问题清单 | 用户确认细化结果 |
| **1A. 需求澄清** | Jarvis（直接对话） | 目标、范围、约束 | 至少 1 轮提问 |
| **1B. 需求文档** | Jarvis | `docs/requirements/` + `REQ-XXX` | 用户确认、文档落盘 |
| **2. 任务分解** | `task-design` 代理 | `docs/tasks/` + TASK-XXX | 每个任务映射到 REQ |
| **3. 执行规划** | `planner` 代理 | `docs/plans/` + Execution Packets | 分工、共享区域、并发组合齐备 |
| **4. 探索（按需）** | `repo-explorer` / `docs-researcher` | `docs/analysis/` | 只读，可并行 |
| **5. 实现** | 各领域实现代理 | `docs/implementation/` + 代码 | 垂直切片、≤1000 行/轮次 |
| **6. 评审** | `review-qa` 代理 | `docs/review/` + 追踪矩阵 | 全部 REQ-XXX 可追溯 |
| **7. 发布上线** | Jarvis + shipping-and-launch | `docs/shipping/` | 上线检查清单 |

## 智能体分类

共 **23 个智能体**，按职责分为五大类：

### 规划与评审

| 智能体 | 职责 |
|--------|------|
| `jarvis` | 唯一编排者，调度所有子智能体，直接与用户对话 |
| `task-design` | 需求→任务分解，DDD/TDD 分类 |
| `planner` | 任务→执行计划，并行/串行策略，Execution Packet |
| `review-qa` | 评审与需求追踪矩阵 |

### 探索与资料（只读）

| 智能体 | 职责 |
|--------|------|
| `repo-explorer` | 只读探索代码库结构与风险边界 |
| `docs-researcher` | 外部文档与 API 检索 |

### 审查与修复链路

| 智能体 | 写权限 | 职责 |
|--------|--------|------|
| `project-audit-reviewer` | 否 | 项目结构、配置、文档漂移审查 |
| `diff-code-reviewer` | 否 | git diff / PR 代码审查 |
| `performance-audit-reviewer` | 否 | 性能风险与基线审查 |
| `remediation-planner` | 仅文档 | findings→修复计划 |
| `remediation-worker` | 是 | 无合适 worker 时的小范围修复 |
| `post-change-reviewer` | 仅文档 | 修复后复核与关闭矩阵 |

### 后端实现

| 智能体 | 职责 |
|--------|------|
| `backend-implementer` | 全维度后端实现（API+业务+数据+测试） |
| `backend-api-worker` | 路由、控制器、中间件、错误处理 |
| `backend-service-worker` | 业务规则、领域逻辑、状态机、权限 |
| `backend-data-worker` | Schema、ORM、Repository、迁移 |
| `backend-test-worker` | 后端测试（TDD 流程） |

### 前端实现

| 智能体 | 职责 |
|--------|------|
| `frontend-implementer` | 全维度前端实现（页面+状态+测试） |
| `frontend-ui-worker` | 布局、组件、样式、响应式 |
| `frontend-state-worker` | 状态管理、数据获取、缓存、路由 |
| `frontend-test-worker` | 前端测试（TDD 流程） |

## 并发策略

最大化并发是核心原则——无依赖的任务必须在同一条消息中批量调度：

```
Gate A 通过后：repo-explorer + docs-researcher（并行）
              ├── 可加 task-design（三重并行，探索结果为增强输入）
Gate C 通过后：所有无共享依赖的实现代理（并行）
              前端与后端的不同任务可同时启动
不同 TDD 任务：Red 步骤可并行
```

串行仅限真实依赖链（如 `planner` 依赖 `task-design` 输出、TDD 的 Red→Green→Refactor 必须串行）。

## 平台支持

本仓库包含三套平台配置，工作流逻辑一致，仅配置格式不同：

| 平台 | 配置目录 | 配置文件格式 | 启动方式 |
|------|---------|-------------|---------|
| [Claude Code](https://claude.ai) | `.claude/` | Markdown + JSON | `/jarvis` 命令 |
| [OpenCode](https://opencode.ai) | `.opencode/` | Markdown frontmatter | 加载 `jarvis` agent |
| [Codex](https://codex.so) | `.codex/` | TOML | 默认启动编排流程 |

### Claude Code（推荐）

通过三个自定义 slash 命令切换工作模式：

| 命令 | 用途 |
|------|------|
| `/jarvis` | 启动贾维斯编排全流水线（需求→文档→任务→计划→实现→评审→发布） |
| `/review` | 进入只读审查模式（审查代码/项目/风险，不修改任何文件） |
| `/review-fix` | 进入审查修复优化闭环（初审→规划→执行→验证→复审完整链路） |

命令文件位于 `.claude/commands/`，每个命令自动加载对应基座技能（`behavioral-guidelines`、`using-agent-skills`）。

### OpenCode

在 `.opencode/agents/jarvis.md` 中定义了完整的编排者身份。支持与 Claude Code 相同的 23 个智能体体系，并通过 `@opencode-ai/plugin` 提供代码级插件扩展（自定义工具、认证、消息拦截等 hooks）。

### Codex

通过 `.codex/config.toml` 的 `developer_instructions` 定义编排流程。技能以 `.codex/skills/` 中的 markdown 文件形式加载（`[features] skills = true`）。支持精细的模型 ~~ `reasoning_effort` 配置和 `sandbox_mode` 权限控制。

## 技能系统

本仓库定义了 **20 个方法论技能**，涵盖从想法细化到发布上线的全流程。每个技能是一个 `SKILL.md` 文件，通过各平台的原生技能机制加载：

| 类别 | 技能 |
|------|------|
| **基础** | `behavioral-guidelines`、`context-engineering`、`using-agent-skills` |
| **需求** | `spec-driven-development`、`idea-refine` |
| **规划** | `planning-and-task-breakdown` |
| **实现** | `source-driven-development`、`incremental-implementation`、`test-driven-development`、`verification-before-completion`、`debugging-and-error-recovery`、`code-simplification` |
| **审查** | `code-review-and-quality` |
| **安全** | `security-and-hardening` |
| **发布** | `shipping-and-launch`、`git-workflow-and-versioning`、`finishing-a-development-branch` |
| **文档** | `chinese-documentation`、`documentation-and-adrs`、`find-docs` |

每个 Jarvis 会话启动时必须加载两个基座技能：`behavioral-guidelines`（行为准则）和 `using-agent-skills`（技能系统使用指南）。`using-agent-skills` 中的阶段-技能映射表是所有阶段技能加载的权威依据。

## 目录结构

```
.claude/                         # Claude Code 配置
  CLAUDE.md                      # 项目级指令（核心规则 + 会话启动）
  settings.json                  # 权限与全局设置
  commands/                      # 自定义 slash 命令
    jarvis.md                    #  /jarvis — 编排模式
    review.md                    #  /review — 只读审查
    review-fix.md                #  /review-fix — 审查修复闭环
  agents/*.md                    # 23 个智能体定义
  skills/                        # 20 个方法论技能

.opencode/                       # OpenCode 配置
  package.json                   # @opencode-ai/plugin
  agents/*.md                    # 23 个智能体定义
  skills/                        # 20 个方法论技能

.codex/                          # Codex 配置
  config.toml                    # 主配置：模型、工作流、智能体注册
  agents/*.toml                  # 20 个子智能体配置
  skills/                        # 20 个方法论技能
```

## 使用方式

### 快速开始（Claude Code）

```
# 1. 将 .claude/ 配置放入项目根目录
# 2. 启动 Claude Code
# 3. 输入 /jarvis 进入编排模式
# 4. 提出你的需求
```

### 通用步骤

1. **选择平台**——将对应配置目录（`.claude/` / `.opencode/` / `.codex/`）放入你的项目根目录
2. **配置 API Key**——在各平台界面中配置 LLM 的 API Key（本仓库不存储任何密钥）
3. **设定模型**——修改智能体的 `model` 字段（各平台格式不同，详见各目录下的配置文件）
4. **开始对话**——Claude Code 用户直接使用 `/jarvis`、其他平台直接向 Jarvis 提出需求

### 模型配置示例

各平台支持切换为其他 OpenAI 兼容模型：

```yaml
# OpenCode / Claude Code（Markdown frontmatter）
model: gpt-4o
model: claude-sonnet-4-20250514
model: deepseek-chat
```

```toml
# Codex（TOML）
model = "gpt-5.5"
model_reasoning_effort = "xhigh"
```

## 设计原则

- **垂直切片**——任务按端到端功能拆分，而不是按技术层级
- **闸门控制**——每个阶段必须满足对齐条件才能推进，不可绕过
- **需求可追溯**——每条代码变更都能追溯到 `REQ-XXX` 需求条目
- **共享区域唯一责任方**——避免并行写入冲突
- **变更规模控制**——单轮次变更不超过 1000 行
- **技能驱动**——方法论封装为可复用技能，通过原生机制加载

## License

MIT
