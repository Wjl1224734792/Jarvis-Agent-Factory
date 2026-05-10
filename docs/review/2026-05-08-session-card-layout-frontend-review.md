# 前端审查报告：会话列表卡片化布局

**审查日期**：2026-05-08
**审查范围**：`src/web/views/pipeline.html` 中 `renderSessions()` 模板重构与 CSS 清理
**审查依据**：REQ-SL-001 ~ REQ-SL-004
**审查者**：前端代码审查专家

---

## 1. 审查结论

**结论：有条件通过（需修复 2 项 FIX_REQUIRED 后合并）**

变更逻辑正确，REQ 四条目均已满足。发现 2 项必须修复的可访问性问题和 3 项建议改进项，无阻塞级（BLOCKED）问题。

---

## 2. 审查维度检查结果

| 维度 | 状态 | 摘要 |
|------|------|------|
| 组件结构与架构 | 通过 | 2 行 flex-col 布局合理，DOM 嵌套深度可控 |
| 样式实现 | 通过 | 纯 Tailwind 内联类名，已移除残留 CSS 规则，无 `@apply` |
| 状态管理 | 通过 | hasActiveRun 条件分支清晰，禁用态逻辑正确 |
| 性能 | 通过 | 无重渲染风险，DOM 变更量合理 |
| 可访问性 | **有问题** | 恢复按钮不可聚焦、会话项不支持键盘导航、缺少 aria 属性 |
| 代码质量 | 通过 | 模板标签闭合正确，引号转义正确，XSS 防护到位 |

---

## 3. 问题列表

### [FIX_REQUIRED] #1 — 恢复按钮使用 `<i>` 元素不可键盘访问

**文件**：`src/web/views/pipeline.html`
**行号**：第 542 行

**证据**：
```html
<i data-lucide="rotate-ccw" class="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 hover:text-indigo-300"
   title="恢复会话" onclick="event.stopPropagation();resumeSession('${s.id}')"></i>
```

**分析**：`<i>` 元素默认不可聚焦（`tabIndex` 未设置），无 `role="button"` 声明。键盘用户无法通过 Tab 键定位到该控件，屏幕阅读器也不会将其识别为可交互元素。`title` 属性不被大多数屏幕阅读器可靠地朗读。

**影响**：仅对休眠会话显示的"恢复会话"操作对纯键盘用户和屏幕阅读器用户完全不可用。

**建议修复**：
```html
<button class="w-3.5 h-3.5 text-indigo-400 hover:text-indigo-300 flex-shrink-0
               flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer"
        aria-label="恢复会话" title="恢复会话"
        onclick="event.stopPropagation();resumeSession('${s.id}')">
  <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
</button>
```

---

### [FIX_REQUIRED] #2 — 会话列表项不支持键盘选择

**文件**：`src/web/views/pipeline.html`
**行号**：第 529-533 行

**证据**：
```html
<div class="session-item group flex flex-col gap-1 px-3 py-2 rounded-lg cursor-pointer transition-all
     bg-indigo-50 border-l-[3px] border-indigo-500"
     onclick="selectSession('${s.id}')" title="${titleTooltip}">
```

**分析**：外层 `<div>` 注册了 `onclick` 处理函数（`selectSession`）但缺少三个必要条件使其成为可键盘访问的交互元素：
1. 没有 `role="button"`——屏幕阅读器不会将其识别为可操作元素
2. 没有 `tabindex="0"`——键盘用户无法通过 Tab 键聚焦
3. 没有 `onkeydown` 处理 Enter/Space 键——即使聚焦也无法触发选择

**影响**：纯键盘用户（包括运动障碍用户）无法切换会话。整个侧边栏的核心交互——选择会话查看流水线详情——对键盘用户不可用。

**建议修复**：
```html
<div class="session-item group flex flex-col gap-1 px-3 py-2 rounded-lg cursor-pointer transition-all
     bg-indigo-50 border-l-[3px] border-indigo-500"
     role="button" tabindex="0"
     aria-current="${isActive ? 'true' : 'false'}"
     onclick="selectSession('${s.id}')"
     onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectSession('${s.id}');}"
     title="${titleTooltip}">
```

---

### [WARNING] #3 — ⋮ 菜单按钮缺少 aria 属性

**文件**：`src/web/views/pipeline.html`
**行号**：第 546 行（激活态）、第 556 行（禁用态）

**证据（激活态）**：
```html
<button class="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 text-slate-400
               hover:text-slate-600 transition-colors"
        onclick="event.stopPropagation();toggleRunMenu(event, '${s.run_id}')" title="运行操作">
  <i data-lucide="more-vertical" class="w-3.5 h-3.5"></i>
</button>
```

**证据（禁用态）**：
```html
<button class="w-5 h-5 flex items-center justify-center rounded text-slate-300
               cursor-not-allowed flex-shrink-0"
        onclick="event.stopPropagation()" title="暂无运行记录">
  <i data-lucide="more-vertical" class="w-3.5 h-3.5"></i>
</button>
```

**分析**：
- **激活态**：图标按钮缺少 `aria-label`（`title` 不被所有屏幕阅读器可靠朗读）；下拉菜单触发器缺少 `aria-haspopup="true"` 和 `aria-expanded` 状态指示。
- **禁用态**：按钮视觉上禁用但 `disabled` 属性未设置（因为需要 `event.stopPropagation` 防止冒泡到父级 `selectSession`），缺少 `aria-disabled="true"` 让屏幕阅读器知晓状态。键盘 Tab 可以聚焦到该按钮但不执行任何操作，造成困惑。

**影响**：屏幕阅读器用户无法区分激活/禁用状态的 ⋮ 按钮，也不知道激活态按钮会弹出菜单。

**建议**：
- 激活态添加 `aria-label="运行操作"` + `aria-haspopup="menu"` + `aria-expanded="false"`
- 禁用态添加 `aria-disabled="true"`，并在模板中动态注入或通过 JS 管理 `aria-expanded`

---

### [WARNING] #4 — 可交互元素缺少 focus-visible 聚焦指示器

**文件**：`src/web/views/pipeline.html`
**行号**：第 546 行（⋮ 激活按钮）、第 556 行（⋮ 禁用按钮）、如需修复 #1 则第 542 行（恢复按钮）

**证据**：所有侧边栏交互按钮仅定义了 `hover:` 样式变体，未定义 `focus-visible:` 样式。

```html
<!-- 激活态 ⋮ 按钮：仅有 hover 样式 -->
class="... hover:bg-slate-200 hover:text-slate-600 transition-colors"

<!-- 恢复按钮（当前 <i> 标签）：仅有 hover 样式 -->
class="... hover:text-indigo-300"
```

**分析**：项目其他区域是否使用 focus ring 可参考 Gate 卡片（第 439 行）使用了 `hover:shadow` 但也无 focus 样式。由于会话列表项本身无 focus 样式（见 #2），此处为全站一致性问题，但会话列表是高频操作区域，影响更显著。

**影响**：键盘用户 Tab 聚焦到按钮时无任何视觉反馈，不知道当前焦点位置。

**建议**：至少为 ⋮ 激活按钮和恢复按钮添加 `focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none`。

---

### [WARNING] #5 — 禁用态 ⋮ 按钮色彩对比度不足

**文件**：`src/web/views/pipeline.html`
**行号**：第 556 行

**证据**：
```html
<button class="... text-slate-300 cursor-not-allowed ...">
```
`slate-300`（#CBD5E1）在白色背景上的对比度约为 **1.8:1**，远低于 WCAG AA 级 4.5:1（正常文本）和 3:1（大文本/图形）的要求。

**分析**：WCAG 对"非活跃用户界面组件"（inactive UI components）豁免对比度要求，因此此条标记为 WARNING 而非 FIX_REQUIRED。但视觉上该按钮几乎不可见，用户可能完全注意不到它的存在。REQ-SL-002 要求"始终可见"，过低的对比度削弱了此需求的实现效果。

**建议**：将禁用态颜色提升至 `text-slate-400`（#94A3B8，对比度约 3.0:1）或 `text-slate-500`（#64748B，对比度约 4.5:1），同时保留 `cursor-not-allowed` 传达不可用语义。

---

## 4. 需求追踪矩阵

| REQ ID | 描述 | 状态 | 证据 |
|--------|------|------|------|
| REQ-SL-001 | 2 行垂直排列布局 | **通过** | 第 529-561 行：`flex-col gap-1` 容器 + Row1 (`flex items-center`) + Row2 (`flex items-center gap-1.5`)，标题+状态在上，指令+Gate+操作在下 |
| REQ-SL-002 | ⋮ 菜单始终可见 + 禁用态 | **通过（附注）** | 第 544-559 行：`hasActiveRun` 三元分支移除，禁用态使用 `cursor-not-allowed` + `text-slate-300` + `event.stopPropagation()`。可访问性待改进（#3、#5） |
| REQ-SL-003 | 选中态/悬停态样式精修 | **通过** | 第 531 行：选中态 `bg-indigo-50 border-l-[3px] border-indigo-500`，非选中态 `hover:bg-slate-50`。样式通过 Tailwind 类名实现 |
| REQ-SL-004 | 现有功能回归验证 | **通过** | `selectSession`/`toggleRunMenu`/`togglePin`/`archiveRunFromMenu`/`deleteRunFromMenu`/`resumeSession` 均未受影响；第 106-113 行点击外部关闭菜单逻辑不变；CSS `.session-actions` 已从文件中完全移除，无残留引用 |

---

## 5. 行为准则合规检查

| 准则 | 状态 | 说明 |
|------|------|------|
| 准则 2（简单优先） | 通过 | 仅用 `flex-col` + 条件三元实现，无抽象层引入 |
| 准则 3（精准修改） | 通过 | 变更局限在 `renderSessions()` 模板和 CSS 清理，无相邻代码改动 |
| 准则 5（注释语言） | 通过 | 中文注释，与项目一致 |

---

## 6. 变更文件清单

| 文件 | 变更类型 | 行号范围 |
|------|---------|---------|
| `src/web/views/pipeline.html` | 修改（模板重构） | 第 529-561 行（`renderSessions()` HTML 模板） |
| `src/web/views/pipeline.html` | 删除（CSS 清理） | 原第 19-20 行（`.session-item:hover .session-actions` 和 `.session-actions` 规则） |

---

## 7. 未覆盖的验证范围

以下项目不在本次审查范围内，由对应专项审查负责：

- 后端 `/api/sessions`、`/api/sessions/{id}/resume` 接口行为验证（由 backend-review-expert 负责）
- 安全审计（由 security-review-expert 负责）
- 性能基准测试（由 perf-review-expert 负责）
- REQ 追踪矩阵完整性（由 qa-review-expert 负责）
- 跨浏览器兼容性测试（需在真实浏览器中验证 `cursor-not-allowed`、`focus-visible` 行为）
