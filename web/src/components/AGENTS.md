<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# components

## Purpose
Shared React components for the Jarvis Engine web panel. Contains the main layout shell and error boundary.

## Key Files

| File | Description |
|------|-------------|
| `Layout.tsx` | Main app shell — Ant Design Layout with collapsible sidebar, session list, MCP status, SSE connection, and React context providers (`SessionContext`, `PipelineDataContext`) |
| `ErrorBoundary.tsx` | Error boundary wrapping markdown preview — catches render errors and shows Alert fallback |

## For AI Agents

### Working In This Directory
- `Layout.tsx` is the single most complex component — it manages session state, SSE, navigation, and context
- Sidebar sessions are sorted: pinned items first, then by heartbeat descending
- Optimistic updates (pin/archive/delete) with rollback snapshots
- SSE uses exponential backoff (1s → 30s max)
- New nav items: add to `NAV_ITEMS` array

### Testing Requirements
- Tests in `__tests__/Layout.test.tsx`
