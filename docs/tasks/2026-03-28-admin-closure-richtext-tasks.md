# 2026-03-28 Admin 闭环与富文本统一任务拆解

## 1. 需求文档路径
- `docs/requirements/2026-03-28-admin-closure-richtext-requirements.md`

## 2. 任务列表
| 任务 ID | 名称 | 类型 | 优先级 | test_strategy | 完成标准 |
|---|---|---|---|---|---|
| SH-2 | 补齐路由与类型约束 | 共享契约 | P0 | `tdd` | admin 新页面和官方文章 CRUD 所需路由常量完整，消费者无需硬编码路径。 |
| FE-5 | 修复 admin 侧边栏多选中 | 前端 | P0 | `tdd` | `/admin` 仅在概览页高亮，其他子路由只高亮当前入口。 |
| SH-1 | 扩展 http-client 官方文章与内容分类能力 | 共享契约 | P0 | `tdd` | 管理端具备官方文章详情/更新/删除与内容分类 list/create/update 的统一调用封装。 |
| BE-1 | 补齐官方文章 CRUD 后端能力 | 后端 | P0 | `tdd` | 服务端支持官方文章详情、更新、删除，且校验作者角色、文章类型与媒体引用。 |
| FE-1 | 统一富文本编辑器基线 | 前端 | P0 | `tdd` | web/admin 两端编辑器都使用 Tiptap，功能基线一致。 |
| FE-2 | web 发布文章页接入增强编辑器 | 前端 | P0 | `test_after` | 发布页草稿、预览、图片/视频插入与提交保持可用。 |
| FE-3 | admin 官方文章管理页接入增强编辑器并完成 CRUD | 前端 | P0 | `test_after` | 单页完成创建、编辑、删除、列表、预览闭环。 |
| FE-6 | admin 内容分类页面与入口 | 前端 | P0 | `test_after` | 内容分类管理页接入路由与导航，支持列表、新建、编辑、启停。 |
| FE-4 | admin 浅色主题改造 | 前端 | P0 | `test_after` | token 与 CSS 同步切换到浅色专业蓝绿，不残留旧暗色底板。 |
| SH-3 | 增补前端测试覆盖 | 测试 | P1 | `test_after` | 补足编辑器、导航激活、admin 管理页闭环的前端测试。 |

## 3. 依赖顺序
1. `SH-2`
2. `FE-5`
3. `SH-1`
4. `BE-1`
5. `FE-1`
6. `FE-2`
7. `FE-3`
8. `FE-6`
9. `FE-4`
10. `SH-3`

## 4. 风险提醒
- `packages/shared/src/index.ts`、`packages/http-client/src/index.ts`、`packages/schemas/src/posts.ts`、`apps/server/src/modules/posts/**` 为共享高风险区，禁止并行抢改。
- `apps/admin/src/main.tsx` 与 `apps/admin/src/styles.css` 必须同一责任方串行修改，否则 token 与页面皮肤会分裂。
- 官方文章 CRUD 会放大媒体引用与内容校验问题，必须通过测试先锁定行为。
