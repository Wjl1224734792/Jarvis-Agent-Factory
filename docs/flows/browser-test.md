# `/browser-test` 浏览器自动化测试闭环流程图

> **模式**: 文档驱动测试闭环 —— 先写用例，再操作浏览器执行，记录结果，失败则驱动修复重测

```mermaid
flowchart TD
    Start([用户输入 /browser-test]) --> Init[步骤 0: 加载技能<br/>behavioral-guidelines + agent-browser + browser-testing]
    Init --> Session[注册引擎会话 session_join full]
    Session --> ToolCheck{测试工具判断}

    ToolCheck -->|Claude Desktop<br/>有 preview_* MCP| UsePreview[使用 preview_* MCP 原生工具<br/>preview_start/snapshot/click/fill<br/>screenshot/console_logs/network<br/>resize/inspect/eval/logs/stop]
    ToolCheck -->|终端 无 preview_*| UseCLI[使用 agent-browser CLI<br/>agent-browser skills get core]

    UsePreview --> Step1
    UseCLI --> Step1

    subgraph S1[步骤 1: 确认测试范围]
        Step1[确认测试范围] --> S1A[目标 URL]
        Step1 --> S1B[功能范围]
        Step1 --> S1C[关键用户路径]
        Step1 --> S1D[已知风险点]
    end

    S1 --> Step2

    subgraph S2[步骤 2: 编写测试用例]
        Step2[编写测试用例清单] --> TestDoc[输出到 docs/testing/<br/>YYYY-MM-DD-topic-browser-test-cases.md]
        TestDoc --> DocFormat[格式: TC-001起<br/>前置条件/操作步骤/预期结果<br/>验证方式/优先级 P0/P1/P2]
    end

    Step2 --> Step3

    subgraph S3[步骤 3: 逐条执行测试]
        Step3[逐条执行] --> S3Init[启动开发服务器 preview_start]
        S3Init --> S3Viewport[设置视口 preview_resize]
        S3Viewport --> S3Snapshot[获取元素引用 preview_snapshot]
        S3Snapshot --> S3Interact[交互操作 click/fill/press]
        S3Interact --> S3Evidence[截图留证 preview_screenshot]
        S3Evidence --> S3Check[检查异常<br/>preview_console_logs + preview_network]
        S3Check --> S3Inspect[样式验证 preview_inspect]
        S3Inspect --> S3Responsive[响应式三视口验证<br/>mobile 375x812<br/>tablet 768x1024<br/>desktop 1280x800]
        S3Responsive --> S3Stop[清理 preview_stop]
    end

    Step3 --> Step4

    subgraph S4[步骤 4: 汇总测试报告]
        Step4[汇总报告] --> Report[输出到 docs/testing/<br/>YYYY-MM-DD-topic-browser-test-report.md]
        Report --> ReportContent[内容: 通过/失败/跳过统计<br/>每条用例详细结果含截图路径<br/>失败用例根因分析<br/>控制台/网络错误日志]
    end

    Step4 --> S4Result{全部通过?}

    subgraph S5[步骤 5: 修复闭环]
        S4Result -->|✅ 全部通过| Done([闭环完成])
        S4Result -->|❌ 存在失败| Findings[输出 Browser Test Findings<br/>失败用例 + 截图证据<br/>控制台/网络错误 + 修复建议]
        Findings --> FixLoop[触发修复闭环]
        FixLoop --> Fix1[提交给 /review-fix 闭环<br/>或调用对应实现 Agent]
        Fix1 --> QualityCheck[修复后必须通过<br/>Lint + Type-check + Build 三项]
        QualityCheck --> Rerun[仅重跑失败用例<br/>更新报告]
        Rerun --> ReResult{全部通过?}
        ReResult -->|✅| Done
        ReResult -->|❌ 仍失败| Fix2[再次修复<br/>最多 2 轮]
        Fix2 -->|第 3 轮仍失败| Blocked[标记 BLOCKED<br/>上报人工介入]
    end
```

**测试工具选择逻辑：**

| 环境 | 工具 | 说明 |
|------|------|------|
| Claude Desktop | preview_* MCP | 原生内置，无需浏览器扩展 |
| 终端 | agent-browser CLI | 命令行操作浏览器 |
| 需登录态 | agent-browser --profile "Default" | 复用 Chrome 登录状态 |

**红线：**
- 禁止使用 Claude in Chrome 扩展
- 不写用例直接操作浏览器
- 测试失败不截图
- 跳过修复闭环
- 破坏性操作（删除数据/发起支付）
- 硬等待替代轮询确认
