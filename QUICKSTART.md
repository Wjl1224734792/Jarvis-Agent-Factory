# Jarvis Agent Factory — 快速开始

[![Version](https://img.shields.io/badge/version-v4.7.57-green)](https://github.com/Wjl1224734792/Jarvis-Agent-Factory/releases)
[![npm](https://img.shields.io/npm/v/jarvis-agent-factory)](https://www.npmjs.com/package/jarvis-agent-factory)

AI 编程助手配置集 + MCP 编排引擎。从想法到交付的完整软件开发流水线，**仅支持 Claude Code**。

---

## 懒人安装

**复制下面这句话，粘贴到 Claude Code 对话框，让 AI 帮你自动安装：**

> 打开 https://github.com/Wjl1224734792/Jarvis-Agent-Factory 帮我安装配置好 Jarvis Agent Factory，按照项目 README 的快速开始步骤操作即可，装好之后运行 jarvis init -y

Claude Code 会自动读取项目文档、安装 npm 包、执行 `jarvis init -y` 完成全流程配置。

---

## 前置条件

- **Node.js ≥ 22.5**（内置 `node:sqlite`，零原生依赖）
- **Claude Code**（唯一支持平台）
- npm 全局安装权限

```bash
node -v   # 确认 ≥ 22.5
```

---

## 快速安装（3 步）

```bash
# 1. 安装 CLI
npm i -g jarvis-agent-factory

# 2. 一键部署（配置 + MCP + 钩子 + Agent Team 支持）
jarvis init -y

# 3. 启动 Web 面板（按需，可选）
jarvis web
# → http://localhost:3456/dashboard
```

Claude Code 重启后引擎自动拉起，无需手动启动。

---

## 远程面板（无需本地安装）

每次 Release 附带一个独立 HTML 文件，可直接下载打开使用，无需安装 npm 包：

1. 打开 [GitHub Releases](https://github.com/Wjl1224734792/Jarvis-Agent-Factory/releases)
2. 下载最新版的 `index.html`（单文件，约 3.4MB，内联所有 JS/CSS）
3. 双击打开 → 自动连接到 `localhost:3456` 引擎

> 确保本地 `jarvis engine start` 已运行，面板 HTML 通过网络请求与本机引擎通信。

---

## CLI 命令参考

```bash
jarvis [path]                             # 引导安装（交互式选择全局/项目）
jarvis init [path] -y                     # 初始化项目
jarvis add claude                         # 添加平台
jarvis remove claude [path]               # 移除平台
jarvis upgrade [path]                     # 智能升级（只覆盖变更文件）
jarvis diff [path]                        # 预览待更新文件
jarvis doctor [path]                      # 健康检查

jarvis hook gate-check [--session <id>]   # 检查当前 Gate 状态（阻断时 exit 1）
jarvis hook gate-advance [--session <id>]  # 推进到下一 Gate
jarvis hook status [--json]               # 流水线会话状态总览
jarvis hook agent-config [--agent-id <id>] # 查询/设置 Agent 模型与思考等级

jarvis engine start [--port=N]            # 手动启动编排引擎
jarvis engine stop / status               # 停止 / 状态
jarvis web [--port=N]                     # 启动 Web 面板（独立，需引擎运行）

# 选项：-g 全局安装  -y 跳过确认  -v 版本  -h 帮助
```

---

## 环境变量

引擎和脚本通过环境变量配置（支持 `.env` 文件）：

```bash
# 在项目根目录创建 .env 文件
PORT=3456              # 引擎端口（默认 3456）
WEB_PORT=3457          # Web 面板端口（默认 3457）
GITHUB_TOKEN=xxx       # GitHub 个人访问令牌（sync-github-releases 需要）
```

也可直接设置环境变量（Linux/macOS）或通过系统环境变量配置（Windows）。

---

## MCP 配置指南

### 贾维斯引擎（必选）

| 平台 | 配置文件 | Transport | 说明 |
|------|---------|-----------|------|
| **Claude Code** | `.mcp.json` | `type: stdio` → 自动拉起 `jarvis engine start --stdio` |

### 开发环境 MCP（仅 Jarvis 自身开发者）

若你参与 Jarvis 源码开发，将引擎 MCP 指向本地工作区（无需全局安装），其他用户无需关注此配置：

```json
{
  "mcpServers": {
    "jarvis-engine": {
      "type": "stdio",
      "command": "node",
      "args": ["bin/jarvis.js", "engine", "start", "--stdio"],
      "env": { "JARVIS_DEV": "1" }
    }
  }
}
```

> 普通用户使用 `jarvis init` 自动生成的配置即可，无需手动设置。

---

## 验证安装

```bash
jarvis doctor    # 健康检查，确认所有文件就位
jarvis --version # 查看版本号
```

Claude Code 中输入 `/jarvis 你好` 测试引擎是否正常响应。

---

## 下一步

- 回到 [README.md](./README.md) 了解完整功能（核心特性、架构、流水线体系、34条指令）
- 在 Claude Code 中输入 `/auto 你的任务` 开始使用
- 遇到问题？在 Claude Code 中输入 `/debug` 进行诊断

---

## License

MIT
