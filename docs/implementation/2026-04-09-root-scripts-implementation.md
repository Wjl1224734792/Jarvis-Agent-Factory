# 2026-04-09 根脚本与验证实施记录

## 本轮改动

1. `packages/db/src/seed.cli.ts`
   - 改为基础 seed 入口
   - 默认不清库

2. 根目录 `package.json`
   - 新增 `db:seed:dev`
   - 新增 `db:seed:prod`
   - 新增 `db:reset:dev`
   - 保留并明确 `db:seed:test-data`
   - `setup:dev` 改为基础 seed
   - 新增 `setup:test-data`

3. `README.md`
   - 更新初始化数据库说明
   - 更新数据库脚本说明与职责
   - 补充基础 seed 与海量测试数据的账号区别

4. `eslint.config.mjs`
   - 忽略 `tmp/**`

## 验证记录

- `bun run db:seed`
- `bun run db:reset:dev`
- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run build`
