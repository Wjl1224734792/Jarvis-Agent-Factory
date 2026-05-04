# Jarvis Agent Factory

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Version](https://img.shields.io/badge/version-v1.5.0-green)](https://gitee.com/wujl1124/jarvis/releases)

A cross-platform, multi-agent AI coding assistant configuration suite that defines a **complete software development pipeline from idea to delivery**. Runs on Claude Code, OpenCode, and Codex — sharing a single set of workflow specifications.

> **Current** — 47 agents + 8 slash commands (Claude Code), 48 agents (OpenCode), 45 agents (Codex), 25 methodology skills. Integrated browser-use for automated testing and bug reproduction closed loops.

> 📖 **中文读者**：请参阅 [README.md](./README.md)

## Core Concept

**Jarvis** — the single orchestration hub. Directly converses with the user and dispatches all sub-agents via Agent/Task tools. Sub-agents are single-responsibility, non-recursive; every phase must pass its corresponding Gate check before proceeding.

### Pipeline

```
Refine → Clarify → Requirements → Task Design → Planning → Parallel Impl → Code Quality → Testing → Review → Security → Release
   │        │          │             │            │            │            │           │        │          │          │
   └─ Phase 0         Gate A       Gate B       Gate C       Gate C1     Gate C2     Gate D    Gate E1   Gate E2
                                                    │
                                         ┌──────────┘
                                         │ Tasks within same Batch: parallel
                                         │ Batches: serial (wait for prior Batch)
                                         └── No shared deps → can start ahead
```

**Parallel / Serial Rules:**

| Phase | Execution | Parallelizable |
|-------|-----------|----------------|
| 0 Refine | Serial (Jarvis direct) | — |
| 1 Requirements | Serial | Can parallel with repo/doc exploration |
| 2 Task Design | Serial (task-design) | Exploration results as augment input |
| 3 Planning | Serial (planner) | Can parallel with architect review |
| 4 Implementation | **Parallel within same Batch** | All impl agents with no shared deps |
| Gate C1 Quality | Serial (Lint→Type-check→Build→Deps) | Four steps serial, not parallelizable |
| Gate C2 Testing | Unit/integration parallel; E2E last | backend-test + frontend-test parallel |
| Gate D Review | Serial (review-qa) | — |
| Gate E1 Security | Serial (security-auditor) | Can parallel with release prep |
| Gate E2 Release | Serial | — |

### Pipeline Phases

| Phase | Executor | Key Artifact | P/S |
|-------|----------|-------------|-----|
| **0. Idea Refine** | Jarvis + idea-refine | Structured question list | Serial |
| **1. Requirements** | Jarvis | `REQ-XXX` entries | Serial |
| **2. Task Design** | task-design | `TASK-XXX` cards | Serial |
| **3. Planning** | planner | Execution Packets | Serial |
| **4. Implementation** | Domain impl agents | Vertical slice code | **Parallel** |
| **5. Code Quality** | Jarvis (direct) | Lint + Type-check + Build + Deps | Serial |
| **6. Testing** | test workers | Test summary + coverage | Parallel + Serial |
| **7. Review** | review-qa | REQ-XXX traceability matrix | Serial |
| **8. Security Audit** | security-auditor | Security report + CVE list | Serial |
| **9. Release** | Jarvis + infra-worker | Checklist + deployment | Serial |

Each phase has a corresponding Gate. Failing a Gate blocks progression to the next phase.

### Resilience Framework

| Dimension | Strategy |
|-----------|----------|
| **Agent Retry** | 4 failure types with differentiated retry (timeout/tool error/incomplete/out-of-bounds), max 3 attempts |
| **Batch Partial Failure** | Keep successful artifacts, retry only failed tasks, dependency analysis for blocking |
| **Rollback / Abort** | Decision tree: fixable→retry→rollback→abort, max 2 rollbacks per Gate |
| **Session Checkpoint** | Structured checkpoint after each Gate, supports session recovery |
| **Conflict Resolution** | Plan patch serialization, data layer > API layer > UI layer, 10min timeout |

### Closed-Loop System

Five independent closed loops ensure any issue self-heals:

| # | Loop | Trigger | Flow |
|---|------|---------|------|
| 1 | **Development** | `/jarvis` Gate C→C1→C2 | Implement → Quality checks → Tests → Fix → Re-verify |
| 2 | **Testing** | `/browser-test` | Write cases → Browser execute → Screenshot → Fail→`/review-fix`→ Retest |
| 3 | **Bug** | `/bug-fix` | Bug → Browser repro → Screenshot → Root cause → Fix → Quality → Browser verify |
| 4 | **Review** | `/review-fix` | Review → Plan → Execute → Verify → Close |
| 5 | **Security** | Gate E (mandatory) | security-auditor → Threat model + CVE + SAST → Fix → Re-scan |

Cross-loop connections:

```
/browser-test failure ──→ /review-fix ──→ re-run /browser-test
/bug-fix after fix     ──→ /browser-test regression
/review-fix frontend   ──→ browser-use repro + verify
Gate E security fail   ──→ /review-fix ──→ re-audit
```

Any phase failure auto-routes to the corresponding fix loop, max 2 rounds; round 3 failure marks `BLOCKED`, preserving all artifacts and diagnostics.

## Usage

### Claude Code (Recommended)

Copy `.claude/` to your project root, then use eight slash commands:

| Command | Purpose |
|---------|---------|
| **`/jarvis`** | Full pipeline orchestration (requirements → release) |
| **`/browser-test`** | Browser test loop — write cases, execute, screenshot, fix, retest |
| **`/bug-fix`** | Bug fix loop — browser repro, root cause, fix, browser verify |
| **`/review`** | Read-only review mode |
| **`/review-fix`** | Review→plan→fix→verify→close |
| **`/algorithm-expert`** | Algorithm design consultation |
| **`/frontend-architect`** | Frontend architecture consultation |
| **`/backend-architect`** | Backend architecture consultation |

```bash
# 1. Copy config to your project
cp -r path/to/.claude/ your-project/

# 2. Install browser-use (required for browser test/bug loops)
npx skills add browser-use/browser-use@browser-use -g -y

# 3. Launch Claude Code
claude

# 4. Full pipeline: /jarvis
# 5. Browser test: /browser-test
# 6. Bug fix: /bug-fix
```

### OpenCode

```bash
opencode --agent jarvis
```

48 agents (including jarvis), plugin extension via `@opencode-ai/plugin`.

### Codex

45 agents, auto-loads orchestration flow. Edit `model` in `.codex/config.toml` as needed.

## Agent System

47 agents (Claude Code) / 48 (OpenCode) / 45 (Codex), organized in 10 categories:

| Category | Agents |
|----------|--------|
| **Planning & Review** | `jarvis` (orchestrator), `task-design`, `planner`, `review-qa` |
| **Exploration** | `repo-explorer`, `docs-researcher` |
| **Architecture** | `algorithm-expert`, `frontend-architect`, `backend-architect`, `database-specialist` |
| **Review & Fix** | `review-only`, `review-fix-optimize`, `project-audit-reviewer`, `diff-code-reviewer`, `performance-audit-reviewer`, `security-auditor`, `remediation-planner`, `remediation-worker`, `post-change-reviewer` |
| **Backend** | `backend-implementer`, `backend-api-worker`, `backend-service-worker`, `backend-data-worker`, `backend-test-worker` |
| **Frontend** | `frontend-implementer`, `frontend-ui-worker`, `frontend-state-worker`, `frontend-test-worker` |
| **Mobile** | `taro-worker`, `taro-ui-worker`, `taro-state-worker`, `android-worker/unified`, `ios-worker/unified`, `react-native-worker/unified`, `flutter-worker/unified` (each with ui/state sub-variants) |
| **Testing & Docs** | `browser-test-worker`, `e2e-test-worker`, `performance-test-worker`, `api-docs-worker` |
| **Infrastructure** | `infra-worker` |

## Skill System

25 methodology skills (+ `browser-use` external skill), covering the full lifecycle. Skills are loaded on-demand by agents rather than hardcoded into prompts:

| Category | Skills |
|----------|--------|
| **Foundation** | `behavioral-guidelines`, `context-engineering`, `using-agent-skills` |
| **Requirements** | `spec-driven-development`, `idea-refine` |
| **Planning** | `planning-and-task-breakdown` |
| **Implementation** | `source-driven-development`, `incremental-implementation`, `test-driven-development`, `verification-before-completion`, `debugging-and-error-recovery`, `code-simplification`, `code-quality-gate`, `browser-testing` |
| **Review** | `code-review-and-quality` |
| **Security** | `security-and-hardening` |
| **Release** | `shipping-and-launch`, `git-workflow-and-versioning`, `finishing-a-development-branch` |
| **Documentation** | `chinese-documentation`, `documentation-and-adrs`, `find-docs` |

## Directory Structure

```
.claude/                         # Claude Code config (primary)
  settings.json                  #   Permissions & global settings
  commands/                      #   8 slash commands
  agents/                        #   47 agent definitions
  skills/                        #   25 methodology skills

.opencode/                       # OpenCode config
  agents/                        #   48 agent definitions
  skills/                        #   25 methodology skills

.codex/                          # Codex config
  config.toml                    #   Main configuration
  agents/                        #   45 sub-agents
  skills/                        #   25 methodology skills
```

## Design Principles

- **Vertical Slices** — Tasks split by end-to-end functionality, not technical layers
- **Gate Control** — Each phase must meet alignment conditions before proceeding; cannot bypass
- **Requirement Traceability** — Every code change traces to a `REQ-XXX` entry
- **Single Ownership** — Shared regions have exactly one responsible agent to avoid write conflicts
- **Change Sizing** — Single-round changes ≤ 1000 lines
- **Maximum Concurrency** — Independent tasks must be dispatched in the same message batch
- **Comment Language** — Code comments follow the project's existing language; check existing files when uncertain

## Configuration

### Switch LLM Model

```yaml
# Claude Code / OpenCode (Markdown frontmatter)
model: claude-sonnet-4-20250514
```

```toml
# Codex (TOML)
model = "gpt-5.5"
```

### Modify Agents

Edit Markdown files in `.claude/agents/`. Each contains YAML frontmatter (name, tools, model), responsibilities, red lines, and anti-rationalization tables.

## Acknowledgments

This project is inspired by and references the following excellent open-source projects:

- **[browser-use](https://github.com/browser-use/browser-use)** — Browser automation tool that powers the `/browser-test` and `/bug-fix` closed loops with real-browser testing and bug reproduction
- **[superpowers](https://github.com/obra/superpowers)** — The methodological foundation for the agent skill system, defining the core concept of Skills as Documentation
- **[superpowers-zh](https://github.com/jnMetaCode/superpowers-zh)** — Chinese localization of superpowers, providing the reference paradigm for this project's Chinese skill system

## License

MIT
