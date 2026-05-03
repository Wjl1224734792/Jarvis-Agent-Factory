---
name: workflow-repair-loop-reference
description: "审查修复优化闭环参考：当用户明确要求'完整链路审查''审查修复优化复审''审查/修复/优化/复审'时触发。定义初审→规划→执行→验证→复审全链路流程。"
license: MIT
compatibility: Requires .codex/agents/ directory with review and repair sub-agent TOML files
---

# 审查修复优化闭环参考

## 概述

当用户明确要求"完整链路审查""审查修复优化复审""审查/修复/优化/复审"时，进入闭环模式。

**核心原则：** 先审查，再修复或优化，最后复审。此模式把项目审查、代码审查、问题修复、性能优化和最终复审串成一个闭环。

**红线：** 不跳过初审；不凭感觉优化；不在缺少验证证据时宣称完成；不让多个子智能体同时修改同一共享区域；禁止先修复后补审查报告；禁止未复审就宣称完成。

## 通用行为准则

1. **先思考，再编码** — 不假设。不隐藏困惑。主动暴露权衡。不确定时先问，多种解释时列出全部方案。
2. **简单优先** — 最小代码解决问题。不添加需求外功能，不为单点使用创建抽象，不为不可能场景做错误处理。
3. **精准修改** — 只动必须动的，遵循现有风格，每个改动行可追溯到用户请求。移除自身改动造成的孤儿代码。
4. **目标驱动执行** — 将任务转化为可验证目标。先写测试再使其通过。多步骤时陈述计划与验证点。

## 完整链路（按序执行，不可跳跃）

### 步骤 1：界定范围
确认目标、禁止范围、验收标准、是否允许性能优化、是否允许改测试/文档。**未明确范围前禁止启动初审。**

### 步骤 2：初审
读取 AGENTS.md、相关子路径约束、git diff、调用链、测试入口；列出 findings 和风险分级。

**并发执行：** 若有多个审查维度（项目结构 + 代码 diff + 性能），在一条消息中同时发起 `project_audit_reviewer`、`diff_code_reviewer`、`performance_audit_reviewer`；需要探索时可同步发起 `repo_explorer`。

**Gate：初审 findings 必须全部返回并汇总后，方可进入步骤 3。禁止在 findings 残缺时启动修复规划。**

### 步骤 3：分解任务
调度 `remediation_planner` 把 findings 分成：bug 修复、性能优化、测试补强、文档/配置同步、暂不处理。

**Gate：修复计划必须落盘确认后，方可进入步骤 4。**

### 步骤 4：执行修复/优化
按计划调度对应实现/修复代理；最小 diff；性能优化必须有基线。

**并发执行：** 无共享依赖的修复任务在一条消息中批量发起。

**Gate：所有修复任务交付后、验证通过前，禁止进入步骤 5。**

### 步骤 5：验证
运行与改动匹配的 lint/typecheck/test/build/手工验证。

**Gate：验证必须全部通过（或有明确豁免记录），方可进入步骤 6。**

### 步骤 6：复审
调度 `post_change_reviewer` 重新对照初审 findings 和验证结果。

**Gate：复审报告必须对照初审 findings 逐项关闭。未关闭项须记为残余风险。**

## 子代理调度策略

| 任务 | 调用的 agent |
|------|-------------|
| 项目级初审 | project_audit_reviewer |
| diff / PR / 代码初审 | diff_code_reviewer |
| 性能专项初审 | performance_audit_reviewer |
| 仓库结构探索 | repo_explorer |
| 外部文档/API | docs_researcher |
| 修复/优化计划 | remediation_planner |
| 前端 UI/样式 | frontend_ui_worker |
| 前端状态/数据/路由 | frontend_state_worker |
| 前端测试 | frontend_test_worker |
| 后端 API/路由 | backend_api_worker |
| 后端业务逻辑 | backend_service_worker |
| 后端数据/迁移 | backend_data_worker |
| 后端测试 | backend_test_worker |
| 通用修复/配置/文档/脚本 | remediation_worker |
| 变更后复审 | post_change_reviewer |

## 并发调度策略

### 并行时机

| 时机 | 并发调用组合 | 条件 |
|------|-------------|------|
| 步骤 2 初审 | `project_audit_reviewer` + `diff_code_reviewer` + `performance_audit_reviewer` | 三者互不依赖，可三重并行 |
| 步骤 2 + 探索 | 以上三个审查代理 + `repo_explorer` + `docs_researcher` | 探索结果可作为审查输入增强 |
| 步骤 4 执行 | 所有无共享依赖的修复任务对应代理 | 如 frontend_ui_worker 和 backend_data_worker 可并行 |

### 反例：不可并行

| 情形 | 原因 |
|------|------|
| `remediation_planner` → `remediation_worker` | worker 强依赖 plan |
| 两个代理修改同一共享文件 | 冲突风险 |

## 性能优化规则

- 先确定指标：响应时间、查询次数、渲染次数、bundle size、内存、CPU、吞吐或 I/O
- 先记录基线；没有基线时只能称为"性能风险修复"，不能称为"性能已提升"
- 优先修复可解释瓶颈：N+1、重复请求、无界查询、重复计算、过度渲染、缓存键错误、资源泄漏
- 优化后用相同场景复测；报告前后指标和残余风险

## 关闭矩阵

复审时，`post_change_reviewer` 必须输出：

```
| finding_id | severity | owner | status | evidence | residual_risk |
|---|---|---|---|---|---|
```

## 最终输出格式

```
## 初审发现
## 已修复/已优化
## 验证证据
## 复审结论
## 未处理风险
```

- 没有运行某项验证时，明确写"未运行"及原因。
- 不用"应该、看起来、理论上"替代证据。

## 常见错误

| 错误 | 正确做法 |
|------|---------|
| 直接修复，跳过初审 | 先形成 findings 和任务边界 |
| 性能优化无指标 | 先采集或定义可复现指标 |
| 子代理共享写同一区域 | 指定唯一责任方，串行处理 |
| 修完不复审 | 对照初审 findings 逐项关闭 |

## 红线

- 审查流程跳过步骤（尤其是初审和复审）
- 审查代理未全部返回就汇总 findings
- 修改了审查范围内的任何文件
- 找到问题后没有记录 findings 就直接修复
