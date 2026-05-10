# TASK-002: Agent 自动设置任务名称

## 1. 当前实现目标

在 `pipeline_init` MCP 工具 handler 中，创建 pipeline run 后自动调用 `setRunTaskName()` 设置默认 task_name。

## 2. 对应需求 ID / 任务 ID

- **requirement_ids**: REQ-SL-008
- **task_id**: TASK-002

## 3. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/engine/server.ts` | 修改 | 在 `pipeline_init` handler 中添加自动命名逻辑 |

**变更行数**: 新增 7 行（第 262-269 行），未删除任何代码。

## 4. 业务规则说明

### 4.1 自动命名规则

在 `pipeline_init` 创建新 `pipeline_run` 后，自动生成默认 task_name：

1. 提取项目名最后一段：`E:\CodeStore\jarvis` → `jarvis`
2. 格式：`"<项目名最后段> 流水线任务 · <MM-DD>"`
3. 分隔符使用中间点 `·`（U+00B7）
4. 日期格式 `MM-DD`（如 `05-08`）

### 4.2 实现细节

```typescript
// 提取项目名最后一段路径
const effectiveProject = project_name || root;
const projectShortName = effectiveProject.split(/[\\/]/).filter(Boolean).pop() || effectiveProject;

// 生成日期部分
const now = new Date();
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');

// 组装并写入
const defaultTaskName = `${projectShortName} 流水线任务 · ${mm}-${dd}`;
setRunTaskName(db, runId, defaultTaskName);
```

### 4.3 边界处理

- `project_name` 为 `undefined` 时，回退到 `root`（引擎启动时传入的项目根路径）
- 路径分割后 `filter(Boolean)` 去除空字符串，`pop()` 取最后一段
- 若 `pop()` 返回 `undefined`（极端情况），回退到完整路径

## 5. 状态机 / 状态转换说明

不涉及状态机变更。`setRunTaskName` 是纯粹的字段更新操作，不影响 pipeline run 的 Gate 状态。

## 6. 权限与幂等性说明

- **权限**: `pipeline_init` 仅要求有效的 `session_id`，与现有逻辑一致
- **幂等性**: `setRunTaskName` 内部使用 `UPDATE pipeline_runs SET task_name=? WHERE id=?`，重复调用结果一致；每次 `pipeline_init` 创建新 run 分配新 `runId`，不会覆盖其他 run 的名称
- **向后兼容**: 不修改 MCP schema 签名，`project_name` 参数可选性不变

## 7. 测试和验证结果

| 检查项 | 结果 |
|--------|------|
| TypeScript 类型检查 (`tsc --noEmit`) | 通过 |
| ESLint (`npm run lint`) | 通过 |
| 构建 (`npm run build`) | 通过 |
| 单元测试 (`vitest run`) | 24/24 通过 |

## 8. 风险 / 未解决项

- **单元测试覆盖**: `pipeline_init` 工具暂无单元测试文件。当前任务约束为仅修改 `src/engine/server.ts`，未创建新的测试文件。建议后续任务（TDD 策略）补充该 handler 的单元测试。
- **`session_join` 中的自动命名**: `session_join` 工具中也有 `createPipelineRun()` 调用（用于无活跃 run 时自动创建），但当前任务范围限定为 `pipeline_init`，未对其添加自动命名逻辑。

## 9. 推荐的下一步

1. 由 `qa-review-expert` 评审本次变更
2. 考虑在 `session_join` 中同步添加自动命名逻辑
3. 为 `pipeline_init` 工具补充单元测试
