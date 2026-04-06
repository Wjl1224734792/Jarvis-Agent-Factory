# @feijia/admin AGENTS

## 作用

- 管理端前端。
- 负责后台运营、审核、配置管理。

## 修改要求

- 接口调用统一走 `@feijia/http-client`。
- 类型统一复用 `@feijia/schemas`。
- 新功能优先放 `features/*`。
- 不要把请求细节散落到页面里。
- 与 `web` 共用的逻辑优先上提到 `packages/*`。
