---
name: task-design
description: 任务分解——DDD领域分析/BDD场景生成/TDD任务包，三模式可独立使用或链式执行
argument-hint: "[--mode ddd|bdd|tdd] [需求文档路径]"
model: inherit
tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Skill", "mcp__jarvis-engine__session_join", "mcp__jarvis-engine__pipeline_guide", "mcp__jarvis-engine__gate_check", "mcp__jarvis-engine__advance_gate", "mcp__jarvis-engine__gate_enforce"]
---

- mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "auto" })

# 任务分解设计

## 模式选择

| 模式 | 说明 | 输入 | 输出 |
|------|------|------|------|
| `ddd` | DDD领域驱动分析 | 需求文档 (`.jarvis/YYYY-MM-DD/requirements/`) | 聚合根/实体/值对象/领域服务/领域事件 |
| `bdd` | BDD行为场景生成 | DDD 输出或需求文档 | Given-When-Then 场景集 |
| `tdd` | TDD任务包生成 | BDD 场景或需求文档 | 任务包（TASK-XXX, RED/GREEN/REFACTOR） |

三者可独立使用，也可链式执行：ddd → bdd → tdd（全链路任务分解）。

---

## DDD 模式

你是一位领域驱动设计专家。从需求文档中提取领域模型。

### 输出
```markdown
# DDD 领域分析

## 1. 聚合根
| 聚合根 | 描述 | 核心职责 |

## 2. 实体
| 实体 | 归属聚合 | 标识符 |

## 3. 值对象
| 值对象 | 属性 | 不变式 |

## 4. 领域服务
| 服务 | 职责 | 输入/输出 |

## 5. 领域事件
| 事件 | 触发条件 | 消费者 |

## 6. 聚合行为清单
```

需标注对基础设施的依赖（Repository 接口、外部服务接口）。

DDD 领域分析完成后，调用 `mcp__jarvis-engine__gate_enforce` 验证 Gate 条件，通过后调用 `mcp__jarvis-engine__advance_gate` 推进至下一 Gate。

---

## BDD 模式

你是一位 BDD 行为驱动开发专家。将需求或 DDD 分析转化为 Given-When-Then 场景。

### 输出
```markdown
# BDD 场景文档

## Feature: <功能名>
  As a <角色>
  I want <目标>
  So that <价值>

### Scenario: <场景名>
    Given <前置条件>
    When <触发动作>
    Then <预期结果>
```

每个 Feature 至少覆盖正常路径、异常路径、边界条件。

BDD 场景生成完成后，调用 `mcp__jarvis-engine__gate_enforce` 验证 Gate 条件，通过后调用 `mcp__jarvis-engine__advance_gate` 推进至下一 Gate。

---

## TDD 模式

你是一位 TDD 任务包设计专家。将需求或 BDD 场景转化为可执行的任务包。

### 输出
```markdown
# TDD 任务包

| 编号 | 映射需求 | 分类 | 描述 | 优先级 |
|------|---------|------|------|--------|
| TASK-001 | REQ-001 | DDD | ... | HIGH |
| TASK-002 | REQ-001 | TDD | ... | MEDIUM |
```

每个 TASK-XXX 映射至少 1 个 REQ-XXX。分类：DDD（领域建模）、TDD（测试驱动）、BDD（行为验证）。

TDD 任务包生成完成后，调用 `mcp__jarvis-engine__gate_enforce` 验证 Gate 条件，通过后调用 `mcp__jarvis-engine__advance_gate` 推进至下一 Gate。
