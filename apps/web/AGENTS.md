# @feijia/web

用户端单页应用：Vite + React 19 + React Router + TanStack Query + Zustand。

## 目录架构

```
apps/web/
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
    ├── store/
    │   └── use-app-shell-store.ts
    ├── routes/
    │   └── home-page.tsx
    └── features/
        └── auth/
            ├── auth-store.ts
            ├── login-page.tsx
            ├── profile-page.tsx
            ├── protected-route.tsx
            ├── use-bootstrap-auth.ts
            ├── user-menu.tsx
            └── web-layout.tsx
```

## 结构要点

- **入口**：`src/main.tsx`、`src/app.tsx`（路由与布局挂载）。
- **鉴权**：`src/features/auth/*`（登录、受保护路由、会话引导、`auth-store`）。
- **数据**：`src/lib/api-client.ts` 对接后端；`src/lib/query-client.ts` 配置 React Query。

## 依赖

- `@feijia/http-client`、`@feijia/schemas`、`@feijia/shared`。

## 编辑指引

- 默认开发端口 **3000**（见 `package.json` scripts）。
- 新增页面优先放在 `routes/` 或 `features/` 下，与现有 auth 模式保持一致。
