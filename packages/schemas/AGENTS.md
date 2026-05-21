<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# @feijia/schemas

## Purpose
全仓共享的 Zod schema 定义与推导类型。API 请求/响应、枚举、业务实体的类型契约均在此定义。`apps/*` 和 `packages/http-client` 消费这些 schema 进行运行时校验与类型推导。

## Key Files

| File | Description |
|------|-------------|
| `src/index.ts` | 桶导出全部 schema 文件 |
| `src/auth.ts` | 认证相关：登录/注册/刷新/验证码/session schema |
| `src/models.ts` | 飞行器模型 schema（列表/详情/对比/参数/管理输入） |
| `src/posts.ts` | 帖子/文章/动态 schema（创建/列表/详情/管理） |
| `src/social.ts` | 社交通知 schema（消息类型/通知/管理消息/未读统计） |
| `src/rankings.ts` | 榜单 schema（创建/更新/评论/评分/管理） |
| `src/reviews.ts` | 评审 schema |
| `src/files.ts` | 文件上传 schema（初始化/完成/bizType） |
| `src/brand-applications.ts` | 品牌申请 schema |
| `src/aircraft-submissions.ts` | 飞行器提交 schema |
| `src/reports.ts` | 举报 schema |
| `src/search.ts` | 搜索 schema |
| `src/site-settings.ts` | 站点设置 schema（审核模式/内容分类） |
| `src/users.ts` | 用户 schema（资料/角色/封禁） |
| `src/audits.ts` | 审核记录 schema |
| `src/content-categories.ts` | 内容分类 schema |
| `src/admin-logs.ts` | 管理员操作日志 schema |
| `src/ai.ts` | AI 功能 schema（格式化/摘要） |
| `src/health.ts` | 健康检查 schema |
| `src/phone.ts` | 手机号验证 schema |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `tests/` | Schema 级单元测试（Zod 校验正确性） |

## For AI Agents

### Working In This Directory
- **改 API 形状的第一步**：先改此包对应文件，然后按序核对 `http-client` → `shared` → `apps/server` → `apps/web|admin`
- 所有 schema 使用 `z.object({...})` 定义，类型通过 `z.infer<typeof schema>` 推导
- 导出命名约定：输入 schema 用 `xxxInputSchema`，响应 schema 用 `xxxResponseSchema`
- 新增 schema 文件后必须在 `src/index.ts` 添加 `export * from "./new-file"`
- 枚举值使用 Zod nativeEnum 或 z.enum，禁止手写联合类型

### Testing Requirements
- 新增 schema 应在 `tests/` 添加对应校验测试
- 测试应覆盖合法输入与边界/非法输入

### Common Patterns
- `nullable().optional()` 用于可选字段
- `z.coerce.number()` 用于查询参数数字
- 分页参数统一使用 `page`/`pageSize` 命名

## Dependencies

### Internal
- 无内部依赖（底层契约包）

### External
- `zod` — 运行时 schema 校验与类型推导
