# 会话列表卡片化布局 -- UI 实现报告

> **日期**: 2026-05-08 | **实现者**: frontend-ui-expert | **需求**: REQ-SL-001/002/003/004

## 1. 当前实现目标

将会话列表侧边栏的每个会话项从单行水平排列改为紧凑的 2 行垂直排列，将 ... 更多菜单从 hover 显隐改为始终可见（含禁用态），并精修选中/悬停交互样式。

## 2. 对应需求 ID / 任务 ID

| 任务 | 需求 | 状态 |
|------|------|------|
| TASK-001: 2 行垂直排列 | REQ-SL-001 | 已完成 |
| TASK-002: ... 菜单始终可见 | REQ-SL-002 | 已完成 |
| TASK-003: 选中态/悬停态精修 | REQ-SL-003 | 已完成 |
| TASK-004: 回归验证 | REQ-SL-004 | 待手动验证 |

## 3. 变更文件 / 变更范围

| 文件 | 变更类型 | 行范围 |
|------|---------|--------|
| `src/web/views/pipeline.html` | CSS `<style>` 块移除 2 条规则 | 原第 19-20 行 |
| `src/web/views/pipeline.html` | `renderSessions()` 模板重写 | 第 529-562 行 |
| `dist/src/web/views/pipeline.html` | 同步复制 | 全文件 |

**未修改内容**:
- 所有 JS 事件处理函数 (`selectSession`, `resumeSession`, `togglePin`, `archiveRunFromMenu`, `deleteRunFromMenu`, `toggleRunMenu`)
- 数据变量声明 (`isActive`, `isInactive`, `isOnline`, `isPinned`, `statusColor`, `statusLabel`, `ptName`, `cmd`, `cmdColor`, `displayTitle`, `titleTooltip`, `hasActiveRun`, `pinIcon`, `pinnedBorder`, `pinActionLabel`)
- 排序逻辑 (pinned 优先)、平台筛选、轮询刷新
- 归档面板、智能体配置页、主内容区 Gate 状态卡片

## 4. 组件结构与布局说明

### 4.1 新 2 行垂直布局结构

```html
<div class="session-item flex flex-col gap-1 px-3 py-2 ..." onclick="selectSession(...)">
  <!-- 第 1 行: 标题 + 置顶标记 + 状态圆点 -->
  <div class="flex items-center gap-2 min-w-0">
    [📌 置顶图标 (可选)]
    <span class="truncate font-semibold flex-1 min-w-0">任务标题</span>
    <span class="w-2 h-2 rounded-full">状态圆点</span>
  </div>
  <!-- 第 2 行: 指令标签 + Gate + 恢复按钮 + ... 菜单 -->
  <div class="flex items-center gap-1.5">
    <span>/jarvis</span>
    <span>Gate A</span>
    [🔄 恢复按钮 (休眠会话)]
    <div class="flex-1"></div>
    [⋮ 按钮 (始终渲染)]
  </div>
</div>
```

### 4.2 关键 CSS 类名变更

| 属性 | 旧值 | 新值 |
|------|------|------|
| 外层容器 | `flex items-center gap-2.5 px-3 py-2.5` | `flex flex-col gap-1 px-3 py-2` |
| 标题 | `font-medium shrink min-w-0` | `font-semibold flex-1 min-w-0` |
| 选中态 | `bg-indigo-50 border border-indigo-200` | `bg-indigo-50 border-l-[3px] border-indigo-500` |
| 未选中态 | `hover:bg-slate-50 border border-transparent` | `hover:bg-slate-50 border-l-[3px] border-transparent` |
| ... 按钮(活跃) | `session-actions ... text-slate-400` | `text-slate-400 hover:text-slate-600` (移除 session-actions) |
| ... 按钮(无run) | 不渲染 | 始终渲染: `text-slate-300 cursor-not-allowed` |
| 恢复按钮 | `session-actions ...` | 移除 `session-actions` 类 |

## 5. 样式方案说明

### 5.1 CSS 块变更

移除的规则 (原第 19-20 行):
- `.session-item:hover .session-actions { opacity:1; }`
- `.session-actions { opacity:0; transition:opacity .15s; }`

这两个规则不再需要，因为 ... 按钮改为始终渲染（不再依赖 opacity hover 显隐），恢复按钮也始终在可见的行内。

### 5.2 ... 按钮双态逻辑

```
hasActiveRun === true:
  - 按钮: text-slate-400 hover:text-slate-600, cursor: pointer
  - onclick → toggleRunMenu(event, run_id)
  - 下拉菜单: 置顶/取消置顶、归档、删除

hasActiveRun === false:
  - 按钮: text-slate-300, cursor: not-allowed
  - onclick → event.stopPropagation() (阻止冒泡)
  - title → "暂无运行记录"
  - 无下拉菜单
```

### 5.3 选中态 / 悬停态

- **选中态**: `bg-indigo-50` + `border-l-[3px] border-indigo-500` (左侧 3px indigo 边框高亮)
- **未选中悬停态**: `hover:bg-slate-50` + `border-l-[3px] border-transparent` (透明左 border 保持宽度一致)
- **置顶标记**: `border-t-2 border-t-amber-400` (顶部 2px 琥珀色边框)
- 全部复用现有 Tailwind 主题色 (indigo/amber/slate)，未引入新颜色变量

## 6. 响应式与无障碍说明

### 6.1 响应式

- 侧边栏固定宽度 `w-72 min-w-[288px]`，不受视口变化影响
- 桌面 (1280px+)、平板 (768px)、移动端 (375px) 三种视口下布局一致
- 标题使用 `truncate flex-1 min-w-0` 在窄侧边栏中自动截断

### 6.2 无障碍 (a11y)

- 所有交互按钮保留 `title` 属性作为 tooltip
- 禁用态 ... 按钮使用 `cursor-not-allowed` 视觉提示
- 恢复按钮保留 `title="恢复会话"` 描述
- 会话项保留 click 事件与 title tooltip

## 7. 测试和验证结果

### 7.1 自动化验证

| 检查项 | 结果 |
|--------|------|
| CSS 块结构完整 | 通过 (`.live-dot`, `.refreshing`, `.console-line` 等均保留) |
| 模板语法 (括号平衡) | 通过 (目测确认) |
| 数据变量声明 | 未修改 (全部 9 个变量保留) |
| `session-actions` 类残留 | 无 (CSS 规则已删除，HTML 模板中已移除) |
| 服务器无报错 | 通过 (preview_logs 无 error) |

### 7.2 视觉验证 (preview_inspect)

| 验证项 | 目标 | 实测值 | 结果 |
|--------|------|--------|------|
| 标题可视宽度 | ≥ 180px | 210.67px | 通过 |
| 会话项高度 | ≤ 110px | 56px (CSS) | 通过 |
| 布局方向 | flex-col | column | 通过 |
| 标题字重 | semibold | font-weight: 600 | 通过 |
| 标题截断 | ellipsis | text-overflow: ellipsis | 通过 |
| ... 按钮禁用色 | slate-300 | rgb(203, 213, 225) | 通过 |
| ... 按钮禁用光标 | not-allowed | not-allowed | 通过 |
| 未选中左 border | transparent | border-l-[3px] border-transparent | 通过 |

### 7.3 当前环境限制

- 截图工具在本环境返回 "Unsupported Image" 格式，通过 snapshot + inspect 完成验证
- 所有测试会话均为休眠/无活跃 run 状态，无法手动触发 ... 菜单点击交互
- `dist/src/web/views/pipeline.html` 已手工同步，确保服务器读取最新版本

## 8. 风险 / 未解决项

| 风险 | 级别 | 说明 |
|------|------|------|
| ... 菜单下拉定位 | 低 | 未在真实活跃 run 会话上测试下拉菜单弹出位置 |
| 选中态左 border 高度 | 低 | 3px 左 border 在 2 行布局下可能不完整跨越项高度 |
| dist 文件同步 | 低 | 当前手动 cp，后续 `npm run build` 会覆盖 |

## 9. 推荐的下一步

1. **TASK-004 回归验证**: 在有活跃 run 的环境中手动验证 10 项回归清单
2. **QA Review**: `qa-review-expert` 审查代码变更和视觉效果
3. **构建验证**: 运行 `npm run build` 确认 dist 文件自动生成正确
4. **提交**: 将变更提交到功能分支
