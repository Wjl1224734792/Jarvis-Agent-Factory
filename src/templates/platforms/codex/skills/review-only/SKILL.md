---
name: review-only
description: 只读审查模式——审查项目结构、代码 diff、性能风险、架构边界，只报告 findings 不修改任何文件。用户说"只审查""review""审查一下"时加载此技能。
---

# 只读审查模式

只审查，不修改。用于项目审查、代码审查、PR/diff 审查、架构风险审查、性能风险审查的只读场景。

## 红线

- 不编辑文件，不格式化，不修复，不 stage，不 commit，不创建迁移，不改配置
- 禁止凭感觉或记忆下结论——每一条 finding 必须有文件路径、行号、命令输出或文档引用作为证据
- 审查步骤不可绕过、不可跳跃

## 启动检查（强制，不可跳过）

1. 明确审查对象：全仓、某个目录、某个分支差异、某个 PR、某类风险
2. 读取根 AGENTS.md，进入子目录时读取对应 AGENTS.md。**未读取 AGENTS.md 前禁止启动审查。**
3. 收集只读证据：git status、git diff、相关文件、调用链、测试入口、文档约束
4. 需要外部库/API 事实时，按需使用 docs-researcher
5. 不因发现问题而顺手修复；把修复建议写进报告
6. **审查结束后必须输出完整 findings 报告，包含「证据/文件:行号」字段**

## 审查维度与调度

| 场景 | spawn 的子 agent | 重点 |
|------|-----------------|------|
| 代码审查 | diff_code_reviewer | bug、回归、边界条件、并发/事务、安全、缺失测试 |
| 项目审查 | project_audit_reviewer | 模块边界、依赖方向、配置、脚本、文档漂移 |
| 性能风险审查 | performance_audit_reviewer | N+1、重复渲染、缓存失效、无界循环/查询、资源泄漏 |
| 代码库探索 | repo_explorer | 代码结构、调用链、风险边界事实输入 |
| 外部文档 | docs_researcher | 外部文档、API、库行为事实输入 |

**并发规则**：`project_audit_reviewer` + `diff_code_reviewer` + `performance_audit_reviewer` 三重并行；需要事实时可连 `repo_explorer` + `docs_researcher` 一起并发。所有审查代理返回后再汇总，不得边审边修。

## 输出

路径：`docs/review/YYYY-MM-DD-<topic>-full-review.md`

```markdown
## Findings
- [P1] 标题
  文件:路径:行号
  证据:
  影响:
  建议:

## Open Questions
## Residual Risk
## 推荐的下一步
```

没有发现问题时，明确写"未发现阻塞问题"，并列出未覆盖的验证范围。不要用"应该、看起来、理论上"替代证据。

## 常见错误

| 错误 | 正确做法 |
|------|---------|
| 审查中顺手修复 | 停下，只报告 |
| 只看最终文件不看 diff | 同时看 diff、调用链、约束文档 |
| 把风格偏好当缺陷 | 只报告可导致错误、风险或维护成本的问题 |
| 没证据就下结论 | 给文件/行号/命令/文档依据 |
