# Docker 本地基础设施

飞加网开发环境依赖服务：PostgreSQL、Redis、MinIO。

## 快速开始

### 启动 PostgreSQL (必需)

```bash
cd docker/database
docker-compose up -d
```

### 启动 Redis (可选)

```bash
cd docker/redis
docker-compose up -d
```

### 启动 MinIO (可选)

```bash
cd docker/storage
docker-compose up -d
```

### 一键启动所有服务

```bash
cd docker/database && docker-compose up -d
cd ../redis && docker-compose up -d
cd ../storage && docker-compose up -d
```

## 查看服务状态

```bash
cd docker/database && docker-compose ps
cd ../redis && docker-compose ps
cd ../storage && docker-compose ps
```

## 停止服务

```bash
cd docker/database && docker-compose down
cd ../redis && docker-compose down
cd ../storage && docker-compose down
```

## 默认配置

| 服务 | 地址/连接 | 用户名 | 密码 |
|------|----------|--------|------|
| PostgreSQL | `postgres://localhost:5432/feijia` | user | qwertyuiop |
| Redis | `localhost:6379` | - | qwertyuiop |
| MinIO API | `http://localhost:9000` | minioadmin | minioadmin123 |
| MinIO Console | `http://localhost:9001` | minioadmin | minioadmin123 |

## 数据持久化

所有服务使用 Docker 命名卷持久化数据：

- `postgres_data` - PostgreSQL 数据
- `redis_data` - Redis 数据
- `minio_data` - MinIO 对象数据
- `minio_config` - MinIO 配置

## 故障排查

### 端口冲突

修改 compose 文件中的端口映射：

```yaml
ports:
  - "5433:5432"  # 改为其他端口
```

### 重置数据（⚠️ 会丢失数据）

```bash
docker-compose down -v
docker-compose up -d
```

### 查看日志

```bash
docker-compose logs -f
```

## 安全提示

⚠️ **生产环境注意事项**

- 修改所有默认密码
- 不要暴露 Docker 端口到公网
- 使用强密码和密钥
- 定期备份数据
