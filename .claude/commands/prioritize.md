---
name: prioritize
description: 使用适合你上下文优先级方法，选择下一步要推进的工作。
argument-hint: "<候选举措、约束条件和决策上下文>"
uses:
  - prioritization-advisor
  - feature-investment-advisor
  - acquisition-channel-advisor
  - finance-based-pricing-advisor
  - recommendation-canvas
outputs:
  - 排序后的选项
  - 决策依据
  - 显性权衡和后续行动
---

# /prioritize

以结合上下文感知的财务和战略严谨性来排定举措优先级。

## 调用方式

```text
/prioritize 面向激活、留存和定价实验的 Q2 待办清单
```

## 工作流

1. 使用 `prioritization-advisor` 选择合适的框架。
2. 使用 `feature-investment-advisor` 评估功能层面的回报。
3. 通过 `acquisition-channel-advisor` 考量渠道质量因素。
4. 使用 `finance-based-pricing-advisor` 评估定价影响。
5. 在 `recommendation-canvas` 中撰写最终建议。

## 检查点

- 区分可逆决策与不可逆决策。
- 识别可能颠覆排序结果的假设。
- 标明每个排序决策的置信度。

## 下一步

- 为高风险的赌注运行 `/discover`。
- 为已批准的举措运行 `/plan-roadmap`。
