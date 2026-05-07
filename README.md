# Jarvis Agent Factory · 贾维斯智能体工厂

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-v3.21.5-green)](https://gitee.com/wujl1124/JarvisAgentFactory/releases)
[![npm](https://img.shields.io/npm/v/jarvis-agent-factory)](https://www.npmjs.com/package/jarvis-agent-factory)
<br>**简体中文** | [English](./README_EN.md)

跨平台多智能体 AI 编程助手配置集 + MCP 编排引擎。从想法到交付的完整软件开发流水线，支持 **Claude Code / OpenCode / Codex** 三平台。

> **v3.21.5** — MCP stdio 自动拉起引擎 · 零手动启动 · Web 面板独立按需 · 防重复启动

## 快速开始

```bash
npm i -g jarvis-agent-factory   # 安装 CLI（零原生依赖，node:sqlite 内置）
jarvis init -y                   # 一键部署三平台配置 + MCP + 钩子
# → Claude Code 重启后引擎自动拉起，无需手动启动
jarvis web                       # 启动 Web 面板（按需）
# → http://localhost:3457/dashboard
```

## 核心特性

| 特性 | 说明 |
|------|------|
| **MCP 编排引擎** | FSM 硬约束 Gate A→B→C→C1→C1.5→C2→D→E，跳过/回退被拒绝 |
| **零手动启动** | MCP stdio 自动拉起引擎，Claude Code / OpenCode 开箱即用 |
| **轻量编排** | `/jarvis-lite` 按任务类型智能映射 Gate 入口，跳过无关闸门 |
| **多流水线类型** | full / frontend / backend / lite 四种模式，按需选择 |
| **会话隔离** | 每个编辑窗口独立流水线状态，互不干扰 |
| **Web 面板** | 独立启动 Dashboard + MCP 平台接入状态 + 会话列表 + 平台筛选 + Agent 模型配置 |
| **Agent 配置** | Web 面板修改模型/思考等级 → 自动同步回 `.md`/`.toml` 源文件 |
| **智能安装** | Hash 对比只覆盖变更文件，用户自定义自动保留 |
| **三平台 Hook/Plugin** | Claude hooks + OpenCode 原生插件 + Codex hooks 全覆盖 |
| **平台扩展** | `platform_info` MCP 工具 + `/api/platforms` REST 端点 |
| **零原生依赖** | Node 22.5+ 内置 `node:sqlite`，安装秒级完成 |

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                    Jarvis Engine (:3456)                  │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────────┐  │
│  │ MCP stdio│  │ REST API │  │   SQLite               │  │
│  │ 自动拉起  │  │ /api/*   │  │   WAL · 会话隔离        │  │
│  └────┬────┘  └────┬─────┘  └────────────────────────┘  │
│       └────────────┼─────────────────────────────────────│
└─────────────────────┼─────────────────────────────────────┘
         ▲            │              ▲
    .mcp.json   jarvis web     .codex/config.toml
 Claude Code (:3457)          Codex
 (stdio 自动拉起引擎)                               
                               
    Web Panel (:3457) — 独立按需启动
    ┌───────────────────────────────┐
    │  流水线看板 + Agent模型配置    │
    │  API 代理 → Engine (:3456)    │
    └───────────────────────────────┘
```

## CLI 命令

```bash
jarvis [path]                             # 引导安装（交互式选择全局/项目）
jarvis init [path] -y                     # 初始化项目
jarvis add <claude|opencode|codex>        # 添加平台
jarvis remove <platform> [path]           # 移除平台
jarvis upgrade [path]                     # 智能升级（只覆盖变更文件）
jarvis diff [path]                        # 预览待更新文件
jarvis doctor [path]                      # 健康检查

jarvis engine start [--port=N]            # 手动启动编排引擎（stdio 模式下 Claude Code 自动拉起）
jarvis engine stop / status               # 停止 / 状态
jarvis web [--port=N]                     # 启动 Web 面板（独立，需引擎运行）

# 选项：-g 全局安装  -y 跳过确认  -v 版本  -h 帮助
```

## 环境变量

引擎和脚本通过环境变量配置（支持 `.env` 文件）：

```bash
# 在项目根目录创建 .env 文件
PORT=3456              # 引擎端口（默认 3456）
WEB_PORT=3457          # Web 面板端口（默认 3457）
GITEE_TOKEN=xxx        # Gitee 个人访问令牌（sync-gitee-releases 需要）
GITHUB_TOKEN=xxx       # GitHub 个人访问令牌（sync-github-releases 需要）
```

也可直接设置环境变量：`export GITEE_TOKEN=xxx`（Linux/macOS）或 `$env:GITEE_TOKEN="xxx"`（PowerShell）。

## 轻量编排 `/jarvis-lite`

跳过无关闸门，按任务类型智能映射 Gate 入口：

| 任务类型 | 入口 Gate | 示例 |
|---------|----------|------|
| 发布/部署 | Gate E | `npm publish`、部署到服务器 |
| Bug 修复 | Gate C | 小范围修复，直接进入实现 |
| 代码审查 | Gate D | PR review、代码审计 |
| 文档/配置 | Gate C | README、CI 配置等 |
| 小功能添加 | Gate A | 从需求澄清开始 |
| 重构/优化 | Gate C | 代码重构、性能优化 |

用法：在 Claude Code 中输入 `/jarvis-lite` 即可启动。

## Web 面板

使用 `jarvis web` 独立启动（需先运行 `jarvis engine start`），默认端口 3457。

| 页面 | 路径 | 功能 |
|------|------|------|
| 流水线看板 | `/dashboard` | Gate 进度 · MCP 平台接入状态 · 会话列表 · Gate 推进 · 平台筛选 |
| 智能体配置 | `/agents` | MCP 接入指示 · Agent 搜索/筛选 · 模型/思考等级配置 · 文件同步 |

侧边栏实时显示各平台（Claude Code / OpenCode / Codex）的 MCP 连接状态：绿点 = 已接入，灰点 = 未接入。

## 三平台 MCP 配置

| 平台 | 配置文件 | Transport | 说明 |
|------|---------|-----------|------|
| **Claude Code** | `.mcp.json` | `type: stdio` → 自动拉起 `jarvis engine start --stdio` |
| **OpenCode** | `opencode.json` | `type: local` → 自动拉起 `jarvis engine start --stdio` |
| **Codex** | `.codex/config.toml` | `url = "localhost:3456/mcp"` → 需引擎已运行 |

## 生命周期流水线

```
想法细化 → 需求澄清 → 任务分解 → 执行规划 → 并行实现 → 质量门 → 视觉验证 → 测试 → 评审 → 发布
  Gate 0     Gate A     Gate B     Gate C     Gate C     Gate C1   Gate C1.5  Gate C2  Gate D  Gate E
```

## 平台入口速查

| 领域 | Claude Code | OpenCode | Codex |
|------|-----------|----------|-------|
| 全栈 | `/jarvis` | `--agent jarvis` | `jarvis` skill |
| 前端 | `/frontend` | `--agent frontend` | `frontend` skill |
| 后端 | `/backend` | `--agent backend` | `backend` skill |
| Android | `/android` | `--agent android` | `android` skill |
| iOS | `/ios` | `--agent ios` | `ios` skill |
| Flutter | `/flutter` | `--agent flutter` | `flutter` skill |
| Expo | `/expo` | `--agent expo` | `expo` skill |
| Taro | `/taro` | `--agent taro` | `taro` skill |
| 审查 | `/review` | `--agent review-only` | `review-only` skill |
| 修复闭环 | `/review-fix` | `--agent review-fix-optimize` | `review-fix-optimize` skill |
| 浏览器测试 | `/browser-test` | spawn browser-test-worker | `browser-test` skill |
| Bug 修复 | `/bug-fix` | spawn via orchestrator | `bug-fix` skill |
| 算法专家 | `/algorithm-expert` | `--agent algorithm-expert` | `algorithm-expert` skill |
| 前端架构 | `/frontend-architect` | `--agent frontend-architect` | `frontend-architect` skill |
| 后端架构 | `/backend-architect` | `--agent backend-architect` | `backend-architect` skill |

## 统计

| | Claude Code | OpenCode | Codex |
|---|:--:|:--:|:--:|
| Agents | 49 | 55 | 45 |
| Commands | 16 | 0 | 0 |
| Skills | 28 | 28 | 42 |
| 钩子 | settings.json | 原生插件 (.ts) | hooks.json |
| MCP | `.mcp.json` | `opencode.json` | `.codex/config.toml` |

## 引擎能力矩阵

| 能力 | 机制 | 触发方式 |
|------|------|----------|
| Agent spawn 后检查 Gate | Hook/Plugin → `gate_check` | 🔄 自动（engine auto-start via stdio） |
| 条件不满足报警 | Hook/Plugin → `gate_enforce` | 🔄 自动 |
| 推进 Gate | `advance_gate` MCP 工具 | 👆 编排者手动 |
| 轻量入口跳转 | `gate_jump` MCP 工具（lite 模式） | 👆 编排者手动 |
| 跳过/回退 Gate 拒绝 | FSM 硬约束 | 🔄 自动 |
| 操作前 Gate 检查 | `gate_check` MCP 工具 | 🔄 自动 |
| 流程指引 | `pipeline_guide` MCP 工具 | 👆 按需 |
| 平台信息 | `platform_info` MCP 工具 | 👆 按需 |
| 流水线状态 | Dashboard + SSE 实时推送 | 👆 按需 |
| 会话隔离 | 每 session_id 独立 pipeline | 🔄 自动 |
| 文件同步 | Web 配置 → `.md`/`.toml` | 👆 保存时触发 |

## License

MIT
