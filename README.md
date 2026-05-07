# Jarvis Agent Factory · 贾维斯智能体工厂

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-v3.7.2-green)](https://gitee.com/wujl1124/JarvisAgentFactory/releases)
[![npm](https://img.shields.io/npm/v/jarvis-agent-factory)](https://www.npmjs.com/package/jarvis-agent-factory)
<br>**简体中文** | [English](./README_EN.md)

跨平台多智能体 AI 编程助手配置集 + MCP 编排引擎。从想法到交付的完整软件开发流水线，支持 **Claude Code / OpenCode / Codex** 三平台。

> **v3.7.2** — 提示词工程（软约束）→ 引擎驱动（硬约束），FSM 直接拒绝非法操作

## 快速开始

```bash
npm i -g jarvis-agent-factory   # 安装 CLI
jarvis init my-app -y           # 一键部署三平台配置 + MCP + 钩子
cd my-app
jarvis engine start --dashboard # 启动编排引擎 + Web 面板
# → http://localhost:3456/dashboard
```

然后在你用的平台里开始开发。引擎会在后台自动检查 Gate 条件，Dashboard 实时显示进度。

---

## 怎么用：完整流程

### 第一步：部署

```bash
jarvis init ./my-project        # 安装全部三平台配置 + MCP + 钩子
```

这一步会在项目里生成：

```
my-project/
├── .claude/          ← Claude Code: 47 agents + 15 命令 + 27 skills
│   └── settings.json ← 含引擎钩子（PostToolUse{Agent} → gate-check）
├── .opencode/        ← OpenCode: 55 agents + 27 skills
├── .codex/           ← Codex: 45 agents + 42 skills
│   └── hooks.json    ← Codex 钩子
├── .mcp.json         ← Playwright + Jarvis Engine MCP 配置
└── opencode.json     ← OpenCode MCP 配置
```

### 第二步：启动引擎

```bash
jarvis engine start --dashboard   # 后台运行 + Web 面板
jarvis engine start               # 纯后台（无面板）
```

引擎监听 `localhost:3456`，SQLite 持久化状态到 `.jarvis/engine.db`。

### 第三步：在平台里开发

**Claude Code：**
```
/jarvis "做一个登录页"
```
命令自动按 Gate A→B→C→... 流程推进。每次 spawn 子 Agent 后，引擎钩子自动触发 `gate-check` 验证条件。

**OpenCode：**
```bash
opencode --agent frontend        # 切换到前端编排中枢
# 然后说"做一个登录页"
```
OpenCode 原生兼容 Claude Code 钩子格式，同样自动触发 `gate-check`。

**Codex：**
```bash
codex                            # 启动后加载 jarvis skill
# 然后说"做一个登录页"
```
Codex 钩子在每次 Bash 工具执行后自动触发 gate-check。

### 第四步：查看进度

打开 `http://localhost:3456/dashboard` 查看：
- Gate 进度条（A→B→C→...→E）
- 点 Gate 行 → 检查条件是否满足
- 点 **Advance →** 推进到下一 Gate
- `/agents` 页配置每个子 Agent 的模型

### 引擎提供的能力

| 能力 | 机制 | 自动/手动 |
|------|------|----------|
| 每次 Agent spawn 后检查 Gate 条件 | **钩子**（PostToolUse） | 🔄 自动 |
| 条件不满足时报警 | **钩子** → `gate_enforce` | 🔄 自动 |
| 推进到下一个 Gate | `jarvis hook gate-advance` | 👆 编排者手动调用 |
| 跳过 Gate 被拒绝 | **FSM** 硬约束 | 🔄 自动 |
| 乱序推进被拒绝 | **FSM** 硬约束 | 🔄 自动 |
| 查看流水线状态 | **Dashboard** / `jarvis hook status` | 👆 按需 |
| Session 并发控制 | **Leader 选举 + 写锁** | 🔄 自动 |

---

## 三平台适配确认

| 适配项 | Claude Code | OpenCode | Codex |
|------|:--:|:--:|:--:|
| **编排入口** | `/` 命令 | 智能体切换 `--agent` | Skill 加载 |
| **子 Agent 格式** | `.md` + `tools:` | `.md` + `permission:` | `.toml` + `sandbox_mode` |
| **Spawn 机制** | `Agent()` | `Task()` | Task via skill |
| **钩子机制** | `settings.json` hooks | 原生兼容 Claude 格式 | `.codex/hooks.json` |
| **MCP 引擎连接** | `.mcp.json` `:3456/mcp` | `opencode.json` `:3456/mcp` | `config.toml` `:3456/mcp` |
| **Playwright MCP** | ✅ 28 tools | ✅ `mcp: playwright: allow` | ✅ config.toml |
| **e2e/browser-test 边界** | ✅ 明确分离 | ✅ 明确分离 | ✅ 明确分离 |
| **required_skills** | ✅ 4处 | ✅ 4处 | ✅ jarvis skill |
| **子 Agent 隔离** | `Skill` tool | `task: deny` (44 agent) | TOML 独立 |

---

## CLI 命令

```bash
jarvis                                  # 引导当前目录
jarvis init [path] -y                   # 初始化项目
jarvis add <claude|opencode|codex>      # 添加平台（多选）
jarvis remove <platform> [path]         # 移除平台
jarvis upgrade [path]                   # 升级配置
jarvis doctor [path]                    # 健康检查

jarvis engine start [--dashboard]       # 启动编排引擎
jarvis engine stop                      # 停止引擎
jarvis engine status                    # 引擎状态

jarvis hook gate-check                  # 钩子：检查 Gate 条件
jarvis hook gate-advance                # 钩子：推进 Gate
jarvis hook status [--json]             # 钩子：流水线状态

# 选项：-g 全局  -y 跳过确认  -v 版本  -h 帮助
```

---

## 闭环体系

| # | 闭环 | 流程 |
|---|------|------|
| 1 | **开发** | 实现 → Gate C1 质量门 → Gate C2 测试门 → 失败回退 |
| 2 | **测试** | 写用例 → agent-browser 执行 → 截图 → 失败→修复→重测 |
| 3 | **Bug 修复** | Bug → agent-browser 复现 → 定位根因 → 修复 → 验证 |
| 4 | **审查** | 初审 → 规划 → 执行 → 验证 → 复审关闭 |
| 5 | **安全** | security-auditor → 威胁建模 + CVE + SAST → 修复 |
| 6 | **契约** | api-docs-worker 模式A → 对比 auto spec vs 实现 → 标记漂移 |

---

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

---

## 统计

| | Claude Code | OpenCode | Codex |
|---|:--:|:--:|:--:|
| Agents | 47 | 55 | 45 |
| Commands | 15 | 0 | 0 |
| Skills | 27 | 27 | 42 |
| 钩子 | settings.json | 兼容 Claude 格式 | hooks.json |

---

## License

MIT
