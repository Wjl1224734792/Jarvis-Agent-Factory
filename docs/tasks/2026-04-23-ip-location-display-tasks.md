# IP 属地展示调整任务分解

> **生成日期**: 2026-04-23  
> **需求文档路径**: `docs/requirements/2026-04-23-ip-location-display-requirements.md`  
> **契约变更路径**: `docs/contracts/2026-04-23-rating-target-detail-time-contract-change.md`  
> **前端实现说明**: `docs/implementation/2026-04-23-ip-location-display-frontend-implementation.md`  
> **任务文档更新范围**: 仅更新 `docs/tasks/2026-04-23-ip-location-display-tasks.md`  
> **上游状态**: 需求与契约变更已由主会话确认；本任务文档可交付给 `planner`。

---

## 任务概览

本次调整是 Web 端展示层变更，并追加一个已批准的评分对象详情公开时间契约补齐：信息流不展示属地；各个详情页在发布时间 / 时间信息行追加 `<location>`，不在作者区域显示属地；评论区与回复区直接显示 `<location>`；个人主页与他人主页显示 `IP属地:<location>`。字段来源继续复用现有公开字段 `ipLocationLabel`，评分对象详情页额外只公开并消费 `createdAt`，不得新增、透出或依赖原始 IP 字段。

本轮新增后续任务用于解除评分对象详情页阻塞：先补齐评分对象公开时间契约（共享 / 后端），再让评分对象详情页时间行消费 `createdAt` 并追加属地。

| 优先级 | 数量 | 类型 |
|--------|------|------|
| 高 | 7 | 前端展示 / 共享契约 / 后端输出 |
| 中 | 1 | 回归测试 |
| **合计** | **8** | — |

---

## 共享协议影响顺序评估

本次已涉及共享协议，后续实现必须按以下顺序评估影响，但本任务文档只定义任务，不写业务代码：

1. `packages/schemas`：在评分对象公开 schema 中补齐 `createdAt`，优先只公开 `createdAt`。
2. `packages/http-client`：确认由 schema 推导或导出的 `RatingTargetDetail` 类型可消费 `createdAt`；不得在应用层重复定义响应结构。
3. `packages/shared`：确认无路由常量或共享辅助类型需要同步；如无影响，记录为无代码变更。
4. `apps/server`：确认评分对象详情响应向公开 schema 提供 `createdAt`；若字段已存在但被 schema 过滤，只补 schema；若序列化遗漏，再补服务层输出。
5. `apps/web`：评分对象详情页消费 `createdAt`，将属地追加到时间信息行，作者区域继续不展示属地。
6. `apps/admin`：默认不触碰；仅当编译或共享契约类型变化造成明确影响时再纳入修复。

---

## Forbidden

- 不改 DB schema、migration、seed 或数据库脚本。
- 不改 env、`.env.example`、CORS、OpenAPI 开关或基础设施配置。
- 不公开 raw `clientIp`，不新增任何原始 IP 字段依赖。
- 不修改 IP 属地解析算法，不改 `ipLocationLabel` 生成逻辑。
- 不碰 `apps/admin`，除非发现编译或共享契约影响。
- 不在 `apps/*` 重复定义应属于 `packages/*` 的响应结构。

---

## 任务分解列表

### TASK-001 | 调整 `IpLocationText` 公共展示能力

- **类型**: 前端
- **优先级**: 高
- **建议涉及文件**:
  - `apps/web/src/components/ip-location-text.tsx`
- **完成标准**:
  1. `IpLocationText` 支持无前缀渲染 `<location>`。
  2. `IpLocationText` 支持 `IP属地:<location>` 文案。
  3. 保持 `label` 为空时不渲染。
  4. 不将默认文案继续固化为 `发布于 <location>` 或 `IP属地：<location>`。
  5. 调用方能够显式区分详情页 / 评论区的无前缀渲染与主页的 `IP属地:` 前缀渲染，避免隐式默认值影响未核对页面。
- **DDD 分类**: 否，展示组件能力调整，不涉及领域模型或业务状态一致性。
- **测试分类**: `test_after`
- **风险任务**: 是。该组件被多个页面复用，默认文案或默认前缀策略变更可能影响未显式核对的调用方。
- **文件所有权 / 共享路径提醒**: 仅修改 `apps/web/src/components` 内组件；不得上提到 `packages/*`，不得修改后端字段契约。

### TASK-002 | 移除信息流与列表页属地展示

- **类型**: 前端
- **优先级**: 高
- **建议涉及文件**:
  - `apps/web/src/routes/home-page.tsx`
  - `apps/web/src/routes/circle-page-feed.tsx`
  - `apps/web/src/routes/rankings-page.tsx`
- **完成标准**:
  1. 首页信息流不再渲染属地文本。
  2. 圈子信息流不再渲染属地文本。
  3. 榜单列表页不再渲染属地文本。
  4. 移除上述页面中不再使用的 `IpLocationText` 导入。
  5. 不调整与属地无关的卡片布局、头像、交互逻辑。
- **DDD 分类**: 否，纯展示位置收敛。
- **测试分类**: `test_after`
- **风险任务**: 是。列表页数据结构仍可能携带 `ipLocationLabel`，但 UI 不应展示；需要通过页面级测试或快照式断言防止回归。
- **文件所有权 / 共享路径提醒**: 仅触碰 `apps/web/src/routes` 内目标页面；不得删除共享 schema 字段。

### TASK-003 | 详情页发布时间信息行追加 `<location>`

- **类型**: 前端
- **优先级**: 高
- **建议涉及文件**:
  - `apps/web/src/routes/post-detail-page.tsx`
  - `apps/web/src/routes/circle-page-detail.tsx`
  - `apps/web/src/routes/ranking-detail-page.tsx`
  - `apps/web/src/routes/rating-target-detail-header.tsx`
- **完成标准**:
  1. 帖子 / 动态详情页在发布时间所在信息行追加显示 `<location>`。
  2. 圈子动态详情页在发布时间所在信息行追加显示 `<location>`。
  3. 榜单详情页在发布时间所在信息行追加显示 `<location>`。
  4. 评分对象详情页的同类验收保留，但需通过 TASK-007 与 TASK-008 完成：先公开 `createdAt`，再在时间信息行追加 `<location>`。
  5. 详情页作者区域不显示属地，不出现 `发布于`、`IP属地`、`<location>` 或其它属地文本。
  6. 属地为空时保持不渲染，不出现残留前缀或占位文本。
  7. 不新增原始 IP 字段；评分对象详情页如需时间字段，只能消费已批准公开的 `createdAt`。
- **DDD 分类**: 否，发布时间信息行展示文案调整。
- **测试分类**: `test_after`
- **风险任务**: 是。详情页可能通过不同组件路径渲染发布时间信息行，实现前必须全量核对 `IpLocationText` 调用点，避免误放回作者信息区。
- **文件所有权 / 共享路径提醒**: 本任务只改 `apps/web` 路由与已有组件调用；评分对象详情页的共享契约补齐拆到 TASK-007。

### TASK-004 | 个人主页与他人主页属地统一为 `IP属地:<location>`

- **类型**: 前端
- **优先级**: 高
- **建议涉及文件**:
  - `apps/web/src/features/auth/profile-page.tsx`
  - `apps/web/src/routes/user-profile-page.tsx`
- **完成标准**:
  1. 当前用户个人主页显示 `IP属地:<location>`。
  2. 他人主页显示 `IP属地:<location>`。
  3. 主页场景保留 `IP属地:` 前缀，不复用详情页 / 评论区的无前缀样式。
  4. 继续使用现有 `profile.user.ipLocationLabel`、`settings.ipLocationLabel` 或登录态用户中的公开属地字段。
  5. 属地为空时不渲染任何属地占位文本。
  6. 不调整头像 fallback、资料编辑、主页内容筛选等无关逻辑。
- **DDD 分类**: 否，用户主页展示文案调整。
- **测试分类**: `test_after`
- **风险任务**: 是。主页与详情页共用展示组件时，容易被无前缀改动误伤，需明确断言主页保留 `IP属地:`。
- **文件所有权 / 共享路径提醒**: `apps/web/src/features/auth/profile-page.tsx` 可能同时承载资料设置逻辑，修改时只碰作者信息展示区域。

### TASK-005 | 评论与回复属地统一为 `<location>`

- **类型**: 前端
- **优先级**: 高
- **建议涉及文件**:
  - `apps/web/src/features/posts/post-comment-thread.tsx`
  - `apps/web/src/routes/model-comments-section.tsx`
  - `apps/web/src/routes/rating-target-detail-comment-card.tsx`
- **完成标准**:
  1. 帖子评论作者属地只显示 `<location>`。
  2. 帖子评论回复作者属地只显示 `<location>`。
  3. 机型评论作者属地只显示 `<location>`。
  4. 评分对象评论作者属地只显示 `<location>`。
  5. 评论区与回复区不再出现 `IP属地`、`发布于` 或其它前缀。
  6. 评论作者属地为空时保持不渲染。
- **DDD 分类**: 否，评论展示文案调整，不涉及评论状态机或权限。
- **测试分类**: `test_after`
- **风险任务**: 是。评论线程包含评论与回复两层渲染，容易只改一层。
- **文件所有权 / 共享路径提醒**: 仅修改 Web 端评论展示组件；不得修改评论接口、评论序列化或 `ipLocationLabel` 生成逻辑。

### TASK-006 | 补充页面级回归测试、契约回归与全站文案扫描

- **类型**: 测试
- **优先级**: 中
- **建议涉及文件**:
  - `apps/web/tests/*`
  - `packages/schemas` 相关测试（如已有 schema 测试覆盖评分对象响应）
  - `apps/server` 相关测试（如已有评分对象详情响应测试）
- **完成标准**:
  1. 增加或更新组件级测试，覆盖 `IpLocationText` 的无前缀、`IP属地:`、空值不渲染行为。
  2. 增加或更新列表页测试，断言首页信息流、圈子信息流、榜单列表不显示属地文本。
  3. 增加或更新详情页测试，断言发布时间所在信息行追加显示 `<location>`，作者区域不显示属地，且详情页属地不出现 `发布于`、`IP属地` 前缀。
  4. 增加或更新主页测试，断言个人主页与他人主页显示 `IP属地:<location>`。
  5. 增加或更新评论测试，断言评论与回复只显示 `<location>`。
  6. 覆盖评分对象公开契约的 `createdAt`：如果 TASK-007 已按 TDD 完成 schema / 服务层测试，本任务只做回归核对；如未覆盖，必须补齐对应测试后再验收。
  7. 覆盖评分对象详情页时间信息行：使用含 `createdAt` 与 `ipLocationLabel` 的 fixture，断言时间行显示日期 / 时间与 `<location>`，作者区域不显示属地。
  8. 使用文本扫描确认 `apps/web/src` 与 `apps/web/tests` 中不再存在误用于详情页 / 评论区 / 信息流的 `发布于`、`IP属地：` 等旧文案；主页保留的 `IP属地:` 需被视为允许项。
  9. 执行 Web 相关测试与契约相关测试；最终收尾按根规范执行 `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`，如 planner 缩小验证范围，需在计划中说明原因。
- **DDD 分类**: 否，测试覆盖任务。
- **测试分类**: `test_after`
- **风险任务**: 是。仅测公共组件无法覆盖页面级漏改；契约补齐若只测前端 fixture，也可能漏掉 schema 过滤或服务层输出缺失。
- **文件所有权 / 共享路径提醒**: 测试可覆盖 `apps/web`、`packages/schemas`、`apps/server` 的相关路径；不得为测试便利修改 DB schema、seed 数据结构或公开 raw `clientIp`。

### TASK-007 | 补齐评分对象公开时间契约（共享 / 后端）

- **类型**: 共享协议 / 后端
- **优先级**: 高
- **建议涉及文件**:
  - `packages/schemas/src/rankings.ts`
  - `packages/http-client` 中由 schema 推导或导出的评分对象详情类型相关文件（如存在）
  - `packages/shared` 中评分对象路由常量或共享类型相关文件（如存在）
  - `apps/server/src/modules/rankings/rankings.service.ts`
  - 相关 schema / service / contract 测试
- **完成标准**:
  1. 按 `packages/schemas -> packages/http-client -> packages/shared -> apps/server -> apps/web | apps/admin` 顺序完成影响评估，并在实现记录中说明每层是否需要代码变更。
  2. 公开评分对象详情响应补齐 `createdAt`，优先只公开并消费 `createdAt`。
  3. `createdAt` 使用现有数据层时间字段，不新增 DB schema、migration、seed 或数据回填。
  4. 服务层评分对象详情输出能通过公开 schema，不再因 schema 过滤导致前端拿不到 `createdAt`。
  5. `packages/http-client` 可正确推导或导出包含 `createdAt` 的评分对象详情类型；不得在 `apps/web` 手写重复响应类型。
  6. `packages/shared` 如无影响，保持不变；如发现必要共享类型或常量影响，必须保持最小改动。
  7. 不公开 `updatedAt`，除非 planner 发现现有契约已公开且必须同步；本次批准范围以 `createdAt` 为准。
  8. 不公开 raw `clientIp`，不修改 `ipLocationLabel` 生成逻辑。
  9. 不触碰 `apps/admin`，除非共享契约变更导致编译或类型错误。
- **DDD 分类**: 否。该任务是公开响应契约补齐，不涉及核心业务规则、聚合边界或状态转换。
- **测试分类**: `TDD`
- **风险任务**: 是。`ratingTargetSchema` 可能被榜单详情条目列表等多个响应复用，新增必填字段可能要求所有评分对象返回位置同步提供 `createdAt`。
- **文件所有权 / 共享路径提醒**: 这是共享协议任务，必须优先修改 `packages/schemas` 并评估 `packages/http-client`、`packages/shared`，再到 `apps/server`；不得跳过共享层直接在 `apps/web` 补类型。

### TASK-008 | 评分对象详情页时间行显示属地（前端补丁）

- **类型**: 前端
- **优先级**: 高
- **建议涉及文件**:
  - `apps/web/src/routes/rating-target-detail-header.tsx`
  - `apps/web/tests/*` 中评分对象详情页相关测试
- **完成标准**:
  1. 在 TASK-007 完成后，评分对象详情页消费公开 `createdAt`。
  2. 评分对象详情页在时间信息行显示 `createdAt` 对应的日期 / 时间，并追加 `<location>`；具体文案可沿用页面现有时间行风格，例如 `创建于 <date> · <location>` 或等价展示。
  3. 评分对象详情页作者区域继续不显示属地。
  4. `ipLocationLabel` 为空时，不渲染属地，也不留下多余分隔符、冒号或占位文本。
  5. `createdAt` 缺失时不得编造时间，不得回退到 `updatedAt` 或其它未批准字段；应保持现有页面可用状态并暴露测试失败给 planner 处理。
  6. 不引入 raw `clientIp`，不新增前端本地响应类型绕过 `packages/*`。
- **DDD 分类**: 否，前端展示补丁，不涉及领域建模。
- **测试分类**: `test_after`
- **风险任务**: 是。该页面此前已移除作者区域属地但缺少时间字段，补丁必须避免把属地重新放回作者区域。
- **文件所有权 / 共享路径提醒**: 仅修改 `apps/web` 评分对象详情页消费逻辑和相关测试；若发现类型缺失，应回到 TASK-007 的共享契约链路处理，不得在本任务私补类型。

---

## DDD 分类

本次没有任务需要 DDD 建模。新增的评分对象 `createdAt` 公开属于响应契约补齐，不改变评分对象的业务状态、权限、配额、计费、审批或聚合一致性。

| 任务 ID | DDD 判断 | 理由 |
|---------|----------|------|
| TASK-001 | 不需要 | 展示组件文案能力，不涉及领域规则。 |
| TASK-002 | 不需要 | 列表页展示移除，不涉及状态转换。 |
| TASK-003 | 不需要 | 详情页发布时间信息行展示文案，不涉及聚合一致性。 |
| TASK-004 | 不需要 | 主页公开字段展示，不涉及权限、配额、审批。 |
| TASK-005 | 不需要 | 评论作者属地展示，不改变评论业务规则。 |
| TASK-006 | 不需要 | 测试与回归检查。 |
| TASK-007 | 不需要 | 公开响应契约补齐，不改变领域规则或数据模型。 |
| TASK-008 | 不需要 | 评分对象详情页展示补丁，不涉及领域规则。 |

---

## TDD / test_after / manual_only 分类

| 分类 | 任务 ID | 说明 |
|------|---------|------|
| `TDD` | TASK-007 | 公开响应契约变更会影响 schema、服务输出和前端类型消费，属于高风险接口契约；必须先用 schema / service / contract 测试固定 `createdAt` 行为，再做最小实现。 |
| `test_after` | TASK-001、TASK-002、TASK-003、TASK-004、TASK-005、TASK-006、TASK-008 | UI 文案与展示位置回归适合实现后补齐针对性测试；TASK-006 负责统一补足页面级、文本扫描和契约回归缺口。 |
| `manual_only` | 无 | 本需求有明确可自动化断言的文案、位置与契约字段，不建议只做人工验证。 |

---

## 风险任务

| 任务 ID | 风险点 | 控制要求 |
|---------|--------|----------|
| TASK-001 | 公共组件默认文案或前缀策略影响多个页面 | 实现前全量核对 `IpLocationText` 使用点；调用方显式声明文案策略。 |
| TASK-002 | 信息流仍携带属地字段但 UI 不应展示 | 页面级断言“不显示属地文本”，不要删除数据字段。 |
| TASK-003 | 详情页发布时间信息行路径分散，且评分对象详情页此前缺少时间契约 | 普通详情页继续按原任务完成；评分对象详情页交由 TASK-007 / TASK-008 补齐。 |
| TASK-004 | 主页与详情页 / 评论区共用组件时容易丢失 `IP属地:` 前缀 | 为主页场景补充独立断言，避免被无前缀方案误覆盖。 |
| TASK-005 | 评论与回复两层渲染容易漏改 | 同时覆盖评论主楼与回复项。 |
| TASK-006 | 只测组件会漏掉页面调用错误；只测前端 fixture 会漏掉契约过滤 | 必须包含页面级测试、文本扫描、schema / 服务层契约回归核对。 |
| TASK-007 | `ratingTargetSchema` 复用面不清，新增必填 `createdAt` 可能影响多个评分对象响应 | 按共享协议影响顺序评估；优先只公开 `createdAt`；不碰 DB；用 TDD 锁定响应契约。 |
| TASK-008 | 属地可能被误放回评分对象作者区域，或时间缺失时误用未批准字段 | 只消费 `createdAt`；作者区域断言不显示属地；缺失字段回到契约任务处理。 |

---

## 文件所有权和共享路径提醒

- 本任务文档更新只修改 `docs/tasks/2026-04-23-ip-location-display-tasks.md`。
- 后续实现必须区分两类范围：原 IP 属地展示任务主要在 `apps/web/src/**` 与 `apps/web/tests/**`；评分对象公开时间契约任务需要从 `packages/schemas` 开始按共享协议链路评估。
- `IpLocationText` 是 `apps/web` 内共享组件，修改默认行为前必须核对所有调用点。
- 评分对象 `createdAt` 是共享响应契约字段，不得在 `apps/web` 私自补类型或重复定义响应结构。
- 不得修改 `apps/admin`，除非 `packages/*` 契约变化导致明确编译或类型影响。
- 不得修改 `packages/db`、DB schema、migration、seed、数据库脚本。
- 不得修改 env、`.env.example`、CORS、OpenAPI 或基础设施配置。
- 不得新增、透出或测试依赖原始 IP 字段，例如 `clientIp`。
- 删除展示时只删除 UI 渲染和未使用导入，不删除响应类型中的 `ipLocationLabel`。

---

## 推荐交付顺序

1. **TASK-001**：先调整公共组件能力，建立“详情页 / 评论区无前缀、主页保留 `IP属地:`”的显式文案策略。
2. **TASK-002**：移除信息流 / 列表页属地，及时清理导入。
3. **TASK-003**：完成已具备时间字段的详情页属地迁移；评分对象详情页保留到 TASK-007 / TASK-008。
4. **TASK-004**：统一个人主页 / 他人主页属地为 `IP属地:<location>`，单独验证主页前缀未被公共组件改动带偏。
5. **TASK-005**：统一评论与回复属地为 `<location>`。
6. **TASK-007**：按 TDD 补齐评分对象公开 `createdAt` 契约，并按共享协议链路评估影响。
7. **TASK-008**：评分对象详情页消费 `createdAt`，在时间信息行追加 `<location>`。
8. **TASK-006**：补齐页面级、契约级测试与全站文案扫描，执行收尾验证。

---

## 推荐的下一步

将本任务文档交给 `planner`。`planner` 应先读取需求文档、契约变更文档、前端实现说明和本任务文档，再制定后续执行计划。若实现时发现 `createdAt` 以外还必须公开其它时间字段，或发现需要改 DB / env / `apps/admin`，应停止扩展范围并回主会话确认。

---

## Gate B 自检结果

- **需求文档路径**: 已标明。
- **契约变更路径**: 已标明，并纳入后续任务。
- **任务概览**: 已更新，明确评分对象详情页只公开并消费 `createdAt`，不公开 raw IP。
- **任务分解列表**: 已保留 TASK-001 至 TASK-006，并新增 TASK-007、TASK-008；每个新增任务均包含任务 ID、名称、类型、优先级、完成标准、DDD 分类、测试分类、风险任务、文件所有权 / 共享路径提醒。
- **DDD 分类**: 已完成，结论为本次无 DDD 必需任务。
- **TDD / test_after / manual_only 分类**: 已完成；TASK-007 标记为 `TDD`，TASK-008 标记为 `test_after`，无 `manual_only`。
- **风险任务**: 已更新，覆盖共享契约复用、schema 过滤、作者区域误展示属地、未批准字段误用等风险。
- **文件所有权 / 共享路径提醒**: 已覆盖 `packages/schemas -> packages/http-client -> packages/shared -> apps/server -> apps/web | apps/admin` 影响顺序，并明确共享路径和文件所有权风险。
- **Forbidden**: 已明确不改 DB schema、不改 env、不公开 raw `clientIp`、不碰 `apps/admin` 除非发现编译 / 契约影响。
- **推荐交付顺序**: 已更新，先完成原展示任务，再补共享契约，最后做评分对象详情页前端补丁与统一测试。
- **推荐下一步**: 已给出，可直接交付给 `planner`。
- **结论**: Gate B 通过。
