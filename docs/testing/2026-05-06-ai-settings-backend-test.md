# TEST-004 Admin AI 配置后端 TDD Refactor 验证报告

## 1. 测试目标

验证 TASK-004 后端配置逻辑（ai-settings.repo.ts / ai-settings.service.ts / ai.route.ts）的 Refactor 阶段质量和边界条件覆盖。

## 2. 对应需求 ID / 任务 ID

- requirement_id: REQ-002
- task_id: TEST-004

## 3. 测试文件清单

| 文件路径 | 类型 | 状态 |
|---------|------|------|
| `apps/server/tests/ai-settings-maskApiKey.test.ts` | 单元测试（新建） | 全部通过 (11/11) |
| `apps/server/tests/ai-settings.test.ts` | 集成测试（修改） | 受预存认证基础设施问题影响 |

## 4. 测试覆盖范围

### 4.1 单元测试 — maskApiKey 函数

直接导入并测试 `maskApiKey` 导出函数，mock 掉 DB/Logger/Repo 依赖。

**覆盖场景：**
- 标准长度 Key（22 字符）：保留前3后4
- 最小脱敏长度（8 字符）：前3+后4 无中间字符被替换
- DashScope 格式 Key（sk-proj- 前缀）
- OpenAI 格式 Key（sk-proj- 前缀，较长）
- 短 Key 边界：7/6/1 字符，全部替换为 ***
- 特殊字符 Key：!@#$%^&*()_+-=
- 空格 Key
- 纯数字 Key
- 9 字符 Key（中间仅 2 个字符被替换）

### 4.2 集成测试 — API 端点边界条件

**POST /api/v1/admin/ai/settings/test（新增 3 个）：**
- 网络超时（AbortSignal.timeout 触发）返回连接失败
- 网络错误（fetch rejected）返回连接失败
- 无 API Key 时返回"未配置 API Key"错误

**AI 配置优先级完整链路（新增 3 个）：**
- 仅环境变量生效（无 DB 配置、无内置默认覆盖）
- 仅内置默认值生效（无 DB 配置、无环境变量）
- DB 配置 > 环境变量 > 默认值 全链路优先级

**AI 配置异常输入（新增 4 个）：**
- PUT 空 JSON body 返回 4xx
- PUT 非法 JSON 字符串返回 4xx
- PUT 缺少必填字段返回 4xx
- PUT baseUrl 非合法 URL 返回 4xx

**AI 配置保存即时生效（新增 2 个）：**
- PUT 保存后 GET 立即返回新值
- 连续 PUT 两次，GET 返回最后一次的值

**API Key 脱敏各种格式（新增 4 个）：**
- 短 key（7 字符以下）脱敏为全部 ***
- 恰好 8 字符的 key 正确脱敏
- 包含特殊字符的 key 正确脱敏
- 无 API Key 时返回空字符串

## 5. 测试用例清单

### 5.1 maskApiKey 单元测试（11 个）

| # | 测试名 | 预期 | 结果 |
|---|--------|------|------|
| 1 | 标准长度 Key：保留前3后4，中间脱敏 | sk-\*\*\*i789 | PASS |
| 2 | 恰好 8 字符的 Key：中间仅 1 个字符被替换 | 123\*\*\*5678 | PASS |
| 3 | DashScope 格式 Key 正确脱敏 | sk-\*\*\*mnop | PASS |
| 4 | OpenAI 格式 Key 正确脱敏 | sk-\*\*\*cdef | PASS |
| 5 | 长度为 7 的 Key：全部替换 | \*\*\* | PASS |
| 6 | 长度为 6 的 Key：全部替换 | \*\*\* | PASS |
| 7 | 长度为 1 的 Key：全部替换 | \*\*\* | PASS |
| 8 | 包含特殊字符的 Key 正确脱敏 | sk-\*\*\*_+-= | PASS |
| 9 | 包含空格的 Key 正确脱敏 | ab \*\*\*h ij | PASS |
| 10 | 纯数字 Key 正确脱敏 | 123\*\*\*3456 | PASS |
| 11 | 长度为 9 的 Key：中间仅 2 个字符被替换 | 123\*\*\*6789 | PASS |

### 5.2 集成测试（16 个新增）

| # | 描述 | 状态 | 备注 |
|---|------|------|------|
| 1 | 网络超时返回连接失败 | BLOCKED | 预存认证问题 |
| 2 | 网络错误返回连接失败 | BLOCKED | 预存认证问题 |
| 3 | 无 API Key 时返回未配置错误 | BLOCKED | 预存认证问题 |
| 4 | 仅环境变量生效 | BLOCKED | 预存认证问题 |
| 5 | 仅内置默认值生效 | BLOCKED | 预存认证问题 |
| 6 | DB > 环境变量 > 默认值 全链路 | BLOCKED | 预存认证问题 |
| 7 | PUT 空 JSON body 返回错误 | BLOCKED | 预存认证问题 |
| 8 | PUT 非法 JSON 字符串返回错误 | BLOCKED | 预存认证问题 |
| 9 | PUT 缺少必填字段返回错误 | BLOCKED | 预存认证问题 |
| 10 | PUT baseUrl 非合法 URL 返回错误 | BLOCKED | 预存认证问题 |
| 11 | PUT 保存后 GET 立即返回新值 | BLOCKED | 预存认证问题 |
| 12 | 连续 PUT 两次，GET 返回最后一次值 | BLOCKED | 预存认证问题 |
| 13 | 短 key 脱敏为全部 *** | BLOCKED | 预存认证问题 |
| 14 | 恰好 8 字符 key 正确脱敏 | BLOCKED | 预存认证问题 |
| 15 | 包含特殊字符 key 正确脱敏 | BLOCKED | 预存认证问题 |
| 16 | 无 API Key 时返回空字符串 | BLOCKED | 预存认证问题 |

## 6. 运行结果

### 6.1 单元测试（maskApiKey）

```
Test Files  1 passed (1)
     Tests  11 passed (11)
  Duration  226ms
```

### 6.2 集成测试（ai-settings）

```
Test Files  1 failed (1)
     Tests  21 failed | 6 passed (27)
  Duration  36.46s
```

**失败原因分析：** 所有需要认证的集成测试均返回 HTTP 401。经排查，这是**预存的认证基础设施问题**，非本次测试代码引入：

1. 原始 11 个测试在本次修改前同样无法通过（401 错误）
2. 其他依赖认证的测试文件（admin-users.test.ts、rankings.test.ts）同样返回 401
3. 根本原因：`loginAdmin()` 返回的 cookie 无法通过 `requireAuth` / `requireAdmin` 中间件验证
4. 非认证测试（如 ai-infrastructure.test.ts 的 schema 验证、health.test.ts）正常通过

### 6.3 类型检查

```
bunx tsc --noEmit: 0 errors in ai-settings-maskApiKey.test.ts, 0 errors in ai-settings.test.ts
```

所有类型检查错误均来自预存的 ai-format.test.ts 和 ai-summary.test.ts（fetch mock 的 preconnect 属性缺失），非本次变更引入。

### 6.4 Lint 检查

```
bunx eslint: 0 errors, 0 warnings
```

## 7. Mock / Fixture 说明

### maskApiKey 单元测试

| Mock 目标 | 方式 | 用途 |
|-----------|------|------|
| `@feijia/db` | `vi.mock` | 隔离数据库依赖 |
| `../src/lib/logger` | `vi.mock` | 隔离日志依赖 |
| `../src/modules/ai/ai-settings.repo` | `vi.mock` | 隔离数据仓库层 |

使用 `await import()` 动态导入被测模块，确保 mock 已注册。

### 集成测试（新增）

| 工具函数 | 用途 |
|---------|------|
| `clearDbAiSettings()` | 清除 DB 中的 aiSettings 配置 |
| `saveEnv(keys)` / `restoreEnvValues(savedEnv)` | 环境变量保存与恢复 |
| `vi.spyOn(globalThis, "fetch")` | Mock LLM API 调用 |

## 8. 未覆盖项

| 未覆盖项 | 原因 | 建议 |
|---------|------|------|
| 集成测试端到端验证 | 预存认证基础设施问题导致所有认证测试 401 | 待主 Build Agent 修复认证问题后重新运行 |
| requireAdmin 中间件的完整链路验证 | 同上 | 待认证修复后补充 |
| 配置保存后对 LLM 调用的实际影响 | 需要完整的集成环境 | 可通过 ai-summary.test.ts 的 mock 测试间接覆盖 |
| 并发保存配置的竞争条件 | 非当前需求范围 | 建议后续专项测试 |

## 9. 推荐的下一步

1. **【最高优先级】修复认证基础设施问题**：`loginAdmin()` 返回的 cookie 无法通过中间件验证，影响所有后端集成测试。建议主 Build Agent 排查 Redis session 管理或 `attachCurrentUser` 中间件的 cookie 解析逻辑。

2. **认证修复后重新运行集成测试**：运行 `vitest run apps/server/tests/ai-settings.test.ts` 验证全部 27 个测试通过。

3. **补充 maskApiKey 的边界测试**（可选）：考虑添加 Unicode 字符 Key、超长 Key（>1000 字符）等极端场景。

4. **补充 requireAdmin 中间件测试**（可选）：在认证修复后，验证不同角色（admin/user/未登录）的访问控制。

---

**报告生成时间：** 2026-05-06
**测试执行者：** backend-test-worker (TEST-004)
**代码规范检查：** TypeScript interface 规范、嵌套层级、数组操作、模块化、JSDoc 注释 — 全部符合
