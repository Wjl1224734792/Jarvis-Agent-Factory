# `/react-native` — React Native 跨端开发生命周期

- **命令**：`/react-native [需求描述]`
- **类别**：平台开发
- **说明**：React Native 跨端应用完整开发生命周期，JSX + Native Modules，一套代码覆盖 iOS + Android。

## 使用场景
| 场景 | 说明 |
|------|------|
| React Native 应用开发 | 从零构建跨端移动应用 |
| 现有 RN 项目迭代 | 功能新增、Bug 修复、组件重构 |
| 原生模块桥接 | Native Module / Turbo Module 集成 |
| RN 性能优化 | 启动速度、首屏、Bridge 通信、包体积优化 |
| 多平台发布准备 | Fastlane + App Store + Google Play |

## 关键 Agent
| Agent | 职责 |
|-------|------|
| react-native-dev-expert | RN 业务逻辑、架构实现 |
| react-native-ui-expert | RN 组件、跨端 UI 适配 |
| react-native-state-expert | 状态管理（Redux/Zustand） |
| react-native-test-expert | Jest + RNTL 组件测试 |
| react-native-review-expert | 组件架构/UI/状态/原生桥接评审 |
| e2e-test-expert | Detox/Maestro 端到端测试 |
| security-review-expert | OWASP Mobile Top 10 安全审查 |
| perf-review-expert | 启动/首屏/Bridge/包体积性能分析 |
| qa-review-expert | 综合质量签核 |
| infra-deploy-expert | Fastlane + App Store + Play 发布 |

## 流程图

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
