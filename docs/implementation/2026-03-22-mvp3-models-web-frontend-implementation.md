# MVP 第 3 阶段 Web 机型库读链路实现说明

## 1. 当前实现目标

在 `apps/web` 内实现机型库前台读链路：

- `/models` 列表页
- 飞行器类型、品牌、动力类型筛选
- 不限/重置
- 机型详情页
- 详情页行为入口位占位

## 2. 输入依据

- 当前线程中已确认的第 3 阶段最小切片
- 主代理已收敛的共享契约、请求层和路由常量
- 现有 `apps/web` 的认证壳、路由结构和 `react-query` 接入方式

## 3. 工作区模式

- `worktree`
- 路径：`E:\CodeStore\feijia\.worktrees\mvp2-auth-identity`

## 4. 变更文件 / 变更范围

- 修改：`apps/web/src/app.tsx`
- 修改：`apps/web/src/features/auth/web-layout.tsx`
- 新增：`apps/web/src/routes/models-page.tsx`
- 新增：`apps/web/src/routes/model-detail-page.tsx`

## 5. 实现说明

- 在现有 `WebLayout` 下挂入 `/models` 和 `/models/:slug` 两条路由。
- 首页头部增加“机型库”导航入口。
- 列表页通过共享 `apiClient.listModels()` 获取数据。
- 筛选条件通过 URL query string 驱动，支持：
  - `categorySlug`
  - `brandSlug`
  - `powerType` 多选
- 详情页通过 `apiClient.getModelDetail(slug)` 拉取详情，并展示最小参数卡片与详细参数表。
- 收藏 / 想买 / 写点评只保留占位按钮，不触发真实写入。

## 6. 测试和验证结果

- 已运行：`bun run --cwd apps/web typecheck`
  - 结果：通过
- 已运行：`bun run --cwd apps/web build`
  - 结果：通过

## 7. 边界和异常处理

- 当列表为空时显示空态，不报错。
- 当详情查询缺少 `slug` 或无数据时显示兜底提示。
- 当前不做收藏、想买、点评的真实交互。
- 当前不实现搜索、排序、对比、榜单等增强能力。

## 8. 风险 / 未解决项

- 当前实现依赖后端完成 `listModels` / `getModelDetail` 实际接口。
- 品牌索引当前是最小按钮索引，不含 A-Z 锚点滚动效果。
- 未做浏览器级联调，只完成了类型检查与构建验证。

## 9. 需要 backend_implementer 配合的点

- 提供 `/models` 列表与筛选接口
- 提供 `/models/:slug` 详情接口
- 保证返回结构符合共享 `models` 契约
- 确保筛选参数命名与 query string 保持一致

## 10. 推荐的下一步

- 由后端实现代理补齐机型库查询接口
- 由 admin 前端实现代理完成分类 / 品牌 / 机型最小管理页
- 主代理在后端联调完成后统一做一次 `web` 冒烟验证
