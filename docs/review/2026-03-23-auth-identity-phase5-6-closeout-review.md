# mvp2 auth-identity phase5/6 closeout 审查

## 1. 需求文档
- `docs/project/PRDs/飞加网 - 产品需求文档 (PRD) V1.0.md`
- `docs/project/mvp/MVP 第1-第6迭代清单.md`
- `docs/project/mvp/MVP 第1-第6迭代的每轮验收口径.md`

## 2. 任务文档
- `docs/tasks/2026-03-22-mvp2-auth-identity-tasks.md`
- `docs/plans/2026-03-22-mvp2-auth-identity-plan.md`
- `docs/workflows/workflow.md`

## 3. 计划文档
- `docs/plans/2026-03-23-mvp2-auth-identity-phase5-6-plan.md`
- `docs/plans/2026-03-22-auth-identity-plan.md`

## 4. 前端实现文档
- 未发现本轮独立前端实现文档，`docs/implementation/` 下无 mvp2 auth-identity 对应文档。
- 本轮前端取证路径：`apps/web/src/lib/api-client.ts`、`apps/admin/src/lib/api-client.ts`、`README.md`

## 5. 后端实现文档
- 未发现本轮独立后端实现文档，`docs/implementation/` 下无 mvp2 auth-identity 对应文档。
- 本轮后端取证路径：`apps/server/src/app.ts`、`apps/server/tests/auth.test.ts`

## 6. 审查结论
- 通过

结论说明：
- 本轮三处实际变更与 phase5/6 收口计划一致，已覆盖 CORS 白名单、`credentials: true`、最小回归测试和 README 现状修正。
- 已补齐最小相关验证，并通过 `bunx vitest run --config vitest.config.ts apps/server/tests/auth.test.ts` 与 `bun run check`。
- 未发现阻塞性功能回归、关键需求缺失或关键验证缺失。

## 7. 需求覆盖情况
- 已覆盖“用户稳定登录并形成身份态”的第 2 迭代验收关键点：服务端跨端口 Cookie 会话的开发态可用性得到修正，前端现有 `credentials: "include"` 链路具备服务端配合条件。
- 已覆盖 PRD 中登录/注册入口与管理员后台身份能力的基础前提：`web` 与 `admin` 的默认开发来源均被显式允许。
- 已覆盖 closeout 需求中 README 现状修正：当前文档已明确 `captcha/sms` 为内存态，`users/sessions` 已落数据库。
- 未扩大范围到生产级 CORS 配置管理、前端登录流程改造或新的认证功能，符合本轮收口边界。

## 8. 计划一致性
- 与 `docs/plans/2026-03-23-mvp2-auth-identity-phase5-6-plan.md` 一致：
- `apps/server/src/app.ts` 不再使用 `origin: "*"`，改为基于 `APP_PORTS` 的 `localhost:3000/3001` 白名单，并开启 `credentials: true`。
- `apps/server/tests/auth.test.ts` 新增允许来源和 `Access-Control-Allow-Credentials` 的回归断言，符合“最小相关测试”要求。
- `README.md` 已补充“使用 localhost 联调”的说明，并修正存储现状描述。
- 验证顺序也符合计划与 workflow：先针对性验证 `auth.test`，再运行更广泛的 `bun run check`。

## 9. 前后端边界一致性
- 前端默认边界一致：`apps/web/src/lib/api-client.ts` 与 `apps/admin/src/lib/api-client.ts` 都默认请求 `http://localhost:3002`。
- 请求层行为一致：`packages/http-client/src/index.ts` 与 `apps/admin/src/lib/api-client.ts` 的认证相关请求均带 `credentials: "include"`。
- 后端边界一致：`apps/server/src/app.ts` 允许的开发来源正好对应 `APP_PORTS.web` 和 `APP_PORTS.admin`。
- 文档边界一致：`README.md` 明确要求使用 `localhost` 地址联调，这与实际白名单完全一致。
- 审查补充探针结果：
- `Origin: http://localhost:3000` 时，响应头返回 `Access-Control-Allow-Origin: http://localhost:3000` 与 `Access-Control-Allow-Credentials: true`。
- `Origin: http://127.0.0.1:3000` 时，响应头不返回 `Access-Control-Allow-Origin`，说明非白名单来源不会被浏览器放行。

## 10. 测试覆盖状态
- 已复核通过：
- `bunx vitest run --config vitest.config.ts apps/server/tests/auth.test.ts`
- 结果：1 个测试文件通过，4 个测试通过。
- 覆盖内容：
- 允许来源的预检请求返回正确的 `Access-Control-Allow-Origin`
- 允许来源的预检/普通请求返回 `Access-Control-Allow-Credentials: true`
- 既有 web 登录、`/auth/me`、`/auth/logout`、admin 登录与权限校验链路未回归
- 已复核通过：
- `bun run check`
- 结果：仓库级测试、类型检查与构建均通过
- 额外只读探针：
- 手工请求确认 `http://127.0.0.1:3000` 不会拿到 `Access-Control-Allow-Origin`

评估：
- 对本轮 closeout 的核心改动，验证证据充足。
- 仍缺少浏览器层手工联调证据，但在当前代码和请求头行为一致的前提下，属于低残余风险，不构成阻塞。

## 11. 问题列表

### 阻塞
- 无

### 高
- 无

### 中
- 无

### 低
- 历史设计/实现计划文档仍保留“`users/sessions` 为内存态”的旧表述，例如 `docs/requirements/2026-03-22-mvp2-auth-identity-design.md` 与 `docs/plans/2026-03-22-mvp2-auth-identity-plan.md`。这与当前代码现实及 README 不一致，但这些文档属于历史设计/计划材料，不影响本轮 closeout 通过。
- 自动化测试当前只锁定了允许来源的正向场景，尚未把“非白名单来源不返回 `Access-Control-Allow-Origin`”写成回归测试。审查补充探针表明当前行为正确，因此暂定为低风险验证缺口。

## 12. 必须修复项
- 无

## 13. 优化建议
- 在 `apps/server/tests/auth.test.ts` 中补一条非白名单来源的负向断言，例如 `http://127.0.0.1:3000` 或其他非白名单 origin，进一步锁死 CORS 回归面。
- 如果后续开发流程仍会频繁参考历史 mvp2 设计/计划文档，建议补一条“实现已演进为 users/sessions 落数据库”的注记，避免被旧文档误导。
- 如果未来要支持非默认开发地址或多人局域网联调，再把当前硬编码白名单提升为环境配置；本轮不需要扩大到这个范围。

## 14. 回归建议
- 保留当前允许来源与 `allow-credentials` 回归测试，不要移除。
- 后续只要改动 `APP_PORTS`、`VITE_API_BASE_URL` 或 CORS 策略，都应重跑 `apps/server/tests/auth.test.ts` 与 `bun run check`。
- 在下一次涉及 auth 基础设施或开发联调文档的改动中，追加一次浏览器级 smoke：
- `web` 登录后刷新并访问 `/auth/me`
- `admin` 登录后刷新并访问管理员受保护接口

## 15. 推荐的下一步
- 本轮 phase5/6 closeout 可以按通过状态交接。
- 若要继续降低残余风险，优先补一条非白名单 origin 的自动化断言，其次清理历史文档中的旧存储描述。

## 16. 审查文档路径
- `docs/review/2026-03-23-auth-identity-phase5-6-closeout-review.md`
