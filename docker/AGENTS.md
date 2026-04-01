# Docker 本地基础设施

本地开发环境依赖服务配置。

## 服务

- `database/`：PostgreSQL
- `redis/`：Redis
- `storage/`：MinIO

## 命令

```bash
# 启动
cd database && docker-compose up -d
cd redis && docker-compose up -d
cd storage && docker-compose up -d

# 停止
cd database && docker-compose down
cd redis && docker-compose down
cd storage && docker-compose down
```

## 约束

- 仅本地开发用
- 使用数据卷持久化
- 启动顺序：database → redis → storage