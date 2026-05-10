# `/ios` iOS 原生开发生命周期流程图

> **pipeline_type**: `full`  
> **Gate 序列**: A → B → C → C1 → C2 → D → E (7 道闸门)

```mermaid
flowchart TD
    Start([用户输入 /ios]) --> Init[初始化: 加载技能 + session_join full]
    Init --> FitCheck{是否适合流水线?}
    FitCheck -->|❌| Decline[拒绝]
    FitCheck -->|✅ SwiftUI页面/ObservableObject/SwiftData/性能优化| GateA

    subgraph GA[Gate A: 需求澄清]
        GateA([Gate A]) --> Clarify[澄清需求<br/>确认最低 iOS/Swift 版本]
        Clarify -->|模糊| IdeaRefine[加载 idea-refine]
        Clarify --> ReqDoc[产出 docs/requirements/ REQ-XXX]
    end

    GA --> GateB

    subgraph GB[Gate B: 任务分解]
        GateB([Gate B]) --> SpawnTD[spawn task-design]
        SpawnTD --> TaskDoc[产出 docs/tasks/]
    end

    GB --> GateC

    subgraph GC[Gate C: 执行规划 + 并行实现]
        GateC([Gate C 规划+实现]) --> SpawnP[spawn planner]
        SpawnP --> PlanDoc[产出 docs/plans/ 含 parallel_batches]
        PlanDoc --> ReadPlan[提取 parallel_batches]
        ReadPlan --> B1P[Batch 1: ios-ui-expert + ios-state-expert 并行<br/>SwiftUI + ObservableObject/SwiftData]
        B1P --> B2S[Batch 2: e2e-test-expert<br/>XCUITest + SwiftUI Testing]
    end

    GC --> GateC1

    subgraph GC1[Gate C1: 代码质量]
        GateC1([Gate C1]) --> C1A[SwiftLint 零 error]
        C1A --> C1B[xcodebuild type-check]
        C1B --> C1C[Xcode Archive Build]
        C1C --> C1D[SPM/CocoaPods 漏洞扫描]
        C1D --> C1Result{全部通过?}
        C1Result -->|❌| C1Fix[修复 → 重跑]
        C1Result -->|✅| C1Pass[通过]
    end

    C1Pass --> GateC2

    subgraph GC2[Gate C2: 测试]
        GateC2([Gate C2]) --> C2Step1[步骤 1: ios-dev-expert 运行单元测试<br/>XCTest - ViewModel/Service/Repository]
        C2Step1 --> C2Step2[步骤 2: e2e-test-expert<br/>XCUITest<br/>需模拟器<br/>XCUIApplication + XCUIElementQuery]
        C2Step2 --> C2Summary[汇总 docs/testing/]
        C2Summary --> C2Result{全部通过?}
        C2Result -->|❌| C2Fix[修复 → 重测<br/>最多 2 轮]
        C2Result -->|✅| C2Pass[通过]
    end

    C2Pass --> GateD

    subgraph GD[Gate D: 评审]
        GateD([Gate D]) --> SpawnRev[spawn 审查 Agent]
        SpawnRev --> DA[security-review-expert<br/>安全审计]
        SpawnRev --> DB[对应领域审查]
        DA --> DPass[评审通过]
        DB --> DPass
    end

    DPass --> GateE

    subgraph GE[Gate E: 发布]
        GateE([Gate E]) --> ECheck[上线检查清单]
        ECheck --> EAppStore[App Store: 证书管理<br/>Archive→Validate→Submit<br/>TestFlight 分发]
        ECheck --> EHIG[HIG 合规检查]
        ECheck --> ECrash[Crashlytics/Xcode Organizer 崩溃监控]
        ECheck --> EGit[加载 git-workflow-and-versioning<br/>更新版本号]
    end

    EGit --> Done([完成])
```

**iOS Agent 路由：**

| 层级 | subagent_type |
|------|--------------|
| 全栈实现 | ios-dev-expert |
| UI/SwiftUI/HIG | ios-ui-expert |
| 状态/ObservableObject/SwiftData | ios-state-expert |
| E2E 测试 | e2e-test-expert |
