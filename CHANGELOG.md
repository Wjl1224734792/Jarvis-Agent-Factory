# Changelog

All notable changes to the Jarvis Agent Factory project.

Note: This project follows [Semantic Versioning](https://semver.org/).

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
