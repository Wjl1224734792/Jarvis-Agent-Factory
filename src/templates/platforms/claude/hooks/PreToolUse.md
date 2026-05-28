---
name: PreToolUse
description: 工具调用前钩子——Gate 权限硬约束检查，确保所有写操作/Agent生成/测试/构建/部署均在当前Gate允许范围内
version: "4.3.9"
updated: "2026-05-24"
---

# PreToolUse Hook — Gate 权限硬约束

在每次工具调用前执行，拦截不允许的操作。

## 受控操作

| 工具调用 | MCP gate_check operation | 拦截行为 |
|---------|--------------------------|---------|
| Write / Edit | `write_code` | 按 Gate allow/deny 列表检查 |
| Agent | `spawn_impl` | 按 Gate 允许列表检查 |
| Bash(npm run build) | `build` | 按 Gate allow/deny 列表检查 |
| Bash(npm run lint) | `lint` | 按 Gate allow/deny 列表检查 |
| Bash(npm test) | `spawn_test` | 按 Gate allow/deny 列表检查 |
| Bash(git push) | `deploy` | 按 Gate allow/deny 列表检查 |
| Bash(npm publish) | `deploy` | 按 Gate allow/deny 列表检查 |
| Bash(git commit) | `write_code` | 按 Gate allow/deny 列表检查 |
| Bash(npx *) | `write_code` | 按 Gate allow/deny 列表检查 |
| Bash(node *) | `write_code` | 按 Gate allow/deny 列表检查 |

## 豁免操作
- `Read` — 任何 Gate 允许（只读不破坏状态）
- `Glob` / `Grep` — 等同于 Read
- `Skill` — 等同于 Read（知识加载）
- 引擎自身 MCP 工具（jarvis-engine 命名空间）— 始终豁免

## 实现逻辑（伪代码）

```
1. 识别当前工具调用是否为受控操作
2. 若工具在 jarvis-engine 命名空间 → 豁免
3. 若操作为 Read/Glob/Grep/Skill → 豁免
4. 调用 engine gate_check({ operation, session_id })
5. 若 gate_check 返回 allowed: false → 拦截并提示
6. 若 gate_check 返回 allowed: true → 放行
```

## 红线
- 绝不拦截引擎自身工具（会造成死锁）
- 绝不拦截 Read/Glob/Grep（会阻断信息流）
- 拦截时给出明确指引："当前Gate不允许此操作，先完成当前Gate条件"
