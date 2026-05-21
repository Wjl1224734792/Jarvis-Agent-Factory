<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# cli

## Purpose
Command-line interface for the `jarvis` binary. Parses arguments and dispatches to command handlers for install, init, upgrade, engine management, and documentation generation.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | CLI entry point — parses subcommands and routes to `commands/*` handlers |
| `commands/add.ts` | `jarvis add` — install platform config into a project |
| `commands/init.ts` | `jarvis init` — full project initialization (agents, skills, MCP config) |
| `commands/upgrade.ts` | `jarvis upgrade` — upgrade installed platforms to latest |
| `commands/remove.ts` | `jarvis remove` — uninstall platform config |
| `commands/diff.ts` | `jarvis diff` — diff installed files against templates |
| `commands/resolve.ts` | `jarvis resolve` — interactive 3-way merge for conflicts |
| `commands/engine.ts` | `jarvis engine [start|stop|restart|status]` — manage the MCP engine |
| `commands/engine-status.ts` | `engine status` — report PID, uptime, restart count |
| `commands/engine-restart.ts` | `engine restart` — stop then start with port wait |
| `commands/deepinit.ts` | `jarvis deepinit` — generate hierarchical AGENTS.md/CLAUDE.md |
| `commands/doctor.ts` | `jarvis doctor` — validate installation health |
| `commands/hook.ts` | `jarvis hook` — delegate hook commands |
| `utils/args.ts` | `CliOpts` interface and argument parser |
| `utils/constants.ts` | `PKG_ROOT`, `PLATFORMS`, `GLOBAL_ROOTS` constants |
| `utils/io.ts` | Terminal I/O: `confirm()`, `question()` prompts |
| `utils/resolve.ts` | Path resolution and semver comparison |
| `utils/scope.ts` | Interactive scope selection (global vs project) |

## For AI Agents

### Working In This Directory
- New commands must be registered in `index.ts` subcommand dispatch
- Use `utils/args.ts` for consistent argument parsing
- Use `utils/io.ts` for interactive prompts
- Keep command handlers focused — delegate logic to shared/engine modules

### Testing Requirements
- Add test in `tests/` with matching `.test.ts` filename
