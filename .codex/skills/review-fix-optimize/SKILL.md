---
name: review-fix-optimize
description: 审查修复优化闭环——先审查 → 再修复/优化 → 最后复审。用户说"review-fix""审查修复""修复优化闭环""代码审查后修复"时加载此技能。流程步骤不可跳过、不可绕过、不可倒置。
---

# 审查修复优化闭环

先审查，再修复或优化，最后复审。把项目审查、代码审查、问题修复、性能优化和最终复审串成一个闭环。

## 红线

不跳过初审；不凭感觉优化；不在缺少验证证据时宣称完成；不让多个子代理同时修改同一共享区域；禁止先修复后补审查报告；禁止未复审就宣称完成。

## 完整链路（按序执行，不可跳跃）

### 步骤 1：界定范围

确认目标、禁止范围、验收标准、是否允许性能优化、是否允许改测试/文档。**未明确范围前禁止启动初审。**

### 步骤 2：初审（并发）

读取 AGENTS.md、相关子路径约束、git diff、调用链、测试入口。

在一条消息中并发 spawn 所有审查子代理：
- `project_audit_reviewer` — 项目结构、模块边界、配置、文档漂移
- `diff_code_reviewer` — 代码 diff、bug、回归、安全
- `performance_audit_reviewer` — N+1、重复渲染、缓存、资源泄漏
- `repo_explorer`（可选）— 代码库事实探索
- `docs_researcher`（可选）— 外部文档查询

**Gate：初审 findings 必须全部返回并汇总后，方可进入步骤 3。禁止在 findings 残缺时启动修复规划。**

### 步骤 3：分解任务

spawn `remediation_planner`，把 findings 分成：bug 修复、性能优化、测试补强、文档/配置同步。

**Gate：修复计划必须落盘确认后，方可进入步骤 4。**

### 步骤 4：执行修复/优化（并发）

按计划的 `parallel_batches` 批量 spawn 对应修复代理。无共享依赖的修复任务在同一条消息中批量发起。

| 任务类型 | spawn 的子 agent |
|---------|-----------------|
| 前端 UI/样式 | frontend_ui_worker |
| 前端状态/数据 | frontend_state_worker |
| 前端测试 | frontend_test_worker |
| 后端 API/路由 | backend_api_worker |
| 后端业务逻辑 | backend_service_worker |
| 后端数据/迁移 | backend_data_worker |
| 后端测试 | backend_test_worker |
| 通用修复/配置/文档 | remediation_worker |

最小 diff；性能优化必须先有基线。

**Gate：所有修复任务交付后、验证通过前，禁止进入步骤 6。**

### 步骤 5：验证

运行与改动匹配的 lint/type-check/test/build/手工验证。

**Gate：验证必须全部通过（或有明确豁免记录），方可进入步骤 6。**

### 步骤 6：复审

spawn `post_change_reviewer`，对照初审 findings 逐项检查修复 diff 和验证证据。

**Gate：复审报告必须对照初审 findings 逐项关闭。未关闭项须记为残余风险。**

## 输出

路径：`docs/review/YYYY-MM-DD-<topic>-rfo-report.md`

```markdown
## 初审发现
## 修复计划摘要
## 已修复/已优化
## 验证证据
## 复审结论（关闭矩阵）
## 未处理风险
## 推荐的下一步
```

## 性能优化规则

- 先确定指标：响应时间、查询次数、渲染次数、bundle size、内存、CPU、吞吐或 I/O
- 先记录基线；没有基线时只能称为"性能风险修复"，不能称为"性能已提升"
- 优先修复可解释瓶颈：N+1、重复请求、无界查询、重复计算、过度渲染、缓存键错误、资源泄漏
- 优化后用相同场景复测；报告前后指标和残余风险
