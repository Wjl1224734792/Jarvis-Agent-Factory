# `/react-native` — React Native 跨端开发生命周期流程图

```mermaid
flowchart TD
    START([用户输入 /react-native]) --> A[Gate A: 需求澄清]
    A --> B[Gate B: 任务分解<br/>DDD→BDD→TDD]
    B --> B1[Gate B1: 架构评审<br/>条件性]
    B1 --> C[Gate C: 执行规划<br/>spawn planner]
    C --> CI[Gate C-impl: 并行实现]
    CI --> CI1[Batch 1: react-native-ui-expert<br/>react-native-state-expert]
    CI1 --> CI2[Batch 2: react-native-dev-expert]
    CI2 --> C1[Gate C1: Lint+Build<br/>eslint+tsc+Metro bundle]
    C1 --> C15[Gate C1.5: 视觉验证<br/>模拟器截图+iOS+Android+Safe Area]
    C15 --> C2[Gate C2: 测试]
    C2 --> C2A[react-native-test-expert<br/>Jest+RNTL]
    C2A --> C2B[browser-test-expert<br/>Web端浏览器测试]
    C2B --> C2C[e2e-test-expert<br/>Detox/Maestro]
    C2C --> D[Gate D: 评审]
    D --> D1[react-native-review-expert<br/>组件架构/UI/状态/原生桥接]
    D1 --> D2[security-review-expert<br/>OWASP Mobile Top 10/CVE]
    D2 --> D3[perf-review-expert<br/>启动/首屏/Bridge/包体积]
    D3 --> D4[qa-review-expert<br/>综合签核]
    D4 --> E[Gate E: 发布<br/>质量重检→Fastlane+App Store+Play]
    E --> DONE([✅ 完成])
```
