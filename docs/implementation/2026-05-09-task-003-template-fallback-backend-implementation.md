# TASK-003：agent-registry.ts 模板路径回退 — 后端实现文档

**日期**：2026-05-09
**作者**：后端全栈实现者
**对应任务 ID**：TASK-003
**对应需求 ID**：REQ-002

---

## 1. 当前实现目标

为 `src/engine/agent-registry.ts` 增加模板路径 fallback 机制：
- **优先**：从编译后的 `dist/src/templates/platforms` 读取
- **回退**：`dist` 路径不存在时，自动回退到源码目录 `src/templates/platforms`
- **惰性解析**：`getAgentList` 在首次调用时才解析模板路径（而非模块加载时）

## 2. 对应需求 ID / 任务 ID

- REQ-002（TASK-001 已修复 build 脚本，确保 `dist/src/templates` 在构建后存在）
- TASK-003 负责在运行时端增加 fallback 保护

## 3. 输入依据

- 编排者分配的子任务 `TASK-003`
- 项目约束文件 `CLAUDE.md`、`AGENTS.md`
- TDD 方法论 (`test-driven-development` skill)
- 源码驱动开发 (`source-driven-development` skill)
- `package.json` 中的构建脚本：`cpSync('src/templates','dist/src/templates',{recursive:true})`

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/engine/agent-registry.ts` | 修改 | 新增 `resolveTemplatesDir()`，移除模块级 `TEMPLATES_DIR`，`scanPlatform` 接收 `templatesDir` 参数 |
| `tests/agent-registry.test.ts` | 新建 | 9 个测试用例：resolveTemplatesDir (3)、getAgentList (4)、getAgentFiles (1)、getCategories (1) |

## 5. 实现说明

### 5.1 问题根因

模块加载时直接执行 `TEMPLATES_DIR = resolve(__dirname, '..', 'templates', 'platforms')`：
- **编译后**：路径为 `dist/src/templates/platforms`（依赖 build 脚本复制模板）
- **本地 dev**（`tsx` 直接执行 TypeScript）：路径为 `src/templates/platforms`
- **风险场景**：若 build 脚本未执行或模板未复制，运行时直接不可用

### 5.2 解决方案

#### 新增 `resolveTemplatesDir()` 函数

```typescript
export function resolveTemplatesDir(existsCheck?: (_p: string) => boolean): string {
  const check = existsCheck ?? ((p: string) => existsSync(p));
  const __dirname = getDirname();

  // 优先：编译后 dist 路径
  const distPath = resolve(__dirname, '..', 'templates', 'platforms');
  if (check(distPath)) return distPath;

  // 回退：源码目录
  const projectRoot = resolve(__dirname, '..', '..', '..');
  const srcPath = resolve(projectRoot, 'src', 'templates', 'platforms');
  return srcPath;
}
```

**设计要点**：
1. **优先路径**：`resolve(__dirname, '..', 'templates', 'platforms')`
   - 编译模式：`dist/src/templates/platforms`
   - dev 模式：`src/templates/platforms`
2. **回退路径**：`resolve(projectRoot, 'src', 'templates', 'platforms')`
   - 从编译后的 `dist/src/engine/` 向上 3 级到项目根，再定位 `src/templates/platforms`
3. **测试注入**：可选参数 `existsCheck` 允许测试注入 mock 函数，无需 mock 整个 `node:fs` 模块

#### `getAgentList` 惰性解析

```typescript
export function getAgentList(force?: boolean): AgentItem[] {
  if (force || !_agentList) {
    const templatesDir = resolveTemplatesDir();  // 惰性调用
    // ... 扫描逻辑
  }
  return _agentList;
}
```

#### `scanPlatform` 参数化

```typescript
function scanPlatform(platformKey, config, templatesDir: string): { agents, fileMap } {
  const platformDir = resolve(templatesDir, config.dir);
  // ...
}
```

### 5.3 路径解析行为表

| 运行模式 | `__dirname` | 优先路径 | 回退路径 |
|---------|------------|---------|---------|
| `tsx` (dev) | `src/engine/` | `src/templates/platforms` | projectRoot + `src/templates/platforms` |
| `node` (prod) | `dist/src/engine/` | `dist/src/templates/platforms` | projectRoot + `src/templates/platforms` |

## 6. 测试和验证结果

### 6.1 测试执行

```
> npx vitest run

 Test Files  4 passed (4)
      Tests  54 passed (54)
   Start at  13:46:47
   Duration  468ms
```

### 6.2 新增测试用例

| 测试套件 | 测试用例 | 验证点 |
|---------|---------|-------|
| `resolveTemplatesDir` | dist 路径存在时优先返回 dist 路径 | mock `existsCheck` 返回 true，验证路径包含 `templates/platforms` |
| `resolveTemplatesDir` | dist 路径不存在时回退到源码路径 | mock `existsCheck` 返回 false，验证路径包含 `src/templates/platforms` |
| `resolveTemplatesDir` | 返回的路径是绝对路径 | 验证返回值以 `/` 或盘符开头 |
| `getAgentList` | 返回非空 agent 列表 | 验证 `agents.length > 0` |
| `getAgentList` | 每个 agent 包含必要字段 | 验证 `id/name/role/icon/platform/defaultModel/defaultEffort/category` |
| `getAgentList` | force=true 时重新扫描 | 验证两次扫描结果数量一致 |
| `getAgentList` | 覆盖三个平台 | 验证包含 `claude/opencode/codex` |
| `getAgentFiles` | 返回非空文件映射 | 验证映射包含 `base/type` 字段 |
| `getCategories` | 返回预定义分类 | 验证包含 `'全部'/'实现'/'测试'` |

### 6.3 编译后验证

```bash
$ node -e "import { resolveTemplatesDir, getAgentList } from './dist/src/engine/agent-registry.js'"

templatesDir: E:\CodeStore\jarvis\dist\src\templates\platforms
agent count: 157
platforms: [ 'claude', 'opencode', 'codex' ]
```

### 6.4 质量门通过

| 检查项 | 结果 |
|--------|------|
| `npx tsc --noEmit` | 零错误 |
| `npx vitest run` | 54/54 通过 |
| `npx eslint src/engine/agent-registry.ts tests/agent-registry.test.ts` | 零警告/零错误 |
| `npm run build` | 构建成功 |

## 7. 数据与接口边界

- **导出 API 不变**：`getAgentList`、`getAgentFiles`、`getAgentsByPlatform`、`getPlatforms`、`getPlatformModels` 签名和行为不变
- **新增导出**：`resolveTemplatesDir`（用于测试注入，也可供外部调用）
- **不变类型**：`AgentItem`、`AgentFileMap`、`PLATFORM_CONFIG` 未修改

## 8. 风险 / 未解决项

| 风险 | 等级 | 说明 |
|------|-----|------|
| 回退路径在 dev 模式下可能不正确 | 低 | dev 模式下优先路径（`src/templates/platforms`）始终存在，回退不会被触发 |
| 若用户从非项目根运行 CLI | 低 | `resolveTemplatesDir` 使用 `fileURLToPath(import.meta.url)` 定位模块位置，与 cwd 无关 |

## 9. 需要前端配合的点

无。本变更为纯后端路径解析逻辑，不影响前端契约。

## 10. 推荐的下一步

1. 正交验证：在无 `dist/` 目录的干净环境中运行 `npm run dev` 确认回退生效
2. 若编排者有其他模板相关的任务，可继续推进
3. 考虑后续将 `scanPlatform` 中的 `push` 改为不可变操作（不在本次范围）
