<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-22 -->

# utils/

## Purpose
Shared CLI utility modules — argument parsing, I/O formatting, path resolution, and scope detection used by all CLI commands.

## Key Files

| File | Description |
|------|-------------|
| `args.ts` | CLI argument parsing — flag extraction, validation, defaults |
| `constants.ts` | CLI constants — version strings, default paths, platform identifiers |
| `io.ts` | I/O helpers — formatted output, error messages, progress indicators |
| `resolve.ts` | Path resolution — resolve project root, template paths, config locations |
| `scope.ts` | Scope detection — determine whether running in a project vs global context |

## For AI Agents

### Working In This Directory
- Utilities are stateless — pure functions only, no side effects
- Import from `./constants` for all magic strings and numbers
- I/O functions handle cross-platform path separators
- Scope detection supports monorepo and nested project layouts
