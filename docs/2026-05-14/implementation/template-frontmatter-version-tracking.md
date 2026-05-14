# 模板 Frontmatter 版本追踪 — 后端实现文档

## 1. 当前实现目标

为 Jarvis 模板分发系统增加 Frontmatter 版本追踪能力：所有模板 `.md` 文件携带 `version`/`updated` 字段，`install.ts` 的 `mergeDir()` 安全覆盖分支在覆盖文件后自动更新时间戳。

## 2. 对应需求 ID / 任务 ID

- **Task ID**: TASK-001
- **需求 ID**: REQ-006（模板版本追溯，向后兼容 `version: "0.0.0"`）

## 3. 输入依据

- 编排者任务分配：TASK-001"模板 Frontmatter 版本追踪"
- 源码文件：`src/install.ts`（`mergeDir()` 函数，三路合并逻辑）
- 模板目录：`src/templates/platforms/claude/`

## 4. 变更文件 / 变更范围

### 修改文件

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/install.ts` | 新增函数 + 分支增强 | 新增 `readFrontmatter()`、`setFrontmatterFields()`；修改 `mergeDir()` 安全覆盖分支 |
| `src/templates/platforms/claude/**/*.md` (125 个文件) | Frontmatter 批量添加 | 全部 `.md` 文件添加 `version`/`updated` 字段 |

### 未修改（按任务要求）

- `mergeDir()` 跳过逻辑（`else` 分支 —— 用户已修改文件保留不覆盖）
- `installMcp()` / `installHooks()` 函数
- 任何 CLI 命令文件
- `package.json` / `package-lock.json`
- `src/engine/` / `src/web/` 文件

## 5. 实现说明

### 5.1 模板 Frontmatter 批量更新

使用临时 Node.js 脚本 `scripts/temp-add-frontmatter.cjs` 批量处理 125 个 `.md` 文件：

- **119 个已有 frontmatter 的文件**：在闭合 `---` 之前追加 `version: "3.45.8"` 和 `updated: "2026-05-14"`
- **6 个无 frontmatter 的文件**：在文件开头插入完整 frontmatter 块
- 所有文件均不存在旧版 `version`/`updated` 字段（经 grep 确认），无需处理覆盖逻辑

脚本执行完成后已删除，模板文件直接携带版本字段。

### 5.2 `readFrontmatter(filePath)` 函数

```typescript
function readFrontmatter(filePath: string): {
  version?: string;
  updated?: string;
  [key: string]: string | undefined;
}
```

**行为**：
- 读取文件前 20 行，查找 `---...---` 包围的 YAML frontmatter 块
- 解析 `key: value` 格式的字段，自动去除引号
- 无 frontmatter 时返回 `{ version: '0.0.0' }`（向后兼容 REQ-006）
- 有 frontmatter 但缺少 `version` 字段时也默认 `"0.0.0"`
- 异常时（文件不存在/无权限）返回 `{ version: '0.0.0' }`

**验证结果**：
```
Test 1 - Agent with frontmatter: {"name":"backend-dev-expert","description":"后端全栈实现者...","tools":"Read, Write, Edit, Bash, Glob, Grep, Skill","effort":"max","model":"deepseek-v4-pro","version":"3.45.8","updated":"2026-05-14"}
Test 2 - No frontmatter: {"version":"0.0.0"}
Test 3 - Quoted values: name=backend-dev-expert, description=后端全栈实现者...
All readFrontmatter tests passed!
```

### 5.3 `setFrontmatterFields(filePath, fields)` 辅助函数

内部辅助函数，用于更新 Markdown 文件 frontmatter 中的字段：
- 字段已存在则替换值（如 `version: "old"` → `version: "new"`）
- 字段不存在则在闭合 `---` 前插入
- 无 frontmatter 则跳过（因为安全覆盖分支中文件已从源模板拷贝，必然带有 frontmatter）

### 5.4 `mergeDir()` 安全覆盖分支增强

**变更位置**：`else if (!oldHash || destHash === oldHash)` 分支（原约第 379 行）

**原逻辑**：
```typescript
copyFileSync(sp, dp);
hashes[dp] = newHash;
files++;
```

**新逻辑**：
```typescript
copyFileSync(sp, dp);
// 更新 frontmatter：version 取源模板值，updated 设为当前日期
try {
  const srcFm = readFrontmatter(sp);
  const today = new Date().toISOString().slice(0, 10);
  setFrontmatterFields(dp, { version: srcFm.version ?? '0.0.0', updated: today });
} catch { /* 更新 frontmatter 失败不阻塞安装流程 */ }
// 以实际写入内容（含 frontmatter 更新）的 hash 为准
hashes[dp] = fileHash(dp) || newHash;
files++;
```

**关键设计决策**：
- `updated` 字段设为当前日期（安装时间），而非模板的原始 `updated` 日期。这便于后续判断用户何时安装/更新
- Hash 以 frontmatter 更新后的实际文件内容为准，确保后续增量更新判断正确
- 整个 frontmatter 更新包裹在 `try/catch` 中，失败不影响主安装流程

## 6. 测试和验证结果

### 验收标准 1：随机抽查 3 个模板文件

| 文件 | version | updated | 状态 |
|------|---------|---------|------|
| `agents/backend-dev-expert.md` | `"3.45.8"` | `"2026-05-14"` | 通过 |
| `commands/backend.md` | `"3.45.8"` | `"2026-05-14"` | 通过 |
| `skills/source-driven-development/SKILL.md` | `"3.45.8"` | `"2026-05-14"` | 通过 |
| `skills/browser-use/references/cdp-python.md` (无原始 FM) | `"3.45.8"` | `"2026-05-14"` | 通过 |

### 验收标准 2：`readFrontmatter()` 正确解析

- 有 frontmatter 文件：正确解析全部字段（name, description, tools, effort, model, version, updated）
- 无 frontmatter 文件：返回 `{ version: '0.0.0' }`
- 引号值正确处理（description 中的中文引号值正确去除）

### 验收标准 3：代码逻辑

- `mergeDir()` 安全覆盖分支：`copyFileSync` → 更新 frontmatter → 重算 hash → 计数
- 新文件分支（`!existsSync(dp)`）保持不变
- 跳过分支（用户已修改）保持不变

### 验收标准 4：引擎启动

```
$ npx tsx -e "process.argv=['node','jarvis','engine','start'];import('./src/cli/index.ts').then(m=>{...})"
Engine module loaded, run() available: function
```

## 7. 数据与接口边界

### 输入

| 接口 | 说明 |
|------|------|
| `readFrontmatter(filePath)` | 输入：文件系统路径；输出：frontmatter 键值对 |
| `setFrontmatterFields(filePath, fields)` | 输入：文件路径 + 键值对；副作用：写入文件 |
| `mergeDir()` - 不变 | 函数签名和外部行为不变 |

### 输出

- 模板 `.md` 文件：所有文件包含 frontmatter `version`/`updated` 字段
- Hash 记录文件：以 frontmatter 更新后的文件内容计算，存储在 hash 文件中

### 边界条件

- `readFrontmatter` 只在 `mergeDir()` 安全覆盖分支中调用，目标文件必然存在
- `setFrontmatterFields` 只在 `copyFileSync` 之后调用，文件必然已有 frontmatter
- 版本号固定为 `"3.45.8"`（模板级别），`updated` 为安装时的日期

## 8. 风险 / 未解决项

| 风险 | 级别 | 说明 |
|------|------|------|
| TypeScript 编译 | 低 | 项目 `package.json` 声明 `typescript: "^6.0.3"` 该版本不存在于 npm；`tsx` 可正常运行时加载 |
| `updated` 日期确定性 | 低 | `new Date()` 使用本地时区，跨时区安装可能导致日期差异 |
| TASK-003 联动 | 中 | TASK-003 将处理"用户已修改"跳过分支的前端通知逻辑，本实现为其提供 frontmatter 解析基础 |
| 模板版本与 npm 版本不同步 | 低 | 模板 `version: "3.45.8"` 硬编码，需随版本发布手动更新 |

## 9. 需要前端配合的点

无。本任务为纯后端实现，不涉及前端变更。

## 10. 推荐的下一步

1. TASK-003：实现用户修改文件的升级提示逻辑（依赖 `readFrontmatter()` 解析版本差异）
2. 版本发布流程自动化：在 CI/CD 中根据 `package.json` 版本自动更新模板 frontmatter 的 `version` 字段
3. 修复 `package.json` 中不存在的 TypeScript 版本声明（`^6.0.3` → `^5.9.x`）
