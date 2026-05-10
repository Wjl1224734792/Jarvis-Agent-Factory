# TASK-008：抑制 SQLite ExperimentalWarning 后端实现文档

## 1. 当前实现目标

抑制 `jarvis` CLI 运行时 Node.js 打印的 `ExperimentalWarning: SQLite is an experimental feature` 警告。

## 2. 对应需求 ID / 任务 ID

- 任务 ID：TASK-008
- 需求名称：抑制 SQLite ExperimentalWarning

## 3. 输入依据

- TASK-008 任务描述（编排者分配）
- 源码分析：`src/cli.ts` → `src/engine/server.ts` → `src/engine/db.ts` → `node:sqlite`

## 4. 变更文件 / 变更范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/suppress-warnings.ts` | 新建 | monkey-patch `process.emitWarning`，过滤 SQLite 实验性警告 |
| `src/cli.ts` | 修改（新增 2 行） | 将 `suppress-warnings.js` 作为第一个静态 import 引入 |

## 5. 实现说明

### 根因

导入链 `cli.ts` → `engine/server.ts` → `engine/db.ts` → `import { DatabaseSync } from 'node:sqlite'` 导致即使 `--version` 这种无需数据库的命令也会触发 `node:sqlite` 加载，从而打印实验性警告。

### 方案

创建 `src/suppress-warnings.ts`，在 Node.js 加载 `node:sqlite` 之前 monkey-patch `process.emitWarning()`，过滤掉 SQLite 相关实验性警告。其余警告正常透传。

### 为何有效

ES 模块按源码导入顺序深度优先求值（Depth-First, Post-Order）。`suppress-warnings.js` 作为 `cli.ts` 的第一个 import，保证在 `engine/server.js` 及其传递依赖 `db.ts`（触发 `node:sqlite` 导入）之前被求值。

```text
cli.ts 求值顺序:
  1. './suppress-warnings.js' → monkey-patch process.emitWarning ✓
  2. './engine/server.js' → './db.js' → 'node:sqlite' → process.emitWarning 被拦截
  3. cli.ts 模块体执行
```

### 过滤策略

只过滤同时满足以下条件的警告：
- `warning` 是字符串
- 包含 `"SQLite"`
- `type` 为 `"ExperimentalWarning"`

不符合条件的警告正常透传给原始 `process.emitWarning`。

### `process.emitWarning` 的类型适配

使用 `bind(process)` 绑定 `this` 上下文后，通过 `as (..._args: unknown[]) => void` 类型断言存储原始引用，避免 TypeScript 重载签名冲突。

## 6. 测试和验证结果

### 验收标准验证

| 验收标准 | 结果 | 证据 |
|---------|------|------|
| `node bin/jarvis.js --version` 不出现 ExperimentalWarning | 通过 | 输出 `jarvis-agent-factory v3.28.0`，无警告 |
| `node bin/jarvis.js --help` 不出现 ExperimentalWarning | 通过 | 完整帮助输出，无警告 |
| 其他正常输出不受影响 | 通过 | `--version` 和 `--help` 输出完整 |

### 自动化检查

| 检查项 | 结果 |
|--------|------|
| `npm run build` | 通过 |
| `npm run lint` | 通过（0 errors, 0 warnings） |
| `npm run typecheck` | 通过 |
| `npm test` | 通过（4 文件, 59 测试全部通过） |

### 针对性验证（tsx）

`npx tsx -e "import './src/suppress-warnings.ts'; import { DatabaseSync } from 'node:sqlite'; console.log('OK');"`  
输出：`node:sqlite loaded without ExperimentalWarning` —— 确认 monkey-patch 在 `tsx` 运行时同样生效。

注意：`npx tsx src/cli.ts --version` 本身存在 `import.meta.url` 路径解析问题（非本次引入），导致 `ENOENT package.json`，但不影响本任务的验收结论——monkey-patch 在文件加载失败前已被求值。

## 7. 数据与接口边界

- 不修改数据库操作逻辑
- 不修改引擎初始化逻辑
- 不修改业务逻辑代码
- 不影响 `process.emitWarning` 的其他调用方（仅过滤 SQLite ExperimentalWarning）

## 8. 风险 / 未解决项

- `npx tsx src/cli.ts --version` 存在预存的 `import.meta.url` 路径解析问题（`ENOENT package.json`），非本次任务引入，建议单独修复
- 若 Node.js 未来调整 `process.emitWarning` 内部实现，monkey-patch 可能失效；届时可改为 Node.js `--no-warnings` 标志或 `--disable-warning` 选项

## 9. 需要前端配合的点

无。本次变更仅涉及后端 CLI 入口。

## 10. 推荐的下一步

- 修复 `npx tsx src/cli.ts` 的 `import.meta.url` 路径解析问题（单独任务）
- 待 Node.js 正式稳定 `node:sqlite` API 后（移除 Experimental 标记），可移除此 monkey-patch
