---
description: 浏览器自由探索——browser-use 自主探索 + 自动发现 UI bug + 出具结构化报告
argument-hint: [URL 或功能描述]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent
version: "4.3.7"
updated: "2026-05-14"
---

# 浏览器自由探索

> **自主探索模式**（browser-use 自主浏览 → 自动发现 Bug → 出报告）。
> 默认探索本地 Web 面板(127.0.0.1:3456)，也可传入 URL 探索任意网站。
> 若需按预先编写的测试用例逐条执行验证，请使用 `/browser-test`。
> 若需修复已知 Bug 并用浏览器复现，请使用 `/bug-fix`。

立即执行以下步骤：

## 步骤 0：加载技能 + 注册引擎

加载以下技能：
   - `Skill("behavioral-guidelines")`
   - `Skill("browser-testing")`
   - `Skill("browser-use")`

**引擎会话注册**（硬约束——引擎确保测试操作不越权）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "full" })`
- 加入后调用 `mcp__jarvis-engine__gate_jump({ gate: "Gate C2" })` 进入探索验证阶段
- 生成 browser-use Agent 前调用 `mcp__jarvis-engine__gate_check({ operation: "spawn_test" })`

## 步骤 1：确认探索范围

若用户未提供参数，默认探索 `http://127.0.0.1:3456`（本地 Web 面板）。
有参数时使用用户提供的 URL。

确认以下信息：
- **目标 URL**：要探索的页面地址（默认 127.0.0.1:3456）
- **探索范围**：全站自由探索 / 指定页面 / 指定功能流程
- **探索深度**：浅层（首屏 + 主要交互）/ 中层（核心流程 + 边界）/ 深层（全链路 + 边界 + 异常路径）
- **已知风险点**：最近修改或历史上出 Bug 的区域（重点探索）
- **视口覆盖**：桌面端 / 平板 / 移动端（三选一或全部）

## 步骤 2：自由探索（browser-use-expert）

### 2.1 spawn browser-use-expert

**引擎验证**：spawn 前 `gate_check({ operation: "spawn_test" })`

```
Agent({
  subagent_type: "browser-use-expert",
  description: "自由探索测试",
  prompt: <探索任务描述>
})
```

**探索任务描述模板**：
```
对 <目标URL> 进行自由探索。

探索范围：<范围描述>
探索深度：<深度>
重点区域：<已知风险点>
视口覆盖：<桌面/平板/移动端>

要求：
1. 自主浏览页面，不预设操作路径
2. 发现任何异常（布局错乱、点击无响应、文字截断、颜色异常、控制台报错、API 失败）立即截图
3. 尝试边界操作：快速连点、空表单提交、超长文本输入、特殊字符
4. 记录所有发现的问题，标注严重度（P0 阻塞 / P1 功能受损 / P2 体验问题）
5. 探索完成后输出结构化报告
```

### 2.2 终端环境回退

当 `browser-use-expert` 不可用时（如终端无 Chrome 扩展），回退到 `browser-test-expert` + `agent-browser` CLI：
```bash
agent-browser skills get core
```

## 步骤 3：汇总探索报告

`browser-use-expert` 返回后，将其发现汇总到 `docs/YYYY-MM-DD/testing/<topic>-exploration-report.md`：

```markdown
# 浏览器自由探索报告

**探索日期：** YYYY-MM-DD
**目标 URL：** <URL>
**探索模式：** 自由探索（browser-use-expert）
**视口覆盖：** 桌面 / 平板 / 移动端

## 探索概览
- 探索页面数：N
- 发现 Bug 数：N（P0: N, P1: N, P2: N）
- 截图证据数：N

## 发现清单

### P0 阻塞
| # | 描述 | 截图 | 复现步骤 |
|---|------|------|---------|
| 1 | ... | ![...](path) | ... |

### P1 功能受损
| # | 描述 | 截图 | 复现步骤 |
|---|------|------|---------|

### P2 体验问题
| # | 描述 | 截图 |
|---|------|------|

## 控制台错误
## 网络请求失败
## 性能观察（LCP/CLS/长任务）
```

## 步骤 4：闭环——发现驱动修复（条件性）

### 无 Bug 发现 → 闭环完成，输出最终报告。

### 存在 P0/P1 Bug → 启动修复闭环：
1. 输出 **Exploration Findings**（Bug 清单 + 截图证据 + 复现步骤）
2. 询问用户是否立即修复，或仅保留报告待后续处理
3. 若立即修复：提交给 `/bug-fix` 闭环
4. 修复后重新探索验证（仅验证修复项）
5. 全部 P0/P1 关闭后 → 闭环完成

```
自由探索 ──无Bug──→ ✅ 闭环完成
    │
    └──有Bug──→ Exploration Findings → 用户决策
                                          │
                            立即修复 → /bug-fix → 重探索验证
                            保留报告 → 记录到 issue tracker
```

## 并行策略

当探索涉及多个独立页面或视口时，可并行启动多个 Agent：

| 场景 | 可并行 Agent | 最大并行数 | Session 命名 |
|------|-------------|-----------|-------------|
| 多页面并行探索 | 3x browser-use-expert | 3 | explore-dashboard-001 / explore-agents-002 / explore-archive-003 |
| 多视口并行测试 | 3x browser-use-expert | 3 | test-desktop-001 / test-tablet-002 / test-mobile-003 |
| 探索+用例并行 | browser-use-expert + browser-test-expert | 2 | explore-<target>-001 + test-case-001 |

**并行规则:**
- 默认本地面板三大页面（Dashboard / Agents / Archive）可同时并行探索
- 每个 Agent 使用独立 `--session <name>` 避免浏览器冲突
- 最大并行数 3，超出会导致 Chromium 内存溢出
- 并行结果需汇总为单一报告（去重 + 全局摘要）
- Session 使用完毕立即 `browser-use close --all` 释放资源

## 红线
- 不确认探索范围就直接开始（缺少目标的探索 = 浪费时间）
- 探索发现 Bug 不截图（缺少证据）
- 在浏览器中执行破坏性操作（删除数据、发起支付、修改生产数据）
- 用硬等待（sleep/wait）替代轮询确认页面状态
- 跳过报告生成（探索结果没有文档化 = 探索无效）
