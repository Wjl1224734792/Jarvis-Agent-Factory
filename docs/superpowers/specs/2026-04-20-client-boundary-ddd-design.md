# 共享 Client / 契约边界收口 DDD 设计

## 背景

当前仓库已经存在三层 API client 事实实现：

1. `packages/http-client/src/index.ts`
2. `apps/web/src/lib/api-client.ts`
3. `apps/admin/src/lib/api-client.ts`

名义上 `packages/http-client` 应该承担共享 typed client，但实际业务读模型、错误处理、认证刷新、DTO 映射和局部 `fetch` 仍散落在 Web/Admin 本地包装层，导致以下问题：

- 业务边界不清：同一个“接口能力”到底属于共享 client 还是应用本地 wrapper，没有稳定标准。
- 契约漂移风险高：共享包和 app 本地 DTO 可以分别演化。
- 错误语义分裂：底层错误码、重试语义、鉴权失效、用户提示文案没有清晰层次。
- 测试困难：一处协议变更可能需要同时验证 package、web、admin 三层。

这与全仓审查报告中识别出的 `P0-1` 问题一致。

## 目标

把 `packages/http-client` 收口为**唯一业务 client 边界**，同时让 `apps/web` 和 `apps/admin` 保留**极薄的运行时适配层**。

收口后的系统应满足：

- 所有业务接口的“请求/响应契约”和“业务读模型”在 `packages/http-client` 里是唯一来源。
- `apps/web` / `apps/admin` 不再定义与业务接口等价的 DTO、列表项类型或二次 `fetch` helper。
- 应用层仍可保留极薄的运行时适配：
  - base URL 解析
  - auth invalid 事件派发
  - token refresh（仅 Web）
  - 用户提示文案映射
  - 少量 UI 专属 header 注入（如 view session）

## 非目标

- 本轮不直接重做服务端 API。
- 不在本轮重构页面组件或 React hooks。
- 不在本轮顺带处理 `packages/schemas` 与 `packages/shared` 的所有职责问题。
- 不在本轮处理推荐/搜索排序实现。

## 方案选项

### 方案 A：`packages/http-client` 成为唯一业务 client 边界，app 只保留薄适配层

优点：

- 业务契约唯一来源，最能解决漂移问题。
- 后续测试可以以 package 为中心做分层覆盖。
- Web/Admin 可以共享更多业务读模型和接口行为。

缺点：

- 需要把一部分现有 Web/Admin 本地方法和类型搬回 package。
- 需要清晰拆分“业务错误语义”和“用户提示文案”。

### 方案 B：保留 Web/Admin 各自的领域 client，但它们必须构建在共享传输内核之上

优点：

- 改动相对小。
- 对现有页面改动冲击较低。

缺点：

- 业务 DTO 和聚合读模型仍可能分散。
- 只能缓解，不能真正消除边界漂移。

### 方案 C：继续维持现状，只补规则和文档

优点：

- 成本最低。

缺点：

- 不能解决当前的结构性问题。
- 只会继续积累债务。

## 推荐方案

选择**方案 A**。

原因：

- 当前问题的根源就是“唯一业务边界缺失”，而不是“文档不够”。
- Web/Admin 已经都依赖共享 client；继续维持双层业务模型没有长期价值。
- 方案 A 与路线图里的 `needs_ddd_first` 完全一致，适合作为后续实现的清晰起点。

## 领域边界设计

### 1. `packages/http-client` 的职责

`packages/http-client` 负责：

- 所有业务接口方法
- 所有业务读模型与返回类型
- 请求参数序列化
- 查询字符串拼装
- 响应 schema 校验
- 通用 `ApiClientError` 结构
- 通用错误分类信息：
  - `code`
  - `status`
  - `retryable`
  - `authInvalid`

`packages/http-client` 不负责：

- `window.location` / 运行环境探测
- Web token refresh 时机
- Admin/Web 的 auth invalid 事件派发
- 中文用户提示文案翻译
- React Query / Zustand / Router 之类 UI 状态集成

### 2. `apps/web/src/lib/api-client.ts` 的职责

Web 适配层只负责：

- 解析 Web 运行时 base URL
- 注入 Web 会话刷新逻辑
- 把 package 抛出的通用错误映射成 Web 用户提示文案
- 派发 Web auth invalid 事件
- 注入 Web 专属 header，例如 view session

Web 适配层不再负责：

- 定义业务 DTO
- 自行实现业务接口
- 对共享 client 方法做等价业务重写

### 3. `apps/admin/src/lib/api-client.ts` 的职责

Admin 适配层只负责：

- 解析 Admin 运行时 base URL
- 派发 Admin auth invalid 事件
- 统一 admin 侧错误落地行为

Admin 适配层不再负责：

- 自定义 `AdminRanking*`、`SiteSettings` 之类业务 DTO
- 通过原始 `fetch` 实现共享接口的业务版本
- 在本地重建“官方榜单/评分对象/消息中心”等业务读模型

## 分层模型

建议把共享 client 逻辑分成三层概念，但不要求一步拆成多个文件：

1. `Transport Layer`
   - `fetch`
   - `readJson`
   - `parseApiError`
   - 基础错误对象

2. `Contract Layer`
   - 各接口输入 schema / 输出 schema
   - query builder
   - path builder

3. `Business Client Layer`
   - 面向业务域导出的 client 方法
   - 这些方法输出的类型就是 Web/Admin 共用的业务读模型

## 关键约束

### 约束 1：业务类型只在一个地方定义

凡是“接口返回给页面直接消费”的业务读模型，必须只在 `packages/http-client` 或其直接依赖的 `packages/schemas` 中定义一次。

Web/Admin 只允许：

- `Awaited<ReturnType<typeof sharedClient.xxx>>`
- `type X = SharedType & UiOnlyState`

但不允许重新造一个等价的业务接口 DTO。

### 约束 2：错误要分两层

共享层输出的是**程序语义错误**，应用层输出的是**用户提示文案**。

共享层负责：

- 这是 `BAD_REQUEST` 还是 `UNAUTHORIZED`
- 是否可重试
- 是否 auth 失效

应用层负责：

- 给用户展示什么文案
- 是否弹登录框
- 是否 toast / modal

### 约束 3：运行时适配必须是薄层

应用层 wrapper 可以存在，但必须满足：

- 不定义业务 DTO
- 不新造业务语义
- 不重新写一遍共享接口
- 只做环境、鉴权、提示、header 注入

## 现状到目标的迁移路径

### Phase 1：边界冻结

- 停止在 `apps/web/src/lib/api-client.ts`、`apps/admin/src/lib/api-client.ts` 新增业务 DTO。
- 新增接口一律先进入 `packages/http-client`。

### Phase 2：共享读模型回迁

优先回迁这些高风险区域：

- brand applications
- rankings / rating targets
- site settings
- admin messages / moderation todos
- official articles / admin posts

判断标准：

- 只要 Web/Admin 都可能消费，或者该模型是业务接口真实返回值，就不应继续停留在 app 本地。

### Phase 3：薄适配层化

把 Web/Admin 本地 client 缩成：

- `createRuntimeClient(sharedClient, runtimeHooks)`
- 或等价的薄包装模式

确保本地文件只剩：

- base URL
- auth invalid dispatch
- refresh strategy
- user-facing error text

### Phase 4：验证收口

需要的测试层次：

- `packages/http-client`
  - 契约级测试
  - 错误语义测试
- `apps/web`
  - refresh / auth invalid / 文案映射测试
- `apps/admin`
  - auth invalid / 管理端错误映射测试

## 对实现阶段的约束分类

### `needs_ddd_first`

- 共享 client / 契约边界收口本身

### `must_tdd`

- `packages/http-client` 的契约回迁
- 错误语义统一
- Web refresh 行为保序
- Admin auth invalid 行为保持

### `can_direct_dev`

- 纯本地 type alias 删除
- 薄包装层内部的小型重命名与文件拆分

### `plan_patch_required`

- 如果实现中确认还需要同步调整：
  - `packages/schemas` 的职责边界
  - `packages/shared` 的导航协议归属
  - 服务端错误码新增/变更

## 风险

- 如果一次性把所有本地 wrapper 逻辑都搬回 package，容易把运行时适配和业务语义重新耦合到一起。
- 如果收口不彻底，只做“形式上调用 sharedClient”，但业务 DTO 继续留在 app，本质问题不会解决。
- Admin 里仍有一些历史兼容逻辑，不能在没有契约测试的前提下硬删。

## 推荐的后续动作

1. 基于本规格写一份实施计划
2. 第一批实施只挑一个高价值垂直切片试点
   - 推荐：`brand applications + site settings`
3. 第二批再进入 `rankings / rating targets / admin messages`

## 规格自检

- 未留占位符
- 已明确推荐方案与非目标
- 已定义 package / web / admin 三层职责
- 已给出迁移路径和测试分类
