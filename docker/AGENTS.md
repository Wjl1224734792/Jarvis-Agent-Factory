# docker/AGENTS.md

适用于 `docker/*`。

## 作用

- 只维护本地开发基础设施：
  - PostgreSQL
  - Redis
  - MinIO

## 修改要求

- 优先通过仓库根脚本操作：

```bash
bun run infra:up
bun run infra:ps
bun run infra:down
```

- 如果必须直接执行 Compose，使用 `docker compose -f ...`，不要继续写 `docker-compose`。
- 调整端口、账号、密码、卷、服务名或健康检查后，必须同步更新：
  - [`.env.example`](../.env.example)
  - [`README.md`](../README.md)
  - [`docker/README.md`](./README.md)
- 不要把生产部署、云资源编排或 CI/CD 逻辑塞进这里。
