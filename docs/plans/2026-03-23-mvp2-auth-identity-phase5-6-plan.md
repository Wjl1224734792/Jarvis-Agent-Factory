# MVP2 auth-identity 第 5/6 阶段执行计划

## 1. 需求文档路径
- `docs/project/PRDs/飞加网 - 产品需求文档 (PRD) V1.0.md`
- `docs/project/mvp/MVP 第1-第6迭代清单.md`
- `docs/project/mvp/MVP 第1-第6迭代的每轮验收口径.md`

## 2. 任务文档路径
- `docs/plans/2026-03-22-mvp2-auth-identity-plan.md`
- `docs/workflows/workflow.md`

## 3. 当前轮次目标
- 收口 mvp2 auth-identity 第 5/6 阶段的真实缺口，确保 `web/admin -> server` 的跨端口 Cookie 会话在浏览器中可用。
- 同步修正文档描述，使 README 与当前存储实现一致。

## 4. 当前轮次范围
### 范围内
- 调整 `apps/server/src/app.ts` 的 CORS 配置：
  - 不再使用 `origin: "*"`。
  - 为 `web` 与 `admin` 明确允许的开发端来源。
  - 开启 `allow-credentials`，使 `credentials: "include"` 可建立 Cookie 会话。
- 针对 CORS/Cookie 会话补最小相关测试。
- 更新 `README.md` 中“内存存储”描述，改为准确反映当前状态：
  - `users/sessions` 已落数据库。
  - `captcha/sms` 仍为内存态。

### 范围外
- 不重做 mvp2 已完成的 auth 业务链路。
- 不改 `web/admin` 登录流程实现，除非联调证明仍有阻塞。
- 不扩展生产级 CORS 白名单管理方案，不在本轮引入新的配置系统。

## 5. 完成标准
- 浏览器从 `http://localhost:3000` 与 `http://localhost:3001` 请求 `http://localhost:3002` 时，服务端返回的 CORS 头允许携带凭证。
- `web/admin` 现有 `credentials: "include"` 请求链路可建立并复用 Cookie 会话。
- 服务端测试覆盖至少一个跨域携带凭证的关键断言，避免 `origin: "*"` 回归。
- `README.md` 对存储现状的表述与代码一致。
- 完成后可按 `workflow.md` 进入实现代理与 `review_qa` 阶段。

## 6. 是否需要先查阅 repo_explorer
- 否。
- 原因：本轮共享区、缺口位置、依赖关系和验证基线都已明确，足以直接进入实现。

## 7. 执行代理分工
- `backend_implementer`
  - 负责 `apps/server/src/app.ts` 的 CORS 修正。
  - 负责 `apps/server/tests/auth.test.ts` 或等价服务端测试补充。
  - 负责本轮共享区收口与服务端验证。
- `frontend_implementer`
  - 不承担代码修改。
  - 如需参与，仅负责 `apps/web`、`apps/admin` 的联调回归验证与结果确认。

## 8. 共享区域改动归属
- 唯一责任方：`backend_implementer`
- 共享区域：
  - `apps/server/src/app.ts`
  - `apps/server/tests/auth.test.ts`（或新增同层服务端测试文件）
  - `README.md`
- 顺序要求：
  1. 先修正服务端 CORS 配置。
  2. 再补服务端测试，锁定允许来源和 credentials 行为。
  3. 最后更新 README，并做联调回归。

## 9. 工作区推荐
- `current-directory`
- 原因：本轮是小范围收口，主要集中在服务端入口与文档；当前 worktree 已隔离，继续在该目录内完成即可，无需再拆新 worktree。

## 10. 风险提醒
- 若仍使用宽泛字符串白名单但未覆盖实际开发地址，浏览器端仍会表现为“登录成功但会话不可用”。
- 若仅开 `allow-credentials` 而未精确返回请求来源，浏览器仍会拦截 Cookie。
- 现有服务端测试多为 `app.request` 直连，不能天然证明浏览器跨域行为；本轮至少要补响应头断言，否则容易再次回归。
- README 若不更新，会继续误导后续实现者把 `users/sessions` 当作内存态处理。

## 11. 实现者交接信息
- 已确认 `HEAD` 为 `19cb295`，且既有基线已通过：
  - `packages/schemas auth test`
  - `apps/server auth test`
  - `packages/http-client typecheck`
  - `apps/web typecheck`
  - `apps/admin typecheck`
- 当前真实缺口：
  - `apps/server/src/app.ts` 仍是 `origin: "*"`。
  - `web/admin` 直接跨端口请求 `server`，并依赖 `credentials: "include"`。
  - 浏览器场景下该组合无法建立 Cookie 会话。
- 文档缺口：
  - `README.md` 当前仍写“验证码、用户和 session 采用内存存储”。
  - 实际代码现状是 `auth.repo` 已使用数据库 `users/sessions`，仅 `captcha/sms` 为内存态。
- 建议实现方式：
  - 优先复用仓库现有端口常量或环境变量。
  - 若无现成封装，本轮可先在服务端入口最小化显式列出开发来源，避免扩大范围。

## 12. 推荐的下一步
- 先交由 `backend_implementer` 完成本轮唯一共享区改动和服务端测试补强。
- 完成后执行最小验证：
  - `bunx vitest run --config vitest.config.ts apps/server/tests/auth.test.ts`
  - `bun run --cwd apps/web typecheck`
  - `bun run --cwd apps/admin typecheck`
- 若服务端测试无法充分证明浏览器行为，再追加一次本地联调验证：
  - Web 登录后访问 `/auth/me`
  - Admin 登录后访问管理员受保护接口
- 代码改动完成后，再按 `docs/workflows/workflow.md` 进入 `review_qa`。
