# AGENTS.md — 项目级约束

Jarvis Agent Factory 项目级上下文入口。**所有智能体启动时必须读取此文件。**

> 架构概览见 [CLAUDE.md](./CLAUDE.md) 和 [README.md](./README.md)

## 🔴 文档同步约束（每次提交必须检查）

**每次提交代码必须同步更新以下文档，确保文档与项目状态一致：**

- **AGENTS.md**（本文件）— Agent 列表、技能列表、统计数字、关键约束
- **README.md** — 版本号、特性列表、Web 面板页面、统计数据、CLI 命令
- **docs/README.md** — 流水线产物目录结构

> 提交前自问：我改了什么？AGENTS.md / README.md / docs/README.md 需要同步更新吗？

## 项目类型

多智能体配置工程（非业务应用代码），专注 **Claude Code** 平台。

模板源文件位于 `src/templates/platforms/claude/`，通过 CLI `jarvis` 命令安装到目标项目。
`.opencode/` 和 `.codex/` 模板已冻结，仅保留作为历史参考，不维护不更新。

## 生命周期流水线

### 标准流水线

```
想法细化 → 需求澄清 → 任务分解(DDD→BDD→TDD) → 架构评审 → 执行规划 → 并行实现 → 代码质量 → 视觉验证 → 测试 → 评审 → 质量重检 → 发布
  Gate 0     Gate A     Gate B              Gate B1    Gate C     Gate C-impl Gate C1   Gate C1.5  Gate C2  Gate D  Gate E(前置) Gate E
```

### 专业流水线（v3.45.0）

新指令各自有独立的 Gate 序列，绕过标准流水线直接进入专业流程：

| 流水线类型 | 指令 | Gate 序列 | 门数 | 适用场景 |
|-----------|------|----------|:----:|---------|
| **重构** | `/refactor` | R1(边界定义) → R2(基线测试) → R3(执行重构) → R4(行为漂移检测) → R5(报告) | 5 | 代码重构、性能优化、可维护性提升 |
| **热修复** | `/hotfix` | H0(紧急声明) → H1(最小化修复) → H2(快速验证) → H3(事后审计) | 4 | 紧急故障恢复、P0/P1 事故 |
| **迁移** | `/migrate` | M1(迁移规则) → M2(应用迁移) → M3(编译验证) → M4(Lint 修复) | 4 | 框架升级、依赖替换、跨平台迁移 |
| **评估** | `/evaluate` | E0(评估标准) → E1(快速原型) → E2(指标收集) → E3(评估报告) | 4 | 技术选型、方案对比、可行性研究 |
| **调试** | `/debug` | D0(信息收集) → D1(复现用例) → D2(调试会话) → D3(交互诊断) → D4(报告) | 5 | 异常排查、根因定位、疑难 Bug |
| **研究** | `/research` | RS0(课题定义) → RS1(信息收集) → RS2(深度分析) → RS3(假设验证) → RS4(研究报告) | 5 | 技术调研、架构分析、方案研究 |
| **发布** | `/release` | RL0(环境检测) → RL1(质量门) → RL2(版本递增) → RL3(发布执行) → RL4(发布验证) | 5 | 当前分支快速发布（区别于 /publish 的完整 PR 流程） |
| **探询** | `/ask` | K0(需求摄入) → K1(信息收集) → K2(分析综合) → K3(交付产出) | 4 | 4模式自适应：Interview(模糊澄清)/Direct(快速分析)/Consensus(多角色审查)/Review(流程优化) |
| **简化** | `/simplify` | S0(代码分析) → S1(简化执行) → S2(回归验证) → S3(报告产出) | 4 | 代码质量清理：删除冗余→简化逻辑→回归验证→before/after报告 |
| **追踪** | `/trace` | T0(问题框架) → T1(假设生成) → T2(证据收集) → T3(因果分析) → T4(解决方案) | 5 | 假设驱动因果追踪：竞态假设→贝叶斯更新→根因定位 |
| **改进** | `/improve` | IM0(目标定义) → IM1(研究分析) → IM2(计划制定) → IM3(执行验证) → IM4(评估迭代) | 5 | 自主迭代改进：度量驱动循环→研究→计划→执行→评估→迭代直到达标 |

## 工作模式

> **仅 Claude Code 平台可用**。OpenCode / Codex 列仅供参考，实际不可用。

| 模式 | Claude Code（✅） | OpenCode（⛔） | Codex（⛔） |
|------|-----------|----------|-------|
| 全栈编排 | `/jarvis` | 切换到 `jarvis` agent | 加载 `jarvis` skill |
| 智能路由编排 | `/auto` | 自动检测任务→选最优流水线→跳过无关Gate→分配Agent |
| 前端生命周期 | `/frontend` | 切换到 `frontend` agent | 加载 `frontend` skill |
| 后端生命周期 | `/backend` | 切换到 `backend` agent | 加载 `backend` skill |
| 移动端开发 | `/taro` `/android` `/ios` `/expo` `/flutter` `/react-native` | 切换到对应 agent | 加载对应 skill |
| 浏览器测试 | `/browser-test` | 切换到 `browser-test-worker` | 加载 `browser-test` skill |
| Bug 修复 | `/bug-fix` | 切换到编排者触发 | 加载 `bug-fix` skill |
| 一键发布 | `/publish` | 质量门→测试→版本→tag→PR→合并→发布 | 引用 `code-quality-gate` `git-workflow-and-versioning` |
| 文档同步 | `/sync` | 检查并更新核心文档使其与代码一致，清理过时文件 | 加载 `docs-engineer` |
| 只读审查 | `/review` | 切换到 `review-only` agent | 加载 `review-only` skill |
| 审查修复闭环 | `/review-fix` | 切换到 `review-fix-optimize` agent | 加载 `review-fix-optimize` skill |
| 算法专家 | `/algorithm-expert` | 切换到 `algorithm-expert` agent | 加载 `algorithm-expert` skill |
| 架构对话 | `/frontend-architect` `/backend-architect` | 切换到对应 agent | 加载对应 skill |
| **测试** | | |
| 单元测试 | `/test-unit` | — | — |
| 集成测试 | `/test-integration` | — | — |
| 端到端测试 | `/test-e2e` | — | — |
| 性能测试 | `/test-perf` | — | — |
| 安全测试 | `/test-security` | — | — |
| **工程** | | |
| 重构安全网 | `/refactor` | — | — |
| 紧急热修复 | `/hotfix` | — | — |
| 框架迁移 | `/migrate` | — | — |
| 技术评估 | `/evaluate` | — | — |
| 调试诊断 | `/debug` | — | — |

### Gate 说明

| Gate | 类型 | 说明 |
|------|------|------|
| Gate B1（架构评审） | 条件性 | 涉及前端/后端/数据库/算法变更时强制执行；由编排者自动 spawn 对应架构 Agent |
| Gate C-impl（并行实现） | 必选 | Gate C 规划完成后，由编排者 spawn 实现类 Agent 并行执行编码任务 |

## Web 面板

| 页面 | 路由 | 功能 |
|------|------|------|
| 流水线看板 | `#/dashboard` | 会话列表 · 统计卡片 · Gate 进度 · 产物文档卡片列表 + Markdown 预览 · Gate Timeline · SSE 实时推送 |
| 智能体配置 | `#/agents` | 卡片网格 · 平台/来源/分类筛选 · 模型/思考等级弹窗 · 文件同步 |
| 归档记录 | `#/archive` | 按会话分组 · 搜索过滤 · 恢复/永久删除 |

会话命名：通过 MCP 工具 `session_set_name` 给运行记录设置任务名称，Web 面板优先显示任务名而非会话 ID。

远程面板：每次 GitHub Release 附带单 HTML 文件（`index.html`），下载即可打开使用，无需本地构建 web。

## 浏览器测试文档驱动工作流

```
测试文档编写者 → 测试执行者 → 修复复测者
(test-doc-writer)  (test-executor)  (remediation-expert)
```

1. **test-doc-writer** — 编写测试用例文档（结构化步骤、预期结果），不执行测试
2. **test-executor** — 按照文档执行测试，输出通过/失败清单，不编写用例
3. **remediation-expert** — 规划修复任务、执行修复、重跑用例验证，最多 2 轮修复-重测循环

此工作流已集成到 Gate C2 测试验证阶段。

## 浏览器自动化

统一使用 **agent-browser** CLI（Vercel Labs，80+ 命令）。

```bash
npm i -g agent-browser && agent-browser install
```

Claude Code 额外搭配 Preview MCP 做本地预览验证。

## 🔴 关键约束（不可绕过）

1. **禁止凭记忆编码** — 修改前必须读取相关源码、测试、契约
2. **修改技能前先读 writing-skills** — 技能文件需遵循 TDD 规范
3. **技能修改仅限 Claude Code** — `.claude/skills/` 为主力维护，`.codex/skills/` 和 `.opencode/skills/` 已冻结不更新
4. **子智能体不可递归** — 子智能体不得再 spawn 其他子智能体
5. **闸门不可绕过** — 标准流水线 Gate A→B→B1→C→C-impl→C1→C1.5→C2→D→E 顺序不可跳跃。专业流水线同理不可绕过：重构 R1→R2→R3→R4→R5、热修复 H0→H1→H2→H3、迁移 M1→M2→M3→M4、评估 E0→E1→E2→E3、调试 D0→D1→D2→D3→D4、研究 RS0→RS1→RS2→RS3→RS4、发布 RL0→RL1→RL2→RL3→RL4、探询 K0→K1→K2→K3、简化 S0→S1→S2→S3、追踪 T0→T1→T2→T3→T4、改进 IM0→IM1→IM2→IM3→IM4。
    - Gate B1（架构评审）为条件性 Gate：涉及前端/后端/数据库/算法变更时强制执行
    - Gate C1.5（视觉验证）为条件性 Gate：纯后端/逻辑/算法任务可跳过
6. **同 Batch 并行** — 无依赖任务必须在同一消息中批量发起
7. **敏感信息不入库** — `.gitignore` 已排除 `settings.local.json`、`.env*`、`*.token`、`*.pem` 等
8. **维护 .gitignore** — 每次新增文件类型（临时文件、截图、日志、数据库文件等）必须同步更新 `.gitignore`，防止误提交。提交前检查 `git status` 无异常文件
9. **不修改共享区域** — 共享契约/配置变更需提交 plan patch
10. **垂直切片优先** — 任务按端到端功能拆分，非技术层级
11. **Agent 失败重试** — 超时重试最多 2 次 / 3 次全失败标记 BLOCKED
12. **修改完必须测试** — 每次代码变更后验证功能正常，引擎启动无误，CLI 命令可用
13. **评审修复后必须重新质量验证（硬约束）** — Gate D 评审触发的任何代码修复，完成后**必须**重新执行 Lint + Type-check + Build + Deps Audit + 测试套件。修复 → 重跑全部（不可只跑失败项）→ 最多 2 轮 → 仍失败标记 ABORT。全部通过方可进入 Gate E 发布。
14. **修改完必须发布** — 测试通过后按下方「发布流程」推送到 GitHub，GitHub Actions 自动发布 npm
15. **提交必须同步文档** — 每次提交必须维护 AGENTS.md 与 README.md 保持与项目状态同步，版本号、统计数据、特性列表必须一致
16. **临时文件统一存放** — 所有流水线过程产物（截图、快照、导出的验证数据等）统一放入 `docs/tmp/` 目录，禁止散落在项目根目录。`docs/tmp/` 已配置 `.gitignore` 排除。
17. **Command（指令）与 Agent（智能体）边界清晰**：
    - Command（`/jarvis`, `/frontend`, `/backend-architect` 等）是用户交互入口，用于讨论方案或启动流程
    - Agent（`frontend-architect`, `algorithm-expert` 等）由编排者在对应 Gate spawn 执行
    - `/frontend-architect`, `/backend-architect`, `/algorithm-expert` 仅用于方案讨论，不进入流水线
    - 流水线中的架构 Agent 由编排者在 Gate B1 自动 spawn
18. **OpenCode/Codex 已冻结** — 不对 OpenCode/Codex 平台做任何修改或同步，配置文件仅保留作为历史参考。CLI 中 `jarvis add opencode/codex` 仍可执行但生成的文件已过时。
19. **产物目录规范（硬约束，禁止旧格式）** — 临时产物统一放入 `docs/tmp/`，智能体正式产出**必须**存入 `docs/YYYY-MM-DD/{requirements|tasks|architecture|plans|implementation|testing|review|shipping}/`。**禁止**写入 `docs/{subdir}/` 扁平目录或 `docs/{subdir}/YYYY-MM-DD-<topic>.md` 旧格式，引擎已移除所有向后兼容回退逻辑
20. **多模态回退** — 当模型需要多模态能力（图片理解/截图分析）但模型本身不支持时，使用 `visual-primitives-mcp` 提供的视觉工具（`visual_describe`/`visual_locate`/`visual_ocr`/`visual_video_analyze`）代替模型原生视觉能力
21. **Web 面板路径解析——dev/main 隔离**：
    - **main 分支发布** → npm 全局包 → `dist/web/index.html` 位于包安装目录。引擎通过 `import.meta.dirname` 推导包目录加载它，不依赖 CWD
    - **dev 分支开发** → 本地项目 → `dist/web/index.html` 位于项目根目录。`getWebDistDir()` 在包目录找不到时回退到 `resolve(root, 'dist', 'web')`
    - **禁止**：直接硬编码 `resolve(root, 'dist', 'web')` 或 `path.join(process.cwd(), 'dist/web')`。必须通过 `getWebDistDir()` 处理双场景
    - **验证方式**：全局安装后，在任意目录运行 `jarvis engine start` 访问 `localhost:3456` 应显示面板；dev 环境 `node bin/jarvis.js engine start` 同样可用
22. **存储分层架构（硬约束）** — 严格区分项目级跨会话记忆和用户级跨项目配置：
    - **项目级记忆** `<project>/.jarvis/`：该项目的**跨会话记忆**——engine.db（sessions/pipeline_runs/checkpoints/artifacts 仅含本项目数据）、engine.pid、file-hashes.json、quality-gates.yml、docs-sync-report.md
    - **用户级偏好** `~/.jarvis/`：仅存 agent 模型偏好（agent_models），首次启动自动迁移到项目 DB。**禁止**在此存 sessions/pipeline_runs 跨项目数据
    - **项目配置** `<project>/.claude/`：settings.json（env/hooks/permissions）、项目专属 agents/、commands/、skills/
    - **用户配置** `~/.claude/`：用户级 agents/、commands/、skills/（跨项目共享模板）
    - **Docs 产物** `<project>/docs/YYYY-MM-DD/`：日期隔离的流水线产物
    - **设计原则**：项目级 = 单项目多会话共享，不跨项目；用户级 = 跨项目一致的个人偏好（模型选择等）
23. **Agent Team 模块隔离（硬约束）** — Team 模式下每个成员独占模块/文件区域，禁止共享：
    - **前端拆分**：按组件/页面拆分，每个 Team 成员独占一组组件文件
    - **后端拆分**：按服务/路由模块拆分，每个 Team 成员独占一个服务模块
    - **共享区域**：公共工具、类型定义、配置文件由唯一责任人处理，其他成员只读
    - **冲突预防**：同一文件同一时间只有一个修改者，发现冲突立即标记 BLOCKED
24. **Agent Team + SubAgent 混合编排** — 根据 Gate 阶段选择最优调度策略：
    - **Team 模式（prefer_team）**：Gate C-impl(并行实现)、Gate C2(并行测试)、Gate D(并行审查) — 使用 `TeamCreate` + `Agent(team_name)` 并行调度多个 Agent
    - **SubAgent 模式（subagent_only）**：Gate A(探索)、Gate B1(架构评审)、Gate C(规划) — 使用 `Agent` 工具直接 spawn 子 Agent
    - **混合模式**：复杂 Gate 可先用 Team 并行执行主要任务，再用 SubAgent 处理辅助任务
    - **选择依据**：调用 `pipeline_guide` MCP 工具获取当前 Gate 的 `team_strategy` 和 `agent_mode` 建议
    - **Team 环境要求**：需要 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`（`jarvis init` 自动配置）

## 🚀 发布流程（每次变更完成后必须执行）

### 1. 更新版本号

编辑 `package.json`，按语义化版本递增 `version` 字段：
- **patch** (`x.y.Z`) — Bug 修复、格式修正、小优化
- **minor** (`x.Y.z`) — 新功能、新参数、向后兼容增强
- **major** (`X.y.z`) — 破坏性变更、架构重写

### 2. 维护文档与 .gitignore

**每次提交必须同步：**

- **AGENTS.md** — Agent 列表、技能列表、统计数字、关键约束是否与代码一致
- **README.md** — 版本号、特性列表、Web 面板页面、统计数据是否与代码一致
- **docs/README.md** — 流水线产物目录结构是否与当前一致
- **.gitignore** — 是否遗漏新增临时文件类型（截图/日志/数据库/快照等），`git status` 是否干净

### 3. 提交并打 Tag

**每次代码变更完成后必须打 Tag，不可攒批。提交信息禁止添加 `Co-Authored-By` 等机器签名尾注。**

```bash
git add <changed-files>
git commit -m "<type>: <简短描述>"
git tag -a v<version> -m "v<version> - <概要>"
```

### 4. 推送到 GitHub

```bash
git push origin main && git push origin v<version>
```

### 5. GitHub Actions 自动发布

统一工作流，按触发事件分工：

| 工作流 | 触发条件 | 职责 |
|--------|---------|------|
| `.github/workflows/ci.yml` | push/PR to main | Lint + Type-check + Test + Build |
| `.github/workflows/ci.yml` | Tag `v*` 推送 | 质量检查 → 生成 Changelog → 创建 GitHub Release → npm publish → 验证版本 |

推送 Tag 到 GitHub 后，CI 工作流自动执行发布全流程，无需手动 `npm publish`。

> 若 Release 失败，检查 GitHub Actions 日志。需要 `NPM_TOKEN` secret 配置在仓库 Settings → Secrets 中。

### 6. 验证（两项全部确认）

```bash
npm view jarvis-agent-factory version                    # 确认 npm 版本
git ls-remote --tags origin | grep "v<version>"          # 确认 GitHub tag
```

> 验证标准：npm 版本号与 GitHub Tag 必须一致。任一缺失立即补推。

## 技能体系

| 类别 | 技能 |
|------|------|
| **基础** | `behavioral-guidelines` `context-engineering` `using-agent-skills` |
| **需求** | `spec-driven-development` `idea-refine` |
| **规划** | `planning-and-task-breakdown` |
| **实现** | `source-driven-development` `incremental-implementation` `test-driven-development` `code-standards` `code-simplification` `frontend-design` `refactoring` |
| **框架** | `antd` `ant-design` |
| **质量** | `code-quality-gate` `code-review-and-quality` `verification-before-completion` |
| **测试** | `perf-testing` `test-data-factory` |
| **调试** | `debugging-and-error-recovery` `debugging-deep` |
| **浏览器** | `agent-browser` `browser-testing` `browser-use` |
| **安全** | `security-and-hardening` `security-testing` |
| **流程** | `shipping-and-launch` `git-workflow-and-versioning` `finishing-a-development-branch` |
| **文档** | `chinese-documentation` `documentation-and-adrs` `writing-skills` |
| **探索** | `find-docs` `find-skills` |
| **工具** | `mcp-builder` |

## 文档驱动体系

每个子智能体完成任务后必须产出相应文档：

### 实现类 Agent（-dev-expert / -api-expert / -logic-expert / -data-expert / -ui-expert / -state-expert / 平台全栈）
- 产出 `<TASK-ID>-completion.md` 自查报告：完成标准逐项核查、未覆盖边缘情况、已知技术债务
- 存放路径：`docs/<YYYY>-<MM>-<DD>/implementation/`

### 关键流程 Agent（planner / task-design / skill-assignment-expert / external-resource-expert）
- 产出对应阶段的正式文档即为完成文档（无需额外自查报告）

### 审查类 Agent
- 产出审查报告（含 findings + 严重度分级）即为完成文档
- 存放路径：`docs/<YYYY>-<MM>-<DD>/review/`

### 测试类 Agent
- 产出测试报告（通过/失败清单 + 覆盖率）即为完成文档
- 存放路径：`docs/<YYYY>-<MM>-<DD>/testing/`

### 特殊 Agent
- docs-engineer：产出 `.jarvis/docs-sync-report.md`（可选）
- browser-use-expert：产出探索报告到 `docs/<YYYY>-<MM>-<DD>/browser-use/report.md`

## 智能体体系（69 个 Agent，仅 Claude Code 平台）

### 实现类（22）
`frontend-dev-expert` `frontend-ui-expert` `frontend-state-expert` `backend-dev-expert` `backend-api-expert` `backend-logic-expert` `backend-data-expert` `taro-dev-expert` `taro-ui-expert` `taro-state-expert` `android-dev-expert` `android-ui-expert` `android-state-expert` `ios-dev-expert` `ios-ui-expert` `ios-state-expert` `react-native-dev-expert` `react-native-ui-expert` `react-native-state-expert` `flutter-dev-expert` `flutter-ui-expert` `flutter-state-expert`

### 测试类（16）
`frontend-test-expert` `backend-test-expert` `android-test-expert` `ios-test-expert` `flutter-test-expert` `taro-test-expert` `expo-test-expert` `react-native-test-expert` `browser-test-expert` `browser-use-expert` `e2e-test-expert` `perf-test-expert` `api-test-expert` `test-doc-writer` `test-executor` `fix-retest`

### 规划/任务（4）
`task-design` `planner` `skill-assignment-expert` `remediation-planner`

### 审查类（16）
`frontend-review-expert` `backend-review-expert` `android-review-expert` `ios-review-expert` `flutter-review-expert` `taro-review-expert` `expo-review-expert` `react-native-review-expert` `diff-review-expert` `project-review-expert` `perf-review-expert` `security-review-expert` `qa-review-expert` `change-review-expert` `review-only` `review-fix-optimize`

### 架构/专家（4）
`algorithm-expert` `frontend-architect` `backend-architect` `database-architect`

### 探索/支撑（7）
`code-explore-expert` `external-resource-expert` `api-contract-expert` `docs-engineer` `infra-deploy-expert` `remediation-expert` `docs-research-expert`

### Claude Code 命令入口（39）
`/jarvis` `/auto` `/publish` `/sync` `/frontend` `/backend` `/android` `/ios` `/flutter` `/expo` `/taro` `/react-native` `/review` `/review-fix` `/browser-test` `/bug-fix` `/frontend-architect` `/backend-architect` `/algorithm-expert` `/task-bdd` `/task-ddd` `/task-tdd` `/browser-explore` `/test-unit` `/test-integration` `/test-e2e` `/test-perf` `/test-security` `/refactor` `/hotfix` `/migrate` `/evaluate` `/debug` `/research` `/release` `/ask` `/simplify` `/trace` `/improve`
