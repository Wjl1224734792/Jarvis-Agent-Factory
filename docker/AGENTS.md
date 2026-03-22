# Docker 本地基础设施

本地开发环境依赖服务配置。

## 服务列表

- **PostgreSQL**：数据库（database/）
- **Redis**：缓存（redis/）
- **MinIO**：对象存储（storage/）

## 目录结构

```
docker/
├── database/
│   └── docker-compose.yml
├── redis/
│   └── docker-compose.yml
├── storage/
│   └── docker-compose.yml
└── AGENTS.md
```

## 启动服务

```bash
cd database && docker-compose up -d
cd redis && docker-compose up -d
cd storage && docker-compose up -d
```

## 停止服务

```bash
cd database && docker-compose down
cd redis && docker-compose down
cd storage && docker-compose down
```

## 查看状态

```bash
cd database && docker-compose ps
cd redis && docker-compose ps
cd storage && docker-compose ps
```

## 开发约束

- 仅用于本地开发环境
- 不保存业务密钥或生产凭据
- 默认密码仅用于本地开发
- 使用数据卷避免重启丢数据
- 启停顺序：database → redis → storage
- 端口冲突时检查本机占用

## 安全要求

- 不要暴露到公网
- 定期更新镜像版本
- 备份恢复流程需可演练

---

**仅用于本地开发，生产环境使用云服务**
