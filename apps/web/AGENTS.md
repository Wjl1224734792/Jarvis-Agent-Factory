# @feijia/web AGENTS

## 作用

- 用户端 Web 前端。

## 修改要求

- 页面优先放 `routes/*`
- 复杂业务拆到 `features/*`
- 接口统一走 `@feijia/http-client`
- 类型统一复用 `@feijia/schemas`
- 路径对齐 `@feijia/shared.APP_ROUTES`
- 不要在页面里硬编码后端返回结构
