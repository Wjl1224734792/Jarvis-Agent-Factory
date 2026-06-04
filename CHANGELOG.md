# Changelog

All notable changes to the Jarvis Agent Factory project.

Note: This project follows [Semantic Versioning](https://semver.org/).

## v4.7.88 (2026-06-04)

### 修复
- **Gate C1.5 spawn 权限修复**: Hook 永远用 `spawn_impl` 检查，但 Gate C1.5 以前 deny 了 `spawn_impl`（只 allow `spawn_test`）。导致 17 条命令模板在 C1.5 阶段 spawn browser-test-expert/frontend-debug-expert 全部被阻断。修复：`spawn_impl` 移入 allow、移除 deny
- **K0/T0/IM0 探索权限补齐**: 三个第一 Gate 以前 deny `spawn_impl`，命令模板写的 spawn 探索 Agent 全被 Hook 拦截。修复：全部 allow `spawn_impl` 并填入 can_spawn 清单（K0: 3 个, T0: 1 个, IM0: 2 个）
- **gates.test.ts 同步**: C1.5 断言从 `deny spawn_impl` 改为 `allow spawn_impl`

## v4.7.87 (2026-06-04)

### 变更
- **`/ask` K0 流程重构**: 探索从盲扫改为靶向。增加 session_context + priority_context 加载步骤，模式确定后基于关键主题词限定探索范围，K0 调度表更新为允许并行 subagent 探索
- **36 个命令补全 WebFetch/WebSearch 工具**: ask/auto/jarvis/frontend/backend + 9 框架命令 + research/improve/evaluate/trace/refactor/migrate/simplify/debug/hotfix/bug-fix/browser/consult/deepinit/release/publish/verify + 4 测试命令。WebSearch/WebFetch 作为基础探索能力不再受限于特定命令
- **探索 Agent 数量上限统一**: 全部 20 个命令 46 处探索步骤统一标注"最多 10 个"，调度表 × N 标记同步限制
- **23 个命令补全 session_context/priority_context**: 所有第一 Gate 需探索的命令补齐上下文加载能力

### 文档
- **DeepInit 全量刷新**: 7 个 AGENTS.md 基于 6 并行 Agent 深度源码分析重新生成（根/ src/ src/cli/ src/engine/ src/engine/tools/ tests/ web/）
- **docs/flows/ask.md**: 4 个模式流程图更新——加入会话上下文加载 + 靶向探索步骤

## v4.7.86 (2026-06-03)

### 变更
- **Gate C1.5 视觉验证 agent 主备角色交换**: `frontend-debug-expert`（Chrome DevTools MCP）作为主力——支持性能追踪/渲染分析/网络诊断/JS 调试；`browser-test-expert`（Playwright MCP）作为兜底——CDP 不可用时降级使用。涉及 `/auto` `/jarvis` `/frontend` `/react` `/vue` 5 条命令模板
- **C1.5 前端任务不再询问**: `/auto` 和 `/jarvis` 中 C1.5 由"条件性（AI 判断→询问用户）"改为"前端任务强制执行不询问"

### 修复
- **README 移除 `/mobile` 废弃行**: 命令已在 v4.7.80 移除，README 残留死链已清理
- **guide.html 补全**: 新增 `/deepinit` + `/cleanup` 卡片；统计数字 44→43 Commands
- **3 个缺失流程文档**: `docs/flows/deepinit.md` `docs/flows/repowiki.md` `docs/flows/verify.md`

## v4.7.85 (2026-06-03)

### 修复
- **Gate C1.5 browser-test-expert 集成**: 引擎层 `can_spawn` 从空数组扩展为 `['browser-test-expert', 'frontend-debug-expert']`，`operations.allow` 新增 `spawn_test`，Gate C1.5 现可 spawn browser-test-expert 执行视觉验证（截图+多视口+样式检查）

### 文档
- `/auto`、`/jarvis`、`/frontend` 三条命令的 Gate C1.5 段落全面重写：加入 browser-test-expert spawn 流程、触发条件、验证标准、失败回退
- 10 个流程文档 (docs/flows/) C1.5 节点加入 browser-test-expert 引用
- jarvis-reference SKILL.md：C1.5 操作列表补全 + Agent 编排策略表新增 C1.5 行
- Web 面板 guide.html + pipeline.html：C1.5 描述和操作列表同步
- AGENTS.md 全面刷新（根目录 + 5 个核心模块）

## v4.7.81 (2026-06-02)

### 变更
- **Plan Mode 全量移除**: 6个命令模板+2个Agent模板+引擎 pipeline_guide+concurrency-policy技能中移除 EnterPlanMode/ExitPlanMode，Gate A直接产出需求文档
- **全指令探索阶段补齐**: 44个命令模板全部添加并行信息收集阶段（code-explore-expert/external-resource-expert/docs-research-expert），收集→规划→实现→验证闭环
- **安全加固**: install.ts 新增18个Bash危险模式匹配器（rm/mv/curl|bash/node -e/npm install/git reset/docker/ssh等），总计51个
- **Gate C 全自动化**: planner自动读取Gate B任务文档+skill-assignment-expert并行推荐技能，无需用户确认

### 修复
- Gate R加入auto流水线gate列表（13门），/review-only gate_jump不再失败
- R1 gate新增spawn_impl+code-explore-expert，重构边界定义前先探索代码
- refactor/hotfix/migrate/evaluate/debug/simplify/improve命令全部添加探索Agent阶段

### 文档
- 全量文档同步：README/AGENTS/CHANGELOG/.jarvis/docs/flows/Web Guide
- 流水线类型统计 15→17，命令统计 44→43

## v4.7.80 (2026-06-02)

### 变更
- **Gate/Hook/Agent 权限全系统对齐**: Hook 路由表补全 22 个缺失命令条目, auto.md bug-fix 路由 Gate C→C2 修正
- **审查流程拆分**: 只读审查→Gate R (auto 流水线第 13 门), 审查修复→Gate D, review-only→Gate R 闭环
- **Gate C 文档澄清**: planner 读取 Gate B 的 DDD/BDD/TDD 任务文档自动生成执行计划, skill-assignment-expert 并行分配 required_skills, 全程无人确认

### 修复
- **流水线类型修正**: sync.md/skill-flow.md 从 full→auto, cleanup.md Gate C-impl 入口跳转补齐
- **命令统计更新**: 移除废弃 mobile 命令后文档统计 44→43

## v4.7.79 (2026-06-01)

### 变更
- **会话归档与 Wiki 存储分离**: 会话归档与知识库 Wiki 独立数据库存储隔离

## v4.7.78 (2026-06-01)

### 变更
- **全系统审查修复 + 闭环验证**: review-only 模板→Gate R 只读审查, review-fix 模板→Gate D 修复闭环

## v4.7.77 (2026-06-01)

### 变更
- **安全加固**: install.ts 新增 18 个 Bash PreToolUse 匹配器 (rm/mv/curl|bash/node -e/npm install/git reset/docker/ssh), 总计 51 个 Hook 匹配器 (原 33)
- **Plan Mode 移除**: EnterPlanMode/ExitPlanMode 从全部 command/agent/skill 模板中移除, 引擎 plan_mode 始终返回 null
- **Gate A/C 自动推进**: Gate A 直接写入需求文档无中断, Gate C 自动生成执行计划不确认

## v4.7.76 (2026-06-01)

### 清理
- **废弃 mobile 命令**: 删除 /mobile 命令及所有关联引用, Agent 模板同步清理

## v4.7.75 (2026-06-01)

### 变更
- **skill-assignment→Agent prompt 注入闭环**: 打通 skill-assignment-expert 产出→Agent prompt 完整注入链路

## v4.7.74 (2026-06-01)

### 变更
- **全量编排补齐**: Gate C skill-assignment-expert 集成 + Gate E docs-engineer 硬约束强制调用

## v4.7.73 (2026-06-01)

### 修复
- **工程化审计 34 项 findings 修复**：关闭 5 CRITICAL + 14 IMPORTANT + 3 SUGGESTION
- **命令工具补全**：补充缺失工具注册（Agent/Team/Write/Skill/gate_jump），消除 Agent 自相矛盾（test-executor）
- **Hook 实现 CI 检查**：引擎宕机 fail-closed + 安装 3 个缺失 hook
- **Engine 类型修正**：projectRoot 传递 + hooks 目录扫描修正

## v4.7.72 (2026-06-01)

### 修复
- **全局 MCP 安装路径修正**：`~/.claude/.mcp.json` → `~/.claude.json`（install.ts/doctor.ts/remove.ts 三处统一）

## v4.7.71 (2026-06-01)

### 变更
- **CI 门禁改造 12 文件**：所有 push/release/publish 流程强制 CI 通过检查
- **Gate E/RL3 引擎定义全覆盖**：5 命令 + 4 技能 + 1 Agent + 1 Hook 全面覆盖

## v4.7.70 (2026-06-01)

### 修复
- **模板回退 pro/flash**：回退至 pro(85)/flash(3) 两层模型分配
- **syncAgentFile 全局路径**：修正模板同步时路径解析
- **guide.html 修复**：版本号与统计数据同步修正

## v4.7.69 (2026-06-01)

### 变更
- **Agent 模型四层分配**：pro(60)/mimo-v2.5-pro(23)/qwen3.6-plus(2)/flash(3)

## v4.7.68 (2026-06-01)

### 变更
- **Agent 模型统一**: 全部 85 个 Agent 统一使用 deepseek-v4-pro（3 个探索 Agent 保持 deepseek-v4-flash），全部添加 effort: max

## v4.7.67 (2026-06-01)

### 新增
- **frontend-debug-expert 编排闭环**: Gate C1.5 布局问题→spawn诊断→实现Agent修复→重验证; Gate C2 前端/Browser测试失败→spawn诊断→传递报告→修复→重测


## v4.7.66 (2026-06-01)

### 新增
- **9 个框架专用指令**: /flutter /expo /swift /kotlin /taro /miniprogram /uni-app /react /vue
- **mobile-architect**: 移动端架构师 Agent
- **45 个框架专属 Agent**: 每个框架 5 件套（dev/ui/state/test/review）
- **编排流程 Agent 补齐**: Gate A/C/C2/D/E 新增 7 个 Agent spawn 指令
- **gates.test.ts**: 100 项测试覆盖 17 条流水线 + 55 个 Gate

### 变更
- **lite→auto 重命名**: 引擎+14 个命令模板同步
- **Agent 重命名**: android→kotlin, ios→swift, react-native→expo
- **SESSION_TIMEOUT 统一**: 三处统一为 2 小时
- **14/14 开发类命令**: Gate E 统一 spawn docs-engineer 文档同步

### 修复
- **会话隔离 Bug**: 多终端 session_join 不再共享流水线状态
- **文档与 Web 面板闭环**: README/AGENTS/CHANGELOG 计数同步, pipeline.html 双重路径修复
- **全仓一致性审计**: 20 项发现全部关闭, 零冲突闭环
- **僵尸 Session 清理**: >7 天 inactive 自动物理删除
- **PID 文件清理 + heartbeat 参数**
- **uniapp→uni-app**: jarvis.md 5 处拼写修复

## v4.7.65 (2026-05-30)

### 变更
- **审查流程补充架构师多视角**: Gate D 审查阶段新增 `frontend-architect`、`backend-architect`、`database-architect` 参与，填补实现后架构一致性验证缺口
- **review-fix/review-only 模板更新**: 审查 Agent 模板同步架构师多视角流程

## v4.7.64 (2026-05-30)

### 修复
- **CI typecheck 修复**: 修复 TypeScript 类型检查在 CI 环境下的报错
- **全系统闭环修复**: 多项技术债清理和系统稳定性改进

## v4.7.63 (2026-05-29)

### 变更
- **Agent 模板模型配置**: Agent 模板默认模型更新为 deepseek-v4-pro/flash

## v4.7.62 (2026-05-29)

### 变更
- **全系统一致性修复**: 跨模块接口和配置一致性修复
- **文件冲突防护**: Agent 并行执行时的文件独占声明与冲突检测机制
- **Web 面板优化**: 面板 UI 和交互体验优化

## v4.7.61 (2026-05-29)

### 修复
- **Guide 页面双源数据**: 修复 Guide 页面数据来源不一致问题，添加空状态处理
- **Hook 引擎自启动**: Hook 引擎启动后不再阻塞后续操作

## v4.7.60 (2026-05-29)

### 修复
- **僵尸 Session 清理**: 清理过期会话记录
- **Agent 工具名修正**: 修正 Agent 配置中错误的工具名引用

## v4.7.59 (2026-05-29)

### 修复
- **MCP 合并策略**: 改为纯增量合并——用户自定义 MCP server 永不删除

## v4.7.58 (2026-05-29)

### 修复
- **Hook 全局误触修复**: 修复 Hook 在不相关场景下被误触发的问题
- **Web 页面滚动优化**: 修复页面滚动行为
- **描述回退**: Guide 页面描述文字回退修正

## v4.7.57 (2026-05-29)

### 清理
- 清除 Claude_Preview/find-skills 文档残留

## v4.7.56 (2026-05-29)

### 修复
- **Agent 工具/skill/Gate 编排全面修复**: 修复 Agent 工具注册、技能加载和 Gate 编排的多项问题 (#24)

## v4.7.55 (2026-05-29)

### 变更
- 版本号 4.7.54 → 4.7.55 递增

## v4.7.54 (2026-05-29)

### 生产可用性修复
- **MCP 模板补全**: claude 平台 .mcp.json 模板补充 playwright MCP server（3 个 server 闭环）
- **文档同步**: README/README_EN/QUICKSTART 移除已废弃的 Visual Primitives MCP 引用
- **术语统一**: jarvis-reference SKILL 和 review-fix-optimize agent 中 audit→review 引用全部更正
- **CHANGELOG 回溯**: 补充 v4.7.31-v4.7.54 版本变更记录
- **Skills 计数修正**: README 中 Skills 数量 35→34

## v4.7.51–v4.7.53 (2026-05-28)

### 版本回滚与重建
- **v4.7.51**: 回滚至 v4.7.33 代码基线（撤销 v4.7.34–v4.7.50 的中间迭代）
- **v4.7.52–v4.7.53**: 版本递增与稳定性修复

## v4.7.33 (2026-05-27)

### 审查重命名
- **audit/audit-fix → review-only/review-fix**: 命令和 agent 重命名，同步更新 README/CHANGELOG/web 引用
- **所有模板和引擎文件**: audit→review 术语全量同步

## v4.7.32 (2026-05-27)

### bug 修复
- 修复 package.json 将 zod 误写为 z 导致全局安装失败

## v4.7.31 (2026-05-27)

### 架构精简
- 移除 deepinit CLI 模块，统一使用 AI Agent 驱动的 /deepinit 命令
- 减少 CLI 代码维护成本，逻辑集中于 Agent 模板

## v4.7.30 (2026-05-27)

### 指令重构
- **deepinit 重写**：`/deepinit` 指令由 CLI 模板填充重写为 AI Agent 驱动架构文档生成——spawn 并行 Agent 读取源码 → 理解架构 → 撰写分层 AGENTS.md + CLAUDE.md

## v4.7.29 (2026-05-26)

### Bug 修复
- **SSE 广播修复**：修复 SSE 广播推送空 gates 数组导致推进 gate 后 Web 面板 Gate 流程消失的问题

## v4.7.28 (2026-05-26)

### Bug 修复
- **MCP 会话修复**：MCP 启动时自动初始化引擎会话，避免工具调用时提示 `session_id required`

## v4.7.27 (2026-05-25)

### 审查优化
- **e2e-test-expert 工具名修正**：移除8个不存在的MCP工具名，修正 `browser_fill`→`browser_fill_form`，`browser_run_code`→`browser_run_code_unsafe`，Playwright API方法→MCP工具
- **browser-test-expert 技能加载**：由叙述性文本改为代码块 `Skill()` 格式
- **frontend-dev-expert 矛盾修复**：解决"禁止spawn agent"与"spawn验证agent"的逻辑冲突
- **命令 pipeline_type 修正**：`bug-fix` 和 `test-e2e` 由 `full` 改为 `lite`（跳过不必要的DDD/架构Gate）
- **review-fix agent名修正**：`remediation-expert`(执行器)→`remediation-planner`(规划器)
- **phantom引用清理**：移除不存在的 `browser-test-worker` 和 `frontend-debug` skill引用，替换为实际存在的内容
- **mcp-claude.json**：`chrome-devtools` 补充 `type: stdio` 字段

## v4.7.26 (2026-05-25)

### 浏览器工具链重构
v4.7.25 的后续完善版本，包含完全的端点闭合：
- 同步更新 install.ts MCP注入逻辑（Codex chrome-devtools）
- 完整的 7 类验证通过（MCP模板/Agent工具/Skills/Commands/Gates/Hooks）

## v4.7.25 (2026-05-25)

### 浏览器工具链重构

### 浏览器工具链重构
- **新增 Chrome DevTools MCP**：前端调试专用，支持性能追踪、渲染分析、网络诊断、控制台调试
- **新增 frontend-debug-expert**：使用 Chrome DevTools MCP 进行开发实时调试、性能/渲染优化
- **删除 browser-use**：移除 browser-use CLI + browser-use-expert agent + install:browser-use 脚本
- **browser-test-expert 重构**：混合模式——agent-browser CLI 精确获取页面结构（看清）+ Playwright MCP 稳定执行交互操作（操作）
- **e2e-test-expert**：Playwright MCP 专用于代码级自动化测试，CI 可重复执行
- **MCP 模板更新**：mcp-claude.json / mcp-codex.toml / mcp-opencode.json 均添加 chrome-devtools server
- **agent tools 字段完整注册**：所有 agent 的 tools frontmatter 包含所需全部 MCP 工具和 Skill
- **引擎核心更新**：agent-registry 分类规则、gates.ts Agent 指引、remove.ts MCP 白名单同步更新

## [4.7.20] - 2026-05-24

### Changed
- **Run历史改为单列布局**：窄右侧栏下单列卡片更可读

## [4.7.19] - 2026-05-24

### Changed
- **SessionDetail 页面优化**：Gate 进度改为水平步骤条 + Run 历史改为卡片网格 + 右侧栏支持拖拽调整宽度

## [4.7.18] - 2026-05-24

### Changed
- **Web Guide 页面重构**：流水线卡片网格布局 + 指令搜索过滤 + 去除文档外链引用

## [4.7.17] - 2026-05-24

### Changed
- **README 中英文简化**：从 ~290行 压缩至 ~110行，优化双列布局，版本徽章动态化
- 新增卸载清理命令到快速开始 + 新增 `/cleanup` 流程图

## [4.7.16] - 2026-05-24

### Fixed
- **CI Node.js 24 兼容**：添加 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`，适配 GitHub Actions 2026-06-02 强制升级
- **CLI help 指令更新**：补充 `remove --engine/--force` 标志 + `hook/resolve/deepinit` 子命令
- **文档同步**：`cleanup` 指令分类映射 + Web Guide 标签更新

## [4.7.15] - 2026-05-24

### Added
- **CLI `remove` 增强**：新增 `--engine` 标志清理 `.jarvis/` 引擎数据（数据库+产物文档+归档）；新增 `--force` 标志跳过确认提示；引擎数据清理仅删已知 Jarvis 文件（日期目录/flows/tmp/engine.db*），保护用户自有文件
- 新增 `/cleanup` slash 命令模板，支持在 Claude Code 会话中安全清理

## [4.7.14] - 2026-05-24

### Fixed
- **安全审查修复**：`pipeline_resume` 添加 run 所有权验证（防跨会话恢复注入）；`migrateSession` 6个UPDATE包裹在事务中（防半迁移状态）

## [4.7.13] - 2026-05-24

### Fixed
- **引擎核心 Bug 修复（8项）**：`gate_enforce` 验证 `entry_condition`；`pipeline_init` 防僵尸 run；`migrateSession` 迁移全部7表；`gate_check` 未知Gate报错；`working_memory_query` 会话隔离；`gate_jump` 记录checkpoint；`session_leave` 统一resolveSid；`advance_gate` 跨午夜日期扫描

### Changed
- **Web UI 完善（6项）**：Dashboard `openMdPreview` 传 sessionId；Guide 补全15种流水线；Dashboard 补全30+ Gate标签；RunDetail 改用 api client；删除死代码 `/api/dashboard-stats`；Guide 修复过时引用

### Added
- **Hooks 模板（5项）**：`PreToolUse` Gate权限检查 / `PostToolUse` 产物记录 / `SessionStart` 引擎注册 / `Stop` 归档提醒 / `UserPromptSubmit` 命令路由
- `verify-expert` 加入 Gate D can_spawn 列表

### Removed
- 重复 npm script `jarvis:dev`

## [4.7.12] - 2026-05-24

### Changed
- CHANGELOG + Web 指南文档同步更新

## [4.7.11] - 2026-05-24

### Fixed
- **修复产物文档扁平化生成**：`documentation-and-adrs` skill 指示 ADR 路径从 `.jarvis/adr/` 改为 `.jarvis/YYYY-MM-DD/adr/`，与引擎日期目录要求一致
- 移除 `test-integration` 中 `.jarvis/contracts/` flat 路径引用

## [4.7.10] - 2026-05-24

### Changed
- **前端智能体注册 `browser-use` skill**：`frontend-dev-expert` 始终加载 `browser-use`，开发时可交互浏览器做视觉验证
- 视觉验证 CLI 从 `agent-browser` 切换为 `browser-use`

## [4.7.9] - 2026-05-23

### Changed
- **会话详情页 Gate 流水线改为 2 列网格布局**：从垂直 Timeline 改为紧凑的 CSS Grid 2列，文档预览区获得更多垂直空间

## [4.6.4] - 2026-05-21

### Removed
- 删除废弃的 `web/public/commands-reference.html`（已被 React SPA `/commands` 替代）

## [4.6.3] - 2026-05-21

### Changed
- **首页重构为流水线统筹看板**：活跃/休眠会话卡片网格 + Gate 进度条
- **新增会话详情页 `/session/:id`**：Gate 时间线 + 产物文档预览 + Markdown 阅读器
- 点击侧边栏会话 → 导航到会话详情页
- **产物文档强制日期目录**：移除旧扁平 `.jarvis/{gateSubdir}/` 兼容扫描，仅保留 `.jarvis/YYYY-MM-DD/{gate}/`
- RunDetail 归档详情页支持文档点击预览

### Added
- Dashboard 对 LazyMarkdown/GATE 常量等组件公开 export

## [4.6.2] - 2026-05-21

### Added
- **React Wiki 页面（`/wiki`）**：知识库浏览、搜索、分类筛选、Markdown 详情渲染
- **React Guide 页面（`/guide`）**：快速开始、核心约束、指令参考、资源链接
- `npm run dev:setup` 一键本地开发环境配置

### Changed
- `npm run build` 脚本包含 `build:web`，一次性产出完整 dist
- dev 模式（JARVIS_DEV=1）SPA 缺失时自动触发构建
- CI 移除冗余 `build:web` 调用

### Fixed
- `bin/jarvis.js` dist/ 缺失时 fallback 到 tsx 动态运行源码

## [4.4.0] - 2026-05-20

### Added
- `src/engine/tools/` MCP 工具模块化：session/pipeline/gate/agent/flow/wiki 7 模块
- 合并 6 张 Gate 表为统一的 `GATE_CONFIG`（62 gates）
- `repowiki` 7 个 MCP 工具：add/ingest/query/list/read/delete/lint
- Wiki 静态浏览页 `web/public/wiki.html` + REST API

### Changed
- server.ts 瘦身：MCP 注册逻辑提取到 `src/engine/tools/`（-19 imports, 43→5 warnings）
- 支持 `pipeline_type=lite` 的 Gate 跳转
- Web 面板 SSE 实时推送替代轮询

### Fixed
- 代码审查 Top 8 修复：类型安全、去重、安全加固
- 补齐 `/repowiki` 在 web 面板 + 文档中的引用
- 会话选择器 SSE stale closure 修复

## [4.3.9] - 2026-05-20

### Added
- **DeepInit 分层文档生成系统**：`jarvis deepinit` 命令递归扫描项目树，为每层目录生成 AGENTS.md + CLAUDE.md 文档骨架，集成到 `jarvis init` 自动触发

### Fixed
- 补齐 19 个命令缺失的 `name`/`model` frontmatter 字段
- 补齐 3 个 Agent 缺失的 `tools` 字段
- 修复 2 个 Skill 版本号落后（4.3.6→4.3.8）

## [4.3.8] - 2026-05-20

### Changed
- 迁移文档产物目录 `docs/` → `.jarvis/`，统一流水线文档到 `.jarvis/*` 便于集中管理
  - **引擎核心**：GATE_DIRS 路径引用、产物扫描逻辑、API 路由 `/api/docs`→`/api/jarvis`、`getDocsDir`→`getArtifactsDir`
  - **Web 层**：前端 api.ts、pipeline.html 视图适配新端点
  - **模板批量更新**：Agent（50+）、Command（30+）、Skill（39）全部更新为 `.jarvis/` 路径
  - **配置文件**：`.gitignore` 合并两处 `docs/` 块，修复目录级忽略冲突；`.npmignore`、`eslint.config.js` 同步

## [4.3.7] - 2026-05-20

### Changed
- 生产就绪审计与修复（UltraQA）：
  - **版本一致性**：144 个模版文件（35 Skill + 71 Agent + 40 Command）版本号统一为 4.3.6，修复 2 个缺失版本字段
  - **CI 强化**：check 作业新增 `npm audit` 步骤；release 作业新增 lint/typecheck/test/audit 四重质量门（此前仅 rebuild）
  - **HTML 面板**：修复 2 处过时版本号（v4.3.5→v4.3.7, v4.3.0→v4.3.7）及技能数量（34→35）
  - **tsconfig**：记录 `noImplicitAny`/`noUncheckedIndexedAccess` 技术债务（启用后各暴露 50+ 类型错误，需专项修复）

## [4.3.6] - 2026-05-20

### Changed
- 审查体系深度优化，参考 OMC code-reviewer + critic 最佳实践：
  - **置信度维度（P1）**：严重度分级新增 HIGH/MEDIUM/LOW 置信度标注，LOW 置信度严重发现不阻断 pipeline
  - **多视角审查协议（P2）**：强制安全工程师/新人/运维工程师三视角切换审视，计划审查增加执行者/利益相关方/怀疑者三视角
  - **自查与现实主义校验（P3）**：FLAW vs PREFERENCE 区分、真实最坏情况压力测试、严重度重新校准
  - **发现/过滤分离（P4）**：发现阶段不预过滤所有发现，过滤由下游编排者执行
  - **对抗升级模式（P5）**：CRITICAL 发现或 3+ MAJOR 时触发审查升级——主动搜寻隐藏问题、质疑每个决策、扩大审查范围
- 修改文件：`code-review-and-quality` Skill（核心方法论）、`diff-review-expert` / `frontend-review-expert` / `backend-review-expert` / `security-review-expert` / `review-only` Agent

## [4.3.5] - 2026-05-20

### Added
- `jarvis-reference` 统一参考技能：整合 Agent 目录（71个/6类）、命令目录（40条）、技能注册表（35个/13类）、流水线体系（15条/Gate操作权限）、MCP 工具参考（20+工具）、发布协议、核心约束。`user-invocable: false`，Agent 启动时自动加载。
- 技能总数 34→35，分类 12→13（新增"参考"类）

### Fixed
- `using-agent-skills` 概览表补全缺失的 8 个技能：`browser-use`、`code-standards`、`debugging-deep`、`frontend-design`、`perf-testing`、`refactoring`、`security-testing`、`test-data-factory`（26→35 条目）
- `using-agent-skills` 阶段 5（实现）补全 `frontend-design`、`refactoring`；特殊场景补全 6 个缺失技能

## [4.3.4] - 2026-05-20

### Security
- 预推送钩子增加 `npm audit --audit-level=moderate`，阻断中等及以上严重度漏洞进入仓库

### Fixed
- README.md 版本徽章同步 v4.3.1→v4.3.3

## [4.3.3] - 2026-05-20

### Security
- 彻底移除 antV 依赖残留：清理 `docs/tmp/screenshots/x6-*` 8 张旧 X6 引擎截图
- 安全审计确认：package.json / web/package.json / package-lock.json / bun.lock / node_modules / src/ / web/src/ / dist/ 均无 @antv 依赖或代码引用
- antV (@antv/x6, @antv/g6, @antv/x6-plugin-*) 已在 v3.53.0 的 X6→SVG 重写中移除，本次确保零残留

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
