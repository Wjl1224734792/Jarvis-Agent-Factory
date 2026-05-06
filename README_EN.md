# Jarvis Agent Factory

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-v2.0.1-green)](https://gitee.com/wujl1124/JarvisAgentFactory/releases)
<br>[简体中文](./README.md) | **English**

A cross-platform multi-agent AI coding assistant configuration set defining a complete **idea-to-delivery software development pipeline**. Runs on Claude Code, OpenCode, and Codex with a unified workflow specification and shared skill system.

> **v2.0.1** — Claude Code 47 agents + 15 commands / OpenCode 55 agents (agent-switching only) / Codex 45 agents + 42 skills (skill-triggered)

## Core Concepts

**Jarvis** — the single orchestration hub. Talks directly to the user and dispatches sub-agents. Sub-agents have single responsibility, cannot recursively spawn, and all phases must pass their corresponding Gate before advancing.

### Pipeline

```
Idea Refine → Requirements → Task Design → Planning → Parallel Impl → Code Quality → Visual Verify → Testing → Review → Release
     │             │            │           │              │              │             │         │        │         │
   Phase 0       Gate A       Gate B     Gate C        Gate C1       Gate C1.5    Gate C2   Gate D    Gate E
```

### Resilience

| Dimension | Strategy |
|-----------|----------|
| **Agent Retry** | 4 failure types × differentiated retries, max 3 attempts |
| **Batch Partial Failure** | Keep successful artifacts, retry only failures |
| **Rollback/Abort** | Fixable→retry→rollback→abort, max 2 rollbacks per Gate |
| **Checkpoints** | Structured output after each Gate for session recovery |
| **Conflict Resolution** | Plan patch queuing, Data > API > UI priority, 10min timeout |

## Closed Loops

| # | Loop | Trigger | Flow |
|---|------|---------|------|
| 1 | **Dev Loop** | Orchestrator Gate C→C1→C2 | Implement → Quality → Test → Fix → Retest |
| 2 | **Test Loop** | `browser-test` | Write cases → agent-browser execute → Screenshot → Fail→Fix→Retest |
| 3 | **Bug Loop** | `bug-fix` | Bug → agent-browser reproduce → Root cause → Fix → Verify |
| 4 | **Review Loop** | `review-fix-optimize` | Audit → Plan → Execute → Verify → Close |
| 5 | **Security Loop** | Gate E (pre-release) | security-auditor → Threat model + CVE + SAST → Fix → Rescan |

Failures auto-route to fix loop, max 2 rounds; 3rd failure marked BLOCKED with artifacts preserved.

## Usage

### Claude Code (Recommended)

```bash
cp -r path/to/.claude/ your-project/
claude
```

**Domain Commands** (full lifecycle A→B→C→C1→C1.5→C2→D→E):

| Command | Domain | Agents |
|---------|--------|--------|
| **`/backend`** | Backend | backend-implementer, backend-api/data/service-worker, backend-test-worker, database-specialist, performance-test-worker, security-auditor, api-docs-worker, infra-worker |
| **`/frontend`** | Frontend | frontend-implementer, frontend-ui/state-worker, frontend-test-worker, browser-test-worker, e2e-test-worker, performance-audit-reviewer, security-auditor, infra-worker |
| **`/taro`** | Taro Mini-program/H5 | taro-worker, taro-ui/state-worker, browser-test-worker, e2e-test-worker |
| **`/android`** | Android | android-worker, android-ui/state-worker, e2e-test-worker |
| **`/ios`** | iOS | ios-worker, ios-ui/state-worker, e2e-test-worker |
| **`/expo`** | Expo Cross-platform | react-native-worker, rn-ui/state-worker, browser-test-worker, e2e-test-worker |
| **`/flutter`** | Flutter | flutter-worker, flutter-ui/state-worker, browser-test-worker, e2e-test-worker |

**Specialized Commands**:

| Command | Purpose |
|---------|---------|
| **`/jarvis`** | Full pipeline orchestration |
| **`/browser-test`** | Browser automation test loop (agent-browser) |
| **`/bug-fix`** | Bug fix loop (agent-browser reproduce→fix→verify) |
| **`/review`** | Read-only review mode |
| **`/review-fix`** | Review→Fix→Re-review loop |
| **`/algorithm-expert`** | Algorithm selection & complexity analysis |
| **`/frontend-architect`** | Frontend architecture & tech selection |
| **`/backend-architect`** | Backend architecture & distributed design |

### OpenCode

```bash
opencode --agent frontend       # Switch to frontend orchestrator
opencode --agent backend        # Switch to backend orchestrator
opencode --agent jarvis         # Switch to full-stack orchestrator
```

55 agents + 0 commands, **agent-switching only**: switch to a primary agent to enter its complete domain lifecycle (Gate A→B→C→C1→C1.5→C2→D→E).

| Primary Agent | Domain |
|---------------|--------|
| `jarvis` | Full-stack orchestration |
| `frontend` `backend` | Frontend / Backend |
| `taro` `android` `ios` `expo` `flutter` | Mobile platforms |
| `review-only` | Read-only review |
| `review-fix-optimize` | Review→Fix→Re-review loop |

### Codex

```bash
cp -r path/to/.codex/ your-project/
```

45 agents + 42 skills, **skill-triggered mode**: load a skill to enter its workflow.

| Skill | Purpose |
|-------|---------|
| `jarvis` `frontend` `backend` `android` `ios` `flutter` `expo` `taro` | Domain lifecycles |
| `algorithm-expert` `backend-architect` `frontend-architect` | Expert conversations |
| `browser-test` `bug-fix` | Test loops |
| `review-only` `review-fix-optimize` | Review modes |

## Browser Automation

Unified **agent-browser** CLI (Vercel Labs, 29K+ GitHub stars, 80+ commands), replacing Claude in Chrome MCP and browser-use.

```bash
npm i -g agent-browser && agent-browser install
```

- **Snapshot + Refs**: `agent-browser snapshot -i` → `@e1, @e2` compact element refs, token-efficient
- **Chrome profile**: `agent-browser --profile "Default" open <url>` for authenticated sessions
- **Full capabilities**: network monitoring, console logs, performance tracing, visual regression, React DevTools
- Claude Code additionally uses Preview MCP for local dev preview verification

## Agent System

| Category | Agents |
|----------|--------|
| **Orchestration (Primary)** | `jarvis`, `frontend`, `backend`, `android`, `ios`, `flutter`, `expo`, `taro` |
| **Review Orchestrators (Primary)** | `review-only` (read-only), `review-fix-optimize` (review→fix loop) |
| **Planning & Review** | `task-design`, `planner`, `review-qa` |
| **Exploration** | `repo-explorer`, `docs-researcher` |
| **Architecture** | `algorithm-expert`, `frontend-architect`, `backend-architect`, `database-specialist` |
| **Review & Fix** | `project-audit-reviewer`, `diff-code-reviewer`, `performance-audit-reviewer`, `security-auditor`, `remediation-planner`, `remediation-worker`, `post-change-reviewer` |
| **Backend** | `backend-implementer`, `backend-api-worker`, `backend-service-worker`, `backend-data-worker`, `backend-test-worker` |
| **Frontend** | `frontend-implementer`, `frontend-ui-worker`, `frontend-state-worker`, `frontend-test-worker` |
| **Mobile** | `taro-worker`, `android-worker`, `ios-worker`, `react-native-worker` (Expo), `flutter-worker` (each with ui/state sub-variants, 15 total) |
| **Testing & Docs** | `browser-test-worker`, `e2e-test-worker`, `performance-test-worker`, `api-docs-worker` |
| **Infrastructure** | `infra-worker` |

> **10 Primary agents** (OpenCode): switch via `opencode --agent <name>`. Claude Code uses equivalent `/commands`, Codex uses skills.

## Skill System

**27 shared skills** (cross-platform) + Codex 15 additional primary workflow skills (42 total):

| Category | Skills |
|----------|--------|
| **Foundation** | `behavioral-guidelines` `context-engineering` `using-agent-skills` |
| **Requirements** | `spec-driven-development` `idea-refine` |
| **Planning** | `planning-and-task-breakdown` |
| **Implementation** | `source-driven-development` `incremental-implementation` `test-driven-development` `code-standards` `code-simplification` |
| **Quality** | `code-quality-gate` `code-review-and-quality` `verification-before-completion` |
| **Debugging** | `debugging-and-error-recovery` |
| **Browser** | `agent-browser` `browser-testing` |
| **Security** | `security-and-hardening` |
| **Release** | `shipping-and-launch` `git-workflow-and-versioning` `finishing-a-development-branch` |
| **Documentation** | `chinese-documentation` `documentation-and-adrs` `writing-skills` |
| **Discovery** | `find-docs` `find-skills` |
| **Tooling** | `mcp-builder` |

## Directory Structure

```
.claude/                         # Claude Code
  settings.json                  #   Permissions & settings
  commands/                      #   15 slash commands
  agents/                        #   47 agent definitions
  skills/                        #   27 methodology skills

.opencode/                       # OpenCode
  agents/                        #   55 agents (10 primary + 45 sub-agents)
  skills/                        #   27 skills (no commands directory)

.codex/                          # Codex
  agents/                        #   45 sub-agents
  skills/                        #   42 skills (13 primary workflows + 15 shared + review-only/fix-optimize)
```

## Design Principles

- **Vertical Slices** — tasks split by end-to-end features, not tech layers
- **Gate Control** — each phase requires alignment before advancing (unbypassable)
- **Requirement Traceability** — every change traces to a `REQ-XXX`
- **Single Owner Per Shared Area** — prevents parallel write conflicts
- **Maximum Concurrency** — independent tasks dispatched in same message
- **Comment Language Convention** — follows `behavioral-guidelines` Principle 5

## Acknowledgments

- **[agent-browser](https://github.com/vercel-labs/agent-browser)** — Vercel Labs, browser automation CLI (80+ commands) for test & bug loops
- **[superpowers](https://github.com/obra/superpowers)** — skills-as-documentation methodology
- **[superpowers-zh](https://github.com/jnMetaCode/superpowers-zh)** — Chinese skill system reference

## License

MIT
