---
name: leadership-transition
description: 指导 PM 到 Director 再到 VP/CPO 的转型规划，提供角色适配诊断和入职指导。
argument-hint: "<当前角色、目标角色和转型场景>"
uses:
  - altitude-horizon-framework
  - director-readiness-advisor
  - vp-cpo-readiness-advisor
  - executive-onboarding-playbook
outputs:
  - 转型诊断
  - 角色就绪计划
  - 30-60-90 天领导力行动
---

# /leadership-transition

在准备或应对产品领导力跃升时使用。

## 调用方式

```text
/leadership-transition 高级 PM 正在向一家规模化 SaaS 公司的首个 Director 角色转型
```

## 工作流

1. 使用 `altitude-horizon-framework` 锚定领导力模型。
2. 使用 `director-readiness-advisor` 诊断当前就绪程度。
3. 对于高管转型，应用 `vp-cpo-readiness-advisor`。
4. 使用 `executive-onboarding-playbook` 构建执行计划。

## 检查点

- 识别转型摩擦实际发生的环节（范围、视野、系统、叙事）。
- 明确决策权和利益相关者的期望。
- 定义前 30-60-90 天的循证里程碑。

## 下一步

- 每季度重新运行以进行校准。
- 如果同时需要重新设定产品方向，配合 `/strategy` 使用。
