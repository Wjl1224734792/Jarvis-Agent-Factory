# `/release` — 版本发布流程

- **命令**：`/release [版本类型或描述]`
- **类别**：发布
- **说明**：执行完整的版本发布流程，包含环境检测、质量门禁、版本递增、发布执行与发布验证五阶段闭环。

## 使用场景

| 场景 | 说明 |
|------|------|
| 常规版本发布 | patch/minor/major 版本递增，含质量门禁与 npm publish |
| 热急发布 | 紧急修复后的快速 patch 发布，跳过非关键检查 |
| 首次发布 | 新包首次发布到 npm，含 registry 配置与权限验证 |
| 发布回滚 | 发布验证失败时，回退版本号与 Tag 并中止发布 |

## 关键 Agent

| Agent | 职责 |
|-------|------|
| `infra-deploy-expert` | 基础设施与部署操作，包括 Git 操作、npm publish 与 CI 触发 |
| `qa-review-expert` | 发布前质量审查，包括 Lint、Type-check、Build 与安全审计 |

## 流程图

```mermaid
flowchart TD
    START([用户输入 /release]) --> RL0[Gate RL0: 环境检测<br/>分支 + 包管理器 + 版本文件 + 测试命令]
    RL0 --> RL1[Gate RL1: 质量门<br/>Lint + Type-check + Build + Audit]
    RL1 --> |全部通过| RL2[Gate RL2: 版本递增<br/>patch / minor / major]
    RL1 --> |任一失败| FAIL([❌ 发布中止，修复后重试])
    RL2 --> RL3[Gate RL3: 发布执行<br/>Commit + Tag + Push + npm publish]
    RL3 --> RL4[Gate RL4: 发布验证<br/>Tag 存在 + CI 已触发 + Registry 已更新]
    RL4 --> DONE([✅ 发布完成])
    RL4 --> |验证失败| RL3
```
