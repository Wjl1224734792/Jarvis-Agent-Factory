# @feijia/admin

管理端单页应用：与 `web` 相同技术栈（Vite + React 19 + React Router + Zustand + TanStack Query）；端口见 `APP_PORTS.admin`。

## 目录架构

```
apps/admin/
├── AGENTS.md
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── app.tsx
    ├── styles.css
    ├── lib/
    │   ├── api-client.ts
    │   └── query-client.ts
    └── features/
        ├── auth/               # 管理员登录、壳布局、受保护路由、概览
        ├── models/             # 分类、品牌、机型列表
        ├── posts/              # 帖子与评论管理
        └── reviews/            # 评测审核等
```

## 功能要点

- **入口与路由**：`app.tsx` / `main.tsx` 挂载管理端路由（路径与 `APP_ROUTES.admin*` 对齐）。
- **数据**：`api-client` + `query-client`，调用 `server` 的管理端接口；合约以 `schemas` 为准。

## 依赖

- `@feijia/http-client`、`@feijia/schemas`、`@feijia/shared`。

## 编辑指引

- 与 `apps/web` 共享约定：公共 API 封装优先收敛在 `http-client`，避免大段重复。
- 新增管理功能时放在 `features/<域>/`，路由与 `API_ROUTES` / `APP_ROUTES` 保持一致。
