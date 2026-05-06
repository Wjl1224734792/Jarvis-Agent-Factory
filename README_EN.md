# Jarvis Agent Factory

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-v1.5.12-green)](https://gitee.com/wujl1124/JarvisAgentFactory/releases)

A cross-platform multi-agent AI coding assistant configuration set defining a complete **idea-to-delivery software development pipeline**. Runs on Claude Code, OpenCode, and Codex with a unified workflow specification and shared skill system.

> **Current** — Claude Code 47 agents + 15 commands, OpenCode 55 agents + 15 commands (10 primary agents with dual-entry), Codex 45 agents. 27 methodology skills shared cross-platform (29 for Codex). Integrated browser-use for automated testing and bug reproduction.

> 中文读者请见：[README.md](./README.md)

## Core Concepts

**Jarvis** — the single orchestration hub. Talks directly to the user and dispatches sub-agents. Sub-agents have single responsibility, cannot recursively spawn, and all phases must pass their corresponding Gate before advancing.

### Pipeline

```
Idea Refine → Requirements → Task Design → Planning → Parallel Impl → Code Quality → Testing → Review → Security → Release
     │             │            │           │              │              │          │        │         │         │
   Phase 0       Gate A       Gate B     Gate C        Gate C1        Gate C2    Gate D   Gate E1   Gate E2
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
| 1 | **Dev Loop** | `/jarvis` Gate C→C1→C2 | Implement → Quality → Test → Fix → Retest |
| 2 | **Test Loop** | `/browser-test` | Write cases → Browser execute → Screenshot → Fail→Fix→Retest |
| 3 | **Bug Loop** | `/bug-fix` | Bug → Reproduce → Root cause → Fix → Verify |
| 4 | **Review Loop** | `/review-fix` | Audit → Plan → Execute → Verify → Close |
| 5 | **Security Loop** | Gate E (pre-release) | security-auditor → Threat model + CVE + SAST → Fix → Rescan |

## Usage

### Claude Code (Recommended)

```bash
cp -r path/to/.claude/ your-project/
npx skills add browser-use/browser-use@browser-use -g -y
claude
```

**Domain Commands** (full lifecycle A→B→C→C1→C2→D→E):

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
| **`/browser-test`** | Browser automation test loop |
| **`/bug-fix`** | Bug fix loop (reproduce→fix→verify) |
| **`/review`** | Read-only review mode |
| **`/review-fix`** | Review→Fix→Re-review loop |
| **`/algorithm-expert`** | Algorithm selection & complexity analysis |
| **`/frontend-architect`** | Frontend architecture & tech selection |
| **`/backend-architect`** | Backend architecture & distributed design |

### OpenCode

```bash
opencode --agent frontend       # Agent mode (switch to frontend orchestrator)
opencode --agent backend        # Agent mode (switch to backend orchestrator)
opencode --agent jarvis         # Agent mode (full-stack orchestrator)
opencode                        # Command mode (/jarvis /frontend /backend ...)
```

55 agents + 15 commands, **dual-entry architecture**: each domain supports both switching primary agents or `/command` invocation, equivalent and individually complete loops (Gate A→B→C→C1→C2→D→E).

| Entry | Method | Count |
|-------|--------|-------|
| Agent switching | Switch directly to a primary agent | 10 |
| `/command` | Load domain mode on current agent | 15 |

### Codex

```bash
cp -r path/to/.codex/ your-project/
```

45 agents. Review workflows enabled via skills (`review-only` / `review-fix-optimize`).

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

> **10 Primary agents** (OpenCode only): use `opencode --agent <name>` to switch. Each is a complete domain orchestrator with independent Gate A→B→C→C1→C2→D→E loops. Claude Code uses equivalent domain commands instead.

## Skill System

**27 methodology skills** (+ `browser-use` external skill):

| Category | Skills |
|----------|--------|
| **Foundation** | `behavioral-guidelines` (5 principles + comment convention), `context-engineering`, `using-agent-skills` |
| **Requirements** | `spec-driven-development`, `idea-refine` |
| **Planning** | `planning-and-task-breakdown` |
| **Implementation** | `source-driven-development`, `incremental-implementation`, `test-driven-development`, `verification-before-completion`, `debugging-and-error-recovery`, `code-simplification`, `code-quality-gate`, `browser-testing`, **`code-standards`** (code quality rules) |
| **Review** | `code-review-and-quality` |
| **Security** | `security-and-hardening` |
| **Release** | `shipping-and-launch`, `git-workflow-and-versioning`, `finishing-a-development-branch` |
| **Documentation** | `chinese-documentation`, `documentation-and-adrs`, `find-docs`, `find-skills` |
| **Tooling** | `mcp-builder`, `writing-skills` |

## Directory Structure

```
.claude/                         # Claude Code (primary)
  settings.json                  #   Permissions & settings
  commands/                      #   15 slash commands
  agents/                        #   47 agent definitions
  skills/                        #   27 methodology skills

.opencode/                       # OpenCode
  commands/                      #   15 commands (aligned with .claude)
  agents/                        #   55 agents (10 primary + 45 sub-agents)
  skills/                        #   27 methodology skills

.codex/                          # Codex
  config.toml                    #   Main orchestration config
  agents/                        #   45 sub-agents
  skills/                        #   29 skills (incl. review-only / review-fix-optimize)
```

## Design Principles

- **Vertical Slices** — tasks split by end-to-end features, not tech layers
- **Gate Control** — each phase requires alignment before advancing (unbypassable)
- **Requirement Traceability** — every change traces to a `REQ-XXX`
- **Single Owner Per Shared Area** — prevents parallel write conflicts
- **Maximum Concurrency** — independent tasks dispatched in same message
- **Comment Language Convention** — follows `behavioral-guidelines` Principle 5

## Acknowledgments

- **[browser-use](https://github.com/browser-use/browser-use)** — browser automation for test & bug loops
- **[superpowers](https://github.com/obra/superpowers)** — skills-as-documentation methodology
- **[superpowers-zh](https://github.com/jnMetaCode/superpowers-zh)** — Chinese skill system reference

## License

MIT
