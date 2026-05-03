# 当前实现目标

- 修复 `apps/admin` 顶部导航遮挡侧边栏与主内容的问题
- 修复概览页最近登录设备面板的错误处理，避免误显示“管理员权限不足”
- 飞行器分类创建表单移除手动排序输入
- 重做榜单管理页与官方榜单编辑工作台，支持封面/条目图片上传、权限策略、右侧预览

# 输入依据

- 用户对第二轮修复与榜单审核/飞友圈体验重构计划的确认
- 当前仓库 `AGENTS.md`
- 主会话已确认：`apps/admin` 仅做前端实现，不改 `packages/*`、`apps/server/*`、`apps/web/*`

# 工作区模式

- 仅修改 `apps/admin/*`
- 文档输出到 `docs/implementation/*`
- 依赖主会话后续补齐榜单审核与站点设置后端契约

# 变更文件 / 变更范围

- `apps/admin/src/features/auth/admin-shell.tsx`
- `apps/admin/src/features/auth/admin-overview-page.tsx`
- `apps/admin/src/features/auth/admin-session-helpers.ts`
- `apps/admin/src/features/models/categories-page.tsx`
- `apps/admin/src/features/rankings/rankings-page.tsx`
- `apps/admin/src/features/rankings/ranking-editor-page.tsx`
- `apps/admin/src/features/rankings/rankings-admin-helpers.ts`
- `apps/admin/src/lib/api-client.ts`
- `apps/admin/src/styles.css`
- `apps/admin/tests/admin-session-helpers.test.ts`
- `apps/admin/tests/rankings-admin-helpers.test.ts`

# 实现说明

- `admin-shell`
  - 用 CSS 变量固定 header 高度和 sider 宽度
  - 在样式尾部加最终覆盖，确保 layout/content/sider 的滚动与尺寸规则明确
- `admin-overview`
  - 仅在没有已登录管理员时显示 auth store 错误
  - 最近登录设备接口失败时只做局部安全提示，不把原始 403 文案提升为全局错误
- `categories-page`
  - 创建态排序输入已移除
  - 仍向当前接口发送 `sortOrder: 0`，等待后端改为自动递增
  - 编辑态保留排序字段
- `rankings-page`
  - 拆成“官方榜单管理”和“社区榜单审核”两个面板
  - 增加榜单审核开关和社区状态筛选
  - 预留社区榜单状态更新入口
- `ranking-editor-page`
  - 改成左编辑区 + 右侧预览/保存侧栏
  - 封面和条目图片改为上传，不再依赖 URL 输入
  - `itemAddPolicy` 改为显式可选
  - 条目编辑改成卡片式，预览展示左侧图片、标题、品牌、摘要、排序

# 测试和验证结果

- 通过
  - `bunx tsc -p apps/admin/tsconfig.json --noEmit`
  - `bunx vitest run --root . --config vitest.config.ts apps/admin/tests/admin-navigation.test.ts apps/admin/tests/admin-rich-text-toolbar.test.ts apps/admin/tests/admin-session-helpers.test.ts apps/admin/tests/official-articles-helpers.test.ts apps/admin/tests/rankings-admin-helpers.test.ts`
  - `bun run --cwd apps/admin build`
- 备注
  - `vitest` 的 glob 过滤在当前环境没有正确匹配，改用显式文件列表执行

# 边界和异常处理

- 最近登录设备接口失败时只显示局部降级提示
- 榜单编辑上传失败时在当前页显示错误，不影响其他面板
- 如果编辑页加载到非官方榜单，当前前端未单独拦截，依赖后端返回控制

# 风险 / 未解决项

- 榜单审核接口和 `rankingModerationEnabled` 目前是前向适配，未在本代理范围内落地后端
- `categories` 创建自动排序仍依赖主会话修改后端
- `admin` 样式文件存在历史定义与新覆盖并存，当前通过尾部覆盖收口，后续可以由主会话视情况再整理

# 需要 backend_implementer 配合的点

- `GET /admin/rankings?scope=official`
- `GET /admin/rankings?scope=community&status=pending|published|rejected|hidden`
- `PUT /admin/rankings/:id/status`
- `site_settings` 增加并返回 `rankingModerationEnabled`
- `ranking detail/list` 返回 `status`、`itemAddPolicy`、`author`、`createdAt`
- `categories create` 后端忽略前端排序并自动递增

# 推荐的下一步

- 主会话补齐榜单审核与分类自动排序后端实现
- 主会话联调 `apps/admin/src/lib/api-client.ts` 的新接口
- 联调完成后做一次 admin 概览页、榜单列表页、榜单编辑页的浏览器烟测
