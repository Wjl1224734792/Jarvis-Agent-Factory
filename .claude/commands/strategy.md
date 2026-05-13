---
name: strategy
description: 从定位到机会再到路线图决策，构建产品战略。
argument-hint: "<产品、市场和战略问题>"
uses:
  - product-strategy-session
  - positioning-workshop
  - problem-statement
  - opportunity-solution-tree
  - roadmap-planning
outputs:
  - 战略叙述
  - 核心战略选择
  - 有序的路线图方向
---

# /strategy

运行端到端的战略工作流，产出决策级质量成果。

## 调用方式

```text
/strategy 面向中端市场电商品牌的 B2B 分析插件
```

## 工作流

1. 使用 `positioning-workshop` 厘清客户和品类。
2. 使用 `problem-statement` 锁定核心问题。
3. 通过 `opportunity-solution-tree` 扩展方案选项。
4. 使用 `product-strategy-session` 编排完整的战略流程。
5. 使用 `roadmap-planning` 排列承诺的优先级顺序。

## 检查点

- 将战略（选择）与执行待办清单分开。
- 明确指出显性权衡和非目标。
- 为每个战略赌注确认指标和先行指标。

## 下一步

- 为发布级排序运行 `/plan-roadmap`。
- 为最高优先级的举措运行 `/write-prd`。
