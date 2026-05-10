# TASK-005: 引擎 MCP 适配与 platform_info 增强

## 1. 当前实现目标

审核 `mcp-opencode.json` 配置并增强 `platform_info` MCP 工具，使其返回 `features` 字段，完整描述各平台特性（agent_count + available_models + features）。

## 2. 对应需求 ID / 任务 ID

- **需求 ID**: REQ-005, REQ-006
- **任务 ID**: TASK-005
- **任务名称**: 引擎 MCP 适配与 platform_info 增强

## 3. 输入依据

- **上游分配**: 编排者 Execution Packet (TASK-005)
- **依赖函数**: `getPlatforms()`, `getPlatformModels()`, `getAgentsByPlatform()`, `getAgentList()`（均来自 `agent-registry.ts`，已导入 `server.ts`）
- **参考配置**: `PLATFORM_CONFIG` 的 subdirs 映射（`agent-registry.ts` 第 40-44 行，但不可直接修改该文件）

## 4. 变更文件 / 变更范围

| 文件 | 操作 | 行数变化 |
|------|------|---------|
| `src/engine/server.ts` | 修改 | +75 行 |
| `tests/mcp-platform-info.test.ts` | 新增 | +175 行 |

**未变更文件**:
- `src/engine/agent-registry.ts` (forbidden_paths)
- `src/engine/gates.ts` (forbidden_paths)
- `src/engine/db.ts` (forbidden_paths)
- `src/templates/mcp-opencode.json` (审核通过，无需修改)

## 5. 实现说明

### 5.1 mcp-opencode.json 审核结果

**审核通过**，配置项均正确：

1. **`$schema`**: 引用 `https://opencode.ai/config.json`，符合 OpenCode 配置规范
2. **`playwright` MCP**: 使用 `npx -y @playwright/mcp@latest`，标准 Playwright MCP 启动方式，正确
3. **`jarvis-engine` MCP**: 使用 `jarvis engine start --stdio`，与 `server.ts` 中 stdio transport 模式（第 91-108 行）完全匹配
4. **`enabled: true`** 与 **`type: "local"`** 配置符合本地 MCP 标准

### 5.2 PLATFORM_FEATURES 常量

在 `server.ts` 中新增平台特性映射常量，根据 `PLATFORM_CONFIG.subdirs` 推导（排除 `agents` 通用目录）：

```typescript
const PLATFORM_FEATURES: Record<string, string[]> = {
  claude: ['commands'],    // 自定义命令
  opencode: ['plugins'],   // 插件市场
  codex: [],              // 无额外特性
};
```

### 5.3 resolvePlatformInfo 函数

将原 `platform_info` 工具的核心逻辑提取为独立导出函数 `resolvePlatformInfo(platform?: string): PlatformInfoResult`，实现以下增强：

1. **features 字段**: 无论汇总模式还是单平台模式，均返回 `features` 数组
2. **类型安全**: 定义 `PlatformInfoSingle`、`PlatformInfoSummary`、`PlatformInfoError` 接口及联合类型 `PlatformInfoResult`
3. **可测试性**: 提取为独立函数，不依赖 MCP 工具框架，可直接单元测试

### 5.4 MCP 工具描述优化

原描述: `'获取平台信息：支持哪些平台（claude/opencode/codex）、各平台 Agent 数量、可用模型列表。用于引擎扩展和平台适配。'`

新描述: `'获取平台信息：支持哪些平台（claude/opencode/codex）、各平台 Agent 数量、可用模型列表、平台特性（features）。Claude 支持 commands 特性，OpenCode 支持 plugins 特性，Codex 无额外特性。用于引擎扩展和平台适配。'`

增加了 features 的说明和各平台特性描述。

### 5.5 返回格式变化

**汇总模式（不传参）**:
```json
{
  "platforms": {
    "claude": { "agent_count": N, "available_models": [...], "features": ["commands"] },
    "opencode": { "agent_count": N, "available_models": [...], "features": ["plugins"] },
    "codex": { "agent_count": N, "available_models": [...], "features": [] }
  },
  "total_agents": N
}
```

**单平台模式（传 platform）**:
```json
{
  "platform": "opencode",
  "agent_count": N,
  "available_models": [...],
  "features": ["plugins"],
  "agents": [...]
}
```

仅增加了 `features` 字段，其他字段保持不变（向后兼容）。

## 6. 测试和验证结果

### 6.1 TDD 测试（tests/mcp-platform-info.test.ts）

| 测试场景 | 测试数 | 状态 |
|---------|-------|------|
| 不传参数：三平台信息完整 | 3 | PASS |
| 指定 opencode: features + agents | 3 | PASS |
| 指定 claude: features | 2 | PASS |
| 指定 codex: features (空数组) | 1 | PASS |
| 未知平台：错误处理 | 2 | PASS |
| **合计** | **11** | **ALL PASS** |

### 6.2 全量测试

```
Test Files  6 passed (6)
     Tests  79 passed (79)
```

### 6.3 代码质量

| 检查项 | 结果 |
|--------|------|
| TypeScript typecheck (`tsc --noEmit`) | PASS |
| ESLint | PASS (0 errors) |
| Build (`npm run build`) | PASS |

## 7. 数据与接口边界

- **输入边界**: `platform` 参数为可选字符串，有效值 `claude` / `opencode` / `codex`
- **输出边界**: 返回对象中的 `features` 始终为字符串数组（可能为空数组）
- **共享区域**: 未修改任何共享类型、契约或配置
- **依赖稳定性**: `getPlatforms()`, `getPlatformModels()`, `getAgentsByPlatform()`, `getAgentList()` 接口不变

## 8. 风险 / 未解决项

1. **PLATFORM_FEATURES 硬编码**: 当前 features 映射硬编码在 `server.ts` 中。若 `agent-registry.ts` 中 `PLATFORM_CONFIG.subdirs` 发生变化（如 codex 增加 commands 支持），需要同步更新此映射。理想方案是从 `agent-registry.ts` 导出平台特性，但需编排者 授权修改该文件。
2. **Codex features 为空数组**: 这与 `codex.subdirs = ['agents']` 一致（除 `agents` 外无其他子目录），正确反映了 Codex 当前无额外平台特性。
3. **无回退风险**: 新增的 `features` 字段为纯增量，不影响现有调用方（下游客户端可选择性消费）。

## 9. 需要前端配合的点

- **无**: 本次变更为纯后端 MCP 工具增强，前端无需配合修改。
- 前端 Web 面板未消费 `platform_info` MCP 工具，不受影响。

## 10. 推荐的下一步

- **编排者**: 验证 `platform_info` 工具在真实 MCP 环境（stdio 模式）下的行为
- **后续优化（独立任务）**: 考虑从 `agent-registry.ts` 导出 `getPlatformFeatures()` 函数，消除 `server.ts` 中的硬编码映射
