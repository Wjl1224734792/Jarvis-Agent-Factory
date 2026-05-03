# Kodo 对象存储与七牛审核任务拆解

日期：2026-04-21

需求文档：
- [2026-04-21-kodo-qiniu-ai-review-requirements.md](/E:/CodeStore/feijia/docs/requirements/2026-04-21-kodo-qiniu-ai-review-requirements.md)

## 1. 任务总览

| Task ID | 名称 | 类型 | ddd_classification | test_strategy | risk_flag | risk_notes | 优先级 | 责任方 | 依赖 |
|---|---|---|---|---|---|---|---|---|---|
| TASK-001 | 收口对象存储共享契约与 provider 枚举 | 共享 | ddd | tdd | yes | 牵动上传协议与 provider 枚举，容易引发前后端契约不一致 | P0 | 共享契约责任方 | 无 |
| TASK-002 | 重构 Kodo 官方 SDK 存储链路并移除非目标 provider | 后端 | ddd | tdd | yes | 直接影响上传初始化、直传、complete、读地址生成等核心链路 | P0 | 服务端存储责任方 | TASK-001 |
| TASK-003 | 设计并落地审核记录与审核模式数据模型 | 共享 | ddd | tdd | yes | 涉及站点设置、数据库结构、审核状态与可追踪记录，是全局共享边界 | P0 | 共享数据责任方 | TASK-001 |
| TASK-004 | 接入七牛文本审核服务端链路 | 后端 | ddd | tdd | yes | 涉及多个文本写入入口与 AI/manual 分流，容易造成状态流转分叉 | P0 | 服务端审核责任方 | TASK-003 |
| TASK-005 | 接入 Kodo 媒体审核回调与状态流转 | 后端 | ddd | tdd | yes | 涉及异步回调、幂等、防重与文件可见性控制，属于高风险任务 | P0 | 服务端审核责任方 | TASK-002, TASK-003 |
| TASK-006 | 串联系统消息通知与审核结果消息类型 | 后端 | non_ddd | test_after | yes | 牵动现有系统消息类型、admin inbox 副本与审核记录关联，容易出现状态不同步 | P0 | 通知域责任方 | TASK-003, TASK-004, TASK-005 |
| TASK-007 | 改造后台设置与审核页为 AI 审核 / 人工审核 | 前端 | non_ddd | test_after | yes | 涉及多页面统一文案与追踪视图，若数据模型未冻结容易频繁返工 | P0 | 管理端责任方 | TASK-003, TASK-004, TASK-005, TASK-006 |
| TASK-008 | 补齐配置、环境变量、seed 与文档说明 | 共享 | non_ddd | test_after | no | 主要是配置与说明收口，但要防止文档与实现偏离 | P1 | 根配置责任方 | TASK-002, TASK-004, TASK-005 |
| TASK-009 | 端到端验证、回归测试与人工联调说明 | 测试 | non_ddd | test_after | yes | 需要覆盖异步审核、回调与真实环境限制，验证不足会形成伪通过 | P0 | 测试责任方 | TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008 |

## 2. 任务详情

### TASK-001 收口对象存储共享契约与 provider 枚举

- 类型：共享
- ddd_classification：ddd
- test_strategy：tdd
- risk_flag：yes
- risk_notes：牵动上传协议与 provider 枚举，容易引发前后端契约不一致
- 目标：
  - 将产品级对象存储 provider 收口为 `minio | kodo`
  - 清理 `oss / cos / qiniu alias` 在共享 schema、共享 client、文档承诺中的正式入口
  - 明确上传描述协议，覆盖 Kodo 官方 SDK 所需模式
- 主要涉及：
  - `packages/schemas/src/files.ts`
  - `packages/schemas/src/index.ts`
  - `packages/http-client/src/index.ts`
  - `packages/http-client/tests/*`
- 完成标准：
  - 上传初始化响应契约能表达 Kodo 官方上传模式
  - 前端 / client 仅依赖共享契约，不在页面层硬编码 Kodo 细节
  - 共享测试覆盖 provider 和上传模式边界

### TASK-002 重构 Kodo 官方 SDK 存储链路并移除非目标 provider

- 类型：后端
- ddd_classification：ddd
- test_strategy：tdd
- risk_flag：yes
- risk_notes：直接影响上传初始化、直传、complete、读地址生成等核心链路
- 目标：
  - 服务端对象存储实现只保留 `minio` 与 `kodo`
  - `kodo` 固定使用七牛官方 `qiniu` SDK
  - 保持现有 `init -> direct upload -> complete` 三段式上传闭环
- 主要涉及：
  - `apps/server/src/modules/posts/storage-provider.ts`
  - `apps/server/src/lib/storage-provider.ts`
  - `apps/server/src/modules/uploads/upload.service.ts`
  - `apps/server/src/modules/uploads/uploads.helpers.ts`
  - `apps/server/tests/provider-config.test.ts`
- 完成标准：
  - MinIO 本地链路不回归
  - Kodo 上传、对象查询、下载 URL 策略与官方 SDK 对齐
  - 非目标 provider 在服务端入口不再保留正式实现路径

### TASK-003 设计并落地审核记录与审核模式数据模型

- 类型：共享
- ddd_classification：ddd
- test_strategy：tdd
- risk_flag：yes
- risk_notes：涉及站点设置、数据库结构、审核状态与可追踪记录，是全局共享边界
- 目标：
  - 将现有 moderation 开关升级为 AI 审核模式语义
  - 增加审核记录可追踪数据结构
  - 统一“上传成功”和“审核通过可展示”的状态语义
- 主要涉及：
  - `packages/db/src/schema.ts`
  - `packages/schemas/src/site-settings.ts`
  - `packages/schemas/src/social.ts`
  - `apps/server/src/modules/site-settings/*`
  - 相关迁移与测试
- 完成标准：
  - 可表达 `ai_enabled / manual_only`
  - 可落库存储审核记录、审核结果、原始 payload 摘要、人工复核结果
  - 后台与通知链路能消费该数据模型

### TASK-004 接入七牛文本审核服务端链路

- 类型：后端
- ddd_classification：ddd
- test_strategy：tdd
- risk_flag：yes
- risk_notes：涉及多个文本写入入口与 AI/manual 分流，容易造成状态流转分叉
- 目标：
  - 在文本内容创建 / 更新路径接入七牛文本审核 API
  - 根据站点设置决定走 AI 审核还是人工审核
- 主要涉及：
  - 文章 / 动态 / 评论 / 评测 / 投稿 / 品牌申请 / 榜单相关服务
  - 新增七牛审核服务封装模块
  - 审核状态写入与错误处理
- 完成标准：
  - 文本审核同步可返回 `pass / review / block`
  - AI 审核关闭时直接进入人工审核队列
  - AI 审核结果可驱动业务状态与审核记录

### TASK-005 接入 Kodo 媒体审核回调与状态流转

- 类型：后端
- ddd_classification：ddd
- test_strategy：tdd
- risk_flag：yes
- risk_notes：涉及异步回调、幂等、防重与文件可见性控制，属于高风险任务
- 目标：
  - 接入 Kodo 媒体审核能力与服务端回调
  - 处理图片、视频等对象内容的 AI 审核状态流转
- 主要涉及：
  - 审核回调路由 / 服务
  - 文件状态与审核状态映射
  - 回调鉴权、幂等、防重处理
- 完成标准：
  - 媒体上传完成后可进入待审核 / AI 审核中 / 通过 / 拒绝 / 异常 / 待人工复核
  - 七牛回调结果能稳定落库
  - 媒体在未通过前不会作为已批准资源公开消费

### TASK-006 串联系统消息通知与审核结果消息类型

- 类型：后端
- ddd_classification：non_ddd
- test_strategy：test_after
- risk_flag：yes
- risk_notes：牵动现有系统消息类型、admin inbox 副本与审核记录关联，容易出现状态不同步
- 目标：
  - 将审核结果通过现有系统消息链路通知到用户
  - 对接后台 admin inbox 副本能力
- 主要涉及：
  - `apps/server/src/modules/social/notification-types.ts`
  - `apps/server/src/modules/social/social.service.ts`
  - 相关 repo / schema / 测试
- 完成标准：
  - 用户能收到审核通过 / 拒绝 / 转人工等最终状态消息
  - 通知与审核记录、业务对象能建立关联
  - 管理端可追踪审核消息对应对象

### TASK-007 改造后台设置与审核页为 AI 审核 / 人工审核

- 类型：前端
- ddd_classification：non_ddd
- test_strategy：test_after
- risk_flag：yes
- risk_notes：涉及多页面统一文案与追踪视图，若数据模型未冻结容易频繁返工
- 目标：
  - 将后台审核卡片、设置开关、说明文案从“自动通过 / 人工审核”改为“AI 审核 / 人工审核”
  - 在管理端展示审核结果、审核记录和回调状态
- 主要涉及：
  - `apps/admin/src/components/admin-moderation-card.tsx`
  - `apps/admin/src/lib/site-settings.ts`
  - 各审核页、总览页、站点设置页
- 完成标准：
  - 后台开关语义正确
  - 审核详情可见且可追踪
  - 人工审核入口和 AI 审核结果不会互相覆盖

### TASK-008 补齐配置、环境变量、seed 与文档说明

- 类型：共享
- ddd_classification：non_ddd
- test_strategy：test_after
- risk_flag：no
- risk_notes：主要是配置与说明收口，但要防止文档与实现偏离
- 目标：
  - 更新根 `.env.example`、README、运行时 seed 说明
  - 收口七牛审核与对象存储相关环境变量
- 主要涉及：
  - `.env.example`
  - `README.md`
  - `packages/db/src/runtime-seed.ts`
  - 如有需要的 seed 文件
- 完成标准：
  - 文档明确区分 MinIO 本地与 Kodo 开发/生产
  - 文档明确文本审核、媒体审核、回调限制和本地联调方式
  - 不再对非目标 provider 做说明承诺

### TASK-009 端到端验证、回归测试与人工联调说明

- 类型：测试
- ddd_classification：non_ddd
- test_strategy：test_after
- risk_flag：yes
- risk_notes：需要覆盖异步审核、回调与真实环境限制，验证不足会形成伪通过
- 目标：
  - 覆盖共享层、服务端、后台和配置层验证
  - 给出真实七牛联调与本地回调验证说明
- 主要涉及：
  - 定向单测 / 集成测试
  - `bun run lint`
  - `bun run typecheck`
  - `bun run test`
  - `bun run build`
- 完成标准：
  - 关键链路有自动化测试
  - 整仓质量门通过
  - 文档包含公网回调 / tunnel / 开发环境验证说明

## 3. 依赖关系

- `TASK-001 -> TASK-002`
- `TASK-001 -> TASK-003`
- `TASK-003 -> TASK-004`
- `TASK-002 + TASK-003 -> TASK-005`
- `TASK-003 + TASK-004 + TASK-005 -> TASK-006`
- `TASK-003 + TASK-004 + TASK-005 + TASK-006 -> TASK-007`
- `TASK-002 + TASK-004 + TASK-005 -> TASK-008`
- `TASK-001..TASK-008 -> TASK-009`

## 4. 共享边界与唯一责任方

### 共享契约责任方

- 独占以下文件：
  - `packages/schemas/src/files.ts`
  - `packages/schemas/src/site-settings.ts`
  - `packages/schemas/src/social.ts`
  - `packages/schemas/src/index.ts`
  - `packages/http-client/src/index.ts`

### 服务端存储责任方

- 独占以下文件：
  - `apps/server/src/modules/posts/storage-provider.ts`
  - `apps/server/src/lib/storage-provider.ts`
  - `apps/server/src/modules/uploads/*`

### 服务端审核责任方

- 独占以下文件：
  - 新增七牛审核服务封装
  - 审核回调路由 / 服务
  - 文本审核接入的业务服务文件

### 通知域责任方

- 独占以下文件：
  - `apps/server/src/modules/social/notification-types.ts`
  - `apps/server/src/modules/social/social.service.ts`
  - 相关 repo / schema / tests

### 根配置责任方

- 独占以下文件：
  - `.env.example`
  - `README.md`
  - `packages/db/src/runtime-seed.ts`
  - 相关 seed 文件

### 管理端责任方

- 独占以下文件：
  - `apps/admin/src/components/admin-moderation-card.tsx`
  - 各审核页、站点设置页、总览页
  - `apps/admin/src/lib/site-settings.ts`

## 5. 推荐交付顺序

1. TASK-001
2. TASK-003
3. TASK-002
4. TASK-004
5. TASK-005
6. TASK-006
7. TASK-007
8. TASK-008
9. TASK-009

## 6. 风险提示

- 媒体审核回调依赖公网可达地址，本地开发无法天然覆盖完整回调链路。
- 现有业务状态字段已广泛用于后台审核页，审核记录与业务状态必须谨慎解耦。
- 系统消息已有“状态变更”模式，但审核通知是否复用旧类型还是新增专用类型，需要在执行规划中明确。
