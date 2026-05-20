# Jarvis Agent Factory · 贾维斯智能体工厂

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-v4.3.8-green)](https://github.com/Wjl1224734792/Jarvis-Agent-Factory/releases)
[![npm](https://img.shields.io/npm/v/jarvis-agent-factory)](https://www.npmjs.com/package/jarvis-agent-factory)
[![Visual Primitives MCP](https://img.shields.io/badge/DeepSeek-Visual%20Primitives%20MCP-purple)](https://github.com/Wjl1224734792/visual-primitives-mcp)
<br>💡 **纯文本模型（如 DeepSeek）主力用户** → 搭配 [Visual Primitives MCP](https://github.com/Wjl1224734792/visual-primitives-mcp) 获得视觉理解能力
<br>**简体中文** | [English](./README_EN.md)

AI 编程助手配置集 + MCP 编排引擎。从想法到交付的完整软件开发流水线，<br>**仅支持 Claude Code**。

> **v4.3.8** — 文档目录迁移 docs/→.jarvis/，统一产物管理

## 快速开始

```bash
npm i -g jarvis-agent-factory   # 安装 CLI（零原生依赖，node:sqlite 内置）
jarvis init -y                   # 一键部署配置 + MCP + 钩子
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
| **Agent Team 支持** | `jarvis init` 自动启用 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`，Team + SubAgent 混合编排 |
| **智能路由** | `/auto` 自动检测任务→路由最优流水线→跳过无关Gate→按复杂度分配Agent |
| **多流水线类型** | full / frontend / backend / lite / refactor / hotfix / migrate / evaluate / debug / research / release / ask / simplify / trace / improve 共 15 种模式，按需选择 |
| **项目记忆系统** | `.jarvis/memory/` 跨会话笔记/决策记录/项目上下文，OMC 风格持久化 |
| **会话事件日志** | `session_events` 表记录生命周期事件，跨会话可观测性 |
| **项目级存储隔离** | `<project>/.jarvis/` 独立数据库 + PID，每个项目跨会话记忆不跨项目共享 |
| **会话管理** | 会话命名（MCP session_set_name）· 归档/删除 · 置顶 · 指令标签（/jarvis 等） |
| **Web 面板** | 数据看板首页（#/）· 流水线看板（#/dashboard）· 归档（#/archive）· Agent 配置（#/agents）· SSE 实时推送 |
| **远程面板** | 单 HTML 文件下载即可打开，无需本地 web 构建 |
| **Agent 配置** | Web 面板修改模型/思考等级 → 自动同步回 `.md` 源文件 |
| **浏览器测试** | 文档驱动工作流：test-doc-writer → test-executor → remediation-expert 闭环 |
| **智能安装** | Hash 对比只覆盖变更文件，用户自定义自动保留 |
| **智能 MCP 合并** | `jarvis upgrade` / `jarvis init` 增量合并 MCP 配置，不覆盖用户自定义服务 |
| **智能 env 合并** | `jarvis init` 增量合并 settings.json env，保护用户自定义环境变量 |
| **Hook/Plugin** | Claude Code hooks + MCP 全覆盖 |
| **平台扩展** | `platform_info` MCP 工具 + `/api/platforms` REST 端点 |
| **零原生依赖** | Node 22.5+ 内置 `node:sqlite`，安装秒级完成 |

## 平台维护状态

| 平台 | 维护状态 | 说明 |
|------|---------|------|
| **Claude Code** | ✅ 维护中 | 唯一支持平台，所有功能、Agent、技能持续迭代 |

## 产物目录规范

流水线各阶段智能产出物按 Gate 存入对应子目录，临时文件统一管理：

```
.jarvis/
├── tmp/                    # 临时产物（截图、快照、导出的验证数据等，已 .gitignore 排除）
├── YYYY-MM-DD/             # ★ 日期分类目录（唯一合法格式）
│   ├── requirements/       # Gate A — 需求文档
│   ├── tasks/              # Gate B — 任务分解文档
│   ├── architecture/       # Gate B1 — 架构评审产出
│   ├── plans/              # Gate C — 执行计划文档
│   ├── implementation/     # Gate C-impl — 实现文档
│   ├── testing/            # Gate C2 — 测试文档与报告
│   ├── review/             # Gate D — 评审报告
│   └── shipping/           # Gate E — 发布记录
```

| 目录 | 对应 Gate | 说明 |
|------|----------|------|
| `.jarvis/tmp/` | 全部 | 过程临时产物，不入版本库 |
| `.jarvis/YYYY-MM-DD/requirements/` | Gate A | 需求澄清文档 |
| `.jarvis/YYYY-MM-DD/tasks/` | Gate B | 任务分解文档 |
| `.jarvis/YYYY-MM-DD/architecture/` | Gate B1 | 架构评审报告 |
| `.jarvis/YYYY-MM-DD/plans/` | Gate C | 执行计划 |
| `.jarvis/YYYY-MM-DD/implementation/` | Gate C-impl | 实现说明文档 |
| `.jarvis/YYYY-MM-DD/testing/` | Gate C2 | 测试用例与报告 |
| `.jarvis/YYYY-MM-DD/review/` | Gate D | 代码评审报告 |
| `.jarvis/YYYY-MM-DD/shipping/` | Gate E | 发布记录与版本日志 |

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
         ▲            │
    .mcp.json   jarvis web
 Claude Code
 (stdio 自动拉起引擎)                               
```

## CLI 命令

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

## 智能路由编排 `/auto`

自动检测任务类型 → 路由最优流水线 → 智能跳过无关 Gate → 按复杂度分配 Team/Subagent：

| 任务类型 | 路由流水线 | 入口 Gate | 示例 |
|---------|-----------|-----------|------|
| 新功能开发 | `full` | Gate A | 中大型功能 |
| Bug 修复 | `full` | Gate C | 小范围修复 |
| 小修改 | `full` | Gate C-impl | <3文件改动 |
| 重构 | `refactor` | R1 | 代码重构、性能优化 |
| 紧急修复 | `hotfix` | H0 | P0/P1 故障 |
| 代码审查 | `full` | Gate D | PR review |
| 技术调研 | `research` | RS0 | 技术选型、方案研究 |
| 调试诊断 | `debug` | D0 | 异常排查、根因定位 |
| 代码简化 | `simplify` | S0 | 冗余清理、AI痕迹清除 |
| 迭代改进 | `improve` | IM0 | 度量驱动迭代 |
| 框架迁移 | `migrate` | M1 | 框架升级、依赖替换 |
| 发布上线 | `release` | RL0 | 快速发布 |
| 无法分类 | `full` | Gate A | 默认全流程 |

用法：在 Claude Code 中输入 `/auto <任务描述>` 即可启动。**不确定用什么指令时，直接用 `/auto`。**

## Web 面板

使用 `jarvis web` 独立启动（需先运行 `jarvis engine start`），默认端口 3457。

| 页面 | Hash 路由 | 功能 |
|------|----------|------|
| 数据看板 | `#/` | 总会话/运行记录/流水线分布/Gate 分布/Agent 配置统计 · SSE 实时更新 |
| 流水线看板 | `#/dashboard` | 会话列表（任务名/指令标签/Gate状态）· MCP 平台接入状态 · 置顶/归档/删除 |
| 归档记录 | `#/archive` | 已归档运行记录 · 按任务名搜索过滤 · 恢复到看板 · 永久删除 |
| 智能体配置 | `#/agents` | MCP 接入指示 · Agent 搜索/筛选 · 模型/思考等级配置 · 文件同步 |
| 项目介绍 | `/commands-reference.html` | 项目概览 · 30条指令流程详解 · 71个Agent目录 · 流水线架构 · 使用推荐 |

侧边栏实时显示 Claude Code 的 MCP 连接状态：绿点 = 已接入，灰点 = 未接入。

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
test-doc-writer → test-executor → remediation-expert
   (编写用例)       (按文档执行)      (失败→修复→复测)
```

专为浏览器自动化测试设计的文档驱动闭环，集成在 Gate C2 阶段：

1. **test-doc-writer** — 编写结构化测试用例文档（步骤、预期结果），不执行测试
2. **test-executor** — 严格按照文档执行测试，产出通过/失败清单报告
3. **remediation-expert** — 分析失败用例，spawn 对应修复 Agent，最多 2 轮修复-重测

## MCP 配置指南

### 贾维斯引擎（必选）

| 平台 | 配置文件 | Transport | 说明 |
|------|---------|-----------|------|
| **Claude Code** | `.mcp.json` | `type: stdio` → 自动拉起 `jarvis engine start --stdio` |

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
想法细化 → 需求澄清 → 任务分解(DDD→BDD→TDD) → 架构评审 → 执行规划 → 并行实现 → 质量门 → 视觉验证 → 测试 → 评审 → 质量重检 → 发布
  Gate 0     Gate A     Gate B              Gate B1    Gate C     Gate C-impl Gate C1   Gate C1.5  Gate C2  Gate D  Gate E(前置) Gate E
```

## 平台入口速查（Claude Code）

| 领域 | Claude Code |
|------|------------|
| 全栈 | `/jarvis` |
| 智能路由 | `/auto` |
| 前端 | `/frontend` |
| 后端 | `/backend` |
| Android | `/android` |
| iOS | `/ios` |
| Flutter | `/flutter` |
| Expo | `/expo` |
| Taro | `/taro` |
| React Native | `/react-native` |
| 审查 | `/review` |
| 修复闭环 | `/review-fix` |
| 浏览器测试 | `/browser-test` |
| Bug 修复 | `/bug-fix` |
| 算法专家 | `/algorithm-expert` |
| 前端架构 | `/frontend-architect` |
| 后端架构 | `/backend-architect` |
| **任务分解** | |
| 领域驱动分析 | `/task-ddd` |
| 行为驱动场景 | `/task-bdd` |
| 测试驱动任务 | `/task-tdd` |
| **探索与研究** | |
| 需求探询 | `/ask` |
| 深度研究 | `/research` |
| 浏览器探索 | `/browser-explore` |
| **工程优化** | |
| 代码简化 | `/simplify` |
| 因果追踪 | `/trace` |
| 迭代改进 | `/improve` |
| **测试** | |
| 单元测试 | `/test-unit` |
| 集成测试 | `/test-integration` |
| 端到端测试 | `/test-e2e` |
| 性能测试 | `/test-perf` |
| 安全测试 | `/test-security` |
| **工程** | |
| 重构安全网 | `/refactor` |
| 紧急热修复 | `/hotfix` |
| 框架迁移 | `/migrate` |
| 技术评估 | `/evaluate` |
| 调试诊断 | `/debug` |
| **发布与同步** | |
| 完整发布流 | `/publish` |
| 快速发布 | `/release` |
| 文档同步 | `/sync` |
| 流程管理 | `/skill-flow` |

## 统计

| | Claude Code |
|---|:--:|
| Agents | 71 |
| Commands | 30 |
| Skills | 35 |
| Pipeline | 15 条流水线（full/lite/frontend/backend/refactor/hotfix/migrate/evaluate/debug/research/release/ask/simplify/trace/improve） |
| 钩子 | settings.json |
| MCP | `.mcp.json` |

## 引擎能力矩阵

| 能力 | 机制 | 触发方式 |
|------|------|----------|
| Agent spawn 后检查 Gate | Hook/Plugin → `gate_check` | 🔄 自动（engine auto-start via stdio） |
| 条件不满足报警 | Hook/Plugin → `gate_enforce` | 🔄 自动 |
| 推进 Gate | `advance_gate` MCP 工具 | 👆 编排者手动 |
| 轻量入口跳转 | `gate_jump` MCP 工具（lite 模式） | 👆 编排者手动 |
| 跳过/回退 Gate 拒绝 | FSM 硬约束 | 🔄 自动 |
| 操作前 Gate 检查 | `gate_check` MCP 工具 | 🔄 自动 |
| Team/SubAgent 策略 | `pipeline_guide` → `team_strategy` + `agent_mode` | 👆 按需 |
| 流程指引 | `pipeline_guide` MCP 工具 | 👆 按需 |
| 平台信息 | `platform_info` MCP 工具 | 👆 按需 |
| 会话命名 | `session_set_name` MCP 工具 | 👆 按需 |
| 流水线状态 | Dashboard + SSE 实时推送 | 👆 按需 |
| 项目级会话隔离 | `<project>/.jarvis/engine.db` 独立数据库 | 🔄 自动 |
| Agent 配置 | Web 面板配置 → `.md`/`.toml` 文件同步 | 👆 保存时触发 |

## 发布流程

**质量重检 → 测试 → 推送 main → 打 Tag → GitHub Actions 自动发布**

1. 🔴 **最终质量重检**（Gate E 前置条件，不可跳过）：
   - Lint + Type-check + Build + Deps Audit 全部通过
   - 测试套件全部通过（`npm test`）
   - 失败 → 修复 → 重跑全部，最多 2 轮
2. 更新 `package.json` 版本号（语义化版本）
3. **同步更新 AGENTS.md / README.md / docs/README.md**
4. 提交 + 打 Tag：`git tag -a v<version> -m "v<version> - <概要>"`
5. 推送 GitHub **含 Tag**：`git push origin main && git push origin v<version>`
6. GitHub Actions：Release 工作流自动执行（质量检查 → Changelog → GitHub Release + 单 HTML 面板 → npm publish）
7. 验证：`npm view jarvis-agent-factory version` 确认版本

> 每次提交前自问：文档是否需要同步更新？质量重检是否已通过？

## 命令流程图

每个 Claude Code 命令的完整介绍，包含项目概览、40条指令的详细流程（含 Gate 序列和 Agent spawn 关系）、71个智能体目录、流水线架构和使用推荐：[项目介绍页](https://github.com/Wjl1224734792/Jarvis-Agent-Factory/blob/main/web/public/commands-reference.html)

| 分类 | 命令 | 流程图 | Gate 序列 |
|------|------|--------|----------|
| **核心编排** | `/jarvis` | [jarvis.md](docs/flows/jarvis.md) | A→B→B1→C→C-impl→C1→C1.5→C2→D→E (10门) |
| | `/auto` | [auto.md](docs/flows/auto.md) | 自动检测任务→路由最优流水线→跳过无关Gate→分配Agent |
| **前端** | `/frontend` | [frontend.md](docs/flows/frontend.md) | A→B→B1→C→C-impl→C1→C1.5→C2→D→E (C1.5强制) |
| **后端** | `/backend` | [backend.md](docs/flows/backend.md) | A→B→B1→C→C-impl→C1→C2→D→E (跳过C1.5) |
| **移动端** | `/android` | [android.md](docs/flows/android.md) | A→B→B1→C→C-impl→C1→C1.5→C2→D→E (C1.5强制) |
| | `/ios` | [ios.md](docs/flows/ios.md) | A→B→B1→C→C-impl→C1→C1.5→C2→D→E (C1.5强制) |
| **跨端** | `/flutter` | [flutter.md](docs/flows/flutter.md) | A→B→B1→C→C-impl→C1→C1.5→C2→D→E (C1.5强制) |
| | `/expo` | [expo.md](docs/flows/expo.md) | A→B→B1→C→C-impl→C1→C1.5→C2→D→E (C1.5强制) |
| | `/taro` | [taro.md](docs/flows/taro.md) | A→B→B1→C→C-impl→C1→C1.5→C2→D→E (C1.5强制) |
| | `/react-native` | [react-native.md](docs/flows/react-native.md) | A→B→B1→C→C-impl→C1→C1.5→C2→D→E (C1.5强制) |
| **测试/修复** | `/browser-test` | [browser-test.md](docs/flows/browser-test.md) | 用例编写→执行→修复重测闭环 |
| | `/bug-fix` | [bug-fix.md](docs/flows/bug-fix.md) | 复现→根因→修复→验证 7步闭环 |
| **审查** | `/review` | [review.md](docs/flows/review.md) | 只读审查，不修改文件 |
| | `/review-fix` | [review-fix.md](docs/flows/review-fix.md) | 初审→规划→执行→验证→复审 |
| **架构/专家** | `/frontend-architect` | [frontend-architect.md](docs/flows/frontend-architect.md) | 问题收集→spawn架构师→呈现输出 |
| | `/backend-architect` | [backend-architect.md](docs/flows/backend-architect.md) | 问题收集→spawn架构师→呈现输出 |
| | `/algorithm-expert` | [algorithm-expert.md](docs/flows/algorithm-expert.md) | 问题收集→spawn算法专家→呈现输出 |
| **测试体系** | `/test-unit` | [test-unit.md](docs/flows/test-unit.md) | 检测框架→分析代码→生成(Red)→运行(Green)→重构 |
| | `/test-integration` | [test-integration.md](docs/flows/test-integration.md) | 识别契约→启动环境→生成→运行→清理 |
| | `/test-e2e` | [test-e2e.md](docs/flows/test-e2e.md) | 用户故事→选工具→编写→运行→报告 |
| | `/test-perf` | [test-perf.md](docs/flows/test-perf.md) | 定义目标→选择工具→建立基线→负载测试→定位瓶颈 |
| | `/test-security` | [test-security.md](docs/flows/test-security.md) | 确认授权→爬取→主动扫描→修复→报告 |
| **工程** | `/refactor` | [refactor.md](docs/flows/refactor.md) | R1边界→R2基线→R3重构→R4漂移检测→R5报告 (5门) |
| | `/hotfix` | [hotfix.md](docs/flows/hotfix.md) | H0声明→H1修复→H2验证→H3审计 (4门) |
| | `/migrate` | [migrate.md](docs/flows/migrate.md) | M1规则→M2迁移→M3编译→M4 Lint (4门) |
| | `/evaluate` | [evaluate.md](docs/flows/evaluate.md) | E0标准→E1原型→E2指标→E3报告 (4门) |
| | `/debug` | [debug.md](docs/flows/debug.md) | D0收集→D1复现→D2调试→D3诊断→D4报告 (5门) |

| **研究** | `/research` | [research.md](docs/flows/research.md) | RS0课题→RS1收集→RS2分析→RS3验证→RS4报告 (5门) |
| **发布** | `/release` | [release.md](docs/flows/release.md) | RL0检测→RL1质量→RL2版本→RL3发布→RL4验证 (5门) |
| **探询** | `/ask` | [ask.md](docs/flows/ask.md) | K0摄入→K1收集→K2分析→K3产出 (4门,4模式自适应) |
| **简化** | `/simplify` | [simplify.md](docs/flows/simplify.md) | S0分析→S1简化→S2验证→S3报告 (4门) |
| **追踪** | `/trace` | [trace.md](docs/flows/trace.md) | T0框架→T1假设→T2证据→T3分析→T4方案 (5门) |
| **改进** | `/improve` | [improve.md](docs/flows/improve.md) | IM0目标→IM1研究→IM2计划→IM3执行→IM4评估 (5门,迭代循环) |
| **核心编排** | `/publish` | [publish.md](docs/flows/publish.md) | 环境检测→质量门→测试→版本→commit→push→PR→合并→tag→发布 |
| | `/sync` | [sync.md](docs/flows/sync.md) | 检查并同步核心文档与代码一致性 |
| | `/skill-flow` | [skill-flow.md](docs/flows/skill-flow.md) | 会话流程导出为Skill模板(export/save/list/apply) |
| | `/browser-explore` | [browser-explore.md](docs/flows/browser-explore.md) | browser-use自主探索+UI bug发现+结构化报告 |
| | `/task-bdd` | [task-bdd.md](docs/flows/task-bdd.md) | BDD行为驱动：Gherkin场景编写 |
| | `/task-ddd` | [task-ddd.md](docs/flows/task-ddd.md) | DDD领域驱动：聚合/实体/值对象分析 |
| | `/task-tdd` | [task-tdd.md](docs/flows/task-tdd.md) | TDD测试驱动：测试骨架+任务包生成 |
> 所有流程图使用 `flowchart TD` 统一风格。读取 `docs/flows/` 目录下的 `.md` 文件可在支持 Mermaid 的 Markdown 渲染器中查看。

## License

MIT
