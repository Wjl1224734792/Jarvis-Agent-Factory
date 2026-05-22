<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-22 -->

# web/

## Purpose
Jarvis Engine web frontend — Vite + React 19 SPA with Ant Design 6 UI. Serves the management panel for pipeline monitoring, agent configuration, wiki knowledge base, and command reference.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Frontend dependencies — React 19, Ant Design 6, react-router-dom, react-markdown |
| `vite.config.ts` | Vite build config — single-file output plugin, React plugin |
| `vitest.config.ts` | Test config — jsdom environment, `@testing-library/jest-dom` setup |
| `tsconfig.json` | TypeScript config with JSX support |
| `index.html` | SPA entry point — mounts `#root` div |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | Application source — pages, components, API client, utils (see `src/AGENTS.md`) |
| `public/` | Static assets — `guide.html`, `wiki.html` served as-is |
| `docs/` | Frontend documentation and review records |
| `dist/` | Build output (gitignored) |

## For AI Agents

### Working In This Directory
- Dev server: `npm run dev` (Vite hot reload)
- Build: `npm run build` (tsc --noEmit + vite build → single HTML file)
- Test: `npm test` (vitest run with jsdom)
- CSS: Ant Design 6 built-in theming via CSS variables (`--ant-color-*`)

### Testing Requirements
- `npm test` from this directory or `npm test` from project root
- Tests use `@testing-library/react` with jsdom

### Common Patterns
- Dark theme by default via Ant Design 6 ConfigProvider
- All API calls go through `src/api.ts` client
- Page components lazy-loaded via `React.lazy()` in App.tsx
- SSE pipeline data via `usePipelineData()` context hook

## Dependencies

### External
- `react` 19.x + `react-dom` — UI framework
- `antd` 6.x + `@ant-design/icons` — component library
- `react-router-dom` 6.x — client-side routing
- `react-markdown` + `remark-gfm` — Markdown rendering
- `vite` 8.x — build tool
- `vitest` — test runner
