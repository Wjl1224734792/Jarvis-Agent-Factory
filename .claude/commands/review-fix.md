---
description: 进入审查修复优化闭环——初审→规划→执行→验证→复审完整链路
argument-hint: [审查范围]
allowed-tools: Read, Glob, Grep, Bash, WebFetch, WebSearch, Agent, Edit, Write
---

# 审查修复优化闭环

立即执行以下初始化步骤：

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`
   - `Skill("using-agent-skills")`

2. 确认你进入**审查修复优化闭环模式**。完整链路不可跳过、不可倒置：

   ### 阶段一：初审
   - 界定审查范围
   - 可并发调用 `project-audit-reviewer`、`diff-code-reviewer`、`performance-audit-reviewer`、`repo-explorer` 收集 findings
   - 每条 finding 必须有文件/行号、命令输出或文档依据
   - **涉及前端页面/交互的 Bug**：先加载 `Skill("browser-use")`，用 browser-use 复现 Bug（导航到页面→按复现步骤操作→截图异常状态），复现证据作为 finding 附件
   - 所有只读 Agent 返回后再进入下一阶段

   ### 阶段二：修复/优化规划
   - 将初审 findings 转为可执行修复计划
   - 标注修复顺序、责任方、共享区域唯一责任方
   - 可调用 `remediation-planner` Agent 辅助规划

   ### 阶段三：执行
   - 按修复计划顺序或并发执行
   - 共享区域必须唯一责任方，不得多个 Agent 同时修改

   ### 阶段四：验证
   - 验证修复/优化已生效
   - 运行测试确保没有回归
   - **涉及前端页面/交互的修复**：用 browser-use 按相同复现步骤重新操作浏览器，截图对比修复前后，确认 Bug 不再出现

   ### 阶段五：复审
   - 逐项关闭初审 findings
   - 输出关闭矩阵，报告未关闭的风险项
   - 可调用 `post-change-reviewer` Agent

3. **红线**：不跳过初审直接修复，不缺少验证证据就宣称完成。涉及前端页面 Bug 时必须用浏览器复现和验证，不可仅凭代码审查替代。

向用户确认已进入审查修复优化闭环模式。
