# DDD 领域分析 -- 其他开发指令子Agent集成补充

> **需求文档**: `docs/requirements/REQ-commands-subagent-integration.md`  
> **分析日期**: 2026-05-18  
> **分析范围**: 15个REQ涉及的14个指令（/review、/review-fix、/bug-fix、/refactor、/debug、/evaluate、/hotfix、/migrate、/publish、/sync、/test-unit、/test-integration、/test-e2e、/test-perf、/test-security）  
> **参考实现**: `/jarvis` 命令（已是充分使用47个子Agent的编排模式）

---

## 1. 领域边界定义

### 1.1 领域描述

本项目的"领域"不是传统的业务领域（订单、用户、库存），而是**指令系统的架构领域**。核心关注点：

- **指令编排模式**：编排者（Orchestrator）如何将任务委托给子Agent执行
- **Agent路由**：根据任务类型选择合适的子Agent
- **Gate权限管控**：在流水线各阶段控制操作权限
- **失败回退**：失败→定位→修复→重验的闭环策略

### 1.2 核心域 vs 支撑域

| 域类型 | 描述 | 涉及对象 |
|--------|------|----------|
| **核心域** | 指令编排模式（inline vs sub-agent） | Command聚合、Agent路由、Gate强制 |
| **支撑域** | 子Agent类型系统、Skill加载、Session管理 | Agent实体、Skill实体、Gate配置 |

### 1.3 边界上下文

```
┌──────────────────────────────────────────────────────────┐
│                    指令系统边界上下文                        │
│                                                          │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐              │
│  │ Command │──>│  Agent   │──>│  Skill   │              │
│  │ (聚合根)│   │ (实体)   │   │ (加载)    │              │
│  └────┬────┘   └────┬─────┘   └──────────┘              │
│       │             │                                    │
│       v             v                                    │
│  ┌─────────┐   ┌──────────┐                             │
│  │  Gate   │   │ Pipeline │                             │
│  │ (权限)  │   │ (流程)    │                             │
│  └─────────┘   └──────────┘                             │
│                                                          │
│  外部接口：mcp__jarvis-engine__*（引擎MCP服务）            │
└──────────────────────────────────────────────────────────┘
```

---

## 2. 聚合根定义

### 2.1 聚合根：Command（指令）

**标识**: 指令文件名（如 `review.md`、`bug-fix.md`）

**核心属性**:

| 属性 | 类型 | 说明 |
|------|------|------|
| `name` | string | 指令名称（/review, /bug-fix 等） |
| `description` | string | 指令用途描述 |
| `model` | string | 使用的LLM模型 |
| `allowed_tools` | string[] | 允许的工具列表 |
| `version` | string | 指令版本号 |
| `pipeline_type` | string | 流水线类型（full/hotfix/refactor/debug/migrate/evaluate） |
| `orchestration_mode` | enum | **inline**（编排者直接执行）\| **agent_orchestrated**（通过Agent() spawn执行） |

**聚合行为**（每个指令的修改行为，详见第6节）。

**不变量**:

1. 指令的 `orchestration_mode` 从 `inline` 转为 `agent_orchestrated` 时，不减少现有红线约束
2. 每个指令必须加载 `behavioral-guidelines` 技能
3. 每个指令必须调用 `session_join` 注册引擎会话

---

## 3. 实体清单

### 3.1 Agent（子智能体）

**数量**: 57种类型（当前 `.claude/agents/` 目录下57个定义文件）

**关键Agent分类**（按领域）:

| 领域 | Agent类型 | 角色 | 读写权限 |
|------|----------|------|----------|
| **前端** | frontend-dev-expert, frontend-ui-expert, frontend-state-expert, frontend-architect | 前端实现/审查 | 读写 |
| **后端** | backend-dev-expert, backend-api-expert, backend-logic-expert, backend-data-expert, backend-architect | 后端实现/审查 | 读写 |
| **移动端** | android-dev-expert, ios-dev-expert, flutter-dev-expert, taro-dev-expert, react-native-dev-expert | 移动端实现 | 读写 |
| **测试** | frontend-test-expert, backend-test-expert, e2e-test-expert, browser-test-expert, api-test-expert, perf-test-expert | 测试执行 | 读写 |
| **审查** | frontend-review-expert, backend-review-expert, security-review-expert, perf-review-expert, qa-review-expert, project-review-expert, diff-review-expert, change-review-expert, algorithm-expert | 只读审查/安全审计 | 只读（security-review-expert可写报告） |
| **架构** | frontend-architect, backend-architect, database-architect | 架构评审 | 只读 |
| **探索** | code-explore-expert, external-resource-expert | 代码探索/文档搜索 | 只读 |
| **修复** | remediation-expert, remediation-planner, fix-retest | 修复执行 | 读写 |
| **文档** | api-contract-expert, docs-engineer, docs-research-expert, test-doc-writer | 文档生成/维护 | 读写 |
| **编排辅助** | task-design, planner, skill-assignment-expert | 任务分解/规划 | 只读/写文档 |
| **基础设施** | infra-deploy-expert | 部署 | 读写 |

### 3.2 Skill（技能）

**数量**: 34种类型（当前 `.claude/skills/` 目录下34个定义文件）

**关键Skill分类**:

| Skill类型 | 技能 | 用途 |
|----------|------|------|
| **基座** | behavioral-guidelines, context-engineering | 所有Agent必须加载 |
| **开发方法** | test-driven-development, source-driven-development, spec-driven-development, incremental-implementation | 实现类Agent加载 |
| **代码质量** | code-quality-gate, code-simplification, code-standards, code-review-and-quality, refactoring | 质量保障 |
| **安全** | security-and-hardening, security-testing | 安全类Agent加载 |
| **测试** | browser-testing, perf-testing | 测试类Agent加载 |
| **文档** | documentation-and-adrs, chinese-documentation | 文档类Agent加载 |
| **发布** | git-workflow-and-versioning, shipping-and-launch, finishing-a-development-branch | 发布类Agent加载 |
| **浏览器** | agent-browser, browser-use, browser-explore | 浏览器交互 |
| **元技能** | using-agent-skills, find-skills, find-docs, writing-skills | 技能系统自身 |
| **其他** | frontend-design, idea-refine, debugging-and-error-recovery, debugging-deep, planning-and-task-breakdown, mcp-builder, verification-before-completion, test-data-factory | 特定场景 |

### 3.3 Gate（闸门）

**Gate类型体系**:

| 流水线类型 | Gate序列 | 适用指令 |
|-----------|---------|---------|
| **full** | A → B-DDD → B-BDD → B-TDD → B1 → C → C-impl → C1 → C1.5 → C2 → D → E (13道) | /jarvis |
| **refactor** | R1 → R2 → R3 → R4 → R5 (5道) | /refactor |
| **hotfix** | H0 → H1 → H2 → H3 (4道) | /hotfix |
| **debug** | D0 → D1 → D2 → D3 → D4 (5道) | /debug |
| **migrate** | M1 → M2 → M3 → M4 (4道) | /migrate |
| **evaluate** | E0 → E1 → E2 → E3 (4道) | /evaluate |

---

## 4. 值对象清单

### 4.1 Gate配置（Gate Configuration）

不可变的值对象，定义每个Gate阶段允许/禁止的操作：

```
Gate配置 {
  gate_id: string,           // 如 "Gate C-impl"
  allowed_operations: [       // 允许的操作
    "read", "spawn_impl", ...
  ],
  forbidden_operations: [     // 禁止的操作
    "write_code", "deploy", ...
  ],
  enforce_mode: "hook" | "prompt"  // 强制执行方式
}
```

**关键配置**：编排者在 Gate A/B/B1/C/C1.5/C2/D 阶段直接使用 Write/Edit 工具会被 Hook 拦截。只有 Gate C-impl 和 Gate C1 允许直接写代码（但按架构原则应由Agent执行）。

### 4.2 Agent路由表（Agent Route Table）

根据任务类型映射到正确的 subagent_type：

| 任务领域 | 路由目标Agent | 条件 |
|---------|-------------|------|
| 前端UI修改 | `frontend-ui-expert` | 涉及组件/样式/布局 |
| 前端状态管理 | `frontend-state-expert` | 涉及状态/store/context |
| 前端全栈 | `frontend-dev-expert` | 涉及前端多层面 |
| 后端API | `backend-api-expert` | 涉及路由/控制器/中间件 |
| 后端业务逻辑 | `backend-logic-expert` | 涉及服务层/领域逻辑 |
| 后端数据层 | `backend-data-expert` | 涉及数据库/ORM/迁移 |
| 后端全栈 | `backend-dev-expert` | 涉及后端多层面 |
| 代码探索(只读) | `code-explore-expert` | 根因定位/代码分析 |
| 安全审计 | `security-review-expert` | 安全扫描/威胁建模 |
| 性能审计 | `perf-review-expert` | 性能分析/瓶颈定位 |
| 前端审查 | `frontend-review-expert` | 前端代码审查 |
| 后端审查 | `backend-review-expert` | 后端代码审查 |
| 综合审查 | `qa-review-expert` | 综合签核/REQ追踪 |
| 算法审查 | `algorithm-expert` | 条件性：涉及复杂算法/密码学/ML |
| 前端测试 | `frontend-test-expert` | 前端单元/组件测试 |
| 后端测试 | `backend-test-expert` | 后端单元/集成测试 |
| E2E测试 | `e2e-test-expert` | 端到端测试 |
| 浏览器测试 | `browser-test-expert` | 浏览器交互测试 |
| 性能测试 | `perf-test-expert` | 负载/压力测试 |
| API契约 | `api-contract-expert` | 契约生成/验证 |
| 文档 | `docs-engineer` | 文档一致性检查 |
| 修复执行 | `remediation-expert` | 按审查报告修复 |

### 4.3 失败回退策略（Failure Fallback Strategy）

通用回退策略模板，每个指令可覆写：

```
失败回退策略 {
  max_retries: 2,             // 最多重试次数
  retry_delay: 0,             // 重试前等待(秒)
  blocked_condition: [        // BLOCKED触发条件
    "retries_exhausted",      // 重试耗尽
    "root_cause_unknown",     // 根因未定位
    "shared_resource_conflict" // 共享资源冲突
  ],
  escalation_rule: {
    on_blocked: "report_to_orchestrator",  // 被BLOCKED时向编排者报告
    on_fix_applied: "reverify_all"         // 修复后全面重验
  }
}
```

### 4.4 Skill分配表（Skill Assignment）

每个指令必须加载的技能集合（不可变的值对象）：

| Skill | 必加载指令 |
|-------|----------|
| `behavioral-guidelines` | **所有指令** |
| `using-agent-skills` | /jarvis, /review-fix（编排相关） |
| `agent-browser` + `browser-testing` | /bug-fix（浏览器操作） |
| `code-simplification` + `test-driven-development` | /refactor |
| `debugging-and-error-recovery` | /debug, /hotfix |
| `source-driven-development` | /evaluate, /migrate |
| `code-quality-gate` + `git-workflow-and-versioning` | /publish |
| `test-driven-development` | /test-unit, /test-integration, /test-e2e, /test-perf |
| `security-and-hardening` | /test-security |
| `shipping-and-launch` | /publish（REQ-009 新增） |
| `finishing-a-development-branch` | /publish（发布后归档） |

### 4.5 允许工具集（Allowed Tools）

每个指令声明的工具权限（不可变，只能由指令维护者显式修改）：

| 指令 | 工具权限 |
|------|---------|
| /review | Read, Glob, Grep, Bash, WebFetch, WebSearch, Agent |
| /review-fix | Read, Glob, Grep, Bash, WebFetch, WebSearch, Agent, Edit, Write |
| /bug-fix | Read, Write, Edit, Bash, Glob, Grep, Skill, Agent |
| /refactor | Read, Glob, Grep, Bash, Write, Edit, Skill |
| /debug | Read, Glob, Grep, Bash, Write, Edit, Skill |
| /evaluate | Read, Glob, Grep, Bash, Write, Edit, Skill, WebFetch, WebSearch |
| /hotfix | Read, Glob, Grep, Bash, Write, Edit, Skill |
| /migrate | Read, Glob, Grep, Bash, Write, Edit, Skill |
| /publish | Read, Glob, Grep, Bash, Write, Edit, Skill, WebFetch, WebSearch |
| /sync | Read, Glob, Grep, Bash, Write, Edit, Skill |
| /test-unit | Read, Glob, Grep, Bash, Write, Edit, Skill |
| /test-integration | Read, Glob, Grep, Bash, Write, Edit, Skill, WebFetch |
| /test-e2e | Read, Glob, Grep, Bash, Write, Edit, Skill, WebFetch |
| /test-perf | Read, Glob, Grep, Bash, Write, Edit, Skill, WebFetch |
| /test-security | Read, Glob, Grep, Bash, Write, Edit, Skill, WebFetch |

---

## 5. 领域服务清单

### 5.1 Agent路由服务（Agent Routing Service）

**职责**: 根据任务类型、涉及代码领域、变更范围，选择正确的 subagent_type。

**核心逻辑**:
```
route(task_context) → subagent_type[]
输入: { domain: "frontend"|"backend"|"mobile", operation: "implement"|"review"|"test"|"explore", scope: file_paths[] }
输出: [subagent_type, ...]
```

**路由规则**:
- 前端文件且操作为实现 → `frontend-dev-expert`（或按粒度细分）
- 后端文件且操作为实现 → `backend-dev-expert`（或按粒度细分）
- 操作为只读探索 → `code-explore-expert`
- 操作为审查 → 按领域路由到对应的 `*-review-expert`
- 操作为测试 → 按领域路由到对应的 `*-test-expert`

### 5.2 Gate检查服务（Gate Enforcement Service）

**职责**: 在每个操作前验证当前Gate允许该操作，在每个Gate完成后验证条件满足。

**核心接口**:
```
gate_check({ operation: string }) → { allowed: boolean, message: string }
gate_enforce() → { conditions_met: string[], conditions_failed: string[] }
advance_gate({ gate: string }) → { success: boolean, new_gate: string }
pipeline_guide() → { current_gate: string, allowed_ops: string[], next_gate: string }
```

### 5.3 会话管理服务（Session Management Service）

**职责**: 管理引擎会话（session_join）、任务标题更新、产物目录管理。

**核心接口**:
```
session_join({ platform: "claude", pipeline_type: string, task_name?: string }) → { session_id: string, run_id: string }
```

### 5.4 失败回退服务（Failure Fallback Service）

**职责**: 当Agent操作失败时，执行诊断→修复→重验循环。

**核心流程**:
```
1. 捕获Agent失败输出
2. 分析失败类型（超时/工具错误/输出不完整/plan patch）
3. 按回退策略决定：重试 / 切换Agent / 标记BLOCKED
4. 重试时保持相同范围，不扩大变更
5. 最多2轮，2轮后仍失败 → BLOCKED
```

### 5.5 Skill加载服务（Skill Loading Service）

**职责**: 根据指令类型，确定必须加载和可选加载的技能集合。

**核心逻辑**: 每个指令声明 `Skill("...")` 调用。编排者不加载实现类技能（如 `test-driven-development`）——这些由被spawn的子Agent自行加载。

---

## 6. 聚合行为清单（每个指令的修改行为）

### 6.1 聚合行为一览表

| REQ | 指令 | 当前模式 | 目标模式 | 业务价值 | 规则复杂度 | 路由建议 |
|-----|------|---------|---------|---------|-----------|---------|
| REQ-001 | `/review` | Partially spawns | Agent orchestrated (full) | **高** | 中 | →BDD |
| REQ-002 | `/review-fix` | Partially spawns | Agent orchestrated (full) | **高** | **高** | →BDD |
| REQ-003 | `/bug-fix` | **ALL inline** | Agent orchestrated (full) | **高** | 中 | →TDD |
| REQ-004 | `/refactor` | **ALL inline** | Agent orchestrated (full) | **中** | 中 | →TDD |
| REQ-005 | `/debug` | **ALL inline** | Agent assisted (partial) | **中** | 低 | →TDD |
| REQ-006 | `/evaluate` | **ALL inline** | Agent orchestrated (partial) | **中** | 中 | →TDD |
| REQ-007 | `/hotfix` | **ALL inline** | Agent assisted (partial) | **高** | 中 | →TDD |
| REQ-008 | `/migrate` | **ALL inline** | Agent orchestrated (full) | **中** | **高** | →TDD |
| REQ-009 | `/publish` | **ALL inline** | Agent assisted (partial) | **高** | 中 | →TDD |
| REQ-010 | `/sync` | **ALL inline** | Agent assisted (single) | **低** | 低 | 直接开发 |
| REQ-011 | `/test-unit` | **ALL inline** | Agent orchestrated (full) | **中** | 低 | →TDD |
| REQ-012 | `/test-integration` | **ALL inline** | Agent orchestrated (full) | **中** | 低 | →TDD |
| REQ-013 | `/test-e2e` | **ALL inline** | Agent orchestrated (full) | **中** | 低 | →TDD |
| REQ-014 | `/test-perf` | **ALL inline** | Agent orchestrated (full) | **中** | 低 | →TDD |
| REQ-015 | `/test-security` | **ALL inline** | Agent orchestrated (full) | **中** | 低 | →TDD |

### 6.2 详细聚合行为

---

#### REQ-001: `/review` — 补全领域专项审查专家并行矩阵

**当前状态分析**:
- `/review` 已在 `allowed-tools` 中声明 `Agent`
- 指令文本第29行提到"可并发调用 `project-review-expert`、`diff-review-expert`、`perf-review-expert`、`code-explore-expert` 等只读 Agent"
- 但**缺少** `frontend-review-expert`、`backend-review-expert`、`security-review-expert`、`qa-review-expert`、`algorithm-expert` 的明确调用
- 当前是"建议"而非强制执行——编排者可自行选择是否spawn Agent

**目标模式**: 编排者在审查阶段**必须**spawn审查Agent，禁止直接审查代码

**子Agent路由**:
```
审查阶段（并行矩阵）:
├── spawn frontend-review-expert（前端代码审查：组件/样式/状态/性能/可访问性）
├── spawn backend-review-expert（后端代码审查：API/业务逻辑/数据层/安全）
├── spawn security-review-expert（安全审计：威胁建模/CVE/SAST/密钥检测）
├── spawn perf-review-expert（性能审计：bundle/LCP/查询/运行时）
├── spawn qa-review-expert（综合签核：REQ追踪/文档/Gate条件）
└── spawn algorithm-expert（条件性：仅当变更涉及复杂算法/密码学/ML时触发）
```

**修改范围**:
- 替换审查流程步骤，从"可并发调用"改为"必须spawn以下Agent并行执行"
- 新增 algorithm-expert 触发条件判断逻辑
- 新增审查失败回退循环（参考 jarvis.md Gate D 的修复回路规则）

**不变约束**: 只读审查模式的核心纪律不丢失；`allowed-tools` 不变

---

#### REQ-002: `/review-fix` — 补全初审专家矩阵 + 复审关闭矩阵 + 按领域路由修复Agent

**当前状态分析**:
- `/review-fix` 阶段一（初审）提到"可并发调用 project-review-expert、diff-review-expert、perf-review-expert、code-explore-expert"
- 阶段二（修复规划）提到"可调用 remediation-expert Agent 辅助规划"
- 阶段五（复审）提到"可调用 change-review-expert Agent"
- 但**缺少** `frontend-review-expert`、`backend-review-expert`、`security-review-expert`、`qa-review-expert`、`algorithm-expert`
- 阶段三（执行）和阶段四（验证）**完全是编排者inline执行**，未spawn实现Agent

**目标模式**:
- 初审：使用与 `/review` 相同的完整审查矩阵（6~7个Agent并行）
- 修复规划：remediation-expert 辅助
- 执行：**按领域路由** spawn 对应的实现Agent（frontend-dev-expert / backend-dev-expert等）
- 验证：spawn 对应的测试Agent（frontend-test-expert / backend-test-expert / browser-test-expert）
- 复审：spawn change-review-expert + qa-review-expert 并行

**子Agent路由**:
```
阶段一：初审（并行矩阵，与/review相同）
├── spawn frontend-review-expert
├── spawn backend-review-expert
├── spawn security-review-expert
├── spawn perf-review-expert
├── spawn qa-review-expert
└── spawn algorithm-expert（条件性）

阶段二：修复规划
└── spawn remediation-expert（或 remediation-planner）

阶段三：执行（按领域路由）
├── 前端修复 → spawn frontend-dev-expert
├── 后端修复 → spawn backend-dev-expert
├── 安全修复 → spawn backend-dev-expert（传递安全报告）
└── 性能修复 → spawn frontend-dev-expert 或 backend-dev-expert

阶段四：验证
├── spawn frontend-test-expert / backend-test-expert
├── spawn browser-test-expert（如有前端变更）
└── （不再inline执行 Lint+Type-check+Build——改为 code-quality-gate 自动检查）

阶段五：复审
├── spawn change-review-expert
└── spawn qa-review-expert（并行）
```

**修改范围**:
- 补全所有五个阶段的Agent spawn命令
- 新增按领域路由修复Agent的逻辑
- 新增失败回退循环规则

**不变约束**: 五阶段顺序不跳过、不减少红线

---

#### REQ-003: `/bug-fix` — 引入子Agent执行根因定位和修复

**当前状态分析**:
- `/bug-fix` 是**内联程度最高**的指令之一
- 步骤3（定位根因）由编排者直接执行："从页面反查代码，定位前端组件文件"、"追踪数据流"、"检查边界条件"——这些纯代码探索操作
- 步骤4（修复代码）由编排者直接执行——**违反"编排者禁止直接编码"架构原则**
- 步骤5（Lint+Type-check+Build）由编排者直接执行
- 步骤6（浏览器验证）由编排者直接执行 agent-browser CLI

**目标模式**: 编排者只做协调，代码探索和修复由子Agent执行

**子Agent路由**:
```
步骤2: 浏览器复现（编排者直接执行 agent-browser CLI——浏览器操作不是"写代码"，可保留）
步骤3: 定位根因
└── spawn code-explore-expert（只读探索代码库，定位故障文件+根因）
步骤4: 修复代码
├── 前端Bug → spawn frontend-dev-expert
└── 后端Bug → spawn backend-dev-expert
步骤5: 质量验证（编排者直接执行——是运行命令不是写代码）
步骤6: 浏览器验证（编排者直接执行 agent-browser CLI）
```

**修改范围**:
- 步骤3：从编排者inline探索改为 spawn `code-explore-expert`
- 步骤4：从编排者直接写代码改为 spawn 对应领域实现Agent
- 新增：如果 code-explore-expert 未能定位根因，最多1轮回退重新分析

**不变约束**: 浏览器复现/验证由编排者执行（agent-browser 操作）；步骤顺序不变；红线不减少

---

#### REQ-004: `/refactor` — 引入子Agent执行重构和验证

**当前状态分析**:
- R1 到 R5 **全部由编排者inline执行**
- R2（基线测试）由编排者直接跑测试命令
- R3（执行重构）由编排者直接写代码重构——**违反"编排者禁止直接编码"**
- R4（行为漂移检测）由编排者直接跑测试和手动抽查

**目标模式**: 编排者负责定义边界（R1），子Agent负责执行（R2/R3/R4）和验证

**子Agent路由**:
```
R1: 定义重构边界（编排者执行——这是决策行为，可保留）
R2: 建立基线测试
└── spawn frontend-test-expert 或 backend-test-expert（运行测试套件，记录基线覆盖率）
R3: 执行重构
└── spawn frontend-dev-expert 或 backend-dev-expert（按边界+不变行为清单执行重构）
R4: 行为漂移检测
├── Lint+Type-check+Build：编排者直接执行（运行命令）
└── spawn frontend-test-expert 或 backend-test-expert（重跑测试套件，对比覆盖率）
R5: 生成报告（编排者直接执行——是写文档不是写代码）
```

**修改范围**:
- R2：新增 spawn 测试Agent
- R3：从编排者直接写代码改为 spawn 实现Agent，传递不变行为清单
- R4：新增 spawn 测试Agent 做覆盖率对比

**不变约束**: 5 Gate序列不可跳过；红线（不改API契约、不夹带功能修改等）不丢失

---

#### REQ-005: `/debug` — 引入子Agent辅助代码探索和根因分析

**当前状态分析**:
- D0 到 D4 **全部由编排者inline执行**
- D3（交互式诊断）包含大量代码阅读和分析——编排者直接执行
- 但调试本身有其特殊性：断点设置、变量追踪等交互操作难以完全委托

**目标模式**: 编排者保留交互调试，辅助性代码探索委托给子Agent

**子Agent路由**:
```
D1: 生成最小复现用例（编排者执行——是构造测试场景，可保留）
D2: 启动调试会话（编排者执行——是工具操作）
D3: 交互式诊断
├── spawn code-explore-expert（并行探索代码库，辅助分析调用链、变量流）
├── 编排者同时执行交互调试（断点追踪）
└── 两者结果合并形成诊断结论
D4: 输出诊断报告（编排者执行——是写文档）
```

**修改范围**:
- D3：新增 spawn `code-explore-expert` 并行探索代码库
- 编排者仍保留交互调试能力（这不是"写代码"，而是诊断行为）

**不变约束**: 5 Gate序列不变；红线不减少

---

#### REQ-006: `/evaluate` — 引入子Agent生成原型和收集指标

**当前状态分析**:
- E0 到 E3 **全部由编排者inline执行**
- E1（生成快速原型）由编排者直接写代码——**违反"编排者禁止直接编码"**
- E2（运行评估用例并收集指标）由编排者直接执行命令——可保留

**目标模式**: 原型编写委托给实现Agent，指标收集委托给测试Agent

**子Agent路由**:
```
E0: 定义评估标准（编排者执行——是决策行为）
E1: 生成快速原型
└── spawn frontend-dev-expert 或 backend-dev-expert（根据评估对象，生成独立沙箱原型）
E2: 运行评估用例并收集指标
├── 编排者直接运行用例命令（time/资源监控）
└── spawn perf-test-expert（性能指标专业收集，若涉及性能评估）
E3: 汇总评估报告（编排者执行——是写文档）
```

**修改范围**:
- E1：从编排者直接写原型改为 spawn 实现Agent
- E2：新增可选 spawn `perf-test-expert`

**不变约束**: 4 Gate序列不变；原型沙箱隔离原则不变

---

#### REQ-007: `/hotfix` — 引入子Agent定位根因和执行修复

**当前状态分析**:
- H0 到 H3 **全部由编排者inline执行**
- H1（最小化修复）中"定位根因"和"实施最小化修复"由编排者直接执行——**违反"编排者禁止直接编码"**
- 但热修复有紧急时效性要求

**目标模式**: 编排者负责紧急声明和审批，根因定位和修复委托给子Agent（并行加速）

**子Agent路由**:
```
H0: 紧急声明与审批（编排者执行——是决策行为）
H1: 最小化修复
├── spawn code-explore-expert（并行定位根因：二分法查找引入故障的commit）
├── spawn frontend-dev-expert 或 backend-dev-expert（执行最小化修复）
└── 两者可并行——code-explore-expert 定位根因的同时，实现Agent可以准备修复上下文
H2: 快速验证与回滚确认（编排者执行 Lint+Build+Test 命令 + 回滚预演）
H3: 事后回溯审计（编排者执行——是写文档）
```

**修改范围**:
- H1：新增 spawn `code-explore-expert` + 领域实现Agent
- 编排者不再直接写修复代码

**不变约束**: 4 Gate序列不变；红线不减少（H0未审批不写代码、不夹带重构等）；紧急时效性不受影响（Agent并行执行可更快）

---

#### REQ-008: `/migrate` — 引入子Agent执行规则迁移（并行）

**当前状态分析**:
- M1 到 M4 **全部由编排者inline执行**
- M2（应用迁移）要求"按规则表逐规则迁移"——编排者直接执行大量代码修改
- M3/M4 的Lint和Build验证由编排者直接执行

**目标模式**: 规则定义由编排者执行，规则应用由子Agent并行执行

**子Agent路由**:
```
M1: 定义迁移规则（编排者执行——是分析和决策行为）
M2: 应用迁移
├── 按文件/模块分组，并行spawn多个实现Agent
│   ├── spawn backend-dev-expert（迁移后端核心文件）
│   ├── spawn backend-dev-expert（迁移路由/控制器文件）
│   └── spawn backend-dev-expert（迁移工具/测试文件）
└── 所有Agent传递相同的迁移规则表 + 各自负责的文件清单
M3: 编译与构建验证（编排者执行——运行命令）
M4: Lint自动修复（编排者执行——运行命令 + 自动修复）
```

**修改范围**:
- M2：从编排者逐规则执行改为批量 spawn 实现Agent 并行执行
- 新增文件分组策略和共享区域冲突检查

**不变约束**: 4 Gate序列不变；规则先行原则不变；迁移不夹带业务逻辑修改的红线不变

---

#### REQ-009: `/publish` — 补全shipping-and-launch技能加载 + 质量门失败spawn Agent修复

**当前状态分析**:
- `/publish` 步骤0只加载 `code-quality-gate` 和 `git-workflow-and-versioning`
- **缺少** `shipping-and-launch` 和 `finishing-a-development-branch` 技能
- 步骤2（质量门）失败时：编排者"输出失败项的详细错误信息 → 立即停止 → 用户修复后重新执行"
  - **没有spawn Agent修复**——完全依赖用户手动修复

**目标模式**: 补全技能加载；质量门失败时spawn Agent修复而非依赖用户手动修复

**子Agent路由**:
```
步骤0: 新增加载 Skill("shipping-and-launch")（发布上线检查清单）
步骤2: 质量门失败时
├── Lint失败 → spawn frontend-dev-expert 或 backend-dev-expert（定位lint错误并修复）
├── Type-check失败 → spawn frontend-dev-expert 或 backend-dev-expert（修复类型错误）
├── Build失败 → spawn frontend-dev-expert 或 backend-dev-expert（修复构建错误）
└── Deps Audit失败 → spawn backend-dev-expert（升级/替换有漏洞依赖）
步骤3: 测试失败时
└── spawn frontend-dev-expert 或 backend-dev-expert（修复导致测试失败的代码）
Gate E发布前: 加载 Skill("finishing-a-development-branch")
```

**修改范围**:
- 步骤0：新增两个Skill加载
- 步骤2：新增质量门失败时的Agent spawn + 修复→重验循环（最多2轮）
- 步骤3：新增测试失败时的Agent spawn修复逻辑

**不变约束**: 9步流程不变；红线不减少；环境检测逻辑不变

---

#### REQ-010: `/sync` — 引入docs-engineer Agent执行文档一致性检查

**当前状态分析**:
- `/sync` 步骤1-6 **全部由编排者inline执行**
- 步骤1（检查CLAUDE.md）、步骤2（检查AGENTS.md）、步骤3（检查README.md）、步骤4（检查CHANGELOG.md）需要大量文件读取和对比
- 不适合完全委托（因为需要判断写什么），但可以部分委托

**目标模式**: 编排者负责决策和修改，文档一致性检查委托给 docs-engineer

**子Agent路由**:
```
步骤0: 扫描项目现状 → 编排者执行
步骤1-4: 文档一致性检查
└── spawn docs-engineer（读取文档+代码，输出不一致清单）
    - 编排者收到清单后，逐一决策是否修复、如何修复
步骤5-6: 清理与报告 → 编排者执行
```

**修改范围**:
- 步骤1-4：新增 spawn `docs-engineer` 执行文档一致性检查
- 编排者从"逐项检查"转为"审查Agent输出+决策修复"

**不变约束**: `--dry-run` / `--no-clean` 模式不变；清理策略不变；README只修正事实性错误的约束不变

---

#### REQ-011: `/test-unit` — 引入frontend/backend-test-expert生成和执行单元测试

**当前状态分析**:
- `/test-unit` 步骤1-5 **全部由编排者inline执行**
- 步骤3（生成测试用例）由编排者直接写测试代码——**违反"编排者禁止直接编码"**
- 步骤4（运行测试并验证覆盖率）由编排者直接跑命令——可保留

**目标模式**: 测试生成委托给测试Agent；编排者只做框架检测和结果验证

**子Agent路由**:
```
步骤1: 检测测试框架 → 编排者执行（是环境检测）
步骤2: 分析目标代码 → 编排者执行（是分析，不是写代码）
步骤3: 生成测试用例
└── spawn frontend-test-expert 或 backend-test-expert（根据目标代码所在领域）
    传递：目标源文件路径、测试框架类型、场景矩阵
步骤4: 运行测试并验证覆盖率 → 编排者执行（是运行命令）
步骤5: 重构测试代码
└── spawn frontend-test-expert 或 backend-test-expert（执行测试重构）
```

**修改范围**:
- 步骤3：从编排者写测试代码改为 spawn 测试Agent
- 步骤5：从编排者重构测试改为 spawn 测试Agent

**不变约束**: Red→Green→Refactor 循环不变；覆盖率门禁标准不变；红线不减少

---

#### REQ-012: `/test-integration` — 引入backend-test-expert + api-contract-expert执行集成测试

**当前状态分析**:
- `/test-integration` 步骤1-5 **全部由编排者inline执行**
- 步骤3（生成集成测试用例）由编排者直接写测试代码——**违反"编排者禁止直接编码"**
- 步骤2（启动测试环境）可由编排者执行（环境操作）

**目标模式**: 契约识别和测试生成委托给专业Agent

**子Agent路由**:
```
步骤1: 识别API契约
└── spawn api-contract-expert（提取OpenAPI/路由定义，生成契约文档）
步骤2: 启动测试环境 → 编排者执行
步骤3: 生成集成测试用例
└── spawn backend-test-expert（基于契约生成集成测试）
    或 split: api-contract-expert 输出契约 → backend-test-expert 生成测试
步骤4: 运行集成测试 → 编排者执行
步骤5: 清理测试环境 → 编排者执行
```

**修改范围**:
- 步骤1：新增 spawn `api-contract-expert`
- 步骤3：从编排者写测试代码改为 spawn `backend-test-expert`

**不变约束**: 测试环境隔离原则不变；红线不减少

---

#### REQ-013: `/test-e2e` — 引入e2e-test-expert执行端到端测试

**当前状态分析**:
- `/test-e2e` 步骤1-5 **全部由编排者inline执行**
- 步骤2（选择工具并配置）可由编排者执行
- 步骤3（编写E2E测试脚本）由编排者直接写测试代码——**违反"编排者禁止直接编码"**

**目标模式**: E2E测试脚本编写委托给 e2e-test-expert

**子Agent路由**:
```
步骤1: 提取用户故事 → 编排者执行（是需求分析）
步骤2: 选择测试工具并配置 → 编排者执行（是工具选型）
步骤3: 编写E2E测试脚本
└── spawn e2e-test-expert（基于用户故事+选定工具生成测试脚本）
步骤4: 运行E2E测试 → 编排者执行
步骤5: 生成测试报告 → 编排者执行（是写文档）
```

**修改范围**:
- 步骤3：从编排者写测试脚本改为 spawn `e2e-test-expert`

**不变约束**: 基于用户故事驱动测试原则不变；E2E不mock后端原则不变；红线不减少

---

#### REQ-014: `/test-perf` — 引入perf-test-expert执行性能测试

**当前状态分析**:
- `/test-perf` 步骤1-6 **全部由编排者inline执行**
- 步骤3（编写负载测试脚本）由编排者直接写脚本——**违反"编排者禁止直接编码"**
- 步骤6（定位性能瓶颈）可由编排者和Agent协作

**目标模式**: 脚本编写和瓶颈定位委托给专业Agent

**子Agent路由**:
```
步骤1: 定义性能测试目标 → 编排者执行（是需求分析）
步骤2: 选择测试工具 → 编排者执行（是工具选型）
步骤3: 编写负载测试脚本
└── spawn perf-test-expert（基于目标+选定工具生成 k6/Artillery 脚本）
步骤4: 建立基线 → 编排者执行（运行命令）
步骤5: 执行性能测试 → 编排者执行（运行命令）
步骤6: 定位性能瓶颈
└── spawn perf-test-expert 或 backend-dev-expert（分析瓶颈、排查慢查询/N+1等）
```

**修改范围**:
- 步骤3：从编排者写脚本改为 spawn `perf-test-expert`
- 步骤6：新增 spawn Agent辅助瓶颈定位

**不变约束**: 不对生产环境做负载测试的红线不变；基线对比机制不变

---

#### REQ-015: `/test-security` — 引入security-review-expert执行安全测试

**当前状态分析**:
- `/test-security` 步骤1-5 **全部由编排者inline执行**
- 步骤3（执行安全扫描）由编排者直接操作ZAP API——可保留（是工具操作）
- 但安全分析能力有限

**目标模式**: 安全扫描执行和结果分析委托给 security-review-expert

**子Agent路由**:
```
步骤1: 确认测试范围与授权 → 编排者执行（是合规确认）
步骤2: 选择扫描工具 → 编排者执行（是工具选型）
步骤3: 执行安全扫描
└── spawn security-review-expert（执行 DAST 扫描、分析告警、确认误报）
    编排者负责工具启动（docker run），Agent负责分析结果
步骤4: 分析扫描结果
└── 复用步骤3的 security-review-expert 输出
步骤5: 生成安全报告 → 编排者执行（汇总Agent输出+写文档）
```

**修改范围**:
- 步骤3：新增 spawn `security-review-expert` 负责扫描结果分析
- 步骤4：整合到 security-review-expert 的输出中

**不变约束**: 不对生产环境扫描的红线不变；授权确认不可绕过；Critical/High必须修复的约束不变

---

## 7. 路由建议汇总

### 7.1 路由到 BDD 的指令

| REQ | 指令 | 理由 |
|-----|------|------|
| REQ-001 | `/review` | 高业务价值 + 高架构一致性影响；行为（审查矩阵+修复回退）需验收级定义 |
| REQ-002 | `/review-fix` | 规则复杂度高（五阶段+领域路由+复审关闭矩阵）；涉及多个领域服务的协作 |

### 7.2 路由到 TDD 的指令

| REQ | 指令 | 理由 |
|-----|------|------|
| REQ-003 | `/bug-fix` | 引擎操作（session_join/gate_check）需TDD验证前置；Agent路由逻辑确定性高 |
| REQ-004 | `/refactor` | 重构安全网（基线测试→重构→漂移检测）天然适用TDD Red→Green→Refactor |
| REQ-005 | `/debug` | Agent辅助的代码探索有明确输入输出边界，可测试 |
| REQ-006 | `/evaluate` | 原型生成和指标收集有明确输入输出契约 |
| REQ-007 | `/hotfix` | 紧急场景路径确定性高，Agent路由逻辑可TDD |
| REQ-008 | `/migrate` | 迁移规则表→Agent并行执行→验证，每个环节输出明确可测 |
| REQ-009 | `/publish` | 质量门失败→修复→重验循环是确定性有限状态机 |
| REQ-011 | `/test-unit` | 测试Agent生成测试的输入输出可明确验证 |
| REQ-012 | `/test-integration` | API契约→测试生成→执行，契约明确，可测试 |
| REQ-013 | `/test-e2e` | 用户故事→测试脚本→执行，路径明确可测 |
| REQ-014 | `/test-perf` | 负载脚本生成和执行结果可量化验证 |
| REQ-015 | `/test-security` | 安全扫描结果→告警分类→修复验证，输出边界明确 |

### 7.3 路由到直接开发的指令

| REQ | 指令 | 理由 |
|-----|------|------|
| REQ-010 | `/sync` | 低业务价值 + 低规则复杂度；单Agent委托（docs-engineer），无需BDD/TDD |

---

## 8. 依赖关系与共享区域

### 8.1 共享区域冲突矩阵

所有15个REQ都修改 `.claude/commands/` 目录下的指令文件。**每个指令文件由唯一REQ修改**，不存在两个REQ修改同一文件的情况，因此**无共享区域冲突**。

| 文件 | 唯一修改者 | 串行/并行 |
|------|----------|----------|
| `.claude/commands/review.md` | REQ-001 | 并行 |
| `.claude/commands/review-fix.md` | REQ-002 | 并行 |
| `.claude/commands/bug-fix.md` | REQ-003 | 并行 |
| `.claude/commands/refactor.md` | REQ-004 | 并行 |
| `.claude/commands/debug.md` | REQ-005 | 并行 |
| `.claude/commands/evaluate.md` | REQ-006 | 并行 |
| `.claude/commands/hotfix.md` | REQ-007 | 并行 |
| `.claude/commands/migrate.md` | REQ-008 | 并行 |
| `.claude/commands/publish.md` | REQ-009 | 并行 |
| `.claude/commands/sync.md` | REQ-010 | 并行 |
| `.claude/commands/test-unit.md` | REQ-011 | 并行 |
| `.claude/commands/test-integration.md` | REQ-012 | 并行 |
| `.claude/commands/test-e2e.md` | REQ-013 | 并行 |
| `.claude/commands/test-perf.md` | REQ-014 | 并行 |
| `.claude/commands/test-security.md` | REQ-015 | 并行 |

**结论**: 15个指令文件互不重叠，所有REQ可以**全并行**执行。无需串行依赖。

### 8.2 参考依赖

所有15个指令的修改都**依赖**于参考 `/jarvis` 命令的Agent编排模式（特别是 Gate D 的审查矩阵和 Gate C-impl 的并行batch模式）。但这是逻辑参考而非文件共享，不影响并行性。

---

## 9. 风险分析

### 9.1 高风险区域

| 风险项 | 涉及REQ | 风险描述 | 缓解措施 |
|--------|---------|---------|---------|
| 编排模式一致性 | ALL | 修改15个指令的编排模式，需确保所有指令遵循相同的"编排者禁止直接编码"原则 | 以 /jarvis 为唯一参考模板；所有 spawn 调用遵循统一格式 |
| 回退循环完整性 | REQ-001~009 | 新增Agent操作后的失败回退循环可能遗漏 | 明确定义每个指令的 max_retries 和 BLOCKED 条件 |
| Gate 权限适配 | ALL | 当前指令的 Gate 序列定义可能未考虑 spawn 子Agent 所需的权限 | 确认每个指令的 pipeline_type 和 Gate 配置与新增的 Agent spawn 兼容 |

### 9.2 中风险区域

| 风险项 | 涉及REQ | 描述 |
|--------|---------|------|
| 子Agent超时 | REQ-003/004/008 | 复杂修复/重构/迁移任务可能导致子Agent超时 |
| Skill加载冗余 | ALL | 编排者加载过多Skill可能浪费上下文；需区分编排者Skill和Agent Skill |

### 9.3 低风险区域

| 风险项 | 涉及REQ | 描述 |
|--------|---------|------|
| 测试指令相对简单 | REQ-011~015 | 测试指令的Agent委托逻辑清晰（一对一映射），风险低 |
| /sync 仅新增单个Agent | REQ-010 | 最简单的修改，风险最低 |

---

## 10. 推荐交付顺序

### 10.1 分批策略

```
第1批（低风险验证，先行试点）:   REQ-010 (/sync)
第2批（中风险，测试指令集群）:   REQ-011~015 (5个测试指令，可并行)
第3批（高风险，核心指令集群A）:  REQ-003, REQ-005, REQ-006, REQ-007 (bug-fix/debug/evaluate/hotfix)
第4批（高风险，核心指令集群B）:  REQ-004, REQ-008 (refactor/migrate)
第5批（高风险，审查指令集群）:   REQ-001, REQ-002 (review/review-fix)
第6批（高风险，发布指令）:        REQ-009 (/publish)
```

### 10.2 分批理由

- **第1批先做 /sync**：最简单（单Agent），验证Agent spawn模式可行，作为后续指令的参考
- **第2批测试指令**：5个指令模式高度相似（测试Agent一对一替换编排者），可以快速并行完成，建立信心
- **第3批核心指令A**：bug-fix/debug/evaluate/hotfix 各有不同编排复杂度，但都是"部分委托"模式
- **第4批核心指令B**：refactor（5 Gate安全网）和 migrate（并行Agent迁移）复杂度最高，需要前几批积累的经验
- **第5批审查指令**：review和review-fix的Agent矩阵最复杂（6~7个Agent并行），且互为上下游，建议最后处理
- **第6批发布指令**：/publish 涉及质量门失败修复回路，需要前序指令的Agent修复经验

### 10.3 每批内部可并行

同一批次内的指令文件互不重叠，可以完全并行。

---

## 11. 架构决策记录 (ADR)

### ADR-001: 编排模式强制转换

**决策**: 所有指令的代码生成/修改逻辑必须通过 `Agent()` spawn 执行，编排者保留以下操作：
- 需求澄清和决策
- 运行CLI命令（Lint/Build/Test）
- 浏览器操作（agent-browser CLI）
- 文档生成（报告/总结）
- Gate 操作（session_join/gate_check/gate_enforce/advance_gate）

**理由**: 与 `/jarvis` 架构原则保持一致——编排者禁止直接编码。

### ADR-002: Agent路由按领域而非按指令

**决策**: Agent选择基于任务领域（前端/后端/测试/审查），而非基于触发指令。

**理由**: Agent是领域专家，不受限于特定指令上下文。同一个 `frontend-dev-expert` 可以被 /bug-fix、/refactor、/review-fix 等不同指令spawn。

### ADR-003: 审查Agent矩阵统一为6+1

**决策**: 所有需要审查的指令（/review, /review-fix）使用统一的6+1审查矩阵：
- 5个必选：frontend-review-expert, backend-review-expert, security-review-expert, perf-review-expert, qa-review-expert
- 1个条件性：algorithm-expert

**理由**: 与 `/jarvis` Gate D 保持一致，避免不同指令有不同的审查标准。

---

## 12. 结论

本DDD分析识别了指令系统架构领域的核心概念和边界：

- **1个聚合根**: Command（指令）
- **3个核心实体**: Agent（57种）、Skill（34种）、Gate（12+道）
- **5个值对象**: Gate配置、Agent路由表、失败回退策略、Skill分配表、允许工具集
- **5个领域服务**: Agent路由、Gate检查、会话管理、失败回退、Skill加载
- **15个聚合行为**: 对应15个REQ的指令修改行为
- **2个BDD候选**: REQ-001 (/review), REQ-002 (/review-fix)
- **12个TDD候选**: REQ-003~009, REQ-011~015
- **1个直接开发**: REQ-010 (/sync)

**关键发现**:
1. 当前14个指令中，仅有 `/review` 和 `/review-fix` 部分使用了子Agent（且不完整），其余12个指令完全由编排者inline执行
2. 所有15个指令文件互相独立，可以完全并行修改，无共享区域冲突
3. `/jarvis` 命令提供了完整的编排模板，可直接作为15个指令修改的参考实现
4. 最复杂的修改是 REQ-002 (/review-fix)，涉及五阶段中三阶段（初审/执行/复审）的Agent矩阵 + 领域路由逻辑
