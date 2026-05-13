---
name: write-prd
description: 通过串联问题框定、需求定义和用户故事脚手架，创建可决策的 PRD。
argument-hint: "<功能、举措或产品变更>"
uses:
  - prd-development
  - problem-statement
  - proto-persona
  - user-story
  - user-story-splitting
outputs:
  - 结构化的 PRD
  - 核心人物画像和需求
  - 初始的实现就绪用户故事
---

# /write-prd

生成一份 PRD，从战略平稳过渡到交付。

## 调用方式

```text
/write-prd 团队收件箱重新设计，以加速客服分流
```

## 工作流

1. 使用 `problem-statement` 定义问题上下文。
2. 使用 `proto-persona` 对齐用户假设。
3. 使用 `prd-development` 构建完整文档。
4. 使用 `user-story` 起草初始故事。
5. 使用 `user-story-splitting` 拆分较大的条目。

## 检查点

- 在编写需求之前验证范围边界。
- 保持成功标准可衡量并与成果指标挂钩。
- 确保在风险中至少指出一个反模式。

## 下一步

- 运行 `/plan-roadmap` 来排列交付顺序。
- 如果范围超出当前产能，运行 `/prioritize`。
