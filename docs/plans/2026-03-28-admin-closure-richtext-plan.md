# Admin 闭环、官方文章 CRUD 与富文本统一实施计划

## 1. 需求文档路径
- `docs/requirements/2026-03-28-admin-closure-richtext-requirements.md`

## 2. 任务文档路径
- `docs/tasks/2026-03-28-admin-closure-richtext-tasks.md`

## 3. 当前轮次目标
- 在不做广泛重构的前提下，完成 admin 闭环所需的共享契约、后端 CRUD、前端接入和主题/导航修复。
- 交付后，主会话可以直接按阶段派发给 `backend_implementer` 与 `frontend_implementer` 执行，并以统一验证清单收尾。

## 4. 当前轮次范围
- 共享契约与路由：
  - `packages/shared/src/index.ts`
  - `packages/schemas/src/posts.ts`
  - `packages/http-client/src/index.ts`
- 服务端：
  - `apps/server/src/modules/posts/**`
  - `apps/server/tests/posts.test.ts`
  - `apps/server/tests/content-closure.test.ts`
- admin 前端：
  - `apps/admin/src/app.tsx`
  - `apps/admin/src/main.tsx`
  - `apps/admin/src/styles.css`
  - `apps/admin/src/lib/api-client.ts`
  - `apps/admin/src/features/auth/admin-shell.tsx`
  - `apps/admin/src/components/admin-rich-text-editor.tsx`
  - `apps/admin/src/features/posts/official-articles-page.tsx`
  - 新增内容分类页面及其测试
- web 前端：
  - `apps/web/src/components/rich-text-editor.tsx`
  - `apps/web/src/routes/publish-article-page.tsx`
  - 相关前端测试

## 5. 完成标准
- 官方文章在 admin 中完成创建、列表、详情回填编辑、更新、删除闭环。
- web/admin 两端编辑器都基于 Tiptap，且至少支持标题、粗体、斜体、列表、引用、链接、图片、视频、占位符、激活态工具栏、值同步。
- admin 内容分类页可列表、创建、编辑、启停，并且导航有入口。
- admin 概览链接只在 `/admin` 高亮，其他子路由不再触发多选中。
- admin 整体视觉为浅色专业蓝绿，`antd` 组件皮肤与页面手写样式一致。
- 计划内验证通过，并保留 `tdd` 任务的 Red/Green 记录。

## 6. 是否需要先查阅 repo_explorer
- 不需要。
- 当前输入已经给出足够的代码路径、共享边界、已实现能力和缺口，足以直接进入实施。

## 7. 执行代理分工
### 阶段 A：共享契约与路由基线
- 责任方：`backend_implementer`
- 覆盖任务：`SH-2`、`SH-1`
- 目标：
  - 明确官方文章缺失的管理端接口路径。
  - 在 `packages/shared`、`packages/schemas`、`packages/http-client` 中一次性补齐路由常量、输入输出 schema、客户端方法。
- 实施决策：
  - 复用现有 `createPost` 作为官方文章创建能力。
  - 复用现有 `listAdminPosts()` 过滤 admin 文章作为列表能力。
  - 仅为缺失的 detail/update/delete 新增 dedicated admin official article 路由与客户端封装，避免重写已有创建/列表链路。
  - 内容分类继续复用现有 `list/create/update` 共享契约，不新增重复接口。

### 阶段 B：官方文章 CRUD 后端
- 责任方：`backend_implementer`
- 覆盖任务：`BE-1`
- 前置：阶段 A 完成
- 目标：
  - 在 `apps/server/src/modules/posts/**` 上补齐官方文章详情、更新、删除能力。
  - 保持“官方文章本质上仍是 admin 作者发布的 article post”，不引入新表或新聚合。
- 实施决策：
  - 新增 dedicated admin official article handler，内部仍复用 posts service/repo。
  - 更新时沿用现有 post 领域字段：`title`、`content`、`contentHtml`、`contentCategoryId`、`imageIds`、`videoIds`。
  - 封面图不单独建新字段；继续使用前端发送时将封面图并入 `imageIds` 的现有模式，前端本地单独维护“哪张是封面”。
  - 删除能力复用现有 post 删除语义，但在 admin official article 路由中校验 `type === "article"` 且 `author.role === "admin"`。

### 阶段 C：导航修复与 admin 闭环页面
- 责任方：`frontend_implementer`
- 覆盖任务：`FE-5`、`FE-6`
- 前置：`FE-5` 只依赖阶段 A 的路由稳定；`FE-6` 依赖阶段 A 的内容分类客户端能力
- 目标：
  - 修复多选中。
  - 补齐内容分类页与入口。
- 实施决策：
  - 不迁移到 antd `Menu`；保留 `NavLink` 方案。
  - 对概览入口使用 `end` 匹配，其他入口保持部分匹配，这样 `/admin/rankings/:id`、`/admin/content-categories` 仍能正确高亮所属导航。
  - 内容分类页沿用 `categories-page.tsx` / `brands-page.tsx` 的页面模式：顶部创建表单 + 列表 + 编辑 `Modal`，不新建复杂 CRUD 框架。
  - 内容分类页路由直接使用现有 `APP_ROUTES.adminContentCategories`。

### 阶段 D：富文本基线统一
- 责任方：`frontend_implementer`
- 覆盖任务：`FE-1`
- 前置：阶段 A、B 完成
- 目标：
  - 让 web/admin 两端都落到 Tiptap 方案，并具备同一能力基线。
- 实施决策：
  - 不新建 workspace 共享 UI 包。
  - 以 `apps/web/src/components/rich-text-editor.tsx` 为能力基线，在 admin 中引入同等 Tiptap 扩展与状态同步逻辑，替换 `contentEditable + execCommand`。
  - 允许两端保留各自 UI 封装和按钮风格，但扩展集合、媒体插入、值同步与 HTML 输出语义保持一致。
  - admin 需新增 Tiptap 依赖到 `apps/admin/package.json`，不把编辑器抽到 `packages/shared`。

### 阶段 E：web/admin 页面接入编辑器与 CRUD
- 责任方：`frontend_implementer`
- 覆盖任务：`FE-2`、`FE-3`
- 前置：阶段 D 完成；`FE-3` 依赖阶段 B 的官方文章 CRUD 接口
- 目标：
  - web 发布文章页接入增强编辑器。
  - admin 官方文章页完成单页 CRUD 闭环。
- 实施决策：
  - `publish-article-page.tsx` 保持现有草稿存储和预览结构，仅替换/增强编辑器能力，不改提交流程。
  - `official-articles-page.tsx` 保持单路由单页面，不新增详情页路由。
  - 同页内复用一套表单处理“新建 / 编辑”两种模式：点击表格中的“编辑”时加载详情并回填表单；点击“删除”时二次确认后删除并刷新列表。
  - 保留当前右侧预览结构，但预览内容与编辑数据源统一，避免 create/edit 两套状态。
  - 官方文章表格需要新增操作列和状态反馈，不扩大为多页式内容管理系统。

### 阶段 F：admin 主题统一
- 责任方：`frontend_implementer`
- 覆盖任务：`FE-4`
- 前置：阶段 C、E 完成
- 目标：
  - 将 admin 从暗色切换为浅色专业蓝绿。
- 实施决策：
  - `apps/admin/src/main.tsx` 切换为 light/default 算法，并定义蓝绿主色、浅底色、边框、成功/警告色。
  - `apps/admin/src/styles.css` 全量替换暗色渐变、深色卡片、浅文字为浅底、低饱和边框、蓝绿强调色。
  - 不额外引入 Tailwind 或 CSS-in-JS；继续在现有 CSS 文件中完成 admin 皮肤。
  - 主题改造放在功能页面稳定后做，避免前面页面实现与皮肤修改反复冲突。

### 阶段 G：前端补测与总体验证
- 责任方：`frontend_implementer`
- 覆盖任务：`SH-3`
- 前置：阶段 C-F 完成
- 目标：
  - 补足前端测试缺口，并完成集成验证。

## 8. 共享区域改动归属
- `packages/shared/src/index.ts`：仅 `backend_implementer` 修改。
- `packages/schemas/src/posts.ts`：仅 `backend_implementer` 修改。
- `packages/http-client/src/index.ts`：仅 `backend_implementer` 修改。
- `apps/server/src/modules/posts/**`：仅 `backend_implementer` 修改。
- `apps/admin/src/lib/api-client.ts`：仅 `frontend_implementer` 修改，负责把共享 client 能力映射为 admin 页面使用方式。
- `apps/admin/src/features/auth/admin-shell.tsx` 与 `apps/admin/src/app.tsx`：仅 `frontend_implementer` 修改。
- `apps/web/src/components/rich-text-editor.tsx` 与 `apps/admin/src/components/admin-rich-text-editor.tsx`：仅 `frontend_implementer` 串行修改，不并行拆给两个实现代理。
- `apps/admin/src/main.tsx` 与 `apps/admin/src/styles.css`：仅 `frontend_implementer` 串行修改。

## 9. 串行/并行规则
### 必须串行
1. `SH-2 -> SH-1 -> BE-1`
2. `FE-1` 必须在阶段 A、B 稳定后开始。
3. `FE-3` 必须在 `BE-1` 与 `FE-1` 完成后开始。
4. `FE-4` 必须在 admin 结构页稳定后开始，避免与 `FE-6`、`FE-3` 同改 `styles.css` / `main.tsx`。

### 可以并行
- `FE-5` 可以在阶段 A 完成后先做，不必等待后端 CRUD。
- `FE-6` 可以在阶段 A 完成后与 `FE-5` 同一前端轮次推进，但不得与 `FE-4` 并行改 `styles.css`。
- `FE-2` 可以与 `FE-6` 并行，因为它只改 web 侧编辑器接入，不碰 admin 共享样式。

## 10. 风险提醒
- 当前 admin 文章创建链路对视频上传存在“UI 可插入、提交不持久”的缺口；此次 CRUD 需要一并按 `videoIds` 补齐，否则编辑器升级后仍是假闭环。
- 如果将官方文章 CRUD 做成复用 `/admin/posts/:id` 状态更新接口的联合输入，会扩大回归面；本计划明确采用 dedicated official article admin 路由，避免污染现有帖子审核契约。
- 主题改造同时涉及 token 和硬编码 CSS；若只改其中一层，表单/表格/按钮与自定义卡片会分裂。
- 内容分类页不应直接复制机型分类页面的字段语义；必须绑定 `content category` 现有 schema，而不是复用模型分类接口。

## 11. 实现者交接信息
### 给 `backend_implementer`
- 先做 shared contract 和 server tests 的 Red。
- 官方文章 CRUD 的测试落点优先放在 `apps/server/tests/posts.test.ts`，必要时在 `apps/server/tests/content-closure.test.ts` 增补 admin 闭环场景。
- 路由常量和 schema 一次性补齐后再改 server，实现阶段不要让前端猜接口。
- 交付时提供：
  - Red 命令与失败摘要
  - Green 命令与通过摘要
  - 新增/修改的 route/schema/http-client 方法清单

### 给 `frontend_implementer`
- 先做 `FE-5`，快速消掉导航误激活。
- `FE-1` 不要抽新包；保持 app 内组件演进。
- `official-articles-page.tsx` 以“单页 form + preview + table + row actions”完成 CRUD，不扩成新路由体系。
- 内容分类页直接套用现有 admin CRUD 交互模式，优先一致性，不追求新视觉结构。
- 主题改造是最后一个前端功能阶段，避免前期页面调试时受到皮肤干扰。

## 12. 测试计划
### `tdd` 任务的 Red/Green 适用点
- `SH-2`
  - Red：新增/修改消费侧测试，断言 admin 内容分类路径和官方文章 CRUD 路由不存在或未连通。
  - Green：补齐 `packages/shared` 路由常量，并让消费侧测试通过。
- `FE-5`
  - Red：新增 admin 导航激活测试，访问 `/admin/posts` 或 `/admin/content-categories` 时断言概览入口不应高亮，当前实现应失败。
  - Green：对概览 `NavLink` 使用 `end` 匹配并让测试通过。
- `SH-1`
  - Red：新增 `packages/http-client` 测试，断言缺失的 official article detail/update/delete 方法或 schema。
  - Green：补齐客户端方法与 schema 解析。
- `BE-1`
  - Red：在 `apps/server/tests/posts.test.ts` 中新增 official article update/delete/detail 场景，验证缺失接口或行为失败。
  - Green：补齐 server 路由与 service 逻辑，通过同一批测试。
- `FE-1`
  - Red：新增 web/admin 编辑器测试，断言 admin 编辑器具备与 web 同等的 Tiptap 行为；当前 admin 实现应失败。
  - Green：替换 admin 编辑器为 Tiptap，并让两端测试通过。

### `test_after` 任务验证
- `FE-2`
  - `bun run --cwd apps/web typecheck`
  - `bun run --cwd apps/web build`
  - 手工验证：发布文章页的草稿恢复、图片/视频插入、预览、提交前禁用逻辑
- `FE-3`
  - `bun run --cwd apps/admin typecheck`
  - `bun run --cwd apps/admin build`
  - 手工验证：官方文章新建、编辑回填、删除确认、保存后列表刷新、预览同步
- `FE-6`
  - `bun run --cwd apps/admin typecheck`
  - `bun run --cwd apps/admin build`
  - 手工验证：内容分类创建、编辑、启停、导航入口与激活态
- `FE-4`
  - `bun run --cwd apps/admin build`
  - 手工验证：概览、表单、表格、Modal、编辑器、预览面板均无暗色残留
- `SH-3`
  - `bun run test`

### 最终集成验证
- `bun run test`
- `bun run build`
- `bun run --cwd apps/admin typecheck`

## 13. 推荐的下一步
1. 主会话先派发 `backend_implementer` 执行阶段 A、B，锁定 shared contract 与 official article CRUD。
2. 后端 Green 后，派发 `frontend_implementer` 先做 `FE-5`，再按 `FE-1 -> FE-2 / FE-6 -> FE-3 -> FE-4 -> SH-3` 推进。
3. 所有实现完成后，由主会话汇总 Red/Green 记录与构建/测试结果，再交给 `review_qa`。
