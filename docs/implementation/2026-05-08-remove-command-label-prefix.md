# TASK-008: 去掉指令标签 "/" 前缀 — UI 实现文档

## 1. 当前实现目标

将流水线看板侧边栏中指令标签的 "/" 前缀去掉，适配多平台调用方式（OpenCode 用 `--agent` 参数、Codex 用 skill 名）。

**修改前**: 侧边栏显示 `/jarvis`, `/jarvis-lite`, `/jarvis-fe`, `/jarvis-be`
**修改后**: 侧边栏显示 `jarvis`, `jarvis-lite`, `jarvis-fe`, `jarvis-be`

## 2. 对应需求 ID / 任务 ID

- **Requirement ID**: REQ-SL-010
- **Task ID**: TASK-008

## 3. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/web/views/pipeline.html` | 修改 | `COMMAND_LABELS` 中 4 个 label 值去掉 "/" 前缀 |
| `dist/src/web/views/pipeline.html` | 修改 | 源文件对应的编译输出，同步更新 |

**变更内容（第 322-327 行）**:

```javascript
// 修改前
const COMMAND_LABELS = {
  'full':     { label: '/jarvis',       cls: 'indigo' },
  'frontend': { label: '/jarvis-fe',    cls: 'blue' },
  'backend':  { label: '/jarvis-be',    cls: 'green' },
  'lite':     { label: '/jarvis-lite',  cls: 'amber' },
};

// 修改后
const COMMAND_LABELS = {
  'full':     { label: 'jarvis',       cls: 'indigo' },
  'frontend': { label: 'jarvis-fe',    cls: 'blue' },
  'backend':  { label: 'jarvis-be',    cls: 'green' },
  'lite':     { label: 'jarvis-lite',  cls: 'amber' },
};
```

## 4. 组件结构与布局说明

`COMMAND_LABELS` 在页面中有两处使用，均通过 `cmd.label` 渲染 `<span>` 元素：

1. **侧边栏会话列表**（第 530/559 行）:
   ```javascript
   var cmd = COMMAND_LABELS[s.pipeline_type] || { ... };
   // 渲染: '<span class="...">' + cmd.label + '</span>'
   ```

2. **归档记录面板**（第 988/1007 行）:
   ```javascript
   var cmd = COMMAND_LABELS[run.pipeline_type] || { ... };
   // 渲染: '<span class="...">' + cmd.label + '</span>'
   ```

两处共用同一个 `COMMAND_LABELS` 对象，修改后全部生效。

## 5. 样式方案说明

仅修改标签文本内容，不涉及样式变更。标签仍使用 `COMMAND_COLORS` 映射的 Tailwind 类名：
- `indigo` → `bg-indigo-100 text-indigo-700`（jarvis）
- `blue` → `bg-blue-100 text-blue-700`（jarvis-fe）
- `green` → `bg-emerald-100 text-emerald-700`（jarvis-be）
- `amber` → `bg-amber-100 text-amber-700`（jarvis-lite）

## 6. 响应式与无障碍说明

- 标签为 `flex-shrink-0 whitespace-nowrap`，不会在窄屏幕上换行
- 去掉 "/" 前缀后文本更短，所有视口下显示更紧凑
- 无障碍：标签在 `<button>` 内作为静态文本，无独立交互需求

## 7. 测试和验证结果

### 7.1 curl 直接验证 HTML 源

```bash
curl -s http://localhost:3457/dashboard | grep -A3 "COMMAND_LABELS"
```
输出确认 `COMMAND_LABELS` 中所有 label 值已无 "/" 前缀。

### 7.2 preview_inspect 精确样式验证

**目标元素**：`.font-mono.whitespace-nowrap`（标签 span）

| 属性 | 修改前 | 修改后 |
|------|--------|--------|
| `text` | `/jarvis` | `jarvis` |
| `width` | 42px | 36px |
| `color` | `rgb(67, 56, 202)` (indigo-700) | `rgb(67, 56, 202)` (不变) |
| `font-size` | 10px | 10px (不变) |
| `background-color` | `rgb(224, 231, 255)` (indigo-100) | `rgb(224, 231, 255)` (不变) |

### 7.3 preview_snapshot 页面结构验证

完整页面快照确认：
- `jarvis` 标签 — 所有完整流水线会话均显示无 "/" 前缀
- `jarvis-lite` 标签 — 轻量流水线会话显示无 "/" 前缀（例：`轻量流水线 20:31 jarvis-lite Gate D`）

### 7.4 验收标准逐条确认

| # | 验收标准 | 状态 |
|---|---------|------|
| 1 | 侧边栏会话项显示的指令标签为 `jarvis` / `jarvis-lite` / `jarvis-fe` / `jarvis-be` | 通过 |
| 2 | 无不含 "/" 前缀 | 通过 |
| 3 | 不影响平台筛选、状态判断等其他逻辑 | 通过（未修改任何逻辑代码） |

## 8. 风险 / 未解决项

无风险。变更范围极小（4 个字符串值），不影响任何业务逻辑。

## 9. 推荐的下一步

任务已完成，可交付 qa-review-expert 进行评审。
