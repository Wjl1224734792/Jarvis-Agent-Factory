# Web 面板 5 项修复 — 任务分解

## TASK-013：侧边栏折叠收缩
- **REQ**: REQ-013
- **类型**: Bug 修复
- **文件**: `web/src/components/Layout.tsx`
- **内容**：Sider 增加 `collapsedWidth={0}`，折叠态完全收起
- **验收**: 折叠按钮点击后侧边栏消失，主内容区占满

## TASK-014：修复窗口滚动条
- **REQ**: REQ-014
- **类型**: Bug 修复
- **文件**: `web/index.html`
- **内容**：body 增加 `style="margin:0;overflow:hidden"`
- **验收**: 任何视口下无窗口级滚动条

## TASK-015：会话列表点击跳转
- **REQ**: REQ-015
- **类型**: Bug 修复
- **文件**: `web/src/components/Layout.tsx`
- **内容**：`onSelect` 回调中增加 `navigate('/')`
- **验收**: 在 /agents 或 /archive 点击侧边栏会话 → 跳转到 /

## TASK-016：智能体分类增强
- **REQ**: REQ-016
- **类型**: 功能增强
- **文件**: `web/src/pages/Agents.tsx`
- **内容**：
  1. 增加流程分类筛选按钮（全流程/前端/后端/轻量/架构/测试/审查）
  2. 增加功能分类筛选按钮（编排者/实现者/审查者/测试者/架构师/专家）
  3. 与现有 platform 筛选联动
- **验收**: 可按流程+功能维度筛选智能体

## TASK-017：Gate 文档加载修复
- **REQ**: REQ-017
- **类型**: Bug 修复
- **文件**: `web/src/pages/Dashboard.tsx`
- **内容**：
  1. 增加 `GATE_DIRS` 映射常量
  2. `openDoc()` 拼接子目录路径后再调用 API
- **验收**: 点击 Gate 卡片上的 .md 文档正确加载展示
