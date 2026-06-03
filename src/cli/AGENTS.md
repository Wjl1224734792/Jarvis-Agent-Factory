<!-- Generated: 2026-06-03 -->
<!-- Parent: ../AGENTS.md -->

# cli — CLI 命令入口

## Role
面向用户的 CLI 入口层。将命令行参数解析并路由到对应命令处理器。所有命令模块均为薄包装——解析参数后委托给 `src/` 核心模块。零第三方运行时依赖，仅 Node.js 内置模块。

## Key Abstractions
| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| `run()` | index.ts | async fn | 主 CLI 协调器：解析参数、处理 --help/--version、延迟加载命令 |
| `COMMANDS` | index.ts | const | 14 条目命令映射表，惰性 `import()` 加载 |
| `parseArgs()` | utils/args.ts | fn | 手动参数解析器，产出 `CliOpts` |
| `PKG_ROOT` | utils/constants.ts | const | 包根目录解析（兼容 dist/ 和 tsx） |
| `resolveTarget()` | utils/resolve.ts | fn | 路径解析 + 遍历边界安全检查 |

## Key Files
| File | Role | Description |
|------|------|-------------|
| bin/jarvis.js | npm bin 入口 | Shebang 脚本，优先 dist 路径，回退 tsx |
| index.ts | 命令分发器 | 参数解析 → 全局标志处理 → 命令路由 |
| utils/constants.ts | 配置枢纽 | PKG_ROOT/版本/平台注册/帮助文本/全局路径 |
| utils/args.ts | 参数解析 | 自实现解析器 |
| commands/init.ts | 安装引导 | 全部平台安装，版本更新提醒 |
| commands/remove.ts | 细粒度移除 | Hash 感知，--dry-run/--engine/--force |
| commands/diff.ts | 差异预览 | Section 级 Markdown diff + JSON diff |
| commands/engine.ts | 引擎生命周期 | start/stop/restart/status |
| commands/resolve.ts | 冲突解决 | 合并冲突标记交互式解决 |

## For AI Agents
- 新增命令: `commands/` 下创建文件 → 导出 `execute` → `index.ts` COMMANDS 注册
- 命令专用标志在命令内部解析，全局标志才加 `utils/args.ts`

<!-- MANUAL:START -->
<!-- MANUAL:END -->
