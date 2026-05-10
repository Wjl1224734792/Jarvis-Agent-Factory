# 需求文档：数据库迁移修复 + Web 亮色主题

> 日期：2026-05-08 | 状态：confirmed

## REQ-001：修复 pipeline 表旧 CHECK 约束导致 session_join 失败

**问题**：`session_join` MCP 工具调用时返回 `CHECK constraint failed: id=1`。

**根因**：数据库 `pipeline` 表的旧 schema 为 `id INTEGER PRIMARY KEY CHECK(id=1)`，是早期单流水线时代的遗留约束。`CREATE TABLE IF NOT EXISTS` 不会重建已存在的表，后续 migration 只 ALTER TABLE 加列，未移除 CHECK 约束。`INSERT OR REPLACE INTO pipeline (session_id, ...)` 不指定 id 时 SQLite 分配 id=NULL，与 CHECK 冲突。

**修复方案**：
1. 在 `initSchema()` 中检测旧 pipeline 表是否存在 `CHECK(id=1)` 约束
2. 若存在，备份旧数据 → 删除旧表 → 创建新表（无 CHECK 约束）→ 恢复数据
3. 同样修复 checkpoints 表旧 UNIQUE(gate) 约束（应改为 UNIQUE(session_id, gate)）

**验收标准**：
- `session_join` 不再报 CHECK constraint 错误
- 已有数据不丢失
- 多次调用 `session_join` 正常创建新会话

## REQ-002：Web 页面对比度优化——暗色系改亮色系

**问题**：用户反馈暗色侧边栏 "看不清"，需要改为亮色系配色。

**方案**：
1. `pipeline.html` — 侧边栏从 `bg-slate-900` 暗色改为 `bg-white` + 亮色系（保持控制台/终端风格用等宽字体，但颜色明亮）
2. `agents.html` — 同上
3. 亮色终端风格配色方案：白色背景 + slate-100 面板 + indigo 强调色 + 亮色标签/边框

**验收标准**：
- 两个页面在亮色背景下文字清晰可读
- 保持控制台/终端风格的排版布局
- 侧边栏不再用暗色背景
- 对比度符合 WCAG AA（4.5:1）

## REQ-003：版本发布 v3.22.2

版本号从 3.22.1 递增到 3.22.2，发布到 Gitee + GitHub + npm。
