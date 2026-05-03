# 2026-04-09 根脚本与最终验证报告

## 结论

- 结论：通过
- 说明：根目录数据库脚本已按“基础 seed / 测试数据 / 显式 reset”拆分，README 已同步更新，全仓默认四件套验证通过。

## 本轮发现与处理

### [已修复] `db:seed` 语义与实际行为不一致

- 风险：原 `packages/db/src/seed.cli.ts` 实际跑的是海量测试数据脚本，和 `seed` 命名完全不符，也不适合未来生产初始化。
- 处理：`seed.cli.ts` 改为运行基础 `seedDatabase({ reset: false })`。

### [已修复] 根脚本没有明确区分破坏性 reset 与非破坏性 seed

- 处理：
  - `db:seed` / `db:seed:dev` / `db:seed:prod` 统一指向基础 seed，默认不清库
  - `db:seed:test-data` 专用于测试/压测数据
  - `db:reset:dev` / `db:reset:test-data` 明确先 `db:clear` 再迁移和注入
  - `setup:dev` 改走基础 seed，新增 `setup:test-data`

### [已修复] 默认 lint 会把 `tmp/**` 临时脚本扫进来

- 处理：`eslint.config.mjs` 增加 `tmp/**` ignore，确保 `eslint .` 对准仓库正式源码。

## 验证结果

- `bun run db:seed`：通过
- `bun run db:reset:dev`：通过
- `bun run lint`：通过
  - 存在 1 条既有 warning：`apps/web/src/components/publish-aircraft-live-preview.tsx`
- `bun run typecheck`：通过
- `bun run test`：通过
- `bun run build`：通过
