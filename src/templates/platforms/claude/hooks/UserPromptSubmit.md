---
name: UserPromptSubmit
description: 用户输入钩子——检测命令路由关键词，自动触发对应流水线或技能
version: "4.3.9"
updated: "2026-05-24"
---

# UserPromptSubmit Hook — 命令路由检测

在用户提交提示词后执行，自动检测并路由到正确的流水线。

## 路由规则

| 关键词 | 路由目标 | 行为 |
|--------|---------|------|
| `/jarvis` / `/auto` | 全流程 / 自动路由 | 触发 pipeline_init + gate_sequence |
| `/frontend` | 前端开发 | pipeline_type=frontend |
| `/backend` | 后端开发 | pipeline_type=backend |
| `/hotfix` | 紧急热修复 | pipeline_type=hotfix |
| `/refactor` | 重构 | pipeline_type=refactor |
| `/release` / `/publish` | 发布 | pipeline_type=release |
| `/debug` | 调试诊断 | pipeline_type=debug |
| `/research` | 深度研究 | pipeline_type=research |
| `/ask` | 需求探询 | pipeline_type=ask |
| `/simplify` | 代码简化 | pipeline_type=simplify |
| `/trace` | 因果追踪 | pipeline_type=trace |
| `/improve` | 自主改进 | pipeline_type=improve |
| `/evaluate` | 技术评估 | pipeline_type=evaluate |
| `/migrate` | 框架迁移 | pipeline_type=migrate |

## 实现逻辑（伪代码）

```
1. 解析用户输入，提取命令名（/xxx）
2. 若匹配已知命令 → 不做拦截（由命令模板自身处理）
3. 若用户输入含"修复"/"bug"/"fix"但未指定命令 → 建议使用 /bug-fix
4. 若用户输入无命令但含任务描述 → 建议使用 /jarvis 或 /auto
```

## 红线
- 不自动执行（仅建议，需用户确认）
- 不覆盖用户明确指定的命令
- 不拦截引擎管理命令（/compact、/clear 等）
