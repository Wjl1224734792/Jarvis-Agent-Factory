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
  tmp/                 ← 过程临时产物（不入版本库）
```

> **禁止**旧扁平格式 `docs/requirements/xxx.md` 或 `docs/requirements/YYYY-MM-DD-xxx.md`，引擎已移除所有向后兼容回退逻辑。

## 当前迭代批次

| 日期 | 说明 |
|------|------|
| `2026-05-11/` | G6 可视化 hooks token 需求 |
| `2026-05-12/` | X6 面板 Bug 修复 |
| `2026-05-13/` | 最新迭代（测试体系升级） |

