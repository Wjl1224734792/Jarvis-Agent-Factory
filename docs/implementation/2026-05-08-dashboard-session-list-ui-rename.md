# TASK-DASH-002：Web Dashboard 会话列表 UI 改造

## 实现目标

将会话列表卡片中的会话 ID 替换为 `task_name`，并将 `pipeline_type` 标签替换为指令标签（如 `/jarvis`），调整卡片布局。

## 对应需求 / 任务

- 需求 ID：REQ-DASH-002
- 任务 ID：TASK-DASH-002

## 输入依据

- 任务文档（TASK-DASH-002）：会话列表 UI 改造规格，含 `COMMAND_LABELS` 常量定义、卡片布局要求、验收标准
- 上游文件：`src/web/views/pipeline.html`（现有 `renderSessions()` 函数）、`src/web/routes.ts`（现有 `broadcastSSE()` 和 `/api/sessions` 端点）
- 数据库 schema：`pipeline_runs` 表已含 `task_name` 列（迁移添加），`getActiveRun()` 函数已存在

## 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/web/views/pipeline.html` | 修改 | 新增 `COMMAND_LABELS`/`COMMAND_COLORS` 常量；重写 `renderSessions()` 卡片布局 |
| `src/web/routes.ts` | 修改 | `broadcastSSE()` 和 `/api/sessions` 增加 `task_name` 字段透传 |

## 实现说明

### 1. 前端常量新增（pipeline.html）

在 `PIPELINE_NAMES` 常量下方新增两个常量：

```javascript
const COMMAND_LABELS = {
  'full':     { label: '/jarvis',       cls: 'indigo' },
  'frontend': { label: '/jarvis-fe',    cls: 'blue' },
  'backend':  { label: '/jarvis-be',    cls: 'green' },
  'lite':     { label: '/jarvis-lite',  cls: 'amber' },
};

const COMMAND_COLORS = {
  indigo:  'bg-indigo-100 text-indigo-700',
  blue:    'bg-blue-100 text-blue-700',
  green:   'bg-emerald-100 text-emerald-700',
  amber:   'bg-amber-100 text-amber-700',
};
```

`cls` 字段使用语义颜色名，`COMMAND_COLORS` 映射为实际 Tailwind CSS 类名。

### 2. 会话卡片重写（pipeline.html renderSessions）

**原有布局**：`[status_dot] [session_id_truncated] [gate_badge] [pipeline_type_chinese_label]`

**新布局**：`[task_name_or_fallback] [command_tag] [gate_badge] [status_dot]`

关键逻辑：
- **标题**：`s.task_name` 有值时直接显示，为空时回退为 `PIPELINE_NAMES[type]` + `HH:MM` 时间戳格式（如 `完整流水线 14:30`）
- **指令标签**：从 `COMMAND_LABELS` 按 `pipeline_type` 查表，使用对应颜色类名
- **状态圆点**：移至卡片右端，保持颜色语义不变（emerald=在线、amber=休眠、slate=离线）
- **悬停**：title tooltip 显示完整信息（task_name + platform + ID），`hover:bg-slate-50` 保持不变
- **截断**：标题使用 `truncate` + `shrink min-w-0` 确保过长文本截断
- **标签**：指令标签和 Gate 标签使用 `flex-shrink-0 whitespace-nowrap` 防止被挤压

### 3. 后端 SSE/API 透传（routes.ts）

在 `broadcastSSE()` 和 `/api/sessions` 响应中，通过 `getActiveRun(db, sessionId)` 查询当前活跃 run 的 `task_name` 字段并透传：

```typescript
const run = getActiveRun(db, s.id);
// ...
task_name: run?.task_name || null,
```

`getActiveRun` 返回当前 session 最新一条 `status='active'` 的 pipeline_run。使用可选链 `?.` 安全访问，无活跃 run 时返回 `null`。

## 测试和验证结果

### 自动化验证

| 检查项 | 结果 |
|--------|------|
| TypeScript typecheck (`tsc --noEmit`) | 通过，零错误 |
| Build (`npm run build`) | 成功 |
| Lint (`npm run lint`) | 0 errors, 52 warnings（全部为已有 warning，无新增） |
| Unit tests (`vitest run`) | 2 files, 24 tests 全部通过 |

### 视觉验证

| 视口 | 截图路径 | 状态 |
|------|---------|------|
| Desktop (1280x800) | `docs/tmp/dashboard-desktop.png` | 通过 |
| Tablet (768x1024) | `docs/tmp/dashboard-tablet.png` | 通过 |
| Mobile (375x812) | `docs/tmp/dashboard-mobile.png` | 通过 |

验证要点：
- 有 `task_name` 的会话（如 `给web增加归档功能`、`新任务名`）正确显示任务名
- 无 `task_name` 的会话正确回退显示 `完整流水线 HH:MM`
- 所有会话显示 `/jarvis` 指令标签（当前测试数据均为 `full` 流水线类型）
- Gate 标签正确显示（`Gate A`、`Gate C`、`?`）
- 状态圆点位于卡片右端
- 悬停高亮和选中态（`bg-indigo-50`）正常

## 验收标准逐条对照

| # | 验收标准 | 状态 |
|---|---------|------|
| 1 | 有 task_name 的会话显示 task_name，无则回退显示 | 通过 |
| 2 | 指令标签正确映射：full→`/jarvis`、frontend→`/jarvis-fe`、backend→`/jarvis-be`、lite→`/jarvis-lite` | 通过（已定义映射常量，全类型覆盖） |
| 3 | 卡片布局清晰：[task_name] [command_tag] [gate_badge] [status_dot] | 通过（snapshot + visual 确认） |
| 4 | SSE 数据中包含 task_name 字段 | 通过（broadcastSSE 和 /api/sessions 均已添加） |

## 边界和异常处理

| 场景 | 处理方式 |
|------|---------|
| `task_name` 为 `null`/`undefined`/空字符串 | 回退显示 `PIPELINE_NAMES[type]` + `HH:MM` 时间戳 |
| `heartbeat` 为 `null`/不存在 | 时间戳部分为空，回退标题仅显示中文名 |
| `pipeline_type` 不在 `COMMAND_LABELS` 中 | 降级为原始 `pipeline_type` 值 + `indigo` 颜色 |
| `pipeline_type` 不在 `PIPELINE_NAMES` 中 | 降级为原始值 |
| `getActiveRun()` 返回 `undefined` | 使用 `?.task_name` 可选链，结果为 `null` |

## 风险 / 未解决项

1. **数据库查询开销**：每个会话卡片渲染时向 `/api/sessions` 发起一次请求，后端在每个 session 上额外调用 `getActiveRun()`。当前 session 数量（<50）下性能无忧，未来若扩展到数百个 session 可考虑批量查询优化。

2. **静态文件构建**：当前 `tsc` 编译不会复制 `src/web/views/*.html` 到 `dist/` 目录。在 dev 模式（`tsx`）下不受影响；在 compiled 模式下需手动复制或添加构建步骤。此为**已有问题**，非本次引入。

## 需要后端配合的点

- `setRunTaskName()` 函数（`src/engine/db.ts`）和 PATCH `/api/pipeline-runs/:id/name` 端点已由并行工作实现，无需额外后端配合
- `getActiveRun()` 函数已存在于 `src/engine/db.ts`，无需新增

## 推荐的下一步

- 后续任务可将 `task_name` 在会话列表中的显示格式进一步优化（如添加图标、截断长度调整）
- 可考虑在 `renderRunsHistory()` 中也统一使用 `COMMAND_LABELS` 替换 `PIPELINE_NAMES` 标签，保持历史 Runs 面板视觉一致
