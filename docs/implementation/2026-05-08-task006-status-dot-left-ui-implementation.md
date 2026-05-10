# TASK-006: 状态指示点移到标题左侧 — UI 实施报告

## 1. 实现目标

将会话卡片 Row 1 中的状态指示圆点从标题右侧移到标题左侧（置顶标记和标题之间）。

## 2. 对应需求 / 任务

- **任务 ID**: TASK-006
- **需求 ID**: REQ-SL-006
- **验收标准**:
  1. 状态指示圆点显示在标题文字的左侧
  2. 置顶标记仍在状态点左侧
  3. Row 1 布局：📌 · ● · 标题（从左到右）
  4. 其他元素不受影响

## 3. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/web/views/pipeline.html` | 修改 | `renderSessions()` 函数 Row 1 模板中两行 `<span>` 顺序交换 |
| `dist/src/web/views/pipeline.html` | 同步 | 编译输出副本同步更新 |

**仅修改 `renderSessions()` 的 Row 1 模板**，未触及 Row 2、排序逻辑或其他任何逻辑。

## 4. 组件结构与布局说明

### 修改前
```
<div class="flex items-center gap-2 min-w-0">
  pinIcon                    ← 置顶标记（可选）
  <span>标题</span>           ← 标题文字
  <span>状态点</span>         ← 状态圆点（在标题右侧）
</div>
```

### 修改后
```
<div class="flex items-center gap-2 min-w-0">
  pinIcon                    ← 置顶标记（可选）
  <span>状态点</span>         ← 状态圆点（移到标题左侧）
  <span>标题</span>           ← 标题文字
</div>
```

### DOM 布局验证（preview_inspect）

| 元素 | 选择器 | className | x 坐标 | 宽度 |
|------|--------|-----------|--------|------|
| 状态圆点 | `:first-child` | `w-2 h-2 rounded-full flex-shrink-0` | 26.67 | 8px |
| 标题文字 | `:nth-child(2)` | `text-xs text-slate-700 truncate font-semibold flex-1 min-w-0` | 42.67 | 210.67px |

> 坐标运算验证：42.67 = 26.67 + 8 (dot) + 8 (gap-2) ✓

## 5. 样式方案说明

- 所有 CSS 类名保持不变，仅调整模板中 `<span>` 的拼接顺序
- 使用 `flex items-center gap-2` 容器，gap-2 提供 8px 间距
- 状态圆点使用 `flex-shrink-0` 防止压缩变形
- 标题文字使用 `flex-1 min-w-0 truncate` 实现弹性填充 + 溢出省略

## 6. 响应式与无障碍说明

- **响应式**：使用 Tailwind flex 布局，自适应容器宽度。状态点固定在 8px，标题弹性填充剩余空间
- **无障碍**：状态圆点添加 `title` 属性显示状态标签（如"正在运行"、"空闲"），为装饰性元素提供文本描述

### 多视口验证

| 视口 | 截图路径 | 状态 |
|------|---------|------|
| Desktop (1280x800) | `data/screenshots/desktop-final-task006.png` | 通过 |
| Tablet (768x1024) | `data/screenshots/tablet-task006.png` | 通过 |
| Mobile (375x812) | `data/screenshots/mobile-task006.png` | 通过 |

## 7. 测试和验证结果

| 检查项 | 方法 | 结果 |
|--------|------|------|
| 状态点在标题左侧 | `preview_inspect` 检查 3 张卡片的首末子元素 | 通过 |
| 置顶标记在状态点左侧 | 代码审查 pinIcon 拼接顺序在状态点之前 | 通过 |
| 布局顺序 📌 ● 标题 | DOM 结构 + x 坐标运算验证 | 通过 |
| CSS 类名不变 | 代码 diff 仅行顺序交换 | 通过 |
| Row 2 不受影响 | 未修改 Row 2 代码 | 通过 |
| 三种响应式视口 | agent-browser 截图 | 通过 |

### 关键样式属性验证

```
状态圆点（首张卡片，非置顶）:
  background-color: rgb(16, 185, 129)  (bg-emerald-500, 运行中)
  width: 8px, height: 8px  (w-2 h-2)
  flex-shrink: 0
  x: 26.67

标题文字:
  color: rgb(51, 65, 85)  (text-slate-700)
  font-size: 12px  (text-xs)
  font-weight: 600  (font-semibold)
  text-overflow: ellipsis  (truncate)
  x: 42.67
```

## 8. 风险 / 未解决项

无。本次修改为单文件、单行顺序交换，影响范围极窄。

## 9. 推荐的下一步

- 编排者确认验收通过后，可继续后续任务
- 若需提交，建议将 `dist/src/web/views/pipeline.html` 的同步变更一并提交
