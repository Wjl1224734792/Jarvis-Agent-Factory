<!-- Generated: 2026-05-22T08:28:05.565Z | Updated: 2026-05-22T08:28:05.565Z -->
<!-- Parent: ../AGENTS.md -->

# engine — Core engine logic

## Purpose
This directory contains the engine module of the project.

## Key Files
| File | Description |
|------|-------------|
| agent-fs.ts | TypeScript source — Exports: syncAgentFile |
| agent-registry.ts | TypeScript source — Exports: resolveTemplatesDir, getActiveProjects, scanAllProjectAgents, getCategories, getAgentList |
| AGENTS.md | Markdown documentation |
| CLAUDE.md | Markdown documentation |
| db.ts | TypeScript source — Exports: openDb, getPipeline, updatePipelineGate, initPipeline, getAllPipelines |
| file-watcher.ts | TypeScript source — Exports: startFileWatcher, stopFileWatcher |
| gates.ts | TypeScript source — Exports: PIPELINE_DEFS, DEFAULT_PIPELINE, GATES, getPipelineGates, getPipelineName |
| guardian.ts | TypeScript source — Exports: PidData, readPidFile, writePidFile, removePidFile, isEngineRunning |
| platform-info.ts | TypeScript source — Exports: resolvePlatformInfo |
| pubsub.ts | TypeScript source — Exports: PubSubEventType, PubSubEvent, incrementBroadcastCount, getPubSub, emitEvent |
| quality-gate.ts | TypeScript source — Exports: QualityThreshold, QualityProfileSource, QualityProfile, Violation, EvaluationResult |
| server.ts | TypeScript source — Exports: sanitizeErrorMessage, resolveErrorResponse, createLoggerMiddleware, registerMcpTools, stopEngine |
| session-archive.ts | TypeScript source — Exports: getSessionContextSummary, cleanExpiredMemories |
| wiki-store.ts | TypeScript source — Exports: titleToSlug, readWikiPage, listWikiPages, queryWikiPages, lintWikiPages |


## Subdirectories
| Directory | Description | AGENTS |
|-----------|-------------|--------|
| tools/ | Project subdirectory | [AGENTS.md](tools/AGENTS.md) |


## For AI Agents


## Dependencies
- **Internal:** tools/
- **External:** See package.json for full dependency list

<!-- MANUAL:START -->
<!-- MANUAL:END -->
