# 需求文档：其他开发指令子智能体集成补充

> **文档状态**: confirmed | **创建时间**: 2026-05-18 | **Run**: run_1779038567459_EPOe

> **背景**：审查发现 `/jarvis` 主流程充分使用子 Agent（47 个 Agent 类型），但其他开发指令（`/review`、`/bug-fix`、`/refactor` 等）大部分将自己作为编排中枢 + 执行者合体，不 spawn 子 Agent。这违反 jarvis 第二条硬约束——"编排者禁止直接编码"。需补充子 Agent 集成，使所有指令的流程与 `/jarvis` 一样严谨。

---

## REQ-001：`/review` — 补全领域专项审查专家并行矩阵

**当前问题**：
- 只提到 `project-review-expert`、`diff-review-expert`、`perf-review-expert`、`code-explore-expert` 四个通用 Agent
- 缺少领域专项审查专家：`security-review-expert`、`frontend-review-expert`、`backend-review-expert`
- 缺少综合签核：`qa-review-expert`
- 缺少严重度分级标准（BLOCKED/FIX_REQUIRED/WARNING）
- 缺少审查失败回退修复回路
- 缺少条件性算法审查（`algorithm-expert`）

**目标**：参照 `/jarvis` Gate D 的 5 专家并行矩阵 + 综合签核模式

---

## REQ-002：`/review-fix` — 补全初审专家矩阵 + 复审关闭矩阵

**当前问题**：
- 初审只有 4 个通用 Agent，缺少领域专项审查专家
- 规划阶段提到 `remediation-expert` 但未定义 spawn 规则
- 复审提到 `change-review-expert` 但未定义关闭矩阵格式
- 缺少条件性 `algorithm-expert`
- 缺少按领域路由修复 Agent 的规则

**目标**：初审 5 专家并行（同 Gate D），复审用 `change-review-expert` 产出关闭矩阵

---

## REQ-003：`/bug-fix` — 引入子 Agent 执行根因定位和修复

**当前问题**：
- 完全不使用任何子 Agent
- 编排者自己执行步骤 2（浏览器复现）、步骤 3（定位根因）、步骤 4（修复代码）
- 缺少 `code-explore-expert` 辅助根因定位
- 缺少实现类 Agent（`frontend-dev-expert`/`backend-dev-expert`）执行修复
- 缺少 `browser-test-expert` 执行浏览器验证
- Lint+Type-check+Build 的修复循环缺少 spawn 规则

**目标**：编排者只负责调度和决策，具体执行 spawn 对应子 Agent

---

## REQ-004：`/refactor` — 引入子 Agent 执行重构和验证

**当前问题**：
- 5 Gate 流程（R1→R5）完善，但 R3 重构执行、R4 行为漂移检测都是 inline
- 不 spawn `remediation-expert` 或实现类 Agent 执行重构
- 不 spawn 测试类 Agent 执行基线测试和漂移检测
- 缺少 `code-explore-expert` 探索重构范围

**目标**：R2 用测试 Agent 建基线，R3 用实现 Agent 执行重构，R4 用测试 Agent 验证

---

## REQ-005：`/debug` — 引入子 Agent 辅助代码探索和根因分析

**当前问题**：
- 5 Gate 流程（D0→D4）完善，但 D2/D3 诊断阶段都是 inline
- 不 spawn `code-explore-expert` 探索故障相关代码
- D3 根因分析可受益于 `algorithm-expert`（复杂逻辑时）或领域实现 Agent

**目标**：D2/D3 阶段 spawn `code-explore-expert` 探索代码，复杂场景 spawn 领域 Agent

---

## REQ-006：`/evaluate` — 引入子 Agent 生成原型和收集指标

**当前问题**：
- 4 Gate 流程（E0→E3）完善，但 E1 原型生成、E2 指标收集都是 inline
- 不 spawn 实现类 Agent 生成原型代码
- 不 spawn `perf-test-expert` 收集性能指标

**目标**：E1 spawn 领域实现 Agent 生成原型，E2 spawn `perf-test-expert` 收集指标

---

## REQ-007：`/hotfix` — 引入子 Agent 定位根因和执行修复

**当前问题**：
- 4 Gate 紧急流程（H0→H3），但 H1 定位和修复都是 inline
- 不 spawn `code-explore-expert` 探索故障范围
- 不 spawn 实现类 Agent 执行修复
- 不 spawn 测试 Agent 验证

**目标**：H1 spawn 领域实现 Agent 定位+修复，H2 spawn 测试 Agent 验证

---

## REQ-008：`/migrate` — 引入子 Agent 执行规则迁移

**当前问题**：
- 4 Gate 迁移流程（M1→M4），但 M2 规则应用全部 inline
- 不 spawn 领域实现 Agent 执行迁移
- 大量机械转换工作适合交给 Agent 批量处理

**目标**：M2 按文件/规则 spawn 领域实现 Agent 并行迁移

---

## REQ-009：`/publish` — 补全技能加载和子 Agent 集成

**当前问题**：
- 加载了 `code-quality-gate` 和 `git-workflow-and-versioning`，但缺少 `shipping-and-launch`（上线检查清单）
- 步骤 2 质量门失败后不 spawn 实现 Agent 修复，而是让用户手动修复
- 缺少 `finishing-a-development-branch` 加载

**目标**：补充 `shipping-and-launch` 加载，质量门失败 spawn 实现 Agent 修复

---

## REQ-010：`/sync` — 引入 `docs-engineer` Agent

**当前问题**：
- 全部 inline 执行文档扫描和对比
- 不使用 `docs-engineer` Agent（专门用于文档同步）

**目标**：步骤 1-4 spawn `docs-engineer` Agent 执行文档一致性检查

---

## REQ-011：`/test-unit` — 引入测试 Agent 生成和执行

**当前问题**：
- 全部 inline：检测框架→分析代码→生成测试→运行
- 不 spawn `frontend-test-expert` 或 `backend-test-expert`
- 编排者自己在写测试代码（违反硬约束）

**目标**：检测框架后 spawn 对应测试 Agent（`frontend-test-expert` / `backend-test-expert`）

---

## REQ-012：`/test-integration` — 引入测试 Agent

**当前问题**：
- 全部 inline：识别契约→启动环境→生成测试→运行
- 不 spawn `backend-test-expert` 或 `api-contract-expert`

**目标**：spawn `backend-test-expert` + `api-contract-expert` 执行集成测试

---

## REQ-013：`/test-e2e` — 引入 `e2e-test-expert`

**当前问题**：
- 全部 inline：提取故事→选择工具→编写测试→运行
- 不 spawn `e2e-test-expert`

**目标**：spawn `e2e-test-expert` 执行端到端测试

---

## REQ-014：`/test-perf` — 引入 `perf-test-expert`

**当前问题**：
- 全部 inline：定义目标→选择工具→编写脚本→执行
- 不 spawn `perf-test-expert`

**目标**：spawn `perf-test-expert` 执行性能测试

---

## REQ-015：`/test-security` — 引入 `security-review-expert`

**当前问题**：
- 全部 inline：确认范围→选择工具→扫描→分析
- 不 spawn `security-review-expert`

**目标**：spawn `security-review-expert` 执行安全测试

---

## 通用约束（所有 REQ 适用）

每个指令修改后必须满足：
1. **编排者禁止直接编码** — 所有代码变更通过 `Agent()` spawn 子 Agent 完成
2. **Gate 检查调用** — spawn 前 `gate_check()`，阶段完成后 `gate_enforce()` + `advance_gate()`
3. **失败回退循环** — 明确"最多 N 轮修复-重试"和 `BLOCKED` 条件
4. **红线不减少** — 现有指令的红线约束不丢失，只新增不删除
5. **行为准则遵守** — 所有 Agent spawn 前加载 `Skill("behavioral-guidelines")`
