# 任务分解：数据库迁移修复 + Web 亮色主题

> 日期：2026-05-08 | REQ-001, REQ-002, REQ-003

## TASK-001：修复 db.js initSchema pipeline 表 CHECK 约束
- **REQ**: REQ-001
- **策略**: 直接修复
- **文件**: `src/engine/db.js`
- **描述**: 迁移旧的 `CHECK(id=1)` pipeline 表到新多会话模式

## TASK-002：Web 页面亮色主题改造
- **REQ**: REQ-002
- **策略**: 直接修改
- **文件**: `src/web/views/pipeline.html`, `src/web/views/agents.html`
- **描述**: 暗色侧边栏(bg-slate-900)改为白色背景亮色系

## TASK-003：版本发布 v3.22.2
- **REQ**: REQ-003
- **策略**: 标准发布流程
- **描述**: 版本递增，三平台发布
