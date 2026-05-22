---
name: cancel
description: 取消指令——中止活跃流水线运行，清理会话状态，安全退出；支持保留会话以开始新任务
model: deepseek-v4-pro
effort: max
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
| 取消当前任务，换新任务 | `/cancel` → `/auto "新任务"` 或 `/jarvis "新任务"` |
| 取消当前任务，换专门指令 | `/cancel` → `/backend` / `/frontend` / `/hotfix` 等 |
| 取消并彻底退出 | `/cancel --leave` |
| 暂停任务（保留状态） | `/cancel`（默认保留会话），稍后 `session_join` 恢复 |
| 紧急状态修复 | `/cancel --force` |

---

## 中断各指令全表

以下表格定义 `/cancel` 对全部 31 条指令的中断行为。所有指令均通过 `session_join` 注册引擎会话，`/cancel` 统一调用 `pipeline_cancel` 清理。

### 编排入口（2条）

| 指令 | 活跃状态 | Cancel 清理 | 中断影响 | 恢复 |
|------|---------|------------|---------|------|
| `/jarvis` | pipeline_run + Gate 进度 + Agent spawn | `pipeline_cancel` — run→aborted, 清除 resume 数据 | 当前 Gate 进度丢失，已产出文档保留在 `.jarvis/` | 重启 `/jarvis` 新建 run |
| `/auto` | 路由检测→pipeline_run + Gate 进度 | `pipeline_cancel` — 路由到的流水线 run→aborted | 同上，按路由结果清理 | 重启 `/auto` 重新路由 |

### 平台开发（3条）

| 指令 | 活跃状态 | Cancel 清理 | 中断影响 | 恢复 |
|------|---------|------------|---------|------|
| `/frontend` | pipeline_run + Gate A→E | `pipeline_cancel` | C1.5 视觉验证中途取消则截图丢失 | 重启 `/frontend` |
| `/backend` | pipeline_run + Gate A→E（跳过 C1.5） | `pipeline_cancel` | 数据库 schema 变更如已执行不可回滚 | 重启 `/backend` |
| `/mobile --platform=X` | pipeline_run + 平台 Agent spawn | `pipeline_cancel` | C1.5 模拟器截图丢失，需重新获取 | 重启 `/mobile --platform=X` |

### 维护流程（5条）

| 指令 | 活跃状态 | Cancel 清理 | 中断影响 | 恢复 |
|------|---------|------------|---------|------|
| `/bug-fix` | pipeline_run + 复现/修复循环 | `pipeline_cancel` | 已修复代码保留，未验证 | 重启 `/bug-fix` 继续验证 |
| `/hotfix` | pipeline_run + hotfix 流水线 | `pipeline_cancel` | 紧急修复代码保留但未完成流程 | 重启 `/hotfix` 或手动完成 |
| `/refactor` | pipeline_run + refactor 流水线 | `pipeline_cancel` | 部分重构代码保留，可能处于不一致状态 | `git stash` 后重启 |
| `/simplify` | pipeline_run + simplify 流水线 | `pipeline_cancel` | 部分简化代码保留 | 重启 `/simplify` |
| `/improve` | pipeline_run + 迭代循环（Gate IM1↔IM3） | `pipeline_cancel` — 中断迭代 | 基准测试数据可能丢失，代码改动保留 | 重启需重新基准测试 |

### 测试（5条）

| 指令 | 活跃状态 | Cancel 清理 | 中断影响 | 恢复 |
|------|---------|------------|---------|------|
| `/test-unit` | pipeline_run + test executor | `pipeline_cancel` | 测试结果丢失，代码未变更 | 重启 `/test-unit` |
| `/test-e2e` | pipeline_run + e2e/browser test | `pipeline_cancel` | 浏览器会话关闭，E2E 结果丢失 | 重启需重新配置浏览器 |
| `/test-integration` | pipeline_run + integration tests | `pipeline_cancel` | 集成测试结果丢失 | 重启 `/test-integration` |
| `/test-perf` | pipeline_run + perf test | `pipeline_cancel` | 性能基准数据可能不完整 | 重启 `/test-perf` |
| `/test-security` | pipeline_run + security scan | `pipeline_cancel` | 安全扫描结果丢失 | 重启 `/test-security` |

### 审查（2条）

| 指令 | 活跃状态 | Cancel 清理 | 中断影响 | 恢复 |
|------|---------|------------|---------|------|
| `/audit` | pipeline_run + 审查 Agent spawn（只读） | `pipeline_cancel` — **安全取消，无代码变更** | 审查报告不完整 | 重启 `/audit` |
| `/audit-fix` | pipeline_run + 初审→修复→验证→复审循环 | `pipeline_cancel` | 已修复代码保留，复审未完成 | 重启 `/audit-fix` 继续 |

### 调研（3条）

| 指令 | 活跃状态 | Cancel 清理 | 中断影响 | 恢复 |
|------|---------|------------|---------|------|
| `/research` | pipeline_run + RS0→RS4 研究流水线 | `pipeline_cancel` — **安全取消，只读操作** | 研究报告不完整，中间产物保留 | 重启 `/research` |
| `/trace` | pipeline_run + trace 流水线 | `pipeline_cancel` — **安全取消，只读操作** | 追踪分析不完整 | 重启 `/trace` |
| `/evaluate` | pipeline_run + 方案评估 | `pipeline_cancel` — **安全取消，只读操作** | 评估报告不完整 | 重启 `/evaluate` |

### 工程流程（5条）

| 指令 | 活跃状态 | Cancel 清理 | 中断影响 | 恢复 |
|------|---------|------------|---------|------|
| `/publish` | pipeline_run + 质量门→测试→版本→提交→PR→Tag | `pipeline_cancel` | **⚠ 高风险**：如已提交/推送则不可逆，tag 已打则需手动删除 | 重启 `/publish` 从断点继续 |
| `/release` | pipeline_run + release 流水线 | `pipeline_cancel` | 版本号如已递增需手动回退 | 重启 `/release` |
| `/sync` | pipeline_run + 文档同步 | `pipeline_cancel` | 部分文档可能已修改（**安全：git checkout 可恢复**） | 重启 `/sync` |
| `/migrate` | pipeline_run + migrate 流水线 | `pipeline_cancel` | 部分迁移代码保留 | 重启 `/migrate` |
| `/debug` | pipeline_run + debug 流水线 | `pipeline_cancel` — **安全取消，只读诊断** | 诊断数据丢失 | 重启 `/debug` |

### 流程管理（3条）

| 指令 | 活跃状态 | Cancel 清理 | 中断影响 | 恢复 |
|------|---------|------------|---------|------|
| `/cancel` | pipeline_run（cancel 自身创建的） | 自我取消 — `pipeline_cancel` + 退出 | 已在取消流程中，再次取消即退出 | N/A |
| `/skill-flow` | pipeline_run + export/save/list/apply | `pipeline_cancel` | save 子命令中途取消则 SKILL.md 不完整 | 重启 `/skill-flow save <名称>` |
| `/task-design` | pipeline_run + task-design Agent | `pipeline_cancel` | TASK-XXX 任务包不完整 | 重启 `/task-design` |

### 技术咨询（3条）

| 指令 | 活跃状态 | Cancel 清理 | 中断影响 | 恢复 |
|------|---------|------------|---------|------|
| `/ask` | pipeline_run + 4模式自适应探询 | `pipeline_cancel` — **安全取消，只读对话** | 探询上下文丢失 | 重启 `/ask` |
| `/consult` | session_join + Agent spawn（只读） | `pipeline_cancel` — **安全取消，只读对话** | 专家分析上下文丢失 | 重启 `/consult` |
| `/browser` | pipeline_run + browser explore | `pipeline_cancel` — 关闭浏览器会话 | 浏览器探索上下文丢失 | 重启 `/browser` |

### 中断行为总结

| 指令类别 | 数量 | Cancel 安全性 | 备注 |
|---------|------|-------------|------|
| 编排入口 | 2 | 安全（文档保留） | 已产出 `.jarvis/` 文档不受影响 |
| 平台开发 | 3 | 安全（文档保留） | C1.5 截图需重新获取 |
| 维护流程 | 5 | 中等（代码部分保留） | 建议 `git diff` 检查改动 |
| 测试 | 5 | 安全（代码未变更） | 仅测试结果丢失 |
| 审查 | 2 | 安全（audit 只读） / 中等（audit-fix 代码保留） | — |
| 调研 | 3 | 安全（全部只读） | 无代码影响 |
| 工程流程 | 5 | ⚠ 注意（publish/release 有副作用） | 提交/标签不可自动回滚 |
| 流程管理 | 3 | 安全 | cancel 自身可直接退出 |
| 技术咨询 | 3 | 安全（只读对话） | 无代码影响 |

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
