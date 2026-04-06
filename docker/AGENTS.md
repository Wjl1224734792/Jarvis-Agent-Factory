# docker AGENTS

## 作用

- 只维护本地开发基础设施：
  - PostgreSQL
  - Redis
  - MinIO

## 修改要求

- 端口、账号、密码调整后，必须同步更新 `.env.example` 和 README。
- 优先使用根脚本：

```bash
bun run infra:up
bun run infra:ps
bun run infra:down
```

- 不要把生产部署逻辑塞进这里。
