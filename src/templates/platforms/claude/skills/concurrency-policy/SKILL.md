---
name: concurrency-policy
description: "并发调用与 Team/Subagent 分配规范——无依赖并行、同层并行跨层串行、Team 按规模选择、Gate 级并发规则"
version: "4.7.55"
updated: "2026-05-22"
---

# Concurrency Policy — 并发调用与 Team/Subagent 分配规范

## 核心原则

1. **无依赖 = 并行**：互不依赖的任务在同一条消息中同时发出，不等不串行
2. **同层并行、跨层串行**：同级目录/模块并行处理，父子依赖的层级串行
3. **Team 按规模**：>10 文件或跨模块变更 → Team 模式；≤10 文件 → Subagent 模式
4. **批量同发**：同一 Gate 内的独立 Agent 调用一次发出，不做无意义的逐个等待

## 执行模式选择

| 条件 | 模式 | 说明 |
|------|------|------|
| 文件数 ≤5，单模块 | Subagent（直接 spawn） | 轻量，一个 Agent 完成 |
| 文件数 5-10，单模块 | Subagent × 2-3（并行） | 拆分到无冲突文件组 |
| 文件数 >10，跨模块 | Team 模式 | TeamCreate → 按模块分配成员 |
| 只读探索（多目录） | Subagent × N（并行） | 每个目录一个 explore agent |
| 审查（多领域） | Subagent × N（并行） | 前端/后端/安全/性能审查同发 |

## Team 模式规范

### 何时用 Team

满足任一条件即触发 Team 模式：
- 变更文件 >10 个
- 跨 ≥3 个源码目录
- 需要前端+后端同时实现
- 需要多种测试（单元+集成+E2E）同时进行

### Team 创建与销毁

```
1. TeamCreate({ team_name: "{task}-{gate}" })
2. spawn Agent（指定 team_name, name, subagent_type）
3. 全部完成后 → SendMessage 发送 shutdown_request
4. TeamDelete() 清理
```

### Team 成员分配

| 场景 | 成员配置 |
|------|---------|
| 前端+后端 | frontend-dev-expert + backend-dev-expert |
| 全栈审查 | frontend-review + backend-review + security-review + perf-review |
| 并行测试 | frontend-test + backend-test + e2e-test |
| 多模块实现 | 每个模块一个 dev-expert，无文件重叠 |

### 降级策略

- 不支持 TeamCreate → 回退到并行 Subagent 模式
- <5 文件的小任务 → 直接用 Subagent，不创建 Team

## 并行 Subagent 规范

### 何时并行

- 探索多个目录（code-explore-expert × N）
- 多领域审查（frontend-review + backend-review + security-review + perf-review）
- 多类型测试（单元 + 集成 + E2E）
- 多模块实现（无共享文件冲突）

### 何时串行

- 子任务依赖父任务输出（如 planner 产出后才能 spawn 实现 Agent）
- 共享文件有写入冲突
- 测试依赖实现完成（先实现 → 后测试）
- 审查依赖测试报告（先测试 → 后审查）

## Gate 级并发规则

| Gate | 并发策略 | 说明 |
|------|---------|------|
| Gate A | 需求澄清 → 并行探索（explore × N） | 探索可并行 |
| Gate B-BDD/BDD/TDD | 串行 | DDD → BDD → TDD 依赖链 |
| Gate B1 | 并行架构评审 | frontend-architect + backend-architect + database-architect |
| Gate C | 串行 planner | 单 Agent 产出计划 |
| Gate C-impl | 按 batch 内并行 | 同 batch 无冲突 → 同发；batch 间串行 |
| Gate C1 | 并行质量检查 | lint + typecheck + build + audit 同发 |
| Gate C2 | 并行测试 | unit + integration + e2e 同发 |
| Gate D | 并行审查 | 前端/后端/安全/性能审查同发 → qa-review 串行等待 |
| Gate E | 串行发布 | 质量重检 → 版本递增 → changelog → commit+tag+push |

## Agent 专用并发规则

每个 Agent 的 frontmatter 中可声明 `concurrency` 字段：

```yaml
concurrency:
  max_parallel_spawns: 4      # 此 Agent 最多并行 spawn 数
  team_preferred: false        # 是否优先使用 Team 模式
  safe_to_parallelize: true    # 此 Agent 的输出是否可被下游并行消费
```

未声明时使用默认值：max_parallel_spawns=4, team_preferred=false, safe_to_parallelize=true。

## 反模式（禁止）

- ❌ 串行 spawn 无依赖的 Agent（浪费轮次）
- ❌ 小任务（<5 文件）创建 Team（过度开销）
- ❌ 共享文件的并发写入（必然冲突）
- ❌ 等待 agent 结果时不发其他独立任务
- ❌ 测试和审查并发执行（审查依赖测试报告）
