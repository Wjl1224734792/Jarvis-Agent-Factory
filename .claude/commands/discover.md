---
name: discover
description: 运行结构化的发现流程，从问题框定到机会映射再到验证规划。
argument-hint: "<问题、机会或功能领域>"
uses:
  - discovery-process
  - problem-framing-canvas
  - discovery-interview-prep
  - opportunity-solution-tree
  - pol-probe-advisor
outputs:
  - 发现计划
  - 优先级排序的假设
  - 验证实验待办清单
---

# /discover

运行完整的发现循环，无需手动拼合各个技能。

## 调用方式

```text
/discover 降低新 SMB 用户的引导流失率
```

## 工作流

1. 使用 `problem-framing-canvas` 框定问题。
2. 使用 `discovery-interview-prep` 规划访谈和证据收集。
3. 使用 `opportunity-solution-tree` 映射机会和方案。
4. 使用 `pol-probe-advisor` 选择验证探测方法。
5. 使用 `discovery-process` 综合形成具体执行计划。

## 检查点

- 在开始解决方案之前，确认目标用户和业务成果。
- 按风险优先排序前 2-3 个假设。
- 在投入工程资源之前先选择快速实验。

## 下一步

- 为最有希望的已验证解决方案运行 `/write-prd`。
- 当多个解决路径通过验证时，运行 `/prioritize`。
