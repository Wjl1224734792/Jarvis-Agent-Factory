<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-22 -->

# scripts/

## Purpose
Build, release, and utility scripts for the Jarvis package lifecycle.

## Key Files

| File | Description |
|------|-------------|
| `copy-assets.js` | Copies template assets (agents, commands, skills, MCP configs) into the dist package during build |
| `release.sh` | Release automation — bump version, build, npm publish |
| `sync-github-releases.js` | Syncs GitHub release artifacts from CI workflows |

## For AI Agents

### Working In This Directory
- Scripts are Node.js (.js) or Bash (.sh)
- `copy-assets.js` is invoked by the root `npm run build` pipeline
- Do not hardcode local paths — use relative paths from project root
