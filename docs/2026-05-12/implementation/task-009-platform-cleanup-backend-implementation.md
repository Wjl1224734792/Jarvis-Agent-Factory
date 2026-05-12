# TASK-009: Codex/OpenCode 模板删除 + 平台代码清理 — 后端实现文档

## 1. 当前实现目标

删除所有 codex/opencode 模板文件，精简平台引用为仅 claude。

## 2. 对应需求 ID / 任务 ID

- **TASK-009**: Codex/OpenCode 模板删除 + 平台代码清理

## 3. 输入依据

- 编排者分配的任务描述（TASK-009）
- 现有代码文件读取分析

## 4. 变更文件 / 变更范围

### 删除的文件

| 路径 | 说明 | 数量 |
|------|------|------|
| `src/templates/platforms/codex/` | Codex 模板（agents + skills + config.toml） | ~97 文件 |
| `src/templates/platforms/opencode/` | OpenCode 模板（agents + skills + plugins + tools + package.json + node_modules） | ~3,556 文件 |
| `tests/gate-hook.test.ts` | OpenCode gate hook 插件测试（已被删除的模板依赖） | 1 文件 |
| `tests/tools.test.ts` | OpenCode 自定义工具测试（已被删除的模板依赖） | 1 文件 |

### 修改的文件

| 文件 | 变更说明 |
|------|----------|
| `src/engine/agent-registry.ts` | PLATFORM_CONFIG 仅保留 claude；PLATFORM_FEATURES 仅 claude；移除 parseTomlFrontmatter；简化 scanPlatform（移除 plugins 扫描）；简化 getAgentList/scallAllProjectAgents 三平台循环为 claude 直调 |
| `src/engine/server.ts` | session_join platform enum 精简为 `['claude', 'other']`；platform_info MCP 工具描述更新；resolvePlatformInfo JSDoc 更新 |
| `src/web/routes.ts` | /api/status connected_platforms 仅查询 `['claude']` |
| `web/src/components/Layout.tsx` | PLATFORM_INFO 仅保留 claude；平台筛选按钮仅 `['all', 'claude']`；MCP 状态仅迭代 `['claude']` |
| `README.md` | 移除所有 opencode/codex 引用；更新平台维护状态表、入口速查表、统计表、架构图、CLI 命令、MCP 配置指南 |
| `README_EN.md` | 移除 OpenCode/Codex 章节；更新目录结构说明、Agent System 引用 |
| `tests/agent-registry.test.ts` | 更新三平台测试为仅 claude；移除 opencode 全局配置夹具；简化 AgentFileMap 类型断言 |
| `tests/mcp-platform-info.test.ts` | 更新契约测试：mock 数据仅 claude；新增 opencode/codex 查询错误返回测试 |

### 保留不变

- 数据库 `platform` 列 Schema 未修改
- `~/.claude/` 全局目录未修改
- 其他源文件（`install.ts`, `doctor.ts`, `agent-fs.ts`, `hook.ts` 等）保留原有 opencode/codex 引用作为历史兼容

## 5. 实现说明

### 5.1 agent-registry.ts 核心变更

**PLATFORM_CONFIG 精简：**
```typescript
const PLATFORM_CONFIG = {
  claude: { dir: 'claude', subdirs: ['agents', 'commands'], ext: '.md', type: 'md' },
};
```

**PLATFORM_FEATURES 精简：**
```typescript
export const PLATFORM_FEATURES: Record<string, string[]> = {
  claude: ['commands'],
};
```

**移除死代码：**
- `parseTomlFrontmatter()` 函数（codex .toml 专用，无调用者）
- `scanPlatform()` 中 OpenCode plugins 扫描分支
- `scanAllProjectAgents()` 中 opencode/codex 项目目录映射
- `getAgentList()` 中 GLOBAL_AGENT_DIRS / PROJECT_AGENT_DIRS 三平台循环
- `getPlatformModels()` 中 opencode/codex 模型补充

**parseAgentFile 简化：**
移除 TOML 解析分支，统一使用 MD frontmatter 解析（仅 claude 使用 .md）。

**AgentFileMap 类型更新：**
`type: 'md' | 'toml'` → `type: 'md'`

### 5.2 server.ts 变更

- `session_join` MCP 工具：platform enum 从 `['claude', 'opencode', 'codex', 'other']` 精简为 `['claude', 'other']`
- `platform_info` MCP 工具：描述从"claude/opencode/codex"更新为"当前仅支持 claude 平台"

### 5.3 routes.ts 变更

`/api/status` 端点 connected_platforms 循环从 `['claude', 'opencode', 'codex']` 改为 `['claude']`。

### 5.4 Layout.tsx 变更

- `PLATFORM_INFO` 对象移除 opencode/codex 条目
- 平台筛选按钮从 `['all', 'claude', 'opencode', 'codex']` 改为 `['all', 'claude']`
- MCP 状态区域从 `['claude', 'opencode', 'codex']` 改为 `['claude']`

### 5.5 README 变更

移除 opencode/codex 相关内容：
- 平台维护状态表（仅保留 Claude Code）
- 入口速查表（移除 OpenCode/Codex 列）
- 统计表（移除 OpenCode/Codex 列）
- 架构图（移除 .codex/config.toml 和 Codex 节点）
- MCP 配置指南（移除 OpenCode/Codex 配置行）
- CLI 命令（移除多平台 add/remove 语法）
- 快速开始描述（移除"三平台"措辞）
- Web 面板描述（移除 OpenCode/Codex MCP 状态引用）

## 6. 测试和验证结果

### 自动化验证

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 全量测试 | ✅ 242 passed (16 files) | 0 failures |
| TypeScript typecheck | ✅ 0 errors | tsc --noEmit |
| ESLint | ✅ 0 warnings | 修改文件无新增 |
| Build | ✅ 成功 | tsc + cpSync |
| Claude 模板完整性 | ✅ 111 files | 原始数量未变 |

### 验证的具体行为

| 测试场景 | 验证点 |
|----------|--------|
| getAgentList 平台覆盖 | 仅 claude 平台，platforms.size === 1 |
| getAgentFiles 类型 | 所有文件类型为 'md' |
| resolvePlatformInfo（无参） | 仅返回 claude 平台汇总 |
| resolvePlatformInfo(opencode) | 返回 Unknown platform 错误 |
| resolvePlatformInfo(codex) | 返回 Unknown platform 错误 |
| resolvePlatformInfo(claude) | 返回 features: ['commands'] |
| 三层配置合并 | 仅 claude 全局/项目配置生效 |

## 7. 数据与接口边界

### 契约变更

| 接口 | 变更 | 兼容性 |
|------|------|--------|
| MCP `session_join` platform enum | `['claude', 'other']`（移除 opencode/codex） | 旧客户端传入 opencode/codex 将失败 |
| MCP `platform_info` 返回 | 仅包含 claude 平台数据 | 旧客户端查询 opencode/codex 将收到错误 |
| REST `/api/status` connected_platforms | 仅包含 claude | 前端已同步更新 |
| REST `/api/platforms` | 仅包含 claude | 自动跟随 PLATFORM_CONFIG |

### 数据库兼容性

- `platform` 列保持不变，仍可存储 `'opencode'` 和 `'codex'` 历史值
- 现有会话的 platform 字段不受影响

## 8. 风险 / 未解决项

| 风险 | 级别 | 说明 |
|------|------|------|
| 旧 MCP 客户端兼容性 | 低 | 传入 opencode/codex 作为 platform 将导致 session_join 参数校验失败 |
| 历史会话数据显示 | 低 | Web 面板平台筛选仅显示 claude，openmode/codex 历史会话仍存在但不可筛选 |
| 安装器残留引用 | 低 | `src/install.ts` 仍保留 opencode/codex 安装逻辑，但安装时因模板目录不存在会跳过 |
| 诊断工具残留引用 | 低 | `src/doctor.ts` 仍保留 opencode/codex agent 数量统计，可能显示过时数据 |

## 9. 需要前端配合的点

- ✅ `Layout.tsx` 平台筛选已同步更新（仅 all/claude）
- ✅ MCP 状态面板已同步更新（仅显示 claude 连接状态）
- 前端其他使用 PLATFORM_INFO 或平台列表的组件已自动适配（通过 `PLATFORM_INFO[p]?.label || p` 的 fallback 逻辑）

## 10. 推荐的下一步

1. **清理安装器**（`src/install.ts`）：移除 opencode/codex 安装逻辑，简化 `jarvis init` 为仅部署 claude 配置
2. **清理诊断工具**（`src/doctor.ts`）：更新平台统计为仅 claude
3. **清理文件同步**（`src/engine/agent-fs.ts`）：移除 TOML 文件同步分支（当前因 AgentFileMap 仅返回 'md' 类型而成为死代码）
4. **前端归档页**（`web/src/pages/Archive.tsx`）：检查平台筛选逻辑是否需要更新
