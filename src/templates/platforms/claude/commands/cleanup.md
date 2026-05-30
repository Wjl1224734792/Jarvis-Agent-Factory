---
name: cleanup
description: 安全卸载/清理 Jarvis — 细粒度移除项目或全局的 Jarvis 配置和引擎数据，不误删用户自有文件
model: inherit
argument-hint: [--dry-run] [--engine] [--global] [--force]
tools: ["Read", "Bash", "Write", "Edit", "Skill", "Glob", "Grep", "mcp__jarvis-engine__session_join", "mcp__jarvis-engine__pipeline_guide", "mcp__jarvis-engine__gate_check", "mcp__jarvis-engine__advance_gate", "mcp__jarvis-engine__gate_enforce"]
---

# 安全清理 Jarvis

细粒度移除 Jarvis 安装的配置文件和引擎数据。基于安装时记录的 hash 精确匹配，**绝不误删用户自有文件**。

## 步骤 0：加载技能 + 注册引擎
```
Skill("behavioral-guidelines")
Skill("chinese-documentation")
```

**引擎会话注册**：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "lite", task_name: "清理: <清理目标>" })`
- `mcp__jarvis-engine__pipeline_guide()`

产物输出目录: `.jarvis/YYYY-MM-DD/cleanup/`

在开始清理前调用 `mcp__jarvis-engine__gate_check({ operation: "cleanup" })` 验证当前 Gate 条件。

## 步骤 1：确认清理范围

向用户确认要清理的范围：

| 选项 | 含义 | 危险等级 |
|------|------|---------|
| **默认**（仅配置） | 移除 agents/commands/skills 模板 + MCP 配置 + settings.json hooks | 🟢 安全 |
| `--engine` | 额外移除 `.jarvis/` 引擎数据（数据库、产物文档、归档） | 🟡 不可逆 |
| `--global` | 清理用户全局 `~/.claude/` 下的配置 | 🟡 影响所有项目 |

**安全保护**：
- 所有模板文件通过安装时 hash 精确匹配，只删 Jarvis 自己装的
- MCP 配置只移除 `jarvis-engine` 和 `playwright`，保留用户添加的其他 server
- settings.json 只移除 `_jarvisManagedHooks` 标记的 hook，保留用户自定义 hook
- 引擎数据（`.jarvis/`）只在显式传 `--engine` 时才删除

## 步骤 2：预览（建议先 dry-run）

```bash
# 查看当前项目会被移除的文件
jarvis remove claude --dry-run --list

# 查看全局会被移除的文件
jarvis remove claude --global --dry-run --list
```

如果用户不确定，**必须先 dry-run 预览再执行**。

## 步骤 3：执行清理

```bash
# 仅移除配置（安全）
jarvis remove claude

# 移除配置 + 引擎数据
jarvis remove claude --engine

# 移除全局配置
jarvis remove claude --global

# 移除全部（全局 + 引擎数据）
jarvis remove claude --global --engine --force
```

## 步骤 4：验证清理结果

```bash
jarvis doctor
```

确认清理后状态干净。

## 清理内容对照表

| 清理项 | 默认 | --engine | --global |
|--------|:--:|:--:|:--:|
| `.claude/agents/` 中 Jarvis 安装的模板 | ✅ | ✅ | 全局路径 |
| `.claude/commands/` 中 Jarvis 安装的模板 | ✅ | ✅ | 全局路径 |
| `.claude/skills/` 中 Jarvis 安装的模板 | ✅ | ✅ | 全局路径 |
| `.mcp.json` 中 jarvis-engine + playwright | ✅ | ✅ | 全局路径 |
| `settings.json` 中 Jarvis hooks | ✅ | ✅ | 全局路径 |
| `settings.json` 中 Jarvis env | ✅ | ✅ | 全局路径 |
| `.jarvis/engine.db` (SQLite 数据库) | ❌ | ✅ | 全局路径 |
| `.jarvis/YYYY-MM-DD/` (产物文档) | ❌ | ✅ | 全局路径 |
| `.jarvis/file-hashes.json` (安装记录) | ❌ | ✅ | 全局路径 |
| `.jarvis/priority-context.md` | ❌ | ✅ | 全局路径 |
| 用户自建 agents/commands/skills | ❌ | ❌ | ❌ |
| 用户添加的其他 MCP server | ❌ | ❌ | ❌ |

## 清理完成

清理完成后：
- `mcp__jarvis-engine__gate_enforce` — 验证清理完成条件
- 通过后 `mcp__jarvis-engine__advance_gate` — 推进到下一 Gate（或结束流水线）

## 红线
- **绝不删除用户自有文件** — 所有模板文件通过 hash 匹配，hash 不匹配的跳过
- **绝不主动删引擎数据** — 必须显式传 `--engine` 才处理 `.jarvis/`
- **dry-run 优先** — 不确定时先预览
- **不碰项目源码** — 只清理 `.jarvis/` 和 `.claude/` 中的 Jarvis 文件
- **不可逆操作需确认** — `--engine` 删除数据库后会话历史不可恢复
