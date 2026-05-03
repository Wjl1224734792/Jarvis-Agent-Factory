# 2026-03-26 Platform Closure And Compact Feed Review

## 1. 需求文档
- 路径：`docs/requirements/2026-03-26-platform-closure-and-compact-feed-requirements.md`

## 2. 任务文档
- 路径：`docs/tasks/2026-03-26-platform-closure-and-compact-feed-tasks.md`

## 3. 计划文档
- 路径：`docs/plans/2026-03-26-platform-closure-and-compact-feed-plan.md`

## 4. 前端实现文档
- 路径：本轮无独立前端实现文档。
- 备注：仅存在为恢复根 `typecheck` 做的最小修补：
  - `apps/web/src/features/posts/post-comment-thread.tsx`
  - `apps/web/src/routes/home-page.tsx`
  - `apps/web/tsconfig.json`

## 5. 后端实现文档
- 路径：`docs/implementation/2026-03-26-platform-closure-and-compact-feed-backend-implementation.md`

## 6. 审查结论
- `不通过`

## 7. 需求覆盖情况
- 已覆盖：
  - `rankings` 类型阻塞已收口。
  - `db:seed` 已扩展为 PostgreSQL + MinIO + Redis 的运行态种子。
  - 根 `typecheck`、`db:migrate`、`db:seed`、`apps/server test`、`build` 已有通过证据。
  - 前端最小类型修补未改变既有页面结构。
- 未完成 / 未满足：
  - `COS / OSS / KODO / Redis / MinIO` 的环境变量配置虽然已写入 `.env.example`，但当前运行路径并未真正把这些配置注入 `apps/server` / `packages/db` 的执行环境。
  - `Aliyun / Tencent` 短信 provider 目前只有占位分支，没有真实发送，也没有在非 mock 场景下失败退出。
  - 存储 provider 显式启用时，业务仍会静默回退到数据库 `data:` URL，导致“已接对象存储”的前提不成立。

## 8. 计划一致性
- 与计划一致：
  - 按 `rankings` 阻塞修复 -> `I1/I2` -> `I3/I4` 的顺序推进。
  - `I3/I4` 有 Red -> Green 证据，新增了 `apps/server/tests/provider-config.test.ts`。
- 与计划不一致：
  - `I3` 的“统一装配与配置入口”没有真正打通运行时环境装配，当前更多是配置解析函数存在，但实际运行吃不到 `.env`。
  - `I4` 的“短信 provider 抽象”停留在接口占位，非 mock provider 仍不可用。

## 9. 前后端边界一致性
- 本轮审查范围内未发现共享 schema / http-client 的新增破坏性变更。
- 最小前端修补与当前后端返回的“单层评论回复”结构一致。
- 运行态缓存边界存在不一致：
  - `packages/db/src/runtime-seed.ts` 直接写 `feed:*` 键；
  - 仓库现有 `.env` 含 `CACHE_KEY_PREFIX=feijia`；
  - 当前种子未遵守该命名约定。

## 10. 测试覆盖状态
- 已有通过证据：
  - `bun run typecheck`
  - `bun run db:migrate`
  - `bun run db:seed`
  - `bun run --cwd apps/server test`
  - `bun run build`
- 已有运行态实查：
  - Redis：`GET feed:hot-circle` 有值。
  - MinIO：`/data/feijia-media/home/hot-circle/*` 对象存在。
- 审查阶段补充核查：
  - 直接在 `apps/server` 与 `packages/db` 下打印 `process.env.STORAGE_* / REDIS_URL / SMS_PROVIDER`，结果均为 `undefined`。
- 测试缺口：
  - 没有测试覆盖非 mock 短信 provider 的必填配置校验。
  - 没有测试覆盖“对象存储失败时是否应继续静默回退”。
  - 没有测试覆盖 Redis key prefix。
  - 没有测试覆盖非 path-style provider 的 URL 生成。

## 11. 问题列表
### 阻塞
1. 运行时并未真正吃到新加的 provider 环境变量，导致 `I3/I4` 的“环境变量配置入口”名义存在、实际未接通。
   - 证据：
     - 审查阶段在仓库根目录执行 `bun run --cwd apps/server -` 与 `bun run --cwd packages/db -` 打印环境变量，`STORAGE_KEY_PREFIX`、`STORAGE_BUCKET`、`REDIS_URL`、`SMS_PROVIDER` 均为 `undefined`。
   - 相关代码：
     - `apps/server/src/modules/posts/storage-provider.ts:44-67`
     - `apps/server/src/modules/auth/sms-provider.ts:45-67`
     - `packages/db/src/runtime-seed.ts:77-85`
     - `packages/db/src/runtime-seed.ts:134-168`
   - 影响：
     - `apps/server` 上传路径拿不到 `STORAGE_*`，会走异常分支。
     - `packages/db` runtime seed 主要依赖硬编码默认值，不是真正的 `.env` 配置。

2. 非 mock 短信 provider 会在“未发送短信”的情况下返回成功，导致用户端收到 200，但永远收不到验证码。
   - 相关代码：
     - `apps/server/src/modules/auth/sms-provider.ts:70-88`
     - `apps/server/src/modules/auth/auth.service.ts:41-52`
   - 影响：
     - 当 `SMS_PROVIDER=aliyun|tencent` 时，认证流程会生成验证码并返回请求成功，但没有任何真实发送或失败信号，登录闭环不可用。

### 高
1. 对象存储上传失败时无条件静默回退到数据库 `data:` URL，掩盖了 provider 配置错误或服务故障。
   - 相关代码：
     - `apps/server/src/modules/posts/posts.service.ts:242-259`
   - 影响：
     - 在显式启用 `COS / OSS / KODO / MinIO` 的场景下，业务看起来“上传成功”，但实际上回退到了旧的 DB blob 存储，容易造成数据体积失控，也会让排障信号消失。

### 中
1. 非 path-style provider 的公开 URL 生成不包含 bucket，`COS / OSS / KODO` 返回的对象 URL 很可能不可访问。
   - 相关代码：
     - `apps/server/src/modules/posts/storage-provider.ts:30-35`
     - `apps/server/src/modules/posts/storage-provider.ts:67`
     - `apps/server/src/modules/posts/storage-provider.ts:107`
   - 影响：
     - 当 `STORAGE_FORCE_PATH_STYLE=false` 时，`publicBaseUrl` 仅为 `endpoint`，最终 URL 为 `endpoint/key`，缺少 bucket 维度。

2. Runtime seed 忽略了现有缓存命名约定 `CACHE_KEY_PREFIX`。
   - 相关代码：
     - `packages/db/src/runtime-seed.ts:39-43`
     - `packages/db/src/runtime-seed.ts:163-168`
   - 影响：
     - 运行态种子写入的 Redis key 与仓库现有环境配置不一致，后续如果接入统一缓存封装，极易出现“种子已写入但页面读不到”的边界问题。

### 低
- 本轮审查范围内未发现额外低优先级代码缺陷；低优先级项主要集中在测试缺口与后续结构优化。

## 12. 必须修复项
1. 增加统一的环境变量装配，确保从仓库根脚本进入 `apps/server` / `packages/db` 时，`STORAGE_*`、`REDIS_URL`、`SMS_PROVIDER` 等配置真实可用。
2. 对 `aliyun/tencent` provider 增加最小可用保障：
   - 要么接真实 SDK；
   - 要么在非 mock 场景下做必填配置校验并明确失败，不能返回假成功。
3. 将对象存储回退逻辑限制在明确的开发 / mock 场景；当显式启用真实 provider 时，应保留错误信号而不是吞掉。

## 13. 优化建议
1. 将 provider 配置解析与 env 装配抽到单一模块，避免 `apps/server` 与 `packages/db` 各自维护默认值与读取逻辑。
2. 为 `post_images.dataUrl` 做后续语义迁移，避免“字段名是 dataUrl、实际内容可能是对象存储 URL”的长期歧义。
3. 为 runtime seed 增加结构化 summary，明确输出 bucket、prefix、redis key namespace，便于 CI/本地排查。

## 14. 回归建议
1. 新增集成测试：
   - `SMS_PROVIDER=aliyun|tencent` 且缺少凭证时，请求短信接口应失败而不是返回 200。
2. 新增集成测试：
   - 显式启用对象存储 provider 且上传失败时，请求应暴露错误或至少可观测，不应静默回退。
3. 新增配置测试：
   - `CACHE_KEY_PREFIX` 改值后，runtime seed 写入的 key 应跟随变化。
4. 新增 URL 测试：
   - `forcePathStyle=false` 时，生成的公开 URL 应包含 bucket 信息。

## 15. 推荐的下一步
1. 先修复上述阻塞项，重新执行：
   - `bun run typecheck`
   - `bun run db:migrate`
   - `bun run db:seed`
   - `bun run --cwd apps/server test`
   - `bun run build`
2. 审查通过后，再进入下一轮：
   - `I5` 互动闭环
   - `W1/W2/W3` 前端紧凑化与展示收口

## 16. 审查文档路径
- `docs/review/2026-03-26-platform-closure-and-compact-feed-review.md`
