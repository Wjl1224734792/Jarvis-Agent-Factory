# Docs — 项目文档目录

> 每次提交代码后检查本文件是否需要同步更新目录结构。

## 目录结构

```
docs/
  flows/              ← 指令模板文件（含 YAML frontmatter + 流程图 + 使用说明）
  reviews/            ← 历史审查报告存档
  README.md           ← 本文件
  CLAUDE.md           ← AI 入口（→ AGENTS.md）
  AGENTS.md           ← 目录清单（自动生成）
```

所有流水线产物文档已迁移到 `.jarvis/YYYY-MM-DD/` 目录（本地开发用，不提交仓库）。
指令模板（`docs/flows/`）是 `.jarvis/flows/` 纯流程图对应的完整命令版本。
