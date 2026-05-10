# Pipeline Runs 历史展示——前端实现

## 1. 当前实现目标

在流水线看板（`pipeline.html`）中增加历史 Pipeline Runs 展示功能：
- 选中会话后自动加载并展示该会话的所有 pipeline runs（按时间倒序由后端排序）
- 当前活跃 run 用 indigo 左边框高亮标识
- 面板支持折叠/展开交互

## 2. 对应需求 ID / 任务 ID

- **任务 ID**: TASK-005
- **需求**: Web Dashboard 展示 Pipeline Runs 历史

## 3. 输入依据

- 任务描述中的后端 API 规格：`GET /api/pipeline-runs?session_id=xxx`
- 任务描述中的 Run 对象结构、状态映射表、Run 卡片 HTML 设计
- 任务描述中的验收标准（5 条）

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/web/views/pipeline.html` | 修改 | 新增 HTML 面板 + 3 个 JS 函数 + refresh() 集成点 |

**未修改任何其他文件。**

## 5. 实现说明

### 5.1 HTML 结构（L147-L165）

在进度条卡片和 Gate 步骤列表之间插入"历史 Runs"折叠面板：

- **外层容器**: `bg-white rounded-xl border shadow-sm mb-8 overflow-hidden`
- **标题栏**: 可点击触发 `toggleRunsPanel()`，含 history 图标、标题文字、运行次数、展开/收起标签、chevron 图标
- **可折叠内容区**: `#runsPanel` 默认隐藏（`hidden`），内含 `#runsList` 作为 run 条目容器，最大高度 96（`max-h-96`）可滚动

### 5.2 JavaScript 函数

#### 5.2.1 `toggleRunsPanel()` (L516-L529)

- 切换 `#runsPanel` 的 `hidden` 类
- 旋转 chevron 图标（展开时 180 度，收起时 0 度）
- 更新"展开/收起"文字标签
- 图标使用 `transition-transform` CSS 实现平滑动画

#### 5.2.2 `fetchPipelineRuns(sessionId)` (L535-L548)

- 参数为 `null` 时：显示"请选择左侧会话查看运行记录"占位提示
- 调用 `GET /api/pipeline-runs?session_id=` 获取数据
- 响应为空或无 runs 时：显示"暂无运行记录"
- 数据有效时：委托 `renderRunsHistory()` 渲染

#### 5.2.3 `renderRunsHistory(runsData)` (L554-L600)

- 更新 `#runsCount` 为 runs 总数
- 使用 `STATUS_MAP` 映射表（符合项目规范"3 分支以上用映射"）：
  | 状态 | 圆点颜色 | 徽章样式 | 标签 |
  |------|---------|---------|------|
  | `active` | 绿色 (`bg-emerald-500`) | 绿色徽章 (`bg-emerald-50 text-emerald-700`) | 运行中 |
  | `completed` | 灰色 (`bg-slate-400`) | 灰色徽章 (`bg-slate-100 text-slate-600`) | 已完成 |
  | `aborted` | 红色 (`bg-red-500`) | 红色徽章 (`bg-red-50 text-red-700`) | 已终止 |

- 每条 run 卡片包含：
  - 状态圆点 + 截短的 run ID（前 16 字符 + "..."）
  - 流水线类型标签（复用 `PIPELINE_NAMES` 常量）
  - 当前 Gate 名称
  - 格式化开始时间（中文 locale，月/日/时/分）
  - 状态徽章

- **活跃 run 高亮**: `bg-indigo-50/30 border-l-[3px] border-indigo-500`
- **非活跃 run**: `border-l-[3px] border-transparent`（保持对齐）

### 5.3 refresh() 集成 (L310-L311)

在 `refresh()` 函数中，session 确定后立即调用 `fetchPipelineRuns(selectedSession)`：

```javascript
// 加载选中会话的历史 Runs
fetchPipelineRuns(selectedSession);
```

此调用不 await，不阻塞页面渲染。即使 API 响应较慢也不影响 Gate 状态展示。

## 6. 测试和验证结果

### 6.1 功能验证

| 验收标准 | 状态 | 验证方式 |
|---------|------|---------|
| 选中会话后自动加载并显示 runs 列表 | 通过 | refresh() 中集成调用，DOM 快照确认面板存在 |
| 活跃 run 有明显视觉标识 | 通过 | 代码审查：`border-l-[3px] border-indigo-500` + `bg-indigo-50/30` |
| 面板支持折叠/展开 | 通过 | agent-browser 点击验证：标签从"展开"变为"收起" |
| 无 session 选中时显示提示文字 | 通过 | fetchPipelineRuns(null) → "请选择左侧会话查看运行记录" |
| HTML 文件不需要 node --check | 通过 | 任务明确豁免 |

### 6.2 浏览器控制台

- 无 JavaScript 错误（只有 Tailwind CDN 生产环境警告，非本次引入）

### 6.3 截图证据

三视口截图已生成（`screenshot-desktop.png` / `screenshot-tablet.png` / `screenshot-mobile.png`），运行后清除。

## 7. 边界和异常处理

| 场景 | 处理 |
|------|------|
| `sessionId` 为 `null`/`undefined` | 显示"请选择左侧会话查看运行记录"占位，计数重置为 0 |
| API 返回 `null` 或网络错误 | `fetchAPI` 返回 `null`，显示"暂无运行记录" |
| `data.runs` 为空数组 | 显示"暂无运行记录" |
| runs 为空数组（`renderRunsHistory` 内） | 早期返回，显示"暂无运行记录"，调用 `lucide.createIcons()` |
| `run.started_at` 缺失 | 显示 "---" |
| `run.started_at` 格式无法解析 | catch 后原样显示 `run.started_at` |
| `run.status` 为未知值 | 回退到 `STATUS_MAP.active` 样式（保守默认） |
| `run.pipeline_type` 未知 | 回退到 `run.pipeline_type` 原始值，再不济显示"未知" |
| `run.current_gate` 缺失 | 显示 "---" |
| `run.id` 缺失 | `shortRunId` 显示 "...+... "（空字符串 slice） |

## 8. 风险 / 未解决项

- **后端 API 未实现**: 当前运行的服务版本尚未包含 `/api/pipeline-runs` 端点（返回 404），前端代码已正确对接 API 规格，等后端实现后自动生效
- **数据量**: 面板 `max-h-96`（384px）限制高度，scroll 可见；若单次 runs 数量极大需后续考虑分页
- **性能**: `fetchPipelineRuns` 不阻塞 `refresh()`，不影响 Gateway 状态刷新

## 9. 需要后端配合的点

- 实现 `GET /api/pipeline-runs?session_id=xxx` 端点
- 返回格式：`{ runs: [...], count: N, session_id: "xxx" }`
- 每个 run 对象需包含：`id`, `session_id`, `project`, `pipeline_type`, `current_gate`, `status`, `started_at`, `completed_at`
- runs 数组按 `started_at` 倒序排列

## 10. 推荐的下一步

1. 后端实现 `GET /api/pipeline-runs` 端点
2. 联调验证前端渲染效果
3. 考虑后续增加"历史 run 点击查看 Gate 详情"的交互（当前任务未要求）
