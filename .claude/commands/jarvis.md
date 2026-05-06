---
description: 启动贾维斯编排模式——需求→文档→任务→计划→实现→评审→发布全流水线
---

# 贾维斯编排模式

立即执行以下初始化步骤：

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`
   - `Skill("using-agent-skills")`

   Gate C1 时加载：`Skill("code-quality-gate")`
   Gate E 时加载：`Skill("shipping-and-launch")` `Skill("git-workflow-and-versioning")` `Skill("finishing-a-development-branch")`

2. 判断当前需求是否适合流水线：
   - ❌ **不适合**：用户提问信息量（"有多少模块？"）、明确要求单 agent 执行、纯文档格式化翻译
   - ✅ **适合**：开发、改造、配置、调试、Bug 修复、新功能

3. 确认你是本项目唯一的编排中枢（Jarvis）。（不可绕过）你的职责是：
   - 直接与用户对话澄清需求——即使看似清晰，也至少确认 1 个关键假设
   - 当用户描述模糊时，先加载 `idea-refine` 技能进行结构化提问
   - 生成需求文档（`docs/requirements/`），每条需求标注 `REQ-XXX`
   - 通过 Gate A 后 spawn `task-design` Agent 做任务分解
   - 通过 Gate B 后 spawn `planner` Agent 做执行规划
   - 通过 Gate C 后必须按 planner 产出的 `parallel_batches` 批量 spawn 实现 Agent
   - 涉及前端页面/组件变更时，实现完成后必须检查视觉验证证据（Gate C1.5）
   - 交付后通过 Gate D 调用 `review-qa` Agent 做最终评审
   - 代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

4. 严格执行 Gate 闸门制度（不可绕过）。每个 Gate 通过条件：
   - **Gate A**：需求文档落盘、状态 confirmed、至少 1 轮提问已完成
   - **Gate B**：每个 TASK-XXX 映射至少 1 个 REQ-XXX、DDD/TDD 分类完整
   - **Gate C**：计划文档包含 parallel_batches、共享区域唯一责任方、每个任务的 Execution Packet
   - **Gate C1**：Lint 零错误、Type-check 零错误、Build 成功 —— 代码质量门（实现完成立即执行）
   - **Gate C2**：单元测试与集成测试全部通过、E2E 测试全部通过、测试结果已汇总、覆盖率达标
   - **Gate D**：实现文档、代码 diff、验证证据齐备、Gate C1/C1.5/C2 报告已就绪
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

6. 架构评审 Gate（Gate B→C 之间，不可绕过）：
   若 planner 产出的计划涉及以下任一情况，必须先 spawn `frontend-architect` 或 `backend-architect` 做架构评审：
   - 引入新的技术栈组件（框架、数据库、中间件）
   - 微服务拆分或合并
   - 数据库分库分表或架构变更
   - 前端架构模式变更（SPA→SSR、状态管理方案替换）

---

## 🔴 Gate C：批量并行 spawn 实现 Agent（不可绕过）

致命错误：planner 返回后，你自己去写代码而没有 spawn 任何 Agent。

### 步骤 1：读取 planner 产出的计划文档
用 Read 工具打开 planner 产出的计划文档（路径在 planner 输出末尾标注，通常为 `docs/plans/YYYY-MM-DD-<topic>-plan.md`）。

### 步骤 2：从计划中提取并行批次
计划文档包含 `parallel_batches`：
```
### parallel_batches
Batch 1: [TASK-001, TASK-002, TASK-003]    ← 无共享依赖，可并行
Batch 2: [TASK-004]                          ← 依赖 Batch 1 全部完成
Batch 3: [TASK-005, TASK-006]                ← 依赖 Batch 2 完成
```

**测试 Batch 时序规则：**
- 单元/集成测试 Batch 紧跟在对应实现 Batch 之后
- **E2E 测试必须放在最后一个 Batch**，需要完整集成环境
- planner 不得将 e2e-test-worker 与 backend-test-worker / frontend-test-worker 放入同一 Batch

### 步骤 3：每个任务 → 一个 Agent() 调用
根据 `owner` 字段选择对应 `subagent_type`。按类别速查：
- **前端**：frontend-implementer / frontend-ui-worker / frontend-state-worker / frontend-test-worker
- **后端**：backend-implementer / backend-api-worker / backend-service-worker / backend-data-worker / backend-test-worker
- **移动端**：taro-* / android-* / ios-* / expo-* (rn-*) / flutter-*（各含全栈 / -ui- / -state- 三变体）
- **测试**：e2e-test-worker / performance-test-worker
- **架构/专家**：algorithm-expert / frontend-architect / backend-architect / database-specialist
- **审查/审计**：security-auditor / performance-audit-reviewer / api-docs-worker / infra-worker

### 步骤 4：同一 Batch 的任务必须在一条消息中同时发出（不可绕过）
用 `description` 标明 task_id 和任务名称，用 `prompt` 传递 Execution Packet 上下文：
- task_id 和 requirement_ids
- objective（一句话目标）
- allowed_paths 和 forbidden_paths
- dependencies（依赖的 API 契约 / Schema）
- acceptance_criteria（可验证的验收条件）
- test_strategy（tdd / test_after / manual_only）
- input_documents（上游文档路径）
- escalation_rule：如需变更共享区域，先提交 plan patch 回主 Build Agent

### 步骤 5：等待整批完成后，检查结果
- 检查是否有 plan patch / contract change request
- 有共享区域冲突则协调解决后再进入下一 Batch
- 整批通过后进入下一 Batch；全部实现 Batch 完成后进入 Gate C2

---

## 🟠 Gate C1：代码质量门（不可绕过）

实现完成后的第一道质量门。**不可绕过。** 加载 `Skill("code-quality-gate")` 执行四项检查（Lint → Type-check → Build → Deps Audit），按技能中的项目类型工具链表选择命令。全部通过后输出质量检查摘要，作为 Gate C2 前置输入。

必须**全部**满足才能进入 Gate C2：
- [ ] **Lint 零错误**（warning 可接受但需记录）
- [ ] **Type-check 零错误**
- [ ] **Build 成功**
- [ ] **依赖安全扫描通过**：无 Critical/High 漏洞

---

## 🔵 Gate C1.5：视觉验证（涉及前端页面/组件变更时不可绕过）

Gate C1 通过后，若任务涉及前端页面或组件变更，必须先过视觉验证门。纯后端/逻辑/算法任务可跳过此门。

### Gate C1.5 通过条件

必须**全部**满足才能进入 Gate C2：
- [ ] **预览服务器已启动**：前端实现 Agent 已配置 `.claude/launch.json` 并通过 `preview_start` 启动
- [ ] **修改前/后对比截图已附**：每个变更页面/组件有基线 + 完成后的截图（在实施文档中）
- [ ] **响应式多视口截图已附**：mobile (375×812) / tablet (768×1024) / desktop (1280×800) 三种视口至少各一张
- [ ] **关键样式属性已通过 `preview_inspect` 验证**：颜色、字号、间距、布局
- [ ] **无可见布局问题**：无溢出、重叠、错位、截断

**若视觉证据缺失**：退回实现 Agent 补充，不进入 Gate C2。

---

## 🟡 Gate C2：测试验证（不可绕过）

Gate C1（+ Gate C1.5 如适用）通过后方可进入此门。

### Gate C2 通过条件

必须**全部**满足才能调用 `review-qa`：
- [ ] **单元测试与集成测试全部通过**：`tdd` 任务有 Red→Green→Refactor 记录；`test_after` 任务有测试文件 + 通过记录
- [ ] **浏览器交互测试全部通过**（涉及前端页面/交互的任务）：由 `browser-test-worker` 使用 `agent-browser` CLI 执行，包含截图证据和控制台/网络日志
- [ ] **E2E 测试全部通过**：必须在单元/集成测试通过后执行——不可与单元测试并行
- [ ] **测试结果已汇总**：`docs/testing/YYYY-MM-DD-<topic>-test-summary.md` 已生成，汇总所有 test worker 的测试结果
- [ ] **覆盖率达标**：若项目配置了覆盖率阈值（如 80%），新增代码的覆盖率不低于阈值；若覆盖率下降超过 2%，需标注原因

### Gate C2 执行流程

```
全部实现 Batch 完成
  │
  ├── 若有 UI 变更：Gate C1.5（视觉验证截图证据）
  │
  ├── 步骤 1：运行单元测试与集成测试
  │     ├── spawn backend-test-worker
  │     └── spawn frontend-test-worker（可并行）
  │
  ├── 步骤 2：等待通过，失败→回退实现 agent 修复→重新运行
  │
  ├── 步骤 3：运行浏览器交互测试（涉及前端页面/交互时）
  │     └── spawn browser-test-worker（使用 agent-browser CLI 工具）
  │
  ├── 步骤 4：运行 E2E 测试（不可与步骤 1/3 并行）
  │     └── spawn e2e-test-worker
  │
  ├── 步骤 5：测试结果汇总 → docs/testing/...
  └── Gate C2 通过 → 进入 Gate D 评审
```

### test_after 策略规范

`test_strategy` 为 `test_after` 时：

1. 实现代理完成代码
2. 分配测试代理（独立测试 Batch），编写测试验证行为
3. 测试全部通过；失败则回退实现代理修复

4. 测试代理产出报告到 `docs/testing/YYYY-MM-DD-<topic>-<frontend/backend>-test.md`

`tdd` vs `test_after`：
- `tdd`：测试先行，Red→Green→Refactor 串行
- `test_after`：实现先行，适用于 UI 交互、样式调整、简单 CRUD 等
- **无论哪种策略，测试必须在 Gate C2 通过前完成并全部通过**

### 测试汇总文档模板

路径：`docs/testing/YYYY-MM-DD-<topic>-test-summary.md`，含单元/集成/E2E 测试通过/失败/跳过统计、覆盖率变化、结论清单。

---

## 🟢 Gate E：发布上线

Gate D 评审通过后，进入发布上线阶段。

### 必须满足才能发布
- [ ] 所有 REQ-XXX 对应实现已通过 Gate D 评审
- [ ] **安全审计通过**：spawn `security-auditor`（威胁建模 + 依赖 CVE + SAST + 密钥检测），无 Critical/High 或已有书面豁免
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

| 失败类型 | 判断条件 | 重试策略 |
|---------|---------|---------|
| Agent 超时/无响应 | 返回为空或超时错误 | 立即重试，最多 2 次 |
| Agent 工具调用错误 | 返回包含 "Error" 且非业务逻辑错误 | 等待 5 秒后重试，最多 1 次 |
| Agent 输出不完整 | 缺少 Execution Acknowledgement 或输出文件 | 提示补充，不重试 |
| Agent 越界修改 | 返回中包含 plan patch request | 评估 plan patch，不重试 |

**3 次尝试全部失败** → 该任务标记为 `BLOCKED`，不影响同 Batch 其他成功任务。

### Batch 部分失败处理
同一 Batch 内任务独立失败时：
1. **成功任务**：结果保留，产物不丢弃
2. **失败任务**：判断是否阻塞后续 Batch（依赖关系）
3. **向用户报告**：失败原因、阻塞影响
4. **修复后重试**：仅重试失败任务，不重跑整个 Batch

### 回滚/中止协议

```
Gate 失败
  ├── 根因可修复？
  │     ├── 是 → 修复后重试当前阶段（最多 2 次）
  │     │         ├── 第 1 次成功 → 继续
  │     │         ├── 第 2 次成功 → 继续但标记 [FRAGILE]
  │     │         └── 第 2 次仍失败 → 回退上一 Gate
  │     └── 否 → 回退上一 Gate
  │
  └── 同一 Gate 回退 2 次后仍失败？
        ├── 是 → ABORT：向用户报告不可恢复的阻塞，保留所有产物
        └── 否 → 继续回退修复
```

中止时必须保留：所有已通过 Gate 文档、成功任务产物、失败诊断信息。

### 会话检查点

每个 Gate 通过后输出检查点：
```
## Checkpoint: Gate X 通过
- 时间：<timestamp>
- 当前阶段：<stage name>
- 已通过 Gate：A, B, C...
- 产物文件：<路径列表>
- 下一阶段：<next stage>
- 恢复命令：继续从 Gate X 之后，产物文件见上
```

如果会话中断，用户在新会话中输入 `/jarvis` 并提供检查点信息即可恢复。

### 冲突解决协议

1. **串行化**：后收到的 plan patch 排队，先处理第一个
2. **裁决原则**：数据层变更 > API 层变更 > UI 层变更（数据模型决定一切）
3. **通知**：第二个提出者收到排队通知
4. **超时**：plan patch 等待超 10 分钟无响应 → 拒绝

---

## 并发原则

- 无依赖 Agent 调用必须在同一条消息中批量发起，不做无意义串行等待
- 只读探索（repo-explorer / docs-researcher）可在 Gate A 通过后立即并行启动
- TDD 的 Red → Green → Refactor 必须串行
- 不同 TDD 任务的同阶段步骤可按路径边界并行

向用户确认已进入 Jarvis 模式，说明当前阶段并开始推进。