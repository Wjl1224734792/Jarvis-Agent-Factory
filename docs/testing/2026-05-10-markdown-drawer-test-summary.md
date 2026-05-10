# C2 测试汇总报告

**日期**: 2026-05-10
**关联需求**: REQ-018 ~ REQ-024

---

## 一、自动化测试

| 测试文件 | 用例数 | 通过 | 失败 | 跳过 |
|---------|--------|------|------|------|
| `matchPipelineType.test.ts` | 29 | 29 | 0 | 0 |

### 测试覆盖
- 五类流程分类正确性（全流程/前端/后端/移动端/轻量）
- `轻量` 对应 jarvis-lite/browser-test/bug-fix/review-only/review-fix 5 个 ID
- `移动端` 对应 android/ios/flutter/expo/taro/react-native 6 个 ID
- `全流程` 排除规则验证
- 边界条件（空字符串、特殊字符）

---

## 二、手动验证

### Markdown 渲染 (REQ-022)
- [x] 代码块语法着色（Prism + oneLight 主题）— 桌面/平板/手机三视口验证
- [x] 内联代码背景色 `rgba(82,196,26,0.063)` — computed styles 验证
- [x] 标题层级字号（h1 1.6em=22.4px, h2 1.35em=18.9px）— computed styles 验证
- [x] 标题底部边框 `2px solid #52C41A20` — computed styles 验证
- [x] CSS 一次性注入 document.head（#markdown-custom-style）— DOM 验证
- [x] 错误边界包裹（ErrorBoundary 组件）— 代码审查验证

### Drawer 拖拽 (REQ-023)
- [x] 拖拽手柄出现 `.ant-drawer-resizable-dragger-horizontal` — DOM 验证
- [x] 手柄尺寸 4px 宽度、col-resize 光标 — computed styles 验证
- [x] 三视口截图（桌面 1280×800 / 平板 768×1024 / 手机 375×812）

### 安全修复
- [x] urlTransform 阻断 javascript: 协议 — 正则验证
- [x] 路径遍历消毒 `../` 序列 — 正则验证

---

## 三、构建产物验证

- `tsc --noEmit`: 0 错误
- `vite build`: exit 0, 产物 `dist/web/`
- Bundle size: 主入口 ~478KB gzipped ~158KB
- react-syntax-highlighter 懒加载（仅抽屉打开时加载）

---

## 四、结论

- 自动化测试: **29/29 通过**
- 手动验证: **全部通过**
- 构建: **成功**
- 回归风险: **无**
