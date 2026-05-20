---
name: cancel
description: 取消指令——中止活跃流水线运行，清理会话状态，安全退出；支持保留会话以开始新任务
model: deepseek-v4-pro
argument-hint: [--leave | --force]
allowed-tools: Read, Bash, Skill
version: "4.4.0"
updated: "2026-05-20"
---

# 取消流水线运行

中止当前活跃的 pipeline run，清理恢复数据，确保没有僵尸任务残留。

## 步骤 0：加载技能 + 注册引擎

```
Skill("behavioral-guidelines")
```

**引擎会话注册**：
- `mcp__jarvis-engine__session_join({ platform: "claude" })`
- 若当前无活跃会话，`session_join` 会自动创建；若已有会话则复用

---

## 模式选择

| 参数 | 行为 | 适用场景 |
|------|------|---------|
| `--leave` | 取消 run 并离开会话 | 彻底退出，不再继续当前任务 |
| `--force` | 强制清除所有会话状态 | 会话损坏、状态不一致时的紧急修复 |
| (默认) | 仅取消活跃 run，保留会话 | 取消当前任务，准备开始新任务 |

---

## 步骤 1：诊断当前状态

```
mcp__jarvis-engine__pipeline_status()
```

确认：
- 当前活跃 run ID
- 当前所在 Gate
- 任务名称
- 已通过的 checkpoint

---

## 步骤 2：执行取消

### 默认模式——取消 run，保留会话

```
mcp__jarvis-engine__pipeline_cancel({ leave_session: false })
```

- 将活跃 run 标记为 `aborted`
- 计算总耗时
- 保留会话，可立即调用 `pipeline_init` 开始新任务

### --leave 模式——取消 run 并离开

```
mcp__jarvis-engine__pipeline_cancel({ leave_session: true })
```

- 中止活跃 run
- 移除会话
- 清理恢复数据
- 适用于任务已完成或确认放弃的场景

### --force 模式——紧急清除

当会话状态异常（重复 checkpoint、Gate 卡死、run 僵死）时：

```
mcp__jarvis-engine__pipeline_cancel({ leave_session: true })
mcp__jarvis-engine__session_list()     # 确认所有会话已清理
```

若仍残留，手动检查 `.jarvis/engine.db` 中的 `pipeline_runs` 表。

---

## 步骤 3：确认结果

```
mcp__jarvis-engine__pipeline_status()
```

确认：
- [ ] 活跃 run 已标记 `aborted`
- [ ] 无残留活跃 run
- [ ] （--leave 模式）会话已移除
- [ ] 可开始新任务

---

## 与其他指令的关系

| 场景 | 推荐指令 |
|------|---------|
| 取消当前任务，换新任务 | `/cancel` → `/jarvis "新任务"` |
| 取消当前任务，换专门指令 | `/cancel` → `/backend` / `/frontend` / `/hotfix` 等 |
| 取消并彻底退出 | `/cancel --leave` |
| 暂停任务（保留状态） | `/cancel`（默认保留会话），稍后 `session_join` 恢复 |
| 紧急状态修复 | `/cancel --force` |

---

## 取消 vs 完成

| 操作 | run 状态 | 会话 | 恢复数据 |
|------|---------|------|---------|
| `/cancel` | `aborted` | 保留 | 清除 |
| `/cancel --leave` | `aborted` | 移除 | 清除 |
| 自然完成（最后 Gate 通过） | `completed` | 保留 | 清除 |
| 超时自动清理（2h 无活动） | `stale` | 标记 inactive | 保留 |

---

## 红线

- 不诊断直接取消——先 `pipeline_status` 确认要取消什么
- 取消后不确认——必须验证 run 状态已变更为 `aborted`
- 在子 Agent 中执行取消——取消是编排者权限，子 Agent 无权操作
- 跳过引擎工具直接操作数据库——始终通过 `pipeline_cancel` MCP 工具
