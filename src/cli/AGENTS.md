<!-- Generated: 2026-06-04T10:30:00+08:00 -->
<!-- Parent: ../AGENTS.md -->

# src/cli — CLI 命令行入口

## Role
提供 `jarvis` CLI 的所有用户面向命令: 安装/移除/升级 AI 代理配置、管理 MCP 编排引擎生命周期、解决合并冲突、验证安装健康状态。

## Architecture
惰性加载命令模块 (CmdModule 接口) 避免启动时导入开销。参数解析手动完成 (ADR-5: 无 Commander.js)。npm 二进制入口 `bin/jarvis.js` 支持 dist/ 编译版本 + tsx 开发回退。

## Key Abstractions

| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| `CmdModule` | index.ts | type | `execute(opts, positional) => Promise<void>` 命令模块合约 |
| `COMMANDS` | index.ts | const | 惰性导入 `() => Promise<CmdModule>` 的命令路由表 |
| `CliOpts` | utils/args.ts | interface | 已解析 CLI 标志: yes, global, help, version |
| `PLATFORMS` | utils/constants.ts | const | 平台定义 (claude/opencode/codex) 含目录和描述 |
| `resolveScope()` | utils/scope.ts | function | 全局 vs 项目范围决策 (可注入 promptFn 便于测试) |
| `resolveTarget()` | utils/resolve.ts | function | 目标路径解析 (含路径遍历防护) |

## Key Files

| File | Role | Description |
|------|------|-------------|
| index.ts | CLI 入口 | 解析参数, 路由命令到惰性模块, 处理 --help/--version |
| commands/init.ts | 初始化 | 一键部署: 配置 + MCP + Hook |
| commands/add.ts | 添加 | 添加平台到项目 |
| commands/remove.ts | 移除 | 细粒度移除 (hash 记录追踪, --dry-run/--engine/--force) |
| commands/upgrade.ts | 升级 | 升级所有平台到最新模板 |
| commands/diff.ts | 差异 | 预览升级变更 (Section 级 Markdown diff, JSON 字段 diff) |
| commands/resolve.ts | 冲突解决 | 交互式或批量 (--accept) 合并冲突解决 |
| commands/engine.ts | 引擎管理 | start/stop/restart/status 生命周期 |
| commands/doctor.ts | 健康检查 | 委托给 src/doctor.ts |
| commands/hook.ts | Hook | 委托给 src/hook.ts |
| utils/args.ts | 参数解析 | 手动解析 -y/-g/-h/-v 标志 |
| utils/constants.ts | 常量 | 包元数据、平台定义、帮助文本 |

## Subdirectories

| Directory | Description | AGENTS |
|-----------|-------------|--------|
| commands/ | 11 个 CLI 命令实现 | (父级) |
| utils/ | 参数/常量/IO/路径/范围工具 | (父级) |

## Conventions
- **惰性加载**: 所有命令通过 `COMMANDS` 记录的工厂函数延迟加载
- **手动参数解析**: 无 Commander.js. 全局标志在 parseArgs() 处理, 命令特定标志在各 execute() 中手动解析
- **suppress-warnings.ts 必须第一个 import**: 在 index.ts 顶部静态导入
- **测试辅助可注入性**: resolveScope() 接受可选 promptFn 便于模拟

## Entry Points
- npm 二进制: `bin/jarvis.js`
- 开发: `npm run dev` → `tsx src/cli/index.ts`
- CLI 命令: init (默认), add, remove (rm), upgrade (update), diff, engine (start|stop|restart|status), web, hook, resolve, doctor (check)

## Dependencies
- **Internal:** src/install.ts, src/doctor.ts, src/hook.ts, src/hash-paths.ts, src/engine/server.ts, src/engine/guardian.ts, src/shared/markdown-utils.ts, src/shared/mcp-config.ts
- **External:** 无 (仅 Node.js 内置模块: fs, path, crypto, os, readline, child_process)

## For AI Agents
- **suppress-warnings.ts 必须始终是 index.ts 中的第一个静态 import**
- **新命令**: 在 COMMANDS 记录中注册 → 实现 execute(opts, positional) → 更新 getHelpText()
- **不引入 Commander.js/yargs/minimist** (ADR-5)
- **测试**: 仅 cli-scope.test.ts 存在. 新命令需添加对应测试
- **平台冻结**: opencode/codex 在帮助文本中标记为 ⛔; claude 是主要维护目标

<!-- MANUAL:START -->
<!-- MANUAL:END -->
