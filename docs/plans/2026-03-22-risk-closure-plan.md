# 阶段一/二风险收口计划

## 1. 需求文档路径

- `E:/CodeStore/feijia/docs/project/PRDs/飞加网 - 产品需求文档 (PRD) V1.0.md`
- `E:/CodeStore/feijia/docs/project/mvp/MVP 第1-第6迭代清单.md`
- `E:/CodeStore/feijia/docs/project/mvp/mvp-roadmap.md`
- `E:/CodeStore/feijia/docs/project/rules/Monorepo-技术栈与工程约束说明.md`
- `E:/CodeStore/feijia/docs/project/rules/技术栈与工程约束说明.md`

## 2. 任务文档路径

- `E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/tasks/2026-03-22-mvp2-auth-identity-tasks.md`
- `E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/requirements/2026-03-22-auth-identity-design.md`

## 3. 当前轮次目标

补齐第 1/2 阶段缺失的数据底座，让认证体系和第 3 阶段飞行器库都建立在真实 PostgreSQL + Drizzle 数据层之上。

## 4. 当前轮次范围

- 新增 `packages/db`
- 建立 Drizzle 配置、schema 入口、db client
- 落最小表结构：
  - `users`
  - `sessions`
  - `aircraft_categories`
  - `brands`
  - `aircraft_models`
- 补 migration 与最小 seed
- 将 `apps/server` 认证仓储从内存实现切换为数据库实现
- 保持现有 `web/admin` 接口契约稳定

## 5. 非范围

- 不做 `packages/storage`
- 不做 MinIO / 文件上传
- 不做 OpenAPI 完整化
- 不做第 3 阶段页面、列表、详情、后台管理界面
- 不做复杂权限模型，仅保持当前 `user/admin`

## 6. 完成标准

- `packages/db` 可被 `apps/server` 正常引用
- 数据表、迁移、seed 可在本地 PostgreSQL 上执行
- `apps/server` 认证读写基于数据库而非内存
- 现有第 2 阶段认证测试仍通过，且增加至少一条数据库相关验证
- 第 3 阶段所需的分类/品牌/机型基础表已具备稳定入口

## 7. 是否需要先查阅 repo_explorer

不需要。当前仓库边界已清楚，风险收口集中在共享数据层和服务端认证仓储。

## 8. 执行代理分工

- 主代理：
  - `packages/db`
  - Drizzle 配置、schema、migration、seed
  - `packages/schemas` 如需最小扩展时的唯一收敛
  - `apps/server` auth repo 持久化切换
- `backend_implementer`：
  - 在主代理完成 `packages/db` 基线后，可接手 `apps/server` 里与机型基础表读取相关的低耦合整理
- `frontend_implementer`：
  - 本轮不介入。前端不应在数据层未稳定时并行改动

## 9. 共享区域改动归属

以下区域必须由主代理唯一负责，不能并行抢改：

- 根 `package.json` / `bunfig.toml` / `tsconfig.json`
- `packages/db/**`
- `packages/schemas/**`
- `apps/server/src/modules/auth/**`
- 数据库 migration / seed 目录

## 10. 工作区推荐

- `worktree`

原因：
- 当前目录已有未提交内容
- 本轮涉及共享包、数据库结构、认证仓储，风险高
- 收口后紧接第 3 阶段，继续保留独立工作区更稳

## 11. 风险提醒

- 认证仓储从内存切到数据库时，最容易破坏现有 cookie 会话测试
- 若表结构一次铺太多，会扩大范围并拖慢第 3 阶段启动
- migration/seed 若与本地 PostgreSQL 环境约定不清，会导致“代码能过，环境跑不通”
- 若在本轮改动前端契约，会把风险从数据层扩散到三端

## 12. 实现者交接信息

- 先保证 `users/sessions` 稳定，再补 `aircraft_categories/brands/aircraft_models`
- 机型基础表只做第 3 阶段必需字段，不提前铺完整业务列
- migration 与 seed 必须可重复执行
- 认证接口返回结构保持当前不变，避免前端返工

## 13. 推荐的下一步

1. 先由主代理创建 `packages/db` 与最小 schema
2. 迁移与 seed 跑通后，切换 `apps/server` 认证仓储到数据库
3. 运行认证测试、类型检查、构建
4. 收口完成后再进入第 3 阶段，并使用 `spawn` 拆分前后端开发
