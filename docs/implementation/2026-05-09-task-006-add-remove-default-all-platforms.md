# TASK-006：统一 jarvis add/remove 无参数行为

## 1. 当前实现目标

`jarvis add` 和 `jarvis remove` 命令在无平台参数时默认操作全部平台（与 `jarvis init` 行为一致），而非直接报错 "No valid platform specified"。

## 2. 对应需求 ID / 任务 ID

- 任务 ID：TASK-006
- 需求：统一 jarvis add/remove 无参数行为

## 3. 输入依据

- `src/cli.ts` 第 124-136 行（`init` 命令参考实现）
- `src/cli.ts` 第 138-165 行（`add` 命令当前实现）
- `src/cli.ts` 第 167-205 行（`remove` 命令当前实现）
- `src/install.ts`（`install` 函数确认确认流程）

## 4. 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/cli.ts` | 修改 12 行 | `add` 和 `remove` 分支各增加 1 个条件判断 |

## 5. 实现说明

### 5.1 根因

`jarvis init` 在无平台参数时直接使用 `ALL_PLATFORMS`（第 131 行循环），而 `add` 和 `remove` 命令在 `platforms.length === 0` 时直接报错退出。

### 5.2 修改逻辑

在 `add` 和 `remove` 的 `platforms.length === 0` 判断中增加一层检查：

```typescript
if (platforms.length === 0) {
  if (positional.length === 1) {
    // 无平台参数时默认操作全部平台（与 init 行为一致）
    platforms.push(...ALL_PLATFORMS);
  } else {
    // 有额外参数但无一匹配 → 报错
    console.error('\n❌  No valid platform specified.\n');
    console.log(`Valid platforms: ${ALL_PLATFORMS.join(', ')}\n`);
    return;
  }
}
```

**判断依据**：`positional` 数组第一个元素永远是命令名（`add`/`remove`/`rm`）。若 `positional.length === 1`，说明用户没有提供任何额外参数，此时默认全部平台。若 `positional.length > 1`，说明用户提供了参数但都不是有效平台名，此时报错。

### 5.3 各场景行为

| 命令 | `positional` | `length` | 行为 |
|------|-------------|----------|------|
| `jarvis add` | `['add']` | 1 | 默认全部平台 → 安装 claude/opencode/codex |
| `jarvis add claude` | `['add', 'claude']` | 2 | 仅安装 claude |
| `jarvis add invalid` | `['add', 'invalid']` | 2 | 报错 + 显示有效平台列表 |
| `jarvis remove` | `['remove']` | 1 | 默认全部平台 → 移除 claude/opencode/codex |
| `jarvis remove claude` | `['remove', 'claude']` | 2 | 仅移除 claude |
| `jarvis rm invalid` | `['rm', 'invalid']` | 2 | 报错 + 显示有效平台列表 |

### 5.4 确认流程说明

- `add`：通过 `opts.yes` 控制 `install` 的 `force` 参数，`install` 内部会在目标已存在时询问 "merge?"
- `remove`：通过 `opts.yes` 控制逐平台删除确认，无 `-y` 时会询问 "Remove <dir>? [y/N]"

## 6. 测试和验证结果

### 自动化验证

| 检查项 | 结果 |
|--------|------|
| `npx eslint src/cli.ts` | 通过（零输出） |
| `npx tsc --noEmit` | 通过（零输出） |
| `npx vitest run` | 54/54 通过 |

### 验收标准验证

| # | 标准 | 状态 |
|---|------|------|
| 1 | `jarvis add` 不带参数 → 默认安装全部平台（有交互确认）| 通过 |
| 2 | `jarvis remove` 不带参数 → 同样行为 | 通过 |
| 3 | `jarvis add invalid_platform` → 报错提示有效平台 | 通过 |
| 4 | 现有 `jarvis init` 行为不变 | 通过（未修改 init 分支） |

## 7. 数据与接口边界

- 无新增 API、数据库表、共享类型
- 仅修改 CLI 入口的命令分发逻辑
- `ALL_PLATFORMS` 和 `PLATFORMS` 常量未变更

## 8. 风险 / 未解决项

- **低风险**：`jarvis remove` 无参数时默认全部平台，虽为设计意图，但是破坏性操作。已有逐平台确认（`-y` 跳过确认）作为安全网。
- **未解决**：`jarvis add claude invalid_platform` 混合参数场景会将 `invalid_platform` 当作路径处理（`path = 'invalid_platform'`），这是改动前即存在的路径解析行为，不属于本次修改范围。

## 9. 需要前端配合的点

无。

## 10. 推荐的下一步

无需后续步骤。本次修改是独立的后端 CLI 行为修正。
