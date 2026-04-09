# Docker 本地基础设施

本目录维护飞加本地开发所需的基础设施：PostgreSQL、Redis、MinIO。推荐从仓库根目录通过 `bun run infra:*` 统一管理。

## 目录结构

```text
docker/
├─ database/docker-compose.yml
├─ redis/docker-compose.yml
└─ storage/docker-compose.yml
```

## 推荐用法

### 一键启动全部服务

```bash
bun run infra:up
```

### 查看服务状态

```bash
bun run infra:ps
```

### 停止服务

```bash
bun run infra:down
```

## 等价的 `docker compose` 命令

### 启动

```bash
docker compose -f docker/database/docker-compose.yml up -d
docker compose -f docker/redis/docker-compose.yml up -d
docker compose -f docker/storage/docker-compose.yml up -d
```

### 查看状态

```bash
docker compose -f docker/database/docker-compose.yml ps
docker compose -f docker/redis/docker-compose.yml ps
docker compose -f docker/storage/docker-compose.yml ps
```

### 停止

```bash
docker compose -f docker/database/docker-compose.yml down
docker compose -f docker/redis/docker-compose.yml down
docker compose -f docker/storage/docker-compose.yml down
```

## 默认连接信息

以下默认值与根目录 [`.env.example`](../.env.example) 保持一致：

| 服务 | 连接方式 | 用户名 | 密码 |
|------|----------|--------|------|
| PostgreSQL | `postgres://feijia_dev:F3j%21a_D3v_2026%23pg@localhost:5432/feijia` | `feijia_dev` | `F3j!a_D3v_2026#pg` |
| Redis | `redis://:F3j%21a_D3v_2026%23rd@localhost:6379/0` | - | `F3j!a_D3v_2026#rd` |
| MinIO API | `http://localhost:9000` | `minioadmin` | `minioadmin123` |
| MinIO Console | `http://localhost:9001` | `minioadmin` | `minioadmin123` |

说明：

- PostgreSQL 和 Redis 的连接串里对密码做了 URL 编码，便于直接写入环境变量。
- 如果你修改了 Compose 文件中的账号、密码、端口或卷，记得同步更新 `.env.example` 与根 README。

## 常见开发流程

### 首次本地初始化

```bash
bun run infra:up
bun run setup:dev
```

### 导入海量测试数据

```bash
bun run setup:test-data
```

## 数据持久化

所有服务使用 Docker 命名卷持久化数据：

- `postgres_data`：PostgreSQL 数据
- `redis_data`：Redis 数据
- `minio_data`：MinIO 对象数据
- `minio_config`：MinIO 配置

## 故障排查

### 端口冲突

修改对应 `docker-compose.yml` 中的端口映射，并同步更新 `.env.example` 与文档。

### 彻底重建本地数据（会丢失数据）

```bash
docker compose -f docker/database/docker-compose.yml down -v
docker compose -f docker/redis/docker-compose.yml down -v
docker compose -f docker/storage/docker-compose.yml down -v
bun run infra:up
```

### 查看日志

```bash
docker compose -f docker/database/docker-compose.yml logs -f
docker compose -f docker/redis/docker-compose.yml logs -f
docker compose -f docker/storage/docker-compose.yml logs -f
```

## 安全提示

- 这些默认账号密码只用于本地开发。
- 生产环境必须替换所有默认密码与密钥。
- 不要把本地 Compose 暴露到公网。
