# Ultragoal Ledger

## G001 — 补齐 Command frontmatter
- **Status**: complete
- **Evidence**: 
  - 4 条指令补充了 `argument-hint` frontmatter：jarvis.md、task-bdd.md、task-ddd.md、task-tdd.md
  - 全部 33 条命令 frontmatter 完整（description + argument-hint）
- **Checked at**: 2026-05-19T01:36:00Z

## G002 — Pipeline 流程完整性
- **Status**: complete
- **Evidence**:
  - 9 条流水线（full/frontend/backend/lite/refactor/hotfix/migrate/evaluate/debug）Gate 序列完整
  - GATE_CHECKS 覆盖所有 Gate（43 个 Gate 检查条件）
  - GATE_OPERATIONS 覆盖所有 Gate（43 个 Gate 操作矩阵）
  - GATE_AGENT_GUIDE 覆盖所有 Gate（含 team_strategy）
  - 33 条指令的 pipelineType 推断正确（默认 fallback 到 full）
  - 33 条指令的 category 推断正确
- **Checked at**: 2026-05-19T01:36:00Z

## G003 — 质量门禁
- **Status**: complete
- **Evidence**:
  - Tests: 20 files, 345 tests — all pass
  - TypeScript: tsc --noEmit — 0 errors
  - Lint: eslint — 0 errors (13 warnings, pre-existing)
  - Build: npm run build — success
- **Checked at**: 2026-05-19T01:36:30Z

## G004 — 存储分层规范
- **Status**: complete
- **Evidence**:
  - AGENTS.md #22 更新为"存储分层架构"：项目级记忆 vs 用户级偏好
  - 服务器迁移代码仅复制 agent_models
  - .jarvis/ 路径全部项目级隔离（db.ts、guardian.ts、doctor.ts、server.ts）
  - 会话管理：单项目跨会话共享，跨项目不共享
- **Checked at**: 2026-05-19T01:36:30Z
