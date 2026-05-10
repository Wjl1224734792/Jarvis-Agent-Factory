# `/frontend` 前端开发生命周期流程图

> **pipeline_type**: `frontend`  
> **Gate 序列**: A → B → B1 → C → C-impl → C1 → C1.5 → C2 → D → E (10 道闸门, C1.5 强制)

```mermaid
flowchart TD
    Start([用户输入 /frontend]) --> Init[初始化: 加载技能 + session_join frontend]
    Init --> FitCheck{是否适合流水线?}
    FitCheck -->|❌ 纯提问/简单修改| Decline[拒绝]
    FitCheck -->|✅ 页面开发/组件库/状态重构/性能优化| GateA

    subgraph GA[Gate A: 需求澄清]
        GateA([Gate A]) --> Clarify[澄清前端需求]
        Clarify -->|模糊| IdeaRefine[加载 idea-refine]
        Clarify --> ReqDoc[产出 docs/requirements/ REQ-XXX]
        ReqDoc --> Explore[并行探索]
        Explore --> Ex1[code-explore-expert × N<br/>前端目录探索]
        Explore --> Ex2[docs-research-expert × N<br/>前端框架/库文档搜索]
    end

    GA --> GateB

    subgraph GB[Gate B: 任务分解]
        GateB([Gate B]) --> SpawnTD[spawn task-design]
        SpawnTD --> TaskDoc[产出 docs/tasks/]
    end

    GB --> B1Decision{新技术栈/架构变更?}

    subgraph GB1[Gate B1: 架构评审 条件性]
        B1Decision -->|需要| SpawnB1[spawn frontend-architect]
    end

    B1Decision -->|跳过| GateC
    SpawnB1 --> GateC

    subgraph GC[Gate C: 执行规划]
        GateC([Gate C]) --> SpawnP[spawn planner]
        SpawnP --> PlanDoc[产出 docs/plans/ 含 parallel_batches]
    end

    GC --> GateCImpl

    subgraph GCI[Gate C-impl: 批量并行实现]
        GateCImpl([Gate C-impl]) --> ReadPlan[提取 parallel_batches]
        ReadPlan --> B1Parallel[Batch 1: frontend-ui-expert + frontend-state-expert 并行]
        B1Parallel --> B2Seq[Batch 2: frontend-test-expert 单元/组件测试]
        B2Seq --> B3Seq[Batch 3: browser-test-expert 浏览器交互测试]
        B3Seq --> B4Seq[Batch 4: e2e-test-expert 端到端测试]
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
        C1Result -->|❌ 失败| C1Fix[修复 → 重跑四项<br/>最多 3 轮]
        C1Result -->|✅| C1Pass[通过]
    end

    C1Pass --> GateC15

    subgraph GC15[Gate C1.5: 视觉验证 强制]
        GateC15([Gate C1.5 强制]) --> Visual[预览服务器启动<br/>修改前后对比截图<br/>响应式三视口截图<br/>mobile/tablet/desktop<br/>样式属性 preview_inspect]
        Visual --> VResult{通过?}
        VResult -->|❌ 布局问题/证据缺失| VFix[退回实现 Agent 修复<br/>→ 重新截图验证]
        VFix -->|最多 2 轮| Visual
        VResult -->|✅| VPass[通过]
    end

    VPass --> GateC2

    subgraph GC2[Gate C2: 测试]
        GateC2([Gate C2]) --> C2Parallel[并行 spawn]
        C2Parallel --> C2A[frontend-test-expert<br/>单元+组件测试]
        C2Parallel --> C2B[browser-test-expert<br/>浏览器交互测试]
        C2A --> C2Result{通过?}
        C2B --> C2Result
        C2Result -->|❌| C2Fix[spawn 原实现 Agent 修复<br/>最多 2 轮]
        C2Result -->|✅| C2E2E[e2e-test-expert<br/>端到端测试 最后]
        C2E2E --> C2Summary[汇总到 docs/testing/]
    end

    C2Summary --> GateD

    subgraph GD[Gate D: 评审]
        GateD([Gate D]) --> DParallel[并行 3 个审查专家]
        DParallel --> DA[frontend-review-expert<br/>组件/样式/状态/性能/可访问性]
        DParallel --> DB[security-review-expert<br/>XSS/CSP/依赖 CVE]
        DParallel --> DC[perf-review-expert<br/>bundle/LCP/CLS 基线]
        DA --> DQA[qa-review-expert 综合签核]
        DB --> DQA
        DC --> DQA
        DQA --> DResult{严重度}
        DResult -->|BLOCKED/FIX_REQUIRED| DFix[spawn 实现 Agent 修复<br/>最多 2 轮]
        DResult -->|WARNING/✅| DPass[通过]
    end

    DPass --> GateE

    subgraph GE[Gate E: 发布]
        GateE([Gate E]) --> ECheck[上线检查清单]
        ECheck --> ESpawn[spawn infra-deploy-expert<br/>CDN/静态资源/缓存策略]
        ECheck --> EGit[加载 git-workflow-and-versioning]
        ECheck --> EArchive[加载 finishing-a-development-branch]
    end

    EArchive --> Done([完成])
```

**可用 Agent 路由：**

| 层级 | subagent_type |
|------|--------------|
| 架构设计 | frontend-architect |
| 全栈实现 | frontend-dev-expert |
| UI/布局/样式 | frontend-ui-expert |
| 状态/数据/路由 | frontend-state-expert |
| 前端测试 | frontend-test-expert |
| 浏览器测试 | browser-test-expert |
| E2E 测试 | e2e-test-expert |
| 性能审计 | perf-review-expert |
| 安全审计 | security-review-expert |
