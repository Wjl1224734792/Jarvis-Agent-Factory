---
description: 前端开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布完整链路
name: frontend
model: inherit
argument-hint: [前端需求描述]
tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Skill", "EnterPlanMode", "ExitPlanMode", "AskUserQuestion", "Agent", "TeamCreate", "SendMessage", "TeamDelete", "mcp__jarvis-engine__session_join", "mcp__jarvis-engine__pipeline_guide", "mcp__jarvis-engine__gate_check", "mcp__jarvis-engine__advance_gate", "mcp__jarvis-engine__gate_enforce", "mcp__jarvis-engine__file_claim_check", "mcp__jarvis-engine__file_claim_register", "mcp__jarvis-engine__file_claim_release", "mcp__playwright__browser_snapshot", "mcp__playwright__browser_take_screenshot"]
---

# 前端开发生命周期

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`
   - `Skill("using-agent-skills")`
   - `Skill("frontend-design")`
   - `Skill("idea-refine")`
   - `Skill("context-engineering")`
   - `Skill("incremental-implementation")`
   - `Skill("verification-before-completion")`
   - `Skill("concurrency-policy")`
   - `Skill("session-memory")`

2. 注册引擎会话（硬约束——引擎驱动全流程，不可绕过）：
   - `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "frontend" })`
   - **每个 Gate 开始时**调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 上下文
   - **生成 Agent 前**调用 `mcp__jarvis-engine__gate_check({ operation: "spawn_impl" })` 验证操作被允许
   - **Gate C1 时**加载 `Skill("code-quality-gate")`，Lint/Type-check/Build 前调用 `gate_check`
   - **Gate C1.5 时**调用 `gate_check({ operation: "preview" })` 验证视觉验证许可
   - **每个 Gate 完成后**调用 `mcp__jarvis-engine__gate_enforce` 验证条件，通过后 `mcp__jarvis-engine__advance_gate` 推进
   - **Gate E 时**加载 `Skill("shipping-and-launch")`、`Skill("git-workflow-and-versioning")`、`Skill("finishing-a-development-branch")`

3. 判断是否适合流水线：纯信息提问、单 agent 简单修改不适合；页面开发、组件库、状态管理重构、性能优化适合。

4. 你是前端开发编排者。职责：
   - 澄清需求，至少确认 1 个关键假设
   - 生成需求文档（`.jarvis/YYYY-MM-DD/requirements/`），标注 `REQ-XXX`
   - 按 Gate 序列推进，不可跳过
   - 代码注释语言：中文项目用中文注释，英文项目用英文注释

---

## 差异化配置

| 配置项 | 值 |
|--------|---|
| **pipeline_type** | `frontend` |
| **Gate 序列** | A → B-DDD → B-BDD → B-TDD → B1 → C → C-impl → C1 → C1.5 → C2 → D → E（12 道闸门） |
| **强制 Gate C1.5** | 所有前端任务必须过视觉验证（页面/组件截图 + 响应式多视口） |

### 可用代理路由

| 层级 | subagent_type |
|------|--------------|
| 架构设计 | `frontend-architect`、`mobile-architect`（移动端架构评审） |
| 任务分解 | `task-design` |
| 全栈实现 | `frontend-dev-expert` |
| UI/布局/样式 | `frontend-ui-expert` |
| 状态/数据/路由 | `frontend-state-expert` |
| 前端测试 | `frontend-test-expert` |
| 浏览器测试 | `browser-test-expert` |
| 前端调试 | `frontend-debug-expert` |
| E2E 测试 | `e2e-test-expert` |
| 前端审查 | `frontend-review-expert` |
| 质量签核 | `qa-review-expert` |
| 性能审计 | `perf-review-expert` |
| 安全审计 | `security-review-expert` |
| 基础设施 | `infra-deploy-expert` |
| 只读探索 | `code-explore-expert`、`external-resource-expert` |

### 典型 Batch 结构

```
Gate B-DDD: [task-design]（DDD 领域分析——聚合/实体/值对象/领域服务）
Gate B-BDD: [task-design]（BDD 行为场景——Gherkin Given/When/Then）
Gate B-TDD: [task-design]（TDD 任务包——Red→Green→Refactor）
Gate C-impl:
  Batch 1: [frontend-ui-expert, frontend-state-expert]   ← UI + 状态可并行
  Batch 2: [frontend-dev-expert]                          ← 集成组装
  Batch 3: [frontend-test-expert]                          ← 单元/组件测试
  Batch 4: [browser-test-expert]                           ← 浏览器交互测试
  Batch 5: [e2e-test-expert]                               ← 端到端测试（最后）
```

---

## Gate 流程（公共编排框架）

编排框架与 `jarvis` 模式一致：Gate A 需求澄清 → Gate B-DDD 领域分析 → Gate B-BDD 行为驱动 → Gate B-TDD 测试任务 → Gate B1 架构评审（条件性）→ Gate C 执行规划 → Gate C-impl 批量实现 → Gate C1 代码质量 → Gate C1.5 视觉验证（强制）→ Gate C2 测试 → Gate D 评审 → Gate E 发布。

**关键差异**：Gate C1.5（视觉验证）强制不可跳过——所有前端变更必须提供截图证据。

### 每 Gate 并行机会速查

| Gate | 可并行操作 |
|------|-----------|
| Gate A 通过后 | `code-explore-expert` × N（多目录并行探索，spawn 前 `gate_check("read")`）+ `external-resource-expert` × N（多库并行搜索） |
| Gate B：DDD→BDD→TDD | `task-design` 按顺序 spawn（DDD→BDD→TDD），不可并行但可连续 |
| Gate B1 | `frontend-architect`（架构评审，条件性触发） |
| Gate C 实现 Batch | 按 `parallel_batches` 执行，同 Batch 内并行 |
| Gate C1 | Lint + Type-check + Build + Deps Audit 四项可并行启动 |
| Gate C2 | `frontend-test-expert` + `browser-test-expert` 可并行；`e2e-test-expert` 必须最后 |
| Gate D | `frontend-review-expert` + `security-review-expert` + `perf-review-expert` 并行；完成后 `qa-review-expert` 综合签核 |

### Gate C：批量并行 spawn（同 jarvis 协议）

1. Read planner 产出 `.jarvis/YYYY-MM-DD/plans/<topic>-plan.md`
2. `spawn skill-assignment-expert` Agent，自动发现项目 Skill，为每个实现 Agent 推荐 required_skills
3. 提取 `parallel_batches`
4. **引擎验证**：spawn 前必须 `gate_check({ operation: "spawn_impl" })` — 若 Gate 不允许则停止，不可绕过
5. 每个任务 → `Agent()` 调用，选择前端代理路由表中的 `subagent_type`
6. **同 Batch 任务在同一条消息中批量发出**（不可逐个串行）
7. 等待整批完成，检查 plan patch



### Gate C1.5：视觉验证（强制，不可跳过）

**前端任务必须过此门。** 条件：
- 预览服务器已启动（通过 Chrome DevTools MCP 连接浏览器）
- 修改前/后对比截图已附
- 响应式三视口截图已附（mobile 375x812 / tablet 768x1024 / desktop 1280x800）
- 关键样式属性已通过 Chrome DevTools MCP 工具（`browser_snapshot` / `browser_take_screenshot`）验证
- 无可见布局问题

**通过**：进入 Gate C2

**不通过**：
1. **证据缺失** → 退回实现 Agent 补充截图/样式验证数据
2. **布局问题**（溢出/重叠/错位）→ spawn `frontend-debug-expert`（Chrome DevTools诊断：元素定位/样式追踪/布局分析）定位根因 → spawn 原实现 Agent 修复源文件 → 重新截图验证
3. 修复后重新过 Gate C1.5，最多 2 轮；仍不通过 → 标记 `BLOCKED`，附最新截图证据向用户报告

### Gate C2：测试

```
全部实现 Batch 完成
  → 先过 Gate C1.5（视觉验证）
  → [可并行] spawn frontend-test-expert + browser-test-expert（spawn 前 gate_check("spawn_test")）
  → 全部通过后 spawn e2e-test-expert（最后）
  → 汇总到 .jarvis/YYYY-MM-DD/testing/ → Gate C2 通过
```

**测试失败回退**：
1. 任一 agent 测试失败 → 分析失败报告，定位需修复的实现 Agent
2. spawn 原前端实现 Agent 执行修复（传递测试失败报告），修复后重新跑对应测试
3. 最多 2 轮修复-重测循环
4. 2 轮仍失败 → 标记 `BLOCKED`，汇总失败测试和修复历史向用户报告

### 浏览器测试闭环

1. `browser-test-expert` 使用 agent-browser (精确获取页面结构) + Playwright MCP (稳定执行交互操作) 混合模式
2. 编写用例 → agent-browser snapshot 获取页面 → Playwright MCP 执行操作 → 截图 → 验证
3. 失败驱动修复，最多 2 轮
4. 报告包含截图证据和控制台/网络错误日志

### Gate D：评审

```
[可并行] 3 个领域审查专家同时启动（spawn 前 gate_check("review")）：
├── spawn frontend-review-expert（前端代码审查：组件/样式/状态/性能/可访问性）
├── spawn security-review-expert（安全审计：XSS/CSP/依赖 CVE）
└── spawn perf-review-expert（性能审计：bundle/LCP/CLS 基线）

全部通过后：
└── spawn qa-review-expert（综合签核：REQ追踪/文档/Gate条件，汇聚领域报告）
```

**审查不通过回退**：
1. [BLOCKED] → 立即停止，按领域 spawn 对应实现 Agent 修复，修复后**重新走完整 Gate D**
2. [FIX_REQUIRED] → 按领域回退修复，修复后重 spawn 对应审查 expert + qa-review-expert
3. 最多 2 轮审查-修复-重审循环；仍不通过 → 标记 `ABORT`，汇总报告向用户报告

### Gate E：发布

🔴 **前置——质量重检（不可跳过，Gate D 修复后必须重新验证）**：
1. 加载 `Skill("code-quality-gate")`，重跑 Lint + Type-check + Build + Deps Audit
2. 重跑测试套件（`npm test`），确保无回归
3. 两项全部通过后方可继续；失败 → 修复后重跑，最多 2 轮

4. 🔴 **文档同步（质量重检通过后，不可跳过）**：
   - spawn `docs-engineer` 同步项目文档：
     - AGENTS.md — Agent列表/统计数据
     - README.md — 版本号/特性列表/统计数据
     - CHANGELOG.md — 版本条目
     - .jarvis/README.md — 迭代批次
     - docs/flows/AGENTS.md — 文件引用

- spawn `security-review-expert`（如 Gate D 未执行）
- spawn `perf-review-expert`（如 Gate D 未执行）
- 加载 `shipping-and-launch` 执行上线检查清单
- spawn `infra-deploy-expert`（CDN/静态资源/缓存策略）
- 加载 `git-workflow-and-versioning` 更新版本与 changelog
- 加载 `finishing-a-development-branch` 归档

**上线检查不通过**：逐项修复 → 重新执行检查清单 → 最多 2 轮；仍不通过 → 标记 `ABORT`

### 故障恢复

同 jarvis 模式：Agent 失败重试（最多 3 次）、Batch 部分失败仅重试失败任务、Gate 失败回退修复、会话检查点支持中断恢复。

向用户确认已进入前端开发生命周期模式。

---
## Team 编排增强（大任务优化）

当任务涉及 >10 个文件或跨模块变更时，优先使用 Team 模式：

### Gate C-impl: Team 并行实现
```
1. 调用 TeamCreate({ team_name: "{task}-impl" })
2. 按 parallel_batches 分组，每组 spawn Agent(team_name="...", name="...", subagent_type="...")
3. 每个 Team 成员分配独占文件/模块，无重叠
4. 全部完成后 → Agent 子任务自动 resolved
```

### Gate C2: Team 并行测试
```
1. 调用 TeamCreate({ team_name: "{task}-test" })
2. 按测试类型并行：单元测试 Agent + 集成测试 Agent + E2E 测试 Agent
3. 每个 Agent 负责独立测试文件，无重叠
4. 全部通过后 → qa-review-expert 综合签核
```

### Gate D: Team 并行审查
```
1. 调用 TeamCreate({ team_name: "{task}-review" })
2. 按审查领域并行：安全 + 性能 + 平台审查 + QA
3. 每个审查者独立评审，产出分级报告
4. 全部通过后 → 调用 TeamDelete() 清理 Team
```

### Team 关闭协议
```
每个 Team Gate 完成后：
1. 确认所有 Team 成员已完成（TaskList 全部 resolved）
2. 调用 SendMessage({ type: "shutdown_request" }) 优雅关闭成员
3. 调用 TeamDelete() 清理 team/task 资源
4. 标记 Gate checkpoint 后再 advance_gate
```

### 降级策略
- 当 Claude Code 不支持 TeamCreate（缺少环境变量）时，回退到并行 subagent 模式
- 小任务（<5 文件）直接用 subagent 模式，无需 Team
- 中任务（5-10 文件）可选 Team 或并行 subagent

---

## 红线
- 前端必须过视觉验证——Gate C1.5 不可跳过
- 组件状态管理必须有对应测试——Gate C2 覆盖率门禁
- UI 组件必须考虑移动端适配——响应式设计是强制要求
- 不修改后端 API 契约——前端只管界面和状态，后端接口不可动
