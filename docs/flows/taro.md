# `/taro` Taro 小程序/H5 开发生命周期流程图

> **pipeline_type**: `full`  
> **Gate 序列**: A → B → C → C1 → C2 → D → E (7 道闸门)

```mermaid
flowchart TD
    Start([用户输入 /taro]) --> Init[初始化: 加载技能 + session_join full]
    Init --> FitCheck{是否适合流水线?}
    FitCheck -->|❌| Decline[拒绝]
    FitCheck -->|✅ Taro页面/组件/多端适配/状态管理/小程序审核| GateA

    subgraph GA[Gate A: 需求澄清]
        GateA([Gate A]) --> Clarify[澄清需求<br/>确认目标端: 微信/支付宝/百度/字节 + H5]
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
        ReadPlan --> B1P[Batch 1: taro-ui-expert + taro-state-expert 并行<br/>UI + 状态]
        B1P --> B2S[Batch 2: browser-test-expert<br/>H5 端浏览器测试]
        B2S --> B3S[Batch 3: e2e-test-expert<br/>真机/模拟器 E2E]
    end

    GC --> GateC1

    subgraph GC1[Gate C1: 代码质量]
        GateC1([Gate C1]) --> C1A[Taro Lint/ESLint 零 error]
        C1A --> C1B[Type-check tsc --noEmit]
        C1B --> C1C[Build 多端构建验证]
        C1C --> C1D[Dep Audit npm audit]
        C1D --> C1Result{全部通过?}
        C1Result -->|❌| C1Fix[修复 → 重跑]
        C1Result -->|✅| C1Pass[通过]
    end

    C1Pass --> GateC2

    subgraph GC2[Gate C2: 测试]
        GateC2([Gate C2]) --> C2Step1[步骤 1: taro-dev-expert 运行单元/组件测试]
        C2Step1 --> C2Step2[步骤 2: browser-test-expert<br/>H5 端浏览器自动化]
        C2Step2 --> C2Step3[步骤 3: e2e-test-expert<br/>微信开发者工具 CLI<br/>多端适配: 微信 + H5]
        C2Step3 --> C2Summary[汇总 docs/testing/]
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
        ECheck --> EMP[小程序: 微信审核规范检查<br/>体验版验证 → 提交审核]
        ECheck --> EH5[H5: 静态资源 CDN 部署<br/>缓存策略]
        ECheck --> EGit[加载 git-workflow-and-versioning]
    end

    EGit --> Done([完成])
```

**Taro Agent 路由：**

| 层级 | subagent_type |
|------|--------------|
| 全栈实现 | taro-dev-expert |
| UI/布局/多端样式 | taro-ui-expert |
| 状态/数据/路由 | taro-state-expert |
| 浏览器测试 H5 | browser-test-expert |
| E2E 测试 | e2e-test-expert |
