# JSON 配置合并逻辑升级 —— 后端实现文档

## 1. 当前实现目标

将 `src/install.ts` 中 `installMcp()` 和 `installHooks()` 的 JSON 配置合并逻辑，从"只增不删"升级为"增删改全支持"。

## 2. 对应需求 ID / 任务 ID

- TASK-004

## 3. 输入依据

- 编排者 TASK-004 分配文档
- 项目代码规范（AGENTS.md、通用编程规范）

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/install.ts` | 修改 | 新增 3 个辅助函数 + 升级 installMcp/writeMcpJson/installHooks |
| `tests/install-merge.test.ts` | 新增 | 24 个单元测试覆盖 deepMergeValue 和 mergeMcpServers |
| `src/shared/mcp-config.ts` | 未修改 | 类型签名已满足需求，无需变更 |

### 未修改文件（符合约束）
- `mergeDir()` 及所有 markdown 相关函数
- CLI 命令文件
- `src/engine/*`
- `package.json`
- `tsconfig.json`

## 5. 实现说明

### 5.1 新增辅助函数

#### `isPlainObject(val: unknown): boolean`
检查值是否为纯对象（非数组、非 null），用于深度合并的类型判断。

#### `deepMergeValue(templateVal, existingVal): unknown`
递归深度合并单个字段值：
- **双方都是数组**：合并去重，模板元素在前
- **双方都是纯对象**：递归深度合并，模板字段覆盖同名键，目标独有字段保留
- **其余情况**（标量、类型不匹配）：模板值覆盖

#### `mergeMcpServers(templateServers, existingServers)`
合并 MCP servers 映射，返回 `{ merged, added, removed, updated }`：
- **新增**：模板有、目标无的 server
- **删除**：目标有、模板无的 server（`jarvis-engine` 白名单保护）
- **修改**：同名 server 通过 `deepMergeValue` 深度合并

### 5.2 `installMcp()` 升级（约 L338-418）

**Claude JSON 路径**（`.mcp.json`）：
- 原逻辑：循环检查 `!existingServers[serverName]`，只新增
- 新逻辑：调用 `mergeMcpServers()` 实现新增、删除、修改全支持
- 日志输出改为 `+N/-N/~N` 格式，显示增/删/改计数

**OpenCode JSON 路径**（通过 `writeMcpJson`）：
- 同步升级为相同的合并逻辑

**Codex TOML 路径**：
- 保持不变（TOML 格式不适合深度合并）

### 5.3 `writeMcpJson()` 升级（约 L421-469）

- 添加了完整的 TypeScript 类型标注
- 合并逻辑从"只新增"升级为 `mergeMcpServers()` 全支持
- 日志输出与其他路径保持一致的 `+N/-N/~N` 格式

### 5.4 `installHooks()` 升级（约 L181-330）

**函数签名变更**：
- 新增第 4 参数 `force: boolean`

**permissions.allow**：
- 保持原有"只新增不删除"行为（白名单保护）
- 这是正确的设计，无需改动

**hooks 合并**：
- 新增系统管理的 hook keys 追踪字段 `_jarvisManagedHooks`（存储在 settings.json 顶层）
- **正常模式**：
  - 系统 hook keys（hookJson 中定义的）→ 设置/覆盖
  - 之前系统管理但当前模板已移除的 keys → 删除
  - 用户自定义 keys（不在系统管理集合中）→ 保留
- **force 模式**：
  - 完全替换 hooks 为模板值（不保留用户自定义 hooks）
  - permissions.allow 始终保留（永不被删除）
- 日志输出改为 `+N/~N/-N hooks` 格式

## 6. 测试和验证结果

### 自动化测试
```
npx vitest run
 Test Files  18 passed (18)
      Tests  312 passed (312)
```

### 新增测试（install-merge.test.ts）

**deepMergeValue 测试（14 个）**：
- 标量覆盖：string、number、boolean、null
- 数组去重合并：新元素追加、重复元素过滤、空数组
- 对象递归合并：嵌套对象、同名键覆盖、env 子对象
- 类型不匹配：对象 vs 数组、数组 vs 对象、标量 vs 对象

**mergeMcpServers 测试（10 个）**：
- 验收标准 1：模板新增 server
- 验收标准 2：模板移除 server + jarvis-engine 白名单保护
- 验收标准 3：args 数组合并、command 标量覆盖、env 对象递归合并
- 边界：无变更时不计数、多 server 混合操作

### Lint 检查
```
npx eslint src/install.ts  -- passed, 0 errors
```

### 类型检查
```
npx tsc --noEmit  -- passed, 0 errors
```

### 构建
```
npx tsc  -- passed, compiled successfully
```

## 7. 数据与接口边界

| 边界 | 说明 |
|------|------|
| `_jarvisManagedHooks` | 新增的 settings.json 顶层元数据字段，存储系统管理的 hook key 列表，用于区分"系统安装的 hook"和"用户自定义的 hook"，支持模板移除 hook key 时自动清理 |
| `MCP_SERVER_WHITELIST` | `['jarvis-engine']`，硬编码白名单，这些 MCP server 永远不会被删除 |
| `deepMergeValue` | 深度合并只处理数组、对象、标量三种类型；Map/Set/Symbol 等类型归入"标量覆盖"路径 |
| 数组去重 | 使用 `===` 浅比较，不处理嵌套数组或对象元素去重（因为 MCP args 通常是字符串数组） |

## 8. 风险 / 未解决项

### 已知风险
1. **`_jarvisManagedHooks` 暴露在 settings.json 中**：该字段对 Claude Code 无害（JSON 解析器忽略未知键），但会在用户编辑 settings.json 时可见。未来可考虑迁移到独立的元数据文件。
2. **数组去重使用浅比较**：如果未来 args 包含复杂对象，`Array.includes()` 将无法正确去重。当前所有已知的 args 都是字符串，此风险低。
3. **npm 依赖安装问题**：当前开发环境存在 `NODE_ENV=production` 导致 `npm install` 跳过 devDependencies 的问题，已在本次排查中定位根因。

### 未解决项
- 无

## 9. 需要前端配合的点

- 无。本变更仅涉及后端 CLI 安装逻辑，无前端交互。

## 10. 推荐的下一步

1. **集成测试**：在真实项目中执行 `jarvis install --upgrade` 验证升级流程
2. **文档更新**：如 settings.json 中出现 `_jarvisManagedHooks` 字段，需在用户文档中说明
3. **未来扩展**：如果需要在更多场景使用深度合并，可将 `deepMergeValue` 和 `mergeMcpServers` 提取到 `src/shared/json-merge.ts` 公共模块
