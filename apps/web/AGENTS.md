# @feijia/web AGENTS

## 作用

- 用户端 Web 前端。
- 入口文件：`src/main.tsx`、`src/app.tsx`。

## 当前结构

- 页面与路由优先放 `src/routes/*`
- 复用业务逻辑优先放 `src/features/*`
- 通用组件优先放 `src/components/*`
- 共享 hooks 优先放 `src/hooks/*`
- 状态管理优先放 `src/store/*`
- 基础工具优先放 `src/lib/*`

## 修改要求

- 接口统一走 `@feijia/http-client`。
- 类型统一复用 `@feijia/schemas`。
- 路径常量对齐 `@feijia/shared`。
- 不要在页面里散落请求细节、鉴权协议和后端返回结构适配。
- 如果 `web` 与 `admin` 出现重复逻辑，优先上提到 `packages/*`，不要在两个应用里各写一份。
