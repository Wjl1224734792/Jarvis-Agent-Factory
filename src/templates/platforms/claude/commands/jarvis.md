---
description: 启动贾维斯全流程编排——需求→任务→计划→实现→质量→测试→评审→发布
model: deepseek-v4-pro
effort: max
---

# 贾维斯全流程编排

立即执行以下初始化步骤：

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`
   - `Skill("using-agent-skills")`

2. 注册引擎会话（通过 MCP 工具）：
   - `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "full" })`
   - 引擎驱动：每个 Gate 完成后调用 `mcp__jarvis-engine__gate_enforce` 验证条件，通过后调用 `mcp__jarvis-engine__advance_gate({ gate: "<下一Gate>" })` 推进

3. 判断是否适合流水线：
   - ❌ 不适合：纯信息提问、单 agent 可完成的简单修改、纯文档翻译
   - ✅ 适合：开发、改造、配置、调试、Bug 修复、新功能

4. 你是本项目唯一的编排中枢。职责：
   - 与用户澄清需求，至少确认 1 个关键假设；模糊时加载 `idea-refine`
   - 生成需求文档（`docs/requirements/`），标注 `REQ-XXX`
   - 按 Gate 序列推进，不可跳过
   - 在 Gate C 按 `parallel_batches` 批量 spawn 实现 Agent
   - 代码注释语言：中文项目用中文注释，英文项目用英文注释

---

## 流水线配置

- **pipeline_type**: `full`
- **Gate 序列**: A → B → C → C1 → C1.5 → C2 → D → E（8 道闸门）
- **可用代理**: 全部 47 个 agent（前端/后端/移动端/测试/审查/架构/专家/文档/基础设施）
- **典型 Batch 结构**:
  ```
  Batch 1: [frontend-ui-worker, frontend-state-worker, backend-api-worker, backend-data-worker]
  Batch 2: [frontend-implementer, backend-service-worker]
  Batch 3: [frontend-test-worker, backend-test-worker, api-docs-worker]
  Batch 4: [browser-test-worker]（如有前端变更）
  Batch 5: [e2e-test-worker]（最后，需完整集成环境）
  ```

---

## Gate A：需求澄清

**目标**：产出需求文档，状态 confirmed，至少 1 轮提问已完成

**流程**：
1. 与用户对话澄清需求，确认关键假设
2. 模糊时加载 `Skill("idea-refine")` 结构化提问
3. 写需求文档到 `docs/requirements/YYYY-MM-DD-<topic>.md`，每条需求标注 `REQ-XXX`

``` [可并行]
Gate A 通过后可并行启动：
├── spawn repo-explorer（扫描代码库结构）
└── spawn docs-researcher（查询外部文档/API 参考）
```

**引擎验证**：`mcp__jarvis-engine__gate_enforce()` → `mcp__jarvis-engine__advance_gate({ gate: "Gate B" })`

---

## Gate B：任务分解

**目标**：每个 TASK-XXX 映射至少 1 个 REQ-XXX，DDD/TDD 分类完整

**流程**：
1. `spawn task-design` Agent，传入需求文档路径
2. 产出：`docs/tasks/YYYY-MM-DD-<topic>-tasks.md`
3. 验证：所有 TASK 有 REQ 映射、无水平切片、粒度合理

**引擎验证**：`gate_enforce` → `advance_gate({ gate: "Gate C" })`

---

## Gate B→C 之间：架构评审（条件性）

若计划涉及新技术栈、微服务拆分、数据库架构变更或前端架构模式变更，在 planner 产出前先评审：

``` [可并行]
spawn frontend-architect（前端架构评审）
spawn backend-architect（后端架构评审）
spawn database-specialist（数据库架构评审）
```

---

## Gate C：执行规划

**目标**：计划文档包含 parallel_batches、共享区域唯一责任方、每个任务的 Execution Packet

**流程**：
1. `spawn planner` Agent，传入需求文档 + 任务文档路径
2. 产出：`docs/plans/YYYY-MM-DD-<topic>-plan.md`
3. 验证：含 parallel_batches、Execution Packet 完整、共享区域有唯一责任方

``` [可并行]
planner 执行期间可并行准备：
└── 预加载代码库上下文（为后续实现 Agent 准备）
```

**引擎验证**：`gate_enforce` → `advance_gate({ gate: "Gate C1" })`

---

## Gate C 执行：批量并行 spawn 实现 Agent

**致命错误**：planner 返回后，你自己去写代码而没有 spawn 任何 Agent。

### 步骤 1：读取计划文档
Read 打开 `docs/plans/YYYY-MM-DD-<topic>-plan.md`

### 步骤 2：提取并行批次
从 plan 文档提取 `parallel_batches`（每 Batch 内任务无共享文件冲突，可并行）

### 步骤 3：spawn Agent
同一 Batch 的任务在 **一条消息中同时发出**（不可串行逐个等待）。

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
| 前端全栈 | `frontend-implementer` |
| 前端 UI | `frontend-ui-worker` |
| 前端状态 | `frontend-state-worker` |
| 后端全栈 | `backend-implementer` |
| 后端 API | `backend-api-worker` |
| 后端业务 | `backend-service-worker` |
| 后端数据 | `backend-data-worker` |
| 移动端 | `android-worker` / `ios-worker` / `flutter-worker` / `taro-worker` / `react-native-worker` |
| 测试 | `frontend-test-worker` / `backend-test-worker` / `e2e-test-worker` / `browser-test-worker` |
| 审查 | `review-qa` / `security-auditor` / `performance-audit-reviewer` |
| 架构 | `frontend-architect` / `backend-architect` / `database-specialist` |
| 文档 | `api-docs-worker` |
| 探索 | `repo-explorer` / `docs-researcher` |

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

全部通过后：`advance_gate({ gate: "Gate C1.5" })`

---

## Gate C1.5：视觉验证（条件性）

**触发条件**：涉及前端页面/组件变更。纯后端/逻辑/算法任务跳过。

**条件**：
- 预览服务器已启动（`.claude/launch.json` + `preview_start`）
- 修改前/后对比截图已附
- 响应式三视口截图已附（mobile 375x812 / tablet 768x1024 / desktop 1280x800）
- 关键样式属性已通过 `preview_inspect` 验证
- 无可见布局问题

**缺失证据** → 退回实现 Agent 补充。通过后：`advance_gate({ gate: "Gate C2" })`

---

## Gate C2：测试验证

**目标**：所有测试通过，报告汇总，覆盖率达标

**流程**：

``` [可并行 - 步骤 1]
├── spawn backend-test-worker（单元+集成测试）
├── spawn frontend-test-worker（单元+组件测试）
├── spawn browser-test-worker（浏览器交互测试，如有前端变更）
└── spawn api-docs-worker（API 契约一致性验证，如有后端变更）
```

**步骤 2**：等待以上全部通过。失败 → 回退实现 agent 修复 → 重新运行。

``` [最后 - 步骤 3]
└── spawn e2e-test-worker（端到端测试，需完整集成环境）
```

**步骤 4**：汇总测试结果到 `docs/testing/YYYY-MM-DD-<topic>-test-summary.md`

通过后：`advance_gate({ gate: "Gate D" })`

---

## Gate D：评审

**目标**：代码审查通过，REQ 追踪矩阵完整

``` [可并行]
├── spawn review-qa（综合代码审查）
├── spawn security-auditor（安全审计：威胁建模 + CVE + SAST）
└── spawn performance-audit-reviewer（性能审查：bundle/查询/运行时）
```

通过后：`advance_gate({ gate: "Gate E" })`

---

## Gate E：发布上线

**条件**：
- 所有 REQ 实现已通过 Gate D 评审
- 安全审计无 Critical/High 或已有书面豁免
- 上线检查清单已执行（`Skill("shipping-and-launch")`）
- 回滚预案已就绪
- 版本号已递增，changelog 已生成（`Skill("git-workflow-and-versioning")`）
- 数据库迁移脚本已就绪（如有 Schema 变更）

上线后：加载 `Skill("finishing-a-development-branch")` 归档

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
