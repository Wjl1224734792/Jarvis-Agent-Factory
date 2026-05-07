# Jarvis Agent Factory · 贾维斯智能体工厂

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-v3.15.2-green)](https://gitee.com/wujl1124/JarvisAgentFactory/releases)
[![npm](https://img.shields.io/npm/v/jarvis-agent-factory)](https://www.npmjs.com/package/jarvis-agent-factory)
<br>**简体中文** | [English](./README_EN.md)

跨平台多智能体 AI 编程助手配置集 + MCP 编排引擎。从想法到交付的完整软件开发流水线，支持 **Claude Code / OpenCode / Codex** 三平台。

> **v3.15.2** — 会话隔离 · 162 Agent 动态注册 · Hash 智能合并 · 三平台 MCP 规范修正

## 快速开始

```bash
npm i -g jarvis-agent-factory   # 安装 CLI（零原生依赖，node:sqlite 内置）
jarvis init -y                   # 一键部署三平台配置 + MCP + 钩子
jarvis engine start --dashboard  # 启动编排引擎 + Web 面板
# → http://localhost:3456/dashboard
```

## 核心特性

| 特性 | 说明 |
|------|------|
| **MCP 编排引擎** | FSM 硬约束 Gate A→B→C→C1→C1.5→C2→D→E，跳过/回退被拒绝 |
| **会话隔离** | 每个编辑窗口独立流水线状态，互不干扰 |
| **Web 面板** | Dashboard 看板 + 162 Agent 配置 + 会话列表 + 实时刷新 |
| **Agent 配置** | Web 面板修改模型/思考等级 → 自动同步回 `.md`/`.toml` 源文件 |
| **智能安装** | Hash 对比只覆盖变更文件，用户自定义自动保留 |
| **双通道执行** | MCP 直调（编排者）+ Hook 钩子（安全检查网） |
| **零原生依赖** | Node 22.5+ 内置 `node:sqlite`，安装秒级完成 |

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                    Jarvis Engine (:3456)                 │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │ MCP API │  │ REST API │  │   Web Dashboard         │ │
│  │ 8 tools │  │ /api/*   │  │   流水线 + Agent配置     │ │
│  └────┬────┘  └────┬─────┘  └───────────┬────────────┘ │
│       └────────────┼────────────────────┘              │
│               ┌────┴────┐                               │
│               │ SQLite  │  WAL · 会话隔离 · Hash追踪    │
│               └─────────┘                               │
└─────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
    .mcp.json            opencode.json      .codex/config.toml
    Claude Code          OpenCode           Codex
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

jarvis engine start [--dashboard]         # 启动编排引擎
jarvis engine stop / status               # 停止 / 状态

# 选项：-g 全局安装  -y 跳过确认  -v 版本  -h 帮助
```

## Web 面板

| 页面 | 路径 | 功能 |
|------|------|------|
| 流水线看板 | `/dashboard` | Gate 进度 · 会话列表（切换查看） · 统计面板 · Gate 推进 |
| 智能体配置 | `/agents` | 162 Agent 搜索 · 按平台筛选 · 模型/思考等级配置 · 文件同步 |

## 三平台 MCP 配置

| 平台 | 配置文件 | Key 格式 | Type |
|------|---------|---------|------|
| **Claude Code** | `.mcp.json` | `mcpServers.jarvis-engine` | `type: http` → `localhost:3456/mcp` |
| **OpenCode** | `opencode.json` + `.opencode/opencode.json` | `mcp.jarvis-engine` | `type: remote` → `localhost:3456/mcp` |
| **Codex** | `.codex/config.toml` | `[mcp_servers.jarvis-engine]` | `url = "localhost:3456/mcp"` |

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
| Agents | 47 | 55 | 45 |
| Commands | 15 | 0 | 0 |
| Skills | 27 | 27 | 42 |
| 钩子 | settings.json | 兼容 Claude 格式 | hooks.json |
| MCP | `.mcp.json` | `opencode.json` | `.codex/config.toml` |

## 引擎能力矩阵

| 能力 | 机制 | 触发方式 |
|------|------|----------|
| Agent spawn 后检查 Gate | 钩子 PostToolUse | 🔄 自动 |
| 条件不满足报警 | 钩子 → `gate_enforce` | 🔄 自动 |
| 推进 Gate | `advance_gate` MCP 工具 | 👆 编排者手动 |
| 跳过/回退 Gate 拒绝 | FSM 硬约束 | 🔄 自动 |
| 流水线状态 | Dashboard + SSE 实时推送 | 👆 按需 |
| 会话隔离 | 每 session_id 独立 pipeline | 🔄 自动 |
| 文件同步 | Web 配置 → `.md`/`.toml` | 👆 保存时触发 |

## License

MIT
