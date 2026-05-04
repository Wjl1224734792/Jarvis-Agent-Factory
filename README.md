# Jarvis Agent Factory · 贾维斯智能体工厂

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-v1.5.1-green)](https://gitee.com/wujl1124/JarvisAgentFactory/releases)

一套跨平台的多智能体（Multi-Agent）AI 编程助手配置集，定义了一条**从想法到交付的完整软件开发流水线**。支持在 Claude Code、OpenCode、Codex 三个平台上运行，共享同一套工作流规范。

> **当前版本** — Claude Code 47 智能体 + 8 斜杠命令，OpenCode 48 智能体，Codex 45 智能体，跨平台共享 25 个方法论技能。已集成 browser-use 浏览器自动化测试与 Bug 复现闭环。

> 📖 **English readers**: see [README_EN.md](./README_EN.md)

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

**并行/串行规则总览：**

| 阶段 | 执行方式 | 可并行的对象 |
|------|---------|-------------|
| 0 想法细化 | 串行（Jarvis 直接对话） | — |
| 1 需求文档 | 串行 | 可与 repo-explorer + docs-researcher 并行 |
| 2 任务分解 | 串行（task-design） | 探索结果作为增强输入 |
| 3 执行规划 | 串行（planner） | 可与架构师评审并行 |
| 4 并行实现 | **同 Batch 内全部并行** | 同 Batch 所有无共享依赖的实现 agent |
| Gate C1 代码质量 | 串行（Lint→Type-check→Build→Deps Audit） | 四步串行，不可并行 |
| Gate C2 测试 | unit/integration 并行；E2E 串行在最后 | backend-test + frontend-test 并行 |
| Gate D 评审 | 串行（review-qa） | — |
| Gate E1 安全审计 | 串行（security-auditor） | 可与上线准备并行 |
| Gate E2 发布 | 串行 | — |

| 阶段 | 执行者 | 关键产出 | 并行/串行 |
|------|--------|---------|----------|
| **0. 想法细化** | Jarvis + idea-refine | 结构化问题清单 | 串行 |
| **1. 需求文档** | Jarvis | `REQ-XXX` 需求条目 | 串行（可并行探索） |
| **2. 任务分解** | task-design | `TASK-XXX` 任务卡片 | 串行 |
| **3. 执行规划** | planner | Execution Packet 并行计划 | 串行（可并行架构评审） |
| **4. 并行实现** | 各领域实现代理 | 垂直切片代码 | **同 Batch 并行** |
| **5. 代码质量** | Jarvis 直接执行 | Lint + Type-check + Build + Deps Audit | 四步串行 |
| **6. 测试验证** | test workers | 测试汇总报告 + 覆盖率 | unit/integration 并行，E2E 串行 |
| **7. 评审交付** | review-qa | REQ-XXX 追踪矩阵 | 串行 |
| **8. 安全审计** | security-auditor | 安全报告 + CVE 清单 | 串行（可与上线准备并行） |
| **9. 发布上线** | Jarvis + infra-worker | 上线检查清单 + 部署 | 串行 |

每个阶段有对应闸门（Gate），未通过不可进入下一阶段。**并行阶段标注了可并行的条件，串行阶段标注了依赖关系。**

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
| 1 | **开发闭环** | `/jarvis` Gate C→C1→C2 | 实现 → Lint/Type-check/Build/Deps Audit → 测试 → 失败回退修复 → 重检 |
| 2 | **测试闭环** | `/browser-test` | 写用例 → 浏览器执行 → 截图 → 失败→`/review-fix`→ 重测 → 通过 |
| 3 | **Bug 闭环** | `/bug-fix` | Bug → 浏览器复现 → 截图 → 定位根因 → 修复 → 代码质量检查 → 浏览器验证 |
| 4 | **审查闭环** | `/review-fix` | 初审 → 规划 → 执行 → Lint/Test 验证 → 复审关闭 |
| 5 | **安全闭环** | Gate E（发布前强制） | security-auditor → 威胁建模 + CVE + SAST + 密钥检测 → 修复 → 重扫 |

闭环之间的交叉连接：

```
/browser-test 失败 ──→ /review-fix ──→ 修复后重新 /browser-test
/bug-fix 修复后    ──→ /browser-test 回归验证
/review-fix 涉及前端Bug ──→ browser-use 复现 + 验证
Gate E 安全审计失败 ──→ /review-fix 修复 ──→ 重新安全审计
```

任何环节的失败都会自动路由到对应的修复闭环，最多 2 轮；第 3 轮仍失败则标记 BLOCKED，保留所有产物和诊断信息。

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

将 `.claude/` 目录复制到你的项目根目录，然后通过八个 slash 命令切换工作模式：

| 命令 | 用途 |
|------|------|
| **`/jarvis`** | 启动贾维斯编排全流水线（从需求到发布） |
| **`/browser-test`** | 浏览器自动化测试闭环——先写用例，再执行浏览器操作，记录结果，失败驱动修复重测 |
| **`/bug-fix`** | Bug 修复闭环——浏览器复现 Bug→定位根因→修复代码→浏览器验证修复 |
| **`/review`** | 进入只读审查模式（审查代码/项目/风险，不修改文件） |
| **`/review-fix`** | 进入审查修复优化闭环（初审→规划→执行→验证→复审） |
| **`/algorithm-expert`** | 直接对话算法专家（算法选型、复杂度分析、性能优化） |
| **`/frontend-architect`** | 直接对话前端架构师（技术选型、组件架构、构建策略） |
| **`/backend-architect`** | 直接对话后端架构师（微服务、数据库、分布式设计） |

#### 典型使用流程

```bash
# 1. 将配置放入项目根目录
cp -r path/to/.claude/ your-project/

# 2. 安装 browser-use 全局技能（浏览器测试闭环依赖）
npx skills add browser-use/browser-use@browser-use -g -y

# 3. 启动 Claude Code
claude

# 4. 全流水线模式：输入 /jarvis 进入编排模式
# 5. 浏览器测试闭环：输入 /browser-test 独立执行 Web 测试
# 6. Bug 修复闭环：输入 /bug-fix，浏览器复现→定位→修复→验证
# 7. 单项专家模式：输入 /frontend-architect、/backend-architect、/algorithm-expert
#    直接与对应架构师一对一讨论方案，无需走完整流水线
```

**流水线模式**（`/jarvis`）：需求澄清 → 文档 → 任务分解 → 规划 → **并行实现** → 代码质量检查（Lint/Type-check/Build/Deps Audit）→ 测试验证 → 评审 → 安全审计 → 发布。其中 Gate C 是核心——planner 产出 `parallel_batches` 后，Jarvis 在一条消息中同时 spawn 多个实现 Agent，互不依赖的任务真正并发执行。实现完成后立即进入 Gate C1 代码质量门，全部通过后依次通过 Gate C2 测试验证 → Gate D 评审 → Gate E 安全审计 → 发布上线。

**Gate C1 代码质量门**：所有实现完成后，自动执行四项质量检查——Lint（零 error）、Type-check（零 error）、Build（成功）、依赖安全扫描（无 Critical/High CVE）。按项目类型自动选择对应工具链。四项全部通过方可进入测试验证。

**Gate E 安全审计门**：发布上线前，强制 spawn `security-auditor` 执行完整安全扫描（威胁建模 + 依赖 CVE + SAST + 密钥检测 + 安全头审计）。Critical/High 发现必须修复或书面豁免。安全审计可与上线准备工作并行执行。

**Gate C2 测试验证门**：代码质量检查通过后，执行单元测试、集成测试、E2E 测试全部通过，覆盖率达标注。支持 TDD 和测试后补两种策略。

**`/browser-test` 浏览器测试闭环**：独立于流水线的自闭环测试命令：

```
编写测试用例清单 → 逐条 browser-use 执行 → 截图记录 →
 ──全部通过──→ ✅ 闭环完成
    │
    └──存在失败──→ Browser Test Findings
                      │
                      └──→ /review-fix（审查修复）──→ 重测失败用例
                                                        │
                                                        ├── 通过 ──→ ✅ 闭环完成
                                                        └── 仍失败 ──→ 再次修复（最多 2 轮）
```

此闭环既可独立使用（`/browser-test`），也可嵌入流水线 Gate C2 作为 E2E 补充验证。基于 `browser-use` 技能执行真实浏览器操作，适合快速冒烟测试、UI 回归检查和交互验证。

**`/bug-fix` Bug 修复闭环**：当前端/页面交互类 Bug 浮现时，浏览器复现 → 修复 → 验证的完整闭环：

```
Bug Report ──→ 浏览器复现 ──→ 截图/证据 ──→ 定位根因（文件:行号）
                                                  │
                                                  ▼
                                             修复代码
                                                  │
                                                  ▼
                              浏览器验证（相同步骤复测）
                               │                │
                          Bug 不再出现    Bug 仍存在
                               │                │
                               ▼                ▼
                          ✅ 关闭          回到定位根因
                                          （最多 2 轮回退）
```

此闭环也可通过 `/review-fix` 触发——当审查初审发现前端页面 Bug 时，自动加载 browser-use 技能进行浏览器复现和验证。

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

支持与 Claude Code 几乎相同的智能体体系（48 个，含 jarvis 编排 Agent），通过 `@opencode-ai/plugin` 提供代码级插件扩展。

### Codex

将 `.codex/` 目录复制到项目根目录，启动 Codex 后自动加载编排流程（45 个智能体）。

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

各平台智能体数量不同（Claude Code 47 个、OpenCode 48 个、Codex 45 个），按职责分为十大类：

| 类别 | 智能体 |
|------|--------|
| **规划与评审** | `jarvis`（编排中枢）、`task-design`、`planner`、`review-qa` |
| **探索与资料** | `repo-explorer`、`docs-researcher` |
| **架构设计** | `algorithm-expert`、`frontend-architect`、`backend-architect`、`database-specialist` |
| **审查与修复** | `review-only`、`review-fix-optimize`、`project-audit-reviewer`、`diff-code-reviewer`、`performance-audit-reviewer`、`security-auditor`、`remediation-planner`、`remediation-worker`、`post-change-reviewer` |
| **后端实现** | `backend-implementer`、`backend-api-worker`、`backend-service-worker`、`backend-data-worker`、`backend-test-worker` |
| **前端实现** | `frontend-implementer`、`frontend-ui-worker`、`frontend-state-worker`、`frontend-test-worker` |
| **移动端实现** | `taro-worker`、`taro-ui-worker`、`taro-state-worker`、`android-worker`、`android-ui-worker`、`android-state-worker`、`ios-worker`、`ios-ui-worker`、`ios-state-worker`、`react-native-worker`、`rn-ui-worker`、`rn-state-worker`、`flutter-worker`、`flutter-ui-worker`、`flutter-state-worker` |
| **测试与文档** | `browser-test-worker`、`e2e-test-worker`、`performance-test-worker`、`api-docs-worker` |
| **基础设施** | `infra-worker` |

> 注：Claude Code 中 jarvis 为斜杠命令（`.claude/commands/jarvis.md`），OpenCode 中为独立 Agent。Codex 不含 review-only 和 review-fix-optimize（这两个为 Claude Code 命令专属功能）。browser-test-worker 三平台均有，依赖 browser-use 全局技能。

## 技能系统

**25 个方法论技能**（+ 1 个全局外部技能 `browser-use`），覆盖从想法细化到发布部署的全生命周期。技能内容独立于智能体提示词，智能体按需加载：

| 类别 | 技能 |
|------|------|
| **基础** | `behavioral-guidelines`、`context-engineering`、`using-agent-skills` |
| **需求** | `spec-driven-development`、`idea-refine` |
| **规划** | `planning-and-task-breakdown` |
| **实现** | `source-driven-development`、`incremental-implementation`、`test-driven-development`、`verification-before-completion`、`debugging-and-error-recovery`、`code-simplification`、`code-quality-gate`、`browser-testing` |
| **审查** | `code-review-and-quality` |
| **安全** | `security-and-hardening` |
| **发布** | `shipping-and-launch`、`git-workflow-and-versioning`、`finishing-a-development-branch` |
| **文档** | `chinese-documentation`、`documentation-and-adrs`、`find-docs` |

## 目录结构

```
.claude/                         # Claude Code 配置（主推）
  settings.json                  #   权限与全局设置
  commands/                      #   8 个 slash 命令
  agents/                        #   47 个智能体定义
  skills/                        #   25 个方法论技能

.opencode/                       # OpenCode 配置
  agents/                        #   48 个智能体定义
  skills/                        #   25 个方法论技能

.codex/                          # Codex 配置
  config.toml                    #   主配置
  agents/                        #   45 个子智能体
  skills/                        #   25 个方法论技能
```

## 设计原则

- **垂直切片**——任务按端到端功能拆分，而非技术层级
- **闸门控制**——每个阶段必须满足对齐条件才能推进，不可绕过
- **需求可追溯**——每条代码变更都能追溯到 `REQ-XXX` 需求条目
- **共享区域唯一责任方**——避免并行写入冲突
- **变更规模控制**——单轮次变更不超过 1000 行
- **最大并发**——无依赖的任务必须在同一条消息中批量调度
- **注释语言约定**——代码注释跟随项目已有语言：中文项目用中文注释，英文项目用英文注释；不确定时检查已有文件

## 致谢

本项目受以下优秀开源项目启发并参考了它们的方法论：

- **[browser-use](https://github.com/browser-use/browser-use)** — 浏览器自动化工具，为本项目的 `/browser-test` 和 `/bug-fix` 闭环提供基于真实浏览器的测试与复现能力
- **[superpowers](https://github.com/obra/superpowers)**（英文原版）— 智能体技能系统的方法论基础，定义了技能即文档（Skills as Documentation）的核心理念
- **[superpowers-zh](https://github.com/jnMetaCode/superpowers-zh)**（中文版）— superpowers 的中文翻译与本地化，为本项目的中文技能体系提供了参考范式

## License

MIT
