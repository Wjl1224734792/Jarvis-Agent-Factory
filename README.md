# Jarvis Agent Factory · 贾维斯智能体工厂

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![npm](https://img.shields.io/npm/v/jarvis-agent-factory)](https://www.npmjs.com/package/jarvis-agent-factory)
[![Visual Primitives MCP](https://img.shields.io/badge/DeepSeek-Visual%20Primitives%20MCP-purple)](https://github.com/Wjl1224734792/visual-primitives-mcp)

**AI 编程助手配置集 + MCP 编排引擎** — 从想法到交付的完整软件开发流水线。仅支持 **Claude Code**。

<br>[English](./README_EN.md) | **简体中文**

## 快速开始

**懒人模式** — 复制这句话到 Claude Code，让 AI 帮你装：

> 打开 https://github.com/Wjl1224734792/Jarvis-Agent-Factory 帮我安装配置好 Jarvis，按 QUICKSTART.md 步骤操作，然后运行 jarvis init -y

**手动安装：**

```bash
npm i -g jarvis-agent-factory    # 安装 CLI（零原生依赖）
jarvis init -y                    # 一键部署：配置 + MCP + 钩子
```

**卸载清理：**

```bash
jarvis remove claude --engine --force    # 项目级：配置 + .jarvis/ 引擎数据
jarvis remove claude -g --engine --force # 全局级：用户目录全部 Jarvis 文件
```

📖 详细安装指南 → [QUICKSTART.md](./QUICKSTART.md)

## 核心特性

| 特性 | 说明 |
|------|------|
| **MCP 编排引擎** | FSM 硬约束 Gate 序列，跳过/回退拒绝，15 条流水线按需路由 |
| **零手动启动** | MCP stdio 自动拉起引擎，Claude Code 开箱即用 |
| **Agent Team** | Team + SubAgent 混合编排，按复杂度自动分配 |
| **智能路由 `/auto`** | 自动检测任务类型 → 路由最优流水线 → 跳过无关 Gate |
| **Web 面板** | SSE 实时推送 · 会话管理 · 产物预览 · Agent 配置 · 归档 |
| **浏览器测试** | 文档驱动闭环：test-doc-writer → test-executor → remediation-expert |
| **智能安装/卸载** | Hash 对比增量更新，`jarvis remove` 精确匹配不误删用户文件 |
| **会话隔离** | 每会话独立流水线 · 跨会话记忆 · 项目级 `.jarvis/` 数据库 |
| **零原生依赖** | Node 22.5+ 内置 `node:sqlite`，秒级安装 |

## 产物目录

```
.jarvis/YYYY-MM-DD/          ← 日期目录（引擎只识别此格式）
├── requirements/   Gate A   需求文档
├── tasks/          Gate B   任务分解
├── architecture/   Gate B1  架构评审
├── plans/          Gate C   执行计划
├── implementation/ Gate C-impl 实现文档
├── testing/        Gate C2  测试报告
├── review/         Gate D   评审报告
└── shipping/       Gate E   发布记录
```

## 平台入口速查

| 领域 | 命令 | | 领域 | 命令 |
|------|------|-|------|------|
| 智能路由 | `/auto` | | 需求探询 | `/ask` |
| 全栈 | `/jarvis` | | 深度研究 | `/research` |
| 前端 | `/frontend` | | Bug 修复 | `/bug-fix` |
| 后端 | `/backend` | | 重构 | `/refactor` |
| 审查 | `/audit` | | 热修复 | `/hotfix` |
| 代码简化 | `/simplify` | | 调试诊断 | `/debug` |
| 安全清理 | `/cleanup` | | 发布 | `/release` |
| 单元测试 | `/test-unit` | | E2E测试 | `/test-e2e` |
| 集成测试 | `/test-integration` | | 性能测试 | `/test-perf` |

→ 全部 35 条命令见 [命令流程图](#命令流程图)

## 流水线类型

`full` `frontend` `backend` `lite` `refactor` `hotfix` `migrate` `evaluate` `debug` `research` `release` `ask` `simplify` `trace` `improve` — 15 种

## Web 面板

`jarvis web` 独立启动，默认端口 3457

| 页面 | 路由 | 功能 |
|------|------|------|
| 看板首页 | `#/` | 会话卡片 · 统计 · SSE 实时推送 |
| 会话详情 | `#/session/:id` | Gate 网格 · 产物预览 · Markdown 阅读 |
| 归档 | `#/archive` | 历史记录 · 搜索 · 恢复/删除 |
| 智能体 | `#/agents` | Agent 搜索 · 模型/思考等级配置 |
| 使用指南 | `#/guide` | 快速开始 · 流水线说明 · 指令参考 |
| 知识库 | `#/wiki` | 项目架构 · 设计决策 · 调试经验 |

## 统计

| | Claude Code |
|---|:--:|
| Agents | 72 |
| Commands | 35 |
| Skills | 35 |
| CLI 命令 | 11 (`init` `add` `remove` `upgrade` `diff` `engine` `web` `hook` `doctor` `deepinit` `resolve`) |
| 流水线 | 15 条 |

## 引擎能力

| 能力 | 机制 | 触发 |
|------|------|------|
| Gate 硬约束 | FSM · `gate_check` · `gate_enforce` | 自动 |
| 操作前检查 | `gate_check` | 自动 |
| 推进 Gate | `advance_gate` | 手动 |
| 轻量跳转 | `gate_jump` (lite/ask/improve) | 手动 |
| 流程指引 | `pipeline_guide` | 按需 |
| 会话命名 | `session_set_name` | 按需 |
| Web 实时推送 | Dashboard + SSE | 按需 |
| Agent 配置 | Web → `.md` 源文件同步 | 保存触发 |

## 发布流程

```
质量重检(Lint+Test+Build) → 更新版本号 → 同步文档 → 提交+Tag → 推送 → GitHub Actions 自动发布(npm)
```

## 命令流程图

每命令含 Mermaid 流程图（Gate 序列 + Agent spawn 关系），`docs/flows/` 目录下可查看：

| 分类 | 命令 | 流程图 | Gate |
|------|------|--------|------|
| 核心 | `/jarvis` | [jarvis.md](docs/flows/jarvis.md) | 10门 |
| | `/auto` | [auto.md](docs/flows/auto.md) | 智能路由 |
| 前端 | `/frontend` | [frontend.md](docs/flows/frontend.md) | C1.5强制 |
| 后端 | `/backend` | [backend.md](docs/flows/backend.md) | 跳过C1.5 |
| 审查 | `/audit` | [audit.md](docs/flows/audit.md) | 只读 |
| | `/audit-fix` | [audit-fix.md](docs/flows/audit-fix.md) | 审查闭环 |
| Bug | `/bug-fix` | [bug-fix.md](docs/flows/bug-fix.md) | 7步闭环 |
| 工程 | `/refactor` | [refactor.md](docs/flows/refactor.md) | R1-R5 |
| | `/hotfix` | [hotfix.md](docs/flows/hotfix.md) | H0-H3 |
| | `/migrate` | [migrate.md](docs/flows/migrate.md) | M1-M4 |
| | `/evaluate` | [evaluate.md](docs/flows/evaluate.md) | E0-E3 |
| | `/debug` | [debug.md](docs/flows/debug.md) | D0-D4 |
| | `/research` | [research.md](docs/flows/research.md) | RS0-RS4 |
| | `/release` | [release.md](docs/flows/release.md) | RL0-RL4 |
| | `/ask` | [ask.md](docs/flows/ask.md) | K0-K3 |
| | `/simplify` | [simplify.md](docs/flows/simplify.md) | S0-S3 |
| | `/trace` | [trace.md](docs/flows/trace.md) | T0-T4 |
| | `/improve` | [improve.md](docs/flows/improve.md) | IM0-IM4 |
| 会话 | `/cleanup` | [cleanup.md](docs/flows/cleanup.md) | 安全清理 |
| | `/sync` | [sync.md](docs/flows/sync.md) | 文档同步 |
| 测试 | `/test-unit` | [test-unit.md](docs/flows/test-unit.md) | TDD |
| | `/test-integration` | [test-integration.md](docs/flows/test-integration.md) | API测试 |
| | `/test-e2e` | [test-e2e.md](docs/flows/test-e2e.md) | E2E |
| | `/test-perf` | [test-perf.md](docs/flows/test-perf.md) | 性能 |
| | `/test-security` | [test-security.md](docs/flows/test-security.md) | 安全 |
| 移动端 | `/android` `/ios` `/flutter` `/expo` `/taro` `/react-native` | 各平台同 | A→E |

## License

MIT
