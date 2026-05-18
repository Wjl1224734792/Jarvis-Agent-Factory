# Ultragoal Plan: 全部指令流程完善 — 工程级规范

## 目标
完善所有 33 条 Command 指令和对应 Pipeline 流程，确保严格生产可用的工程级规范。

## 背景
Jarvis 当前有 9 条流水线（full/frontend/backend/lite/refactor/hotfix/migrate/evaluate/debug）
和 33 条 Command 指令。需要逐一核查并完善 frontmatter、pipeline 映射、agent 生成指引、
team strategy 和存储约束。

## 故事序列

### Goal 1: 补齐缺失的 Command frontmatter（argument-hint）
- G001: jarvis.md 缺少 argument-hint → 添加
- G001: task-bdd.md 缺少 argument-hint → 添加
- G001: task-ddd.md 缺少 argument-hint → 添加
- G001: task-tdd.md 缺少 argument-hint → 添加

### Goal 2: 验证 Pipeline 流程完整性
- G002: 逐一核查 9 条流水线的 Gate 序列是否正确
- G002: 确保每条流水线都有完整的 GATE_CHECKS + GATE_OPERATIONS + GATE_AGENT_GUIDE（含 team_strategy）
- G002: 检查 api/commands 的 pipelineType 推断逻辑是否覆盖所有指令

### Goal 3: 确保质量门禁通过
- G003: 345 测试全部通过，0 错误
- G003: TypeScript 零错误编译
- G003: build 成功（npm run build + npm run build:web）
- G003: lint 仅 warnings 无 errors

### Goal 4: 验证存储分层约束 + AGENTS.md 工程规范
- G004: 代码中的 .jarvis/ 路径全部遵循项目级隔离
- G004: AGENTS.md 约束完整且与代码一致
- G004: 会话管理和记忆规范文档完整
