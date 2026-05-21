# Jarvis Agent Factory

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-v4.4.0-green)](https://github.com/Wjl1224734792/Jarvis-Agent-Factory/releases)
[![npm](https://img.shields.io/npm/v/jarvis-agent-factory)](https://www.npmjs.com/package/jarvis-agent-factory)
[![Visual Primitives MCP](https://img.shields.io/badge/DeepSeek-Visual%20Primitives%20MCP-purple)](https://github.com/Wjl1224734792/visual-primitives-mcp)
<br>**Pure-text model (e.g. DeepSeek) users** → Pair with [Visual Primitives MCP](https://github.com/Wjl1224734792/visual-primitives-mcp) for visual understanding
<br>[简体中文](./README.md) | **English**

An AI coding assistant configuration set + MCP orchestration engine. A complete **idea-to-delivery software development pipeline**. **Claude Code only**.

> **v4.4.0** — New /cancel command for pipeline run cancellation and session lifecycle management

## Quick Start

```bash
npm i -g jarvis-agent-factory   # Install CLI (zero native deps, node:sqlite built-in)
jarvis init -y                   # One-click deploy config + MCP + hooks
# → After Claude Code restart, engine auto-starts
jarvis web                       # Start Web panel (on demand)
# → http://localhost:3456/dashboard
```

### Remote Panel (no local install)

Each Release includes a standalone HTML file. Download and open directly:

1. Open [GitHub Releases](https://github.com/Wjl1224734792/Jarvis-Agent-Factory/releases)
2. Download the latest `index.html` (~3.4MB, all JS/CSS inlined)
3. Double-click to open → auto-connects to `localhost:3456`

> Requires `jarvis engine start` running locally. The panel communicates with the local engine via HTTP.

## Core Features

| Feature | Description |
|---------|-------------|
| **MCP Orchestration Engine** | FSM hard-constrained Gate A→B→C→C1→C1.5→C2→D→E, skip/rollback rejected |
| **Zero Manual Start** | MCP stdio auto-launches engine, Claude Code ready out-of-the-box |
| **Lightweight Orchestration** | `/jarvis-lite` intelligently maps Gate entry by task type |
| **Multi-pipeline Types** | full / frontend / backend / lite / refactor / hotfix / migrate / evaluate / debug — 9 modes |
| **Session Isolation** | Each editor window has independent pipeline state |
| **Session Management** | Session naming (MCP session_set_name) . Archive/delete . Pin . Command tags (/jarvis etc.) |
| **Web Panel** | Hash routing (#/dashboard #/archive #/agents) . SSE real-time push . Artifact doc reader . Gate Timeline . Agent config |
| **Remote Panel** | Single HTML file download, no local web build needed |
| **Agent Config** | Web panel model/thinking level changes auto-sync back to `.md` source files |
| **Browser Testing** | Doc-driven workflow: test-doc-writer → test-executor → fix-retest closed loop |
| **Smart Install** | Hash comparison only overwrites changed files, preserves user customizations |
| **Smart MCP Merge** | `jarvis upgrade` / `jarvis init` incrementally merges MCP config, preserves user custom services |
| **Hook/Plugin** | Claude Code hooks + MCP full coverage |
| **Platform Extension** | `platform_info` MCP tool + `/api/platforms` REST endpoint |
| **Zero Native Deps** | Node 22.5+ built-in `node:sqlite`, instant install |

## Platform Maintenance

| Platform | Status | Notes |
|----------|--------|-------|
| **Claude Code** | Maintained | Sole supported platform. All features, agents, skills actively developed |

## Artifact Directory

Pipeline artifacts are stored by Gate in corresponding subdirectories:

```
.jarvis/
├── tmp/                    # Temp artifacts (screenshots, snapshots, exported data — .gitignored)
├── requirements/           # Gate A — Requirements
├── tasks/                  # Gate B — Task breakdown
├── architecture/           # Gate B1 — Architecture review
├── plans/                  # Gate C — Execution plans
├── implementation/         # Gate C-impl — Implementation docs
├── testing/                # Gate C2 — Test docs & reports
├── review/                 # Gate D — Review reports
└── shipping/               # Gate E — Release records
```

| Directory | Gate | Description |
|-----------|------|-------------|
| `.jarvis/tmp/` | All | Process temp artifacts, not versioned |
| `.jarvis/requirements/` | Gate A | Requirement clarification |
| `.jarvis/tasks/` | Gate B | Task breakdown |
| `.jarvis/architecture/` | Gate B1 | Architecture review |
| `.jarvis/plans/` | Gate C | Execution plans |
| `.jarvis/implementation/` | Gate C-impl | Implementation docs |
| `.jarvis/testing/` | Gate C2 | Test cases & reports |
| `.jarvis/review/` | Gate D | Code review |
| `.jarvis/shipping/` | Gate E | Release records & changelog |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Jarvis Engine (:3456)                  │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────────┐  │
│  │ MCP stdio│  │ REST API │  │   SQLite               │  │
│  │ Auto-launch│ │ /api/*   │  │   WAL . Session isolation│  │
│  └────┬────┘  └────┬─────┘  └────────────────────────┘  │
│       └────────────┼─────────────────────────────────────│
└─────────────────────┼─────────────────────────────────────┘
         ▲            │
    .mcp.json   jarvis web
 Claude Code
 (stdio auto-launch engine)
```

## CLI Commands

```bash
jarvis [path]                             # Guided install (global or local)
jarvis init [path] -y                     # Initialize project
jarvis add claude                         # Add platform
jarvis remove claude [path]               # Remove platform
jarvis upgrade [path]                     # Smart upgrade (changed files only)
jarvis diff [path]                        # Preview pending updates
jarvis doctor [path]                      # Health check

jarvis hook gate-check [--session <id>]   # Check current Gate status (exit 1 if blocked)
jarvis hook gate-advance [--session <id>] # Advance to next Gate
jarvis hook status [--json]               # Pipeline session status

jarvis engine start [--port=N]            # Start orchestration engine (stdio auto-launch)
jarvis engine stop / status               # Stop / status
jarvis web [--port=N]                     # Start Web panel (independent, requires engine)

# Options: -g global install  -y skip confirm  -v version  -h help
```

## Environment Variables

Engine and scripts configured via env vars (supports `.env` file):

```bash
# Create .env file in project root
PORT=3456              # Engine port (default 3456)
WEB_PORT=3457          # Web panel port (default 3457)
GITHUB_TOKEN=xxx       # GitHub personal access token (for sync-github-releases)
```

## Lightweight Orchestration `/jarvis-lite`

Skips irrelevant Gates, intelligently maps to entry Gate:

| Task Type | Entry Gate | Example |
|-----------|-----------|---------|
| Release/Deploy | Gate E | `npm publish`, deploy |
| Bug Fix | Gate C | Small-scope fix |
| Code Review | Gate D | PR review, audit |
| Docs/Config | Gate C | README, CI config |
| Small Feature | Gate A | Start from requirement |
| Refactor | Gate C | Code refactor, optimization |
| Hotfix | Gate H0 | Emergency recovery |
| Framework Migration | Gate M1 | Version upgrade, dependency swap |
| Technical Evaluation | Gate E0 | Tech selection, comparison |
| Debug Diagnosis | Gate D0 | Anomaly investigation, root cause |

Usage: Type `/jarvis-lite` in Claude Code.

## Web Panel

Start with `jarvis web` (requires `jarvis engine start` running first). Default port 3457.

| Page | Hash Route | Features |
|------|-----------|----------|
| Dashboard | `#/dashboard` | Session list (task name/tag/Gate) . MCP platform status . Pin/archive/delete . 3-dot menu |
| Archive | `#/archive` | Archived records . Search by task name . Restore to dashboard . Permanent delete |
| Agents | `#/agents` | MCP connection guide . Agent search/filter . Model/thinking level config . File sync |

Sidebar shows Claude Code MCP connection status: green dot = connected, gray = disconnected.

### Session Operations

| Action | Description |
|--------|-------------|
| Set Name | MCP tool `session_set_name` → replaces session ID display |
| Pin | Pins active run to top of session list (pin icon) |
| Archive | Moves run to archive panel, hides from dashboard |
| Delete | Permanently deletes run record (requires confirmation) |

Archived records can be searched, restored, or permanently deleted in the Archive page.

## Browser Testing Workflow

```
test-doc-writer → test-executor → fix-retest
   (write cases)    (execute)      (fail→fix→retest)
```

Document-driven closed loop integrated in Gate C2:

1. **test-doc-writer** — Write structured test case docs (steps, expected results), no execution
2. **test-executor** — Execute tests strictly per docs, produce pass/fail report
3. **fix-retest** — Analyze failures, spawn fix agent, max 2 fix-retest rounds

## MCP Configuration Guide

### Jarvis Engine (required)

| Platform | Config File | Transport | Description |
|----------|------------|-----------|-------------|
| **Claude Code** | `.mcp.json` | `type: stdio` → auto-launches `jarvis engine start --stdio` |

### Visual Primitives MCP (recommended for text-only models)

[![npm](https://img.shields.io/npm/v/visual-primitives-mcp)](https://www.npmjs.com/package/visual-primitives-mcp)
[![GitHub](https://img.shields.io/badge/GitHub-Wjl1224734792%2Fvisual--primitives--mcp-black)](https://github.com/Wjl1224734792/visual-primitives-mcp)

Based on DeepSeek's "Thinking with Visual Primitives" paper. Converts screenshots/images into precise text descriptions and coordinate locations. **Strongly recommended for pure-text model users (DeepSeek etc.)** — it gives "eyes" to text-only models.

```json
{
  "mcpServers": {
    "visual-primitives": {
      "type": "stdio",
      "command": "npx",
      "args": ["visual-primitives-mcp"],
      "env": {
        "VISION_API_BASE_URL": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "VISION_API_KEY": "<your Bailian API Key>",
        "VISION_MODEL_NAME": "qwen3.5-plus",
        "VISION_MODEL_OCR": "qwen3-vl-ocr"
      }
    }
  }
}
```

### Dev Environment MCP

For developing Jarvis itself, point engine MCP to local workspace:

```json
{
  "mcpServers": {
    "jarvis-engine": {
      "type": "stdio",
      "command": "node",
      "args": ["bin/jarvis.js", "engine", "start", "--stdio"]
    }
  }
}
```

## Lifecycle Pipeline

```
Idea Refine → Requirements → Task Design → Architecture Review → Planning → Parallel Impl → Code Quality → Visual Verify → Testing → Review → Release
  Gate 0     Gate A          Gate B         Gate B1          Gate C     Gate C-impl  Gate C1       Gate C1.5   Gate C2  Gate D  Gate E
```

## Platform Entry Points (Claude Code)

| Domain | Claude Code |
|--------|------------|
| Full-stack | `/jarvis` |
| Frontend | `/frontend` |
| Backend | `/backend` |
| Android | `/android` |
| iOS | `/ios` |
| Flutter | `/flutter` |
| Expo | `/expo` |
| Taro | `/taro` |
| Review | `/audit` |
| Review+Fix | `/audit-fix` |
| Browser Test | `/browser-test` |
| Bug Fix | `/bug-fix` |
| Algorithm Expert | `/algorithm-expert` |
| Frontend Architect | `/frontend-architect` |
| Backend Architect | `/backend-architect` |
| **Testing** | |
| Unit Test | `/test-unit` |
| Integration Test | `/test-integration` |
| E2E Test | `/test-e2e` |
| Performance Test | `/test-perf` |
| Security Test | `/test-security` |
| **Engineering** | |
| Refactor Safety Net | `/refactor` |
| Emergency Hotfix | `/hotfix` |
| Framework Migration | `/migrate` |
| Technical Evaluation | `/evaluate` |
| Debug Diagnosis | `/debug` |

## Stats

| | Claude Code |
|---|:--:|
| Agents | 88 |
| Commands | 33 |
| Skills | 29 |
| Hooks | settings.json |
| MCP | `.mcp.json` |

## Engine Capability Matrix

| Capability | Mechanism | Trigger |
|-----------|-----------|---------|
| Agent spawn Gate check | Hook/Plugin → `gate_check` | Auto |
| Condition failure alert | Hook/Plugin → `gate_enforce` | Auto |
| Advance Gate | `advance_gate` MCP tool | Manual |
| Lite entry jump | `gate_jump` MCP tool (lite mode) | Manual |
| Skip/rollback Gate rejected | FSM hard constraint | Auto |
| Pre-op Gate check | `gate_check` MCP tool | Auto |
| Pipeline guide | `pipeline_guide` MCP tool | On demand |
| Platform info | `platform_info` MCP tool | On demand |
| Session naming | `session_set_name` MCP tool | On demand |
| Pipeline status | Dashboard + SSE real-time push | On demand |
| Session isolation | Per session_id independent pipeline | Auto |
| File sync | Web config → `.md`/`.toml` | On save |

## Release Process

**Dev → Test → Push main → Tag → GitHub Actions auto-release**

1. Local dev + tests pass: `npm run check && npm run build && cd web && npm run build`
2. Update `package.json` version (semver)
3. **Sync AGENTS.md / README.md / docs/README.md**
4. Commit + tag: `git tag -a v<version> -m "v<version> - <summary>"`
5. Push to GitHub **with tag**: `git push origin main && git push origin v<version>`
6. GitHub Actions: Release workflow auto-runs (quality check → Changelog → GitHub Release + single HTML panel → npm publish)
7. Verify: `npm view jarvis-agent-factory version`

> Ask yourself before each commit: Does documentation need updating?

## Command Flow Diagrams

Complete Mermaid flowcharts for each Claude Code command, showing Gate sequences, Agent spawn relationships, and parallel/serial logic:

| Category | Command | Flowchart | Gate Sequence |
|----------|---------|-----------|---------------|
| **Core** | `/jarvis` | [jarvis.md](docs/flows/jarvis.md) | A→B→B1→C→C-impl→C1→C1.5→C2→D→E (10 gates) |
| | `/jarvis-lite` | [jarvis-lite.md](docs/flows/jarvis-lite.md) | Smart entry mapping |
| **Frontend** | `/frontend` | [frontend.md](docs/flows/frontend.md) | A→B→B1→C→C-impl→C1→C1.5→C2→D→E (C1.5 mandatory) |
| **Backend** | `/backend` | [backend.md](docs/flows/backend.md) | A→B→B1→C→C-impl→C1→C2→D→E (skip C1.5) |
| **Mobile** | `/android` | [android.md](docs/flows/android.md) | A→B→C→C1→C2→D→E (7 gates) |
| | `/ios` | [ios.md](docs/flows/ios.md) | A→B→C→C1→C2→D→E (7 gates) |
| **Cross-platform** | `/flutter` | [flutter.md](docs/flows/flutter.md) | A→B→C→C1→C2→D→E (7 gates) |
| | `/expo` | [expo.md](docs/flows/expo.md) | A→B→C→C1→C2→D→E (7 gates) |
| | `/taro` | [taro.md](docs/flows/taro.md) | A→B→C→C1→C2→D→E (7 gates) |
| **Test/Fix** | `/browser-test` | [browser-test.md](docs/flows/browser-test.md) | Write cases → execute → fix-retest loop |
| | `/bug-fix` | [bug-fix.md](docs/flows/bug-fix.md) | Reproduce → root cause → fix → verify 7-step loop |
| **Review** | `/audit` | [audit.md](docs/flows/audit.md) | Read-only review |
| | `/audit-fix` | [audit-fix.md](docs/flows/audit-fix.md) | Audit → plan → execute → verify → re-review |
| **Architecture** | `/frontend-architect` | [frontend-architect.md](docs/flows/frontend-architect.md) | Collect questions → spawn architect → present |
| | `/backend-architect` | [backend-architect.md](docs/flows/backend-architect.md) | Collect questions → spawn architect → present |
| | `/algorithm-expert` | [algorithm-expert.md](docs/flows/algorithm-expert.md) | Collect questions → spawn expert → present |
| **Test Suite** | `/test-unit` | [test-unit.md](docs/flows/test-unit.md) | Detect framework → analyze code → Red → Green → Refactor |
| | `/test-integration` | [test-integration.md](docs/flows/test-integration.md) | Identify contract → start env → generate → run → cleanup |
| | `/test-e2e` | [test-e2e.md](docs/flows/test-e2e.md) | User stories → pick tool → write → run → report |
| | `/test-perf` | [test-perf.md](docs/flows/test-perf.md) | Define targets → pick tool → baseline → load test → find bottleneck |
| | `/test-security` | [test-security.md](docs/flows/test-security.md) | Authorize → spider → active scan → fix → report |
| **Engineering** | `/refactor` | [refactor.md](docs/flows/refactor.md) | R1 boundary → R2 baseline → R3 refactor → R4 drift detect → R5 report (5 gates) |
| | `/hotfix` | [hotfix.md](docs/flows/hotfix.md) | H0 declare → H1 fix → H2 verify → H3 audit (4 gates) |
| | `/migrate` | [migrate.md](docs/flows/migrate.md) | M1 rules → M2 migrate → M3 compile → M4 lint (4 gates) |
| | `/evaluate` | [evaluate.md](docs/flows/evaluate.md) | E0 criteria → E1 prototype → E2 metrics → E3 report (4 gates) |
| | `/debug` | [debug.md](docs/flows/debug.md) | D0 collect → D1 reproduce → D2 debug → D3 diagnose → D4 report (5 gates) |

> All flowcharts use `flowchart TD` unified style. Read under `docs/flows/` directory for Mermaid rendering.

## License

MIT
