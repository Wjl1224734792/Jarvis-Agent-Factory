# AGENTS.md — 项目级约束与知识库

> Jarvis Agent Factory · 71 Agent · 40 Command · 35 Skill · 15 Pipeline · v4.3.6
>
> **所有智能体启动时必须读取此文件。** 入口指南见 [CLAUDE.md](./CLAUDE.md)。

---

## L1 — 快速索引

### 项目类型

多智能体配置工程（非业务应用代码），专注 **Claude Code** 平台。模板源文件位于 `src/templates/platforms/claude/`，通过 CLI `jarvis` 命令安装到目标项目。`.opencode/` 和 `.codex/` 模板已冻结，仅保留作为历史参考。

### 关键数字

| Agents | Commands | Skills | Pipelines |
|:------:|:--------:|:------:|:---------:|
| 71 | 40 | 35 | 15 |

### 文档同步约束

**每次提交代码必须同步更新以下文档：**

- **AGENTS.md**（本文件）— Agent 列表、技能列表、统计数字、关键约束
- **README.md** — 版本号、特性列表、Web 面板页面、统计数据
- **docs/README.md** — 流水线产物目录结构

> 提交前自问：我改了什么？AGENTS.md / README.md / docs/README.md 需要同步更新吗？

### 各层概要

| 层 | 内容 | 适用者 |
|:--:|------|--------|
| L1 | 快速索引、项目类型、关键数字 | 所有 Agent |
| L2 | 核心约束（24条红线） | 所有 Agent |
| L3 | 流水线体系（15条管道+Gate说明） | 编排者 |
| L4 | 工作模式与指令入口（40条命令） | 编排者 |
| L5 | 智能体体系（71个Agent按6类分组） | 编排者 spawn 时查阅 |
| L6 | 技能体系（35个Skill按14类分组） | 编排者、实现 Agent |
| L7 | 文档驱动体系（产物目录+文档规范） | 所有 Agent |
| L8 | 发布流程 | 编排者 |

---

## L2 — 核心约束（不可绕过）

1. **禁止凭记忆编码** — 修改前必须读取相关源码、测试、契约
2. **修改技能前先读 writing-skills** — 技能文件需遵循 TDD 规范
3. **技能修改仅限 Claude Code** — `.claude/skills/` 为主力维护，`.codex/skills/` 和 `.opencode/skills/` 已冻结不更新
4. **子智能体不可递归** — 子智能体不得再 spawn 其他子智能体
5. **闸门不可绕过** — 各流水线 Gate 序列不可跳跃。详见 [L3 流水线体系](#l3-流水线体系)。
   - Gate B1（架构评审）为条件性 Gate：涉及前端/后端/数据库/算法变更时强制执行
   - Gate C1.5（视觉验证）为条件性 Gate：纯后端/逻辑/算法任务可跳过
6. **同 Batch 并行** — 无依赖任务必须在同一消息中批量发起
7. **敏感信息不入库** — `.gitignore` 已排除 `settings.local.json`、`.env*`、`*.token`、`*.pem` 等
8. **维护 .gitignore** — 每次新增文件类型必须同步更新 `.gitignore`，提交前检查 `git status` 无异常文件
9. **不修改共享区域** — 共享契约/配置变更需提交 plan patch
10. **垂直切片优先** — 任务按端到端功能拆分，非技术层级
11. **Agent 失败重试** — 超时重试最多 2 次 / 3 次全失败标记 BLOCKED
12. **修改完必须测试** — 每次代码变更后验证功能正常，引擎启动无误，CLI 命令可用
13. **评审修复后必须重新质量验证（硬约束）** — Gate D 修复后必须 Lint + Type-check + Build + Deps Audit + 测试套件。最多 2 轮，仍失败标记 ABORT。
14. **修改完必须发布** — 测试通过后按 [L8 发布流程](#l8-发布流程) 推送 GitHub，CI 自动发布 npm
15. **提交必须同步文档** — 见 [L1 文档同步约束](#文档同步约束)
16. **临时文件统一存放** — 所有流水线过程产物放入 `docs/tmp/`，禁止散落在项目根目录
17. **Command（指令）与 Agent（智能体）边界清晰**：
    - Command（`/jarvis`, `/frontend`, `/backend-architect` 等）是用户交互入口
    - Agent（`frontend-architect`, `algorithm-expert` 等）由编排者在对应 Gate spawn 执行
    - `/frontend-architect`, `/backend-architect`, `/algorithm-expert` 仅用于方案讨论，不进入流水线
18. **OpenCode/Codex 已冻结** — 不对 OpenCode/Codex 平台做任何修改或同步
19. **产物目录规范（硬约束）** — 正式产出**必须**存入 `docs/YYYY-MM-DD/{subdir}/`。**禁止**旧扁平格式。
20. **多模态回退** — 模型不支持多模态时，使用 `visual-primitives-mcp` 工具代替
21. **Web 面板路径解析——dev/main 隔离**：必须通过 `getWebDistDir()` 处理，禁止硬编码路径
22. **存储分层架构（硬约束）**：
    - 项目级 `<project>/.jarvis/`：跨会话记忆（engine.db、quality-gates.yml）
    - 用户级 `~/.jarvis/`：仅 agent 模型偏好，禁止存跨项目数据
    - 项目配置 `<project>/.claude/`：settings.json、agents/、commands/、skills/
    - Docs `<project>/docs/YYYY-MM-DD/`：日期隔离的流水线产物
23. **Agent Team 模块隔离（硬约束）** — Team 模式每个成员独占模块/文件区域，禁止共享。前端按组件拆分，后端按服务模块拆分
24. **Agent Team + SubAgent 混合编排** — 根据 Gate 的 `team_strategy` 选择：
    - `prefer_team`（C-impl/C2/D）→ TeamCreate + Agent(team_name)
    - `subagent_only`（A/B1/C）→ Agent 工具直接 spawn
    - 调用 `pipeline_guide` 获取当前 Gate 的调度建议

---

## L3 — 流水线体系

### 标准流水线（full/frontend/backend/lite）

```
Gate A → Gate B-DDD → Gate B-BDD → Gate B-TDD → Gate B1 → Gate C → Gate C-impl → Gate C1 → Gate C1.5 → Gate C2 → Gate D → Gate E
 需求     领域分析      行为驱动      测试驱动      架构     规划      并行实现      质量     视觉验证     测试      评审      发布
```

| Gate | 说明 |
|------|------|
| Gate A | 需求澄清：产出 REQ-XXX 需求文档 |
| Gate B-DDD | 领域驱动分析：聚合/实体/值对象/领域服务 |
| Gate B-BDD | 行为驱动：Gherkin 场景（条件性，纯技术逻辑可跳过） |
| Gate B-TDD | 测试驱动任务分解：TASK 映射 REQ |
| Gate B1 | 架构评审：spawn 对应架构师（条件性） |
| Gate C | 执行规划：planner 产出 parallel_batches |
| Gate C-impl | 并行实现：Team 模式 spawn 实现 Agent |
| Gate C1 | 代码质量门：Lint + Type-check + Build + Deps Audit |
| Gate C1.5 | 视觉验证：截图对比（条件性，纯后端可跳过） |
| Gate C2 | 测试验证：Team 模式 spawn 测试 Agent |
| Gate D | 评审：Team 模式 spawn 审查 Agent |
| Gate E | 发布上线：质量重检 → 版本递增 → 上线 |

### 专业流水线（11条独立Gate序列）

| 指令 | 流水线 | Gate 序列 | 门数 | 适用场景 |
|------|--------|----------|:----:|---------|
| `/refactor` | refactor | R1→R2→R3→R4→R5 | 5 | 代码重构、性能优化 |
| `/hotfix` | hotfix | H0→H1→H2→H3 | 4 | 紧急故障恢复 |
| `/migrate` | migrate | M1→M2→M3→M4 | 4 | 框架升级、依赖替换 |
| `/evaluate` | evaluate | E0→E1→E2→E3 | 4 | 技术选型、方案对比 |
| `/debug` | debug | D0→D1→D2→D3→D4 | 5 | 异常排查、根因定位 |
| `/research` | research | RS0→RS1→RS2→RS3→RS4 | 5 | 技术调研、方案研究 |
| `/release` | release | RL0→RL1→RL2→RL3→RL4 | 5 | 快速发布 |
| `/ask` | ask | K0→K1→K2→K3 | 4 | 需求探询（4模式自适应） |
| `/simplify` | simplify | S0→S1→S2→S3 | 4 | 代码质量清理 |
| `/trace` | trace | T0→T1→T2→T3→T4 | 5 | 假设驱动因果追踪 |
| `/improve` | improve | IM0→IM1→IM2→IM3→IM4 | 5 | 度量驱动迭代改进 |

### Gate 操作权限表（引擎强制执行）

| Gate | 允许 | 禁止 |
|------|------|------|
| A / B-DDD / B-BDD / B-TDD | read, write_doc | write_code, spawn_test, build, deploy |
| B1 | read, write_doc, sweep_arch | write_code, spawn_impl, build, deploy |
| C | read, write_doc, sweep_arch, spawn_impl | spawn_test, build, deploy |
| C-impl | read, write_code, spawn_impl | spawn_test, build, deploy |
| C1 | read, lint, build, fix | spawn_impl, spawn_test, deploy, write_code |
| C1.5 | read, preview, fix | spawn_impl, build, deploy, write_code |
| C2 | read, spawn_test, fix | spawn_impl, deploy, write_code |
| D | read, review, audit, fix | spawn_impl, build, deploy, write_code |
| E | read, deploy, write_doc | write_code, spawn_impl, lint, build |

> 完整 Gate 操作矩阵和 Agent 生成指引见 `src/engine/gates.ts` → `GATE_OPERATIONS` / `GATE_AGENT_GUIDE`。

---

## L4 — 工作模式与指令入口

> **仅 Claude Code 平台可用。** 共 40 条指令。

### 编排入口

| 指令 | 模式 | 说明 |
|------|------|------|
| `/jarvis` | 全流程严格模式 | 13 Gate 全部强制执行，适合中大型功能开发 |
| `/auto` | 智能路由模式 | 自动检测任务→选最优流水线→跳过无关Gate→分配Agent。**日常默认入口** |

### 平台开发

| 指令 | 平台 |
|------|------|
| `/frontend` `/backend` | Web 全栈 |
| `/android` `/ios` | 原生移动端 |
| `/flutter` `/expo` `/taro` `/react-native` | 跨端移动端 |

### 需求与设计

| 指令 | 说明 |
|------|------|
| `/ask` | 需求探询（Interview/Direct/Consensus/Review 4模式） |
| `/task-ddd` `/task-bdd` `/task-tdd` | 任务分解（领域/行为/测试驱动） |
| `/research` | 深度研究（RS0-RS4） |

### 工程操作

| 类别 | 指令 |
|------|------|
| 质量 | `/simplify`（代码简化） `/improve`（迭代改进） |
| 重构 | `/refactor` `/hotfix` `/migrate` |
| 调试 | `/debug` `/trace`（因果追踪） |
| 评估 | `/evaluate` |
| 发布 | `/release` `/publish` |
| 同步 | `/sync` |

### 审查与测试

| 类别 | 指令 |
|------|------|
| 审查 | `/review` `/review-fix` |
| 测试 | `/test-unit` `/test-integration` `/test-e2e` `/test-perf` `/test-security` `/browser-test` |
| 架构 | `/frontend-architect` `/backend-architect` `/algorithm-expert` |

### 专用工具

`/bug-fix` `/browser-explore`

### 流程管理

`/skill-flow` — 会话流程导出为可复用 Skill 模板（export/save/list/apply 子命令）

### Web 面板

| 页面 | 路由 | 功能 |
|------|------|------|
| 流水线看板 | `#/dashboard` | 会话列表 · Gate 进度 · 产物预览 · SSE 实时推送 |
| 智能体配置 | `#/agents` | 模型/思考等级修改 · 筛选 · 搜索 |
| 指令列表 | `#/commands` | 命令浏览 · 分类筛选 |
| 归档记录 | `#/archive` | 历史会话 · 恢复/删除 |

> 远程面板：每次 GitHub Release 附带单 HTML 文件，下载即可使用。

---

## L5 — 智能体体系

共 **71 个 Agent**，仅 Claude Code 平台。按功能分 6 类：

### 实现类（25）
`frontend-dev-expert` `frontend-ui-expert` `frontend-state-expert` `backend-dev-expert` `backend-api-expert` `backend-logic-expert` `backend-data-expert` `taro-dev-expert` `taro-ui-expert` `taro-state-expert` `android-dev-expert` `android-ui-expert` `android-state-expert` `ios-dev-expert` `ios-ui-expert` `ios-state-expert` `react-native-dev-expert` `react-native-ui-expert` `react-native-state-expert` `expo-dev-expert` `expo-ui-expert` `expo-state-expert` `flutter-dev-expert` `flutter-ui-expert` `flutter-state-expert`

### 测试类（15）
`frontend-test-expert` `backend-test-expert` `android-test-expert` `ios-test-expert` `flutter-test-expert` `taro-test-expert` `expo-test-expert` `react-native-test-expert` `browser-test-expert` `browser-use-expert` `e2e-test-expert` `perf-test-expert` `api-test-expert` `test-doc-writer` `test-executor`

### 规划/任务（4）
`task-design` `planner` `skill-assignment-expert` `remediation-planner`

### 审查类（16）
`frontend-review-expert` `backend-review-expert` `android-review-expert` `ios-review-expert` `flutter-review-expert` `taro-review-expert` `expo-review-expert` `react-native-review-expert` `diff-review-expert` `project-review-expert` `perf-review-expert` `security-review-expert` `qa-review-expert` `change-review-expert` `review-only` `review-fix-optimize`

### 架构/专家（4）
`algorithm-expert` `frontend-architect` `backend-architect` `database-architect`

### 探索/支撑（7）
`code-explore-expert` `external-resource-expert` `api-contract-expert` `docs-engineer` `infra-deploy-expert` `remediation-expert` `docs-research-expert`

---

## L6 — 技能体系

共 **35 个 Skill**，按 14 类分组：

| 类别 | 技能 |
|------|------|
| **基础** | `behavioral-guidelines` `context-engineering` `using-agent-skills` |
| **需求** | `spec-driven-development` `idea-refine` |
| **规划** | `planning-and-task-breakdown` |
| **实现** | `source-driven-development` `incremental-implementation` `test-driven-development` `code-standards` `code-simplification` `frontend-design` `refactoring` |
| **质量** | `code-quality-gate` `code-review-and-quality` `verification-before-completion` |
| **测试** | `perf-testing` `test-data-factory` |
| **调试** | `debugging-and-error-recovery` `debugging-deep` |
| **浏览器** | `agent-browser` `browser-testing` `browser-use` |
| **安全** | `security-and-hardening` `security-testing` |
| **流程** | `shipping-and-launch` `git-workflow-and-versioning` `finishing-a-development-branch` |
| **文档** | `chinese-documentation` `documentation-and-adrs` `writing-skills` |
| **探索** | `find-docs` `find-skills` |
| **工具** | `mcp-builder` |
| **参考** | `jarvis-reference` |

> 技能 Skill() 加载关系见各命令模板 `src/templates/platforms/claude/commands/*.md` 的步骤 0。

---

## L7 — 文档驱动体系

### 产物目录规范

所有正式产物**必须**存入 `docs/YYYY-MM-DD/` 日期目录：

```
docs/YYYY-MM-DD/
├── requirements/     ← Gate A、/ask K0-K3、/research RS0
├── tasks/            ← Gate B-DDD/B-BDD/B-TDD
├── architecture/     ← Gate B1
├── plans/            ← Gate C
├── implementation/   ← Gate C-impl→C1
├── testing/          ← Gate C2
├── review/           ← Gate D
├── shipping/         ← Gate E
├── research/         ← /research RS0-RS4
├── refactoring/      ← /refactor R1-R5
├── hotfix/           ← /hotfix H0-H3
├── migration/        ← /migrate M1-M4
├── evaluation/       ← /evaluate E0-E3
├── debug/            ← /debug D0-D4
├── simplification/   ← /simplify S0-S3
├── trace/            ← /trace T0-T4
├── improvement/      ← /improve IM0-IM4
└── tmp/              ← 过程临时产物（不入版本库）
```

### Agent 文档产出规范

| Agent 类别 | 产出要求 | 存放路径 |
|-----------|---------|---------|
| 实现类 | `<TASK-ID>-completion.md` 自查报告 | `docs/YYYY-MM-DD/implementation/` |
| 审查类 | 审查报告（findings + 严重度分级） | `docs/YYYY-MM-DD/review/` |
| 测试类 | 测试报告（通过/失败清单 + 覆盖率） | `docs/YYYY-MM-DD/testing/` |
| 规划/任务 | 正式文档即为完成文档 | 对应阶段目录 |
| 特殊 | docs-engineer → `.jarvis/docs-sync-report.md` | browser-use-expert → `docs/.../browser-use/report.md` |

### 浏览器测试文档驱动工作流

```
test-doc-writer → test-executor → remediation-expert
   (编写用例)       (按文档执行)      (失败→修复→复测, ≤2轮)
```

---

## L8 — 发布流程

### 1. 版本递增

编辑 `package.json`：patch(`z`)=Bug修复 · minor(`y`)=新功能 · major(`x`)=破坏性变更

### 2. 维护文档

每次提交同步：AGENTS.md · README.md · docs/README.md · .gitignore

### 3. 提交并打 Tag

```bash
git add <files>
git commit -m "<type>: <描述>"
git tag -a v<version> -m "v<version> - <概要>"
```

### 4. 推送

```bash
git push origin main && git push origin v<version>
```

### 5. CI 自动发布

| 触发 | 工作流 | 职责 |
|------|--------|------|
| push/PR to main | `.github/workflows/ci.yml` | Lint + Type-check + Test + Build |
| Tag `v*` | `.github/workflows/ci.yml` | 质量检查 → Changelog → GitHub Release → npm publish |

### 6. 验证

```bash
npm view jarvis-agent-factory version     # npm 版本
git ls-remote --tags origin | grep v      # GitHub tag
```
