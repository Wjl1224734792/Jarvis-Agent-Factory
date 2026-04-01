# @feijia/admin

管理端 SPA：与 `web` 相同技术栈，端口见 `APP_PORTS.admin`。

## 功能要点

- 路由：`features/<域>/`，路径与 `APP_ROUTES.admin*` 对齐
- 接口：`api-client` + React Query

## 依赖

`@feijia/http-client` `@feijia/schemas` `@feijia/shared`

## 编辑指引

- 新功能放 `features/<域>/`
- 与 `web` 共享 `http-client`，避免重复