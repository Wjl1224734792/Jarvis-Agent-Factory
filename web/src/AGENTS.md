<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# web/src

## Purpose
React 19 SPA source for the Jarvis Engine web panel. Uses Ant Design 6, React Router 6, and Vite with single-file output.

## Key Files

| File | Description |
|------|-------------|
| `main.tsx` | App entry point — ReactDOM root with BrowserRouter |
| `App.tsx` | Route definitions and lazy-loaded page components |
| `api.ts` | Fetch-based API client with typed interfaces (Session, PipelineSession, AgentItem, WikiPage, etc.) |
| `theme.tsx` | Ant Design theme config — blue primary (#1677ff), 6px radius |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `components/` | Shared React components (see `components/AGENTS.md`) |
| `pages/` | Page components for each route (see `pages/AGENTS.md`) |
| `utils/` | Utility functions — command filtering |

## For AI Agents

### Working In This Directory
- `npm run build` → `tsc --noEmit && vite build` → outputs single `dist/web/index.html`
- Dev server on port 5173 with HMR, proxies `/api` to `127.0.0.1:3456`
- All pages are lazy-loaded via `React.lazy()`
- **Routes**: `/` (overview), `/session/:id` (detail), `/agents`, `/commands`, `/archive`, `/archive/:runId`, `/wiki`, `/guide`

### Testing Requirements
- 45 tests in `pages/__tests__/` and `components/__tests__/`
- Run: `cd web && npm test`

### Common Patterns
- SSE for real-time data (8s broadcast + event-driven)
- Optimistic UI updates with rollback on failure
- Session-aware via React context (`SessionContext`, `PipelineDataContext`)
