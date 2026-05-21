# `/bug-fix` — Bug 修复闭环

- **命令**：`/bug-fix [Bug 描述或截图]`
- **类别**：维护流程
- **说明**：Bug 修复闭环流程，从复现、定位根因到修复验证，支持浏览器截图辅助复现，确保修复后回归测试通过。

## 使用场景
| 场景 | 说明 |
|------|------|
| 功能 Bug 修复 | 某功能行为不符合预期，需要定位并修复 |
| UI 显示异常 | 页面渲染、布局、样式等问题，需截图辅助复现 |
| 接口返回错误 | API 返回数据异常或状态码错误 |
| 跨模块交互问题 | 多模块协作导致的边界 Bug |

## 关键 Agent
| Agent | 职责 |
|-------|------|
| code-explore-expert | 代码探索与根因定位 |
| frontend-dev-expert | 前端相关 Bug 修复实现（按需） |
| backend-dev-expert | 后端相关 Bug 修复实现（按需） |
| browser-test-expert | 浏览器端复现与修复验证 |

## 流程图

```mermaid
flowchart TD
    START([用户输入 /bug-fix]) --> S1[1. 复现 Bug<br/>agent-browser 截图收集]
    S1 --> S2[2. 定位根因<br/>code-explore-expert]
    S2 --> S3[3. spawn 实现 Agent<br/>frontend / backend]
    S3 --> S4[4. 修复代码]
    S4 --> S5[5. 验证修复<br/>agent-browser 复测]
    S5 --> |Bug 消失| S6[6. 回归测试<br/>现有测试套件]
    S6 --> S7[7. 提交修复]
    S7 --> DONE([✅ 修复完成])
    S5 --> |仍存在| S2
```
