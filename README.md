# Collaborative Agents（协作智能体工厂）

[![GitHub](https://img.shields.io/badge/license-MIT-blue)]()

一套跨平台的多智能体（Multi-Agent）AI 编程助手配置集，定义了一条**从想法到交付的完整软件开发流水线**。支持在 Codex、OpenCode、Claude Code 三个平台上运行，使用同一套工作流规范。

## 核心概念

**Jarvis（贾维斯）**——唯一的编排中枢，直接与用户对话，通过 Task/Agent 工具调度所有子智能体。子智能体职责单一、不可递归调度，所有阶段推进必须经过对应闸门（Gate）检查。

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

| 平台 | 配置目录 | 格式 | 默认模型 |
|------|---------|------|---------|
| [Codex](https://codex.so) | `.codex/` | TOML | `gpt-5.5` |
| [OpenCode](https://opencode.ai) | `.opencode/` | Markdown frontmatter | `deepseek/deepseek-v4-pro` |
| [Claude Code](https://claude.ai) | `.claude/` | Markdown frontmatter | `deepseek/deepseek-v4-pro` |

### OpenCode 专用配置

`.opencode(deepseek)/` 目录提供 OpenCode 的 DeepSeek 优化版本，使用 `deepseek-v4-flash` 作为轻量 worker 模型。

## 更换模型

### 在 Codex 上

编辑 `.codex/config.toml` 修改全局默认模型和每个智能体的独立模型：

```toml
# 全局默认
model = "gpt-5.5"
model_reasoning_effort = "xhigh"

# 按智能体独立设置（agents/*.toml）
name = "planner"
model = "gpt-5.5"              # ← 更换此行
model_reasoning_effort = "xhigh"
```

支持的模型列表在 `.codex/config.toml` 第 21 行定义，也可以替换为其他 OpenAI 兼容模型。

### 在 OpenCode / Claude Code 上

编辑每个智能体的 Markdown 文件头部的 `model` 字段：

```yaml
---
name: jarvis
mode: primary
model: deepseek/deepseek-v4-pro    # ← 更换此行
reasoningEffort: max
temperature: 0
---
```

所有子智能体（`agents/*.md`）都需要同步修改 `model` 字段。可以直接替换为其他 OpenAI 兼容模型，例如：

```yaml
model: gpt-4o
model: claude-sonnet-4-20250514
model: deepseek-chat
```

## 平台特定说明

### Codex

- 支持模型级 `reasoning_effort` 配置
- 通过 `sandbox_mode` 控制读写权限（`read-only` / `workspace-write`）
- 支持 `nickname_candidates` 为智能体设置别名

### OpenCode

- 通过 `permission` 控制文件和任务权限
- `mode: primary` 为编排者，`mode: subagent` 为子智能体
- 插件版本为 `@opencode-ai/plugin@1.14.33`（稳定版）或 `1.4.0`（DeepSeek 优化版）

### Claude Code

- 通过 `tools` 字段显式声明可用工具
- 使用 `Agent` 工具调度子智能体（而非 Task）
- 需要开启 `Skill` 工具加载方法论技能

## 目录结构

```
.codex/                          # Codex 配置（TOML）
  config.toml                    # 主配置：模型、工作流、智能体注册
  agents/*.toml                  # 20 个子智能体配置
  skills/                        # 工作流参考文档

.opencode/                       # OpenCode 配置（Markdown）
  package.json                   # @opencode-ai/plugin
  agents/*.md                    # 23 个智能体定义

.opencode(deepseek)/             # OpenCode DeepSeek 优化版
  package.json                   # @opencode-ai/plugin v1.4.0
  agents/*.md                    # 23 个智能体定义

.claude/                         # Claude Code 配置（Markdown）
  agents/*.md                    # 23 个智能体定义
  skills/                        # 方法论技能
```

## 使用方式

1. **选择平台**——将对应配置目录（`.codex/` / `.opencode/` / `.claude/`）放入你的项目根目录
2. **配置 API Key**——在各平台界面中配置 LLM 的 API Key（本仓库不存储任何密钥）
3. **设定模型**——按上方「更换模型」指引修改智能体的 model 字段
4. **开始对话**——直接向 Jarvis 提出需求，它会自动执行完整工作流

## 设计原则

- **垂直切片**——任务按端到端功能拆分，而不是按技术层级
- **闸门控制**——每个阶段必须满足对齐条件才能推进，不可绕过
- **需求可追溯**——每条代码变更都能追溯到 `REQ-XXX` 需求条目
- **共享区域唯一责任方**——避免并行写入冲突
- **变更规模控制**——单轮次变更不超过 1000 行

## License

MIT
