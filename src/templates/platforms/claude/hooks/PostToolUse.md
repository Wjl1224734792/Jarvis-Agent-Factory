---
name: PostToolUse
description: 工具调用后钩子——自动记录产物文件路径到 artifacts 表，确保Web面板实时可见
version: "4.3.9"
updated: "2026-05-24"
---

# PostToolUse Hook — 产物自动记录

在每次工具调用后执行，自动追踪生成的文档产物。

## 自动追踪规则

| 工具 | 产物类型 | 记录条件 |
|------|---------|---------|
| Write / Edit (写 .md 文件) | 需求/任务/计划/架构/测试/审查文档 | 文件路径匹配 .jarvis/YYYY-MM-DD/**/*.md |
| Bash (npm build) | 构建产物 | 构建成功 → 记录 summary |
| Bash (npm test) | 测试报告 | 测试完成 → 记录结果 |

## 产物路径规范

仅记录符合日期目录结构的文件：
- 有效: `.jarvis/2026-05-24/requirements/REQ-001.md`
- 无效: `.jarvis/requirements.md`（扁平结构，不记录）

## 实现逻辑（伪代码）

```
1. 识别工具调用结果（Write/Edit 的文件路径）
2. 验证路径匹配日期目录模式: YYYY-MM-DD/{gateSubdir}/*.md
3. 若匹配 → 调用 engine insertArtifact(filepath, gate, runId)
4. 若不匹配 → 静默忽略（不报告错误）
5. 若为 Bash 测试/构建 → 记录到 working_memory（非 artifact）
```

## 红线
- 不记录非 .jarvis/ 路径下的文件
- 不记录非 .md 文件
- 记录失败不影响工具调用结果（静默失败）
