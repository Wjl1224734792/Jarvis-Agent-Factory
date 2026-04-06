# apps/AGENTS.md

适用于 `apps/*`。

## 目录边界

- `apps` 只消费 `packages/*`。
- 不要在 `apps` 内定义可复用协议并让 `packages` 反向依赖。
- 不要恢复 `apps/mobiles`。

## 当前成员

- `web`
- `admin`
- `server`

## 修改要求

- 改 API 时，先看共享协议和路由常量。
- 路径常量优先对齐 `@feijia/shared`。
- 不要在应用层硬编码共享数据结构。
