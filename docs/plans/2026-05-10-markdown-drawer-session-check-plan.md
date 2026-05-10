# 执行计划：Markdown 渲染 + 抽屉可拖拽 + 会话检查

**日期**：2026-05-10
**关联需求**：REQ-022, REQ-023, REQ-024

## parallel_batches

### Batch 1（单 Agent 处理两个独立改动）
```
├── TASK-022: frontend-dev-expert → 完善 Markdown 渲染
│   ├── 安装 react-syntax-highlighter
│   ├── 更新 LazyMarkdown（代码高亮 + CSS 注入）
│   └── 验证构建不增大超 50KB gzipped
│
└── TASK-023: frontend-dev-expert → 抽屉可拖拽
    ├── Drawer 加 resizable 属性
    └── 验证拖拽手柄出现、宽度可调
```

TASK-022 和 TASK-023 操作同文件（`Dashboard.tsx`）不同区域，由同一个 `frontend-dev-expert` 处理，避免合并冲突。

TASK-024 由编排者完成（报告类任务）。

## Execution Packet

### TASK-022: 完善 Markdown 预览渲染

| 字段 | 值 |
|------|-----|
| `task_id` | TASK-022 |
| `requirement_ids` | ["REQ-022"] |
| `objective` | 为 Dashboard 文档抽屉添加代码语法高亮和 GitHub 风味 CSS 排版样式 |
| `allowed_paths` | `web/src/pages/Dashboard.tsx`, `web/package.json` |
| `dependencies` | 无 |
| `required_skills` | ["source-driven-development", "verification-before-completion"] |
| `acceptance_criteria` | 代码块语法着色、表格斑马纹、引用块左边框、标题层级字号、内联代码背景色 |
| `test_strategy` | manual_only |
| `input_documents` | `docs/requirements/2026-05-10-markdown-drawer-session-check.md` |

### TASK-023: 抽屉可拖拽拉伸

| 字段 | 值 |
|------|-----|
| `task_id` | TASK-023 |
| `requirement_ids` | ["REQ-023"] |
| `objective` | 为文档抽屉添加 resizable 属性实现拖拽调整宽度 |
| `allowed_paths` | `web/src/pages/Dashboard.tsx` |
| `dependencies` | 无 |
| `required_skills` | ["source-driven-development", "verification-before-completion"] |
| `acceptance_criteria` | 抽屉左边缘出现拖拽手柄、可拖拽调整宽度 380-900px |
| `test_strategy` | manual_only |
| `input_documents` | `docs/requirements/2026-05-10-markdown-drawer-session-check.md` |
