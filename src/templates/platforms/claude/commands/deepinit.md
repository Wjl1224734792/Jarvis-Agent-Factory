---
description: 生成按架构层级的渐进式 AGENTS.md 文档树，同级同步生成 CLAUDE.md 引导入口
name: deepinit
argument-hint: "[--full | --smart | --incremental]"
model: haiku
effort: low
version: "1.0.0"
updated: "2026-05-22"
---

# DeepInit — 分层文档初始化

为项目生成按目录架构层级组织的 `AGENTS.md` 文档树。每个目录获得一份 `AGENTS.md`（描述该目录的用途、关键文件、子目录、AI 使用指南），并同步生成同级 `CLAUDE.md` 引导文件指向 `AGENTS.md`。

## 执行

调用 Jarvis CLI 的 deepinit 引擎：

```bash
jarvis deepinit . {{mode}}
```

- `--smart`（默认）：深度分析源码文件，检测框架和模块导出，生成精确描述
- `--full`：完全重新生成，忽略已有文档
- `--incremental`：仅更新发生变化的目录，保留手动编辑部分
- `--parallel`：按层级并行生成，加快速度

## 文档结构

每个生成的 `AGENTS.md` 包含：
- **Purpose** — 目录用途说明
- **Key Files** — 关键文件及描述
- **Subdirectories** — 子目录链接表（含子级 AGENTS.md 链接）
- **For AI Agents** — 该目录下工作的 AI 使用指南
- **Dependencies** — 内部依赖和外部包依赖
- **MANUAL 保留区** — `<!-- MANUAL:START -->` / `<!-- MANUAL:END -->` 之间的手动编辑内容在重新生成时保留

## 非目录文件

本命令仅处理目录级 `AGENTS.md` 和 `CLAUDE.md` 引导文件，不创建或修改任何业务代码。
