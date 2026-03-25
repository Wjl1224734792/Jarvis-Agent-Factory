# @feijia/admin

管理端单页应用：与 `web` 相同技术栈（Vite + React 19 + React Router + Zustand），端口 **3001**。

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
    │   └── api-client.ts
    └── features/
        └── auth/
            ├── auth-store.ts
            ├── admin-login-page.tsx
            ├── admin-overview-page.tsx
            ├── admin-protected-route.tsx
            ├── admin-shell.tsx
            └── use-bootstrap-admin-auth.ts
```

## 结构要点

- **入口**：`src/main.tsx`、`src/app.tsx`。
- **鉴权与管理壳**：`src/features/auth/*`（管理员登录、受保护路由、`admin-shell`、概览页等）。
- **API**：`src/lib/api-client.ts`（与 web 类似，指向后端）。

## 依赖

- `@feijia/http-client`、`@feijia/schemas`、`@feijia/shared`。

## 编辑指引

- 与 `apps/web` 共享约定：合约以 `schemas` 为准；避免复制粘贴大段 API 逻辑，可优先考虑在 `http-client` 中收敛。
