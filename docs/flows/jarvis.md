# `/jarvis` 全流程编排流程图

> **pipeline_type**: `full`  
> **Gate 序列**: A → B → B1 → C → C-impl → C1 → C1.5 → C2 → D → E (10 道闸门)

```mermaid
flowchart TD
    Start([用户输入 /jarvis]) --> Init[初始化: 加载技能 + session_join]
    Init --> FitCheck{是否适合流水线?}
    FitCheck -->|❌ 纯提问/简单修改| Decline[拒绝, 建议其他方式]
    FitCheck -->|✅ 开发/改造/配置/Bug修复| GateA

    subgraph GA[Gate A: 需求澄清]
        GateA([Gate A]) --> Clarify[与用户对话澄清需求]
        Clarify -->|模糊| IdeaRefine[加载 idea-refine 结构化提问]
        Clarify --> ReqDoc[产出需求文档 docs/requirements/]
        ReqDoc --> Explore[并行探索]
        Explore --> Ex1[code-explore-expert × N<br/>探索不同模块/目录]
        Explore --> Ex2[docs-research-expert × N<br/>搜索不同技术栈文档]
    end

    GA -->|gate_enforce → advance_gate| GateB

    subgraph GB[Gate B: 任务分解]
        GateB([Gate B]) --> SpawnTD[spawn task-design Agent]
        SpawnTD --> TaskDoc[产出 docs/tasks/ 任务分解文档]
        TaskDoc --> VerifyB[验证: TASK-REQ 映射完整<br/>无水平切片, 粒度合理]
    end

    GB -->|gate_enforce → advance_gate| B1Decision{新技术栈/架构变更?}

    subgraph GB1[Gate B1: 架构评审 条件性]
        B1Decision -->|✅ 需要| SpawnB1[并行 spawn 架构师]
        SpawnB1 --> B1A[frontend-architect<br/>前端架构评审]
        SpawnB1 --> B1B[backend-architect<br/>后端架构评审]
        SpawnB1 --> B1C[database-architect<br/>数据库架构评审]
        B1A --> B1Done[评审完成]
        B1B --> B1Done
        B1C --> B1Done
    end

    B1Decision -->|❌ 跳过| GateC
    B1Done --> GateC

    subgraph GC[Gate C: 执行规划]
        GateC([Gate C]) --> SpawnP[spawn planner Agent]
        SpawnP --> PlanDoc[产出 docs/plans/ 执行计划<br/>含 parallel_batches]
        PlanDoc --> VerifyC[验证: parallel_batches 合理<br/>共享区域唯一责任方]
    end

    GC -->|gate_enforce → advance_gate| GateCImpl

    subgraph GCI[Gate C-impl: 批量并行实现]
        GateCImpl([Gate C-impl]) --> ReadPlan[Read 计划文档]
        ReadPlan --> ExtractBatch[提取 parallel_batches]
        ExtractBatch --> BatchLoop[逐 Batch 执行]
        BatchLoop --> SpawnBatch[同一 Batch 内所有 Agent<br/>在同一消息中并行发出]
        SpawnBatch --> WaitBatch[等待整批完成]
        WaitBatch --> CheckPatch{有 plan patch /<br/>contract change?}
        CheckPatch -->|有冲突| Resolve[协调冲突]
        CheckPatch -->|无冲突| NextBatch{还有下一 Batch?}
        Resolve --> NextBatch
        NextBatch -->|是| BatchLoop
        NextBatch -->|否| AllDone[全部实现 Batch 完成]
    end

    GCI -->|gate_enforce → advance_gate| GateC1

    subgraph GC1[Gate C1: 代码质量门]
        GateC1([Gate C1]) --> C1Parallel[四项并行检查]
        C1Parallel --> C1A[Lint 检查 npm run lint]
        C1Parallel --> C1B[Type-check tsc --noEmit]
        C1Parallel --> C1C[Build npm run build]
        C1Parallel --> C1D[Deps Audit npm audit]
        C1A --> C1Result{全部通过?}
        C1B --> C1Result
        C1C --> C1Result
        C1D --> C1Result
        C1Result -->|❌ 任意失败| C1Fix[修复源文件 → 重跑全部四项]
        C1Fix -->|最多 3 轮| C1Result
        C1Result -->|3 轮仍失败| C1Blocked[标记 BLOCKED]
        C1Result -->|✅ 全部通过| C1Pass[质量门通过]
    end

    C1Pass --> C15Decision{涉及前端页面/组件变更?}

    subgraph GC15[Gate C1.5: 视觉验证 条件性]
        C15Decision -->|✅ 是| GateC15([Gate C1.5])
        GateC15 --> VisualCheck[预览服务器启动<br/>截图对比 + 响应式三视口<br/>样式属性验证]
        VisualCheck --> VResult{通过?}
        VResult -->|❌ 布局问题| VFix[诊断根因 → 修复源文件<br/>重新截图验证]
        VFix -->|最多 2 轮| VisualCheck
        VResult -->|✅ 通过| VPass[视觉验证通过]
    end

    C15Decision -->|❌ 跳过| GateC2
    VPass --> GateC2

    subgraph GC2[Gate C2: 测试验证]
        GateC2([Gate C2]) --> C2Step1[步骤 1: 并行 spawn 测试 Agent]
        C2Step1 --> C2A[backend-test-expert<br/>单元+集成测试]
        C2Step1 --> C2B[frontend-test-expert<br/>单元+组件测试]
        C2Step1 --> C2C[browser-test-expert<br/>浏览器交互测试]
        C2Step1 --> C2D[api-contract-expert<br/>API 契约一致性验证]
        C2A --> C2S1Done{全部通过?}
        C2B --> C2S1Done
        C2C --> C2S1Done
        C2D --> C2S1Done
        C2S1Done -->|❌ 失败| C2Fix[spawn 原实现 Agent 修复<br/>→ 重跑对应测试]
        C2Fix -->|最多 2 轮| C2S1Done
        C2S1Done -->|2 轮仍失败| C2Blocked[标记 BLOCKED]
        C2S1Done -->|✅ 全部通过| C2Step3[步骤 3: e2e-test-expert<br/>端到端测试]
        C2Step3 --> C2Summary[汇总测试结果到 docs/testing/]
    end

    C2Summary -->|gate_enforce → advance_gate| GateD

    subgraph GD[Gate D: 评审]
        GateD([Gate D]) --> DStep1[步骤 1: 并行 spawn 4 个审查专家]
        DStep1 --> DA[frontend-review-expert<br/>前端代码审查]
        DStep1 --> DB[backend-review-expert<br/>后端代码审查]
        DStep1 --> DC[security-review-expert<br/>安全审计]
        DStep1 --> DD[perf-review-expert<br/>性能审计]
        DA --> DStep2
        DB --> DStep2
        DC --> DStep2
        DD --> DStep2[步骤 2: qa-review-expert 综合签核]
        DStep2 --> DSeverity{严重度判断}
        DSeverity -->|BLOCKED| DBlocked[spawn 对应实现 Agent 修复<br/>重走完整 Gate D]
        DSeverity -->|FIX_REQUIRED| DFixReq[按领域回退修复<br/>重 spawn 对应审查 + QA]
        DSeverity -->|WARNING| DPass
        DBlocked -->|最多 2 轮| GateD
        DFixReq -->|最多 2 轮| DStep1
        DSeverity -->|✅ 全部通过| DPass[评审通过]
    end

    DPass -->|gate_enforce → advance_gate| GateE

    subgraph GE[Gate E: 发布上线]
        GateE([Gate E]) --> ECheck[执行上线检查清单]
        ECheck --> EShip[加载 shipping-and-launch]
        ECheck --> EGit[加载 git-workflow-and-versioning<br/>更新版本号 + changelog]
        ECheck --> EMigrate[数据库迁移脚本就绪]
        EResult{通过?}
        EResult -->|❌ 不通过| EFix[逐项修复 → 重执行检查清单]
        EFix -->|最多 2 轮| ECheck
        EResult -->|✅ 通过| EDeploy[发布]
        EDeploy --> EArchive[加载 finishing-a-development-branch 归档]
    end

    EArchive --> Done([流水线完成])
```

**关键 Agent spawn 关系：**

| Gate | Spawn 模式 | 并行/串行 |
|------|-----------|----------|
| Gate A 通过后 | code-explore-expert × N + docs-research-expert × N | 并行 |
| Gate B | task-design (单 Agent) | 串行 |
| Gate B1 | frontend-architect + backend-architect + database-architect | 并行 |
| Gate C | planner (单 Agent) | 串行 |
| Gate C-impl | 按 parallel_batches 批量, 同 Batch 内并行 | Batch 内并行, Batch 间串行 |
| Gate C1 | Lint + Type-check + Build + Deps Audit | 并行 |
| Gate C2 | backend-test + frontend-test + browser-test + api-contract | 并行 → e2e-test 串行 |
| Gate D | 4 领域审查专家 → qa-review-expert | 并行 → 串行 |
| Gate E | 上线检查清单 + shipping-and-launch | 串行 |
