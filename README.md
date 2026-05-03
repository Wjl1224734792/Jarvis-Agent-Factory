# 协作智能体工厂（Collaborative Agents）

[![GitHub](https://img.shields.io/badge/license-MIT-blue)]()

一套跨平台的多智能体（Multi-Agent）AI 编程助手配置集，定义了一条**从想法到交付的完整软件开发流水线**。支持在 Claude Code、OpenCode、Codex 三个平台上运行，共享同一套工作流规范。

## 核心概念

**Jarvis（贾维斯）**——唯一的编排中枢，直接与用户对话，通过 Agent/Task 工具调度所有子智能体。子智能体职责单一、不可递归调度，所有阶段推进必须经过对应闸门（Gate）检查。

### 工作流

```
想法细化 ─→ 需求澄清 ─→ 需求文档 ─→ 任务分解 ─→ 执行规划 ─→ 并行实现 ─→ 评审交付 ─→ 发布上线
                │             │             │             │             │             │
             Gate A       Gate B       Gate C       Gate D        Gate E
```

| 阶段 | 执行者 | 关键产出 |
|------|--------|---------|
| **0. 想法细化** | Jarvis + idea-refine | 结构化问题清单 |
| **1. 需求文档** | Jarvis | `REQ-XXX` 需求条目 |
| **2. 任务分解** | task-design 代理 | `TASK-XXX` 任务卡片 |
| **3. 执行规划** | planner 代理 | Execution Packet 并行计划 |
| **4. 并行实现** | 各领域实现代理 | 垂直切片代码 |
| **5. 评审交付** | review-qa 代理 | 需求追踪矩阵 |
| **6. 发布上线** | Jarvis + infra-worker | 上线检查清单 + 部署 |

每个阶段有对应闸门（Gate），未通过不可进入下一阶段。

## 适用场景

- 新功能开发
- 项目改造重构
- 复杂配置变更
- 系统调试与 Bug 修复
- 需要多文件、多模块协作的任务

不适合：简单问答、单文件修改、纯文档格式化翻译。

## 使用前提

- **Claude Code**（推荐）：安装 [Claude Code CLI](https://claude.ai/code) 并在项目中初始化
- **OpenCode**：安装 [OpenCode](https://opencode.ai) CLI（≥ v1.4.0）
- **Codex**：安装 [Codex](https://codex.so) CLI
- **API Key**：在各平台界面中配置 LLM 的 API Key（本仓库不存储任何密钥）

## 使用方法

### Claude Code（推荐）

将 `.claude/` 目录复制到你的项目根目录，然后通过六个 slash 命令切换工作模式：

| 命令 | 用途 |
|------|------|
| **`/jarvis`** | 启动贾维斯编排全流水线（从需求到发布） |
| **`/review`** | 进入只读审查模式（审查代码/项目/风险，不修改文件） |
| **`/review-fix`** | 进入审查修复优化闭环（初审→规划→执行→验证→复审） |
| **`/algorithm-expert`** | 直接对话算法专家（算法选型、复杂度分析、性能优化） |
| **`/frontend-architect`** | 直接对话前端架构师（技术选型、组件架构、构建策略） |
| **`/backend-architect`** | 直接对话后端架构师（微服务、数据库、分布式设计） |

#### 典型使用流程

```bash
# 1. 将配置放入项目根目录
cp -r path/to/.claude/ your-project/

# 2. 启动 Claude Code
claude

# 3. 全流水线模式：输入 /jarvis 进入编排模式
# 4. 单项专家模式：输入 /frontend-architect、/backend-architect、/algorithm-expert
#    直接与对应架构师一对一讨论方案，无需走完整流水线
```

**流水线模式**（`/jarvis`）：需求澄清 → 文档 → 任务分解 → 规划 → **并行实现** → 评审 → 发布。其中 Gate C 是核心——planner 产出 `parallel_batches` 后，Jarvis 在一条消息中同时 spawn 多个实现 Agent，互不依赖的任务真正并发执行。

**专家模式**（`/frontend-architect`、`/backend-architect`、`/algorithm-expert`）：当你只需要架构方案和选型建议时，直接 spawn 对应架构师。它们不写业务代码，只产出选型矩阵、ADR 和 POC 验证。

#### 权限配置

`.claude/settings.json` 已预置常用权限（git、npm、python 等），无需额外配置即可使用。如需调整，在项目根目录执行：

```bash
# 直接编辑
vim .claude/settings.json

# 或在 Claude Code 中使用 /config 命令管理
```

### OpenCode

将 `.opencode/` 目录复制到项目根目录，加载 `jarvis` agent 即可。Jarvis 会作为编排者调度所有子智能体。

```bash
opencode --agent jarvis
```

支持与 Claude Code 相同的 47 个智能体体系，通过 `@opencode-ai/plugin` 提供代码级插件扩展。

### Codex

将 `.codex/` 目录复制到项目根目录，启动 Codex 后自动加载编排流程。

```toml
# .codex/config.toml 已配置完整工作流
# 默认使用 gpt-5.5，可自行修改 model 字段
```

## 自定义配置

### 切换 LLM 模型

各平台配置文件中的 `model` 字段均可修改：

```yaml
# Claude Code / OpenCode（Markdown frontmatter）
model: claude-sonnet-4-20250514
model: gpt-4o
model: deepseek-chat
```

```toml
# Codex（TOML）
model = "gpt-5.5"
model_reasoning_effort = "xhigh"
```

### 添加/修改 slash 命令

在 `.claude/commands/` 目录下创建或编辑 `*.md` 文件。

### 修改智能体定义

在 `.claude/agents/` 目录下编辑对应 Agent 的 Markdown 文件。每个文件包含：
- YAML frontmatter（名称、工具、模型）
- 职责说明
- 红线（不可触碰的行为）
- 反合理化表（常见借口与事实）

## 智能体体系

共 **47 个智能体**，按职责分为八大类：

| 类别 | 智能体 |
|------|--------|
| **规划与评审** | `jarvis`、`task-design`、`planner`、`review-qa` |
| **探索与资料** | `repo-explorer`、`docs-researcher` |
| **架构设计** | `algorithm-expert`、`frontend-architect`、`backend-architect`、`database-specialist` |
| **审查与修复** | `review-only`、`review-fix-optimize`、`project-audit-reviewer`、`diff-code-reviewer`、`performance-audit-reviewer`、`security-auditor`、`remediation-planner`、`remediation-worker`、`post-change-reviewer` |
| **后端实现** | `backend-implementer`、`backend-api-worker`、`backend-service-worker`、`backend-data-worker`、`backend-test-worker` |
| **前端实现** | `frontend-implementer`、`frontend-ui-worker`、`frontend-state-worker`、`frontend-test-worker` |
| **移动端实现** | `taro-worker`、`taro-ui-worker`、`taro-state-worker`、`android-worker`、`android-ui-worker`、`android-state-worker`、`ios-worker`、`ios-ui-worker`、`ios-state-worker`、`react-native-worker`、`rn-ui-worker`、`rn-state-worker`、`flutter-worker`、`flutter-ui-worker`、`flutter-state-worker` |
| **测试与文档** | `e2e-test-worker`、`performance-test-worker`、`api-docs-worker` |
| **基础设施** | `infra-worker` |

## 技能系统

**20 个方法论技能**，覆盖从想法细化到发布上线的全流程。每个技能是一个 `SKILL.md` 文件，通过各平台的原生技能机制加载：

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

## 目录结构

```
.claude/                         # Claude Code 配置（主推）
  settings.json                  #   权限与全局设置
  commands/                      #   6 个 slash 命令
  agents/                        #   47 个智能体定义
  skills/                        #   20 个方法论技能

.opencode/                       # OpenCode 配置
  agents/                        #   47 个智能体定义
  skills/                        #   20 个方法论技能

.codex/                          # Codex 配置
  config.toml                    #   主配置
  agents/                        #   44 个子智能体
  skills/                        #   20 个方法论技能
```

## 设计原则

- **垂直切片**——任务按端到端功能拆分，而非技术层级
- **闸门控制**——每个阶段必须满足对齐条件才能推进，不可绕过
- **需求可追溯**——每条代码变更都能追溯到 `REQ-XXX` 需求条目
- **共享区域唯一责任方**——避免并行写入冲突
- **变更规模控制**——单轮次变更不超过 1000 行
- **最大并发**——无依赖的任务必须在同一条消息中批量调度

## License

MIT
