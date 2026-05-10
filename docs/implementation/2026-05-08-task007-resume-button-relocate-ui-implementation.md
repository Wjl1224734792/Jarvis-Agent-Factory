# TASK-007: 恢复按钮移到看板顶部操作栏 -- UI 实现

## 实现目标

将恢复休眠会话的按钮从侧边栏每个会话项中移除，改为在看板（右侧主内容区）标题栏中显示，仅当选中休眠会话时可见。

## 对应需求 ID / 任务 ID

- **需求 ID**: REQ-SL-007
- **任务 ID**: TASK-007

## 变更文件

| 文件 | 变更类型 |
|------|---------|
| `src/web/views/pipeline.html` | 修改（唯一变更文件） |
| `dist/src/web/views/pipeline.html` | 构建产物（自动生成） |

## 变更范围

### 1. 看板标题栏新增恢复按钮容器（第 104-113 行）

```html
<!-- 恢复按钮（仅选中休眠会话时显示） -->
<div id="resumeBtnContainer" class="hidden ml-3">
  <button id="resumeSessionBtn" onclick="resumeSelectedSession()"
    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
           bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200
           transition-colors">
    <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
    恢复会话
  </button>
</div>
```

位置：`<h2>流水线看板</h2>` 和 `Gate 实时监控` Badge 之后，与标题行同一 flex 容器。

### 2. 移除侧边栏恢复按钮（原第 548 行）

`renderSessions()` 函数 Row 2 中删除了休眠会话的恢复按钮代码块：

```javascript
// 删除前
(isInactive ? '<button ... resumeSession(...) ...><i data-lucide="rotate-ccw" ...></i></button>' : '') +
'<div class="flex-1"></div>' +

// 删除后
'<div class="flex-1"></div>' +
```

Row 2 布局现在为：`cmdLabel + gateBadge + spacer + moreBtn`

### 3. 新增 `updateResumeBtnVisibility()` 辅助函数

```javascript
function updateResumeBtnVisibility() {
  var container = document.getElementById('resumeBtnContainer');
  if (!container) return;
  var session = allSessions.find(function(s) { return s.id === selectedSession; });
  container.classList.toggle('hidden', !session || session.status !== 'inactive');
}
```

根据当前选中会话的状态切换恢复按钮容器的 `hidden` 类。

### 4. 新增 `resumeSelectedSession()` 函数（替代旧 `resumeSession(sid)`）

```javascript
function resumeSelectedSession() {
  if (!selectedSession) return;
  var session = allSessions.find(function(s) { return s.id === selectedSession; });
  if (!session || session.status !== 'inactive') return;
  fetch('/api/sessions/' + encodeURIComponent(selectedSession) + '/resume', { method: 'POST' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.ok) { refresh(); toast('会话已恢复', true); }
      else { toast('恢复失败: ' + (d.error || '未知错误'), false); }
    })
    .catch(function(e) { toast('网络错误: ' + e.message, false); });
}
```

使用 `selectedSession` 全局变量，遵循项目 `.then()` 异步风格。

### 5. 更新 `selectSession()` 函数

```javascript
function selectSession(sid) {
  selectedSession = sid;
  updateResumeBtnVisibility();  // 新增：切换按钮可见性
  renderSessions();
  refresh();
}
```

### 6. 更新 `refresh()` 函数（第 379-380 行）

在 session 自动选择逻辑之后添加：

```javascript
// 更新恢复按钮可见性
updateResumeBtnVisibility();
```

确保轮询刷新时按钮状态保持同步。

## 组件结构与布局说明

```
看板标题栏 (flex items-center gap-3)
  ├── <h2>流水线看板</h2>
  ├── Badge: "Gate 实时监控"
  └── resumeBtnContainer (hidden by default)
        └── button#resumeSessionBtn
              ├── <i data-lucide="rotate-ccw">
              └── "恢复会话"
```

## 样式方案说明

- 按钮使用 `bg-indigo-50 text-indigo-600`（与 indigo 主题一致）
- Hover 状态: `hover:bg-indigo-100`
- 边框: `border border-indigo-200`
- 圆角: `rounded-lg`
- 字号: `text-xs` (12px)
- 间距: `px-3 py-1.5 gap-1.5`
- 容器使用 Tailwind `hidden` 类控制显示/隐藏

## 响应式与无障碍说明

- 按钮容器通过 `classList.toggle('hidden', ...)` 动态控制，不依赖媒体查询
- 按钮使用 `<i data-lucide="rotate-ccw">` 图标，由 lucide 库渲染为 SVG
- 所有视图（mobile/tablet/desktop）下已验证：sidebar 无恢复按钮，header 按钮正确隐藏

## 测试和验证结果

### 自动化检查
- [x] `npm run typecheck` -- 通过，零类型错误
- [x] `npm run lint` -- 通过，零新增警告
- [x] `npm run build` -- 构建成功，dist 产物同步

### 视觉验证（Preview MCP）
- [x] Desktop (1280x800): 侧边栏无"恢复会话"按钮，header 按钮容器 hidden
- [x] Tablet (768x1024): `#resumeBtnContainer` display=none
- [x] Mobile (375x812): 侧边栏无"恢复会话"按钮

### 关键样式检查 (preview_inspect)
- [x] `#resumeBtnContainer`: display=none (hidden by default, no inactive session selected)
- [x] `#resumeSessionBtn`: color=rgb(79,70,229) (indigo-600), font-size=12px, bg=indigo-50
- [x] 源码搜索: `rotate-ccw` 仅出现在 header 按钮中（1 次），侧边栏已无此图标
- [x] 源码搜索: 旧 `resumeSession(` 引用已全部移除

### 验收标准对照
- [x] 1. 休眠会话的侧边栏项中无恢复按钮
- [x] 2. 选中休眠会话后，看板标题旁出现「恢复会话」按钮（逻辑已实现，因当前所有 session 均为 active 故按钮保持隐藏）
- [x] 3. 点击恢复按钮发送 `POST /api/sessions/:id/resume`
- [x] 4. 选中活跃会话时恢复按钮隐藏

## 风险 / 未解决项

- 因当前测试环境所有 session 均为 `active` 状态，无法直接截图验证"选中 inactive session 时按钮显示"的场景。逻辑代码已正确实现 `classList.toggle('hidden', !session || session.status !== 'inactive')`，当有 inactive session 被选中时按钮会自动显示。
- 旧函数 `resumeSession(sid)` 已被移除（因 sidebar 调用点已删除，成为孤儿代码），替换为 `resumeSelectedSession()`。两个函数的 API 调用路径和参数格式一致。

## 推荐的下一步

- 创建 inactive session 进行端到端验证：选中该 session，确认看板顶部出现「恢复会话」按钮，点击后 session 恢复为 active 且按钮消失。
- 如有需要，可考虑增加加载中状态（如按钮 disabled + spinner）以提升 UX。
