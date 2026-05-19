# Docs — 流水线产物目录

> 每次提交代码后检查本文件是否需要同步更新目录结构。

## 目录结构（强制格式）

所有正式产物**必须**存放在 `docs/<YYYY>-<MM>-<DD>/` 日期目录下：

```
docs/
  YYYY-MM-DD/          ← 日期分类目录（唯一合法格式）
    requirements/      ← Gate A：需求文档 REQ-XXX
    tasks/             ← Gate B：任务分解 DDD/BDD/TDD
    architecture/      ← Gate B1：架构评审报告
    plans/             ← Gate C：执行计划、并行批次
    implementation/    ← Gate C-impl→C1：实现完成报告
    testing/           ← Gate C2：测试用例、报告、覆盖率
    review/            ← Gate D：审查 findings、复审报告
    shipping/          ← Gate E：上线检查清单、回滚预案
    research/         ← /research：RS0-RS4 深度研究产物
    refactoring/      ← /refactor：R1-R5 重构报告
    hotfix/           ← /hotfix：H0-H3 热修复审计
    migration/        ← /migrate：M1-M4 迁移产物
    evaluation/       ← /evaluate：E0-E3 评估报告
    debug/            ← /debug：D0-D4 诊断报告
    simplification/   ← /simplify：S0-S3 简化报告
    trace/            ← /trace：T0-T4 因果追踪报告
    improvement/      ← /improve：IM0-IM4 迭代改进报告
  tmp/                 ← 过程临时产物（不入版本库）
```

> **禁止**旧扁平格式 `docs/requirements/xxx.md` 或 `docs/requirements/YYYY-MM-DD-xxx.md`，引擎已移除所有向后兼容回退逻辑。

## 当前迭代批次

| 日期 | 说明 |
|------|------|
| `2026-05-14/` | Gate E 发布流程 + 发布指令优化 |
| `2026-05-15/` | 移动端/跨端流程图更新 + 12门序列 |
| `2026-05-18/` | 会话归档+数据看板+记忆系统+指令扩展 |
| `2026-05-19/` | v4.1.0 — /auto 智能路由 + 确认约束补全 + 路由修复 |
| `2026-05-18/` | 会话归档+数据看板+记忆系统+指令扩展 |

