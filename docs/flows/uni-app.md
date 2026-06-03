# `/uni-app` — uni-app 跨端开发生命周期

- **命令**：`/uni-app [需求描述]`
- **类别**：框架开发
- **说明**：uni-app 跨端应用完整开发生命周期，Vue + uni-ui，一套代码覆盖微信/支付宝/H5/App 等多端。

## 使用场景
| 场景 | 说明 |
|------|------|
| uni-app 跨端开发 | 一套代码同时输出小程序 + H5 + App |
| 现有 uni-app 项目迭代 | 功能新增、Bug 修复、组件重构 |
| 多端适配 | 条件编译、平台差异化处理 |
| uni-app 性能优化 | 包体积、首屏渲染、分包加载优化 |
| 多平台发布准备 | 微信审核 + H5 部署 + App 打包 |

## 关键 Agent
| Agent | 职责 |
|-------|------|
| uniapp-dev-expert | uni-app 业务逻辑、多端架构实现 |
| uniapp-ui-expert | uni-ui 组件、多端样式适配 |
| uniapp-state-expert | Vuex/Pinia 状态管理 |
| uniapp-test-expert | Jest + uni-app 测试 |
| uniapp-review-expert | 组件架构/多端适配/性能评审 |
| e2e-test-expert | uni-app 自动化端到端测试 |
| security-review-expert | 小程序安全/CVE 安全审查 |
| perf-review-expert | 包体积/首屏/渲染性能分析 |
| qa-review-expert | 综合质量签核 |
| infra-deploy-expert | 微信审核 + H5 + App 发布 |

## 质量工具链
- **Lint**: eslint
- **Build**: uni-app build
- **Test**: Jest
- **Preview**: HBuilderX + 微信开发者工具

## 流程图

```mermaid
flowchart TD
    START([用户输入 /uni-app]) --> A[Gate A: 需求澄清<br/>探索→澄清→靶向探索]
    A --> B[Gate B: 任务分解<br/>DDD→BDD→TDD]
    B --> B1[Gate B1: 架构评审<br/>条件性]
    B1 --> C[Gate C: 执行规划<br/>spawn planner]
    C --> CI[Gate C-impl: 并行实现]
    CI --> CI1[Batch 1: uniapp-ui-expert<br/>uniapp-state-expert]
    CI1 --> CI2[Batch 2: uniapp-dev-expert]
    CI2 --> C1[Gate C1: Lint+Build<br/>eslint+uni-app build]
    C1 --> C15[Gate C1.5: 视觉验证<br/>H5截图+小程序截图+多端对比]
    C15 --> C2[Gate C2: 测试]
    C2 --> C2A[uniapp-test-expert<br/>Jest]
    C2A --> C2B[browser-test-expert<br/>H5端浏览器测试]
    C2B --> C2C[e2e-test-expert<br/>多端自动化]
    C2C --> D[Gate D: 评审]
    D --> D1[uniapp-review-expert<br/>组件架构/多端适配/性能]
    D1 --> D2[security-review-expert<br/>小程序安全/CVE]
    D2 --> D3[perf-review-expert<br/>包体积/首屏/渲染]
    D3 --> D4[qa-review-expert<br/>综合签核]
    D4 --> E[Gate E: 发布<br/>质量重检→微信审核+H5+App]
    E --> DONE([✅ 完成])
```
