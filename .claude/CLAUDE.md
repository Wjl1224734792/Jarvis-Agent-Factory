# .claude/CLAUDE.md

## 规范遵循（强制）

**所有工作、所有子代理、所有技能调用，必须无条件遵守以下规范文件。不可跳过、不可简化、不可凭记忆替代。**

### 核心规范文件

子代理在开始任何工作前，必须使用 `Read` 工具读取以下规范文件：

1. **[TypeScript 与 Interface 使用规范](rules/TypeScript与Interface使用规范.md)** — 默认 `interface`，Zod 环境下以 schema 为准
2. **[团队协作规范](rules/团队协作规范.md)** — Prettier/ESLint、分支管理、提交规范、CI/CD
3. **[通用编程规范与指南](rules/通用编程规范与指南.md)** — DDD/TDD、嵌套限制、数组操作、模块化等

### 规则遵循要求

- 每个子代理启动时，必须已读取或立即读取上述三份规范文件
- 代码输出必须与规范逐条对照，违反规范即为不通过
- 规范冲突时，以 `.claude/rules/` 下的专项规范为准
- 发现规范覆盖不到的场景，不得自行假设——回退主控确认

## 模型分配规则

### 分配逻辑

模型分配基于**任务本质**而非单一维度：

| 任务本质 | 首选模型 | 理由 |
|---------|---------|------|
| 代码生成/实现 | `mimo-v2.5-pro` | SWE-bench 57.2%，代码工程领先 |
| 长链规划/编排 | `mimo-v2.5-pro` | ClawEval 64%，Agent 任务第一 |
| 深度分析/审查 | `deepseek-v4-pro` | 强推理能力，适合多维度判断 |
| 需要联网搜索 | `deepseek-v4-pro` | Mimo 系列不支持 WebSearch/WebFetch |
| 专项聚焦任务 | `mimo-v2.5` | 范围明确，逻辑集中 |
| 轻量探索+联网 | `deepseek-v4-flash` | 快速文档搜索与代码探索 |

### 具体分配

| 模型 | 数量 | Agent |
|------|------|-------|
| `deepseek-v4-pro` | **11** | algorithm-expert, backend-architect, diff-code-reviewer, frontend-architect, performance-audit-reviewer, post-change-reviewer, project-audit-reviewer, review-fix-optimize, review-only, review-qa, security-auditor |
| `mimo-v2.5-pro` | **6** | backend-implementer, database-specialist, frontend-implementer, planner, remediation-planner, task-design |
| `mimo-v2.5` | **28** | 所有专项 worker（android/ios/flutter/taro/rn/frontend/backend/browser/e2e/infra/performance/remediation worker 等） |
| `deepseek-v4-flash` | **2** | docs-researcher, repo-explorer |

### 核心原则

- **任务本质决定模型**：代码生成 → Mimo，深度分析 → DeepSeek，不简单按是否联网二分
- **Mimo 不用于 WebSearch/WebFetch**，该场景统一使用 DeepSeek
- 审查/审计类 agent 需要强推理和多维度判断 → `deepseek-v4-pro`

### 预留模型（未分配）

| 模型 | 定位 | 预留场景 |
|------|------|---------|
| `mimo-v2-pro` | 前代旗舰（>1T/42B, 1M context） | 备选复杂任务 |
| `mimo-v2-omni` | 全模态基座（文本+视觉+语音, 256K） | 未来图像/语音分析 agent |

## 子代理

子代理定义在 `.claude/agents/`，通过 Agent 工具调度。子代理不互相调用。

## 技能

技能定义在 `.claude/skills/`，通过 Skill 工具加载。
