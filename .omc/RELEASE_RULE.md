# Release Rules
<!-- last-analyzed: 2026-05-19T01:25:00Z -->

## Version Sources
- `package.json` → `version` field

## Release Trigger
- Tag push `v*` → CI auto-publishes to npm + creates GitHub Release
- `workflow_dispatch` with `tag` input also supported

## Test Gate
```bash
npm run lint && npm run typecheck && npm run test && npm run build && npm run build:web
```
CI job: `check` (must pass before `release`)

## Registry / Distribution
- npm (`npm publish` in CI, NPM_TOKEN secret)
- GitHub Release (`gh release create`, with auto-generated changelog from git log)
- Web panel SPA uploaded to GitHub Release

## Release Notes Strategy
- `CHANGELOG.md` maintained manually (Keep a Changelog format)
- CI auto-generates release body from `git log` between tags

## CI Workflow Files
- `.github/workflows/ci.yml`
