# `/react` — React Web 开发生命周期

- **命令**：`/react [需求描述]`
- **类别**：框架开发
- **说明**：React Web 应用完整开发生命周期，React 18+ + TypeScript，C1.5 视觉验证强制。

## 使用场景
| 场景 | 说明 |
|------|------|
| React SPA 开发 | 从零构建 React 单页应用 |
| 现有 React 项目迭代 | 功能新增、Bug 修复、组件重构 |
| React 组件库开发 | 高度可复用的 React 组件 |
| React 性能优化 | 渲染优化、bundle 分析、Lighthouse |
| 前端发布准备 | 构建优化 + CDN 部署 |

## 关键 Agent
| Agent | 职责 |
|-------|------|
| react-dev-expert | React 业务逻辑、架构实现 |
| react-ui-expert | React 组件、CSS/animation 设计 |
| react-state-expert | Redux/Zustand/Jotai 状态管理 |
| react-test-expert | Jest + RTL 组件测试 |
| react-review-expert | 组件架构/UI/状态/性能评审 |
| browser-test-expert | Playwright 浏览器交互测试 |
| e2e-test-expert | Playwright 端到端测试 |
| security-review-expert | OWASP Top 10 Web 安全审查 |
| perf-review-expert | Bundle/LCP/CLS 性能分析 |
| qa-review-expert | 综合质量签核 |
| infra-deploy-expert | CI/CD 前端部署 |

## 质量工具链
- **Lint**: eslint
- **Type-check**: tsc --noEmit
- **Build**: vite build / webpack
- **Test**: Jest + React Testing Library

## 流程图

```mermaid
flowchart TD
    START([用户输入 /react]) --> A[Gate A: 需求澄清<br/>探索→澄清→靶向探索]
    A --> B[Gate B: 任务分解<br/>DDD→BDD→TDD]
    B --> B1[Gate B1: 架构评审<br/>条件性]
    B1 --> C[Gate C: 执行规划<br/>spawn planner]
    C --> CI[Gate C-impl: 并行实现]
    CI --> CI1[Batch 1: react-ui-expert<br/>react-state-expert]
    CI1 --> CI2[Batch 2: react-dev-expert]
    CI2 --> C1[Gate C1: Lint+Type-check+Build<br/>eslint+tsc+vite build]
    C1 --> C15[Gate C1.5: 视觉验证<br/>多视口截图+响应式检查]
    C15 --> C2[Gate C2: 测试]
    C2 --> C2A[react-test-expert<br/>Jest+RTL]
    C2A --> C2B[browser-test-expert<br/>Playwright]
    C2B --> C2C[e2e-test-expert<br/>Playwright E2E]
    C2C --> D[Gate D: 评审]
    D --> D1[react-review-expert<br/>组件架构/UI/状态/性能]
    D1 --> D2[security-review-expert<br/>OWASP Top 10 Web]
    D2 --> D3[perf-review-expert<br/>Bundle/LCP/CLS]
    D3 --> D4[qa-review-expert<br/>综合签核]
    D4 --> E[Gate E: 发布<br/>质量重检→CDN部署]
    E --> DONE([✅ 完成])
```
