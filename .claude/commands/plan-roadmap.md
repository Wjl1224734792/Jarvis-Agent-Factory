---
name: plan-roadmap
description: 将战略和已验证的机会转化为有序的路线图，并明确权衡。
argument-hint: "<时间范围、目标和候选举措>"
uses:
  - roadmap-planning
  - epic-hypothesis
  - prioritization-advisor
  - user-story-mapping
  - epic-breakdown-advisor
outputs:
  - 优先级排序的路线图
  - Epic 假设
  - 发布切片和排序依据
---

# /plan-roadmap

创建一份反映战略、风险和交付现实的路线图。

## 调用方式

```text
/plan-roadmap 面向企业报表和权限的 Q3-Q4 计划
```

## 工作流

1. 使用 `roadmap-planning` 构建路线图上下文。
2. 将举措转化为 `epic-hypothesis` 陈述。
3. 通过 `prioritization-advisor` 选择正确的框架。
4. 使用 `user-story-mapping` 创建交付切片。
5. 使用 `epic-breakdown-advisor` 拆分过大的 Epic。

## 检查点

- 确保每个路线图条目都与明确的成果挂钩。
- 说明某些条目未被优先安排的原因。
- 捕获依赖关系和排序风险。

## 下一步

- 为路线图的顶层切片运行 `/write-prd`。
- 为高不确定性举措运行 `/discover`。
