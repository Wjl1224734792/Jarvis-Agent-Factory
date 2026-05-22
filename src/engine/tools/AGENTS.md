<!-- Generated: 2026-05-22T08:28:05.565Z | Updated: 2026-05-22T08:28:05.565Z -->
<!-- Parent: ../AGENTS.md -->

# tools — MCP 工具注册模块

## Purpose
注册 46 个 MCP 工具：session、pipeline、gate、agent、flow、wiki、memory、AST 搜索、LSP 代码智能。

## Key Files
| File | Description |
|------|-------------|
| agent-tools.ts | TypeScript source — Exports: registerAgentTools |
| AGENTS.md | Markdown documentation |
| ast-tools.ts | TypeScript source — Exports: registerAstTools（jarvis_ast_search/replace） |
| CLAUDE.md | Markdown documentation |
| flow-tools.ts | TypeScript source — Exports: registerFlowTools |
| gate-tools.ts | TypeScript source — Exports: registerGateTools |
| lsp-tools.ts | TypeScript source — Exports: registerLspTools（12 个 LSP 工具） |
| memory-tools.ts | TypeScript source — Exports: registerMemoryTools |
| pipeline-tools.ts | TypeScript source — Exports: registerPipelineTools |
| session-tools.ts | TypeScript source — Exports: registerSessionTools |
| shared.ts | TypeScript source — Exports: VALID_PIPELINE_TYPES, sessionGates |
| types.ts | TypeScript source — Exports: ToolContext |
| wiki-tools.ts | TypeScript source — Exports: registerWikiTools |


## Subdirectories
| Directory | Description | AGENTS |
|-----------|-------------|--------|
| lsp/ | LSP 客户端、语言服务器配置、工具函数 | [AGENTS.md](lsp/AGENTS.md) |


## For AI Agents


## Dependencies
- **Internal:** None
- **External:** See package.json for full dependency list

<!-- MANUAL:START -->
<!-- MANUAL:END -->
