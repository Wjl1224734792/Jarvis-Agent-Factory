---
name: browser-testing
description: "浏览器自动化测试方法论——测试用例编写规范、browser-use CLI 操作流程、报告模板、修复闭环。用于 /browser-test 和 /bug-fix 命令的执行。依赖 browser-use 全局技能。"
---

# 浏览器自动化测试

## 概述

基于 browser-use CLI 的浏览器交互测试方法。先编写结构化测试用例，再逐条执行浏览器操作，截图记录结果，失败驱动修复闭环。

**前置条件：** 已安装 `browser-use` 全局技能（`npx skills add browser-use/browser-use@browser-use -g -y`）。

**加载技能：** `Skill("browser-use")` 提供 CLI 操作能力，本技能提供测试方法论。

## 测试用例格式

每条用例输出到 `docs/testing/YYYY-MM-DD-<topic>-browser-test-cases.md`：

```markdown
### TC-001: <用例名称>
- **前置条件**：<URL、登录状态、数据准备>
- **操作步骤**：
  1. 导航到 <页面>
  2. 点击/输入 <元素>
  3. 验证 <结果>
- **预期结果**：<具体可验证的结果>
- **验证方式**：截图 / 状态检查 / 元素文本匹配
- **优先级**：P0（阻塞）/ P1（重要）/ P2（次要）
```

## 执行流程

按优先级从高到低逐条执行。每条用例使用 browser-use CLI：

```bash
browser-use open <URL>           # 1. 导航
browser-use state                # 2. 获取元素索引
browser-use click <index>        # 3. 交互
browser-use input <index> "text"
browser-use scroll down
browser-use screenshot           # 4. 截图留证
browser-use close                # 5. 清理
```

**执行规则：**
- 每次关键交互后截图
- 失败立即记录，截图保存失败状态
- 前置条件不满足则标记"跳过"，写明原因
- 页面异常时 `browser-use close` 清理后重试

## Bug 复现模式

接到 Bug 报告后：

1. 读取复现步骤
2. browser-use open → state → 逐步执行操作 → 异常点截图
3. 尝试至少 1 个变体确认触发边界
4. 输出复现证据：截图路径、操作步骤、实际 vs 预期

## 报告模板

`docs/testing/YYYY-MM-DD-<topic>-browser-test-report.md`：

```markdown
# 浏览器自动化测试报告

## 测试概览
| 总用例 | 通过 | 失败 | 跳过 | 通过率 |
|--------|------|------|------|--------|
| N      | N    | N    | N    | XX%    |

## 详情
### TC-001: <名称> — ✅ 通过
- 截图：<路径>
### TC-002: <名称> — ❌ 失败
- 预期：<结果> / 实际：<结果>
- 截图：<路径>
- 疑似原因：<分析>

## 失败汇总
| 用例 | 严重度 | 故障类型 |
|------|--------|---------|
```

## 修复闭环

1. 全部通过 → ✅ 闭环完成
2. 存在失败 → Browser Test Findings → `/review-fix` 修复 → 仅重跑失败用例 → 更新报告
3. 最多 2 轮，第 3 轮仍失败标记 BLOCKED

## 红线

- 不写用例直接操作浏览器
- 失败不截图、不记录错误
- 跳过用例不标注原因
- 伪造测试结果
- 执行破坏性操作（删除数据、发起支付等）
