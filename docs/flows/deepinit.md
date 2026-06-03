# `/deepinit` — AI 驱动的分层架构文档初始化

> 扫描项目完整目录树，为每个目录级联生成 AGENTS.md + CLAUDE.md

```mermaid
flowchart TD
    A["/deepinit"] --> B[步骤0: 加载技能+注册引擎]
    B --> C["session_join(pipeline_type: deepinit)"]
    C --> D[Gate A: 需求澄清]
    D --> E["DI0: 扫描目标目录"]
    E --> F["生成目录结构清单"]
    F --> G["DI1: 初始 AGENTS.md 骨架"]
    G --> H["生成根 AGENTS.md 骨架"]
    H --> I["DI2: AI Agent 并行分析"]
    I --> I1["Agent A: src/engine"]
    I --> I2["Agent B: src/cli"]
    I --> I3["Agent C: src/shared"]
    I --> I4["Agent D: src/web"]
    I --> I5["Agent E: tests"]
    I --> I6["Agent F: web/src"]
    I1 --> J[汇总分析报告]
    I2 --> J
    I3 --> J
    I4 --> J
    I5 --> J
    I6 --> J
    J --> K["DI3: 最终审核"]
    K --> K1["目录覆盖检查"]
    K --> K2["父级引用验证"]
    K --> K3["章节完整性抽样"]
    K --> K4["链接有效性检查"]
    K1 --> L[完成]
    K2 --> L
    K3 --> L
    K4 --> L
```

## Gate 序列

| Gate | 产物 | 说明 |
|------|------|------|
| Gate A | 需求文档 | 确认初始化范围 |
| DI0 | 目录清单 | 扫描并排除 node_modules/.git/dist |
| DI1 | 根 AGENTS.md | 骨架 + 整体架构图 |
| DI2 | 各模块 AGENTS.md | AI Agent 并行读取源码生成 |
| DI3 | 审核报告 | 覆盖率/引用/章节/链接 4 维验证 |
