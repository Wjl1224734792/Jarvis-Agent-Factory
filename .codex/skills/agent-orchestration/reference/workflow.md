# 编排工作流程（带对齐闸门版）

## 阶段 1：需求澄清（编排者直接执行，禁止 spawn）

编排者与用户对话追问并收敛需求。子代理不得替代用户澄清。

可选 spawn 辅助探索：
- `repo_explorer`：了解代码结构（只读）
- `docs_researcher`：查询第三方库能力（只读）

**产出：** `docs/requirements/YYYY-MM-DD-<topic>-requirements.md`

**需求文档必须包含：**
1. 需求摘要
2. 目标与成功标准
3. 范围内 / 范围外
4. 关键模块 / 功能列表
5. 风险与开放问题
6. 已收敛结论（用户已确认或主会话明确）

**跳过条件：** 需求已是可直接实现的明确输入（须用户确认）。

### Gate A 检查点

完成需求文档后，必须检查是否满足 Gate A 全部条件。不通过则回到主会话继续澄清，不得进入阶段 2。

---

## 阶段 2：任务分解

```text
spawn agent: task_design
input: 需求文档路径 + 全文
```

**产出：** `docs/tasks/YYYY-MM-DD-<topic>-tasks.md`

**任务文档必须包含：**
1. 任务 ID（TASK-XXX 格式）
2. 任务名称
3. 类型（前端 / 后端 / 共享 / 测试）
4. 优先级
5. 完成标准
6. DDD 分类
7. TDD / test_after / manual_only 分类
8. 风险任务
9. 文件所有权 / 共享路径提醒

**回退规则：** 若 task_design 发现需求不清晰，回退阶段 1。

### Gate B 检查点

完成任务文档后，必须检查是否满足 Gate B 全部条件。不通过则回退 `task_design`，不得进入阶段 3。

---

## 阶段 3：执行规划

```text
spawn agent: planner
input: 需求文档 + 任务文档（路径 + 全文）
```

**产出：** `docs/plans/YYYY-MM-DD-<topic>-plan.md`

**planner 必须额外产出：**
- 每个任务的 Execution Packet（详见 `execution-packet.md`）
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
10. **追踪矩阵**（requirement_id → task_id → executor → changed_files → tests → review_result）

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
