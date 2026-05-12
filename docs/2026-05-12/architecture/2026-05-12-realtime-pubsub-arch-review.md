# 后端架构评审：实时发布订阅 + 架构优化 + 平台精简

> 评审日期: 2026-05-12
> 评审者: 后端架构师
> 输入文档: `docs/requirements/2026-05-12-realtime-pubsub.md` / `docs/tasks/2026-05-12-realtime-pubsub-ddd.md` / `docs/tasks/2026-05-12-realtime-pubsub-tasks.md`
> 状态: Draft

---

## 评审总览

本次评审覆盖 5 个架构决策域，每个域包含现状分析、方案评估矩阵、风险标注、推荐方案。最后以一个汇总 ADR 表格收尾。

| # | 决策域 | REQ | 风险等级 | 结论 |
|---|--------|-----|---------|------|
| 1 | 事件驱动发布订阅 | REQ-039 | 中 | 方案可行，需补充事件持久化和降级策略 |
| 2 | SSE Payload 四合一扩展 | REQ-038/040 | 中 | 方案可行，需补充按 session_id 过滤和 payload 优化 |
| 3 | 守护进程管理 | REQ-046 | 高 | 方案基本可行，PID 竞态需加强，跨平台需验证 |
| 4 | CLI 重构 | REQ-043 | 中 | 方案可行，需明确 Commander 或手动解析的选择 |
| 5 | 错误处理中间件 | REQ-045 | 中 | 方案可行，需补充敏感信息泄露防护细则 |

---

## 决策域 1：事件驱动发布订阅架构（REQ-039）

### 1.1 现状分析

当前架构的心跳模型：

```
┌──────────┐  8s 定时器   ┌──────────────┐  SSE push  ┌──────────┐
│  DB 写操作 │ ──(被动)──→ │ broadcastSSE() │ ────────→ │  Web 面板  │
└──────────┘              └──────────────┘            └──────────┘
                                    ↑
  仅 delete 操作主动调用 broadcastSSE()
```

**问题**：除了 `deleteRun` 和 `deleteSession` 显式调用 `broadcastSSE()`，其余所有写操作（session_join、advance_gate、agent_event、archive/unarchive/pin/unpin 等）完全依赖 8 秒定时器。用户操作后平均等待 4 秒、最差 8 秒才能看到 UI 更新。

### 1.2 方案评估矩阵

| 维度 | 方案 A: EventEmitter + 500ms 去抖 | 方案 B: 每写操作直接调用 broadcastSSE | 方案 C: 引入消息队列（Redis Pub/Sub） |
|------|-----------------------------------|--------------------------------------|--------------------------------------|
| **实时性** | 中（500ms 内） | 高（立即） | 高 |
| **广播频率控制** | 好（去抖聚合） | 差（高频写入时广播风暴） | 好（消费者可控制） |
| **事件丢失风险** | 中（进程内，崩溃丢失在途事件） | 低（同步调用） | 低（持久化） |
| **复杂度** | 低（Node.js 内置） | 极低（无新模块） | 高（新中间件 + 运维） |
| **新增依赖** | 零 | 零 | Redis 集群 |
| **可观测性** | 需自行埋点 | 调用即日志 | 内置 |
| **跨进程扩展** | 不支持 | 不支持 | 支持 |
| **符合约束** | 是 | 是 | 否（违反"不引入新依赖"） |

**评分维度权重**：实时性 30%、可靠性 30%、复杂度 20%、可扩展性 10%、约束符合 10%

| 方案 | 实时性 | 可靠性 | 复杂度 | 可扩展性 | 约束 | 加权得分 |
|------|--------|--------|--------|---------|------|---------|
| A: EventEmitter | 80 | 60 | 90 | 50 | 100 | **74** |
| B: 直接调用 | 95 | 95 | 100 | 30 | 100 | 84 |
| C: Redis | 95 | 95 | 40 | 95 | 0 | 46 |

### 1.3 事件丢失风险深度分析

**方案 A 的事件丢失场景**：

| 场景 | 丢失内容 | 概率 | 用户影响 |
|------|---------|------|---------|
| 引擎进程崩溃 | in-flight 的去抖窗口内聚合的事件 | 低 | 暂缺，8 秒兜底恢复 |
| EventEmitter 实例被意外替换 | 监听器丢失 | 极低 | 事件不推送，8 秒兜底恢复 |
| 去抖窗口内高频写入 | 部分事件被聚合（非丢失，是合并） | 正常行为 | 无影响，合并广播包含最新数据 |

**关键发现**：由于 8 秒兜底广播保留，EventEmitter 方案的事件丢失风险实质上已降级为"延迟交付"而非"丢失"。第 8 秒的兜底广播会拉取全量最新数据，覆盖在途事件的任何丢失。

**但存在一个细微问题**：如果 8 秒兜底广播和事件驱动广播同时存在，且数据在 500ms 窗口内多次变化，下游消费者可能收到两次推送——一次是去抖后的广播，一次是 8 秒定时器触发的广播。这两次 payload 可能完全一致（无新变更），造成冗余推送。

### 1.4 去抖策略评估

**方案描述**：事件触发后不立即广播，等待 500ms。如果 500ms 内有新事件，重置计时器。500ms 到期后执行一次广播。

**评估**：
- **优点**：高频写入（如连续多个 agent_event）时，避免连续多次 SSE 推送，减少网络带宽和客户端解析开销。
- **潜在问题**：如果事件持续高频（如每秒 10+ 个 agent_event），去抖会持续重置，广播始终不触发——直到事件流停下来才推送。此时 8 秒兜底成为实际上的主推送通道。

**建议**：增加**最大等待时间**（maxWait）参数，防止持续高频事件导致无限推迟广播。推荐 maxWait = 2000ms，即无论事件多么密集，至少每 2 秒广播一次。

### 1.5 事件持久化评估

**需求文档明确**：不引入新依赖。因此不考虑外部消息队列。

**替代方案**：利用现有的 `node:sqlite` 数据库做轻量事件日志：

- 新增一张 `event_log` 表（id, event_type, payload, created_at）
- 写操作完成后，在 emit 事件的同时写入 event_log
- 不引入新依赖，不违反约束
- 用途：调试、审计、启动时回放最近事件

**但**：需求文档明确"不修改数据库 Schema"。此建议需回退给编排者决策——如果事件持久化价值大于 Schema 修改成本。

### 1.6 架构建议

**推荐的混合方案**（方案 A + 方案 B 的精华）：

```
┌──────────┐  写操作完成  ┌───────────────┐  emit       ┌──────────┐
│  DB 写操作 │ ──────────→ │ pubsub.emit() │ ─────────→ │ EventEmitter │
└──────────┘              └───────────────┘            └─────┬────┘
                                                             │
                       ┌─────────────────────────────────────┤
                       │                                     │
                  ┌────▼─────┐                         ┌─────▼─────┐
                  │ 500ms 去抖 │                         │ 8s 兜底    │
                  │ maxWait 2s│                         │ 定时器     │
                  └────┬─────┘                         └─────┬─────┘
                       │                                     │
                       └──────────┬──────────────────────────┘
                                  │
                          ┌───────▼───────┐
                          │ broadcastSSE() │
                          │ (拉取全量最新)  │
                          └───────┬───────┘
                                  │
                          ┌───────▼───────┐
                          │   SSE 客户端   │
                          └───────────────┘
```

### 1.7 推荐方案

1. 采用方案 A（EventEmitter + 500ms 去抖），加上 maxWait=2000ms
2. 保留 8 秒兜底广播作为安全网
3. 在 `getPubSub()` 单例中增加事件计数器（emit 计数和 broadcast 计数），用于监控事件挤压情况
4. 事件持久化暂不实施（等 Schema 修改权限明确后再决策）
5. 所有事件 emit 在调用方（routes.ts / server.ts）完成，db.ts 保持纯函数 —— **已满足约束**

**风险缓解**：
- T-001（事件驱动覆盖不全）→ 8 秒兜底安全网
- R-002（高频事件导致广播延迟）→ maxWait=2000ms 上限
- R-003（崩溃丢失在途事件）→ 进程重启后 SSE 客户端重连 + 首次广播拉全量

---

## 决策域 2：SSE Payload 四合一扩展（REQ-038/040）

### 2.1 现状分析

当前 `broadcastSSE()` 的 payload 结构：

```json
{
  "sessions": [{
    "id", "platform", "role", "gate", "pipeline_type",
    "status", "task_name", "run_id", "pinned", "heartbeat",
    "latest_run_started_at", "agent_status"
  }],
  "count": 5
}
```

当前前端数据获取方式：

| 数据 | 当前获取方式 | 延迟 |
|------|------------|------|
| sessions | SSE 8s | 4s 平均 |
| connected_platforms | `api.status()` 8s 轮询 | 4s 平均 |
| pipeline (Gate 状态) | `api.pipeline()` 8s 轮询 | 4s 平均 |
| pipeline_runs | `api.pipelineRuns()` 8s 轮询 | 4s 平均 |

### 2.2 Payload 大小评估

**单条 session 的 `agent_status` 估算**：
- active agents: 通常 1-3 个
- recent_completed: 最多 5 个
- 每个 agent 约 100 字节 → agent_status 约 200 字节

**新 payload 大小估算**（典型场景：3 个活跃 session，每个 1 个 run）：

| 字段 | 估算大小 |
|------|---------|
| sessions (3 条) | ~1.5 KB |
| connected_platforms | ~200 B |
| pipeline (1 条) | ~500 B |
| pipeline_runs (3 条) | ~1 KB |
| **总计（未压缩）** | **~3.2 KB** |
| **总计（gzip）** | **~800 B** |

**结论**：payload 大小增长约 2x（从 ~1.5KB 到 ~3.2KB），仍在可接受范围内。SSE 本身不支持压缩，但 HTTP 层可启用 gzip（Hono 默认支持）。

### 2.3 按 session_id 过滤的需求分析

**场景**：多个 Dashboard 标签页同时打开，每个显示不同 session 的数据。

**当前架构**：SSE 是全局广播——所有连接的客户端收到相同推送。如果 Dashboard 筛选了特定 session，仍需接收全量数据并在前端过滤。

**评估**：
- **无需按 session_id 过滤推送**：因为 payload 大小可控（< 5KB），前端过滤成本为零（数组 filter）。
- **如果需要过滤**：需要修改 SSE 架构——每个客户端在连接时声明感兴趣的资源（类似 GraphQL Subscription）。这会显著增加复杂度，不值得。

**建议**：不实施按 session_id 过滤。全局广播 + 前端本地过滤是最简方案。

### 2.4 向后兼容性

**要求**：SSE payload 只追加字段，不删除现有 `sessions` 和 `count` 字段。

**当前 Layout.tsx SSE 处理逻辑**：只读取 `sessions` 字段，忽略未知字段。因此追加 `connected_platforms`、`pipeline`、`pipeline_runs` 不会破坏现有客户端。

**需要关注的迁移顺序**：
1. 后端先扩展 payload
2. 前端再切换为从 SSE 读取新字段
3. 最后前端移除轮询

这个顺序在 TASK-002（后端 SSE 扩展）→ TASK-006（前端移除轮询）中已正确编排。

### 2.5 推荐方案

1. SSE payload 扩展为 `{ sessions, count, connected_platforms, pipeline, pipeline_runs }` —— **同意当前方案**
2. 不实施按 session_id 过滤推送
3. 8 秒兜底广播与事件驱动广播复用同一 `broadcastSSE()` 函数（无需两套逻辑）
4. 所有字段向后兼容追加
5. `connected_platforms` 数据结构与现有 `/api/status` 的返回值保持一致

---

## 决策域 3：守护进程管理（REQ-046）

### 3.1 现状分析

当前 `server.ts` 已有基础 PID 管理：

```javascript
// 启动时
const PID_FILE = resolve(homedir(), '.jarvis', 'engine.pid');
writeFileSync(PID_FILE, String(process.pid));          // 写入 PID

// 端口检测（防止重复启动）
if (!stdio && await isPortInUse(port)) { return true; } // 检测端口占用

// 停止时
process.kill(Number(pid), 'SIGTERM');                  // 发送信号
unlinkSync(PID_FILE);                                   // 删除 PID 文件

// 状态查询
process.kill(Number(pid), 0);                           // 信号 0 检测进程存活
```

**缺失的部分**：
- 无崩溃自动重启
- 无 restart 命令（需先 stop 再 start）
- 无崩溃次数追踪和冷却期
- 异常退出时 PID 文件不清理（这反而是正确的——但需要区分"异常退出需重启"和"正常退出不重启"）

### 3.2 PID 文件竞态分析

**竞态场景 1：两个进程同时启动**

```
进程 A: 读取 PID 文件 → 不存在 → 准备写入
进程 B: 读取 PID 文件 → 不存在 → 准备写入
进程 A: 写入 PID_A
进程 B: 写入 PID_B    ← 覆盖了 A 的 PID
```

**当前缓解**：已有端口占用检测（`isPortInUse`）。因为两个进程无法同时绑定同一端口，端口检测可以作为第二道防线。

**竞态场景 2：引擎崩溃，PID 文件残留**

```
引擎 A: 正常运行 (PID=1234)
引擎 A: 崩溃，PID 文件未删除
新进程 B: 读取 PID 文件 → 1234
新进程 B: process.kill(1234, 0) → 失败（进程不存在）
新进程 B: 正常启动，写入新 PID
```

**当前缓解**：`engineStatus()` 和 `stopEngine()` 都使用 `process.kill(pid, 0)` 验证进程存活，不会误判。这个逻辑是正确的。

**竞态场景 3：PID 回收（高严重性但低概率）**

```
引擎 A: 正常运行 (PID=1234)，PID 文件记录 1234
引擎 A: 崩溃，PID 文件残留
操作系统: 进程 1234 退出
某个新进程: 恰好分配到 PID=1234（与引擎无关的进程）
引擎 B: 启动，读取 PID 文件 → 1234
引擎 B: process.kill(1234, 0) → 成功（但这是另一个进程！）
引擎 B: 误判为引擎仍在运行 → 拒绝启动
```

**缓解**：此场景概率极低（PID 回收需要操作系统恰好分配相同 PID 且新进程属于同一用户），但并非不可能。可以通过在 PID 文件中同时记录**启动时间戳**来进一步区分：

```json
{"pid": 1234, "startedAt": 1715500000000}
```

引擎 B 启动时比较：PID 存活且启动时间匹配才认为引擎在运行。

**但**：当前需求文档没有要求这种级别的防护。此项作为"已知风险"记录，暂不要求实施。

### 3.3 跨平台兼容性分析

| 操作 | Linux | Windows | macOS | 兼容风险 |
|------|-------|---------|-------|---------|
| `process.kill(pid, 0)` | 可用 | 可用 | 可用 | 无风险，Node.js 文档确认三平台均支持 |
| `process.kill(pid, 'SIGTERM')` | 优雅终止 | **不支持**，Node.js 在 Windows 上将 SIGTERM 映射为 `process.kill(pid)` 即强制终止 | 可用 | 中风险：Windows 上 `stopEngine()` 实际上会强制终止而非优雅退出。建议 Windows 上通过 HTTP 端点 `/api/shutdown` 发送优雅退出信号 |
| `unlinkSync(PID_FILE)` | 可用 | 可用 | 可用 | 无风险 |
| `writeFileSync(PID_FILE, ...)` | 可用 | 可用 | 可用 | 无风险 |
| 端口检测 `isPortInUse` | 可用 | 可用 | 可用 | 无风险 |

**关键发现**：项目是 Windows 11 开发环境，`SIGTERM` 在 Windows 上不支持。当前 `stopEngine()` 使用 `process.kill(pid, 'SIGTERM')` 在 Windows 上实际效果为强制终止——这与正常退出行为有差异（无法触发清理逻辑）。

**建议**：
1. 新增 `jarvis engine restart` 时，Windows 上 stop 阶段使用 `process.kill(pid)`（无信号参数，即默认 SIGTERM 映射）
2. 或新增一个 HTTP 端点 `POST /api/shutdown`，引擎收到后执行优雅退出（关闭数据库、清理 PID 文件、断开 SSE 连接），CLI 通过 HTTP 调用此端点

### 3.4 崩溃自动重启设计评估

**方案描述**：
- 最多重启 3 次
- 5 秒内连续崩溃则停止重启

**评估**：

```
崩溃次数计数器
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 崩溃 #1        │     │ 崩溃 #2        │     │ 崩溃 #3        │
│ 距上次启动 < 5s  │ ──→ │ 距上次启动 < 5s  │ ──→ │ 距上次启动 < 5s  │
│ → 重启          │     │ → 重启          │     │ → 停止重启      │
└──────────────┘     └──────────────┘     └──────────────┘
        ↑ 正常运行 > 5s 后重置计数器为 0
```

**潜在问题**：如果崩溃是由持久性错误（如端口被占用、数据库损坏）引起，每次重启都会立即崩溃，3 次重试无意义。但这正是冷却期要解决的——5 秒内 3 次崩溃说明问题不是暂时的。

**建议优化**：
1. 重启计数器应持久化到 PID 文件的扩展字段（JSON 格式，含 restartCount）
2. 每次成功运行超过 30 秒后重置计数器（而不只是 5 秒冷却期）
3. 每次重启前增加**指数退避**：第 1 次 1 秒、第 2 次 2 秒、第 3 次 4 秒

### 3.5 推荐方案

1. PID 文件格式扩展为 JSON：`{"pid": 1234, "startedAt": 1715500000000, "restartCount": 0}` —— **提升检测准确性**
2. 崩溃重启增加指数退避（1s / 2s / 4s）
3. 成功运行 30 秒后重置重启计数器
4. Windows 上 `stopEngine()` 建议增加 HTTP 优雅退出作为首选、`process.kill(pid)` 作为回退
5. `jarvis engine status` 增加运行时长输出（当前只返回 PID）
6. 端口占用检测保留作为重复启动的第二道防线

---

## 决策域 4：CLI 重构（REQ-043）

### 4.1 现状分析

当前 `src/cli.ts`（379 行）的结构：

| 部分 | 行数 | 职责 |
|------|------|------|
| 导入 + 常量 + HELP 文本 | ~55 行 | 依赖声明 + 文档 |
| parseArgs() | ~25 行 | 参数解析（手动实现） |
| resolveScope() / promptScope() | ~20 行 | 交互式 I/O |
| 命令路由 (switch-case) | ~200 行 | init / add / remove / upgrade / engine / web / hook / diff / doctor |
| 辅助函数 (removeMcp / diffPlatform / confirm / question) | ~60 行 | 工具函数 |

### 4.2 方案评估矩阵

| 维度 | 方案 A: 手写模块拆分（当前方案） | 方案 B: 引入 Commander.js | 方案 C: 维持现有结构 + 内联优化 |
|------|-------------------------------|--------------------------|-------------------------------|
| **新增依赖** | 零 | Commander.js (~500KB) | 零 |
| **参数解析能力** | 需自实现 | 内置（选项、变长参数、子命令） | 维持现状 |
| **帮助文本生成** | 需自实现 | 自动生成 | 维持现状 |
| **可测试性** | 好（每个命令独立模块） | 好（commander 内置测试 API） | 差（巨型 switch） |
| **学习成本** | 低（纯函数拆分） | 低（Commander 是业界标准） | 零 |
| **与现有代码风格一致性** | 高（当前用 switch-case） | 中（需迁移全部命令注册） | 最高 |
| **维护性** | 好（每个命令独立文件） | 好（规范化的命令定义） | 差（单文件越来越大） |

| 方案 | 可测试性 | 维护性 | 风格一致 | 约束符合 | 综合 |
|------|---------|--------|---------|---------|------|
| A: 手写模块拆分 | 80 | 85 | 90 | 100 | **86** |
| B: Commander.js | 90 | 90 | 60 | 70 | 78 |
| C: 内联优化 | 30 | 40 | 100 | 100 | 58 |

### 4.3 关键架构问题

**问题 1：当前 CLI 没有使用 Commander.js，而是手动实现的 `parseArgs()`**

需求文档描述的模块结构输出 `register(program: Command)`，暗示使用 Commander 模式。但当前代码是纯手动解析。如果 TASK-007 引入 Commander，这是一个**隐藏的架构变更**：
- 所有命令的注册方式需要改写
- 参数解析方式需要改写（从 manual args 到 Commander API）
- 相当于一次重写而非简单拆分

**建议**：明确决策——要么保持手动解析（纯拆分），要么引入 Commander（重写）。不要在拆分的同时引入 Commander，两者混合会导致实现复杂度倍增。

**推荐**：保持手动解析，纯模块拆分。理由：
- 符合"不引入新依赖"约束
- 降低回归风险（解析逻辑不变，只是物理文件拆分）
- 379 行拆分成模块后各文件都很小，不需要 Commander 来管理复杂度

**问题 2：resolveScope 依赖交互式 I/O（readline）**

DDD 文档正确指出 `resolveScope` 需要提取为可测试模块。关键在于：需要将 I/O 依赖注入，使纯逻辑部分可测试。

```
resolveScope(opts, promptFn?) → 返回 boolean
  - 如果 opts.globalExplicit → 直接返回 opts.global
  - 否则调用 promptFn()（默认 promptScope）
```

**问题 3：PLATFORMS 常量位置**

当前 `PLATFORMS` 常量定义在 `cli.ts` 中，被多个命令引用。拆分为多文件后应放到 `cli/utils/constants.ts` 或共享模块。

### 4.4 推荐方案

1. **不引入 Commander.js**，保持手动解析
2. 文件结构微调（在 DDD 建议基础上）：

```
src/cli/
  index.ts              ← 入口：解析参数 → 路由到命令模块
  commands/
    init.ts             ← init / jarvis（默认行为）
    add.ts              ← add
    remove.ts           ← remove / rm
    upgrade.ts          ← upgrade / update
    diff.ts             ← diff
    engine.ts           ← engine start/stop/restart/status（含 web 别名）
    hook.ts             ← hook
    doctor.ts           ← doctor / check
  utils/
    scope.ts            ← resolveScope（纯逻辑，可测试）
    args.ts             ← parseArgs
    constants.ts        ← PLATFORMS, ALL_PLATFORMS, GLOBAL_ROOTS, HELP
    io.ts               ← confirm, question（交互式 I/O 工具）
```

3. 每个命令文件导出 `execute(opts, positional, pkgInfo)` 而非 `register(program)` —— 因为不使用 Commander
4. resolveScope 将 `promptScope` 作为可选参数注入，便于单元测试

---

## 决策域 5：错误处理中间件（REQ-045）

### 5.1 现状分析

当前 `server.ts` 中 Hono 应用没有任何全局错误处理：

```javascript
const app = new Hono();
// 没有 app.onError()
// 没有 app.use('*', logger)
// 每个路由各自 try-catch
```

当前错误暴露情况：
- 未捕获的异常直接返回 Hono 默认错误响应（可能含堆栈）
- 路由内的 try-catch 已经处理了已知错误路径
- 没有请求日志

### 5.2 双层错误处理的分工设计

```
请求进入
    │
    ▼
┌─────────────────┐
│ 请求日志中间件    │ ← 记录 [METHOD] /path → 传给下游
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 路由 try-catch   │ ← 处理已知错误（业务逻辑错误、参数校验失败）
│ (保持不变)        │    返回具体错误信息
└────────┬────────┘
         │ 未捕获的异常
         ▼
┌─────────────────┐
│ 全局 onError     │ ← 最后防线：统一格式化、区分 4xx/5xx、屏蔽堆栈
└─────────────────┘
```

**分工原则**：
- **路由 try-catch**：处理"预期内的错误"——参数无效、资源不存在、权限不足等。返回对用户友好的消息。
- **全局 onError**：处理"意料之外的错误"——数据库连接断开、未捕获的类型错误、第三方库抛出等。返回通用错误消息，记录完整堆栈到日志。

**两者不冲突**：路由 try-catch 正常处理的异常不会到达 onError。只有路由没有捕获的异常才会被 onError 兜底。

### 5.3 敏感信息泄露防护矩阵

| 泄露类型 | 风险场景 | 防护措施 |
|---------|---------|---------|
| 堆栈追踪 | 未捕获异常直接返回给客户端 | `NODE_ENV=production` 时 `onError` 移除 `error.stack` |
| 文件路径 | 堆栈中含绝对路径暴露系统结构 | 生产环境不返回堆栈 |
| SQL 错误 | 数据库操作失败暴露表名/字段名 | 路由 try-catch 捕获并返回通用消息；onError 兜底 |
| 环境变量 | 错误消息中可能含密钥/Token | **高优先级**：onError 中增加正则扫描，过滤疑似密钥的字符串（如 `sk-`、`Bearer` 前缀） |
| 内部 API 地址 | 错误消息暴露内部服务 URL | onError 返回固定格式 `{ error: "Internal Server Error", code: 500 }` |

**关键建议**：全局 onError 的 5xx 响应**不应**包含原始错误消息（即使在开发环境），而是将原始错误写入服务端日志。客户端只看到通用消息 + 错误码。

### 5.4 推荐方案

1. 全局 `onError` handler 注册在 Hono 应用上
2. 错误响应统一为 `{ error: string, code: number }`
3. 生产环境（`NODE_ENV=production`）：error 字段为通用消息，不泄露任何内部信息
4. 开发环境：error 字段可包含具体错误消息，但仍不返回堆栈（堆栈写日志）
5. 请求日志中间件格式：`[2026-05-12T10:30:00Z] [GET] /api/sessions - 200 12ms`
6. 错误请求日志包含完整错误详情（开发环境含堆栈）
7. 敏感信息过滤：在日志中对疑似密钥/Token 的字符串做脱敏处理

---

## 共享区域变更评估

### 串行依赖合理性审查

DDD 文档对 `routes.ts` 和 `server.ts` 的串行顺序：

```
routes.ts:  TASK-002 (SSE 扩展) → TASK-005 (事件注入) → TASK-009 (平台精简)
server.ts:  TASK-003 (错误中间件) → TASK-004 (守护进程) → TASK-005 (事件注入) → TASK-009 (平台精简)
```

**评估**：

| 串行链 | 是否必要 | 理由 |
|--------|---------|------|
| routes.ts TASK-002 → TASK-005 | **必要** | TASK-005 在 TASK-002 的 SSE 广播框架之上注入事件 emit |
| routes.ts TASK-005 → TASK-009 | **不必要** | REQ-050（平台精简）与 SSE/事件无关，可提前并行 |
| server.ts TASK-003 → TASK-004 | **不必要** | 两个改动区域不同：中间件在 Hono app 层，守护在进程管理层 |
| server.ts TASK-004 → TASK-005 | **必要** | TASK-005 需要 TASK-004 的进程稳定性保证 |

**优化建议**：TASK-003 和 TASK-009 可以从串行链中解放出来并行执行。只需确保在 Git 合并时正确处理冲突。

---

## ADR 汇总

| ADR# | 决策 | 状态 |
|------|------|------|
| ADR-1 | 采用 Node.js 内置 EventEmitter 作为事件总线，500ms 去抖 + maxWait=2000ms，保留 8 秒兜底广播 | Proposed |
| ADR-2 | SSE payload 扩展为四合一（sessions + connected_platforms + pipeline + pipeline_runs），不做按 session 过滤 | Proposed |
| ADR-3 | 不引入事件持久化（不修改 DB Schema），通过 8 秒兜底缓解事件丢失风险 | Proposed |
| ADR-4 | PID 文件格式扩展为 JSON，崩溃重启增加指数退避，成功运行 30 秒后重置计数器 | Proposed |
| ADR-5 | CLI 重构不引入 Commander.js，保持手动解析方案，纯模块拆分 | Proposed |
| ADR-6 | Hono onError + 路由 try-catch 双层错误处理，生产环境不暴露堆栈，增加敏感信息过滤 | Proposed |
| ADR-7 | 全局 SSE 广播 + 前端本地过滤，不实现按 session_id 的推送路由 | Proposed |

---

## 风险汇总

| 风险 ID | 描述 | 严重程度 | 缓解措施 |
|---------|------|---------|---------|
| R-001 | 事件驱动广播覆盖不全 | 中 | 8 秒兜底；TDD 覆盖所有写路径 |
| R-002 | 高频事件导致去抖无限推迟 | 低 | maxWait=2000ms 上限；监控事件挤压 |
| R-003 | PID 回收导致误判引擎存活 | 低（概率极低） | PID 文件扩展为 JSON 含启动时间戳 |
| R-004 | Windows 上 SIGTERM 不支持 | 中 | 增加 HTTP `/api/shutdown` 优雅退出端点 |
| R-005 | CLI 重构引入 Commander 导致行为回归 | 中 | 明确不引入 Commander；保留现有解析逻辑 |
| R-006 | 错误中间件与现有 try-catch 冲突 | 低 | 双层分工：路由处理已知错误，onError 兜底未知错误 |
| R-007 | 敏感信息通过错误响应泄露 | 中 | 生产环境屏蔽堆栈；敏感信息正则过滤 |

---

## 总体评价

本次架构变更的设计质量较高，DDD 分析和任务分解充分。主要亮点：

1. **约束遵守良好**：全程不引入新依赖，使用 Node.js 内置模块
2. **风险缓解到位**：8 秒兜底广播作为事件驱动方案的安全网
3. **向后兼容设计**：SSE payload 只追加不删除；REST API 端点保留
4. **串行依赖合理**：虽然存在少量过度串行（TASK-003/009 不需要串行），但不影响交付安全性

**需要决策的开放问题**：
1. 是否在 PID 文件中增加 JSON 结构化数据（pid + startedAt + restartCount）？
2. CLI 重构是否引入 Commander.js？（推荐不引入）
3. 是否实施事件持久化（event_log 表）？（需要修改 Schema，需回退给编排者）
4. 是否新增 HTTP `/api/shutdown` 端点用于 Windows 优雅退出？
