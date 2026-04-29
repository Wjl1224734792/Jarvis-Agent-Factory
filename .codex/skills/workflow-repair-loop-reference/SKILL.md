---
name: workflow-repair-loop-reference
description: Reference-only review-fix-optimize workflow for the default Codex config. Do not require users to invoke this skill; use it as supporting process documentation when the config routes to the full review/fix/optimize loop.
---

# 审查修复优化参考链路

本目录是项目级 `.codex/config.toml` 的审查修复优化闭环参考资料。闭环模式由项目配置按用户意图路由，**不要求用户通过 skill 名称触发**。

## 核心原则

先审查，再修复或优化，最后复审。此参考流程用于用户明确要求完整链路时，把项目审查、代码审查、问题修复、性能优化和最终复审串成一个闭环。

**红线：** 不跳过初审；不凭感觉优化；不在缺少验证证据时宣称完成；不让多个子代理同时修改同一共享区域。

## 链路

1. **界定范围**：确认目标、禁止范围、验收标准、是否允许性能优化、是否允许改测试/文档。
2. **初审**：读取 `AGENTS.md`、`.codex/AGENTS.md`、相关子路径约束、`.codex/rules/` 子智能体必读规范、git diff、调用链、测试入口；列出 findings 和风险分级。
3. **分解任务**：把 findings 分成修复、优化、测试、文档四类；标出共享区域唯一责任方。
4. **执行修复/优化**：最小 diff；修复 bug 优先于优化；性能优化必须有基线指标或可复现瓶颈。
5. **验证**：运行与改动匹配的 lint/typecheck/test/build/手工验证/benchmark；只报告实际执行过的证据。
6. **复审**：重新对照初审 findings、用户目标和验证结果；未解决项进入 residual risk。

## 子代理策略

当当前环境允许 spawn，且用户显式调用本技能即表示允许完整链路分工时，可以使用子代理。子代理不得再 spawn。

默认并发：初审阶段的项目审查、diff 审查、性能审查、代码事实探索和外部文档查询可并发；修复/优化阶段按 `remediation_planner` 的 `parallel_batches` 同批 spawn；复审必须等待对应修复、验证和证据齐备。

主会话只按职责、路径边界、共享区域和证据需求分派；本技能不记录或选择底层运行参数。

### 链路并发批次

| 阶段 | 默认并发 | 必须等待 / 串行 |
|---|---|---|
| 初审 | 项目审查、diff 审查、性能审查、repo 探索、文档查询可同批并发 | 汇总 findings 前等待影响结论的审查结果 |
| 修复规划 | `remediation_planner` 消费初审 findings 并产出 `parallel_batches` | findings 未分类、共享区域责任方未定时不得执行修复 |
| 修复/优化 | 无依赖、不同文件域、无共享写入冲突的任务同批 spawn | 同一共享区域、同一文件、同一 finding 链路、TDD 步骤依赖必须串行 |
| 验证 | 独立 lint/typecheck/test/build/手工验证/benchmark 可并发收集证据 | 依赖某项修复结果的验证必须排在对应修复批次之后 |
| 复审 | `post_change_reviewer` 可消费并发验证证据 | 最终复审必须等待关键修复、验证和 residual risk 齐备 |

### 批次执行规则

- 初审批次：先一次性 spawn 所有独立只读审查代理，再等待整批 findings；不要边等边临时扩大范围。
- 修复计划：必须要求 `remediation_planner` 写清 task_id、责任方、allowed_paths、forbidden_paths、batch_peers、depends_on、serial_reason 和验证命令。
- 执行批次：同批 worker 必须知道自己不是独占工作区，只能改分配路径；发现共享区域冲突时停止并回编排者。
- 验证批次：只报告实际运行过的命令或手工步骤；并发验证结果必须归档到同一个证据汇总里。
- 复审批次：`post_change_reviewer` 或最终主会话复审要逐项关闭初审 findings；未关闭项进入 residual risk。
- 任何串行安排都必须写明真实阻塞原因，不能只写“按顺序执行”。

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
- 根 AGENTS.md
- .codex/AGENTS.md
- .codex/rules/TypeScript与Interface使用规范.md
- .codex/rules/团队协作规范.md
- .codex/rules/通用编程规范与指南.md
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
## 并发批次
## 已修复/已优化
## 验证证据
## 复审结论
## 未处理风险
```

如果没有运行某项验证，明确写“未运行”及原因。不要用“应该、看起来、理论上”替代证据。

`并发批次` 至少写明：
- initial_review_batches：初审代理、范围、证据状态
- remediation_batches：task_id、责任方、同批任务、串行原因
- verification_batches：命令/手工步骤、依赖的修复任务、结果
- review_waits_for：最终复审等待了哪些关键证据

## 常见错误

| 错误 | 正确做法 |
|---|---|
| 直接修复，跳过初审 | 先形成 findings 和任务边界 |
| 性能优化无指标 | 先采集或定义可复现指标 |
| 子代理共享写同一区域 | 指定唯一责任方，串行处理；无共享冲突的任务同批并发 |
| 只相信子代理报告 | 主会话检查 diff 和验证输出 |
| 修完不复审 | 对照初审 findings 逐项关闭 |
| 能并发的审查/验证被无理由串行 | 同批启动，只有真实依赖才等待 |

