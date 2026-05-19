# Changelog

All notable changes to the Jarvis Agent Factory project.

Note: This project follows [Semantic Versioning](https://semver.org/).

## [4.3.2] - 2026-05-19

### Fixed
- AGENTS.md/README.md 版本号同步 v4.3.0→v4.3.1，命令统计 39→40
- expo.md 5 处 react-native-* Agent 引用更正为 expo-* Agent（Gate C-impl + Gate D）
- 5 个审查 Agent 补入 GATE_AGENT_GUIDE Gate D（change-review-expert/diff-review-expert/project-review-expert/review-fix-optimize/review-only）

## [4.3.1] - 2026-05-19

### Changed
- 构建脚本优化：每次构建前自动 clean + 移除 dist/tests/ 测试产物（npm 包文件数 342→276，解压大小 5.2MB→4.7MB）
- 新增 `clean` / `prebuild` 脚本，确保幂等构建
- `.npmignore` 完善：排除 `*.js.map` / `*.d.ts.map` / `dist/tests/`

## [4.3.0] - 2026-05-19

### Added
- `/skill-flow` 指令：会话流水线流程导出为可复用 Skill 模板，支持 export/save/list/apply 4个子命令
- `session_export` MCP 工具：导出当前会话的流水线流程数据（Gate序列、Agent spawn、产物、时间线）
- `flow_skill_save` MCP 工具：将导出的流程数据保存为 flow_skills 表记录
- `flow_skill_list` MCP 工具：列出所有已保存的流程 Skill 模板
- `flow_skills` 数据库表：存储导出流程模板（名称/描述/流水线类型/Gate序列/Agent spawn/Skill加载）
- `saveFlowSkill` / `getFlowSkills` / `getFlowSkill` / `deleteFlowSkill` / `getFlowSkillCount` CRUD 函数
- 指令总数 39→40

### Changed
- README.md / AGENTS.md / commands-reference.html 同步更新至 v4.3.0

## [4.2.2] - 2026-05-19

### Changed
- 重写 `commands-reference.html` 为完整的项目介绍页面（1125行/77KB）：项目概览、核心概念、39条指令详细流程（含每条的 Gate 步骤说明和关键 Agent）、71个智能体6类目录、流水线架构、技能体系、16场景使用推荐、快速开始
- README.md 更新 Web 面板介绍页描述和命令流程图链接文字

## [4.2.1] - 2026-05-19

### Added
- MCP Core API 集成测试 15 个（session_join/gate_check/gate_enforce/advance_gate/pipeline_init/pipeline_guide），覆盖 Gate 操作权限、FSM 状态机、pipeline 生命周期
- 3 个缺失 Expo Agent 模板（expo-dev-expert/ui-expert/state-expert），修复 Gate C-impl Expo 平台 spawn 失败

### Changed
- 生产就绪度加固：`useUnknownInCatchVariables: true` 启用 TypeScript 严格 catch 检查，db.ts 12 处静默迁移 catch 添加错误日志
- SSE broadcast 添加 `_broadcasting` 并发锁，防止多事件驱动广播时的竞态条件
- Gate C2 MAX_RETRY 2→5（匹配复杂 Bug 诊断需要更多轮次）
- `DbConn` 类型别名引入 db.ts，显式标注数据库连接类型
- 移除 `.git-rewrite/` 历史遗留目录（100+ 重复文件）

### Fixed
- bug-fix.md / review-fix.md 中 `Skill("agent-browser")` 失效引用修复
- publish.md / sync.md 补齐引擎会话注册，sync.md 添加完整红线表格
- 8 个平台命令补齐 `## 步骤 0` 标题规范
- backend.md / frontend.md 增强引擎集成文档（pipeline_guide/gate_check/advance_gate）
- gate_jump 错误消息覆盖全部 allow_jump 管线（lite/ask/improve）
- pipeline_init 添加 pipeline_type 白名单校验
- backend 流水线 C2 入口条件文本修正
- agent-registry.ts 修复重复 test-expert 键，Expo Agent 归入移动端分类
- 5 个测试文件 lint 警告清零
- Agent 总数 68→71（新增 expo-dev/expo-ui/expo-state）

## [4.2.0] - 2026-05-19

### Added
- 15个孤立技能接入对应命令：debugging-deep→/debug, frontend-design→/frontend, code-review-and-quality→/review+/review-fix, documentation-and-adrs→/research+/sync, context-engineering/incremental-implementation/verification→/jarvis+/auto, perf-testing→/test-perf, security-testing→/test-security, test-data-factory→/test-unit+/test-integration, browser-use→/browser-explore, chinese-documentation→/sync
- GATE_AGENT_GUIDE 补全 34 个平台 Agent：Gate C-impl 新增 14 个平台开发 Agent，Gate C2 新增 6 个平台测试 Agent，Gate D 新增 6 个平台审查 Agent（覆盖 android/ios/flutter/taro/react-native/expo）

### Changed
- `/ask` K2 新增评分与权重框架：5 维度需求评分矩阵(BV/EF/RS/UI/DC) + 方案对比矩阵 + 权重自适应（参考 OMC deep-interview/trace/self-improve/ralplan 数学化评分模式）
- 生产就绪度改进：`useUnknownInCatchVariables: true` 启用 TypeScript 严格 catch 类型检查，db.ts 12 处静默迁移 catch 添加错误日志，SSE broadcast 添加并发锁防止竞态，移除 `.git-rewrite/` 历史遗留目录（100+ 重复文件），所有 catch(e.message)→String(e) 适配 unknown 类型

### Fixes
- 3 个缺失 Expo Agent 模板（expo-dev-expert/ui-expert/state-expert），修复 Gate C-impl Expo 平台 spawn 失败
- bug-fix.md / review-fix.md 中 `Skill("agent-browser")` 失效引用修复
- publish.md / sync.md 补齐引擎会话注册，sync.md 添加完整红线表格
- 8 个平台命令补齐 `## 步骤 0` 标题规范，backend.md / frontend.md 增强引擎集成文档
- Gate C2 MAX_RETRY 2→5（匹配 OMC 5 轮诊断实践），gate_jump 错误消息覆盖全部 allow_jump 管线
- pipeline_init 添加 pipeline_type 白名单校验，backend 流水线 C2 入口条件文本修正
- agent-registry.ts 修复重复 test-expert 键，Expo Agent 归入移动端分类
- Agent 总数更新：68→71（新增 expo-dev/expo-ui/expo-state）

## [4.1.1] - 2026-05-19

### Added
- `/ask` K2 新增评分与权重框架（OMC数学化模式）：5维度需求评分矩阵(BV/EF/RS/UI/DC)+方案对比矩阵+权重自适应
- Agent-registry 新增"规划"分类（planner/task-design/skill-assignment-expert/remediation-planner）

### Changed
- 移除死代理 `fix-retest.md`（0引用），Agent总数 69→68
- AGENTS.md 测试类 16→15，智能体体系 69→68
- README.md `fix-retest`→`remediation-expert` 引用更新

### Fixed
- `browser-test.md` Skill() 语法修复（反引号文本→正确函数调用）
- `review.md` / `review-fix.md` allowed-tools 补全 `Skill`
- `remediation-planner` 添加到 GATE_AGENT_GUIDE Gate C-impl
- `inferPipelineType()` ESLint 转义字符修复

## [4.1.0] - 2026-05-19

### Changed
- `/jarvis-lite` 移除，替换为 `/auto`：智能自动路由编排——自动检测任务类型→路由最优流水线→跳过无关Gate→按复杂度分配Team/Subagent
- `/auto` 支持12种任务类型自动路由（新功能→full, Bug修复→full/C, 重构→refactor, 紧急→hotfix等）
- `/auto` 按复杂度3级Agent调度：小(<3文件)→subagent, 中(3-10)→并行subagent, 大(>10)→Team

### Added
- `/simplify`、`/research`、`/auto` 补全"先确认需求再写文档"硬约束（前置确认步骤+红线）
- `/simplify` S0 新增 AskUserQuestion 确认目标范围
- `/research` RS0 新增 AskUserQuestion 确认研究课题

### Fixed
- `inferPipelineType()` 路由修复：精确匹配优先于通用词匹配，修复 ask→frontend, trace→debug, auto→simplify 误判
- Web 面板 matchPipelineType 支持 auto 分类
- 指令总数保持39条（/auto 替换 /jarvis-lite）

## [4.0.0] - 2026-05-19

### Breaking
- `/explore` 指令移除，替换为 `/ask`（K0需求摄入→K1信息收集→K2分析综合→K3交付产出，4模式自适应）
- 旧 X0-X3 Gate 全部移除，替换为 K0-K3 Gate
- `explore` 管道类型移除，Web 面板分类从 `testing` 改为 `requirements`

### Added
- 新增 `/simplify` 指令：S0代码分析→S1简化执行→S2回归验证→S3报告产出，对标 OMC simplify+ai-slop-cleaner
- 新增 `/trace` 指令：T0问题框架→T1假设生成→T2证据收集→T3因果分析→T4解决方案，假设驱动因果追踪
- 新增 `/improve` 指令：IM0目标定义→IM1研究分析→IM2计划制定→IM3执行验证→IM4评估迭代，自主迭代改进循环
- 3条新流水线：simplify/trace/improve，流水线总数 12→15，指令总数 36→39

### Changed
- `/ask` 支持4种工作模式：Interview(模糊澄清)/Direct(快速分析)/Consensus(多角色审查)/Review(流程优化)
- `/ask` 文档驱动强化：每个 Gate 每个模式有明确文档产出，含异常处理表+模式转换规则
- `/ask` Team/Subagent 调度冲突修复：Critic 角色由编排者担任，Architect 由 Agent spawn，TeamCreate 有 subagent 回退
- 引擎 Agent 指引更新：K2 团队策略和规则与实际 Consensus 流程一致
- Web 面板路由：`/ask/` 会话分类为 `requirements`，新增 simplify/trace/improve 分类

### Fixed
- `inferPipelineType()` 补全 simplify/trace/improve/ask/research/release 管道类型
- 测试断言更新：GATE_OPERATIONS 48→62, 命令数 36→39

### Changed
- 深度优化16条指令工程化质量：12条平台/架构/审查指令补全红线约束章节
- jarvis.md / jarvis-lite.md 核心指令补全红线约束
- sync.md 版本号同步更新（3.47.3→3.53.0）
- 所有红线内容针对各自领域定制（前端/后端/移动端/跨端/架构/审查）

## [3.53.0] - 2026-05-19

### Added
- 新增深度研究指令 /research：RS0课题定义->RS1信息收集->RS2深度分析->RS3假设验证->RS4研究报告，5Gate深度研究流程
- 新增发布指令 /release：RL0环境检测->RL1质量门->RL2版本递增->RL3发布执行->RL4发布验证，5Gate简化发布流程
- 新增需求探索指令 /explore：X0问题澄清->X1场景挖掘->X2需求收敛->X3规格产出，4Gate苏格拉底式需求澄清流程
- 新增 research、release、explore 三条流水线定义（共12条流水线）

### Changed
- 更新 README.md：命令数量33->36，流水线9->12，补全缺失的命令流程图入口（/publish、/sync、/browser-explore、/task-bdd、/task-ddd、/task-tdd）
- 更新 AGENTS.md：命令入口31->36，同步流水线统计
- 更新 docs/README.md：产物目录结构补充research等新目录
- /publish 指令增加与 /release 的区别说明

## [3.52.2] - 2026-05-19

### Changed
- **npm 包瘦身**：`.npmignore` 排除 `dist/tests/`（601KB）、`*.js.map`（~500文件）、`web/` 源码、根目录截图，包体积显著减小
- Web 构建配置优化：esbuild minify + 清理冗余配置

## [3.52.1] - 2026-05-19

### Fixed
- **产物文档隔离**：`findSessionGateArtifacts` 有 runId 时仅查 artifacts 表，移除日期目录回退（杜绝跨 run 文档污染）

## [3.52.0] - 2026-05-19

### Added
- **会话自动归档**：`session_join` 检测到活跃 run 时自动归档旧任务，为新任务创建全新 run
- **历史详情页**：`#/archive/:runId` 展示任务的 Gate 时间线 + 产物文档列表 + 事件日志
- **Run 详情 API**：`GET /api/pipeline-runs/:id/detail` 返回完整 run 信息
- **可点击归档列表**：归档页面每条记录可点击进入详情页

### Changed
- session_join: 旧活跃 run 自动设置 archived=1 + status=completed
- 归档条目悬停效果 + 面包屑导航

## [3.51.2] - 2026-05-19

### Fixed
- **Hook 僵尸会话防护**：`pickSession` 增加心跳过期检测（10分钟），僵尸 session 不再触发 gate 执行
- 无显式 `--session` 且无最近活跃会话 → hook 静默退出，不阻断工具调用
- 向后兼容：旧版引擎/测试 Mock 缺失 `heartbeat` 字段时回退到旧行为

## [3.51.1] - 2026-05-19

### Changed
- **Agent Team 策略扩展**：R3（重构执行）和 R4（重构测试对比）升级为 `prefer_team`，5 个 Gate 覆盖 Team 并行模式
- Team 模式覆盖：C-impl(实现) · C2(测试) · D(审查) · R3(重构执行) · R4(重构验证)

## [3.51.0] - 2026-05-19

### Added
- **项目记忆系统**：`jarvis init` 自动创建 `.jarvis/memory/`（notes.md/decisions.md/context.md），跨会话持久化
- **会话事件日志**：`session_events` 表记录 session_join/leave/gate_advance 等生命周期事件
- **会话恢复数据**：`pipeline_runs.resume_data` 列 + `sessions.metadata` 列，OMC 风格状态持久化

### Changed
- OMC 架构精华集成：状态管理、事件日志、跨会话记忆、项目级存储分层
- install.ts 新增 `installMemory()` 函数

## [3.50.0] - 2026-05-19

### Added
- **数据看板首页**：`#/` 路由新增 Dashboard 数据统计页（会话数/运行记录/流水线分布/Gate 分布/Agent 配置统计）
- **Team 模块隔离规则**：Agent Team 模式下每个成员独占模块/文件区域，禁止共享（前端按组件、后端按服务拆分）
- **`pipeline_guide` 增强**：返回 `team_rules` 字段，按 Gate 提供团队隔离指引
- **`/api/dashboard-stats`**：REST API 端点返回聚合统计数据

### Changed
- Web 面板首页从流水线看板改为数据看板（原看板移至 `#/dashboard`）
- AGENTS.md 新增第 23 条约束（Agent Team 模块隔离硬约束）

## [3.49.1] - 2026-05-19

### Changed
- **文档同步**：README_EN.md 版本 badge v3.48.2→v3.49.0，README/AGENTS 统计数据核对一致
- 移除 remove.ts 未使用的 `dirname` 导入（lint 警告清零）

## [3.49.0] - 2026-05-19

### Added
- **细粒度 remove 命令**：`jarvis remove` 仅删除 jarvis 安装的文件（基于 hash 记录），保护用户自定义 agents/skills/commands
- **Dry-run 模式**：`jarvis remove --dry-run` 预览将要删除的内容
- **Tracked files 列表**：`jarvis remove --list` 列出 jarvis 跟踪的所有文件
- **细粒度移除项**：settings.json hooks（仅 `_jarvisManagedHooks`）、env（仅 jarvis 添加的 key）、MCP servers（仅 jarvis-engine + playwright）

### Changed
- `jarvis remove` 从粗粒度全目录删除重构为 hash 感知的细粒度移除
- 帮助文本更新：新增 remove 相关示例

## [3.48.3] - 2026-05-19

### Changed
- **README.md 更新**：版本 v3.48.2、核心特性表新增 Agent Team/项目级存储隔离/智能 env 合并、统计表更新（33 条指令）、引擎能力矩阵新增 Team/SubAgent 策略
- **README_EN.md 同步**：版本号更新至 v3.48.2，指令数更新至 33

## [3.48.2] - 2026-05-19

### Fixed
- **Command frontmatter 补全**：4 条指令（jarvis/task-bdd/task-ddd/task-tdd）补充 `argument-hint`，全部 33 条指令 frontmatter 完整
- **Ultragoal 工程规范**：全部 4 项目标验证通过——指令完整性、Pipeline 流程、质量门禁、存储分层

## [3.48.1] - 2026-05-19

### Fixed
- **存储分层修正**：全局迁移不再复制 sessions/pipeline_runs 到项目 DB。项目级数据 = 单项目跨会话记忆，不跨项目共享。仅迁移 agent 模型偏好（用户级配置）
- **AGENTS.md**：更新存储架构文档，明确项目级记忆 vs 用户级偏好的设计边界

## [3.48.0] - 2026-05-19

### Added
- **Agent Team 支持**：CLI `jarvis init` 自动配置 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`，启用 Claude Code 原生 Team 功能
- **Team + SubAgent 混合编排**：Gate 阶段智能选择调度策略。Gate C-impl/C2/D 推荐 Team 并行，Gate A/B1/C 使用 SubAgent
- **`pipeline_guide` 增强**：返回 `team_strategy`（prefer_team / subagent_only）和 `agent_mode` 建议，编排者按 Gate 自动选择最优调度

### Changed
- **项目级存储隔离**：引擎数据库从 `~/.jarvis/engine.db` 迁移至 `<project>/.jarvis/engine.db`，每个项目拥有独立数据库
- **PID 文件项目级隔离**：`engine.pid` 从全局 `~/.jarvis/` 迁移至 `<project>/.jarvis/`
- **首次启动迁移**：从全局 DB 自动迁移 agent 配置 + sessions + pipeline_runs 到项目 DB，旧数据保留不删除
- **`jarvis doctor`**：PID 检查改为项目级路径，不再检查全局 `~/.jarvis/`
- **模板更新**：`settings.json` 模板新增 `env` 配置块，安装时智能合并（保护用户自定义值）

### Fixed
- `jarvis web` 命令修复：支持指定项目目录参数，不再硬编码 `projectRoot: '.'`
- `guardian.ts` DRY 违规：`writePidFile` 改为调用 `getPidFile()` 统一路径解析

## [3.45.1] - 2026-05-13

### Added
- **Web 静默更新**：面板检测到新版本时静默刷新资源，无需手动重载
- **CLI 智能合并**：`jarvis upgrade` 增强智能合并，MCP 配置增量合并而非覆盖
- **模板补齐**：新增 10 个命令模板安装支持（test-* / refactor / hotfix / migrate / evaluate / debug）

### Fixed
- **归档路径修复**：`archive` 操作路径解析异常修复，归档恢复功能稳定
- **MCP 安装覆盖**：`jarvis init` 智能合并用户自定义 MCP 配置，不丢失已有服务

### Changed
- .mcp.json 安装策略从全量覆盖改为智能合并（保留用户自定义 MCP 服务）

## [3.45.0] - 2026-05-13

### Added
- **10 个新指令**（命令体系从 16 扩充至 26）：
  - `/test-unit` — 单元测试生成与执行（TDD Red/Green/Refactor + 覆盖率门禁）
  - `/test-integration` — 集成测试 / API 测试（基于 OpenAPI 契约）
  - `/test-e2e` — 端到端测试（Playwright/Cypress 用户故事驱动）
  - `/test-perf` — 性能测试（k6/Artillery 负载测试 + 基线对比）
  - `/test-security` — 安全测试（OWASP ZAP DAST 扫描）
  - `/refactor` — 重构安全网（R1→R5 五门架构，行为漂移检测）
  - `/hotfix` — 紧急热修复（H0→H3 四门紧急流程）
  - `/migrate` — 框架迁移（M1→M4 四门迁移流程）
  - `/evaluate` — 技术评估（E0→E3 四门评估流程）
  - `/debug` — 调试诊断（D0→D4 五门诊断流程）
- **5 条新流水线类型**：`refactor` / `hotfix` / `migrate` / `evaluate` / `debug`，各有独立 Gate 序列
- **智能 MCP 合并安装**：`jarvis upgrade` 和 `jarvis init` 自动合并用户现有 MCP 配置，不再全量覆盖
- **命令流程图**：为 10 个新指令新增 `docs/flows/*.md` 流程图文件

### Changed
- 命令体系从 16 个扩展至 26 个，覆盖测试、重构、热修复、迁移、评估、调试全生命周期
- AGENTS.md / README.md / README_EN.md 同步更新至 v3.45.1

## [3.43.0] - 2026-05-12

### Removed
- **X6 画布组件**：移除 FlowChart + AgentGraph SVG 画布，中间区域改为纯文档阅读器
- **Token 统计**：删除 TokenDashboard 组件、成本估算函数、agentUsage API
- **死代码清理**：移除 useAgentData hook、x6-theme 常量、及相关测试文件

### Added
- **产物文档列表**：Dashboard 中间区域展示当前 Gate 的文档卡片列表
- **Agent 事件去重**：`agent_event` MCP 工具防止 Hook 重复触发导致重复统计
- **Gate 耗时修复**：`pipeline_init` 和 REST API 推进时正确初始化 Gate 进入时间
- **归档操作测试**：16 个新测试覆盖归档/恢复/删除全生命周期
- **多平台适配**：`PLATFORM_FEATURES` 正式化，支持 claude/opencode/codex 特性查询

### Changed
- Dashboard 中间区域从双画布分屏改为文档阅读器 + Markdown 预览
- 操作指南弹窗内容更新，反映新布局
- CLAUDE.md/AGENTS.md/README.md 同步更新至 3.43.0

### Fixed
- **会话文档隔离**：MCP 工具改用 `findSessionGateArtifacts` 按 session 过滤
- **跨会话文档泄露**：pipeline_status/gate_enforce/advance_gate/report_status 全线修复
- 归档列表删除/恢复操作添加错误处理分支

## [3.27.0] - 2026-05-09

### Added
- **会话排序**：按最新 Run 创建时间倒序排列，无 Run 会话排在末尾
- **门禁文档按会话过滤**：Gate 卡片仅展示当前会话的产物文档
- **文档抽屉**：点击文档文件名右侧滑出抽屉，Markdown 实时渲染
- **文档读取 API**：`GET /api/docs/:filepath` 安全读取 docs 目录文件
- **Agent 自动命名**：`pipeline_init` 自动设置任务名称
- **⋮ 菜单全覆盖**：所有会话均可点击更多菜单，删除始终红色可用
- **恢复按钮迁移**：从侧边栏移至看板顶部操作栏

### Changed
- 状态指示点从标题右侧移到左侧
- 指令标签去掉 "/" 前缀，适配多平台
- 会话名称回退格式优化（平台名 · 类型 · 时间）

### Fixed
- 会话列表排序缺失问题（新增 run 时间排序）
- 门禁文档全局污染问题（按 session 过滤）

## [3.26.0] - 2026-05-08

### Added
- **会话列表卡片化布局**：侧边栏会话项从单行水平排列改为 2 行垂直紧凑布局（标题+状态在上，指令+Gate+操作在下）
- **⋮ 菜单始终可见**：每个会话项右侧始终显示更多操作按钮，无活跃运行记录时置灰禁用
- **键盘可访问性增强**：会话列表项支持 Tab 键聚焦和 Enter/Space 键选择，恢复按钮和 ⋮ 按钮均为标准 `<button>` 元素
- **开发环境 MCP 配置**：新增 `.mcp.dev.json`，支持从本地工作区启动引擎

### Changed
- 选中态使用 indigo 左侧边框 + bg-indigo-50 背景，悬停态使用 hover:bg-slate-50
- ⋮ 按钮从 hover 显示改为始终可见，移除 `.session-actions` CSS 规则

### Fixed
- 恢复会话按钮由 `<i>` 改为 `<button>` 元素，支持键盘和屏幕阅读器
- 禁用态 ⋮ 按钮对比度提升至 text-slate-400
- 所有交互按钮添加 focus-visible 聚焦指示器

## [2.0.0] - 2026-05-06

### Added
- **npm CLI**：`jarvis-agent-factory` 一键安装工具（`jarvis init / install / doctor / list`）
  - 智能覆盖确认（`--yes` 跳过交互）
  - 自动跳过敏感文件（`settings.local.json`）
- `.npmignore` 安全加固：排空个人配置与 Token

### Changed
- **版本跃迁至 v2.0.0**：npm CLI 发布标志 API 化成熟度里程碑

## [1.5.13] - 2026-05-06

### Changed
- **浏览器工具链迁移**：Claude in Chrome MCP / browser-use → agent-browser CLI（Vercel Labs, 80+ 命令）
  - 不依赖 Anthropic 订阅，兼容第三方 API 网关
  - 快照+引用机制（`@e1, @e2`），token 高效
  - Claude Code: Preview MCP + agent-browser 双轨；OpenCode/Codex: agent-browser 纯 Bash
- **OpenCode 平台对齐**：移除全部 15 个斜杠命令，仅保留智能体切换入口；同步全部 27 技能到 Claude 优化版
- **Codex 平台对齐**：新增 13 个主流程技能（skill-triggered form），同步 4 个已有技能到 Claude 优化版

### Added
- `agent-browser` 技能（三平台，替代 browser-use）
- Codex 主流程技能 13 个：jarvis / frontend / backend / android / ios / flutter / expo / taro / algorithm-expert / backend-architect / frontend-architect / browser-test / bug-fix

### Fixed
- 7 个审查类 Agent 缺少 Skill 工具：diff-code-reviewer / project-audit-reviewer / remediation-planner / post-change-reviewer / performance-audit-reviewer / remediation-worker / repo-explorer
- browser-test-worker 补充 preview_logs + preview_stop
- bug-fix 命令补充 browser-testing 技能加载
- using-agent-skills 技能表 21→26 条目
- 移除全部 Claude in Chrome MCP 引用（0 残留）
- 移除全部 browser-use 引用（0 残留）

### Removed
- browser-use 技能（三平台，被 agent-browser 替代）
- OpenCode 15 个斜杠命令（仅保留智能体切换）

## [1.5.2] - 2026-05-05

### Changed
- **Codex 审查模式重构**：从 config.toml 内联指令改为独立技能（`.codex/skills/review-only/` + `.codex/skills/review-fix-optimize/`），与 Claude 指令模式、OpenCode 智能体切换模式对齐
- **OpenCode 补齐 8 个斜杠命令**：镜像 `.claude/commands/`，支持 `/jarvis`、`/review`、`/review-fix`、`/browser-test`、`/bug-fix`、`/algorithm-expert`、`/backend-architect`、`/frontend-architect`

### Added
- 根目录 `CLAUDE.md`：Claude Code 项目级入口文件
- 根目录 `AGENTS.md`：所有智能体首读项目约束文件
- `docs/` 流水线产物目录：requirements / plans / implementation / testing / review

## [1.5.1] - 2026-05-04

### Added
- 项目正式命名：**Jarvis Agent Factory（贾维斯智能体工厂）**
- README_EN.md：完整英文版文档
- 致谢章节：browser-use、superpowers、superpowers-zh
- writing-skills 技能：元技能——编写技能的 TDD 方法论
- mcp-builder 技能：MCP 服务器构建规范
- browser-testing 技能：从 agent 提示词中抽取 ~80 行测试方法论

### Changed
- git-workflow 技能升级为四平台支持：Gitee / Coding.net / 极狐 GitLab / GitHub
- finishing-a-development-branch 技能重构为 5 步清理流程
- browser-test-worker 从 185→100 行，方法论迁移至 browser-testing 技能
- 8 个斜杠命令优化约 36%，添加不可绕过标记
- 三平台技能全量同步（.claude 25 / .opencode 25 / .codex 25）
- README 技能数 22→25，目录结构同步修正

## [1.5.0] - 2026-05-04

### Added
- Gate C1 代码质量门：Lint + Type-check + Build + Deps Audit 四项强制检查
- Gate E 安全审计门：发布前 spawn security-auditor 执行完整安全扫描
- browser-test-worker 智能体：浏览器自动化测试（browser-use CLI）
- /browser-test 命令：测试闭环（写用例→执行→截图→修复→重测）
- /bug-fix 命令：Bug 修复闭环（复现→定位→修复→浏览器验证）
- 5 闭环体系：开发闭环/测试闭环/Bug 闭环/审查闭环/安全闭环
- 故障恢复与韧性框架：重试策略/部分失败/回滚中止/检查点/冲突解决
- 依赖安全扫描：npm audit / cargo audit / govulncheck 集成
- 注释语言约定：全平台智能体统一添加
- GitHub PR/Issue 模板 + Release 工作流
- .gitattributes：统一 LF 行尾

### Changed
- 流水线从 6 阶段扩展为 9 阶段（8 个 Gate）
- 斜杠命令从 3 个扩展到 8 个
- 智能体从 42 扩展到 47（.claude）/ 48（.opencode）/ 45（.codex）
- jarvis 命令精简 Agent 调度表（按类别速查）
- /review-fix 集成 browser-use 浏览器复现
- README 全面重写：并行/串行规则表、闭环体系、Gate 全图

## [1.4.0] - 2026-05-01

### Added
- 移动端 UI/State 拆分（10 个新专项 worker）
- 4 个移动端智能体 + 全平台模型与思考等级优化
- 4 个专项智能体：移动端/性能/文档/数据库

## [1.3.0] - 2026-04-28

### Added
- 三平台新增 Gate C2 测试验证门
- 完整故障恢复与韧性框架（5 维度）
- 3 新 Agent + 一致性对齐

### Fixed
- 审计后全平台修复（Gate E、agent 同步、一致性）

## [1.2.0] - 2026-04-25

### Added
- 架构师 slash 命令（/algorithm-expert, /frontend-architect, /backend-architect）
- Gate C 多智能体并行 spawn 修复（批量并发）
- 算法专家、前端架构师、后端架构师三个智能体

## [1.1.1] - 2026-04-22

### Fixed
- .opencode 平台 agent 思考等级修正
- 三平台技能匹配补齐

### Changed
- README 重写：优化结构、详细使用说明

## [1.1.0] - 2026-04-20

### Added
- OpenCode/Codex 平台支持
- 三平台 47 智能体体系
- 20 个方法论技能

## [1.0.0] - 2026-04-18

### Added
- 初始发布
- Claude Code 平台 42 智能体
- /jarvis 编排命令
- 需求→任务→计划→实现→评审 流水线
- 5 个闸门（Gate A-E）
