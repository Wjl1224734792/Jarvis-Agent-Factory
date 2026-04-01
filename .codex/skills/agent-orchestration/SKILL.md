---
name: agent-orchestration
description: "主编排技能：单一编排者通过 spawn 统一调度所有子代理的完整交付流程——从需求澄清到评审交付。仅在用户显式要求「启动编排」「走编排流程」「用多代理做」时触发。确保 Codex 已开启 multi_agent 以支持 spawn。只能通过显式调用。"
---

# 多代理编排（带对齐闸门版）

本技能将加载了它的主会话变为**唯一的编排者**，通过 spawn 统一调度所有子代理。
**本技能必须由用户显式触发**——当用户明确表示「启动编排」「走完整流程」「用多代理处理」「帮我编排这个需求」等意图时才激活。

---

## 前置条件

- `[features] multi_agent = true`
- `.codex/agents/` 目录下所有子代理配置文件存在
- 编排者可访问并传递上游文档全文
- 所有实现代理均遵守：**不得 spawn，不得越权重定义需求或任务**

---

## 核心约束

1. **单一编排者**
   - 只有主会话有权 spawn
   - 子代理禁止再 spawn 其他子代理

2. **阶段 1 禁止 spawn**
   - 需求澄清必须由编排者直接与用户对话完成
   - 只读探索可按需插入，但不得替代用户对话

3. **传递完整上下文**
   - 每次 spawn 必须传递与本次子任务相关的上游文档全文或等效完整摘要
   - 子代理不能假设自己能读取主会话历史

4. **子代理角色单一**
   - 每个 agent 只完成自己被分配的职责
   - 不越权扩展范围，不擅自修改共享区域

5. **阶段推进受文档对齐闸门约束**
   - 每个阶段不仅要有文档产物，还要满足最小对齐条件
   - 未通过闸门时必须回退，不得硬推进

6. **共享区域唯一责任方**
   - 共享契约、共享类型、数据库结构、路由入口、根配置、全局请求客户端等高风险区域，必须在计划中指定唯一责任方
   - 未指定前，不允许多个代理同时修改

7. **变更必须留痕**
   - 若实现阶段发现必须调整计划、契约、Schema、共享边界，必须先提交 plan patch 或 contract change request
   - 编排者确认后，方可继续推进

---

## 文档对齐闸门（Alignment Gates）

多代理流程中的每个阶段，除产出文档外，还必须满足进入下一阶段的最低对齐条件；未满足时不得继续推进。

详见 `reference/alignment-gates.md`。

### Gate A：需求 → 任务分解

进入 `task_design` 前，需求文档必须至少包含：
1. 需求摘要
2. 目标与成功标准
3. 范围内 / 范围外
4. 关键模块 / 功能列表
5. 风险与开放问题
6. 已收敛结论

若缺少以上任一项：不得进入 `task_design`，必须回到主会话继续澄清。

### Gate B：任务分解 → 执行规划

进入 `planner` 前，任务文档必须至少包含：
1. 任务 ID
2. 任务名称
3. 类型（前端 / 后端 / 共享 / 测试）
4. 优先级
5. 完成标准
6. DDD 分类
7. TDD / test_after / manual_only 分类
8. 风险任务
9. 文件所有权 / 共享路径提醒

若缺少以上任一项：不得进入 `planner`，必须回退 `task_design`。

### Gate C：执行规划 → 实现

进入实现阶段前，计划文档必须至少包含：
1. 当前轮次目标
2. 当前轮次范围
3. 执行代理分工
4. 共享区域唯一责任方
5. 每个任务的 Execution Packet
6. test_strategy
7. 风险提醒
8. 实现者交接信息

若缺少以上任一项：不得进入实现阶段，必须回退 `planner`。

### Gate D：实现 → 评审

进入 `review_qa` 前，实现文档必须至少包含：
1. 当前实现目标
2. 输入依据
3. 变更文件 / 范围
4. 实现说明
5. 测试 / 验证结果
6. 边界与异常处理
7. 风险 / 未解决项
8. 对前端 / 后端 / 共享契约的影响
9. 推荐下一步

若缺少以上任一项：不得进入 `review_qa`，必须回退对应实现代理补齐。

---

## 执行流程

| 阶段 | 执行方式 | 说明 |
|------|----------|------|
| 1 需求澄清 | 编排者直接执行 | 禁止 spawn，与用户对话 |
| 2 任务分解 | spawn `task_design` | 产出任务文档 |
| 3 执行规划 | spawn `planner` | 产出计划文档 + Execution Packets |
| 4 探索（按需） | spawn `repo_explorer` / `docs_researcher` | 只读辅助 |
| 5 实现 | 按计划 spawn 对应 agent | 必须携带 Execution Packet |
| 6 评审 | spawn `review_qa` | 产出评审文档 + 追踪矩阵 |

---

## 执行包（Execution Packet）

planner 必须为每个待执行任务产出一个执行包，编排者 spawn 子代理时原样传递。

详见 `reference/execution-packet.md`。

---

## 实现前理解确认块（Execution Acknowledgement）

所有实现类代理在实际修改前，必须先输出：

```md
## Execution Acknowledgement
- 我本次只实现：
- 我不会修改：
- 我已读取的上游文档：
- 我预计修改的文件 / 路径：
- 我依赖的共享契约 / 接口：
- 若发现冲突，我将回退给 orchestrator：
```

---

## 计划补丁 / 契约变更单

若实现中发现必须调整共享契约、数据库结构、路由前缀、根配置等，不得直接修改。须先提交 plan patch 或 contract change request，由编排者决定。

详见 `reference/plan-patch.md`。

---

## 追踪矩阵

`review_qa` 必须输出需求→任务→实现→测试的追踪矩阵，确保每条需求都落到代码和测试。

---

## 参考文档

- `reference/agents-overview.md` — 代理清单、职责、spawn 策略表
- `reference/workflow.md` — 6 阶段详细流程、回滚规则、产出物清单
- `reference/tdd-rules.md` — TDD Red/Green/Refactor 规则与 spawn 顺序
- `reference/alignment-gates.md` — 文档对齐闸门详细说明
- `reference/execution-packet.md` — 执行包模板
- `reference/plan-patch.md` — 计划补丁 / 契约变更单模板
