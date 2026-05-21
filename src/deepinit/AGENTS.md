<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# deepinit

## Purpose
Hierarchical documentation generator. Scans directory trees and generates AGENTS.md + CLAUDE.md files with parent-child linkage, manual section preservation, and incremental update support.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Re-export entry point — aggregates scanner, generator, and manifest APIs |
| `scanner.ts` | Directory tree scanner — produces `DirEntry` lists, reads existing AGENTS.md manual sections |
| `generator.ts` | Document renderer — generates AGENTS.md and CLAUDE.md from scanned tree, supports full/incremental/parallel/smart modes |
| `manifest.ts` | Manifest manager — `.deepinit_manifest.json` for incremental diff detection |

## For AI Agents

### Working In This Directory
- CLI entry point is `src/cli/commands/deepinit.ts`
- Supports `--full`, `--incremental`, `--parallel`, and `--smart` modes
- `<!-- MANUAL -->` sections are preserved across regenerations
- Parent references use format: `<!-- Parent: relative/path/AGENTS.md -->`
