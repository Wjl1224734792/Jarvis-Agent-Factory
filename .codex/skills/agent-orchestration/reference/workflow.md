# 编排工作流程（带对齐闸门版）

## 阶段 1：需求澄清与需求文档（编排者直接执行）

阶段 1 分为两个连续子阶段：

1. **1A 需求澄清**：编排者直接与用户对话，确认目标、范围、成功标准、约束和关键假设。
2. **1B 需求文档**：编排者将已确认内容写入 `docs/requirements/YYYY-MM-DD-<topic>-requirements.md`，并让后续阶段只以该文档为事实源。

子代理不得替代用户澄清；`task_design`、`planner` 和实现代理不得在需求文档通过 Gate A 前启动。只读探索可按需插入，但只能回答具体事实问题，不能替编排者生成需求结论。

### 1A 强制提问规则

**收到用户需求后，编排者必须先输出澄清问题，不得直接撰写任务文档、计划文档或 Execution Packet。**

即使用户描述看似完整，也必须：
1. 至少确认 1 个关键假设（如目标用户、范围边界、技术约束、优先级、成功标准）
2. 明确告知用户"我将基于以下理解编写需求文档，请确认或补充"
3. 等待用户确认或明确授权继续后，再进入需求文档撰写

### 标准化提问框架（按需覆盖，非全部必问）

| 维度 | 示例问题 |
|------|----------|
| 目标 | "这个功能要解决什么核心问题？成功的标准是什么？" |
| 用户 | "谁会使用这个功能？使用场景是什么？" |
| 范围 | "哪些明确不做？边界在哪里？" |
| 技术 | "有技术选型偏好？需要兼容现有系统吗？" |
| 数据 | "数据来源是什么？需要持久化吗？" |
| 优先级 | "MVP 最小可用版本包含哪些？哪些可以后续迭代？" |
| 风险 | "有哪些已知的技术风险或业务风险？" |

### 1A 收敛信号

当满足以下任一条件时，可结束提问、开始撰写需求文档：
- 用户明确表示"就这些了"或"开始吧"
- 连续 2 轮提问用户均无补充
- 需求已覆盖 Gate A 必要项，且关键假设已获用户确认

可选只读探索：
- `repo_explorer`：了解代码结构（只读）
- `docs_researcher`：查询第三方库能力（只读）

### 1B 需求文档

**产出：** `docs/requirements/YYYY-MM-DD-<topic>-requirements.md`

**需求文档必须包含：**
1. 文档状态：`draft` / `confirmed`
2. 原始用户目标摘要
3. 需求摘要
4. 目标与成功标准
5. 范围内 / 范围外
6. 用户 / 角色 / 使用场景（如适用）
7. 需求条目表：每条范围内需求使用 `REQ-XXX` 编号
8. 非功能约束：性能、安全、兼容性、可访问性、运维等（按需）
9. 风险与开放问题
10. 已确认假设与用户结论
11. 后续任务分解提示

需求条目表至少包含：

| requirement_id | 描述 | 优先级 | 验收标准 | 来源 / 确认方式 |
|---|---|---|---|---|
| REQ-001 | <可实现、可验证的一条需求> | must / should / could | <可检查条件> | 用户确认 / 编排者显式假设 |

### 需求文档确认

写完需求文档后，编排者必须向用户给出文档路径和极简摘要，并请求确认。只有满足以下任一条件，才能将文档视为可进入 Gate A：

- 用户明确确认需求文档可继续
- 用户在澄清阶段已明确授权"按上述理解继续"，且需求文档没有引入新范围
- 仅存在非阻塞开放问题，并已在需求文档中标记为后续计划处理

### Gate A 检查点

完成需求文档后，必须检查是否满足 Gate A 全部条件。不通过则回到主会话继续澄清或修订需求文档，不得进入阶段 2。

---

## 阶段 2：任务分解

```text
spawn agent: task_design
input: 已通过 Gate A 的需求文档路径 + 全文
```

**产出：** `docs/tasks/YYYY-MM-DD-<topic>-tasks.md`

**任务文档必须包含：**
1. 任务 ID（TASK-XXX 格式）
2. 任务名称
3. 对应需求 ID（一个或多个 `REQ-XXX`）
4. 类型（前端 / 后端 / 共享 / 测试）
5. 优先级
6. 完成标准
7. DDD 分类
8. TDD / test_after / manual_only 分类
9. 风险任务
10. 文件所有权 / 共享路径提醒

**回退规则：** 若 task_design 发现需求不清晰、缺少 `REQ-XXX`、或任务无法追溯到需求条目，回退阶段 1。

### Gate B 检查点

完成任务文档后，必须检查是否满足 Gate B 全部条件。不通过则回退 `task_design`，不得进入阶段 3。

---

## 阶段 3：执行规划

```text
spawn agent: planner
input: 已通过 Gate A 的需求文档 + 已通过 Gate B 的任务文档（路径 + 全文）
```

**产出：** `docs/plans/YYYY-MM-DD-<topic>-plan.md`

**planner 必须额外产出：**
- 每个任务的 Execution Packet（详见 `execution-packet.md`）
- 每个 Execution Packet 对应的 `requirement_ids`
- 共享区域唯一责任方
- 并行 / 串行顺序
- `test_strategy`（tdd / test_after / manual_only）
- 实现者交接信息
- `plan patch / contract change request` 触发条件

**回退规则：** 若 planner 发现需求或任务不足，回退阶段 2 或 1。

### Gate C 检查点

完成计划文档后，必须检查是否满足 Gate C 全部条件。不通过则回退 `planner`，不得进入实现阶段。

---

## 阶段 4：按需探索（可选）

```text
# 代码边界不明确时
spawn agent: repo_explorer
input: 具体探索问题

# 第三方库用法不确定时
spawn agent: docs_researcher
input: 具体文档查询问题
```

结果纳入阶段 5 输入，但不得替代计划文档。

---

## 阶段 5：实现（编排者直接 spawn 各实现 agent）

编排者依据 planner 的 Execution Packet 直接调度实现代理。不存在中间编排者层。

详见 `agents-overview.md` 的 spawn 策略表。

### 实现前要求

每个实现代理在实际修改前，必须先输出 `Execution Acknowledgement`：

```md
## Execution Acknowledgement
- 我本次只实现：
- 对应需求 ID：
- 我不会修改：
- 我已读取的上游文档：
- 我预计修改的文件 / 路径：
- 我依赖的共享契约 / 接口：
- 若发现冲突，我将回退给 orchestrator：
```

编排者需确认确认块内容与 Execution Packet 一致后，方可继续。

### 并行规则

- 前端 agent 与后端 agent：天然可并行（文件域不同）
- 同域内多个 worker：文件不重叠时可并行
- TDD Red 阶段：不得与其他实现步骤改同一文件
- 共享区域（共享类型、Schema、路由入口）：必须指定唯一责任方

### TDD 执行

对 `test_strategy: tdd` 的任务，按顺序 spawn：
1. **Red**：spawn test_worker → 写失败测试
2. **Green**：spawn 实现 worker → 最小实现
3. **Refactor**：spawn test_worker → 整理代码

详见 `tdd-rules.md`。

### 实现中变更规则

若发现必须调整：
- 共享契约
- 数据库结构
- 路由前缀
- 根配置
- 全局请求客户端
- 多代理边界

则：
1. 停止直接实现
2. 先提交 `plan patch` 或 `contract change request`（详见 `plan-patch.md`）
3. 由编排者决定是否更新计划后继续

### 简单任务直通

单文件小修复可跳过 implementer，直接 spawn 对应 worker。

**产出：** `docs/implementation/YYYY-MM-DD-<topic>-*-implementation.md`

**实现文档必须包含对应的 `requirement_ids` / `task_id`，并说明实际变更如何满足 Execution Packet 的验收标准。**

### Gate D 检查点

完成实现文档后，必须检查是否满足 Gate D 全部条件。不通过则回退对应实现代理补齐，不得进入阶段 6。

---

## 阶段 6：评审

```text
spawn agent: review_qa
input: 需求文档 + 任务文档 + 计划文档 + 实现文档 + 代码变更 + 测试/lint/build 结果
```

**产出：** `docs/review/YYYY-MM-DD-<topic>-review.md`

**review_qa 必须输出：**
1. 审查结论（通过 / 有条件通过 / 不通过）
2. 需求覆盖情况
3. 计划一致性
4. 前后端边界一致性
5. 测试覆盖状态
6. 问题列表（阻塞 / 高 / 中 / 低）
7. 必须修复项
8. 优化建议
9. 回归建议
10. **追踪矩阵**（requirement_id → task_id → planned_owner → changed_files → tests → review_result）

若不通过，回退到阶段 5 修复后重新 spawn review_qa。

---

## 回滚规则

| 问题 | 回退目标 |
|------|----------|
| 需求冲突 | 阶段 1（编排者直接澄清） |
| 任务分解错误 | 阶段 2（spawn task_design） |
| 计划 / 分工问题 | 阶段 3（spawn planner） |
| 共享区域冲突 | 阶段 3 或 plan patch |
| 实现遗漏 / 偏离 | 阶段 5（重新 spawn 对应 agent） |
| 评审不通过 | 阶段 5 修复后重新 spawn review_qa |

子代理发现的问题由编排者汇总决策，不自行修补。

---

## 产出物清单

| 阶段 | 产出物 | 路径 |
|------|--------|------|
| 1 | 需求文档 | `docs/requirements/YYYY-MM-DD-<topic>-requirements.md` |
| 2 | 任务文档 | `docs/tasks/YYYY-MM-DD-<topic>-tasks.md` |
| 3 | 计划文档 | `docs/plans/YYYY-MM-DD-<topic>-plan.md` |
| 3.5 | 计划补丁 / 契约变更单（按需） | `docs/plans/` 或 `docs/contracts/` |
| 4 | 探索 / 研报（可选） | `docs/analysis/` 或 `docs/research/` |
| 5 | 实现文档 | `docs/implementation/YYYY-MM-DD-<topic>-*-implementation.md` |
| 6 | 评审文档 | `docs/review/YYYY-MM-DD-<topic>-review.md` |
