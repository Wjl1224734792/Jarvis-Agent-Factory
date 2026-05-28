# Jarvis Agent Factory

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![npm](https://img.shields.io/npm/v/jarvis-agent-factory)](https://www.npmjs.com/package/jarvis-agent-factory)
[![Visual Primitives MCP](https://img.shields.io/badge/DeepSeek-Visual%20Primitives%20MCP-purple)](https://github.com/Wjl1224734792/visual-primitives-mcp)

**AI coding assistant configs + MCP orchestration engine** — complete idea-to-delivery software pipeline. **Claude Code only**.

<br>[简体中文](./README.md) | **English**

## Quick Start

**Lazy mode** — paste into Claude Code:

> Open https://github.com/Wjl1224734792/Jarvis-Agent-Factory and help me install Jarvis following QUICKSTART.md steps, then run jarvis init -y

**Manual install:**

```bash
npm i -g jarvis-agent-factory    # Install CLI (zero native deps)
jarvis init -y                    # One-click: configs + MCP + hooks
```

**Uninstall:**

```bash
jarvis remove claude --engine --force    # Project: configs + .jarvis/ engine data
jarvis remove claude -g --engine --force # Global: all Jarvis files in user home
```

📖 Full install guide → [QUICKSTART.md](./QUICKSTART.md)

## Core Features

| Feature | Description |
|------|------|
| **MCP Engine** | FSM hard-constrained Gate sequence, 15 pipeline types |
| **Zero Manual Start** | MCP stdio auto-launches engine |
| **Agent Teams** | Team + SubAgent hybrid orchestration |
| **Smart Router `/auto`** | Auto-detect task → route optimal pipeline |
| **Web Panel** | SSE real-time · session management · artifact preview · agent config |
| **Smart Install/Remove** | Hash-based incremental update; precise hash-matched removal |
| **Session Isolation** | Per-session pipeline state · cross-session memory |
| **Zero Native Deps** | Node 22.5+ built-in `node:sqlite` |

## Artifact Directory

```
.jarvis/YYYY-MM-DD/          ← Date-based dirs (engine requirement)
├── requirements/   Gate A
├── tasks/          Gate B
├── architecture/   Gate B1
├── plans/          Gate C
├── implementation/ Gate C-impl
├── testing/        Gate C2
├── review/         Gate D
└── shipping/       Gate E
```

## Quick Command Reference

| Domain | Command | | Domain | Command |
|--------|---------|-|--------|---------|
| Smart Route | `/auto` | | Research | `/research` |
| Full-stack | `/jarvis` | | Bug Fix | `/bug-fix` |
| Frontend | `/frontend` | | Refactor | `/refactor` |
| Backend | `/backend` | | Hotfix | `/hotfix` |
| Review | `/audit` | | Debug | `/debug` |
| Simplify | `/simplify` | | Release | `/release` |
| Cleanup | `/cleanup` | | Publish | `/publish` |

## Pipeline Types

`full` `frontend` `backend` `lite` `refactor` `hotfix` `migrate` `evaluate` `debug` `research` `release` `ask` `simplify` `trace` `improve` — 15 total

## Stats

| | Claude Code |
|---|:--:|
| Agents | 72 |
| Commands | 35 |
| Skills | 35 |
| CLI Commands | 10 (`init` `add` `remove` `upgrade` `diff` `engine` `web` `hook` `doctor` `resolve`) |
| Pipelines | 15 |

## Engine Capabilities

| Capability | Mechanism | Trigger |
|-----------|-----------|---------|
| Gate enforcement | FSM · `gate_check` · `gate_enforce` | Auto |
| Advance gate | `advance_gate` | Manual |
| Lite jump | `gate_jump` (lite/ask/improve) | Manual |
| Pipeline guide | `pipeline_guide` | On demand |
| Session naming | `session_set_name` | On demand |
| Web real-time | Dashboard + SSE | On demand |

## Release Process

```
Quality gate(Lint+Test+Build) → Bump version → Sync docs → Commit+Tag → Push → GitHub Actions auto-release(npm)
```

## Command Flowcharts

Mermaid flowcharts per command (Gate sequence + Agent spawns) in `docs/flows/`:

| Category | Command | Chart | Gates |
|----------|---------|-------|-------|
| Core | `/jarvis` | [jarvis.md](docs/flows/jarvis.md) | 10 gates |
| | `/auto` | [auto.md](docs/flows/auto.md) | Smart routing |
| Frontend | `/frontend` | [frontend.md](docs/flows/frontend.md) | C1.5 mandatory |
| Backend | `/backend` | [backend.md](docs/flows/backend.md) | Skip C1.5 |
| Review | `/review-only` | [review-only.md](docs/flows/review-only.md) | Read-only |
| Bug | `/bug-fix` | [bug-fix.md](docs/flows/bug-fix.md) | 7-step loop |
| Engineering | `/refactor` | [refactor.md](docs/flows/refactor.md) | R1-R5 |
| | `/hotfix` | [hotfix.md](docs/flows/hotfix.md) | H0-H3 |
| | `/migrate` | [migrate.md](docs/flows/migrate.md) | M1-M4 |
| | `/evaluate` | [evaluate.md](docs/flows/evaluate.md) | E0-E3 |
| | `/debug` | [debug.md](docs/flows/debug.md) | D0-D4 |
| | `/research` | [research.md](docs/flows/research.md) | RS0-RS4 |
| | `/release` | [release.md](docs/flows/release.md) | RL0-RL4 |
| | `/ask` | [ask.md](docs/flows/ask.md) | K0-K3 |
| | `/simplify` | [simplify.md](docs/flows/simplify.md) | S0-S3 |
| | `/trace` | [trace.md](docs/flows/trace.md) | T0-T4 |
| | `/improve` | [improve.md](docs/flows/improve.md) | IM0-IM4 |
| Session | `/cleanup` | [cleanup.md](docs/flows/cleanup.md) | Safe removal |
| Testing | `/test-unit` `/test-integration` `/test-e2e` `/test-perf` `/test-security` | — | Various |
| Mobile | `/android` `/ios` `/flutter` `/expo` `/taro` `/react-native` | — | A→E |

## License

MIT
