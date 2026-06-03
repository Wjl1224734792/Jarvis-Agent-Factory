<!-- Generated: 2026-06-03 -->
<!-- Parent: ../AGENTS.md -->

# templates — Agent/Command/Skill 模板数据层

## Role
Jarvis 的"出厂默认配置"来源。存放 88 个 Agent 定义、40+ 个 Command 流水线、35+ 个 Skill 知识库、Hook 行为描述——全部为 Markdown + YAML frontmatter 模板文件。安装时由 `src/install.ts` 按 hash 增量同步到目标项目，升级时执行 section 级 Markdown 三路合并。

## Key Files
| File | Role | Description |
|------|------|-------------|
| `platforms/claude/agents/` | Agent 模板 | 88+ .md 文件，YAML frontmatter（name/description/tools/model/effort/color）+ system prompt body |
| `platforms/claude/commands/` | Command 模板 | 40+ .md 文件，完整的 Gate 编排指令 |
| `platforms/claude/skills/` | Skill 模板 | 35+ 子目录，每个含 SKILL.md + AGENTS.md + CLAUDE.md |
| `platforms/claude/hooks/` | Hook 参考 | 5 个 .md 描述 hook 行为和红线 |
| `platforms/claude/settings.json` | 基础设置 | permissions.allow 白名单 + env + hooks 基础模板 |
| `memory/` | 跨会话记忆模板 | 用户记忆文件模板，仅首次安装时创建 |

## For AI Agents
- 修改 Agent/Command: 编辑对应 .md 文件，重新安装后生效
- 新增 Skill: `skills/<name>/SKILL.md` + `AGENTS.md` + `CLAUDE.md`
- 三层配置: project > global > template，template 层只读
- 安装逻辑在 `src/install.ts`，注册表扫描在 `src/engine/agent-registry.ts`

<!-- MANUAL:START -->
<!-- MANUAL:END -->
