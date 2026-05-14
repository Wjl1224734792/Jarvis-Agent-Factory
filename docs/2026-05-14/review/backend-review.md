# 后端代码审查报告

**审查日期**: 2026-05-14
**审查范围**: `src/install.ts`, `src/engine/server.ts`, `src/cli/commands/diff.ts`, `src/cli/commands/resolve.ts`, `src/cli/index.ts`, `src/shared/mcp-config.ts`
**审查人**: backend-review-expert
**审查结论**: **有条件通过**

---

## 一、变更规模评估

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/install.ts` | 1069 行 | 核心安装引擎，新增 frontmatter/section hash/merge 全套逻辑 |
| `src/engine/server.ts` | ~50 行变更 | 新增 conflictFiles 扫描 |
| `src/cli/commands/diff.ts` | 556 行 | 增强版 diff，含 section 级对比 |
| `src/cli/commands/resolve.ts` | 502 行 | 新建冲突解决命令 |
| `src/cli/index.ts` | +1 行 | 注册 resolve 命令 |
| `src/shared/mcp-config.ts` | 82 行 | 类型签名更新 |
| 测试文件 | `install-section-hash.test.ts` (188 行), `install-merge.test.ts` (314 行) | 覆盖核心函数 |

**总变更**: 约 1600 行核心代码，属于大型变更。建议后续拆分为更小的 PR。

---

## 二、维度检查结果

### 1. API 设计 / 契约审查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 函数签名合理性 | 通过 | 参数类型、返回值清晰 |
| 导出正确性 | 通过 | `export async function execute` 符合 CLI 规范 |
| CLI 命令注册 | 通过 | `src/cli/index.ts:20` 正确注册 `resolve` 命令 |
| RESTful 语义 | N/A | 本次变更不涉及新 REST API |
| 错误响应格式 | 通过 | 统一使用 `console.error` + 错误前缀 |

### 2. 业务逻辑审查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 三规则合并 | 通过 | 详见第三部分分析，三种场景覆盖完整 |
| 幂等性 | 通过 | `mergeMarkdownSections` 检测已有 `<<<<<<< user` 标记则跳过 |
| 权限检查 | 通过 | 无越权访问路径 |
| 状态机完整性 | N/A | 不涉及流水线 Gate 状态机 |

**三规则合并逻辑验证（`mergeMarkdownSections`，install.ts:865-886）：**

| 规则 | 条件 | 行为 | 验证 |
|------|------|------|------|
| 规则一：源未变 | `srcHash === oldHash` | 保留目标 section（用户版本） | 正确 |
| 规则二：用户未修改 | `!oldHash \|\| destHash === oldHash` | 用源覆盖 | 正确 |
| 规则三：双方都变 | 其余情况 | 写入冲突标记，用户内容在前 | 正确 |

**边界条件检查：**
- 用户删除 section：`destSectionContent` 为空时，规则一触发 else 分支（install.ts:869），用源覆盖。行为合理——模板认为该 section 必需，自动恢复。
- 源新增 section：`oldHash` 不存在，走规则二覆盖。正确。
- 源删除 section：源中不再出现的 section 保留在 `dest-only` 追加逻辑（install.ts:904-909）。正确。
- 目标文件已含冲突标记：提前返回不处理（install.ts:822-824），避免嵌套标记。

### 3. 数据层审查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| `file-hashes.json` 格式兼容性 | 通过 | `_v: 2` 格式与旧字符串格式并存，通过 `isSectionHashRecord` 类型守卫区分 |
| 数据安全 | 通过 | 无物理外键问题；`saveHashes` 中 fallback 到原始字符串 hash |
| 事务边界 | N/A | `file-hashes.json` 为单文件写入，不涉及数据库事务 |
| SQL 注入 | N/A | 本次变更不涉及 SQL 操作 |

**`_v: 2` 格式结构：**
```json
{
  "/path/to/file.md": {
    "_v": 2,
    "preamble": "<sha256-hex>",
    "sections": {
      "## 职责": "<sha256-hex>",
      "## 你不负责": "<sha256-hex>"
    }
  }
}
```
设计合理：preamble 独立 hash 支持"导言变更不触发全部 section 冲突"。

### 4. 错误处理审查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| try/catch 覆盖 | 通过 | `readFrontmatter`、`splitMarkdownSections`、`computeSectionHashes` 均有 try/catch |
| 失败不回退主流程 | 通过 | catch 块返回默认值（`{ version: '0.0.0' }`），不抛出 |
| 全局错误处理 | 通过 | engine server.ts 有全局 `onError` 中间件 |
| 超时/重试 | N/A | 无外部 API 调用 |

### 5. 性能审查（代码级）

| 检查项 | 状态 | 说明 |
|--------|------|------|
| N+1 查询 | 通过 | 无数据库查询 |
| 大数据量 | 通过 | diff.ts 有 `MAX_SHOW=30` 限制；engine 扫描有 `MAX=200` 限制 |
| 缓存策略 | N/A | 不涉及缓存 |
| 不必要的写操作 | WARNING | `saveHashes` 对所有 `.md` 文件重新计算 section hash，即使部分已存储为 `_v: 2` 格式 |

### 6. 代码质量

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 分层架构 | 通过 | CLI 命令层 → 工具函数层清晰 |
| 循环依赖 | 通过 | 无新增循环依赖 |
| 命名规范性 | 通过 | 函数名语义清晰 |
| 配置外部化 | 通过 | `getHashFilePath`、`GLOBAL_ROOTS` 使用环境路径 |
| 日志级别 | 通过 | `console.log`（info）、`console.warn`（警告）、`console.error`（错误）使用正确 |

---

## 三、问题列表（按严重度排序）

### [FIX_REQUIRED] 问题

#### F1. 核心逻辑三处代码重复 —— 维护风险

**文件**: `src/install.ts`, `src/cli/commands/diff.ts`, `src/cli/commands/resolve.ts`

**说明**: 以下函数在三处独立实现，注释均标注"因其未导出而本地复刻"：

| 函数 | install.ts | diff.ts | resolve.ts |
|------|-----------|---------|------------|
| `readFrontmatter` | 485-536 | 21-57 | N/A |
| `splitMarkdownSections` / `splitSections` | 586-631 | 80-110 | N/A |
| `computeSectionHashes` | 640-667 | N/A | 100-148 |
| `isSectionHashRecord` | 713-718 | 67-72 | N/A |

其中 `resolve.ts:computeSectionHashes` 与 `install.ts` 的实现略有差异（frontmatter 搜索限 20 行 vs 无限制）。

**影响**: 任何逻辑变更需同步三处，极易遗漏导致行为不一致的 bug。

**建议**: 将共享函数提取到 `src/shared/` 目录（如 `src/shared/markdown-utils.ts`），三处统一导入。这是此次 PR 最优先的修复项。

---

#### F2. `setFrontmatterFields` 使用 `splice` 违反编码规范

**文件**: `src/install.ts:570`

```typescript
lines.splice(closingIdx, 0, `${key}: "${value}"`);
```

**说明**: 项目编码规范（通用编程规范 2.3 节）明确禁止 `splice` 等变异方法。

**建议**: 改用不可变写法——
```typescript
lines = [...lines.slice(0, closingIdx), `${key}: "${value}"`, ...lines.slice(closingIdx)];
closingIdx++;
```
但由于 `lines` 是局部变量且不共享状态，严重度从 BLOCKED 降为 FIX_REQUIRED。

---

#### F3. `setFrontmatterFields` 与 `readFrontmatter` 搜索限制不一致

**文件**: `src/install.ts:549` vs `src/install.ts:497`

- `readFrontmatter`: 搜索前 20 行（`Math.min(lines.length, 20)`）
- `setFrontmatterFields`: 搜索前 30 行（`Math.min(lines.length, 30)`）

**影响**: 若 frontmatter 行数在 20-30 之间，`readFrontmatter` 无法读取但 `setFrontmatterFields` 可以写入，行为不对称。

**建议**: 统一搜索限制为常量，如 `const FM_SEARCH_LIMIT = 30`，两处使用同一常量。

---

#### F4. `diff.ts` 与 `engine/server.ts` 中 `scanConflictFiles` 行为不一致

**文件**: 
- `src/cli/commands/diff.ts:194-226`：扫描 `.md` 和 `.json` 文件
- `src/engine/server.ts:94-139`：仅扫描 `.md` 文件

**影响**: 引擎启动时不会报告 `.json` 文件的冲突标记，但 `jarvis diff` 和 `jarvis resolve --list` 会。

**建议**: 统一为 `.md` 和 `.json`。考虑将 `scanConflictFiles` 提取为共享工具函数。

---

### [WARNING] 问题

#### W1. `saveHashes` 对已为 `_v: 2` 格式的 `.md` 条目重复计算

**文件**: `src/install.ts:683-708`

**说明**: `mergeDir` 中已对合并后的 `.md` 文件写入 `_v: 2` 格式的 hash（install.ts:1040-1044），但 `saveHashes` 在末尾再次遍历所有 `.md` 文件重新计算 section hash。虽然不是 bug，但不必要的重复 I/O 和计算。

**建议**: `saveHashes` 遍历时跳过已为 `_v: 2` 格式的条目。

---

#### W2. `resolve.ts` 与 `diff.ts` 中相同概念使用不同函数名

**文件**:
- `src/cli/commands/diff.ts:280`: `hasConflictMarker(filePath)` 
- `src/cli/commands/resolve.ts:83`: `hasConflicts(filePath)`

**说明**: 两个函数实现完全相同的逻辑（检查文件是否包含 `<<<<<<< user`），但命名不一致。

**建议**: 统一命名（提取到共享模块后自然解决）。

---

#### W3. `install.ts` 中 `readFrontmatter` 返回值包含 `undefined` 值

**文件**: `src/install.ts:485`

**类型声明**:
```typescript
function readFrontmatter(filePath: string): { version?: string; updated?: string; [key: string]: string | undefined }
```

**说明**: 索引签名允许 `undefined` 值，但 `readFrontmatter` 的内部实现从不设置 `undefined` 值。调用方（如 `mergeMarkdownSections:957-961`）使用 `if (value !== undefined)` 过滤，说明类型声明正确但内部实现可以更严格。

**建议**: 类型签名可收紧为 `Record<string, string>`，在 catch 块返回 `{ version: '0.0.0' }` 已足够。

---

#### W4. `diff.ts` 中 `readFrontmatter` 返回类型比 `install.ts` 更严格

**文件**: 
- `src/cli/commands/diff.ts:21`: `Record<string, string>`
- `src/install.ts:485`: `{ version?: string; updated?: string; [key: string]: string \| undefined }`

**说明**: 两处类型声明不同，提取到共享模块后自然统一。

---

### [INFO] 问题

#### I1. 测试覆盖良好

`tests/install-section-hash.test.ts` 和 `tests/install-merge.test.ts` 覆盖了以下核心函数：
- `splitMarkdownSections` — 10 个测试用例
- `_v: 2` 格式验证
- `deepMergeValue` — 18 个测试用例（标量/数组/对象/类型不匹配）
- `mergeMcpServers` — 9 个测试用例

未覆盖：
- `mergeMarkdownSections` — 无直接单元测试（通过集成测试覆盖）
- `setFrontmatterFields` — 无测试
- CLI 命令 `diff` / `resolve` — 无测试

---

#### I2. `mergeMarkdownSections` 中冲突文件跳过逻辑合理

**文件**: `src/install.ts:1033-1035`

当 `mergeMarkdownSections` 检测到冲突且写入冲突标记后，`mergeDir` 将文件标记为 "skipped"。这意味着目标文件已含冲突标记但 hash 未更新，下次 `upgrade` 会再次检测为冲突。由于 `mergeMarkdownSections` 的提前返回（检测已有冲突标记），不会再次写入新标记造成嵌套。这是合理的行为。

---

#### I3. `_v: 2` 格式设计合理

Section 级 hash 格式通过 `isSectionHashRecord` 类型守卫与旧字符串格式并存，向下兼容旧格式。Preamble 独立 hash 支持"导言变更不触发 section 冲突"的精细控制。

---

#### I4. 模板文件 frontmatter 版本字段已补齐

125 个模板文件均包含 `version` 和 `updated` 字段，格式一致：
```yaml
version: "3.45.8"
updated: "2026-05-14"
```

---

## 四、必须修复项

| 编号 | 严重度 | 项 | 文件:行号 |
|------|--------|-----|-----------|
| F1 | FIX_REQUIRED | 提取共享函数到 `src/shared/` 消除三处重复 | install.ts, diff.ts, resolve.ts |
| F2 | FIX_REQUIRED | `splice` 改为不可变操作 | install.ts:570 |
| F3 | FIX_REQUIRED | 统一 frontmatter 搜索限制常量 | install.ts:497, 549 |
| F4 | FIX_REQUIRED | 统一 `scanConflictFiles` 文件类型覆盖 | diff.ts:218, server.ts:118 |

## 五、优化建议

| 编号 | 严重度 | 建议 |
|------|--------|------|
| W1 | WARNING | `saveHashes` 跳过已为 `_v: 2` 格式的条目 |
| W2 | WARNING | 统一 `hasConflictMarker` / `hasConflicts` 命名 |
| W3 | WARNING | 收紧 `readFrontmatter` 返回类型 |
| W4 | WARNING | 统一 `readFrontmatter` 类型签名 |

## 六、变更文件清单

| 文件 | 变更类型 | 行数 |
|------|---------|------|
| `src/install.ts` | 修改 | +~200 行核心逻辑 |
| `src/engine/server.ts` | 修改 | +46 行 conflictFiles 扫描 |
| `src/cli/commands/diff.ts` | 修改 | +~250 行增强输出 |
| `src/cli/commands/resolve.ts` | 新建 | 502 行 |
| `src/cli/index.ts` | 修改 | +1 行命令注册 |
| `src/shared/mcp-config.ts` | 修改 | 类型签名更新 |
| `src/templates/**/*.md` | 修改 | 125 文件 frontmatter 版本 |
| `tests/install-section-hash.test.ts` | 新建 | 188 行 |
| `tests/install-merge.test.ts` | 新建 | 314 行 |

---

## 七、残余风险

1. `mergeMarkdownSections` 未提供回滚机制——合并写入后若结果不符合预期，用户需从 Git 恢复。
2. 非交互式 `jarvis resolve --accept template` 批量操作可能意外覆盖用户修改，建议执行前输出受影响文件列表并要求确认。
3. 三处代码重复意味着当前分支可能存在行为差异——`diff.ts` 中的 `splitSections` 与 `install.ts` 中的 `splitMarkdownSections` 返回类型不同（前者不含 hash 字段）。

---

## 八、审查签署

- 审查维度: 5/5 全部检查
- 严重问题: 0 BLOCKED
- 必须修复: 4 FIX_REQUIRED
- 建议修复: 4 WARNING
- 信息: 4 INFO
- **结论**: 有条件通过——修复 F1-F4 后可通过。
