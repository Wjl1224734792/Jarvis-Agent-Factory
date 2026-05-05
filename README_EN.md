# Jarvis Agent Factory

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-v1.5.7-green)](https://gitee.com/wujl1124/JarvisAgentFactory/releases)

A cross-platform multi-agent AI coding assistant configuration set, defining a complete **idea-to-delivery software development pipeline**. Runs on Claude Code, OpenCode, and Codex, sharing a unified workflow specification.

> **Current** — Claude Code 47 agents + 15 slash commands, OpenCode 48 agents + 15 commands, Codex 45 agents. 26 methodology skills shared across platforms. Integrated browser-use for automated testing and bug reproduction.

> 中文读者请见：[README.md](./README.md) | Chinese readers please refer to the Chinese version linked above.

## Core Concepts

**Jarvis** — the single orchestration hub. Talks directly to the user and dispatches all sub-agents via Agent/Task tools. Sub-agents have **single responsibility** and **cannot recursively spawn**. Every phase must pass its corresponding Gate before advancing.

### Pipeline

```
Idea Refine → Requirements → Task Design → Planning → Parallel Impl → Code Quality → Testing → Review → Security → Release
     │             │            │           │              │              │          │        │         │
     Phase 0      Gate A      Gate B     Gate C      Gate C1        Gate C2    Gate D   Gate E1   Gate E2
```

### Resilience Framework

| Dimension | Strategy |
|-----------|----------|
| **Agent Retry** | 4 failure types, differentiated retries (timeout/tool error/incomplete output/out-of-scope), max 3 attempts |
| **Batch Partial Failure** | Keep successful artifacts, retry only failed tasks, dependency analysis for blocking |
| **Rollback/Abort** | Decision tree: fixable→retry→rollback→abort, max 2 rollbacks per Gate |
| **Session Checkpoints** | Structured checkpoint output after each Gate for session recovery |
| **Conflict Resolution** | Plan patch conflict queuing, Data > API > UI priority, 10-minute timeout |

## Closed Loops

5 independent closed loops built into the pipeline:

| # | Loop | Trigger | Flow |
|---|------|---------|------|
| 1 | **Dev Loop** | `/jarvis` Gate C→C1→C2 | Implement → Quality check → Test → Fix → Retest |
| 2 | **Test Loop** | `/browser-test` | Write cases → Execute → Screenshot → Fail→`/review-fix`→ Retest |
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

**Domain Commands** (full lifecycle: Requirements→Implement→Quality→Test→Review→Release):

| Command | Domain | Agents |
|---------|--------|--------|
| **`/backend`** | Backend | backend-implementer, backend-api/data/service-worker, backend-test-worker, database-specialist, performance-test-worker, security-auditor, api-docs-worker, infra-worker |
| **`/frontend`** | Frontend | frontend-implementer, frontend-ui/state-worker, frontend-test-worker, browser-test-worker, e2e-test-worker, performance-audit-reviewer, security-auditor, infra-worker |
| **`/taro`** | Taro Mini-program/H5 | taro-worker, taro-ui/state-worker, browser-test-worker, e2e-test-worker, security-auditor, infra-worker |
| **`/android`** | Android Native | android-worker, android-ui/state-worker, e2e-test-worker, security-auditor, infra-worker |
| **`/ios`** | iOS Native | ios-worker, ios-ui/state-worker, e2e-test-worker, security-auditor, infra-worker |
| **`/expo`** | Expo Cross-platform | react-native-worker, rn-ui/state-worker, browser-test-worker, e2e-test-worker, security-auditor, infra-worker |
| **`/flutter`** | Flutter Cross-platform | flutter-worker, flutter-ui/state-worker, browser-test-worker, e2e-test-worker, security-auditor, infra-worker |

**Full-stack & Specialized Commands**:

| Command | Purpose |
|---------|---------|
| **`/jarvis`** | Full pipeline orchestration (cross-domain lifecycle) |
| **`/browser-test`** | Browser automation test loop |
| **`/bug-fix`** | Bug fix loop (reproduce→fix→verify) |
| **`/review`** | Read-only review mode |
| **`/review-fix`** | Review→Fix→Re-review closed loop |
| **`/algorithm-expert`** | Algorithm selection & complexity analysis |
| **`/frontend-architect`** | Frontend architecture & tech selection |
| **`/backend-architect`** | Backend architecture & distributed design |

### OpenCode

```bash
opencode --agent jarvis         # Agent mode
opencode                        # Command mode (/jarvis /backend /frontend ...)
```

48 agents (includes jarvis agent), mirrors all 15 slash commands from Claude Code.

### Codex

Place `.codex/` in your project root. Starts with full orchestration pipeline (45 agents). Review modes via skills:

```toml
# .codex/config.toml — full workflow configured
# Default: gpt-5.5, edit model field as needed
# Review: load review-only / review-fix-optimize skills
```

## Agent System

| Category | Agents |
|----------|--------|
| **Planning & Review** | `jarvis`, `task-design`, `planner`, `review-qa` |
| **Exploration** | `repo-explorer`, `docs-researcher` |
| **Architecture** | `algorithm-expert`, `frontend-architect`, `backend-architect`, `database-specialist` |
| **Review & Fix** | `review-only`, `review-fix-optimize`, `project-audit-reviewer`, `diff-code-reviewer`, `performance-audit-reviewer`, `security-auditor`, `remediation-planner`, `remediation-worker`, `post-change-reviewer` |
| **Backend** | `backend-implementer`, `backend-api-worker`, `backend-service-worker`, `backend-data-worker`, `backend-test-worker` |
| **Frontend** | `frontend-implementer`, `frontend-ui-worker`, `frontend-state-worker`, `frontend-test-worker` |
| **Mobile** | `taro-worker/unified`, `android-worker/unified`, `ios-worker/unified`, `react-native-worker/unified` (Expo), `flutter-worker/unified` (each with ui/state sub-variants) |
| **Testing & Docs** | `browser-test-worker`, `e2e-test-worker`, `performance-test-worker`, `api-docs-worker` |
| **Infrastructure** | `infra-worker` |

## Skill System

**26 methodology skills** (+ 1 external `browser-use`), covering the full lifecycle:

| Category | Skills |
|----------|--------|
| **Foundation** | `behavioral-guidelines`, `context-engineering`, `using-agent-skills` |
| **Requirements** | `spec-driven-development`, `idea-refine` |
| **Planning** | `planning-and-task-breakdown` |
| **Implementation** | `source-driven-development`, `incremental-implementation`, `test-driven-development`, `verification-before-completion`, `debugging-and-error-recovery`, `code-simplification`, `code-quality-gate`, `browser-testing` |
| **Review** | `code-review-and-quality` |
| **Security** | `security-and-hardening` |
| **Release** | `shipping-and-launch`, `git-workflow-and-versioning`, `finishing-a-development-branch` |
| **Documentation** | `chinese-documentation`, `documentation-and-adrs`, `find-docs`, `find-skills` |
| **Tooling** | `mcp-builder`, `writing-skills` |

## Directory Structure

```
.claude/                         # Claude Code config (primary)
  settings.json                  #   Permissions & global settings
  commands/                      #   15 slash commands
  agents/                        #   47 agent definitions
  skills/                        #   26 methodology skills

.opencode/                       # OpenCode config
  commands/                      #   15 slash commands (mirrors .claude)
  agents/                        #   48 agent definitions
  skills/                        #   26 methodology skills

.codex/                          # Codex config
  config.toml                    #   Main config & orchestration
  agents/                        #   45 sub-agents
  skills/                        #   28 methodology skills (incl. review-only / review-fix-optimize)
```

## Design Principles

- **Vertical Slices** — tasks split by end-to-end features, not tech layers
- **Gate Control** — each phase requires alignment before advancing
- **Requirement Traceability** — every code change traces to a `REQ-XXX`
- **Single Owner Per Shared Area** — prevents parallel write conflicts
- **Maximum Concurrency** — independent tasks dispatched in same message
- **Comment Language Convention** — follow existing project language; Chinese projects use Chinese, English projects use English

## Acknowledgments

- **[browser-use](https://github.com/browser-use/browser-use)** — browser automation powering the `/browser-test` and `/bug-fix` loops
- **[superpowers](https://github.com/obra/superpowers)** — skills-as-documentation methodology foundation
- **[superpowers-zh](https://github.com/jnMetaCode/superpowers-zh)** — Chinese localization reference

## License

MIT
