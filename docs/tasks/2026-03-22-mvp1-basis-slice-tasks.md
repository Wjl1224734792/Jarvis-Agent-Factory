# MVP 第1迭代基础骨架最小可运行切片任务拆分

## 1. 需求文档路径

- [PRD V1.0](/E:/CodeStore/feijia/docs/project/PRDs/%E9%A3%9E%E5%8A%A0%E7%BD%91%20-%20%E4%BA%A7%E5%93%81%E9%9C%80%E6%B1%82%E6%96%87%E6%A1%A3%20(PRD)%20V1.0.md)
- [Monorepo 技术栈与工程约束](/E:/CodeStore/feijia/docs/project/rules/Monorepo-%E6%8A%80%E6%9C%AF%E6%A0%88%E4%B8%8E%E5%B7%A5%E7%A8%8B%E7%BA%A6%E6%9D%9F%E8%AF%B4%E6%98%8E.md)
- [技术栈与工程约束](/E:/CodeStore/feijia/docs/project/rules/%E6%8A%80%E6%9C%AF%E6%A0%88%E4%B8%8E%E5%B7%A5%E7%A8%8B%E7%BA%A6%E6%9D%9F%E8%AF%B4%E6%98%8E.md)
- [MVP 第1-第6迭代清单](/E:/CodeStore/feijia/docs/project/mvp/MVP%20%E7%AC%AC1-%E7%AC%AC6%E8%BF%AD%E4%BB%A3%E6%B8%85%E5%8D%95.md)

## 2. 任务概览

本切片只做一条最小垂直链路：

`shared schema -> server health API -> web 页面展示`

同时补齐 monorepo 的最小工程底座，覆盖：

- `apps/web`
- `apps/admin`
- `apps/server`
- `packages/config`
- `packages/shared`
- `packages/schemas`
- `packages/http-client`

不在本切片内的内容：

- 登录、鉴权、用户体系
- 飞行器库、评分、发帖、评论
- 数据库、对象存储、Redis 的完整接入
- 复杂 UI 和业务页面

## 3. 任务分解列表

| 任务 ID | 名称 | 类型 | 优先级 | 完成标准 | 建议所有者 | 最小验证 |
|---|---|---|---|---|---|---|
| T1 | 根工作区与工程基线 | 直接开发 | P0 | 根目录完成 Bun workspace、包管理、基础脚本、目录占位和环境变量样板，仓库可以完成一次基础安装 | 主代理本地 | `bun install` 成功；根脚本可解析；workspace 识别正常 |
| T2 | 共享包基础与契约层 | TDD + 直接开发 | P0 | `packages/config`、`packages/shared`、`packages/schemas`、`packages/http-client` 具备稳定入口导出，且不依赖具体 app 内部实现；健康接口契约有统一 schema | 主代理本地 | `bun run check`；`packages/schemas` 的契约测试通过 |
| T3 | Server Health API | TDD | P0 | `apps/server` 可启动；`GET /health` 返回 200 和固定响应结构；错误返回结构最小统一 | 子实现代理 | `bun run --filter @feijia/server test`；`curl /health` 返回预期 JSON |
| T4 | Web 健康页展示 | 直接开发 + 冒烟验证 | P0 | `apps/web` 可启动；首页能请求并展示 health 状态；加载态和错误态不崩 | 子实现代理 | `bun run --filter @feijia/web dev`；浏览器打开可看到 health 信息 |
| T5 | Admin 最小壳 | 直接开发 | P1 | `apps/admin` 可启动并显示最小壳页面，不与 web/server 共享页面逻辑 | 子实现代理 | `bun run --filter @feijia/admin dev`；页面能正常加载 |
| T6 | 三端联调与交付说明 | 直接开发 | P0 | 三端启动方式、端口、环境变量和最小运行路径可复现，垂直链路可被一次性验证 | 主代理本地 | 启动 server/web/admin 后，`/health` 与 web 页面均可访问 |

## 4. DDD 分类

本切片没有强 DDD 任务。

原因是当前范围是工程骨架和契约层，不涉及复杂聚合、状态机、权限流转或跨对象一致性规则。`packages/schemas` 属于契约边界，不是业务域建模。

## 5. TDD 与直接开发分类

### 必须 TDD

- `T2` 中的健康接口契约 schema
- `T3` 的 `GET /health`

### 可以直接开发

- `T1` 根工作区与工程基线
- `T4` Web 最小展示页
- `T5` Admin 最小壳
- `T6` 三端联调和交付说明

### 可选补 TDD

- `packages/http-client` 的基础错误映射和响应包装

## 6. 风险任务

- `T1` 是高风险共享入口，任何 workspace、脚本、包名、端口约定一旦定错，后续所有 app 都会返工。
- `T2` 是共享契约层，任何字段命名和导出方式都可能影响 `apps/web`、`apps/admin`、`apps/server` 三端。
- `T3` 直接决定 `T4` 的消费方式，`server` 的响应结构必须先稳定。
- `T6` 涉及运行方式和环境变量说明，容易出现“代码已能跑，但别人无法复现”的问题。

## 7. 文件所有权和共享路径提醒

- `package.json`、`bunfig.toml`、`tsconfig.json`、根 `scripts/` 及 workspace 配置应由单一主代理负责，不要让多个子代理并行改。
- `packages/config`、`packages/schemas`、`packages/shared`、`packages/http-client` 属于共享路径，必须先收敛接口再分工。
- `apps/server` 和 `apps/web` 可以在共享契约稳定后并行实现，但不能在契约未定时并行抢改。
- `apps/admin` 与本切片主链路耦合最低，可以后置给子实现代理。

## 8. 推荐交付顺序

1. 先做 `T1`，把 workspace 和基础脚手架固定下来。
2. 再做 `T2`，先把共享契约和工具层定住。
3. 然后做 `T3`，把 `server` 的 health API 固化。
4. 接着做 `T4`，让 `web` 消费 health API。
5. 并行补 `T5`，只做最小 `admin` 壳。
6. 最后做 `T6`，统一跑通三端和文档。

## 9. 推荐的下一步

把这份任务拆分交给 `planner`，由 `planner` 继续补：

- 文件级执行顺序
- 子代理分配
- 验证命令清单
- 风险回滚点

