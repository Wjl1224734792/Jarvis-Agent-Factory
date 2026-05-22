<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# pages

## Purpose
React page components for each route in the Jarvis Engine web panel. Lazy-loaded via `React.lazy()` in `App.tsx`.

## Key Files

| File | Description |
|------|-------------|
| `DashboardHome.tsx` | Home page `/` — pipeline overview: stat cards + active/inactive session cards grid, click to navigate to session detail |
| `SessionDetail.tsx` | Session detail `/session/:id` — gate timeline, artifact documents, markdown preview via `LazyMarkdown` |
| `Dashboard.tsx` | Shared gate constants and `LazyMarkdown` component — exported for reuse by SessionDetail and RunDetail |
| `Agents.tsx` | Agent configuration `/agents` — search/filter agents, configure model/effort per agent |
| `Commands.tsx` | Command reference `/commands` — dual-source (project/global) command listing with tabs |
| `Archive.tsx` | Archived runs `/archive` — list/search archived runs, restore or permanently delete |
| `RunDetail.tsx` | Run detail `/archive/:runId` — full run info, gate timeline, documents table with click-to-preview, event log |
| `Wiki.tsx` | Knowledge base `/wiki` — page list with search/category filter, markdown detail view with syntax highlighting |
| `Guide.tsx` | User guide `/guide` — quick start, core constraints, pipeline types, command reference, resource links |

## For AI Agents

### Working In This Directory
- New pages must be registered in `App.tsx` routes and typically in `Layout.tsx` nav
- Use `usePipelineData()` from Layout context for SSE-streamed pipeline data
- Use `api.*` from `../api` for REST calls
- Markdown preview: import `LazyMarkdown` and `MARKDOWN_CSS` from `./Dashboard`

### Testing Requirements
- Tests in `__tests__/` directory — `matchPipelineType.test.ts`
- Component tests in `../components/__tests__/` — `Layout.test.tsx`
- 382 total project tests when run from root
