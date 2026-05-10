# Web 面板推广就绪度改进 — 任务分解

## 任务清单

| TASK | 描述 | REQ | 优先级 | 类型 |
|------|------|-----|--------|------|
| TASK-001 | 删除冗余 archive.html + 路由 | REQ-WP-001 | P0 | cleanup |
| TASK-002 | 清理 CLI/hook/install 文件 Lint warnings | REQ-WP-002 | P1 | cleanup |
| TASK-003 | 清理 engine 层 Lint warnings | REQ-WP-002 | P1 | cleanup |
| TASK-004 | 清理 web/routes.ts Lint warnings | REQ-WP-002 | P1 | cleanup |
| TASK-005 | 版本号构建时注入到 HTML | REQ-WP-003 | P1 | feat |
| TASK-006 | API 文档补充 (OpenAPI/Markdown) | REQ-WP-004 | P2 | docs |

> 注：REQ-WP-005（JS 模块化）和 REQ-WP-006（前端测试）延后到后续迭代，避免本次变更范围过大。

## 并行批次

### Batch 1（无文件冲突，可并行）
- TASK-001 → `src/web/views/archive.html`, `src/engine/server.ts`
- TASK-005 → `package.json`, `src/web/views/pipeline.html`, `src/web/views/agents.html`

### Batch 2（无文件冲突，可并行）
- TASK-002 → `src/cli.ts`, `src/hook.ts`, `src/install.ts`
- TASK-003 → `src/engine/agent-registry.ts`, `src/engine/gates.ts`, `src/engine/server.ts`
- TASK-004 → `src/web/routes.ts`

### Batch 3
- TASK-006 → `docs/api/` 目录
