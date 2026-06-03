# `/flutter` — Flutter 跨端开发生命周期

- **命令**：`/flutter [需求描述]`
- **类别**：平台开发
- **说明**：Flutter 跨端应用完整开发生命周期，Dart + Widget 体系，一套代码覆盖 iOS/Android/Web/Desktop。

## 使用场景
| 场景 | 说明 |
|------|------|
| 跨端应用开发 | 一套代码同时覆盖 iOS、Android、Web、Desktop |
| 现有 Flutter 项目迭代 | 功能新增、Bug 修复、Widget 重构 |
| 自定义 UI 组件开发 | 高度定制化的 Widget、动画、手势 |
| Flutter 性能优化 | 启动速度、jank 消除、包体积优化 |
| 多平台发布准备 | App Store + Google Play + Web 一键发布 |

## 关键 Agent
| Agent | 职责 |
|-------|------|
| flutter-dev-expert | Dart 业务逻辑、架构实现 |
| flutter-ui-expert | Widget 体系、Material/Cupertino 设计 |
| flutter-state-expert | Riverpod/Bloc 状态管理 |
| flutter-test-expert | flutter test + WidgetTester 测试 |
| flutter-review-expert | Widget 架构/UI/状态/跨端评审 |
| e2e-test-expert | integration_test 端到端测试 |
| security-review-expert | OWASP Mobile Top 10 安全审查 |
| perf-review-expert | 启动/jank/包体积性能分析 |
| qa-review-expert | 综合质量签核 |
| infra-deploy-expert | CI/CD 与多平台发布 |

## 流程图

```mermaid
flowchart TD
    START([用户输入 /flutter]) --> A[Gate A: 需求澄清<br/>探索→澄清→靶向探索]
    A --> B[Gate B: 任务分解<br/>DDD→BDD→TDD]
    B --> B1[Gate B1: 架构评审<br/>条件性]
    B1 --> C[Gate C: 执行规划<br/>spawn planner]
    C --> CI[Gate C-impl: 并行实现]
    CI --> CI1[Batch 1: flutter-ui-expert<br/>flutter-state-expert]
    CI1 --> CI2[Batch 2: flutter-dev-expert]
    CI2 --> C1[Gate C1: Lint+Build<br/>flutter analyze+build]
    C1 --> C15[Gate C1.5: 视觉验证<br/>模拟器截图+多平台]
    C15 --> C2[Gate C2: 测试]
    C2 --> C2A[flutter-test-expert<br/>flutter test+WidgetTester]
    C2A --> C2B[browser-test-expert<br/>Web端浏览器测试]
    C2B --> C2C[e2e-test-expert<br/>integration_test]
    C2C --> D[Gate D: 评审]
    D --> D1[flutter-review-expert<br/>Widget架构/UI/状态/跨端]
    D1 --> D2[security-review-expert<br/>OWASP Mobile Top 10]
    D2 --> D3[perf-review-expert<br/>启动/jank/包体积]
    D3 --> D4[qa-review-expert<br/>综合签核]
    D4 --> E[Gate E: 发布<br/>质量重检→App Store+Play+Web]
    E --> DONE([✅ 完成])
```
