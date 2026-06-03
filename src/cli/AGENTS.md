<!-- Generated: 2026-06-03T16:32:00+08:00 -->
<!-- Parent: ../AGENTS.md -->

# cli — CLI 命令入口

## Purpose
CLI 命令行入口层——实现 `jarvis` / `jaf` 命令的注册、路由、参数解析，以及所有子命令（init/add/remove/upgrade/diff/doctor/engine/hook/resolve）的执行流程。

## Architecture

```
cli/
├── index.ts              # 命令路由表 + run() 主入口
├── commands/
│   ├── init.ts           # 安装所有平台配置 + MCP
│   ├── add.ts            # 添加指定平台配置
│   ├── remove.ts         # 细粒度移除（hash 匹配）
│   ├── upgrade.ts        # 升级已安装配置
│   ├── diff.ts           # 差异预览（Markdown section + JSON field 级）
│   ├── doctor.ts         # 安装健康检查
│   ├── engine.ts         # 引擎 start/stop/restart/status 路由
│   ├── engine-restart.ts # 引擎重启（stop+500ms+start）
│   ├── engine-status.ts  # PID 文件读取+运行状态显示
│   ├── hook.ts           # 钩子管理
│   └── resolve.ts        # 冲突解决（交互式+批量模式）
└── utils/
    ├── args.ts           # 手动 CLI 参数解析（无 Commander.js）
    ├── constants.ts      # 平台定义、帮助文本、全局路径
    ├── io.ts             # readline 交互式 I/O
    ├── resolve.ts        # 路径解析+越界防护、npm 版本查询
    └── scope.ts          # 全局 vs 项目范围判断
```

## Role
CLI 入口——用户启动 Jarvis 的第一接触点。所有用户交互经由此层转发至核心安装引擎（install.ts）、MCP 引擎（engine/server.ts）、诊断模块（doctor.ts）等下游模块。

## Key Abstractions

| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| `run()` | index.ts | function | 顶层 CLI 入口——解析参数、路由命令 |
| `COMMANDS` | index.ts | Record | 命令名→动态 import 映射（延迟加载） |
| `CliOpts` | utils/args.ts | interface | 解析后的 CLI 选项（yes/global/help/version） |
| `resolveScope()` | utils/scope.ts | function | 解析全局 vs 项目安装范围 |
| `resolveTarget()` | utils/resolve.ts | function | 目标路径解析（含路径遍历防护） |
| `execute()` | commands/*.ts | function | 统一命令签名 `(opts, positional) => Promise<void>` |

## Key Files

| File | Role | Description |
|------|------|-------------|
| `index.ts` | CLI 入口 | 命令路由表 + 延迟加载 + run() 主入口 |
| `commands/init.ts` | 初始化 | 安装所有平台配置+MCP，版本更新检测 |
| `commands/remove.ts` | 移除 | 细粒度移除（hash 记录匹配），支持 --dry-run/--list |
| `commands/diff.ts` | 差异对比 | Markdown section 级别 + JSON 字段级别差异预览 |
| `commands/resolve.ts` | 冲突解决 | 交互式和批量模式解决合并冲突 |
| `utils/args.ts` | 参数解析 | 手动 CLI 参数解析（遵循 ADR-5） |
| `utils/constants.ts` | 常量 | 平台定义、帮助文本、全局安装路径 |

## Conventions
- **命令式架构**: 每个命令导出 `execute(opts: CliOpts, positional: string[]) => Promise<void>`
- **无 Commander.js**: 手动解析 process.argv（ADR-5）
- **延迟加载**: COMMANDS 使用 `() => import(...)` 加速启动
- **Hash 追踪**: `file-hashes.json` 记录 SHA256，实现细粒度 diff 和 remove
- **中文输出**: 所有用户面向的 CLI 输出为中文
- **安全防护**: `resolveTarget` 有路径遍历越界检查

## Entry Points
- `src/cli/index.ts → run()` — 主入口（bin/jarvis.js 调用）
- 无参数默认执行 `jarvis init .`
- `jarvis web` 直接调用 `executeWeb`（不走 COMMANDS 映射）

## Internal Dependencies
- `../../install.ts` — 核心安装引擎（init/add/upgrade 三方共享）
- `../../doctor.ts` — 诊断模块
- `../../hook.ts` — 钩子系统
- `../../engine/server.ts` — 引擎启动/停止
- `../../shared/markdown-utils.ts` — Markdown 解析/哈希（diff/resolve 共享）
- `../../hash-paths.ts` — hash 文件路径（diff/remove/resolve 三方共享）

## External Dependencies
全部 Node.js 内置模块，无第三方 CLI 框架依赖

## For AI Agents
- **新增命令**: 在 `commands/` 添加 `.ts` 文件，导出 `execute()`，在 `index.ts::COMMANDS` 注册
- **修改 install.ts**: 检查 diff.ts/remove.ts/resolve.ts 三方的兼容性
- **修改 PLATFORMS**: 同步更新 GLOBAL_ROOTS 和 doctor.ts 中的 `getExpected` 数字
- **修改 markdown-utils.ts**: 检查 CLI 中所有 hash 相关逻辑

<!-- MANUAL:START -->
<!-- MANUAL:END -->
