# Autopilot Implementation Plan: 低优先级项完善

## Execution Order

### Batch 1 (parallel) — Skill wiring + GATE_AGENT_GUIDE
- Update command templates: add Skill() calls to 14 commands
- Update gates.ts: add platform agents to GATE_AGENT_GUIDE

### Batch 2 — Documentation sync
- Update AGENTS.md skill table
- Update README.md version summary

### Batch 3 — QA & Release
- Build + test
- Commit + push
