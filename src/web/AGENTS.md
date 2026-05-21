<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# web (backend)

## Purpose
Web API and static serving layer for the Jarvis Engine web panel. Provides REST API routes, SSE event streaming, reverse proxy for remote views, and legacy static HTML views.

## Key Files

| File | Description |
|------|-------------|
| `routes.ts` | All REST API routes — sessions, pipeline, gates, agents, commands, wiki, artifacts, SSE events |
| `reverse-proxy.ts` | GitHub CDN proxy for remote HTML views (1-hour cache, local fallback) |
| `views/agents.html` | Legacy static Agent configuration page (Tailwind CSS) — served as fallback |
| `views/pipeline.html` | Legacy static Pipeline dashboard page (Tailwind CSS) — served as fallback |

## For AI Agents

### Working In This Directory
- Routes are registered in `server.ts` via `setupApiRoutes()`
- New API endpoints must validate against path traversal (see `/api/jarvis/:filepath`)
- SSE events are broadcast via `pubsub.ts` (8-second interval or event-driven)
- `views/*.html` are CDN-proxied with local fallback for offline use
