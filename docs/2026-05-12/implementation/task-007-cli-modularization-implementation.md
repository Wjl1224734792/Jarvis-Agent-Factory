# TASK-007 CLI 模块化重构实现文档

## 1. 当前实现目标

将 `src/cli.ts`（379行单体文件）拆分为模块化结构：`src/cli/index.ts` + `commands/*.ts` + `utils/*.ts`。遵循 ADR-5 不引入 Commander.js，保持手动参数解析。

## 2. 对应需求 ID / 任务 ID

- **需求**: REQ-043
- **任务**: TASK-007
- **规划文档**: `docs/plans/2026-05-12-realtime-pubsub-plan.md`

## 3. 变更文件 / 变更范围

### 新建文件

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/cli/index.ts` | 56 | CLI 入口，命令路由 + 全局标志处理 |
| `src/cli/utils/args.ts` | 42 | `parseArgs` 手动参数解析 |
| `src/cli/utils/constants.ts` | 77 | `PLATFORMS`, `ALL_PLATFORMS`, `GLOBAL_ROOTS`, `PKG_*`, `getHelpText()` |
| `src/cli/utils/io.ts` | 26 | `confirm`, `question` 交互式 I/O |
| `src/cli/utils/resolve.ts` | 43 | `resolveTarget`, `checkLatest`, `semverGt` |
| `src/cli/utils/scope.ts` | 32 | `resolveScope`（可注入 promptFn）+ `promptScope` |
| `src/cli/commands/init.ts` | 38 | `jarvis init [path]` + `jarvis`（无参数默认行为） |
| `src/cli/commands/add.ts` | 47 | `jarvis add <platform...> [path]` |
| `src/cli/commands/remove.ts` | 78 | `jarvis remove <platform...> [path]`，含 `removeMcp` 内部函数 |
| `src/cli/commands/upgrade.ts` | 43 | `jarvis upgrade [path]` |
| `src/cli/commands/diff.ts` | 78 | `jarvis diff [path]`，含 `diffPlatform` 内部函数 |
| `src/cli/commands/engine.ts` | 41 | `jarvis engine <start/stop/status>` + `executeWeb` |
| `src/cli/commands/hook.ts` | 8 | `jarvis hook <subcommand...>` |
| `src/cli/commands/doctor.ts` | 20 | `jarvis doctor [path]` |
| `tests/cli-scope.test.ts` | 96 | `resolveScope` + `promptScope` 单元测试（7 个用例） |

### 修改文件

| 文件 | 变更 | 原因 |
|------|------|------|
| `package.json` | `"dev"`, `"jarvis"`, `"jarvis:dev"` 路径更新 | CLI 入口从 `src/cli.ts` 移入 `src/cli/index.ts` |
| `bin/jarvis.js` | import 路径更新 | 同上 |
| `src/suppress-warnings.ts` | 注释更新 | 引用路径从 `cli.ts` 改为 `cli/index.ts` |
| `src/hash-paths.ts` | 注释更新 | 同上 |

### 删除文件

| 文件 | 原因 |
|------|------|
| `src/cli.ts` | 所有逻辑已迁移到 `src/cli/` 模块 |

## 4. 业务规则说明

### 4.1 命令路由规则

模块采用延迟加载（dynamic import）策略：命令模块仅在首次调用时加载，减少启动开销。

```
入口 run()
  ├── -h/--help    → getHelpText()
  ├── -v/--version → 显示版本 + 检查更新
  ├── (无参数)     → 默认 init 命令
  ├── web          → engine.executeWeb()
  └── 其他命令     → COMMANDS[cmd].execute()
```

### 4.2 参数解析规则

`parseArgs()` 保持与原实现完全一致：
- `-y/--yes` → `opts.yes = true`
- `-g/--global` → `opts.global = true, opts.globalExplicit = true`
- `-h/--help` → 立即返回，短路后续处理
- `-v/--version` → 立即返回，短路后续处理
- 其余参数 → 收集为位置参数

### 4.3 安装范围解析规则

`resolveScope()` 的业务逻辑：
1. 若 `opts.globalExplicit === true`，直接返回 `opts.global`（用户显式指定）
2. 否则调用注入的 `promptFn`（生产环境为 `promptScope()`，交互选择）

## 5. 状态机 / 状态转换说明

本任务无状态机相关变更。CLI 为无状态命令执行器。

## 6. 权限与幂等性说明

- **权限**: CLI 命令无额外权限验证，依赖操作系统文件权限
- **幂等性**: 各命令委托到 `install.ts`、`doctor.ts` 等已有模块，幂等性由被调用模块保证
- `resolveScope` 纯逻辑函数：相同输入产生相同输出（测试已覆盖）

## 7. 测试和验证结果

### 7.1 resolveScope 单元测试（7 用例全部通过）

| 测试用例 | 验证点 |
|---------|--------|
| globalExplicit=true, global=true | 直接返回 true，不调用 promptFn |
| globalExplicit=true, global=false | 直接返回 false |
| globalExplicit=false | 调用注入的 promptFn |
| 未提供 globalExplicit | 视为 false，走 promptFn 路径 |
| promptFn 返回 false | resolveScope 返回 false |
| promptFn 返回 Promise | 异步行为正确 |
| promptScope 存在性 | 函数签名验证 |

### 7.2 完整套件验证

```
TypeCheck:  通过（零错误）
ESLint:     通过（零错误，零警告）
Tests:      13 文件 / 203 测试全部通过
```

### 7.3 入口文件行数

`src/cli/index.ts`: **56 行**（约束: < 60 行）

## 8. 风险 / 未解决项

| 风险 | 级别 | 缓解措施 |
|------|------|---------|
| 旧 `cli.ts` 已删除，若有外部脚本直接 `tsx src/cli.ts` 会失败 | 低 | `package.json` scripts 已更新；无其他代码引用 |
| 动态 import 可能导致首次命令调用稍慢 | 极低 | 仅影响冷启动，且 Node.js ESM 缓存后续调用 |
| `diffPlatform` 内部使用动态 import（`node:path`, `node:crypto`） | 无 | 保持原实现，已验证通过 |

## 9. 推荐的下一步

1. **TASK-004** (Daemon Process) — 依赖 TASK-007 完成，可开始实施
2. 后续若新增 CLI 命令，在 `src/cli/commands/` 下新建文件并在 `index.ts` COMMANDS 表中注册即可
3. 若需添加 `resolveScope` 的高阶场景（如静默模式、CI 模式），扩展 `promptFn` 注入接口即可
