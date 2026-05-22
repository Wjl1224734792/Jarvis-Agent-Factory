<!-- Parent: ../../../AGENTS.md -->
<!-- Generated: 2026-05-22 -->

# claude/ (platform templates)

## Purpose
Default Claude Code platform configuration — agent definitions (71), command files (40), skill templates (35), and platform settings shipped with every Jarvis installation.

## Key Files

| File | Description |
|------|-------------|
| `settings.json` | Default Claude Code MCP and hook configuration |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `agents/` | 71 agent definition files (`.md`) — one per agent with model/effort/tool defaults |
| `commands/` | 40 command files — one per pipeline entry point (bug-fix, release, refactor, etc.) |
| `skills/` | 35 skill templates in subdirectories — each with `SKILL.md` and optional `references/` |

## For AI Agents

### Working In This Directory
- Agent files follow the standard Jarvis agent template format
- Command files are the CLI-visible `/command-name` entries
- Skill directories each contain exactly one `SKILL.md` — the skill definition
- Changes to these templates require a package release to reach users

### Common Patterns
- Agent `.md` files have YAML frontmatter: `name`, `description`, `model`, `effort`, `tools`
- Skill `.md` files use the standard skill template with Purpose/Use_When/Steps sections
