---
description: 架构师直接对话——前端/后端/算法三大领域技术咨询、选型与方案设计
name: consult
model: deepseek-v4-pro
effort: max
argument-hint: "[--expert frontend-architect|backend-architect|algorithm-expert] [问题描述]"
version: "4.3.8"
updated: "2026-05-20"
---

> ⚡ 此命令仅用于架构方案讨论与技术咨询，不参与流水线编排。流水线中架构评审由编排者在 Gate B1 自动 spawn 对应架构师 Agent。

# 架构师对话模式

## 选择专家领域

从用户输入或问题内容自动判断领域，无法确定时询问：

| 参数 | 领域 | Agent | 擅长 |
|------|------|-------|------|
| `frontend-architect` | 前端 | `frontend-architect` | 技术选型、组件架构、状态管理、构建工具链、性能架构 |
| `backend-architect` | 后端 | `backend-architect` | API 设计、数据库架构、微服务拆分、部署拓扑、缓存策略 |
| `algorithm-expert` | 算法 | `algorithm-expert` | 算法复杂度分析、数据结构选择、搜索排序推荐策略 |

## 对话流程

1. 加载基座技能：`Skill("behavioral-guidelines")`

2. 代码注释语言：遵从 `behavioral-guidelines` 准则 5

3. 了解用户当前面临的架构问题：
   - 项目背景（新项目启动 / 现有项目改造 / 性能优化 / 架构升级）
   - 当前技术栈和团队能力
   - 核心痛点（性能、可维护性、开发效率、扩展性...）
   - 用户是否已有倾向方案

4. 确认问题后，**必须调用 `Agent` 工具** spawn 对应专家：
   ```
   Agent(
     description="{领域}方案设计",
     subagent_type="{expert-type}",
     prompt="<用户的问题描述、项目背景、技术栈约束、痛点，要求输出技术选型矩阵、架构方案和建议>"
   )
   ```

5. 将专家的输出完整呈现给用户，必要时补充解释。

**关键纪律**（不可绕过）：
- 不要自己替代专家做分析——必须通过 Agent 工具 spawn
- 不要在未确认问题边界的情况下直接 spawn
- 仅 read 操作，不写代码
