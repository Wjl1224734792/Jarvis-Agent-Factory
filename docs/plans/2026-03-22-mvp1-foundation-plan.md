# MVP 第1迭代最小骨架计划

## 1. 需求文档路径

- `E:/CodeStore/feijia/docs/project/PRDs/飞加网 - 产品需求文档 (PRD) V1.0.md`
- `E:/CodeStore/feijia/docs/project/rules/Monorepo-技术栈与工程约束说明.md`
- `E:/CodeStore/feijia/docs/project/rules/技术栈与工程约束说明.md`

## 2. 任务文档路径

- `E:/CodeStore/feijia/docs/project/mvp/mvp-roadmap.md`
- `E:/CodeStore/feijia/docs/project/mvp/MVP 第1-第6迭代清单.md`
- `E:/CodeStore/feijia/docs/workflows/workflow.md`

## 3. 当前轮次目标

在空仓库中搭建 Bun Workspace monorepo 最小骨架，覆盖 `apps/web`、`apps/admin`、`apps/server`、`packages/config`、`packages/shared`、`packages/schemas`、`packages/http-client`，并打通 `shared schema -> server health API -> web 页面展示` 的最短垂直链路。

## 4. 当前轮次范围

- 新建根级 Bun Workspace、TypeScript 基线、基础脚本。
- 新建 `apps/web`、`apps/admin`、`apps/server` 最小可运行应用壳。
- 新建 `packages/config`、`packages/shared`、`packages/schemas`、`packages/http-client` 最小共享包。
- 建立统一健康检查契约与 API 调用链路。
- 为后续迭代预留 `apps/mobiles` 目录占位。
- 补齐 `.env.example` 与最小开发说明。

## 5. 非范围

- 不实现登录、注册、鉴权、数据库、对象存储、Redis、OpenAPI 完整能力。
- 不实现 `packages/ui`、`packages/db`、`packages/storage`。
- 不实现任何业务页面、业务模块、后台管理功能。
- 不补齐完整 lint、test、playwright 体系，只做当前骨架所需的最小验证。

## 6. 完成标准

- `bun install` 可在根目录成功安装依赖。
- `apps/web`、`apps/admin`、`apps/server` 均可启动。
- `apps/server` 提供健康检查接口，并使用 `packages/schemas` 中的共享契约。
- `apps/web` 通过 `packages/http-client` 成功请求该接口并渲染结果。
- 共享包边界、依赖方向和根脚本已经固定，后续可直接继续迭代。

## 7. 是否需要先查阅 repo_explorer

不需要额外查阅。当前仓库已经确认是文档仓库，核心信息已足够支撑本轮初始化。

## 8. 分步骤执行顺序

1. 由主代理创建根级工作区与共享基线文件。
2. 由主代理创建共享包：`config`、`shared`、`schemas`、`http-client`。
3. 由主代理创建 `apps/server`，先落健康检查契约和接口。
4. 由主代理创建 `apps/web`，接通健康检查展示。
5. 由主代理创建 `apps/admin` 与 `apps/mobiles` 占位壳。
6. 运行安装、类型检查、构建与最小运行验证。
7. 再决定是否拆分后续前后端实现代理。

## 9. 执行代理分工

- 主代理：
  - 根级配置
  - workspace 与脚本
  - 所有共享包
  - `apps/server` 健康检查接口
  - `apps/web` 健康检查展示
  - 文档与验证
- `frontend_implementer`：
  - 本轮不单独拆出，避免与共享配置和前端入口产生冲突。
- `backend_implementer`：
  - 本轮不单独拆出，原因同上。

## 10. 共享区域改动归属

以下区域必须由主代理先落地，且本轮保持唯一责任方：

- 根目录 `package.json`、`bunfig.toml`、`tsconfig*.json`
- `packages/config`
- `packages/shared`
- `packages/schemas`
- `packages/http-client`
- 根级 `.env.example`

原因：

- 这些文件决定工作区边界、依赖解析、类型路径和共享契约。
- 若先并行实现，前后端会在入口、脚本、别名、契约层发生冲突。

## 11. 文件/目录所有权建议

- 根目录：主代理唯一所有。
- `packages/*`：主代理唯一所有，直到共享边界稳定。
- `apps/server`：当前由主代理所有；后续进入业务域后可交给 `backend_implementer`。
- `apps/web`：当前由主代理所有；后续进入业务页面后可交给 `frontend_implementer`。
- `apps/admin`：当前仅壳层，占位即可，仍由主代理所有。
- `apps/mobiles`：占位目录，无需实现代理介入。

## 12. 工作区推荐

推荐 `current-directory`。

理由：

- 当前是从空仓库初始化，不存在复杂历史代码冲突。
- Git 工作区干净。
- 本轮共享区域集中，单代理串行更稳。

## 13. 建议的验证命令序列

1. `bun install`
2. `bun run typecheck`
3. `bun run build`
4. 单独启动服务端并确认健康检查：
   - `bun run dev:server`
5. 单独启动前端并人工确认页面能读取健康检查结果：
   - `bun run dev:web`
6. 单独启动后台壳确认无基础报错：
   - `bun run dev:admin`

## 14. 主要风险

- Vite、Hono、workspace 依赖版本若选型不当，会导致首次安装或类型检查失败。
- Windows 路径与 workspace 脚本可能带来启动命令兼容性问题。
- 若过早把 `admin` 做成完整模板，会无谓扩大本轮范围。
- 若共享契约设计过重，会把简单健康检查链路复杂化。

## 15. 实现者交接信息

- 以最小骨架优先，不补业务功能。
- 所有共享类型优先从 `packages/schemas` 导出。
- `web` 和 `admin` 都走 React + Vite；`server` 走 Hono + Bun。
- `http-client` 只做健康检查所需的最小请求封装，不提前抽象业务 SDK。
- 文档与脚本命名保持后续可扩展，但不要提前铺设无用目录。

## 16. 推荐的下一步

按本计划直接实现根级 workspace、共享契约、服务端健康检查与前端展示链路。
