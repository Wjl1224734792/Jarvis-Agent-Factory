# Web 面板 5 项修复

## 背景

用户在 Web 面板发现 5 个问题，涵盖布局、导航、分类、文档加载。

## REQ 清单

### REQ-013：侧边栏折叠正确收缩
- **类型**：Bug 修复
- **文件**：`web/src/components/Layout.tsx`
- **问题**：折叠态 Sider 内部 3 个 `!collapsed &&` 块全部隐藏，缩窄后完全空白（无 collapsedWidth 设置）
- **修复**：
  1. 折叠态保留最小化内容（如仅显示平台筛选图标）
  2. 或设置 `collapsedWidth={0}` 让侧边栏完全收起
- **验收**：点击折叠按钮后侧边栏完全收缩，不残留空白条

### REQ-014：修复窗口级滚动条
- **类型**：Bug 修复
- **文件**：`web/src/components/Layout.tsx` + `web/index.html`
- **问题**：整个窗口出现滚动条。根 Layout 虽设置了 `overflow: 'hidden'`，但 body/html 有默认 margin 导致溢出
- **修复**：在 index.html 或全局 CSS 中设置 `body, html { margin: 0; overflow: hidden; }`
- **验收**：Web 面板在任何视口下均无窗口级滚动条

### REQ-015：会话列表点击跳转
- **类型**：Bug 修复
- **文件**：`web/src/components/Layout.tsx`
- **问题**：在 /agents 或 /archive 页面点击侧边栏会话，仅更新 selectedSession 状态，不导航到 Dashboard
- **修复**：`onSelect` 回调中增加 `navigate('/')`，确保点击会话后跳转到看板页
- **验收**：在智能体配置页或归档页点击侧边栏会话，自动跳转到流水线看板

### REQ-016：智能体页增加流程+功能分类
- **类型**：功能增强
- **文件**：`web/src/pages/Agents.tsx`
- **问题**：智能体列表仅按 platform 和 category 筛选，缺少 pipeline_type（流程）和 role（功能）维度
- **修复**：
  1. 增加「流程分类」筛选：全流程/前端/后端/轻量/架构/测试/审查
  2. 增加「功能分类」筛选：编排者/实现者/审查者/测试者/架构师/专家
  3. 筛选按钮从 API 动态获取，与现有 platform 筛选并行
- **验收**：智能体页面可按流程类型和功能角色筛选智能体

### REQ-017：Gate 文档正确加载
- **类型**：Bug 修复
- **文件**：`web/src/pages/Dashboard.tsx`
- **问题**：点击 Gate 卡片上的产物文档（如 `2026-05-08-REQ-001.md`），Dashboard 只传文件名，不带子目录（`requirements/`）。后端在 `docs/` 根目录找文件 → 404 → 前端显示"文档加载失败"
- **修复**：
  1. Dashboard.tsx 增加 `GATE_DIRS` 映射（Gate A→requirements, Gate B→tasks, Gate C→plans, etc.）
  2. `openDoc()` 调用 `api.docContent()` 前拼接子目录路径
- **验收**：点击 Gate 卡片上的文档名，正确加载并展示 Markdown 内容
