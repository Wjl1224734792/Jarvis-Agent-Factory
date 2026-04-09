# @feijia/admin AGENTS

## 作用

- 管理端前端。
- 入口文件：`src/main.tsx`、`src/app.tsx`。

## 当前结构

- 管理台业务页面优先放 `src/features/*`
- 通用组件优先放 `src/components/*`
- 请求封装、路由常量、查询客户端与公共工具优先放 `src/lib/*`
- 静态资源放 `src/assets/*`

## 修改要求

- 接口调用统一走 `@feijia/http-client`。
- 类型统一复用 `@feijia/schemas`。
- 不要把请求细节、鉴权流程和接口适配散落到页面组件里。
- 与 `web` 共用的协议、常量或可抽象逻辑，优先上提到 `packages/*`。
