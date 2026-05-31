---
description: 同步项目文档——检查并更新核心文档使其与代码一致，清理过时文件
name: sync
model: inherit
argument-hint: [--dry-run 预览模式] [--no-clean 跳过清理]
tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "Skill", "mcp__jarvis-engine__repowiki_add", "mcp__jarvis-engine__repowiki_ingest", "mcp__jarvis-engine__repowiki_query", "mcp__jarvis-engine__session_join", "mcp__jarvis-engine__pipeline_guide", "mcp__jarvis-engine__gate_check", "mcp__jarvis-engine__advance_gate", "mcp__jarvis-engine__gate_enforce", "mcp__jarvis-engine__report_status"]
---

# 同步项目文档

检查项目核心文档是否与代码现状一致，修复不一致处，清理过时文件。

## 步骤 0：加载技能 + 注册引擎

加载技能：
- `Skill("behavioral-guidelines")`
- `Skill("chinese-documentation")`
- `Skill("documentation-and-adrs")`

**引擎会话注册**（硬约束——引擎确保文档操作可追踪）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "full" })`
- 修改文档前调用 `mcp__jarvis-engine__gate_check({ operation: "write_doc" })`
- 完成后调用 `mcp__jarvis-engine__gate_enforce` 验证条件

首先了解项目当前实际情况（用于后续对比文档）：

1. **技术栈**：读取 `package.json`（scripts、dependencies）、`tsconfig.json`、框架配置文件
2. **项目结构**：列出主要源码目录（`src/`、`web/`、`app/` 等）和关键配置文件
3. **命令清单**：扫描 `.claude/commands/` 下所有 `.md` 文件，提取命令名和描述
4. **Git 信息**：获取当前分支、最近提交、远程地址

---

## 步骤 1：检查 CLAUDE.md

**CLAUDE.md** 是项目的 AI 指令文件。对比以下方面：

| 检查项 | 方法 |
|--------|------|
| 项目名称和简介 | 与 `package.json` 的 name/description 对比 |
| 常用命令 | 与 `package.json` scripts 对比 |
| 目录结构 | 与实际源码目录对比 |
| 技术栈 | 与 dependencies/devDependencies 对比 |
| 架构说明 | 与实际模块结构对比 |

**不一致时**：报告具体差异，修复 CLAUDE.md 中过时的内容。

**CLAUDE.md 不存在时**：基于项目现状自动生成初始版本。

---

## 步骤 2：检查 AGENTS.md

**AGENTS.md** 是 agent 协作约定。对比：

| 检查项 | 方法 |
|--------|------|
| Agent 列表 | 与 `.claude/agents/` 目录对比 |
| 命令引用 | 与 `.claude/commands/` 目录对比 |
| 约束/规范 | 与 `CLAUDE.md` 中的约束一致 |

---

## 步骤 3：检查 README.md

| 检查项 | 方法 |
|--------|------|
| 安装命令 | 从 `package.json` 推断正确的安装方式 |
| 使用说明 | 与 CLI 入口文件对比 |
| 版本徽章 | 与当前版本号一致 |

**README.md 是面向人类用户的门面文档**，修复时只修正**事实性错误**（错误命令、过时版本），不改变写作风格和叙述结构。

---

## 步骤 4：检查 CHANGELOG.md

| 检查项 | 方法 |
|--------|------|
| 版本条目 | 当前版本号应有对应条目 |
| 近期变更 | 与 `git log` 对比，确保最近变更已记录 |

**CHANGELOG.md 不存在时**：不自动创建（CHANGELOG 应由开发者手动维护）。

---

## 步骤 5：清理过时文件

扫描项目根目录和 `.claude/` 目录，标记并清理过时文件：

**可清理的类型**：
- `.claude/` 下不在模板中的孤立 `.md` 文件（用户确认后删除）
- 空目录
- IDE/编辑器临时文件（`.DS_Store`、`Thumbs.db`）
- 日志文件（`*.log`）超过 30 天

**绝不可触碰**：
- `dist/`、`build/`、`.next/` — 构建产物
- `node_modules/`、`.git/` — 依赖和版本控制
- `.jarvis/YYYY-MM-DD/` — 日期驱动的流水线产物
- 任何 `.env` 文件
- 用户明确标记为 keep 的文件

**清理策略**：列出待清理清单 → 用户确认 → 执行。`--dry-run` 只列出不执行。

---

## 步骤 6：同步报告

```
=== 文档同步报告 ===

【CLAUDE.md】
  ✓ 一致 / ~ 已修复 N 处不一致 / + 已创建
  修复项: （列出具体修改）

【AGENTS.md】
  ✓ 一致 / ~ 已修复 N 处不一致
  修复项: （列出具体修改）

【README.md】
  ✓ 一致 / ~ 已修复 N 处事实性错误
  修复项: （列出具体修改）

【CHANGELOG.md】
  ✓ 已记录最新版本 / ⚠ 缺少 vX.Y.Z 条目

【清理】
  待清理: N 个文件/目录
  已清理: N 个
  预览模式: 是 / 否
```

---

## 运行约束

- 所有文件操作使用绝对路径
- **文档对比必须实际读取文件内容**，不可凭记忆判断
- `--dry-run` 模式不执行任何写入或删除
- `--no-clean` 模式跳过清理步骤
- 对 README.md 只修正事实性错误，不改变写作风格
- 清理步骤需用户确认后才执行实际删除
- 路径使用 `/`（Unix 风格，跨平台）
- **修改文档前必须先确认需求与目标**，不可跳过确认直接写文档

## 红线

- 未经确认直接修改文档（必须先展示差异报告，用户确认后再写入）
- 清理构建产物（dist/、build/、.next/）——导致编译失败
- 修改 .env / node_modules / .git 下的任何文件
- 凭记忆判断文档内容而不实际读取文件
- 改变 README.md 的写作风格和叙述结构
- 清理 .jarvis/YYYY-MM-DD/ 日期目录下的流水线产物
- 自动创建 CHANGELOG.md（应由开发者手动维护）
