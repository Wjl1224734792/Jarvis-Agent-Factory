<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-22 -->

# commands/

## Purpose
CLI command implementations — each file exports a handler for one `jarvis <verb>` subcommand.

## Key Files

| File | Description |
|------|-------------|
| `add.ts` | `jarvis add` — scaffold Jarvis config into a project directory |
| `init.ts` | `jarvis init` — initialize a new project with Jarvis templates |
| `remove.ts` | `jarvis remove` — remove Jarvis config from a project |
| `deepinit.ts` | `jarvis deepinit` — generate AGENTS.md documentation across a codebase |
| `diff.ts` | `jarvis diff` — show differences between current and template state |
| `doctor.ts` | `jarvis doctor` — validate project configuration health |
| `engine.ts` | `jarvis engine` — start the MCP orchestration engine |
| `engine-restart.ts` | `jarvis engine-restart` — restart a running engine |
| `engine-status.ts` | `jarvis engine-status` — check engine health and uptime |
| `hook.ts` | `jarvis hook` — manage Claude Code hook configurations |
| `resolve.ts` | `jarvis resolve` — resolve agent/template paths and references |
| `upgrade.ts` | `jarvis upgrade` — upgrade Jarvis package to latest version |

## For AI Agents

### Working In This Directory
- Each command file exports a default function or handler
- Commands share utilities from `../utils/` (args, io, resolve, scope)
- New commands must be registered in the CLI dispatcher
- All commands receive parsed CLI arguments and the working directory
