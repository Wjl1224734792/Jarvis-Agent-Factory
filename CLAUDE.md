# Jarvis Agent Factory

一套跨平台多智能体 AI 编程助手配置集，定义从想法到交付的完整软件开发流水线。支持 Claude Code、OpenCode、Codex 三平台。

> 版本 v2.1.5 | MIT 协议
>
> **Agent 入口**：[AGENTS.md](./AGENTS.md) — 所有智能体首读项目约束文件

## 三平台架构

## 三平台架构

| | Claude Code | OpenCode | Codex |
|---|------------|----------|-------|
| **入口** | `/` 斜杠命令 + Agent 切换 | 智能体切换 | Skill 触发 |
| **Agents** | 47 | 55 | 45 |
| **Commands** | 15 | 0 | 0 |
| **Skills** | 27 | 27 | 42 |

## 核心架构

- **Jarvis** — 唯一编排中枢，直接与用户对话，通过 Agent/Task 工具调度所有子智能体
- **子智能体** — 职责单一、不可递归调度
- **Gate 闸门** — A→B→C→C1→C1.5→C2→D→E，每阶段必须通过对应闸门才可前进
- **Plan Patch** — 共享区域变更需提交 plan patch，由编排者评估决策

## 生命周期流水线

```
想法细化 → 需求澄清 → 任务分解 → 执行规划 → 批量实现 → 质量门 → 视觉验证 → 测试 → 评审 → 发布
  Gate 0     Gate A     Gate B     Gate C     Gate C     Gate C1   Gate C1.5  Gate C2  Gate D  Gate E
```

## 平台目录

| 目录 | 平台 | Agent 格式 |
|------|------|-----------|
| `.claude/` | Claude Code | `.md` (YAML frontmatter) |
| `.codex/` | OpenAI Codex CLI | `.toml` |
| `.opencode/` | OpenCode | `.md` (YAML frontmatter) |

## 浏览器自动化

统一使用 **agent-browser** CLI（Vercel Labs，80+ 命令），替代 Claude in Chrome MCP 和 browser-use。

```bash
npm i -g agent-browser && agent-browser install
```

- 快照+引用机制（`agent-browser snapshot -i` → `@e1, @e2` 元素引用）
- 支持 Chrome profile 复用登录态（`agent-browser --profile "Default" open <url>`）
- 网络请求监控、控制台日志、性能追踪、视觉回归
- Claude Code 平台额外搭配 Preview MCP 做本地预览验证

## 关键约定

- **不可绕过 Gate** — 任何阶段都不能跳过闸门检查
- **同 Batch 并行** — 无依赖的 agent 必须在同一条消息中批量 spawn
- **不凭记忆编码** — 修改前必须读取相关源码、测试、契约
- **敏感信息不入库** — `.claude/settings.local.json` 和 `.agents/` 已在 .gitignore 排除
- **修改技能前先读 writing-skills** — 技能文件需遵循 TDD 方法论
- **技能跨平台同步** — 三平台同名技能内容须保持一致

## 入口速查

### Claude Code（/命令）
- `/jarvis` — 全栈流水线编排
- `/frontend` `/backend` — 前后端各自生命周期
- `/taro` `/android` `/ios` `/expo` `/flutter` — 移动端五平台生命周期
- `/review` — 只读审查 | `/review-fix` — 审查→修复→复审闭环
- `/browser-test` — 浏览器自动化测试 | `/bug-fix` — Bug 复现→修复→验证闭环
- `/algorithm-expert` `/frontend-architect` `/backend-architect` — 专家对话

### OpenCode（智能体切换）
- 切换到对应主智能体即可进入流程，无命令模式
- 主智能体：`jarvis` `frontend` `backend` `android` `ios` `flutter` `expo` `taro`
- 审查模式：`review-only` `review-fix-optimize`

### Codex（Skill 触发）
- 加载 `.codex/skills/<name>/` 进入对应工作流
- 主流程：`jarvis` `frontend` `backend` `android` `ios` `flutter` `expo` `taro`
- 专家对话：`algorithm-expert` `backend-architect` `frontend-architect`
- 测试闭环：`browser-test` `bug-fix`
- 审查模式：`review-only` `review-fix-optimize`
