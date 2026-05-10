# 测试摘要：流程面板 Gate 任务时长统计

> 日期：2026-05-09 | 需求：REQ-001 ~ REQ-007

## 测试结果

| 测试文件 | 用例数 | 通过 | 失败 |
|---------|--------|------|------|
| `tests/db.test.ts` | 15 | 15 | 0 |
| `tests/gates.test.ts` | 15 | 15 | 0 |
| `tests/docs-api.test.ts` | 15 | 15 | 0 |
| **合计** | **45** | **45** | **0** |

## TDD 新增测试覆盖

### TASK-001 — Gate 进入时间与耗时
- `createPipelineRun` 写入 `gate_entered_at`
- `advance_gate` 推进后 checkpoint 有 `duration_seconds`
- `advance_gate` 推进后 `gate_entered_at` 更新为新 Gate
- `gate_jump` 跳转后 `gate_entered_at` 更新
- 迁移脚本回填已有 checkpoints 耗时
- 迁移脚本重复执行不报错
- FSM 约束不变（不回退、不跳 Gate）

### TASK-002 — 任务总耗时
- `completeRun` 写入 `total_duration_seconds`
- `abortRun` 写入 `total_duration_seconds`
- `started_at` 为 NULL 时不报错
- 迁移脚本回填已完成/已中止 run 耗时

## 手动验证

- Web 面板 UI（Gate 步骤列表、统计卡片、历史 Runs）通过 `preview_eval` 验证
- 后端 API 响应通过 TASK-003 TypeScript 编译验证

## 结论

所有自动化测试和手动验证通过。无退化。
