# apps/AGENTS.md

适用于 `apps/*`。

## 当前成员

- `web`
- `admin`
- `server`

不要恢复 `apps/mobiles`。

## 目录边界

- `apps` 只消费 `packages/*`，不要让 `packages` 反向依赖 `apps`。
- 共享协议优先放 `packages/schemas`。
- 路由常量与共享常量优先放 `packages/shared`。
- 请求封装优先复用 `packages/http-client`。
- 数据库访问优先通过 `packages/db` 与服务端模块完成。

## 修改要求

- 改 API 或共享契约时，先检查 `packages/schemas`、`packages/http-client`、`packages/shared` 和受影响的 app。
- 不要在应用层硬编码共享结构、路由常量、鉴权约定和接口路径。
- 新增页面或模块时，优先沿用各 app 现有目录结构与命名方式。
- `web` 与 `admin` 之间出现重复逻辑时，优先上提到 `packages/*`，不要相互复制。
