<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-22 -->

# templates/

## Purpose
Template system root — default agent definitions, command files, skill templates, MCP configurations, and memory scaffolds shipped with the Jarvis package.

## Key Files

| File | Description |
|------|-------------|
| `mcp-claude.json` | Default MCP server configuration for the Claude Code platform |
| `mcp-codex.toml` | Default MCP configuration for the OpenCodex platform |
| `mcp-opencode.json` | Default MCP configuration for the OpenCode platform |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `platforms/claude/` | Claude Code platform templates — agents, commands, skills, settings (see `platforms/claude/AGENTS.md`) |
| `deepinit/` | Deep init templates — AGENTS.md scaffolds for new projects |
| `memory/` | Memory templates — initial MEMORY.md and category scaffolds |

## For AI Agents

### Working In This Directory
- Template files are copied into user projects at `jarvis add` / `jarvis init` time
- Changes here become the new defaults for all users on next release
- MCP configs define which tools are exposed per platform
- Skill and agent templates drive the 71-agent / 35-skill ecosystem
