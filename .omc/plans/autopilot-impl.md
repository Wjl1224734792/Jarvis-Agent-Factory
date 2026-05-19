# Autopilot Implementation Plan: 生产就绪度改进

## Batch 1 — TS 严格性提升（Critical #1）
**Owner**: executor | **Risk**: medium | **Verification**: `npx tsc --noEmit`

### 1a. 启用 `noImplicitAny: true`
- 改 `tsconfig.json`: 移除 `"noImplicitAny": false`、`"noUnusedLocals": false`、`"noUnusedParameters": false`
- 修复 db.ts 中 40+ 函数签名（添加 `: any` 显式类型或定义接口）
- 修复 server.ts / routes.ts / hook.ts 中的隐式 any

### 1b. 启用 `useUnknownInCatchVariables: true`
- 改 `tsconfig.json`: 移除 `"useUnknownInCatchVariables": false`
- 修复所有 `catch (e)` → `catch (e: unknown)` 并加类型守卫

## Batch 2 — 静默 catch 修复（High #4）
- db.ts 中 12 处 `catch {}` → `catch (e: unknown) { if (!/already exists/i.test(String(e))) console.error(...) }`

## Batch 3 — advance_gate 事务保护（High #5 + Medium #8）
- server.ts `advance_gate` MCP handler + routes.ts REST handler: 包装 `BEGIN/COMMIT/ROLLBACK`

## Batch 4 — SSE 竞态修复（High #6）
- routes.ts: sseClients 操作加简单锁（flag 保护）

## Batch 5 — 清理 + 文档（Medium #7 + 所有文档更新）
- `git rm -r .git-rewrite/`
- 更新 AGENTS.md / README.md / CHANGELOG.md

## Batch 6 — 验证
- Build + lint + typecheck + test suite
