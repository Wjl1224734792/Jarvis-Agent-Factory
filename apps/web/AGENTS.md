# @feijia/web

用户端 SPA：Vite + React 19 + React Router + TanStack Query + Zustand + shadcn/ui。

## 功能要点

- 路由：`routes/` 目录，路径与 `@feijia/shared.APP_ROUTES` 对齐
- 状态：Zustand store
- 接口：`api-client` + React Query，类型来自 `@feijia/schemas`

## 依赖

`@feijia/http-client` `@feijia/schemas` `@feijia/shared`

## 编辑指引

- 新页面放 `routes/` 或 `features/<域>/`
- 端口：`APP_PORTS.web`（默认 3000）