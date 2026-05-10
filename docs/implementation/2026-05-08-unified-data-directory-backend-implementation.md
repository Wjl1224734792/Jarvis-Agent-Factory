# 统一数据目录后端实现

## 1. 实现目标

将所有 Jarvis Engine 运行时数据统一到 `~/.jarvis/` 目录下，消除 `engine.pid`、`engine.db`、`file-hashes.json` 分散存储的问题。

## 2. 对应需求 ID / 任务 ID

- **TASK-001**: 统一数据目录到 `~/.jarvis/`

## 3. 输入依据

- 编排者分配的子任务描述（内联）
- 现有代码文件：`src/engine/db.js`、`src/engine/server.js`、`src/install.js`

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/engine/db.js` | 修改 | `openDb()` 移除 `root` 参数，路径硬编码为 `~/.jarvis/engine.db` |
| `src/engine/server.js` | 修改 | 移除 `openDb(root)` 的 `root` 参数；新增旧 DB 迁移逻辑 |
| `src/install.js` | 修改 | `loadHashes()`/`saveHashes()` 移除 `root` 参数，统一到 `~/.jarvis/file-hashes.json`；`mergeDir()` 对应更新 |

禁止修改：`src/engine/gates.js`（已由上游修改，不可触碰）

## 5. 实现说明

### 5.1 `src/engine/db.js` — 数据库路径统一

- `openDb(root)` → `openDb()`：移除 `root` 参数
- 使用 `resolve(homedir(), '.jarvis')` 固定数据库目录
- 数据库文件固定在 `~/.jarvis/engine.db`
- 引擎启动不会在任何 `<projectRoot>/.jarvis/` 目录写入文件
- 新增 `import { homedir } from 'node:os'`，用 `resolve` 替代 `join`

### 5.2 `src/engine/server.js` — 启动时旧数据迁移

- `openDb(root)` → `openDb()`（第 75 行）
- 在调用 `openDb()` 之前（第 60-71 行），检测并迁移旧数据库：
  - 旧位置：`<projectRoot>/.jarvis/engine.db`
  - 新位置：`~/.jarvis/engine.db`
  - 仅当旧文件存在且新文件不存在时执行 `copyFileSync`
  - 同时迁移 WAL 辅助文件（`-wal`、`-shm`）
- 新增 `copyFileSync` 导入

### 5.3 `src/install.js` — 文件哈希记录统一

- `loadHashes()`: 无参数，固定从 `~/.jarvis/file-hashes.json` 读取
- `saveHashes(hashes)`: 仅接收哈希对象，固定写回 `~/.jarvis/file-hashes.json`
- `mergeDir(src, dest)`: 移除 `root` 参数（原用于计算哈希文件路径）
  - 始终调用 `loadHashes()` / `saveHashes()`（不再有条件判断）
  - 哈希键从相对路径 `relPath` 改为绝对路径 `dp`，避免多平台安装时的键冲突
- 调用方（`install` 函数）移除 `hashRoot` 中间变量

### 5.4 数据迁移策略

- **非破坏性**：仅当旧文件存在且新文件不存在时才复制
- **幂等**：多次启动不会重复迁移（`!existsSync(newDbPath)` 守卫）
- **保留旧文件**：迁移后旧文件保留不删除（用户可自行清理）

## 6. 测试和验证结果

### 6.1 语法检查

```
$ node --check src/engine/db.js     # PASS
$ node --check src/engine/server.js  # PASS
$ node --check src/install.js        # PASS
```

### 6.2 验收标准对照

| 验收项 | 状态 |
|--------|------|
| `openDb()` 不再接收参数，DB 固定创建在 `~/.jarvis/engine.db` | ✅ |
| 引擎启动后不创建 `<projectRoot>/.jarvis/` 目录 | ✅ |
| 旧 DB 自动复制到新位置（含 WAL/SHM） | ✅ |
| `file-hashes.json` 统一在 `~/.jarvis/` | ✅ |
| `node --check src/engine/server.js` 通过 | ✅ |

### 6.3 边界条件

- 旧 DB 不存在 → 迁移跳过，正常创建新 DB
- 新 DB 已存在 → 迁移跳过（幂等）
- WAL/SHM 文件不存在 → 不影响主文件迁移
- 多平台安装 → 哈希键使用绝对路径，无冲突
- `~/.jarvis/` 目录不存在 → `mkdirSync({ recursive: true })` 自动创建

## 7. 数据与接口边界

### 7.1 文件存储约定

| 文件 | 旧位置 | 新位置 |
|------|--------|--------|
| `engine.pid` | `~/.jarvis/engine.pid` | ✅ 不变 |
| `engine.db` | `<projectRoot>/.jarvis/engine.db` | `~/.jarvis/engine.db` |
| `file-hashes.json` | `<platformRoot>/.jarvis/file-hashes.json` | `~/.jarvis/file-hashes.json` |

### 7.2 向后兼容

- 旧 DB 数据自动迁移不丢失
- `~/.jarvis/` 目录结构保持原有（后续可在此基础上扩展日志等）
- PID 文件路径未变

## 8. 风险 / 未解决项

1. **多实例冲突**：若多个 jarvis 实例同时运行，共用同一个 `~/.jarvis/engine.db` 可能导致 SQLite 锁冲突。当前设计假设单实例运行（PID 文件确保），后续若引入多实例需评估。
2. **旧文件清理**：迁移后旧位置的 DB 文件保留不删除，需用户手动清理或等后续迭代加入自动清理。
3. **哈希键变更**：从相对路径改为绝对路径后，`file-hashes.json` 的旧条目将失效（因为键名不匹配），首次安装会重新计算所有哈希。这是有意为之，避免了多平台安装时的键冲突。

## 9. 需要前端配合的点

无。本次变更纯后端数据目录调整，不影响任何 API 接口、路由或前端页面。

## 10. 推荐下一步

- TASK-002（如有）：考虑将日志文件也统一到 `~/.jarvis/` 目录
- 可选：添加 `jarvis cleanup` 命令来清理旧位置残留的数据库文件
- 可选：在 MDC 中记录 `~/.jarvis/` 作为持久数据目录的约定
