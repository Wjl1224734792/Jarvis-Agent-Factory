---
description: 浏览器自动化测试闭环——先写用例，再操作浏览器执行，记录结果，失败则驱动修复重测
argument-hint: [测试范围—URL、功能描述或页面路径]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent
---

# 浏览器自动化测试闭环

> 这是主动测试模式（编写用例 → 执行 → 修复）。若需修复已知 Bug 并用浏览器复现，请使用 `/bug-fix`。

立即执行以下步骤：

## 步骤 0：加载技能
```
Skill("behavioral-guidelines")
Skill("agent-browser")
Skill("browser-testing")

**引擎驱动**：引擎运行时，测试完成后 `mcp__jarvis-engine__gate_enforce` 验证 Gate C2，`mcp__jarvis-engine__advance_gate` 推进。
```

## 步骤 1：确认测试范围
若用户未提供，先询问并确认：
- **目标 URL**：测试页面地址
- **功能范围**：要验证的具体功能
- **关键用户路径**：核心操作流程
- **已知风险点**：最近修改或历史上出 Bug 的区域

## 步骤 2：编写测试用例清单
输出到 `docs/testing/YYYY-MM-DD-<topic>-browser-test-cases.md`。
每条用例包含：编号（TC-001 起）、前置条件、操作步骤、预期结果、验证方式、优先级（P0 阻塞 / P1 重要 / P2 次要）

## 步骤 3：逐条执行测试（不可绕过）

使用 `agent-browser` CLI 工具按优先级从高到低逐条执行。

### 加载最新 CLI 文档
```bash
agent-browser skills get core
```

### 初始化浏览器
```bash
agent-browser open <url>                    # 默认无头
agent-browser --headed open <url>           # 有头模式调试
agent-browser profile list                  # 查 Chrome profiles（可选）
agent-browser --profile "Default" open <url> # 复用 Chrome 登录态（可选）
```

### 每条用例执行序列
```bash
1. agent-browser open "<URL>"                            # 导航
2. agent-browser snapshot -i                             # 获取 @e1, @e2 元素引用
3. agent-browser click @eN                               # 点击
   或 agent-browser fill @eN "text"                       # 填写
   或 agent-browser press "Enter"                         # 按键
   或 agent-browser select @eN "option"                   # 下拉选择
4. agent-browser screenshot tc-NNN-step.png               # 截图留证
   或 agent-browser screenshot --annotate                 # 带标注截图
5. 验证：
   - agent-browser snapshot -i                           # 确认预期元素出现/消失
   - agent-browser get text @eN                          # 确认文本内容
   - agent-browser console                               # 检查 JS 错误
   - agent-browser errors                                # 检查未捕获异常
   - agent-browser network requests --filter api         # 检查 API 状态
```

### 执行规则
- 每条用例关键交互后截图
- 失败立即记录：`agent-browser screenshot` + `agent-browser console` + `agent-browser errors` + `agent-browser network requests`
- 前置条件不满足则标记"跳过"，写明原因
- 页面异常时 `agent-browser close` 清理后重试
- 不用硬等待；用 `agent-browser wait "<selector>"` 轮询确认元素就绪

### 响应式验证（按需）
```bash
agent-browser set viewport 375 812   && agent-browser screenshot mobile.png
agent-browser set viewport 768 1024  && agent-browser screenshot tablet.png
agent-browser set viewport 1280 800  && agent-browser screenshot desktop.png
```

## 步骤 4：汇总测试报告
输出到 `docs/testing/YYYY-MM-DD-<topic>-browser-test-report.md`，包含：测试概览（通过/失败/跳过/通过率）、每条用例详细结果（含截图路径）、失败用例根因分析、控制台/网络错误日志

## 步骤 5：闭环——失败驱动修复（不可绕过）

### 全部通过 → 闭环完成，输出最终报告。

### 存在失败 → 启动修复闭环：
1. 输出 **Browser Test Findings**（失败用例 + 截图证据 + 控制台/网络错误 + 修复建议）
2. 触发修复：提交给 `/review-fix` 闭环或调用对应实现 agent
3. 代码质量验证：修复后必须先通过 Lint + Type-check + Build（三项全部通过才能继续）
4. 重测验证：仅重跑失败用例，更新报告
5. 全部通过后 → 闭环完成

```
测试 ──全部通过──→ ✅ 闭环完成
  │
  └──存在失败──→ Browser Test Findings → /review-fix → 重测失败用例
                                                         │
                                                    通过→ ✅ 闭环完成
                                                    仍失败→ 再次修复（最多 2 轮）
```

**最多 2 轮修复-重测循环**，第 3 轮仍失败则标记为 BLOCKED 并上报。

## 红线
- 不写用例直接操作浏览器（缺少可追溯的测试计划）
- 测试失败不截图（缺少证据）
- 跳过修复闭环（失败用例不驱动修复，测试失去意义）
- 在浏览器中执行破坏性操作（删除数据、发起支付等）
- 用硬等待（sleep/wait）替代 `agent-browser wait` 轮询确认页面状态
