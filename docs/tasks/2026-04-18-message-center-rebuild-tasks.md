# 2026-04-18 消息中心重建与主页联动任务拆解

## 需求文档路径

- `docs/requirements/2026-04-18-message-center-rebuild-requirements.md`

## 任务概览

- 本轮采用方案 C，重建消息中心域模型，而不是仅在前端重排现有通知页。
- 改造范围覆盖 `packages/db`、`packages/schemas`、`packages/http-client`、`apps/server`、`apps/web`，必要时允许 `apps/admin` 做最小兼容调整，但不默认纳入范围。
- 固定推进顺序为：共享/数据库设计 -> server 消息域与接口 -> web 消息中心 -> 个人主页 -> 他人主页 -> 联调与验证。
- 共享区域必须指定唯一责任方，避免多人同时修改 `packages/*` 或消息接口契约。

## 任务分解列表

### TASK-MCR-001

- 任务名：消息域共享契约与数据库结构设计
- 类型：共享
- 优先级：P0
- 完成标准：
  - 定义新的消息分类、消息类型、目标对象结构、系统消息载荷结构。
  - 设计并落地消息域数据库结构，包括系统消息所需字段与目标对象索引策略。
  - 同步更新 `packages/schemas`、`packages/http-client`、`packages/db` 的基础契约与测试。
  - 保证 `apps/server` 与 `apps/web` 可以基于该契约继续实现，而无需再改消息核心数据模型。
- DDD 分类：`domain`
- test_strategy：`tdd`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：后端共享实现责任方
  - 允许修改：`packages/db/**`、`packages/schemas/**`、`packages/http-client/**`
  - 只读参考：`apps/server/**`、`apps/web/**`
  - 未完成前，其他任务不得自行扩展消息类型或消息载荷字段

### TASK-MCR-002

- 任务名：Server 消息域服务与接口实现
- 类型：后端
- 优先级：P0
- 完成标准：
  - 基于新消息域结构，实现消息写入、查询、已读、批量已读、系统消息生产链路。
  - 将内容发布/审核状态变化接入系统消息。
  - 输出适配前端消息中心消费的统一接口响应。
  - 完成与消息域直接相关的 server 测试。
- DDD 分类：`application`
- test_strategy：`tdd`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：后端实现责任方
  - 允许修改：`apps/server/**`
  - 只读参考：`packages/db/**`、`packages/schemas/**`、`packages/http-client/**`
  - 不允许绕过共享契约在 `apps/server` 内定义第二套消息返回结构

### TASK-MCR-003

- 任务名：Web 消息中心单列虚拟长列表重建
- 类型：前端
- 优先级：P0
- 完成标准：
  - 将 `notifications-page` 重建为新的消息中心页。
  - 实现 4 个一级分类：`点赞和收藏`、`新增关注`、`评论和@`、`系统消息`。
  - 使用单列虚拟长列表渲染消息项，支持未读态、批量已读、空态、错误态、跳转与刷新。
  - 基于新消息契约渲染不同消息卡片样式与统计信息。
- DDD 分类：`application`
- test_strategy：`tdd`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：前端消息实现责任方
  - 允许修改：`apps/web/src/routes/**`、`apps/web/src/components/**`、`apps/web/src/features/**`、`apps/web/tests/**`
  - 只读参考：`packages/http-client/**`、`packages/schemas/**`
  - 不允许在前端本地再拼装一套与共享 schema 不一致的消息模型

### TASK-MCR-004

- 任务名：个人主页联动优化
- 类型：前端
- 优先级：P1
- 完成标准：
  - 审查个人主页当前功能缺漏，并补齐与新消息中心联动相关的入口和信息组织。
  - 优化“我的内容 / 我的收藏 / 我的消息入口 / 我的关系状态”的布局与交互。
  - 与消息中心保持导航、统计或上下文联动一致。
- DDD 分类：`application`
- test_strategy：`test_after`
- 风险任务：否
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：前端主页实现责任方
  - 允许修改：`apps/web/src/features/auth/profile-page.tsx` 及直接相关组件/测试
  - 不修改消息共享契约

### TASK-MCR-005

- 任务名：他人主页功能补完与优化
- 类型：前端
- 优先级：P1
- 完成标准：
  - 审查他人主页当前资料展示、关注关系、内容可见性和内容流组织的功能缺漏。
  - 修复已确认缺漏，提升与消息、关注和内容消费链路的一致性。
  - 与个人主页在信息层级和交互反馈上保持协调，但不强行做同构页面。
- DDD 分类：`application`
- test_strategy：`test_after`
- 风险任务：否
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：前端主页实现责任方
  - 允许修改：`apps/web/src/routes/user-profile-page.tsx` 及直接相关组件/测试
  - 不修改消息共享契约

### TASK-MCR-006

- 任务名：联调、兼容与仓库级验证
- 类型：审查
- 优先级：P0
- 完成标准：
  - 完成消息中心、个人主页、他人主页与 server 接口的联调。
  - 如 `apps/admin` 因共享契约变更出现编译或测试问题，仅做最小兼容修正。
  - 完成本轮文档、测试、构建与回归验证。
- DDD 分类：`supporting`
- test_strategy：`verification`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 主会话统一负责验证与文档收口
  - `apps/admin/**` 仅在共享契约导致阻塞时允许最小修改

## 推荐执行顺序

1. `TASK-MCR-001`
2. `TASK-MCR-002`
3. `TASK-MCR-003`
4. `TASK-MCR-004` 与 `TASK-MCR-005` 可并行，但需在 `TASK-MCR-003` 的消息导航与入口方案确定后执行
5. `TASK-MCR-006`

## 并行与串行策略

- 串行：
  - `TASK-MCR-001 -> TASK-MCR-002 -> TASK-MCR-003`
- 可并行：
  - `TASK-MCR-004` 与 `TASK-MCR-005`
- 条件触发：
  - `apps/admin` 最小兼容调整仅在 `TASK-MCR-006` 中触发

## 高风险提醒

- 消息域属于共享核心区域，`packages/db`、`packages/schemas`、`packages/http-client` 必须只有一个责任方写入。
- 系统消息要覆盖内容发布/审核状态，若目标对象设计不清晰，后续前端会出现大量条件分支和跳转歧义。
- 前端虚拟长列表必须建立在稳定的消息项 key 与可预测高度策略上，避免滚动抖动。
- 主页优化不能与消息中心割裂，否则会形成第二套“消息/关系入口”体验。

## 条件触发任务

### TASK-MCR-007

- 任务名：Admin 最小兼容调整
- 类型：前端
- 优先级：P2（条件触发）
- 完成标准：
  - 仅修复因共享 schema / HTTP client / DB 变更导致的 `apps/admin` 编译或运行阻塞。
  - 不新增 admin 新功能。
- DDD 分类：`supporting`
- test_strategy：`test_after`
- 风险任务：否
- 文件所有权 / 共享路径提醒：
  - 仅在 `TASK-MCR-006` 发现阻塞时触发
  - 修改范围仅限 `apps/admin/**` 的最小兼容代码
