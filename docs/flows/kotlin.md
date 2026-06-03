# `/kotlin` — Android 原生开发生命周期

- **命令**：`/kotlin [需求描述]`
- **类别**：框架开发
- **说明**：Android 原生应用完整开发生命周期，Kotlin + Compose/Material3，C1.5 视觉验证强制。

## 使用场景
| 场景 | 说明 |
|------|------|
| 原生 Android 应用开发 | 从零构建 Android 应用，Kotlin + Jetpack Compose |
| 现有 Android 项目迭代 | 功能新增、Bug 修复、UI 重构 |
| Material3 设计规范实现 | Material You 动态主题、自适应布局 |
| Android 性能优化 | 启动速度、内存、包体积优化 |
| Google Play 发布准备 | 签名、审核、上架全流程 |

## 关键 Agent
| Agent | 职责 |
|-------|------|
| kotlin-dev-expert | Kotlin/Compose 业务逻辑、架构实现 |
| kotlin-ui-expert | Compose UI 组件、Material3 设计系统 |
| kotlin-state-expert | ViewModel/StateFlow 状态管理 |
| kotlin-test-expert | JUnit5 + MockK 单元测试 |
| kotlin-review-expert | Compose 架构/UI/状态/性能评审 |
| e2e-test-expert | Espresso + UIAutomator 端到端测试 |
| security-review-expert | OWASP Mobile Top 10 安全审查 |
| perf-review-expert | 启动/内存/包体积性能分析 |
| qa-review-expert | 综合质量签核 |
| infra-deploy-expert | CI/CD 与 Google Play 发布 |

## 质量工具链
- **Lint**: ./gradlew lint
- **Build**: ./gradlew assembleDebug
- **Test**: JUnit5 + MockK
- **Preview**: Compose Preview + Emulator

## 流程图

```mermaid
flowchart TD
    START([用户输入 /kotlin]) --> A[Gate A: 需求澄清<br/>探索→澄清→靶向探索]
    A --> B[Gate B: 任务分解<br/>DDD→BDD→TDD]
    B --> B1[Gate B1: 架构评审<br/>条件性]
    B1 --> C[Gate C: 执行规划<br/>spawn planner]
    C --> CI[Gate C-impl: 并行实现]
    CI --> CI1[Batch 1: kotlin-ui-expert<br/>kotlin-state-expert]
    CI1 --> CI2[Batch 2: kotlin-dev-expert]
    CI2 --> C1[Gate C1: Lint+Build<br/>./gradlew lint+assembleDebug]
    C1 --> C15[Gate C1.5: 视觉验证<br/>Emulator截图+多屏幕]
    C15 --> C2[Gate C2: 测试]
    C2 --> C2A[kotlin-test-expert<br/>JUnit5+MockK]
    C2A --> C2B[e2e-test-expert<br/>Espresso+UIAutomator]
    C2B --> D[Gate D: 评审]
    D --> D1[kotlin-review-expert<br/>Compose架构/UI/状态/性能]
    D1 --> D2[security-review-expert<br/>OWASP Mobile Top 10]
    D2 --> D3[perf-review-expert<br/>启动/内存/包体积]
    D3 --> D4[qa-review-expert<br/>综合签核]
    D4 --> E[Gate E: 发布<br/>质量重检→Google Play]
    E --> DONE([✅ 完成])
```
