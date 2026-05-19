# Autopilot Implementation Plan: 3 New Commands

## Execution Order

1. **gates.ts** — Add 3 pipeline definitions + all gate configs
2. **Command templates** — Create simplify.md, trace.md, improve.md
3. **Engine/UI** — Update server.ts, routes.ts
4. **Documentation** — Update AGENTS.md, README.md, docs/flows/
5. **QA** — Build, lint, engine tests, web panel tests

## Parallel Opportunities
- gates.ts and 3 command templates are independent → parallel
- Engine/UI updates and docs/flow diagrams are independent → parallel
