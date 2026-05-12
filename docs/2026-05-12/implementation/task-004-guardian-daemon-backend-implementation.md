# TASK-004: 守护进程管理 — 实现文档

> 实现日期: 2026-05-12 | 需求: REQ-046 | 策略: TDD

---

## 1. 当前实现目标

实现 PID JSON 文件管理、崩溃自动重启、`engine restart/status` CLI 命令、HTTP `/api/shutdown` 端点。

## 2. 对应需求 ID / 任务 ID

- REQ-046（ADRs: ADR-4 PID JSON 含重启计数 + ADR-8 Windows stop 优先 HTTP shutdown）
- TASK-004

## 3. 变更文件 / 变更范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/engine/guardian.ts` | **新建** | PID JSON 文件管理 + 守护进程核心逻辑 (~160行) |
| `tests/guardian.test.ts` | **新建** | 27 个单元测试，覆盖 PID 管理、守护进程生命周期、崩溃重启策略 |
| `src/engine/server.ts` | **修改** | 集成 guardian：JSON PID 写入、`/api/shutdown` 端点、优雅退出信号处理、stopEngine/engineStatus 改用 guardian |
| `src/cli/commands/engine-restart.ts` | **新建** | `engine restart` 子命令：stop → wait → start |
| `src/cli/commands/engine-status.ts` | **新建** | `engine status` 子命令：显示 PID/运行时长/重启次数 |
| `src/cli/commands/engine.ts` | **修改** | 注册 `restart` 和增强版 `status` 子命令 |

## 4. 业务规则说明

### 4.1 PID 文件管理

- **路径**: `~/.jarvis/engine.pid`
- **格式**: JSON `{"pid": 1234, "startedAt": 1715500000000, "restartCount": 0}`
- **写入**: `writePidFile(pid)` — 自动创建目录，写入当前时间戳 + 重启计数
- **读取**: `readPidFile()` — 校验字段类型，损坏/缺失时返回 null
- **删除**: `removePidFile()` — 正常退出时调用，失败不抛异常

### 4.2 运行状态检测

- `isEngineRunning()` — PID 文件 + `process.kill(pid, 0)` 双重验证
- 进程已死时自动清理过期 PID 文件
- 启动时结合 `isPortInUse(port)` 做端口级二次确认

### 4.3 崩溃重启策略

| 参数 | 值 |
|------|-----|
| 最大重启次数 | 3 |
| 退避延迟 | 1s → 2s → 4s（指数） |
| 冷却窗口 | 5s（窗口内连续崩溃则停止重启） |
| 成功运行复位 | 30s 稳定运行后 restartCount 归零 |

- 监听 `uncaughtException` 和 `unhandledRejection`
- 超出冷却窗口：`_lastCrashTime` 被用于判定两次崩溃间隔
- 超出最大次数：调用 `stopGuardian()` 停止监听
- 重启成功后：启动 30s 定时器，到期复位 restartCount 并更新 PID 文件

### 4.4 优雅退出

- **SIGINT/SIGTERM**: 先 `stopGuardian()` 防止重启，再 `removePidFile()` 清理，最后 `process.exit(0)`
- **HTTP /api/shutdown**: Windows 平台 `process.kill(pid, signal)` 不可靠时的兜底方案
- **正常退出删除 PID，崩溃不删除**：崩溃时由 guardian 拦截，PID 文件保留供重启检测

## 5. 状态机 / 状态转换说明

```
                    ┌─────────────┐
                    │  未启动      │
                    └──────┬──────┘
                           │ startEngine()
                    ┌──────▼──────┐
                    │  运行中      │◄──────────┐
                    │ (守护激活)   │            │
                    └──┬───┬───┬─┘            │
         正常退出     │   │   │ 崩溃           │
    (SIGTERM/shutdown)│   │   │ (uncaught)     │
                    ▼   │   ▼                 │
              ┌────────┐│ ┌──────────┐        │
              │ 已停止  ││ │ 崩溃处理  │────────┘
              │(PID清理)││ │(检查策略) │  restartCount ≤3
              └────────┘│ └────┬─────┘   且未触发冷却
                        │      │
                        │      │ restartCount>3 或冷却触发
                        │      ▼
                        │ ┌──────────┐
                        │ │ 停止守护  │
                        │ │(不再重启) │
                        │ └──────────┘
                        │
                        │ engineStatus() 检测
                        ▼
                  ┌──────────┐
                  │ 未运行    │
                  └──────────┘
```

## 6. 权限与幂等性说明

### 幂等性
- `startGuardian()`: `_guardianActive` 标志防止重复注册
- `stopGuardian()`: 安全重复调用，无副作用
- `removePidFile()`: 文件不存在时不抛异常
- `writePidFile()`: 幂等——每次写入覆盖旧数据

### 权限
- PID 文件读写需要 `~/.jarvis/` 目录的读写权限
- `process.kill(pid, 0)` 无特殊权限要求（仅检查进程存在性）
- `/api/shutdown` 无额外鉴权（本地回环 `127.0.0.1` 绑定，外部不可达）

## 7. 测试和验证结果

```
Test Files  16 passed (16)
Tests       247 passed (247)
TypeScript  typecheck: 0 errors
ESLint:     0 errors, 0 warnings
```

新增 27 个 guardian 测试覆盖：
- readPidFile: 6 tests（null/有效/缺失字段/损坏/空文件）
- writePidFile: 3 tests（JSON 格式/目录创建/时间戳）
- removePidFile: 2 tests（存在/不存在不抛异常）
- isEngineRunning: 4 tests（无文件/PID 存活/PID 已死/并发删除）
- 守护进程生命周期: 3 tests（注册/防重复/移除监听器）
- 崩溃重启策略: 5 tests（1s/2s/4s 退避/超最大次数/5s 冷却）
- 30s 复位: 2 tests（归零/多次复位）
- 测试隔离: 2 tests

## 8. 风险 / 未解决项

| 风险 | 级别 | 缓解措施 |
|------|------|---------|
| Windows `process.kill(pid, signal)` 不支持 POSIX 信号 | 低 | 已有 HTTP `/api/shutdown` 兜底；`kill(pid, 0)` 在 Windows 上检查进程句柄有效性 |
| 进程内重启无法完全恢复状态 | 低 | 当前 onRestart 仅重写 PID 文件；真实崩溃后进程状态通常不保证一致，实际场景中外部进程管理器会更可靠 |
| 30s 成功运行计时器可能在测试中泄露 | 低 | `resetGuardian()` 在 `beforeEach`/`afterEach` 中清理所有计时器 |

## 9. 推荐的下一步

1. TASK-005 (Batch C) — 在 `src/web/routes.ts` 中对数据库写操作触发 PubSub emit 事件，已完成 TASK-003 + TASK-004 作为前置
2. 集成测试：启动真实引擎进程，触发 SIGTERM 验证优雅退出；触发崩溃验证重启策略
3. 生产环境建议配合 systemd / PM2 等外部进程管理器使用，守护进程作为补充保护
