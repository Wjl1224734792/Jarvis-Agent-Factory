# Phase 2 任务分解

> 日期：2026-05-08 | 需求：2026-05-08-phase2-activity-tracking-and-readonly-web.md

---

## TASK-001：routes.js API 层适配 (REQ-001, REQ-003)
- **类型**：直接开发
- **文件**：`src/web/routes.js`
- **变更**：
  1. `/api/status` 统计所有会话（`getSessions(db)` 替换 `getSessions(db, 'active')`）
  2. `connectedPlatforms` 需同时统计 active 数量（保持兼容）
- **验证**：`node --check`

## TASK-002：pipeline.html 前端适配 (REQ-002, REQ-003, REQ-004)
- **类型**：直接开发
- **文件**：`src/web/views/pipeline.html`
- **变更**：
  1. 移除 Gate 步骤卡片中的「推进→」按钮
  2. 帮助弹窗移除步骤 5（点「推进」按钮）
  3. `isOnline` 判定窗口从 10 分钟 → 2 小时
  4. inactive 会话不再 `opacity-45`，保持可见
- **验证**：Playwright 截图
