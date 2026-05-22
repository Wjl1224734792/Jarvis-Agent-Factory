---
name: test-e2e
description: 端到端测试指令——基于用户故事生成 Playwright/Cypress 脚本，验证核心流程从前端到后端完整性
model: heavy
effort: max
argument-hint: [用户故事描述或E2E测试范围]
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill, WebFetch
version: "4.3.8"
updated: "2026-05-14"
---

# 端到端测试（E2E）

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎
```
Skill("behavioral-guidelines")
Skill("test-driven-development")
```

**引擎会话注册**（硬约束——引擎确保测试操作按 Gate 权限执行）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "full" })`
- 生成测试前调用 `mcp__jarvis-engine__gate_check({ operation: "spawn_test" })`

代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

## 步骤 1：提取用户故事和核心流程（不可绕过）

从需求文档或用户输入中提取：
- **用户角色**：谁在使用系统？（管理员、普通用户、访客）
- **核心流程**：用户要完成什么任务？
- **验收标准**：什么算完成？

示例用户故事映射：
```
故事: "作为用户，我要能注册并登录"
E2E 测试: 
  1. 访问注册页面 → 填写表单 → 提交 → 验证跳转到登录页
  2. 输入凭证 → 登录 → 验证跳转到首页
  3. 首页显示用户名 → 验证已登录状态
```

## 步骤 2：选择测试工具并配置

检测项目中已有的 E2E 工具：
- Playwright: `playwright.config.ts` / `@playwright/test`
- Cypress: `cypress.config.ts` / `cypress/`

若未配置，按项目前端技术栈推荐：
- 现代前端项目（React/Vue/Svelte）→ Playwright（推荐）
- 已有 Cypress 基础设施 → 继续使用

### Playwright 初始化（如需要）
```bash
npx playwright install --with-deps
```

## 步骤 3：编写 E2E 测试脚本

按用户故事编写测试，每个测试覆盖完整的用户旅程：

```typescript
// Playwright 示例
test('用户注册流程', async ({ page }) => {
  // Arrange: 导航到注册页
  await page.goto('/register');
  
  // Act: 填写注册表单
  await page.fill('[data-testid="username"]', 'testuser');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'SecurePass123');
  await page.click('[data-testid="submit"]');
  
  // Assert: 验证注册成功
  await expect(page).toHaveURL('/login');
  await expect(page.locator('.success-message')).toBeVisible();
});
```

**E2E 测试清单**（覆盖以下至少 3 个核心流程）：
- [ ] 用户注册/登录流程
- [ ] 核心 CRUD 操作（创建→查看→编辑→删除）
- [ ] 搜索/过滤/排序功能
- [ ] 支付/订单流程（如适用）
- [ ] 权限/角色切换验证
- [ ] 关键错误处理（404 页面、表单验证错误）

## 步骤 4：运行 E2E 测试

```bash
# Playwright
npx playwright test --project=chromium

# 调试模式（失败时）
npx playwright test --debug

# 生成报告
npx playwright show-report
```

**E2E 测试通过标准**：
- 所有核心流程测试 100% 通过
- 无 flaky 测试（连续 3 次运行均通过）
- 关键用户旅程覆盖完整（前端 API 调用 → 后端处理 → 数据库写入 → 响应返回）
- 测试执行时间在可接受范围（单流程 < 30s）

## 步骤 5：生成测试报告

输出 `.jarvis/YYYY-MM-DD/testing/e2e-test-report.md`：
```markdown
# E2E 测试报告
## 测试范围
- 用户故事列表
## 执行结果
- 通过 / 失败 / 跳过
## 失败用例分析
- 失败原因 + 截图证据
## 测试环境
- 浏览器版本、操作系统、数据库版本
```

## 闭环图示
```
用户故事 → 选择工具 → 编写测试 → 运行
                          ↓        ↓
                      编译通过   全部通过 → ✅
                          ↓        ↓
                      编译失败   部分失败
                          ↓        ↓
                      修正语法   分析+修复(最多2轮)
```

## 红线
- 不基于用户故事编写测试（无业务价值的测试 = 噪声）
- E2E 测试中 mock 后端（E2E 是验证真实集成，mock 后端 = 集成测试不是 E2E）
- 测试依赖固定数据（测试之间应创建和清理自己的数据）
- 使用 `page.waitForTimeout()` 硬等待（用 `waitForSelector`/`waitForResponse` 等条件等待）
- 测试互相依赖执行顺序（必须独立可运行）
- 只测一个浏览器（至少覆盖 Chromium，移动端项目加 mobile viewport）
