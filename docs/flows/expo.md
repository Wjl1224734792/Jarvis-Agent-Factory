# `/expo` — Expo (React Native) 跨端开发生命周期

- **命令**：`/expo [需求描述]`
- **类别**：平台开发
- **说明**：Expo 生态下 React Native 跨端应用完整开发生命周期，EAS Build + OTA 热更新，零原生配置。

## 使用场景
| 场景 | 说明 |
|------|------|
| Expo 项目开发 | 基于 Expo SDK 的 React Native 应用开发 |
| 现有 Expo 项目迭代 | 功能新增、Bug 修复、组件重构 |
| EAS Build 云端构建 | 无需本地原生环境的云端打包 |
| OTA 热更新 | JavaScript Bundle 级别热修复 |
| 多平台发布准备 | EAS Submit 一键提交 App Store + Google Play |

## 关键 Agent
| Agent | 职责 |
|-------|------|
| expo-dev-expert | Expo SDK 业务逻辑、架构实现 |
| expo-ui-expert | RN 组件 + Expo UI 组件库 |
| expo-state-expert | 状态管理（Zustand/Jotai） |
| expo-test-expert | Jest + RNTL 组件测试 |
| expo-review-expert | RN 组件/Expo SDK/状态/性能评审 |
| e2e-test-expert | Detox/Maestro 端到端测试 |
| security-review-expert | expo-secure-store/OWASP 安全审查 |
| perf-review-expert | 启动/首屏/Bridge 通信性能分析 |
| qa-review-expert | 综合质量签核 |
| infra-deploy-expert | EAS Build + Submit 发布 |

## 流程图

```mermaid
flowchart TD
    START([用户输入 /expo]) --> A[Gate A: 需求澄清]
    A --> B[Gate B: 任务分解<br/>DDD→BDD→TDD]
    B --> B1[Gate B1: 架构评审<br/>条件性]
    B1 --> C[Gate C: 执行规划<br/>spawn planner]
    C --> CI[Gate C-impl: 并行实现]
    CI --> CI1[Batch 1: expo-ui-expert<br/>expo-state-expert]
    CI1 --> CI2[Batch 2: expo-dev-expert]
    CI2 --> C1[Gate C1: Lint+Build<br/>eslint+tsc+expo export]
    C1 --> C15[Gate C1.5: 视觉验证<br/>Expo Go截图+多平台+Safe Area]
    C15 --> C2[Gate C2: 测试]
    C2 --> C2A[expo-test-expert<br/>Jest+RNTL]
    C2A --> C2B[browser-test-expert<br/>Web端浏览器测试]
    C2B --> C2C[e2e-test-expert<br/>Detox/Maestro]
    C2C --> D[Gate D: 评审]
    D --> D1[expo-review-expert<br/>RN组件/Expo SDK/状态/性能]
    D1 --> D2[security-review-expert<br/>expo-secure-store/OWASP]
    D2 --> D3[perf-review-expert<br/>启动/首屏/Bridge通信]
    D3 --> D4[qa-review-expert<br/>综合签核]
    D4 --> E[Gate E: 发布<br/>质量重检→EAS Build+Submit]
    E --> DONE([✅ 完成])
```
