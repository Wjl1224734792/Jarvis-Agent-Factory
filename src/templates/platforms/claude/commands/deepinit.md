---
description: 扫描项目全目录树，按实际架构层级动态生成渐进式 AGENTS.md + CLAUDE.md 引导入口
name: deepinit
argument-hint: "[--smart | --force | --incremental]"
model: light
effort: max
version: "1.1.0"
updated: "2026-05-22"
---

# DeepInit — 自适应分层文档初始化

扫描项目的**完整目录树**，按实际架构层级为每个目录动态生成 `AGENTS.md` 和同级 `CLAUDE.md` 引导文件。不是固定数量——项目有多少层源码目录，就生成多少份文档。

## 原则

- **自适应**：根据 `scanDirectory` 扫描的实际目录结构生成，N 层目录 → N 份 AGENTS.md + N 份 CLAUDE.md
- **不预设数量**：没有"生成 10 份"的限制。当前项目扫描到 71 个目录就生成 71 套文档，其他项目按各自目录数生成
- **MANUAL 保留**：重新生成时 `<!-- MANUAL:START -->` 到 `<!-- MANUAL:END -->` 之间的手动内容不被覆盖

## 执行

```bash
jarvis deepinit . --yes --smart
```

- `--smart`（默认）：深度读取源码文件，检测框架（React/Vue/Express/Hono/Prisma 等）和模块导出，生成场景化描述
- `--yes`：强制覆盖已生成的 AGENTS.md（手工编写的不会被覆盖——检测 `<!-- Generated:` 标记）
- `--incremental`：仅更新目录结构发生变化的目录
- `--parallel`：按层级分组并行生成

## 生成内容

每个目录产出两个文件：

**AGENTS.md** — 该目录的 AI 可读文档：
- `<!-- Generated: ISO时间戳 -->` 标记（用于区分自动生成 vs 手工编写）
- `<!-- Parent: 相对路径 -->` 层级引用
- Purpose / Key Files / Subdirectories / For AI Agents / Dependencies

**CLAUDE.md** — 极简 AI 入口，指向同目录 AGENTS.md：
```
# 目录名
> AI 入口 → [AGENTS.md](./AGENTS.md)
父级参考: [../AGENTS.md](../AGENTS.md)
```

## 层级示例

项目扫描到 3 层深度时：
```
src/           → src/AGENTS.md      + src/CLAUDE.md
src/cli/       → src/cli/AGENTS.md  + src/cli/CLAUDE.md
src/cli/utils/ → src/cli/utils/AGENTS.md + src/cli/utils/CLAUDE.md
```

每层 CLAUDE.md 引导 AI 先读同层 AGENTS.md，再通过 `<!-- Parent -->` 上溯完整文档链。
