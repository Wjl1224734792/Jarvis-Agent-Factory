# Jarvis Agent Factory · 贾维斯智能体工厂

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-v3.39.0-green)](https://github.com/Wjl1224734792/Jarvis-Agent-Factory/releases)
[![npm](https://img.shields.io/npm/v/jarvis-agent-factory)](https://www.npmjs.com/package/jarvis-agent-factory)
[![Visual Primitives MCP](https://img.shields.io/badge/DeepSeek-Visual%20Primitives%20MCP-purple)](https://github.com/Wjl1224734792/visual-primitives-mcp)
<br>💡 **纯文本模型（如 DeepSeek）主力用户** → 搭配 [Visual Primitives MCP](https://github.com/Wjl1224734792/visual-primitives-mcp) 获得视觉理解能力
<br>**简体中文** | [English](./README_EN.md)

跨平台多智能体 AI 编程助手配置集 + MCP 编排引擎。从想法到交付的完整软件开发流水线，<br>**主力支持 Claude Code**，OpenCode / Codex 配置保留但暂不维护。

> **v3.39.0** — Write/Edit Gate 硬约束 · X6 可视化升级 · 单 HTML 远程面板 · 每 Gate 独立 Agent 图

## 快速开始

```bash
npm i -g jarvis-agent-factory   # 安装 CLI（零原生依赖，node:sqlite 内置）
jarvis init -y                   # 一键部署三平台配置 + MCP + 钩子
# → Claude Code 重启后引擎自动拉起，无需手动启动
jarvis web                       # 启动 Web 面板（按需）
# → http://localhost:3456/dashboard
```

### 远程面板（无需本地安装）

每次 Release 附带一个独立 HTML 文件，可直接下载打开使用，无需安装 npm 包：

1. 打开 [GitHub Releases](https://github.com/Wjl1224734792/Jarvis-Agent-Factory/releases)
2. 下载最新版的 `index.html`（单文件，约 3.4MB，内联所有 JS/CSS）
3. 双击打开 → 自动连接到 `localhost:3456` 引擎

> 确保本地 `jarvis engine start` 已运行，面板 HTML 通过网络请求与本机引擎通信。

## 核心特性

| 特性 | 说明 |
|------|------|
| **MCP 编排引擎** | FSM 硬约束 Gate A→B→C→C1→C1.5→C2→D→E，跳过/回退被拒绝 |
| **零手动启动** | MCP stdio 自动拉起引擎，Claude Code 开箱即用 |
| **轻量编排** | `/jarvis-lite` 按任务类型智能映射 Gate 入口，跳过无关闸门 |
| **多流水线类型** | full / frontend / backend / lite 四种模式，按需选择 |
| **会话隔离** | 每个编辑窗口独立流水线状态，互不干扰 |
| **会话管理** | 会话命名（MCP session_set_name）· 归档/删除 · 置顶 · 指令标签（/jarvis 等） |
| **Web 面板** | Hash 路由（#/dashboard #/archive #/agents）· SSE 实时推送 · X6 可视化 Agent 图 |
| **远程面板** | 单 HTML 文件下载即可打开，无需本地 web 构建 |
| **Agent 配置** | Web 面板修改模型/思考等级 → 自动同步回 `.md` 源文件 |
| **浏览器测试** | 文档驱动工作流：test-doc-writer → test-executor → fix-retest 闭环 |
| **智能安装** | Hash 对比只覆盖变更文件，用户自定义自动保留 |
| **Hook/Plugin** | Claude Code hooks + MCP 全覆盖 |
| **平台扩展** | `platform_info` MCP 工具 + `/api/platforms` REST 端点 |
| **零原生依赖** | Node 22.5+ 内置 `node:sqlite`，安装秒级完成 |

## 平台维护状态

| 平台 | 维护状态 | 说明 |
|------|---------|------|
| **Claude Code** | ✅ 维护中 | 主力平台，所有功能、Agent、技能持续迭代 |
| **OpenCode** | ⛔ 已停止 | 配置文件保留但不再维护更新，**不推荐使用** |
| **Codex** | ⛔ 已停止 | 配置文件保留但不再维护更新，**不推荐使用** |

> **重要**：当前仅 Claude Code 平台可用。OpenCode 和 Codex 的 CLI 命令和配置文件仍保留在仓库中但不做任何更新，使用可能导致功能异常或配置不完整。

## 产物目录规范

流水线各阶段智能产出物按 Gate 存入对应子目录，临时文件统一管理：

```
docs/
├── tmp/                    # 临时产物（截图、快照、导出的验证数据等，已 .gitignore 排除）
├── requirements/           # Gate A — 需求文档
├── tasks/                  # Gate B — 任务分解文档
├── architecture/           # Gate B1 — 架构评审产出
├── plans/                  # Gate C — 执行计划文档
├── implementation/         # Gate C-impl — 实现文档
├── testing/                # Gate C2 — 测试文档与报告
├── review/                 # Gate D — 评审报告
└── shipping/               # Gate E — 发布记录
```

| 目录 | 对应 Gate | 说明 |
|------|----------|------|
| `docs/tmp/` | 全部 | 过程临时产物，不入版本库 |
| `docs/requirements/` | Gate A | 需求澄清文档 |
| `docs/tasks/` | Gate B | 任务分解文档 |
| `docs/architecture/` | Gate B1 | 架构评审报告 |
| `docs/plans/` | Gate C | 执行计划 |
| `docs/implementation/` | Gate C-impl | 实现说明文档 |
| `docs/testing/` | Gate C2 | 测试用例与报告 |
| `docs/review/` | Gate D | 代码评审报告 |
| `docs/shipping/` | Gate E | 发布记录与版本日志 |

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
    │  流水线看板 + 归档 + Agent配置  │
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

jarvis hook gate-check [--session <id>]   # 检查当前 Gate 状态（阻断时 exit 1）
jarvis hook gate-advance [--session <id>]  # 推进到下一 Gate
jarvis hook status [--json]               # 流水线会话状态总览

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
GITHUB_TOKEN=xxx       # GitHub 个人访问令牌（sync-github-releases 需要）
```

也可直接设置环境变量（Linux/macOS）或通过系统环境变量配置（Windows）。

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

| 页面 | Hash 路由 | 功能 |
|------|----------|------|
| 流水线看板 | `#/dashboard` | 会话列表（任务名/指令标签/Gate状态）· MCP 平台接入状态 · 置顶/归档/删除 · 3-dot 操作菜单 |
| 归档记录 | `#/archive` | 已归档运行记录 · 按任务名搜索过滤 · 恢复到看板 · 永久删除 |
| 智能体配置 | `#/agents` | MCP 接入指示 · Agent 搜索/筛选 · 模型/思考等级配置 · 文件同步 |

侧边栏实时显示各平台（Claude Code / OpenCode / Codex）的 MCP 连接状态：绿点 = 已接入，灰点 = 未接入。

### 会话管理操作

| 操作 | 说明 |
|------|------|
| 设置名称 | MCP 工具 `session_set_name` → 替代会话 ID 显示 |
| 置顶 | 将活跃运行置顶到会话列表最前（📌 图标） |
| 归档 | 将运行记录移入归档面板，从看板隐藏 |
| 删除 | 永久删除运行记录（需确认，不可恢复） |

归档后的运行记录可在「归档记录」页面搜索、恢复或永久删除。

## 浏览器测试工作流

```
test-doc-writer → test-executor → fix-retest
   (编写用例)       (按文档执行)      (失败→修复→复测)
```

专为浏览器自动化测试设计的文档驱动闭环，集成在 Gate C2 阶段：

1. **test-doc-writer** — 编写结构化测试用例文档（步骤、预期结果），不执行测试
2. **test-executor** — 严格按照文档执行测试，产出通过/失败清单报告
3. **fix-retest** — 分析失败用例，spawn 对应修复 Agent，最多 2 轮修复-重测

## MCP 配置指南

### 贾维斯引擎（必选）

| 平台 | 配置文件 | Transport | 说明 |
|------|---------|-----------|------|
| **Claude Code** | `.mcp.json` | `type: stdio` → 自动拉起 `jarvis engine start --stdio` |
| **OpenCode** | `opencode.json` | `type: local` → 自动拉起 `jarvis engine start --stdio` |
| **Codex** | `.codex/config.toml` | `url = "localhost:3456/mcp"` → 需引擎已运行 |

### Visual Primitives MCP（推荐，纯文本模型必备）

[![npm](https://img.shields.io/npm/v/visual-primitives-mcp)](https://www.npmjs.com/package/visual-primitives-mcp)
[![GitHub](https://img.shields.io/badge/GitHub-Wjl1224734792%2Fvisual--primitives--mcp-black)](https://github.com/Wjl1224734792/visual-primitives-mcp)

基于 DeepSeek《Thinking with Visual Primitives》论文的视觉理解 MCP，将截图/图片转为精确的文字描述和坐标定位。**使用纯文本模型（如 DeepSeek）作为主力的用户强烈推荐**——它为纯文本模型提供了"眼睛"。

```json
{
  "mcpServers": {
    "visual-primitives": {
      "type": "stdio",
      "command": "npx",
      "args": ["visual-primitives-mcp"],
      "env": {
        "VISION_API_BASE_URL": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "VISION_API_KEY": "<你的百炼 API Key>",
        "VISION_MODEL_NAME": "qwen3.5-plus",
        "VISION_MODEL_OCR": "qwen3-vl-ocr"
      }
    }
  }
}
```

| 环境变量 | 说明 | 推荐值 |
|---------|------|--------|
| `VISION_MODEL_NAME` | 默认模型（describe/locate/video 共用） | `qwen3.5-plus` |
| `VISION_MODEL_DESCRIBE` | 场景描述专用模型（可选，不配则用默认） | `qwen3.5-plus` |
| `VISION_MODEL_LOCATE` | 坐标定位专用模型（可选） | `qwen3.5-plus` |
| `VISION_MODEL_VIDEO` | 视频分析专用模型（可选） | `qwen3.5-plus` |
| `VISION_MODEL_OCR` | OCR 文字识别专用模型 | `qwen3-vl-ocr` |

> **纯文本模型为什么需要它？** DeepSeek V4 等纯文本模型无法"看"图片。Visual Primitives MCP 将截图转为自然语言描述 + 坐标数据，让纯文本模型也能理解 UI 布局、定位元素、读取截图内容。

### 开发环境 MCP

开发 Jarvis 本身时，将引擎 MCP 指向本地工作区（无需全局安装）：

```json
{
  "mcpServers": {
    "jarvis-engine": {
      "type": "stdio",
      "command": "node",
      "args": ["bin/jarvis.js", "engine", "start", "--stdio"]
    }
  }
}
```

## 生命周期流水线

```
想法细化 → 需求澄清 → 任务分解 → 执行规划 → 并行实现 → 质量门 → 视觉验证 → 测试 → 评审 → 发布
  Gate 0     Gate A     Gate B     Gate C     Gate C     Gate C1   Gate C1.5  Gate C2  Gate D  Gate E
```

## 平台入口速查

> **仅 Claude Code 可用**。OpenCode / Codex 列仅供参考历史配置，实际不可用。

| 领域 | Claude Code（✅ 可用） | OpenCode（⛔ 不可用） | Codex（⛔ 不可用） |
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
| Agents | 88 | 55 | 45 |
| Commands | 16 | 0 | 0 |
| Skills | 29 | 27 | 42 |
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
| 会话命名 | `session_set_name` MCP 工具 | 👆 按需 |
| 流水线状态 | Dashboard + SSE 实时推送 | 👆 按需 |
| 会话隔离 | 每 session_id 独立 pipeline | 🔄 自动 |
| 文件同步 | Web 配置 → `.md`/`.toml` | 👆 保存时触发 |

## 发布流程

**开发 → 测试 → 推送 main → 打 Tag → GitHub Actions 自动发布**

1. 本地开发 + 测试通过：`npm run check && npm run build && cd web && npm run build`
2. 更新 `package.json` 版本号（语义化版本）
3. **同步更新 AGENTS.md / README.md / docs/README.md**
4. 提交 + 打 Tag：`git tag -a v<version> -m "v<version> - <概要>"`
5. 推送 GitHub **含 Tag**：`git push origin main && git push origin v<version>`
6. GitHub Actions：Release 工作流自动执行（质量检查 → Changelog → GitHub Release + 单 HTML 面板 → npm publish）
7. 验证：`npm view jarvis-agent-factory version` 确认版本

> 每次提交前自问：文档是否需要同步更新？

## 命令流程图

每个 Claude Code 命令的完整 Mermaid 流程图，展示 Gate 序列、Agent spawn 关系和并行/串行逻辑：

| 分类 | 命令 | 流程图 | Gate 序列 |
|------|------|--------|----------|
| **核心编排** | `/jarvis` | [jarvis.md](docs/flows/jarvis.md) | A→B→B1→C→C-impl→C1→C1.5→C2→D→E (10门) |
| | `/jarvis-lite` | [jarvis-lite.md](docs/flows/jarvis-lite.md) | 按任务类型智能映射入口 |
| **前端** | `/frontend` | [frontend.md](docs/flows/frontend.md) | A→B→B1→C→C-impl→C1→C1.5→C2→D→E (C1.5强制) |
| **后端** | `/backend` | [backend.md](docs/flows/backend.md) | A→B→B1→C→C-impl→C1→C2→D→E (跳过C1.5) |
| **移动端** | `/android` | [android.md](docs/flows/android.md) | A→B→C→C1→C2→D→E (7门) |
| | `/ios` | [ios.md](docs/flows/ios.md) | A→B→C→C1→C2→D→E (7门) |
| **跨端** | `/flutter` | [flutter.md](docs/flows/flutter.md) | A→B→C→C1→C2→D→E (7门) |
| | `/expo` | [expo.md](docs/flows/expo.md) | A→B→C→C1→C2→D→E (7门) |
| | `/taro` | [taro.md](docs/flows/taro.md) | A→B→C→C1→C2→D→E (7门) |
| **测试/修复** | `/browser-test` | [browser-test.md](docs/flows/browser-test.md) | 用例编写→执行→修复重测闭环 |
| | `/bug-fix` | [bug-fix.md](docs/flows/bug-fix.md) | 复现→根因→修复→验证 7步闭环 |
| **审查** | `/review` | [review.md](docs/flows/review.md) | 只读审查，不修改文件 |
| | `/review-fix` | [review-fix.md](docs/flows/review-fix.md) | 初审→规划→执行→验证→复审 |
| **架构/专家** | `/frontend-architect` | [frontend-architect.md](docs/flows/frontend-architect.md) | 问题收集→spawn架构师→呈现输出 |
| | `/backend-architect` | [backend-architect.md](docs/flows/backend-architect.md) | 问题收集→spawn架构师→呈现输出 |
| | `/algorithm-expert` | [algorithm-expert.md](docs/flows/algorithm-expert.md) | 问题收集→spawn算法专家→呈现输出 |

> 所有流程图使用 `flowchart TD` 统一风格。读取 `docs/flows/` 目录下的 `.md` 文件可在支持 Mermaid 的 Markdown 渲染器中查看。

## License

MIT
