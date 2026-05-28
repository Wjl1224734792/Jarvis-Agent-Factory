---
description: 启动贾维斯全流程编排——需求→任务→计划→实现→质量→测试→评审→发布
name: jarvis
argument-hint: "[任务描述]"
model: inherit
tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Skill", "Agent", "mcp__jarvis-engine__session_join", "mcp__jarvis-engine__pipeline_guide", "mcp__jarvis-engine__gate_check", "mcp__jarvis-engine__advance_gate", "mcp__jarvis-engine__gate_enforce"]
---

# 贾维斯全流程编排

## 🔴 硬约束（代码级强制执行，不可绕过）

以下约束通过 `.claude/settings.json` 的 `PostToolUse` hooks 在代码层面强制执行，**不是建议，是硬性阻断**：

1. **Write / Edit 工具受 Gate 管控** — 在 Gate A、B-DDD、B-BDD、B-TDD、B1、C1、C1.5、C2、D 阶段，直接使用 `Write`/`Edit` 工具写代码会被 Hook 拦截（`exit 1`）。只有 Gate C 和 Gate C-impl 允许直接写代码。
2. **编排者禁止直接编码** — 你是编排中枢，不是实现者。所有代码变更必须通过 `Agent()` spawn 实现类子 Agent 完成。唯一的例外：Gate C 计划文档写入、Gate E 发布脚本、以及该命令自身的维护。
3. **Gate 序列不可跳过** — A→B-DDD→B-BDD→B-TDD→B1→C→C-impl→C1→C1.5→C2→D→E，引擎 FSM 拒绝回退/跳跃。
4. **与 `/auto` 区别**：
   - `/jarvis`（本命令）— **全流程严格模式**，10 道闸门全部强制执行。适合中大型功能开发。
   - `/auto` — **智能路由模式**，自动检测任务类型→路由最优流水线→跳过无关Gate→按复杂度分配Team/Subagent。适合日常所有任务。

> **你的 Write/Edit 操作会被实时检查。** 若当前 Gate 不允许写代码，操作将被引擎阻断并显示 `🚫 <Gate>: 操作 "write_code" 被禁止`。此时你只能通过 spawn Agent 推进流水线。

立即执行以下初始化步骤：

1. 🔴 **创建任务会话（必须第一步执行，不可跳过）**：
   - `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "full" })`
   - **不传 task_name**——此时需求未明确，会话默认显示"未命名"
   - 此调用会创建独立会话+新 run，自动生成 `.jarvis/YYYY-MM-DD/` 日期产物目录
   - **每个 Gate 开始时**调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 上下文
   - **生成 Agent 前**调用 `mcp__jarvis-engine__gate_check({ operation: "spawn_impl" })` 验证操作被允许
   - **每个 Gate 完成后**调用 `mcp__jarvis-engine__gate_enforce` 验证条件，通过后 `mcp__jarvis-engine__advance_gate({ gate: "<下一Gate>" })` 推进

2. 加载基座技能（并行）：
   - `Skill("behavioral-guidelines")`
   - `Skill("using-agent-skills")`
   - `Skill("context-engineering")`
   - `Skill("incremental-implementation")`
   - `Skill("verification-before-completion")`
   - `Skill("concurrency-policy")`
   - `Skill("session-memory")`

3. 判断是否适合流水线：
   - ❌ 不适合：纯信息提问、单 agent 可完成的简单修改、纯文档翻译
   - ✅ 适合：开发、改造、配置、调试、Bug 修复、新功能

4. 你是本项目唯一的编排中枢。职责：
   - 与用户澄清需求，至少确认 1 个关键假设；模糊时加载 `idea-refine`
   - 生成需求文档到 `.jarvis/YYYY-MM-DD/requirements/<topic>.md`，标注 `REQ-XXX`
   - 按 Gate 序列推进，不可跳过
   - 在 Gate C-impl 按 `parallel_batches` 批量 spawn 实现 Agent
   - 代码注释语言：中文项目用中文注释，英文项目用英文注释

5. **加载会话上下文**：`session_join` 返回的 `context_summary` 包含历史会话摘要。若有内容（非空），说明之前有未完成的任务或关键决策，必须在开始任务规划前告知用户。若 `context_summary` 为空则跳过。

---

## 流水线配置

- **pipeline_type**: `full`
- **Gate 序列**: A → B-DDD → B-BDD → B-TDD → B1 → C → C-impl → C1 → C1.5 → C2 → D → E（12 道闸门）
- **可用代理**: 全部 47 个 agent（前端/后端/移动端/测试/审查/架构/专家/文档/基础设施）
- **典型 Batch 结构**:
  ```
  Batch 1: [frontend-ui-expert, frontend-state-expert, backend-api-expert, backend-data-expert]
  Batch 2: [frontend-dev-expert, backend-logic-expert]
  Batch 3: [frontend-test-expert, backend-test-expert, api-contract-expert]
  Batch 4: [browser-test-expert]（如有前端变更）
  Batch 5: [e2e-test-expert]（最后，需完整集成环境）
  ```

---

## Gate A：需求澄清

**目标**：产出需求文档，状态 confirmed，至少 1 轮提问已完成

**流程**：
1. 与用户对话澄清需求，确认关键假设
2. 模糊时加载 `Skill("idea-refine")` 结构化提问
3. 写需求文档到 `.jarvis/YYYY-MM-DD/requirements/<topic>.md`，每条需求标注 `REQ-XXX`

Gate A 通过后可并行探索（按项目复杂程度决定并发数）：
**引擎验证**：spawn 前 `gate_check({ operation: "read" })` 确认允许读取探索
```
├── code-explore-expert × N（各自探索不同模块/目录）
│   ├── code-explore-expert（前端 src/ 目录）
│   ├── code-explore-expert（后端 src/ 目录）
│   └── code-explore-expert（共享模块/配置）
└── external-resource-expert × N（各自搜索不同技术栈文档）
    ├── external-resource-expert（前端框架/库最新文档）
    └── external-resource-expert（后端框架/库最新文档）
```

**引擎验证**：需求确认后，推进时设置任务标题：
`mcp__jarvis-engine__gate_enforce()` → `mcp__jarvis-engine__advance_gate({ gate: "Gate B-DDD", task_name: "<需求澄清后的任务摘要>" })`

---

## Gate B：任务分解（DDD → BDD → TDD 三级递进）

### Gate B-DDD：领域驱动分析

**目标**：DDD 领域分析文档，含聚合/实体/值对象/领域服务列表+路由建议

**流程**：
1. `spawn task-design` Agent（DDD 模式），传入需求文档路径
2. 产出：`.jarvis/YYYY-MM-DD/tasks/<topic>-ddd.md`
3. 验证：所有聚合行为有路由建议（→BDD 或 →TDD）

**引擎验证**：`gate_enforce` → `advance_gate({ gate: "Gate B-BDD" })`

### Gate B-BDD：行为驱动（条件性）

**触发条件**：DDD 产出中存在"高业务价值/复杂规则/需验收"的聚合行为。若无此类行为（全部纯技术逻辑），编排者可跳过此 Gate。

**流程**：
1. `spawn task-design` Agent（BDD 模式），传入 DDD 文档 + 高价值聚合行为列表
2. 产出：`.jarvis/YYYY-MM-DD/tasks/<topic>-bdd.md`
3. 验证：每个聚合行为至少 1 个 Happy Path + 1 个异常场景

**引擎验证**：`gate_enforce` → `advance_gate({ gate: "Gate B-TDD" })`

### Gate B-TDD：测试驱动任务分解

**目标**：TDD 任务包，每个 TASK 映射 REQ + BDD 场景

**流程**：
1. `spawn task-design` Agent（TDD 模式），传入 BDD 场景 或 纯技术需求
2. 产出：`.jarvis/YYYY-MM-DD/tasks/<topic>-tasks.md`
3. 验证：所有 TASK 有 REQ 映射、DDD/TDD 分类完整、无水平切片

**引擎验证**：`gate_enforce` → `advance_gate({ gate: "Gate B1" })`

---

## Gate B1：架构评审（条件性）

若计划涉及新技术栈、微服务拆分、数据库架构变更或前端架构模式变更，在 planner 产出前先评审：

``` [可并行]
spawn frontend-architect（前端架构评审）
spawn backend-architect（后端架构评审）
spawn database-architect（数据库架构评审）
```

---

## Gate C：执行规划

**目标**：计划文档包含 parallel_batches、共享区域唯一责任方、每个任务的 Execution Packet

**流程**：
1. `spawn planner` Agent，传入需求文档 + 任务文档路径
2. 产出：`.jarvis/YYYY-MM-DD/plans/<topic>-plan.md`
3. 验证：含 parallel_batches、Execution Packet 完整、共享区域有唯一责任方

``` [可并行]
planner 执行期间可并行准备：
└── 预加载代码库上下文（为后续实现 Agent 准备）
```

**引擎验证**：`gate_enforce` → `advance_gate({ gate: "Gate C-impl" })`

---

## Gate C-impl：批量并行实现

**致命错误**：planner 返回后，你自己去写代码而没有 spawn 任何 Agent。

### 步骤 1：读取计划文档
Read 打开 `.jarvis/YYYY-MM-DD/plans/<topic>-plan.md`

### 步骤 2：提取并行批次
从 plan 文档提取 `parallel_batches`（每 Batch 内任务无共享文件冲突，可并行）

### 步骤 3：spawn Agent
同一 Batch 的任务在 **一条消息中同时发出**（不可串行逐个等待）。

**引擎验证**：spawn 前必须 `gate_check({ operation: "spawn_impl" })` — 若 Gate 不允许则停止，不可绕过。

每个 Agent() 调用携带：
- `task_id` 和 `requirement_ids`
- `objective`（一句话目标）
- `allowed_paths` / `forbidden_paths`
- `dependencies`（API 契约 / Schema）
- `required_skills`（子 Agent 启动后逐一 Skill() 加载）
- `acceptance_criteria`
- `test_strategy`（tdd / test_after / manual_only）
- `input_documents`
- `escalation_rule`：需变更共享区域时先提交 plan patch

**Agent 类型速查**：
| 领域 | subagent_type |
|------|--------------|
| 前端全栈 | `frontend-dev-expert` |
| 前端 UI | `frontend-ui-expert` |
| 前端状态 | `frontend-state-expert` |
| 后端全栈 | `backend-dev-expert` |
| 后端 API | `backend-api-expert` |
| 后端业务 | `backend-logic-expert` |
| 后端数据 | `backend-data-expert` |
| 任务分解 | `task-design`（DDD模式/BDD模式/TDD模式） |
| 移动端 | `android-dev-expert` / `ios-dev-expert` / `flutter-dev-expert` / `taro-dev-expert` / `react-native-dev-expert` |
| 测试 | `frontend-test-expert` / `backend-test-expert` / `e2e-test-expert` / `browser-test-expert` |
| 审查 | `qa-review-expert` / `security-review-expert` / `perf-review-expert` |
| 架构 | `frontend-architect` / `backend-architect` / `database-architect` |
| 文档 | `api-contract-expert` |
| 修复 | `remediation-expert` |
| 探索 | `code-explore-expert` / `external-resource-expert` |

### 步骤 4：等待整批完成
- 检查 plan patch / contract change request
- 有共享区域冲突则协调后再进入下一 Batch
- 全部实现 Batch 完成后进入 Gate C1

---

## Gate C1：代码质量门

**目标**：Lint + Type-check + Build + Deps Audit 全部通过

**流程**：
1. 加载 `Skill("code-quality-gate")`
2. 执行四项检查

``` [可并行]
├── Lint 检查（npm run lint / eslint）
├── Type-check（tsc --noEmit）
├── Build（npm run build）
└── Deps Audit（npm audit / yarn audit）
```

**全部通过**：`advance_gate({ gate: "Gate C1.5" })`

**任意项不通过**：
1. 分析失败原因，修复对应源文件
2. 重新运行**全部四项检查**（不可只跑失败的单项）
3. 最多 3 轮修复，仍不通过 → 标记 `BLOCKED`，向用户报告阻塞原因和修复建议
4. 通过后推进到 Gate C1.5

---

## Gate C1.5：视觉验证（条件性）

**触发条件**：涉及前端页面/组件变更。纯后端/逻辑/算法任务跳过。

**条件**：
- 预览服务器已启动（`.claude/launch.json` + `preview_start`）
- 修改前/后对比截图已附
- 响应式三视口截图已附（mobile 375x812 / tablet 768x1024 / desktop 1280x800）
- 关键样式属性已通过 `preview_inspect` 验证
- 无可见布局问题

**通过**：`advance_gate({ gate: "Gate C2" })`

**不通过**：
1. **证据缺失** → 退回实现 Agent 补充截图/样式验证数据
2. **布局问题**（溢出/重叠/错位）→ 诊断根因，修复源文件，重新截图验证
3. 修复后重新过 Gate C1.5，最多 2 轮；仍不通过 → 标记 `BLOCKED`，附最新截图证据向用户报告

---

## Gate C2：测试验证

**目标**：所有测试通过，报告汇总，覆盖率达标

**流程**：

``` [可并行 - 步骤 1]
**引擎验证**：spawn 前 `gate_check({ operation: "spawn_test" })` 确认 Gate C2 允许测试
├── spawn backend-test-expert（单元+集成测试）
├── spawn frontend-test-expert（单元+组件测试）
├── spawn browser-test-expert（浏览器交互测试，如有前端变更）
└── spawn api-contract-expert（API 契约一致性验证，如有后端变更）
```

**步骤 2**：等待以上全部通过。

**任一步骤 1 agent 测试失败**：
1. 分析失败报告，定位需修复的实现 Agent + 源文件
2. spawn 原实现 Agent 执行修复（传递测试失败报告），修复后重新跑对应测试
3. 最多 2 轮修复-重测循环
4. 2 轮仍失败 → 标记 `BLOCKED`，汇总失败测试和修复历史向用户报告
5. 若失败与共享区域相关 → 先提交 plan patch 再修复

步骤 1 全部通过后继续步骤 3。

``` [最后 - 步骤 3]
└── spawn e2e-test-expert（端到端测试，需完整集成环境）
```

**步骤 4**：汇总测试结果到 `.jarvis/YYYY-MM-DD/testing/<topic>-test-summary.md`

通过后：`advance_gate({ gate: "Gate D" })`

---

## Gate D：评审

**目标**：代码审查通过，REQ 追踪矩阵完整

**步骤 1 — 领域审查（5 个专家并行，其中 algorithm-expert 条件性触发）**：
**引擎验证**：spawn 前 `gate_check({ operation: "review" })` 确认 Gate D 允许审查
```
├── spawn frontend-review-expert（前端代码审查：组件/样式/状态/性能/可访问性）
├── spawn backend-review-expert（后端代码审查：API/业务逻辑/数据层/安全）
├── spawn security-review-expert（安全审计：威胁建模/CVE/SAST/密钥检测）
├── spawn perf-review-expert（性能审计：bundle/LCP/查询/运行时）
└── spawn algorithm-expert（算法审查：条件性——仅当变更涉及复杂算法/计算密集型模块时触发）
```

**algorithm-expert 触发条件**（满足任一即触发）：
- 涉及自定义排序/搜索/匹配算法
- 涉及加密/哈希/签名等密码学操作
- 涉及图计算/动态规划/回溯等复杂逻辑
- 涉及 ML 推理/特征工程/模型优化
- 涉及大数据量处理（N > 10^5）的性能敏感代码
- 编排者判断代码复杂度高、需算法专项审查

**步骤 2 — 综合签核（等待步骤 1 全部完成）**：
```
└── spawn qa-review-expert（综合签核：REQ追踪/文档/Gate条件，汇聚5个领域报告）
```

**步骤 3 — 审查失败回退循环**：

qa-review-expert 综合报告后，按严重度处理：

| 严重度 | 处理方式 |
|--------|---------|
| **[BLOCKED]** | 立即停止——关键需求缺失、契约断裂、安全 Critical。按领域 spawn 对应实现 Agent 修复，修复后**重新走完整 Gate D**（步骤 1→2→3） |
| **[FIX_REQUIRED]** | 按领域回退修复。修复后重新 spawn 对应的领域审查 expert + qa-review-expert |
| **[WARNING]** | 记录到技术债务，不阻塞推进 |

**修复回路规则**：
1. 前端审查不通过 → spawn 原前端实现 Agent（根据变更文件选 `frontend-dev-expert` / `frontend-ui-expert` / `frontend-state-expert`）
2. 后端审查不通过 → spawn 原后端实现 Agent（根据变更文件选 `backend-dev-expert` / `backend-api-expert` / `backend-logic-expert` / `backend-data-expert`）
3. 安全审计不通过 → spawn 受影响模块的实现 Agent，传递安全报告；修复后重新 spawn `security-review-expert`
4. 性能审计不通过 → spawn 受影响模块的实现 Agent，传递性能报告；修复后重新 spawn `perf-review-expert`
5. 算法审查不通过 → spawn 原实现 Agent，传递算法报告；修复后重新 spawn `algorithm-expert`
6. QA 签核不通过 → 分析阻断项归属，回退对应阶段修复

**最大重试**：Gate D 最多 2 轮完整审查-修复-重审循环。2 轮仍不通过 → 标记 `ABORT`，汇总所有审查报告和修复历史向用户报告不可恢复的阻塞。

全部通过后：`advance_gate({ gate: "Gate E" })`

---

## Gate E：发布上线

**🔴 前置条件（质量重检——Gate D 修复后必须重新验证，不可跳过）**：

Gate D 评审过程中可能触发代码修复，因此发布前**必须**重新执行质量门和测试：

```
┌─────────────────────────────────────────────────────────┐
│  🔴 Gate E 质量重检循环（最多 2 轮）                      │
│                                                         │
│  步骤 1: 加载 Skill("code-quality-gate")                 │
│          → Lint + Type-check + Build + Deps Audit        │
│  步骤 2: npm test（或项目测试命令）                       │
│                                                         │
│  全部通过 → 继续发布流程                                  │
│  任意失败 → spawn 对应实现 Agent 修复根因                  │
│          → 回到步骤 1（重跑全部，不可只跑失败项）           │
│  2 轮仍失败 → 标记 ABORT，汇总失败报告向用户报告           │
└─────────────────────────────────────────────────────────┘
```

**发布条件**：
- 所有 REQ 实现已通过 Gate D 评审
- 安全审计无 Critical/High 或已有书面豁免
- 上线检查清单已执行（`Skill("shipping-and-launch")`）
- 回滚预案已就绪
- 版本号已递增，changelog 已生成（`Skill("git-workflow-and-versioning")`）
- 数据库迁移脚本已就绪（如有 Schema 变更）

**上线检查不通过**：
1. 逐项修复不通过的检查项
2. 重新执行 `Skill("shipping-and-launch")` 上线检查清单
3. 最多 2 轮修复；仍不通过 → 标记 `ABORT`，保留所有产物，向用户报告阻塞原因

上线后：加载 `Skill("finishing-a-development-branch")` 归档
**引擎验证**：部署前 `gate_check({ operation: "deploy" })` 确认 Gate E 允许发布

---

## 故障恢复

### Agent 失败重试
| 失败类型 | 重试策略 |
|---------|---------|
| 超时/无响应 | 立即重试，最多 2 次 |
| 工具调用错误 | 等 5s 后重试，最多 1 次 |
| 输出不完整 | 提示补充，不重试 |
| Plan patch request | 评估 patch，不重试 |

3 次全部失败 → 标记 `BLOCKED`，不影响同 Batch 其他成功任务。

### Batch 部分失败
成功任务结果保留。仅重试失败任务。向用户报告阻塞影响。

### 会话检查点
每个 Gate 通过后输出：
```
## Checkpoint: Gate X 通过
- 时间：<timestamp>
- 产物文件：<路径列表>
- 下一阶段：<next gate>
```
中断后在新会话输入 `/jarvis` 并提供检查点信息即可恢复。

### 冲突解决
- Plan patch 串行排队处理
- 裁决原则：数据层 > API 层 > UI 层
- 超时 10 分钟无响应 → 拒绝

---

## 并发原则

- 无依赖 Agent 在同一条消息中批量发出
- 只读探索可在 Gate A 通过后立即并行
- TDD 的 Red→Green→Refactor 必须串行
- 不同 TDD 任务的同阶段步骤可按路径边界并行

---
## 并发调用规范（引用 concurrency-policy 技能）

> 详细规则见 `Skill("concurrency-policy")`。本节为 `/jarvis` 全流程专用的执行摘要。

### 模式选择速查

| 条件 | 模式 | 首条消息发出数 |
|------|------|-------------|
| ≤5 文件，单模块 | Subagent ×1 | 1 个 Agent |
| 5-10 文件，单模块 | Subagent ×2-3 并行 | 同发 2-3 个 |
| >10 文件，跨 ≥3 目录 | **Team 模式** | TeamCreate → 按模块分配 |
| 只读探索多目录 | Subagent ×N 并行 | 同发 N 个 explore |
| 多领域审查 | Subagent ×4 并行 | 同发 4 个 review |

### Gate C-impl: 按计划批次并行实现

```
1. 读 planner 产出的 parallel_batches
2. 同 batch 内 Agent 一条消息同发（无文件冲突）
3. batch 间串行（后 batch 可能依赖前 batch 产出）
4. >10 文件或跨 ≥3 目录 → TeamCreate({ team_name: "{task}-impl" })
5. 每个成员独占文件/模块，无重叠
```

**代码智能工具（Agent 实现时使用）：**
- `mcp__jarvis-engine__jarvis_ast_search` — AST 语法树搜索，理解现有代码结构
- `mcp__jarvis-engine__jarvis_ast_replace` — 安全替换（dryRun 默认 true，先预览再应用）
- `mcp__jarvis-engine__jarvis_lsp_hover` / `mcp__jarvis-engine__jarvis_lsp_goto_definition` / `mcp__jarvis-engine__jarvis_lsp_find_references` — 理解现有 API 和引用链
- `mcp__jarvis-engine__jarvis_lsp_diagnostics` — 修改后秒级诊断，无需等待完整编译

**Batch 同发示例**：
```
# 一条消息同时发出 batch 1 全部 Agent（不等不串行）
Agent(frontend-ui-expert, "UI 组件实现", task_id=T1)
Agent(frontend-state-expert, "状态管理", task_id=T2)
Agent(backend-api-expert, "API 路由", task_id=T3)
Agent(backend-data-expert, "数据模型", task_id=T4)
# 全部完成后 → 进入 batch 2
```

### Gate C2: 并行测试

```
# 一条消息同发全部测试 Agent
Agent(frontend-test-expert, "前端单元+组件测试")
Agent(backend-test-expert, "后端单元+集成测试")
# 等前两个完成后 → Agent(e2e-test-expert, "端到端测试")
# 全部通过 → Agent(qa-review-expert, "综合签核")
```

### Gate D: 并行审查

```
# 一条消息同发 4 个领域审查（互不依赖）
Agent(frontend-review-expert, "前端审查") \
Agent(backend-review-expert, "后端审查")  } 同发
Agent(security-review-expert, "安全审计") /
Agent(perf-review-expert, "性能审计")   /
# 全部完成后 → Agent(qa-review-expert, "综合签核") — 串行等待前 4 个
```

### Team 生命周期

```
创建: TeamCreate({ team_name: "{task}-{gate}" })
分配: spawn Agent 带 team_name + name + subagent_type
完成: TaskList 全部 resolved
关闭: SendMessage(shutdown_request) → TeamDelete()
降级: TeamCreate 不可用 → 回退并行 Subagent
```

---

## 红线
- Gate 不可跳跃——严格遵守 A→B-DDD→B-BDD→B-TDD→B1→C→C-impl→C1→C1.5→C2→D→E 顺序
- 需求文档必须先产出再编码——先写 REQ-XXX 再写代码
- Agent 不可递归 spawn——子 Agent 不得再生成其他 Agent
- 测试不通过不得推进 Gate——Gate C2 是硬门禁
- 质量门不通过不得发布——Gate E 前置条件不可跳过
