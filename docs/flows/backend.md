# `/backend` 后端开发生命周期流程图

> **pipeline_type**: `backend`  
> **Gate 序列**: A → B → B1 → C → C-impl → C1 → C2 → D → E (**9 道闸门, 跳过 C1.5**)

```mermaid
flowchart TD
    Start([用户输入 /backend]) --> Init[初始化: 加载技能 + session_join backend]
    Init --> FitCheck{是否适合流水线?}
    FitCheck -->|❌| Decline[拒绝]
    FitCheck -->|✅ API开发/数据库设计/服务实现/后端重构| GateA

    subgraph GA[Gate A: 需求澄清]
        GateA([Gate A]) --> Clarify[澄清后端需求]
        Clarify -->|模糊| IdeaRefine[加载 idea-refine]
        Clarify --> ReqDoc[产出 docs/requirements/ REQ-XXX]
        ReqDoc --> Explore[并行探索]
        Explore --> Ex1[code-explore-expert × N<br/>后端目录探索]
        Explore --> Ex2[docs-research-expert × N<br/>后端框架/库文档搜索]
    end

    GA --> GateB

    subgraph GB[Gate B: 任务分解]
        GateB([Gate B]) --> SpawnTD[spawn task-design]
        SpawnTD --> TaskDoc[产出 docs/tasks/]
    end

    GB --> B1Decision{新技术栈/架构变更?}

    subgraph GB1[Gate B1: 架构评审 条件性]
        B1Decision -->|需要| SpawnB1[并行 spawn]
        SpawnB1 --> B1A[backend-architect<br/>后端架构评审]
        SpawnB1 --> B1B[database-architect<br/>数据库架构评审]
    end

    B1Decision -->|跳过| GateC
    B1A --> GateC
    B1B --> GateC

    subgraph GC[Gate C: 执行规划]
        GateC([Gate C]) --> SpawnP[spawn planner]
        SpawnP --> PlanDoc[产出 docs/plans/ 含 parallel_batches]
    end

    GC --> GateCImpl

    subgraph GCI[Gate C-impl: 批量并行实现]
        GateCImpl([Gate C-impl]) --> ReadPlan[提取 parallel_batches]
        ReadPlan --> B1P[Batch 1: backend-api-expert + backend-data-expert 并行<br/>API + Schema]
        B1P --> B2S[Batch 2: backend-logic-expert<br/>依赖 Batch 1 契约]
        B2S --> B3P[Batch 3: backend-test-expert + api-contract-expert 并行]
        B3P --> B4S[Batch 4: perf-test-expert 负载/压力测试]
        B4S --> B5S[Batch 5: security-review-expert 安全审计]
    end

    GCI --> GateC1

    subgraph GC1[Gate C1: 代码质量门]
        GateC1([Gate C1]) --> C1Parallel[四项并行]
        C1Parallel --> C1A[Lint]
        C1Parallel --> C1B[Type-check]
        C1Parallel --> C1C[Build]
        C1Parallel --> C1D[Deps Audit]
        C1A --> C1Result{全部通过?}
        C1B --> C1Result
        C1C --> C1Result
        C1D --> C1Result
        C1Result -->|❌| C1Fix[修复 → 重跑四项<br/>最多 3 轮]
        C1Result -->|✅| C1Pass[通过]
    end

    C1Pass --> GateC2

    subgraph GC2[Gate C2: 测试]
        GateC2([Gate C2]) --> C2Parallel[并行 spawn]
        C2Parallel --> C2A[backend-test-expert<br/>单元+集成测试]
        C2Parallel --> C2B[api-contract-expert<br/>API 契约一致性验证]
        C2A --> C2Result{通过?}
        C2B --> C2Result
        C2Result -->|❌| C2Fix[spawn 原实现 Agent 修复<br/>最多 2 轮]
        C2Fix -->|修复后| C2Result
        C2Result -->|✅| C2Perf[perf-test-expert<br/>负载/压力/基准测试 最后]
        C2Perf --> C2Summary[汇总到 docs/testing/]
    end

    C2Summary --> GateD

    subgraph GD[Gate D: 评审]
        GateD([Gate D]) --> DParallel[并行 3 个审查专家]
        DParallel --> DA[backend-review-expert<br/>API/业务逻辑/数据层/安全]
        DParallel --> DB[security-review-expert<br/>OWASP/CVE/SAST/密钥检测]
        DParallel --> DC[perf-review-expert<br/>查询效率/运行时/资源使用]
        DA --> DQA[qa-review-expert 综合签核]
        DB --> DQA
        DC --> DQA
        DQA --> DResult{严重度}
        DResult -->|BLOCKED/FIX_REQUIRED| DFix[spawn 后端实现 Agent 修复<br/>最多 2 轮]
        DResult -->|WARNING/✅| DPass[通过]
    end

    DPass --> GateE

    subgraph GE[Gate E: 发布]
        GateE([Gate E]) --> ECheck[上线检查清单]
        ECheck --> ESec[spawn security-review-expert<br/>如 Gate D 未执行]
        ECheck --> EMigrate[DB 迁移脚本已测试通过]
        ECheck --> EGit[加载 git-workflow-and-versioning]
        ECheck --> EArchive[加载 finishing-a-development-branch]
    end

    EArchive --> Done([完成])
```

**可用 Agent 路由：**

| 层级 | subagent_type |
|------|--------------|
| 架构设计 | backend-architect / database-architect |
| 全栈实现 | backend-dev-expert |
| API/路由/中间件 | backend-api-expert |
| 业务逻辑/领域 | backend-logic-expert |
| 数据层/Schema/迁移 | backend-data-expert |
| 后端测试 | backend-test-expert |
| 性能/负载测试 | perf-test-expert |
| API 文档 | api-contract-expert |
