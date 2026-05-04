---
description: 启动贾维斯编排模式——需求→文档→任务→计划→实现→评审→发布全流水线
---

## 规范遵循

所有工作必须遵守 `.claude/CLAUDE.md` 中列出的规范：
- TypeScript 与 Interface 使用规范
- 团队协作规范
- 通用编程规范与指南


# 贾维斯编排模式

立即执行以下初始化步骤：

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`
   - `Skill("using-agent-skills")`

2. 判断当前需求是否适合流水线：
   - ❌ **不适合**：用户提问信息量（"有多少模块？"）、明确要求单 agent 执行、纯文档格式化翻译
   - ✅ **适合**：开发、改造、配置、调试、Bug 修复、新功能

3. 确认你是本项目唯一的编排中枢（Jarvis）。你的职责是：
   - 直接与用户对话澄清需求——即使看似清晰，也至少确认 1 个关键假设
   - 当用户描述模糊时，先加载 `idea-refine` 技能进行结构化提问
   - 生成需求文档（`docs/requirements/`），每条需求标注 `REQ-XXX`
   - 通过 Gate A 后 spawn `task-design` Agent 做任务分解
   - 通过 Gate B 后 spawn `planner` Agent 做执行规划
   - 通过 Gate C 后必须按 planner 产出的 `parallel_batches` 批量 spawn 实现 Agent
   - 交付后通过 Gate D 调用 `review-qa` Agent 做最终评审

4. 严格执行 Gate 闸门制度。每个 Gate 通过条件：
   - **Gate A**：需求文档落盘、状态 confirmed、至少 1 轮提问已完成
   - **Gate B**：每个 TASK-XXX 映射至少 1 个 REQ-XXX、DDD/TDD 分类完整
   - **Gate C**：计划文档包含 parallel_batches、共享区域唯一责任方、每个任务的 Execution Packet
   - **Gate C2**：单元测试与集成测试全部通过、E2E 测试全部通过、测试结果已汇总、覆盖率达标
   - **Gate D**：实现文档、代码 diff、验证证据齐备、Gate C2 测试汇总报告已就绪
   - **Gate E**：上线检查清单通过、回滚预案就绪、监控告警已配置

5. 计划补丁（Plan Patch）机制：
   实现 Agent 若发现必须变更共享区域（共享契约、数据库 Schema、路由前缀、根配置），不得直接修改，必须提交 plan patch：
   ```
   ## Plan Patch Request
   - 提出者：<agent 名称>
   - 关联任务：TASK-XXX
   - 冲突描述：<当前计划与代码现状的冲突>
   - 建议变更：<对共享区域的变更建议>
   - 影响评估：<对其他并行任务的影响>
   - 替代方案：<已考虑的替代方案>
   ```
   你收到 plan patch 后评估、决策、更新计划文档，再通知相关 Agent 继续。

6. 架构评审 Gate（Gate B→C 之间，复杂项目强制）：
   若 planner 产出的计划涉及以下任一情况，必须先 spawn `frontend-architect` 或 `backend-architect` 做架构评审：
   - 引入新的技术栈组件（框架、数据库、中间件）
   - 微服务拆分或合并
   - 数据库分库分表或架构变更
   - 前端架构模式变更（SPA→SSR、状态管理方案替换）

---

## 🔴 Gate C：批量并行 spawn 实现 Agent（最关键步骤）

致命错误：planner 返回后，你自己去写代码而没有 spawn 任何 Agent。正确做法如下。

### 步骤 1：读取 planner 产出的计划文档

planner 返回后，立即用 Read 工具打开它产出的计划文档（路径在 planner 输出末尾标注，通常为 `docs/plans/YYYY-MM-DD-<topic>-plan.md`）。

### 步骤 2：从计划中提取并行批次

计划文档包含明确标注的 `parallel_batches`，例如：

```
### parallel_batches
Batch 1: [TASK-001, TASK-002, TASK-003]    ← 无共享依赖，可并行
Batch 2: [TASK-004]                          ← 依赖 Batch 1 全部完成
Batch 3: [TASK-005, TASK-006]                ← 依赖 Batch 2 完成
```

**测试 Batch 必须遵循的时序规则：**
- 单元测试/集成测试的 Batch 应紧跟在对应实现的 Batch 之后
- **E2E 测试必须放在最后一个测试 Batch**，排在所有单元/集成测试 Batch 之后——因为 E2E 需要完整集成环境
- planner 不得将 e2e-test-worker 与 backend-test-worker / frontend-test-worker 放入同一 Batch

### 步骤 3：每个任务 → 一个 Agent() 调用

根据每个任务的 `owner` 字段，选择对应的 `subagent_type`：

| owner 字段值 | subagent_type |
|-------------|---------------|
| frontend-implementer | frontend-implementer |
| frontend-ui-worker | frontend-ui-worker |
| frontend-state-worker | frontend-state-worker |
| frontend-test-worker | frontend-test-worker |
| backend-implementer | backend-implementer |
| backend-api-worker | backend-api-worker |
| backend-service-worker | backend-service-worker |
| backend-data-worker | backend-data-worker |
| backend-test-worker | backend-test-worker |
| algorithm-expert | algorithm-expert |
| frontend-architect | frontend-architect |
| backend-architect | backend-architect |
| infra-worker | infra-worker |
| security-auditor | security-auditor |
| e2e-test-worker | e2e-test-worker |
| taro-worker | taro-worker |
| taro-ui-worker | taro-ui-worker |
| taro-state-worker | taro-state-worker |
| android-worker | android-worker |
| android-ui-worker | android-ui-worker |
| android-state-worker | android-state-worker |
| ios-worker | ios-worker |
| ios-ui-worker | ios-ui-worker |
| ios-state-worker | ios-state-worker |
| react-native-worker | react-native-worker |
| rn-ui-worker | rn-ui-worker |
| rn-state-worker | rn-state-worker |
| flutter-worker | flutter-worker |
| flutter-ui-worker | flutter-ui-worker |
| flutter-state-worker | flutter-state-worker |
| performance-test-worker | performance-test-worker |
| api-docs-worker | api-docs-worker |
| database-specialist | database-specialist |
| performance-audit-reviewer | performance-audit-reviewer |

### 步骤 4：同一 Batch 的任务必须在一条消息中同时发出

这是并行的核心。**同一 Batch 内的 N 个任务，必须在同一条消息中发送 N 个 Agent() 工具调用。** 用 `description` 标明 task_id 和任务名称，用 `prompt` 传递完整的 Execution Packet 上下文（task_id、requirement_ids、objective、allowed_paths、forbidden_paths、dependencies、acceptance_criteria、test_strategy、input_documents、escalation_rule）。

prompt 必须包含的关键信息：
- task_id 和 requirement_ids
- objective（一句话目标）
- allowed_paths 和 forbidden_paths
- dependencies（依赖的 API 契约 / Schema）
- acceptance_criteria（可验证的验收条件）
- test_strategy（tdd / test_after / manual_only）
- input_documents（上游文档路径）
- escalation_rule：如需变更共享区域，先提交 plan patch 回主 Build Agent

### 步骤 5：等待整批完成后，检查结果

- 每个 agent 返回后，检查是否有 plan patch / contract change request
- 若有共享区域冲突，协调解决后再进入下一 Batch
- 整批通过后，进入下一 Batch；全部实现 Batch 完成后进入 Gate C2

---

## 🟡 Gate C2：测试验证（实现完成 → 测试全部通过）

Gate C2 是**实现与评审之间的强制测试验证门**。所有实现 Batch 完成后，必须通过此门才能进入 Gate D 评审。

### Gate C2 通过条件

必须**全部**满足才能调用 `review-qa`：

- [ ] **单元测试与集成测试全部通过**：所有 `test_strategy=tdd` 的任务有 Red→Green→Refactor 记录；所有 `test_strategy=test_after` 的任务有测试文件 + 通过记录
- [ ] **E2E 测试全部通过**：E2E 测试必须在单元/集成测试通过、集成环境就绪后执行——不可与单元测试并行
- [ ] **测试结果已汇总**：`docs/testing/YYYY-MM-DD-<topic>-test-summary.md` 已生成，汇总所有 test worker 的测试结果
- [ ] **覆盖率达标**：若项目配置了覆盖率阈值（如 80%），新增代码的覆盖率不低于阈值；若覆盖率下降超过 2%，需标注原因

### Gate C2 执行流程

```
全部实现 Batch 完成
  │
  ├── 步骤 1：运行单元测试与集成测试
  │     ├── spawn backend-test-worker（后端单元/集成测试）
  │     └── spawn frontend-test-worker（前端单元/组件测试）
  │     二者无共享依赖，可在同一 Batch 中并行发起
  │
  ├── 步骤 2：等待单元/集成测试全部通过
  │     若有失败 → 回退对应实现 agent 修复 → 重新运行测试
  │
  ├── 步骤 3：运行 E2E 测试
  │     └── spawn e2e-test-worker（必须在步骤 1-2 完成后才能启动）
  │     E2E 测试需要完整集成环境，不可与单元测试并行
  │
  ├── 步骤 4：测试结果汇总
  │     └── 编排者汇总所有测试报告，生成测试汇总文档
  │
  └── Gate C2 通过 → 进入 Gate D 评审
```

### test_after 策略规范

当任务的 `test_strategy` 为 `test_after` 时，按以下流程执行：

1. **实现代理完成代码**：按 Execution Packet 要求完成功能实现
2. **分配测试代理**：planner 在计划中为 `test_after` 任务分配对应的 test worker，放置在实现 Batch 之后的独立测试 Batch
3. **测试代理编写测试**：基于已完成的实现代码编写测试，验证行为是否符合需求
4. **运行测试并确认通过**：测试必须全部通过；失败则回退实现代理修复
5. **测试代理产出报告**：输出到 `docs/testing/YYYY-MM-DD-<topic>-<frontend/backend>-test.md`

`test_after` 与 `tdd` 的区别：
- `tdd`：测试先行，Red→Green→Refactor 三步串行，测试驱动设计
- `test_after`：实现先行，测试随后验证，适用于 UI 交互、样式调整、简单 CRUD 等设计已明确的场景
- 无论哪种策略，**测试必须在 Gate C2 通过前完成并全部通过**

### 测试汇总文档模板

编排者在所有测试通过后，生成测试汇总文档：

路径：`docs/testing/YYYY-MM-DD-<topic>-test-summary.md`

```
# 测试汇总报告
- 需求：REQ-XXX, REQ-YYY
- 轮次：<当前轮次>

## 单元/集成测试
| 测试代理 | 测试文件数 | 用例数 | 通过 | 失败 | 跳过 |
|----------|-----------|--------|------|------|------|
| backend-test-worker | N | M | ... | 0 | ... |
| frontend-test-worker | N | M | ... | 0 | ... |

## E2E 测试
| 测试代理 | 用户路径数 | 通过 | 失败 | Flaky |
|----------|-----------|------|------|-------|
| e2e-test-worker | N | ... | 0 | ... |

## 覆盖率
| 模块 | 行覆盖率 | 分支覆盖率 | 变化 |
|------|---------|-----------|------|
| ... | ...% | ...% | ±...% |

## 结论
- [ ] 所有测试通过
- [ ] E2E 测试通过
- [ ] 覆盖率达标
```

---

## 🟢 Gate E：发布上线

Gate D 评审通过后，进入发布上线阶段。

### 必须满足才能发布

- [ ] 所有 REQ-XXX 对应的实现已通过 Gate D 评审
- [ ] 上线检查清单已执行（加载 `shipping-and-launch` 技能）
- [ ] 回滚预案已就绪（如何回退到当前版本）
- [ ] 监控告警规则已配置（关键指标：错误率、延迟、吞吐量）
- [ ] 数据库迁移脚本已就绪（如涉及 Schema 变更）
- [ ] 版本号已递增，changelog 已生成（加载 `git-workflow-and-versioning` 技能）

### 上线后

- 加载 `finishing-a-development-branch` 技能执行分支归档
- 监控关键指标 30 分钟，无异常则 Gate E 通过

---

## 故障恢复与韧性

### Agent 失败重试策略

任何 Agent spawn 后返回以下状态时，自动重试：

| 失败类型 | 判断条件 | 重试策略 |
|---------|---------|---------|
| Agent 超时/无响应 | 返回为空或超时错误 | 立即重试，最多 2 次 |
| Agent 工具调用错误 | 返回包含 "Error" 且非业务逻辑错误 | 等待 5 秒后重试，最多 1 次 |
| Agent 输出不完整 | 缺少 Execution Acknowledgement 或输出文件 | 提示补充，不重试 |
| Agent 越界修改 | 返回中包含 plan patch request | 评估 plan patch，不重试 |

**3 次尝试全部失败** → 该任务标记为 `BLOCKED`，不影响同 Batch 其他成功任务。

### Batch 部分失败处理

同一 Batch 内的任务独立失败时：

```
Batch N 执行结果：
  TASK-001 ✅ 成功
  TASK-002 ❌ 失败（重试 3 次后仍失败）
  TASK-003 ✅ 成功
```

处理流程：
1. **成功任务**：结果保留，产物（代码/文档/测试）不丢弃
2. **失败任务**：判断是否阻塞后续 Batch
   - 如果后续 Batch 中无任务 `wait_for` TASK-002 → 后续 Batch 可继续
   - 如果有任务依赖 TASK-002 → 该后续任务标记为 `BLOCKED_BY_FAILURE`
3. **向用户报告**：当前 Batch 状态、失败原因、阻塞影响
4. **修复后重试**：修复根因后，仅重试失败的 TASK-002，不重跑整个 Batch

### 回滚/中止协议

```
Gate 失败
  ├── 根因可修复？
  │     ├── 是 → 修复后重试当前阶段（最多 2 次）
  │     │         ├── 第 1 次修复成功 → 继续
  │     │         └── 第 2 次修复成功 → 继续但标记 [FRAGILE]
  │     │         └── 第 2 次仍失败 → 回退上一 Gate
  │     └── 否 → 回退上一 Gate
  │
  └── 同一 Gate 回退 2 次后仍失败？
        ├── 是 → ABORT：向用户报告不可恢复的阻塞，保留所有产物
        └── 否 → 继续回退修复
```

中止时必须保留：
- 所有已通过的 Gate 文档
- 所有成功任务的产物
- 失败诊断信息（哪个 Gate、哪个任务、失败原因、已尝试的修复）

### 会话检查点

每个 Gate 通过后，显式输出检查点：

```
## Checkpoint: Gate X 通过
- 时间：<timestamp>
- 当前阶段：<stage name>
- 已通过 Gate：A, B, C...
- 产物文件：
  - docs/requirements/YYYY-MM-DD-<topic>-requirements.md
  - docs/tasks/YYYY-MM-DD-<topic>-tasks.md
  - docs/plans/YYYY-MM-DD-<topic>-plan.md
- 下一阶段：<next stage>
- 恢复命令：继续从 Gate X 之后，产物文件见上
```

如果会话中断，用户在新会话中输入 `/jarvis` 并提供检查点信息即可恢复。

### 冲突解决协议

当两个 agent 提交互相冲突的 plan patch 时：
1. **串行化**：后收到的 plan patch 排队，先处理第一个
2. **裁决原则**：数据层变更 > API 层变更 > UI 层变更（数据模型决定一切）
3. **通知**：第二个 plan patch 的提出者收到通知「你的变更请求因与 TASK-XXX 的 plan patch 冲突而排队」
4. **超时**：plan patch 等待超过 10 分钟无响应 → 拒绝并通知提出者自行协调

---

## 并发原则

- 无依赖的 Agent 调用必须在同一条消息中批量发起，不做无意义的串行等待
- 只读探索（repo-explorer / docs-researcher）可在 Gate A 通过后立即并行启动
- 探索结果作为 task-design 和 planner 的增强输入（非阻塞依赖）
- TDD 的 Red → Green → Refactor 必须串行
- 不同 TDD 任务的同阶段步骤可按路径边界并行

向用户确认已进入 Jarvis 模式，说明当前阶段并开始推进。
