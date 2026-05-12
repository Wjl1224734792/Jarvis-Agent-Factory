# Docs — 流水线产物目录

> 每次提交代码后检查本文件是否需要同步更新目录结构。

## 目录结构

```
docs/
├── README.md               # 本文件 — 目录说明
├── tmp/                     # 临时产物（截图、快照等），不入版本库
├── requirements/            # Gate A — 需求文档
├── tasks/                   # Gate B — DDD/BDD/TDD 任务分解
├── architecture/            # Gate B1 — 架构评审报告
├── plans/                  # Gate C — 执行计划 + 并行批次
├── implementation/          # Gate C-impl — Agent 实现文档
├── testing/                 # Gate C2 — 测试报告
├── review/                  # Gate D — 审查报告
├── reviews/                 # Gate D — 备用审查目录
├── shipping/                # Gate E — 发布记录
└── flows/                   # 命令流程图（Mermaid）
```

## 文档命名规范

使用 `YYYY-MM-DD-<topic>.md` 格式。示例：
- `requirements/2026-05-12-dashboard-simplify.md`
- `tasks/2026-05-12-dashboard-simplify-tasks.md`
- `plans/2026-05-12-dashboard-simplify-plan.md`

## 各 Gate 产物

| 目录 | 对应 Gate | 内容 |
|------|----------|------|
| `requirements/` | Gate A | 需求文档 `REQ-XXX` |
| `tasks/` | Gate B | DDD/BDD/TDD 任务分解文档 |
| `architecture/` | Gate B1 | 架构评审报告 |
| `plans/` | Gate C | 执行计划、并行批次、Execution Packets |
| `implementation/` | Gate C→C1 | 各 agent 实现文档 |
| `testing/` | Gate C2 | 测试用例、测试报告、覆盖率 |
| `review/` | Gate D | 审查 findings、复审报告、追踪矩阵 |
| `shipping/` | Gate E | 发布记录、版本日志 |
| `tmp/` | 全部 | 过程临时产物（截图、快照等），不入版本库 |
| `flows/` | — | Mermaid 命令流程图、Agent 交互关系 |
