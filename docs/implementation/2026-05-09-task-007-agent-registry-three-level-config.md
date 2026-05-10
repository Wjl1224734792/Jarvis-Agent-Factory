# TASK-007：全局/项目级智能体配置分类读取

## 1. 实现目标

扩展 `agent-registry.ts`，支持从三个来源读取智能体配置并按优先级合并：

| 优先级 | 来源 | 路径 |
|--------|------|------|
| 1（最低）| 模板默认 | `src/templates/platforms/`（已有） |
| 2 | 全局用户配置 | `~/.jarvis/agents/{platform}/` |
| 3（最高）| 项目级配置 | `{projectRoot}/.claude/agents/` |

**对应需求 ID / 任务 ID**：TASK-007

## 2. 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/engine/agent-registry.ts` | 核心实现 | 新增 `parseAgentFile`、`scanAgentDir`、`mergeAgents`；重构 `scanPlatform` 复用解析逻辑；扩展 `getAgentList` 签名支持 `projectRoot` 参数和三层合并 |
| `src/web/routes.ts` | 调用方更新 | `/api/agents` 端点传入 `root` 作为 `projectRoot` |
| `tests/agent-registry.test.ts` | 新增测试 | 5 个新测试用例覆盖三层合并优先级和缓存刷新 |

**未修改的文件**（符合 out_of_scope）：
- `src/engine/server.ts` — 无需修改（`root` 已通过 `setupApiRoutes(app, db, root)` 传入）
- 前端 `agents.html`
- 模板文件
- `src/cli.ts`, `src/install.ts`, `package.json`

## 3. 业务规则说明

### 3.1 合并策略

```
最终列表 = 模板默认 + 全局覆写 + 项目覆写
```

合并键为 `AgentItem.id`（Claude 平台为文件名，OpenCode/Codex 为 `{platform}-{fileName}`）：
- 全局配置中与模板同 ID 的智能体 → 覆写模板版本
- 项目配置中与全局/模板同 ID 的智能体 → 覆写全局版本
- 全局/项目新增的 ID（不在模板中）→ 追加到列表末尾

### 3.2 目录结构约定

**全局用户配置**：`~/.jarvis/agents/`
```
~/.jarvis/agents/
  claude/     → *.md（Claude 格式）
  opencode/   → *.md（OpenCode 格式）
  codex/      → *.toml（Codex 格式）
```

**项目级配置**：`{projectRoot}/.claude/agents/`
```
{projectRoot}/.claude/agents/
  *.md → 仅 Claude 平台
```

### 3.3 缓存机制

- `_agentList` / `_agentFiles`：缓存最终合并结果
- `_lastProjectRoot`：记录上次使用的 projectRoot
- 缓存刷新条件：
  - `force=true`
  - `_agentList` 为 `null`（首次调用）
  - `projectRoot !== _lastProjectRoot`（项目切换）

## 4. 状态机 / 状态转换说明

本任务不涉及状态机。

## 5. 权限与幂等性说明

- **权限**：目录扫描为只读操作，不修改文件系统
- **幂等性**：`getAgentList(force, projectRoot)` 多次调用返回相同结果（缓存命中时）；`force=true` 或 `projectRoot` 变化时重新扫描，扫描操作是幂等的

## 6. 测试和验证结果

### 6.1 RED 阶段

新增测试全部失败（预期），已确认：
- `test-global-only` 不出现在结果中
- `project-backend-logic` 覆写未生效
- `global-backend-logic` 覆写未生效
- 缓存不随 projectRoot 变化刷新

### 6.2 GREEN 阶段

```
✓ 传入 projectRoot 时返回合并后的列表（含模板+全局+项目智能体）
✓ 项目级配置覆写全局级同名智能体（backend-logic-expert）
✓ 全局级配置覆写模板默认同名智能体（当无项目级时）
✓ 不传 projectRoot 时仅返回模板默认列表（向后兼容）
✓ projectRoot 变化时刷新缓存
```

### 6.3 全量回归

```
✓ 4 test files passed (59 tests total)
✓ ESLint: 0 errors, 0 warnings
✓ TypeScript: 0 type errors
```

## 7. 风险 / 未解决项

- **无风险**：实现为纯增量，不改变现有模板扫描逻辑，不破坏原有 API 契约
- **向后兼容**：`getAgentList()` 和 `getAgentList(true)` 仍返回模板默认列表，行为不变
- **注意**：全局配置目录扫描使用 `homedir()`，在 Windows 上路径格式为 `C:\Users\...`，已使用 `resolve` 处理

## 8. 推荐的下一步

- 前端 `agents.html` 可展示智能体的配置来源（模板/全局/项目），方便用户了解覆盖关系
- 可考虑扩展项目级配置支持 OpenCode/Codex 平台（`.opencode/agents/`、`.codex/agents/`）
