---
name: review-fix-optimize
description: Use only when the user explicitly invokes $review-fix-optimize, review-fix-optimize, “完整链路审查”, “审查修复优化复审”, or “审查/修复/优化/复审”; do not trigger for ordinary review, bugfix, or optimization requests unless this skill is named.
---

# 审查修复优化链路

## 核心原则

先审查，再修复或优化，最后复审。此技能用于用户明确要求完整链路时，把项目审查、代码审查、问题修复、性能优化和最终复审串成一个闭环。

**红线：** 不跳过初审；不凭感觉优化；不在缺少验证证据时宣称完成；不让多个子代理同时修改同一共享区域。

## 链路

1. **界定范围**：确认目标、禁止范围、验收标准、是否允许性能优化、是否允许改测试/文档。
2. **初审**：读取 `AGENTS.md`、相关子路径约束、git diff、调用链、测试入口；列出 findings 和风险分级。
3. **分解任务**：把 findings 分成修复、优化、测试、文档四类；标出共享区域唯一责任方。
4. **执行修复/优化**：最小 diff；修复 bug 优先于优化；性能优化必须有基线指标或可复现瓶颈。
5. **验证**：运行与改动匹配的 lint/typecheck/test/build/手工验证/benchmark；只报告实际执行过的证据。
6. **复审**：重新对照初审 findings、用户目标和验证结果；未解决项进入 residual risk。

## 子代理策略

当当前环境允许 spawn，且用户显式调用本技能即表示允许完整链路分工时，可以使用子代理。子代理不得再 spawn。

优先匹配已有代理：

| 任务 | 优先代理 |
|---|---|
| 项目级初审 | `project_audit_reviewer` |
| diff / PR / 代码初审 | `diff_code_reviewer` |
| 性能专项初审 | `performance_audit_reviewer` |
| 仓库结构/风险边界事实输入 | `repo_explorer` |
| 外部文档/API | `docs_researcher` |
| 修复/优化计划 | `remediation_planner` |
| 前端 UI/样式 | `frontend_ui_worker` |
| 前端状态/数据/路由 | `frontend_state_worker` |
| 前端测试 | `frontend_test_worker` |
| 后端 API/路由 | `backend_api_worker` |
| 后端业务逻辑 | `backend_service_worker` |
| 后端数据/迁移 | `backend_data_worker` |
| 后端测试 | `backend_test_worker` |
| 通用修复/配置/文档/脚本 | `remediation_worker` |
| 变更后复审 | `post_change_reviewer` |
| 需求追踪式最终评审 | `review_qa` |

没有合适代理时，编排者可以为本轮任务写一次性 worker 流程，但必须给出明确边界：

```md
你是一次性 worker。你不是编排者，不得 spawn。
本次目标：
只允许修改：
禁止修改：
必须读取：
完成标准：
验证命令：
如果发现范围冲突：停止并返回编排者。
```

## 性能优化规则

- 先确定指标：响应时间、查询次数、渲染次数、bundle size、内存、CPU、吞吐或 I/O。
- 先记录基线；没有基线时只能称为“性能风险修复”，不能称为“性能已提升”。
- 优先修复可解释瓶颈：N+1、重复请求、无界查询、重复计算、过度渲染、缓存键错误、资源泄漏。
- 优化后用相同场景复测；报告前后指标和残余风险。

## 输出要求

最终回复包含：

```md
## 初审发现
## 已修复/已优化
## 验证证据
## 复审结论
## 未处理风险
```

如果没有运行某项验证，明确写“未运行”及原因。不要用“应该、看起来、理论上”替代证据。

## 常见错误

| 错误 | 正确做法 |
|---|---|
| 直接修复，跳过初审 | 先形成 findings 和任务边界 |
| 性能优化无指标 | 先采集或定义可复现指标 |
| 子代理共享写同一区域 | 指定唯一责任方，串行处理 |
| 只相信子代理报告 | 主会话检查 diff 和验证输出 |
| 修完不复审 | 对照初审 findings 逐项关闭 |
