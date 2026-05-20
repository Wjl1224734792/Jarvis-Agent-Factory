# `/taro` — Taro 小程序/H5 开发生命周期流程图

```mermaid
flowchart TD
    START([用户输入 /taro]) --> A[Gate A: 需求澄清]
    A --> B[Gate B: 任务分解<br/>DDD→BDD→TDD]
    B --> B1[Gate B1: 架构评审<br/>条件性]
    B1 --> C[Gate C: 执行规划<br/>spawn planner]
    C --> CI[Gate C-impl: 并行实现]
    CI --> CI1[Batch 1: taro-ui-expert<br/>taro-state-expert]
    CI1 --> CI2[Batch 2: taro-dev-expert]
    CI2 --> C1[Gate C1: Lint+Build<br/>eslint+tsc+taro build]
    C1 --> C15[Gate C1.5: 视觉验证<br/>H5截图+小程序截图+多端对比]
    C15 --> C2[Gate C2: 测试]
    C2 --> C2A[taro-test-expert<br/>Jest]
    C2A --> C2B[browser-test-expert<br/>H5端浏览器测试]
    C2B --> C2C[e2e-test-expert<br/>小程序自动化]
    C2C --> D[Gate D: 评审]
    D --> D1[taro-review-expert<br/>组件架构/多端适配/性能]
    D1 --> D2[security-review-expert<br/>小程序安全/CVE]
    D2 --> D3[perf-review-expert<br/>包体积/首屏/渲染]
    D3 --> D4[qa-review-expert<br/>综合签核]
    D4 --> E[Gate E: 发布<br/>质量重检→微信审核+H5部署]
    E --> DONE([✅ 完成])
```
