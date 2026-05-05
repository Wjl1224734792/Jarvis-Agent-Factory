# Jarvis Agent Factory

一套跨平台多智能体 AI 编程助手配置集，定义从想法到交付的完整软件开发流水线。支持 Claude Code、OpenCode、Codex 三平台。

> 版本 v1.5.2 | 47 智能体 + 8 命令 + 25 技能 | MIT 协议

## 核心架构

- **Jarvis** — 唯一编排中枢，直接与用户对话，通过 Agent 工具调度所有子智能体
- **子智能体** — 职责单一、不可递归调度
- **Gate 闸门** — A→B→C→C1→C2→D→E，每阶段必须通过对应闸门才可前进
- **Plan Patch** — 共享区域变更需提交 plan patch，由 Jarvis 评估决策

## 平台目录

| 目录 | 平台 | Agent 格式 |
|------|------|-----------|
| `.claude/` | Claude Code | `.md` (YAML frontmatter) |
| `.codex/` | OpenAI Codex CLI | `.toml` |
| `.opencode/` | OpenCode | `.md` (YAML frontmatter) |

## 关键约定

- **不可绕过 Gate** — 任何阶段都不能跳过闸门检查
- **同 Batch 并行** — 无依赖的 agent 必须在同一条消息中批量 spawn
- **不凭记忆编码** — 修改前必须读取相关源码、测试、契约
- **敏感信息不入库** — `.claude/settings.local.json` 和 `.agents/` 已在 .gitignore 排除
- **修改技能前先读 writing-skills** — 技能文件需遵循 TDD 方法论
- **技能跨平台同步** — 三平台同名技能内容须保持一致

## 常用命令

- `/jarvis` — 全栈流水线编排
- `/backend` — 后端开发生命周期（需求→实现→发布）
- `/frontend` — 前端开发生命周期（需求→实现→发布）
- `/mobile` — 移动端开发生命周期（需求→实现→发布）
- `/review` — 只读审查（不修改文件）
- `/review-fix` — 审查→修复→复审闭环
- `/browser-test` — 浏览器自动化测试
- `/bug-fix` — Bug 复现→修复→验证闭环
