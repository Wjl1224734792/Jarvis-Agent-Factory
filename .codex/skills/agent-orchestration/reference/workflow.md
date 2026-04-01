# 编排工作流程

## 阶段 1：需求澄清（编排者直接执行，禁止 spawn）

编排者与用户对话追问并收敛需求。子代理无法向用户追问。

可选 spawn 辅助探索：
- `repo_explorer`：了解代码结构（只读）
- `docs_researcher`：查询第三方库能力（只读）

**产出：** `docs/requirements/YYYY-MM-DD-<topic>-requirements.md`

**需求文档内容：** 需求摘要、目标与成功标准、范围内/外、模块与功能列表、关键流程与关键对象、模块交互草案、与当前代码结构的映射、风险与开放问题、推荐下一步。

**跳过条件：** 需求已是可直接实现的明确输入（须用户确认）。

---

## 阶段 2：任务分解

```
spawn agent: task_design
input: 需求文档路径 + 全文
```

**产出：** `docs/tasks/YYYY-MM-DD-<topic>-tasks.md`

包含：任务分解、依赖顺序、DDD 分类、TDD/直接开发分类、风险任务、文件所有权提醒。

若 task_design 发现需求不清晰，回退阶段 1。

---

## 阶段 3：执行规划

```
spawn agent: planner
input: 需求文档 + 任务文档（路径+全文）
```

**产出：** `docs/plans/YYYY-MM-DD-<topic>-plan.md`

planner 的计划须明确：每条任务由哪个 agent 执行、是否并行、`test_strategy`（tdd / test_after / manual_only）、共享区域职责分配。

若 planner 发现不足，回退阶段 2 或 1。

---

## 阶段 4：按需探索（可选）

```
# 代码边界不明确时
spawn agent: repo_explorer
input: 具体探索问题

# 第三方库用法不确定时
spawn agent: docs_researcher
input: 具体文档查询问题
```

结果纳入阶段 5 输入。

---

## 阶段 5：实现（编排者直接 spawn 各实现 agent）

编排者根据 planner 的计划，直接 spawn 对应的实现 agent。不存在中间编排者层。

详见 `agents-overview.md` 的 spawn 策略表。

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

### 简单任务直通

单文件小修复可跳过 implementer，直接 spawn 对应 worker。

**产出：** `docs/implementation/YYYY-MM-DD-<topic>-*-implementation.md`

---

## 阶段 6：评审

```
spawn agent: review_qa
input: 需求文档 + 任务文档 + 计划文档 + 实现文档 + 代码变更
```

**产出：** `docs/review/YYYY-MM-DD-<topic>-review.md`

若不通过，回退到阶段 5 修复后重新 spawn review_qa。

---

## 回滚规则

| 问题 | 回退目标 |
|------|----------|
| 需求冲突 | 阶段 1（编排者直接澄清） |
| 任务分解错误 | 阶段 2（spawn task_design） |
| 计划/分工问题 | 阶段 3（spawn planner） |
| 实现冲突/遗漏 | 阶段 5（重新 spawn 对应 agent） |
| 评审不通过 | 阶段 5 修复后重新 spawn review_qa |

子代理发现的问题由编排者汇总决策，不自行修补。

---

## 产出物清单

| 阶段 | 产出物 | 路径 |
|------|--------|------|
| 1 | 需求文档 | `docs/requirements/YYYY-MM-DD-<topic>-requirements.md` |
| 2 | 任务文档 | `docs/tasks/YYYY-MM-DD-<topic>-tasks.md` |
| 3 | 计划文档 | `docs/plans/YYYY-MM-DD-<topic>-plan.md` |
| 4 | 探索/研报（可选） | `docs/analysis/` 或 `docs/research/` |
| 5 | 实现文档 | `docs/implementation/YYYY-MM-DD-<topic>-*-implementation.md` |
| 6 | 评审文档 | `docs/review/YYYY-MM-DD-<topic>-review.md` |
