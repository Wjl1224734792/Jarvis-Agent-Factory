# `/jarvis-lite` 轻量编排流程图

> **pipeline_type**: `lite` —— 按任务类型智能映射 Gate 入口, 跳过无关闸门

```mermaid
flowchart TD
    Start([用户输入 /jarvis-lite]) --> Init[初始化: 加载技能 + session_join lite]
    Init --> Classify[任务分类: 关键词判断]

    Classify -->|"发布/部署 (发布、部署、release、npm publish)"| EntryE[入口 Gate E]
    Classify -->|"代码审查 (review、审查、审计)"| EntryD[入口 Gate D]
    Classify -->|"Bug修复 (bug、fix、修复、崩溃)"| EntryC[入口 Gate C]
    Classify -->|"文档/配置 (文档、README、config)"| EntryC
    Classify -->|"重构/优化 (重构、性能、简化)"| EntryC
    Classify -->|"小功能添加 (添加、新增、feature)"| EntryA[入口 Gate A]
    Classify -->|"不确定"| EntryA

    subgraph PathA[路径 1: 从 Gate A 起步 小功能]
        EntryA --> LiteA([Gate A: 轻量需求澄清])
        LiteA --> LiteAC[3 轮对话内确认需求<br/>跳过 Gate B 任务分解]
        LiteAC --> LiteACImpl[Gate C: 直接实现<br/>至多 2 个 Agent 并行]
        LiteACImpl --> LiteAC1[Gate C1: Lint + Build]
        LiteAC1 --> LiteAC15{前端变更?}
        LiteAC15 -->|是| LiteAC15V[Gate C1.5: 视觉验证]
        LiteAC15 -->|否| LiteAE
        LiteAC15V --> LiteAE[Gate E: 提交 + 推送]
    end

    subgraph PathC[路径 2: 从 Gate C 起步 Bug修复/重构/文档]
        EntryC --> LiteC([Gate C: 直接定位代码])
        LiteC --> LiteCFix[1 个 Agent 修复]
        LiteCFix --> LiteCC1[Gate C1: Lint + Build]
        LiteCC1 --> LiteCTest{有测试基础设施?}
        LiteCTest -->|是| LiteCRun[运行现有测试套件<br/>确保无回归]
        LiteCTest -->|否| LiteCE
        LiteCRun --> LiteCE[Gate E: 提交 + 推送]
    end

    subgraph PathD[路径 3: 从 Gate D 起步 代码审查]
        EntryD --> LiteD([Gate D: 只读审查])
        LiteD --> LiteDSpawn[spawn 对应审查 Agent]
        LiteDSpawn --> LiteDFront[frontend-review-expert<br/>前端审查]
        LiteDSpawn --> LiteDBack[backend-review-expert<br/>后端审查]
        LiteDSpawn --> LiteDSec[security-review-expert<br/>安全审计]
        LiteDFront --> LiteDReport[输出审查报告<br/>不自动修改代码]
        LiteDBack --> LiteDReport
        LiteDSec --> LiteDReport
    end

    subgraph PathE[路径 4: 从 Gate E 起步 发布/部署]
        EntryE --> LiteE([Gate E: 发布])
        LiteE --> LiteEStep[步骤]
        LiteEStep --> LiteEVer[1. 确认版本号已递增]
        LiteEStep --> LiteEMain[2. 确保 main 分支已合并]
        LiteEStep --> LiteEPush[3. 推送 gitee + github]
        LiteEStep --> LiteENpm[4. npm publish 如有]
        LiteEStep --> LiteERelease[5. 创建 release]
        LiteEStep --> LiteEGit[6. 加载 git-workflow-and-versioning]
    end

    LiteAE --> Done([完成])
    LiteCE --> Done
    LiteDReport --> Done
    LiteEGit --> Done
```

**与 `/jarvis` 的区别：**

| 维度 | `/jarvis` | `/jarvis-lite` |
|------|----------|----------------|
| Gate 序列 | A→B→B1→C→C-impl→C1→C1.5→C2→D→E 全部 | 按任务类型跳过无关 Gate |
| 需求文档 | 必须 | 从 Gate A 起步时可选 |
| 任务分解 | 必须 spawn task-design | 跳过 |
| 架构评审 | 条件性必须 | 仅新技术栈时触发 |
| 实现 Agent | 按 parallel_batches 批量 | 至多 2 个 Agent 并行 |
| 测试 | 强制 Gate C2 | 条件性——有测试基础设施则运行 |
| 审查 | 强制 Gate D | 仅 Bug 修复/重构需要 |
