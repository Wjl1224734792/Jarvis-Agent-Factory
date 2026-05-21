<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# @feijia/db

## Purpose
数据库层：Drizzle ORM schema 定义、迁移、seed 脚本与 CLI 入口。所有表结构在此定义，`apps/server` 消费其导出。

## Key Files

| File | Description |
|------|-------------|
| `src/schema.ts` | 全部 Drizzle 表定义（~50 张表），含索引与关系 |
| `src/index.ts` | 桶导出：client、schema、helpers、migrate、seed |
| `src/client.ts` | `db`（Drizzle 实例）与 `dbPool`（连接池） |
| `src/helpers.ts` | 密码哈希、token 哈希、验证码哈希等工具函数 |
| `src/migrate.ts` | Drizzle 迁移执行逻辑 |
| `src/seed.ts` | 种子数据主逻辑（base/demo/rankings） |
| `src/seed.test-data.ts` | Mock 测试数据集 |
| `src/runtime-seed.ts` | 运行时种子（如默认角色、站点设置） |
| `src/seed.storage.ts` | 种子图片/文件上传到 MinIO |
| `src/env.ts` | 数据库连接环境变量读取 |
| `src/*.cli.ts` | CLI 入口（clear、migrate、seed、wipe-schema 等） |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `drizzle/` | Drizzle Kit 生成的 SQL 迁移文件与元数据 |
| `tests/` | 数据库层测试 |

## For AI Agents

### Working In This Directory
- 改表结构：编辑 `src/schema.ts` → 运行 `bun run db:generate` → 检查生成迁移 SQL
- 新增表后必须在 `src/index.ts` 中 export
- 表名用 camelCase（`aircraftModelsTable`），导出用同名变量
- 禁止物理外键（`createForeignKeyConstraints: false`）

### Testing Requirements
- 迁移后运行 `bun run db:migrate` 验证
- Seed 变更后运行 `bun run db:seed` 验证数据插入

### Common Patterns
- 所有表通过 `src/schema.ts` 集中导出
- Drizzle 实例 `db` 从 `src/client.ts` 单例导出
- 帮助函数（hash/verify）在 `src/helpers.ts`

## Dependencies

### Internal
- 无内部依赖（底层包，不依赖其他 `packages/*`）

### External
- `drizzle-orm` — ORM
- `drizzle-kit` — 迁移生成
- `postgres` — PostgreSQL 驱动
- `pino` — 日志
