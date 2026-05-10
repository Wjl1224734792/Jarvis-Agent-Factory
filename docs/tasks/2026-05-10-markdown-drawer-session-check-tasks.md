# 任务分解：Markdown 渲染完善 + 抽屉可拖拽 + 会话检查

**日期**：2026-05-10
**关联需求**：REQ-022, REQ-023, REQ-024

---

## TASK-022：完善 Markdown 预览渲染（代码高亮 + GitHub CSS）

| 字段 | 值 |
|------|-----|
| **REQ 映射** | REQ-022 |
| **分类** | 直接开发（无测试基础设施） |
| **负责** | `frontend-dev-expert` |
| **变更范围** | `web/src/pages/Dashboard.tsx`, `web/package.json` |
| **依赖** | 无 |

### 实施要点
1. 安装 `react-syntax-highlighter` + `@types/react-syntax-highlighter`
2. 在 `LazyMarkdown` 中注入自定义 `components.code` 渲染器，使用 `react-syntax-highlighter`（浅色主题 `oneLight`）
3. 添加 `remark-gfm` 支持（已有）
4. 通过 `<style>` 标签在 Drawer 内注入 GitHub 风味 `.markdown-body` CSS 样式
5. 样式色调与项目主题协调（主色 #52C41A，粗边框 #2C2C2C，背景 #FFF9F0）

### 验收标准
- [ ] 代码块显示语法着色（JS/TS/Python/Shell/JSON）
- [ ] 表格有边框和斑马纹
- [ ] 引用块有绿色左边框
- [ ] 标题有层级字号区分
- [ ] 内联代码有背景色

---

## TASK-023：MD 预览抽屉增加动态拖拽拉伸

| 字段 | 值 |
|------|-----|
| **REQ 映射** | REQ-023 |
| **分类** | 直接开发 |
| **负责** | `frontend-dev-expert` |
| **变更范围** | `web/src/pages/Dashboard.tsx`（仅 Drawer 组件 props） |
| **依赖** | 无（与 TASK-022 操作不同区域，可并行） |

### 实施要点
- antd v6 已内置 `resizable` 属性，给 Drawer 加 `resizable` 即可
- 不需要安装额外依赖
- 拖拽手柄自动出现在左边缘（placement 默认 right）

### 验收标准
- [ ] 抽屉左边缘出现拖拽手柄
- [ ] 拖拽可调整宽度
- [ ] 宽度范围合理（默认 380-900px）

---

## TASK-024：会话显示检查报告

| 字段 | 值 |
|------|-----|
| **REQ 映射** | REQ-024 |
| **分类** | 文档/报告 |
| **负责** | 编排者直接完成（无需 spawn Agent） |
| **变更范围** | 无代码变更 |

### 检查结果（已完成）

| 平台 | 总会话 | 活跃 | 非活跃 |
|------|--------|------|--------|
| Claude Code | 154 | 12 | 142 |
| OpenCode | 0 | 0 | 0 |
| Codex | 0 | 0 | 0 |

- Claude Code 16 个命令正常注册会话，侧边栏显示"会话列表 · 154"
- OpenCode 会话数为 0（当前无 OpenCode 实例连接）
- OpenCode 模板同步（旧计划第 9 条）后续独立处理

### 验收标准
- [x] 侧边栏会话数量与 API 一致
- [x] 平台筛选正常
- [ ] OpenCode 模板同步（后续，不在本次范围）

---

## 执行计划

### 并行 Batch（无共享文件冲突）
```
Batch 1: [TASK-022 (frontend-dev-expert), TASK-023 (frontend-dev-expert)]
```
TASK-022 和 TASK-023 操作 Dashboard.tsx 的不同区域（Markdown 渲染 vs Drawer props），由同一 Agent 处理避免冲突。

TASK-024 由编排者直接完成（报告类任务）。
