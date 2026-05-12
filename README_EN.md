# Jarvis Agent Factory

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-v3.43.1-green)](https://github.com/Wjl1224734792/Jarvis-Agent-Factory/releases)
[![npm](https://img.shields.io/npm/v/jarvis-agent-factory)](https://www.npmjs.com/package/jarvis-agent-factory)
<br>[简体中文](./README.md) | **English**

Cross-platform multi-agent AI coding assistant config set + MCP orchestration engine. A complete **idea-to-delivery** software development pipeline. **Primary support for Claude Code**; OpenCode / Codex configs preserved but unmaintained.

> **v3.43.1** — Dashboard simplified: document reader replaces X6 canvas · Agent event dedup · Gate timing fix · Multi-platform init · ID collision fix (crypto.randomBytes)

## Quick Start

```bash
npm i -g jarvis-agent-factory   # Install CLI (zero native deps, node:sqlite built-in)
jarvis init -y                   # One-click deploy 3-platform config + MCP + hooks
# → Engine auto-starts on Claude Code restart, no manual launch needed
jarvis web                       # Start Web Panel (on-demand)
# → http://localhost:3456/dashboard
```

### Remote Panel (no local install)

Each Release includes a standalone HTML file you can download and open directly:

1. Open [GitHub Releases](https://github.com/Wjl1224734792/Jarvis-Agent-Factory/releases)
2. Download the latest `index.html` (~3.4MB, all JS/CSS inlined)
3. Double-click to open → auto-connects to `localhost:3456` engine

> Ensure `jarvis engine start` is running locally. The panel HTML communicates with the engine via HTTP.

## Key Features

| Feature | Description |
|---------|-------------|
| **MCP Orchestration Engine** | FSM hard-constraint Gate A→B→C→C1→C1.5→C2→D→E, skip/rollback rejected |
| **Zero Manual Launch** | MCP stdio auto-starts engine, Claude Code ready out of the box |
| **Lite Orchestration** | `/jarvis-lite` smart Gate mapping by task type, skips irrelevant gates |
| **Multi-pipeline Modes** | full / frontend / backend / lite |
| **Session Isolation** | Independent pipeline state per editor window |
| **Session Management** | Naming (MCP session_set_name) · Archive/Delete · Pin · Command labels |
| **Web Panel** | Hash routing (#/dashboard #/archive #/agents) · SSE real-time push · Document reader · Gate Timeline · Agent config |
| **Remote Panel** | Single HTML download, no local web build needed |
| **Agent Config** | Web panel model/effort changes → auto-sync to `.md` source files |
| **Browser Testing** | Doc-driven workflow: test-doc-writer → test-executor → fix-retest loop |
| **Smart Install** | Hash comparison, only overwrites changed files, user customizations preserved |
| **Hook/Plugin** | Claude Code hooks + MCP full coverage |
| **Platform Extensions** | `platform_info` MCP tool + `/api/platforms` REST endpoint |
| **Zero Native Deps** | Node 22.5+ with built-in `node:sqlite`, installs in seconds |

## Platform Status

| Platform | Status | Notes |
|----------|--------|-------|
| **Claude Code** | ✅ Maintained | Primary platform, all features/agents/skills actively iterated |
| **OpenCode** | ⛔ Stopped | Config files preserved but unmaintained, **not recommended** |
| **Codex** | ⛔ Stopped | Config files preserved but unmaintained, **not recommended** |

> **Important**: Only Claude Code is currently usable. OpenCode and Codex CLI commands and config files remain in the repo but receive no updates — using them may cause issues or incomplete configuration.

## Artifacts Directory

Pipeline stage outputs are stored by Gate in corresponding subdirectories:

```
docs/
├── tmp/                    # Temporary artifacts (screenshots, snapshots, etc., gitignored)
├── requirements/           # Gate A — Requirements documents
├── tasks/                  # Gate B — Task breakdown documents
├── architecture/           # Gate B1 — Architecture review outputs
├── plans/                  # Gate C — Execution plan documents
├── implementation/         # Gate C-impl — Implementation documents
├── testing/                # Gate C2 — Test documents & reports
├── review/                 # Gate D — Review reports
└── shipping/               # Gate E — Release records
```

Documents follow a `YYYY-MM-DD/` date-prefixed naming convention within each subdirectory.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Jarvis Engine (:3456)                  │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────────┐  │
│  │ MCP stdio│  │ REST API │  │   SQLite               │  │
│  │ auto-start│  │ /api/*   │  │   WAL · session-isolated│  │
│  └────┬────┘  └────┬─────┘  └────────────────────────┘  │
│       └────────────┼─────────────────────────────────────│
└─────────────────────┼─────────────────────────────────────┘
         ▲            │              ▲
    .mcp.json   jarvis web     .codex/config.toml
 Claude Code (:3457)          Codex
 (stdio auto-starts engine)
                               
    Web Panel (:3457) — standalone on-demand
    ┌───────────────────────────────┐
    │  Dashboard + Archive + Agents  │
    │  API proxy → Engine (:3456)   │
    └───────────────────────────────┘
```

## CLI Commands

```bash
jarvis [path]                             # Guided install (interactive global/project)
jarvis init [path] -y                     # Initialize project
jarvis add <claude|opencode|codex>        # Add platform
jarvis remove <platform> [path]           # Remove platform
jarvis upgrade [path]                     # Smart upgrade (only changed files)
jarvis diff [path]                        # Preview pending file updates
jarvis doctor [path]                      # Health check

jarvis hook gate-check [--session <id>]   # Check current Gate (exit 1 if blocked)
jarvis hook gate-advance [--session <id>] # Advance to next Gate
jarvis hook status [--json]               # Pipeline session status overview

jarvis engine start [--port=N]            # Start engine (stdio auto-starts in Claude Code)
jarvis engine stop / status               # Stop / Status
jarvis web [--port=N]                     # Start Web Panel (standalone, requires engine)

# Options: -g global  -y skip confirm  -v version  -h help
```

## Environment Variables

Engine and scripts configurable via environment (supports `.env` file):

```bash
# Create .env in project root
PORT=3456              # Engine port (default 3456)
WEB_PORT=3457          # Web Panel port (default 3457)
GITHUB_TOKEN=xxx       # GitHub personal access token (sync-github-releases)
```

## Lite Orchestration `/jarvis-lite`

Skips irrelevant gates, smart Gate mapping by task type:

| Task Type | Entry Gate | Examples |
|-----------|-----------|----------|
| Release/Deploy | Gate E | `npm publish`, server deploy |
| Bug Fix | Gate C | Small-scale fix, go straight to implementation |
| Code Review | Gate D | PR review, code audit |
| Docs/Config | Gate C | README, CI config |
| Small Feature | Gate A | Start from requirements |
| Refactor/Optimize | Gate C | Code refactor, perf optimization |

Usage: type `/jarvis-lite` in Claude Code.

## Web Panel

Start with `jarvis web` (requires `jarvis engine start` first), default port 3457.

| Page | Hash Route | Function |
|------|-----------|----------|
| Dashboard | `#/dashboard` | Session list · task name / command labels / Gate status · MCP platform status · pin/archive/delete · 3-dot menu |
| Archive | `#/archive` | Archived run records · search by task name · restore to dashboard · permanent delete |
| Agent Config | `#/agents` | MCP connection indicators · agent search/filter · model/effort config · file sync |

Sidebar shows real-time MCP connection status per platform (Claude Code / OpenCode / Codex): green = connected, gray = disconnected.

### Session Management

| Operation | Description |
|-----------|-------------|
| Set Name | MCP tool `session_set_name` → replaces session ID display |
| Pin | Pin active run to top of session list (📌 icon) |
| Archive | Move run to archive panel, hide from dashboard |
| Delete | Permanently delete run (requires confirmation, irreversible) |

Archived runs can be searched, restored, or permanently deleted from the Archive page.

## Browser Testing Workflow

```
test-doc-writer → test-executor → fix-retest
   (write cases)     (execute by doc)    (fail→fix→retest)
```

Document-driven closed loop for browser automation testing, integrated in Gate C2:

1. **test-doc-writer** — write structured test case documents (steps, expected results)
2. **test-executor** — execute tests strictly by document, produce pass/fail report
3. **fix-retest** — analyze failures, spawn fix agent, max 2 fix-retest rounds

## Lifecycle Pipeline

```
Idea Refine → Requirements → Task Design → Planning → Parallel Impl → Quality Gate → Visual Verify → Testing → Review → Release
  Gate 0        Gate A        Gate B       Gate C      Gate C        Gate C1      Gate C1.5   Gate C2   Gate D   Gate E
```

## Platform Entry Reference

> **Claude Code only**. OpenCode / Codex columns are historical reference only.

| Domain | Claude Code (✅ Available) | OpenCode (⛔ Unavailable) | Codex (⛔ Unavailable) |
|--------|---------------------------|--------------------------|------------------------|
| Full-stack | `/jarvis` | `--agent jarvis` | `jarvis` skill |
| Frontend | `/frontend` | `--agent frontend` | `frontend` skill |
| Backend | `/backend` | `--agent backend` | `backend` skill |
| Android | `/android` | `--agent android` | `android` skill |
| iOS | `/ios` | `--agent ios` | `ios` skill |
| Flutter | `/flutter` | `--agent flutter` | `flutter` skill |
| Expo | `/expo` | `--agent expo` | `expo` skill |
| Taro | `/taro` | `--agent taro` | `taro` skill |
| Review | `/review` | `--agent review-only` | `review-only` skill |
| Fix Loop | `/review-fix` | `--agent review-fix-optimize` | `review-fix-optimize` skill |
| Browser Test | `/browser-test` | spawn browser-test-worker | `browser-test` skill |
| Bug Fix | `/bug-fix` | spawn via orchestrator | `bug-fix` skill |
| Algorithm | `/algorithm-expert` | `--agent algorithm-expert` | `algorithm-expert` skill |
| Frontend Arch | `/frontend-architect` | `--agent frontend-architect` | `frontend-architect` skill |
| Backend Arch | `/backend-architect` | `--agent backend-architect` | `backend-architect` skill |

## Stats

| | Claude Code | OpenCode | Codex |
|---|:--:|:--:|:--:|
| Agents | 88 | 55 | 45 |
| Commands | 16 | 0 | 0 |
| Skills | 29 | 27 | 42 |
| Hooks | settings.json | native plugins (.ts) | hooks.json |
| MCP | `.mcp.json` | `opencode.json` | `.codex/config.toml` |

## Engine Capability Matrix

| Capability | Mechanism | Trigger |
|------------|-----------|---------|
| Post-spawn Gate check | Hook/Plugin → `gate_check` | 🔄 Auto (engine auto-start via stdio) |
| Condition unmet alert | Hook/Plugin → `gate_enforce` | 🔄 Auto |
| Advance Gate | `advance_gate` MCP tool | 👆 Orchestrator manual |
| Lite entry jump | `gate_jump` MCP tool (lite mode) | 👆 Orchestrator manual |
| Skip/rollback Gate reject | FSM hard constraint | 🔄 Auto |
| Pre-op Gate check | `gate_check` MCP tool | 🔄 Auto |
| Pipeline guide | `pipeline_guide` MCP tool | 👆 On-demand |
| Platform info | `platform_info` MCP tool | 👆 On-demand |
| Session naming | `session_set_name` MCP tool | 👆 On-demand |
| Pipeline status | Dashboard + SSE real-time push | 👆 On-demand |
| Session isolation | Per-session_id independent pipeline | 🔄 Auto |
| File sync | Web config → `.md`/`.toml` | 👆 On save |

## Release Process

**Dev → Test → Push main → Tag → GitHub Actions auto-release**

1. Dev + tests pass: `npm run check && npm run build && cd web && npm run build`
2. Bump `package.json` version (semantic versioning)
3. **Sync AGENTS.md / README.md / docs/README.md**
4. Commit + Tag: `git tag -a v<version> -m "v<version> - <summary>"`
5. Push to GitHub **with tag**: `git push origin main && git push origin v<version>`
6. GitHub Actions: Release workflow auto-executes (quality check → Changelog → GitHub Release + single HTML panel → npm publish)
7. Verify: `npm view jarvis-agent-factory version`

## License

MIT
