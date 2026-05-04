# Changelog

All notable changes to the Jarvis Collaborative Agents project.

Note: This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
