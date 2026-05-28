---
description: 进入只读审查模式——审查代码/项目/风险，不修改任何文件
name: review-only
model: deepseek-v4-pro
argument-hint: [审查对象]
allowed-tools: Read, Glob, Grep, Bash, WebFetch, WebSearch, Skill, Agent
version: "4.4.2"
updated: "2026-05-21"
---

# `/audit` — 只读审查模式

- **命令**：`/review-only [审查对象]`
- **类别**：审查
- **说明**：只读审查模式——审查代码/项目/风险，不修改任何文件，产出分级审查报告。可 spawn 审查 Agent 进行多维度专业审查。

## 使用场景

| 场景 | 说明 |
|------|------|
| PR 代码审查 | 审查代码变更的质量和风险 |
| 项目健康检查 | 全面审查项目架构、质量和安全 |
| 上线前审查 | 发布前最终质量把关 |
| 安全审计 | 专项 OWASP Top 10 安全漏洞审查 |

## 关键 Agent

| Agent | 审查维度 |
|-------|---------|
| project-review-expert | 项目全面审查 |
| diff-review-expert | 差异代码审查 |
| perf-review-expert | 性能审计 |
| change-review-expert | 变更影响审查 |
| security-review-expert | 安全漏洞审查 |
| review-only | 只读审查编排器（CRITICAL 或 3+ MAJOR 时升级为对抗审查） |

## 只读审查模式

立即执行以下初始化步骤：

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`
   - `Skill("code-review-and-quality")`

2. 注册引擎会话（硬约束——引擎确保只读纪律不可绕过）：
   - `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "full" })`
   - `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 允许的操作
   - 读取文件前调用 `mcp__jarvis-engine__gate_check({ operation: "read" })`
   - 生成审查报告前调用 `mcp__jarvis-engine__gate_check({ operation: "write_doc" })`

3. 确认进入**只读审查模式**（不可绕过）。核心纪律：
   - **不修改任何文件** — 不编辑、不格式化、不 stage、不 commit
   - **不修复代码** — 只报告 findings，不写修复

4. 审查流程：
   - 明确审查对象（全仓 / 目录 / diff / PR / 特定风险）
   - 收集证据（文件读取、搜索、命令输出），每条 finding 必须有文件/行号、命令输出或文档依据
   - 可并发调用 `project-review-expert`、`diff-review-expert`、`perf-review-expert`、`code-explore-expert` 等只读 Agent

5. 代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

6. 审查结束后输出结构化报告，包含：
   - 审查范围
   - 按严重度分级的 findings 列表（critical / major / minor / info），每条 finding 附证据依据
   - 风险评估摘要

向用户确认已进入只读审查模式。

---

## 红线
- 只读模式——不修改任何文件，不编辑、不格式化、不 stage、不 commit
- 每条 finding 必须有证据——文件路径+行号+命令输出或文档依据
- 不写修复代码——只报告 findings，不写修复
- 按严重度分级——critical/major/minor/info 不可混用
