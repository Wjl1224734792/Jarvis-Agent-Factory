# REQ-Commands-Merge 实现总结

**日期**: 2026-05-15
**状态**: 实现完成

---

## 变更文件

| 文件 | 操作 | Agent |
|------|------|-------|
| `src/web/routes.ts` | 修改 — `/api/commands` handler 重写为双源读取+内置兜底 | backend-dev-expert (TASK-CM-001) |
| `tests/commands-api.test.ts` | 新建 — 14 个 API 集成测试 | backend-dev-expert (TASK-CM-001) |
| `web/src/api.ts` | 修改 — 新增 `CommandsData` 类型，更新返回契约 | frontend-dev-expert (TASK-CM-002) |
| `web/src/pages/Commands.tsx` | 修改 — 双Tab布局，移除硬编码降级 | frontend-dev-expert (TASK-CM-002) |
| `web/src/utils/commands-filter.ts` | 新建 — 纯函数 `filterCommands` + `onSourceTabChange` | frontend-dev-expert (TASK-CM-002) |
| `tests/commands-filter.test.ts` | 新建 — 6 个过滤逻辑单元测试 | frontend-dev-expert (TASK-CM-002) |

## 验证结果

- TASK-CM-001: 14/14 测试通过，全部 317 回归测试通过，`tsc --noEmit` 通过
- TASK-CM-002: 6/6 测试通过，11/11 验收标准通过，`tsc --noEmit` 通过
