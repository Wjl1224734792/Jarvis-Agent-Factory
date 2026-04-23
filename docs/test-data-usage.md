# Mock 数据使用说明

本文档描述测试 / E2E / 压测环境使用的 `mock` 数据，不再与开发演示 seed 混用。

## 使用入口

```bash
# 非破坏性导入 mock 数据
bun run db:seed:mock

# 破坏性重建 mock 数据环境
bun run db:reset:mock

# 启动基础设施并重建 mock 数据环境
bun run setup:test
```

兼容旧脚本：

```bash
bun run db:seed:test-data
bun run db:reset:test-data
bun run setup:test-data
```

以上旧脚本都等价于新的 `mock` 脚本。

## 数据范围

`mock` 数据用于测试 / E2E / 压测，包含：

- 大量用户
- 大量帖子、评论、互动
- 飞行器、榜单、排行对象、投稿
- Redis 测试缓存
- 当前 `STORAGE_PROVIDER` 指向的对象存储测试资源

它的目标是制造稳定、可重复、体量更大的测试环境，而不是给开发日常联调用。

## 环境绑定

- `db:seed:mock` / `db:reset:mock` 会直接使用当前 `.env` 或 shell 中的 `DATABASE_URL`、`REDIS_URL`、`STORAGE_PROVIDER` 与 `STORAGE_*`
- 当这些变量指向远程数据库、Redis 或对象存储时，mock 数据会直接导入远程环境，不再强制回退到 localhost / MinIO
- `setup:test` 仍会先执行 `infra:up`，但真正导入到哪里，仍以当前环境变量为准

## 环境区分

### `base`

只包含部署所需的最小可运行基础数据。

### `demo`

用于开发环境，包含演示文章、动态、榜单、互动等可视化内容。

### `mock`

用于测试 / E2E / 压测，包含大规模模拟数据。

## 测试账号

mock 数据导入后可使用：

```text
管理员账号：testadmin
管理员密码：TestAdmin#123
普通登录手机号：13800138000
短信验证码：888888
注册令牌：test_reg_001
```

## Playwright 说明

根目录 E2E 脚本默认依赖 `mock` 数据环境：

```bash
bun run test:e2e
bun run test:e2e:headed
```

执行流程：

1. 启动本地基础设施。
2. 重建 `mock` 数据环境。
3. 启动 dev server。
4. 运行 Playwright。

## 注意事项

- `db:reset:mock` 会清空数据库并刷新 Redis，属于破坏性操作。
- `test:e2e` 结束后数据库会停留在 `mock` 状态。
- 如果你要回到开发演示环境，请执行：

```bash
bun run db:reset:demo
```
