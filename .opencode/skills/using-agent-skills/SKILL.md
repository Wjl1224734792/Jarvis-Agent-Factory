---
name: using-agent-skills
description: "使用智能体技能系统——元技能指南：了解技能体系的结构、如何加载技能、技能如何与 Agent 配合、何时加载哪些技能。用于指导用户和编排者正确使用本项目的技能系统。"
---

# 使用智能体技能系统

## 概述

本技能是你的技能系统的"使用说明书"。它告诉你：
- 有哪些技能可用
- 技能与 Agent 如何配合
- 在什么阶段应该加载什么技能
- 如何扩展技能系统

**核心原则：** 技能是可复用的方法论——它们是"怎么做好一件事"的剧本。Agent 是执行者，技能是执行手册。

## 仓库规范

本仓库在 `.opencode/rules/` 下定义了以下规范，所有代理和技能均须遵守：

- **通用编程规范与指南** — 语言（中文）、注释规范、嵌套控制、数组操作、模块化、设计原则（SOLID/DRY/KISS）、DDD/TDD 策略、Tailwind CSS 规范、质量检查清单。
- **团队协作规范** — 代码风格（Prettier）、代码质量（ESLint + TypeScript strict）、分支管理、提交规范（Conventional Commits）、研发流程与质量门禁、CI/CD Pipeline。
- **TypeScript 与 Interface 使用规范** — 默认 `interface` 优先，特定场景用 `type`；Zod 环境下以 schema 推断类型为准。

> 详细规范见 `.opencode/rules/` 下的三个文件。

## 技能与 Agent 的关系

```
技能（Skills）         →  教 Agent "怎么做"
Agent（智能体）        →  负责 "做什么"

编排者（Jarvis）       →  决定 "谁做 + 什么时候做 + 用什么技能"
子 Agent（Workers）    →  执行具体任务，加载相关技能
```

### 工作流

```
用户请求
  ↓
Jarvis 加载相关技能（如 spec-driven-development）
  ↓
Jarvis 按流程调度子 Agent
  ↓
子 Agent 加载分配给自己的技能（如 TDD、source-driven-development）
  ↓
子 Agent 按技能方法论执行任务
  ↓
结果交付 + 审查
```

---

## 技能目录（按流程阶段）

### 阶段 0：想法细化
| 技能 | 用途 | 加载者 |
|------|------|--------|
| `idea-refine` | 模糊想法 → 结构化需求 | Jarvis |
| `spec-driven-development` | 编写结构化 PRD | Jarvis |
| `chinese-documentation` | 中文文档排版规范 | Jarvis / 所有 Agent |

### 阶段 1：规划与分解
| 技能 | 用途 | 加载者 |
|------|------|--------|
| `planning-and-task-breakdown` | 需求 → 可执行任务 | task-design |
| `context-engineering` | 选择性上下文传递 | Jarvis（调度时） |

### 阶段 2：实现
| 技能 | 用途 | 加载者 |
|------|------|--------|
| `source-driven-development` | 先读代码再写代码 | 所有实现 Agent |
| `test-driven-development` | TDD Red→Green→Refactor | test-worker 角色 |
| `incremental-implementation` | 小步增量交付 | 所有实现 Agent |
| `code-simplification` | 降低代码复杂度 | 所有实现 Agent（Refactor 阶段） |

### 阶段 3：验证
| 技能 | 用途 | 加载者 |
|------|------|--------|
| `verification-before-completion` | 完成前验证清单 | 所有实现 Agent（交付前） |
| `debugging-and-error-recovery` | 系统化调试 | 所有 Agent（遇到 Bug 时） |

### 阶段 4：审查
| 技能 | 用途 | 加载者 |
|------|------|--------|
| `code-review-and-quality` | 五轴审查框架 | diff-code-reviewer / review-qa |
| `security-and-hardening` | 安全专项审查 | review-qa / diff-code-reviewer |

### 阶段 5：交付与上线
| 技能 | 用途 | 加载者 |
|------|------|--------|
| `git-workflow-and-versioning` | Git 操作规范 | 所有 Agent |
| `finishing-a-development-branch` | 分支完成收尾流程 | 所有 Agent（功能完成时） |
| `documentation-and-adrs` | 文档与架构决策记录 | 所有 Agent |
| `shipping-and-launch` | 上线检查清单与灰度发布 | Jarvis |

### 元技能
| 技能 | 用途 | 加载者 |
|------|------|--------|
| `using-agent-skills` | 本技能——技能系统使用指南 | Jarvis / 用户引导 |
| `behavioral-guidelines` | 通用行为准则 | **所有 Agent 必须加载** |

---

## 如何加载技能

### 编排者加载技能

在系统提示中被列为"可用技能"时，编排者或 Agent 可以通过以下方式加载技能：
- 在上下文中引用 `@技能名`
- 使用 Skill 工具加载：调用技能系统以注入技能的完整指令

### 何时加载

| 时机 | 加载的技能 |
|------|-----------|
| 收到新需求时 | `idea-refine` → `spec-driven-development` |
| 开始任务分解 | `planning-and-task-breakdown` |
| 分配实现任务时 | 传递 `source-driven-development` + `incremental-implementation` |
| 开始 TDD 任务时 | `test-driven-development` |
| 实现交付前 | `verification-before-completion` |
| 遇到 Bug 时 | `debugging-and-error-recovery` |
| 开始代码审查 | `code-review-and-quality` |
| 功能完成时 | `finishing-a-development-branch` |
| 准备上线时 | `shipping-and-launch` |
| **任何时候** | `behavioral-guidelines`（始终遵守） |

---

## 技能文件结构

每个技能是一个目录，其中包含：

```
skill-name/
├── SKILL.md          # 技能主文件（必须）
│   ├── 概述           # 核心原则
│   ├── 何时使用       # 适用/不适用场景
│   ├── 流程           # 分阶段步骤
│   ├── 常见借口       # 合理化借口与驳斥
│   ├── 红线           # 危险信号，停下来
│   └── 验证清单       # 完成后的自检
└── references/       # 可选：补充参考文件
    ├── examples.md
    └── templates.md
```

---

## Agent 目录

你的智能体编排系统包含以下 Agent：

### 主控 Agent
| Agent | 模式 | 职责 |
|-------|------|------|
| `jarvis` | primary | 唯一编排者：需求澄清 → 任务分解 → 规划 → 实现 → 评审全流程 |
| `review-only` | primary | 只审查模式：调度审查代理，只报告不修改 |
| `review-fix-optimize` | primary | 审查修复优化全链路：初审 → 修复 → 复审 |

### 规划与评审 Agent
| Agent | 职责 |
|-------|------|
| `task-design` | 需求 → 任务分解、DDD/TDD 分类 |
| `planner` | 任务 → 执行计划、分工与 Execution Packet |
| `review-qa` | 需求一致性、实现质量与回归审查、追踪矩阵 |

### 只读审查 Agent
| Agent | 职责 |
|-------|------|
| `diff-code-reviewer` | git diff / PR 代码审查 |
| `project-audit-reviewer` | 项目结构、配置、脚本、文档漂移审查 |
| `performance-audit-reviewer` | 性能风险、基线缺口审查 |
| `repo-explorer` | 只读探索代码库结构与风险边界 |
| `docs-researcher` | 外部文档与 API 参考检索 |

### 修复 Agent
| Agent | 职责 |
|-------|------|
| `remediation-planner` | findings → 修复/优化计划 |
| `remediation-worker` | 小范围修复、配置、文档、脚本 |
| `post-change-reviewer` | 修复后复核与关闭矩阵 |

### 前端实现 Agent
| Agent | 职责 |
|-------|------|
| `frontend-implementer` | 前端多维度完整实现（页面+状态+测试） |
| `frontend-ui-worker` | 页面布局、组件、样式、响应式、a11y |
| `frontend-state-worker` | 状态管理、数据获取、缓存、路由 |
| `frontend-test-worker` | 前端测试、TDD 流程 |

### 后端实现 Agent
| Agent | 职责 |
|-------|------|
| `backend-implementer` | 后端多维度完整实现（API+业务+数据+测试） |
| `backend-api-worker` | 路由、控制器、验证、中间件、错误处理 |
| `backend-service-worker` | 业务规则、领域逻辑、状态机、权限 |
| `backend-data-worker` | Schema、ORM、Repository、迁移 |
| `backend-test-worker` | 后端测试、TDD 流程 |

---

## 扩展指南

### 添加新技能

1. 在 `.opencode/skills/` 下创建新目录
2. 编写 `SKILL.md`，遵循标准格式
3. 更新本技能文件（`using-agent-skills`），将新技能加入目录表
4. 更新相关 Agent 文件，引用新技能

### 添加新 Agent

1. 在 `.opencode/agents/` 下创建 `.md` 文件
2. 定义 frontmatter（description, mode, model, permissions）
3. 编写 Agent 指令，引用所需技能
4. 更新 `jarvis.md` 的子代理调度策略表
5. 更新本技能文件，将新 Agent 加入目录表

---

## 快速参考卡

```
新需求来了？
  → idea-refine（模糊→清晰）
  → spec-driven-development（写 PRD）
  → planning-and-task-breakdown（拆任务）
  → 按计划并行分配实现

开始写代码？
  → source-driven-development（先读代码）
  → test-driven-development（先写测试）
  → incremental-implementation（小步提交）
  → verification-before-completion（交付前验证）

代码写完了？
  → git-workflow-and-versioning（规范提交）
  → code-review-and-quality（五轴审查）
  → finishing-a-development-branch（收尾合并）
  → shipping-and-launch（上线发布）

遇到 Bug 了？
  → debugging-and-error-recovery（系统化调试）

不确定怎么做？
  → behavioral-guidelines（四项准则）
  → context-engineering（上下文管理）
```
