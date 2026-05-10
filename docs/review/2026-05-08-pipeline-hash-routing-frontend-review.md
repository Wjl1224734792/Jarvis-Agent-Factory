# 前端审查报告：流水线看板 Hash 路由与归档面板

**审查日期**: 2026-05-08
**审查范围**: `src/web/views/pipeline.html` (1068 行)
**审查结论**: **不通过** — 存在 1 项 CRITICAL 数据正确性缺陷，必须修复后重新审查

---

## 一、维度检查结果

| 维度 | 评分 | 说明 |
|------|------|------|
| 组件结构与架构 | 通过 | Hash 路由逻辑清晰，面板切换职责分明 |
| 样式实现 | 通过 | Tailwind CDN 主题色一致，响应式基础可用 |
| 状态管理 | 不通过 | Pin 状态跨对象层级混淆（见 CRITICAL 问题） |
| 性能（代码级） | 有条件通过 | 无重大性能反模式，但存在未清理的 interval |
| 可访问性 | 不通过 | 缺标签、缺键盘导航、色彩对比度不足 |
| 代码质量 | 有条件通过 | 异步错误处理完善，但 var/let 混用、async/then 风格不统一 |

---

## 二、问题列表（按严重度排序）

### [CRITICAL] Pin 状态数据混淆 — 渲染与会话/运行对象的错位
- **文件**: `src/web/views/pipeline.html`
- **位置**: 第 488-551 行 (`renderSessions()` 函数)
- **证据**: `var isPinned = !!s.pinned;` 取自**会话对象**的 `pinned` 字段（第 501 行），但在 3-dot 菜单的 `togglePin('${s.run_id}', ${isPinned})` 调用中当作**运行记录**的 pin 状态传入（第 545 行）。API 端点 `/api/pipeline-runs/${runId}/pin` 明确操作的是运行记录（run）层级。
- **影响**: 用户看到的置顶/取消置顶标签来源于错误的层级数据，可能导致运行时 pin 状态与 UI 展示不符，执行与预期相反的操作。
- **修复建议**: 从 run 对象获取 pin 状态，而非复用 session 的 `pinned` 字段。若后端 run 对象无 `pinned` 字段，需同步补齐。

### [FIX_REQUIRED] XSS 风险 — API 数据未经转义插入 innerHTML
- **位置**: 第 428 行（artifact title 属性）、第 530 行（titleTooltip 含 task_name）、第 767 行（run.id 未转义）、第 960 行（task_name 在 title 属性中）
- **证据**: `title="${titleTooltip}"` 中 `s.task_name` 与 `s.platform` 未经过任何 HTML 实体编码直接拼接。
- **影响**: 若后端未严格校验输入的 `task_name`，恶意字符串可逃逸出 HTML 属性，造成脚本注入。
- **修复建议**: 添加通用 HTML 转义函数（转义 `&` `<` `>` `"` `'`），对所有 API 返回的用户可控字段调用后再插入 HTML。

### [FIX_REQUIRED] 可访问性 — 交互元素缺少键盘支持
- **位置**: 第 441 行（Gate 卡片 `onclick` div）、第 530 行（会话条目 `onclick` div）
- **证据**: 可点击的 `<div>` 元素使用了 `onclick` 但缺少 `tabindex="0"`、`role="button"` 和 `onkeydown`（Enter/Space）处理。
- **影响**: 键盘用户无法通过 Tab 导航到这些关键交互元素并激活它们。
- **修复建议**: 为可点击 div 添加 `tabindex="0"`、`role="button"`、以及响应 Enter/Space 键的 `onkeydown` 处理。

### [FIX_REQUIRED] 可访问性 — 色彩对比度不达标
- **位置**: 全文多处使用 `text-slate-400`（#94A3B8）
- **证据**: `text-slate-400` 在白色背景上的对比度约 3.0:1，低于 WCAG AA 对正常文本要求的 4.5:1。
- **影响**: 低视力用户难以阅读次要信息文本（如占位符、辅助说明）。
- **修复建议**: 将次要文本颜色调整为 `text-slate-500`（#64748B，对比度约 4.7:1）或更深。

### [FIX_REQUIRED] 可访问性 — 表单控件缺 label 关联
- **位置**: 第 73 行（刷新按钮）、第 261 行（搜索输入框）
- **证据**: 搜索输入框只有 `placeholder` 作为标签，无 `<label>` 元素关联；刷新按钮仅有 `title` 属性无 `aria-label`。
- **影响**: 屏幕阅读器用户无法正确识别这些控件的目的。
- **修复建议**: 搜索框添加可见或 `sr-only` 标签；图标按钮添加 `aria-label` 属性。

### [WARNING] 看板面板切回时数据短暂陈旧
- **位置**: 第 826-829 行 (`showDashboardPanel`)
- **证据**: `showDashboardPanel()` 仅移除 `hidden` 类而不触发 `refresh()`。轮询在归档面板可见时跳过了 refresh（第 1059 行），切换回看板后最多 5 秒才刷新。
- **影响**: 短暂展示过期数据，可能误导用户。
- **修复建议**: `showDashboardPanel()` 中增加 `refresh()` 调用。

### [WARNING] 代码风格不一致
- **位置**: 全文
- **证据**: `var` 与 `let` 混用；`async/await`（`restoreFromArchive`）与 `.then()` 链（`deleteFromArchive`）风格并存；置顶图标使用 HTML 实体 `&#x1F4CC;` 而非 Lucide 图标。
- **影响**: 降低代码可维护性，增加后期重构风险。
- **修复建议**: 统一使用 `const`/`let`，统一使用 `async/await`，统一图标方案。

---

## 三、必须修复项（Blocking）

1. Pin 状态数据混淆 — 从 run 对象获取 pinned 字段
2. 添加 HTML 转义工具函数，处理所有用户可控字段
3. 可点击 div 添加键盘导航属性
4. 提升 `text-slate-400` 为 `text-slate-500` 以满足对比度要求
5. 表单控件添加 label 关联 / aria-label

---

## 四、优化建议（Non-blocking）

- 将 `setInterval` 句柄存储，在理论上页面卸载时可 `clearInterval`（当前 SPA 无实际泄漏）
- 排查 `fetchAPI` 返回 `null` 的调用点，明确区分网络错误与空响应
- 考虑后续拆分 JS 逻辑到独立 `.js` 文件（当前 1068 行已接近单文件可维护性上限）

---

## 五、变更文件清单

| 文件 | 变更类型 | 行数变化 |
|------|---------|----------|
| `src/web/views/pipeline.html` | 功能增强 | +455/-27（Hash 路由、归档面板、3-dot 菜单、指令标签） |
