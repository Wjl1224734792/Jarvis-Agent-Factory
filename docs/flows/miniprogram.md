# `/miniprogram` — 微信小程序原生开发生命周期

- **命令**：`/miniprogram [需求描述]`
- **类别**：框架开发
- **说明**：微信小程序原生开发完整生命周期，WXML + WXSS + WXS，C1.5 视觉验证强制。

## 使用场景
| 场景 | 说明 |
|------|------|
| 微信小程序开发 | 从零构建微信小程序，原生 WXML/WXSS/WXS |
| 现有小程序迭代 | 功能新增、Bug 修复、组件重构 |
| 小程序性能优化 | 包体积、首屏渲染、分包加载优化 |
| 微信 Open API 集成 | 支付、登录、分享等微信原生能力 |
| 小程序发布准备 | 微信审核 + 体验版管理 |

## 关键 Agent
| Agent | 职责 |
|-------|------|
| miniprogram-dev-expert | 小程序业务逻辑、架构实现 |
| miniprogram-ui-expert | WXML/WXSS 组件、WeUI 设计系统 |
| miniprogram-state-expert | 全局状态管理（MobX/Redux） |
| miniprogram-test-expert | miniprogram-automator 测试 |
| miniprogram-review-expert | 组件架构/性能/审核合规评审 |
| e2e-test-expert | miniprogram-automator 端到端测试 |
| security-review-expert | 小程序安全/CVE 安全审查 |
| perf-review-expert | 包体积/首屏/渲染性能分析 |
| qa-review-expert | 综合质量签核 |
| infra-deploy-expert | 微信审核 + CI/CD 发布 |

## 质量工具链
- **Lint**: eslint + wxlint
- **Build**: miniprogram-ci
- **Test**: miniprogram-automator + Jest
- **Preview**: 微信开发者工具

## 流程图

```mermaid
flowchart TD
    START([用户输入 /miniprogram]) --> A[Gate A: 需求澄清]
    A --> B[Gate B: 任务分解<br/>DDD→BDD→TDD]
    B --> B1[Gate B1: 架构评审<br/>条件性]
    B1 --> C[Gate C: 执行规划<br/>spawn planner]
    C --> CI[Gate C-impl: 并行实现]
    CI --> CI1[Batch 1: miniprogram-ui-expert<br/>miniprogram-state-expert]
    CI1 --> CI2[Batch 2: miniprogram-dev-expert]
    CI2 --> C1[Gate C1: Lint+Build<br/>eslint+miniprogram-ci]
    C1 --> C15[Gate C1.5: 视觉验证<br/>开发者工具截图+多机型]
    C15 --> C2[Gate C2: 测试]
    C2 --> C2A[miniprogram-test-expert<br/>miniprogram-automator]
    C2A --> C2B[e2e-test-expert<br/>miniprogram-automator]
    C2B --> D[Gate D: 评审]
    D --> D1[miniprogram-review-expert<br/>组件架构/性能/审核合规]
    D1 --> D2[security-review-expert<br/>小程序安全/CVE]
    D2 --> D3[perf-review-expert<br/>包体积/首屏/渲染]
    D3 --> D4[qa-review-expert<br/>综合签核]
    D4 --> E[Gate E: 发布<br/>质量重检→微信审核]
    E --> DONE([✅ 完成])
```
