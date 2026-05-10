# `/flutter` Flutter 跨端开发生命周期流程图

> **pipeline_type**: `full`  
> **Gate 序列**: A → B → C → C1 → C2 → D → E (7 道闸门)

```mermaid
flowchart TD
    Start([用户输入 /flutter]) --> Init[初始化: 加载技能 + session_join full]
    Init --> FitCheck{是否适合流水线?}
    FitCheck -->|❌| Decline[拒绝]
    FitCheck -->|✅ Widget页面/Provider/Riverpod/BLoC/路由/性能优化| GateA

    subgraph GA[Gate A: 需求澄清]
        GateA([Gate A]) --> Clarify[澄清需求<br/>确认目标平台/Dart版本]
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
        ReadPlan --> B1P[Batch 1: flutter-ui-expert + flutter-state-expert 并行<br/>Widget + Provider/BLoC]
        B1P --> B2S[Batch 2: browser-test-expert<br/>Web 端浏览器交互测试]
        B2S --> B3S[Batch 3: e2e-test-expert<br/>真机/模拟器 E2E]
    end

    GC --> GateC1

    subgraph GC1[Gate C1: 代码质量]
        GateC1([Gate C1]) --> C1A[dart analyze 零 error]
        C1A --> C1B[flutter analyze 静态类型检查]
        C1B --> C1C[flutter build apk --debug + build ios --no-codesign]
        C1C --> C1D[dart pub outdated + OWASP]
        C1D --> C1Result{全部通过?}
        C1Result -->|❌| C1Fix[修复 → 重跑]
        C1Result -->|✅| C1Pass[通过]
    end

    C1Pass --> GateC2

    subgraph GC2[Gate C2: 测试]
        GateC2([Gate C2]) --> C2Step1[步骤 1: flutter-dev-expert 运行单元/Widget测试<br/>flutter test]
        C2Step1 --> C2Step2[步骤 2: browser-test-expert<br/>Web 端浏览器自动化]
        C2Step2 --> C2Step3[步骤 3: e2e-test-expert<br/>flutter integration_test<br/>真机/模拟器 E2E]
        C2Step3 --> C2Summary[汇总 docs/testing/]
        C2Summary --> C2Result{全部通过?}
        C2Result -->|❌| C2Fix[修复 → 重测<br/>最多 2 轮]
        C2Result -->|✅| C2Pass[通过]
    end

    C2Pass --> GateD

    subgraph GD[Gate D: 评审]
        GateD([Gate D]) --> SpawnRev[spawn 审查 Agent]
        SpawnRev --> DA[security-review-expert]
        SpawnRev --> DB[对应领域审查]
        DA --> DPass[评审通过]
        DB --> DPass
    end

    DPass --> GateE

    subgraph GE[Gate E: 发布]
        GateE([Gate E]) --> ECheck[上线检查清单]
        ECheck --> EAndroid[flutter build appbundle + Google Play]
        ECheck --> EIOS[flutter build ipa + TestFlight + App Store]
        ECheck --> EWeb[flutter build web + Vercel/Firebase Hosting]
        ECheck --> EDesktop[flutter build windows/macos/linux]
        ECheck --> EGit[加载 git-workflow-and-versioning]
    end

    EGit --> Done([完成])
```

**Flutter Agent 路由：**

| 层级 | subagent_type |
|------|--------------|
| 全栈实现 | flutter-dev-expert |
| UI/Widget/主题 | flutter-ui-expert |
| 状态/数据/路由 | flutter-state-expert |
| 浏览器测试 Web | browser-test-expert |
| E2E 测试 | e2e-test-expert |
