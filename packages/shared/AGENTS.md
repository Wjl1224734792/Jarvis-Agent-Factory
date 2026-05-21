<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# @feijia/shared

## Purpose
全仓共享的路由常量、重定向配置、富文本规范化工具。`apps/*` 和 `packages/*` 通过此包引用统一的路由路径，避免硬编码。

## Key Files

| File | Description |
|------|-------------|
| `src/index.ts` | `APP_ROUTES`（页面路由）、`API_ROUTES`（API 端点）、`APP_PORTS`、`APP_NAME` |
| `src/redirects.ts` | 登录重定向 URL 构建与安全路径解析 |
| `src/rich-text.ts` | 富文本链接/媒体 URL 规范化 |

## 关键常量

| 常量 | 用途 |
|------|------|
| `APP_ROUTES` | 全仓页面路径（web 40+ 条，admin 20+ 条） |
| `API_ROUTES` | 全仓 API 端点路径（按模块嵌套） |
| `API_V1_PREFIX` | `/api/v1` 前缀 |
| `APP_PORTS` | 开发端口：web=17380, admin=17381, server=17382 |
| `APP_NAME` | 应用名称 "飞加" |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `assets/` | 共享静态资源（Logo PNG/SVG、favicon） |
| `tests/` | 共享常量测试 |

## For AI Agents

### Working In This Directory
- **禁止** 在 `apps/*` 中硬编码路由路径，必须使用 `APP_ROUTES`/`API_ROUTES` 常量
- 新增页面路由：同时在此添加 `APP_ROUTES` 条目 + 对应 `API_ROUTES`（如涉及 API）
- 新增 API 端点：在 `API_ROUTES` 对应模块下添加，server 端引用该常量注册路由
- 改端口 → 同步 `.env.example`、根 `README.md`

### Testing Requirements
- 路由常量变更后，检查 `apps/server`、`apps/web`、`apps/admin` 引用处

### Common Patterns
- `API_ROUTES` 按业务模块嵌套：`API_ROUTES.admin.circles.posts`
- `APP_ROUTES` 扁平结构，路径含动态参数时用 `:param` 占位

## Dependencies

### Internal
- 无内部依赖（底层常量包）

### External
- 无外部运行时依赖
