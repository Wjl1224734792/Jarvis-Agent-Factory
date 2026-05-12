# TASK-001: PubSub EventEmitter 实现文档

> 实现日期: 2026-05-12 | 状态: Done | 策略: TDD

---

## 1. 当前实现目标

创建 `src/engine/pubsub.ts`，提供进程内 EventEmitter 单例，定义 4 种事件类型，为所有下游事件驱动广播提供通信基础。

## 2. 对应需求 ID / 任务 ID

- **需求:** REQ-039（会话列表发布订阅实时化）
- **任务:** TASK-001

## 3. 变更文件 / 变更范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/engine/pubsub.ts` | 新建 | 进程内 EventEmitter 单例 + 事件类型定义 |
| `tests/pubsub.test.ts` | 新建 | 16 个单元测试，覆盖全部公有 API |

**未修改的文件:** db.ts、server.ts、routes.ts 等全部保持原样。

## 4. 业务规则说明

### 事件类型

| 事件类型 | 触发场景 | payload |
|---------|---------|---------|
| `session:changed` | session join/leave/timeout/delete/resume | `{ sessionId, action }` |
| `run:changed` | run create/complete/abort/archive/unarchive/pin/unpin/delete | `{ runId, sessionId, action }` |
| `gate:advanced` | advance_gate / gate_jump | `{ sessionId, runId, gate, previousGate }` |
| `agent:event` | insertAgentEvent 写入成功（非重复） | `{ runId, sessionId, agentId, eventType }` |

### 核心 API

| 函数 | 职责 | 幂等性 |
|------|------|--------|
| `getPubSub()` | 返回全局单例 EventEmitter，首次调用创建 | 是（多次调用返回同一实例） |
| `emitEvent(type, payload)` | 构建 PubSubEvent，注入 timestamp，emit | 是（纯转发，无副作用） |
| `resetPubSub()` | 移除所有监听器，归零计数器 | 是（多次调用无额外影响） |
| `getPubSubStats()` | 返回 { emitCount, broadcastCount } | 是（只读） |

### 设计决策

- **零新依赖:** 仅使用 Node.js 内置 `events` 模块
- **maxListeners=0:** 无限制，因为事件总线需要大量监听者（每个 SSE 连接都是一个监听者）
- **broadcastCount 初始化:** 保留字段初始化为 0，由下游（TASK-002 routes.ts）在 SSE 广播时递增
- **resetPubSub 不销毁实例:** 重置后单例仍可用，方便测试套件复用

## 5. 状态机 / 状态转换

不适用。PubSub 是无状态事件总线，仅涉及 emit → listener 的简单调用链。

## 6. 权限与幂等性说明

- **权限:** 不适用。进程内通信无外部访问。
- **幂等性:** 所有函数均为幂等。`emitEvent` 对同一 payload 多次调用产生多个事件（这是设计意图，去重由下游处理）。

## 7. 测试和验证结果

### TDD 流程

```
RED   → 测试失败（模块不存在）
GREEN → 16 个测试全部通过
REFACTOR → 移除未使用的类型导入，lint 归零
```

### 测试覆盖

```
tests/pubsub.test.ts (16 个测试)
  ├── 单一事件 emit 与监听 (2)
  ├── 单例模式 (2)
  ├── 多监听器 (2)
  ├── stats 统计 (2)
  ├── reset 隔离 (3)
  ├── 四种事件类型 (4)
  └── broadcastCount 追踪 (1)
```

### 全量测试

```
Test Files  11 passed (11)
Tests       178 passed (178)
Duration    751ms
```

### Lint + Typecheck

```
npx eslint src/engine/pubsub.ts tests/pubsub.test.ts → 0 errors, 0 warnings
npx tsc --noEmit → 0 errors
```

## 8. 风险 / 未解决项

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| EventEmitter 内存泄漏（忘记移除监听器） | 低 | maxListeners=0 防止警告，下游 TASK-002 应管理 SSE 连接生命周期 |
| 进程崩溃导致在途事件丢失 | 低 | 已标记在架构评审 ADR-1 中；8s 兜底轮询保证最终一致性 |
| broadcastCount 当前无法递增 | 低 | 下游 TASK-002/TASK-005 需添加递增逻辑 |

## 9. 推荐的下一步

- **TASK-002 (backend-api-expert):** SSE Payload 扩展 + 事件驱动广播（依赖 TASK-001 已完成）
- **TASK-005 (backend-api-expert):** 在所有 DB 写操作完成后调用 `emitEvent()` + 递增 `broadcastCount`
