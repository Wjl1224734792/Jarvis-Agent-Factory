# MVP 第1迭代最小切片执行计划

1. 需求文档路径
- `E:/CodeStore/feijia/docs/project/PRDs/飞加网 - 产品需求文档 (PRD) V1.0.md`
- `E:/CodeStore/feijia/docs/project/rules/Monorepo-技术栈与工程约束说明.md`
- `E:/CodeStore/feijia/docs/project/rules/技术栈与工程约束说明.md`
- `E:/CodeStore/feijia/docs/project/mvp/MVP 第1-第6迭代清单.md`

2. 任务文档路径
- `E:/CodeStore/feijia/docs/tasks/2026-03-22-mvp1-basis-slice-tasks.md`

3. 当前轮次目标
- 从文档仓库落地 MVP 第1迭代最小可运行骨架。
- 打通 `shared schema -> server health API -> web 页面展示`。

4. 当前轮次范围
- 根 Bun workspace、根脚本、根 TypeScript 与测试基线。
- `apps/web`、`apps/admin`、`apps/server` 最小可运行壳。
- `packages/config`、`packages/shared`、`packages/schemas`、`packages/http-client`。
- `.env.example` 与最小启动说明。

5. 非范围
- 登录、鉴权、数据库、Redis、MinIO。
- 飞行器库、评分、帖子、评论。
- `packages/ui`、`packages/db`、`packages/storage`。

6. 完成标准
- `bun install` 成功。
- `apps/server` 提供稳定的 `/health`。
- `apps/web` 首页能展示 health 结果。
- `apps/admin` 能独立启动显示壳页面。
- 根级 `typecheck`、`test` 可执行。

7. 是否需要先查阅 repo_explorer
- 否。仓库已确认只有文档与 docker，当前结构足够开始落骨架。

8. 执行代理分工
- 主代理：根配置、共享包、契约、文档、最终验证。
- `backend_implementer`：`apps/server` 的 Hono health API 与测试。
- `frontend_implementer`：`apps/web` 的健康页展示、`apps/admin` 最小壳。

9. 共享区域改动归属
- 主代理独占：根 `package.json`、`tsconfig.json`、`vitest.config.ts`、`.env.example`、`packages/config`、`packages/shared`、`packages/schemas`、`packages/http-client`。
- 子代理不得修改上述共享区。

10. 工作区推荐
- `current-directory`
- 原因：仓库当前无业务代码，改动集中于初始化，且当前工作树干净。

11. 风险提醒
- 根脚本和包名一旦定错，三端都要返工。
- 健康接口契约需要先稳定，否则 `server` 与 `web` 会反复改动。
- Vite 与 TypeScript 路径配置若不统一，会直接阻塞安装和类型检查。

12. 实现者交接信息
- 先完成根工作区和共享包。
- 再让后端只消费 `packages/schemas` 与 `packages/shared`。
- 最后让前端只消费 `packages/http-client`。

13. 推荐的下一步
- 主代理先收敛根配置与 `packages/*`。
- 共享契约稳定后并行实现 `apps/server` 与 `apps/admin`/`apps/web`。
