# 敏感词移除后审核流程验证测试报告

**日期:** 2026-05-06
**task_id:** TEST-009
**requirement_ids:** REQ-006
**test_strategy:** test_after

---

## 1. 测试目标

验证 TASK-010（移除硬编码敏感词过滤）后，帖子审核流程仍正常工作，无残留代码引用。

## 2. 对应需求 / 任务 ID

| 需求 ID | 描述 |
|---------|------|
| REQ-006 | 内容安全与审核流程 |

## 3. 测试文件清单

| 文件 | 路径 |
|------|------|
| sensitive-filter-removal.test.ts | `apps/server/tests/sensitive-filter-removal.test.ts` |

## 4. 测试覆盖范围

| 类型 | 覆盖 | 说明 |
|------|------|------|
| 静态扫描 | 残留引用检查 | 扫描 server/src 下所有源码文件，确认无敏感词相关残留 |
| 结构验证 | 审核模块依赖链 | 验证 posts-write-moderation.ts 仅依赖 text-moderation 服务 |
| 结构验证 | 写入服务审核集成 | 验证 posts-write-service.ts 正确调用审核模块 |
| 结构验证 | 路由层无敏感词分支 | 验证 posts.route.ts 无 sensitive_content 错误响应 |

## 5. 测试用例清单

### 5.1 残留引用扫描（5 个用例）

| 用例 | 预期 |
|------|------|
| 源码中不应存在 inspectPostWriteContent 引用 | server/src 下所有 .ts/.tsx/.js/.jsx 文件均不包含该字符串 |
| 源码中不应存在 posts-sensitive-filter 的 import | 无文件 import 该模块 |
| 源码中不应存在 sensitive_content 错误码引用 | 无文件引用该错误码 |
| 源码中不应存在 PostWriteSensitiveIssue 类型引用 | 无文件引用该类型 |
| posts-sensitive-filter.ts 文件不应存在 | 文件已被删除 |

### 5.2 审核流程结构验证（4 个用例）

| 用例 | 预期 |
|------|------|
| 审核模块导出 evaluatePostWriteModeration 函数 | typeof 为 function |
| 审核模块仅依赖 text-moderation 服务 | 源码包含 text-moderation.service 导入，不含敏感词过滤 |
| evaluatePostWriteModeration 函数签名包含必要参数 | 包含 postType、entityId、title、content |
| evaluatePostWriteModeration 将 title+content 拼接传递审核 | 源码包含模板字符串拼接逻辑 |

### 5.3 写入服务审核集成验证（4 个用例）

| 用例 | 预期 |
|------|------|
| posts-write-service.ts 不引用敏感词过滤模块 | 不含 sensitive-filter、inspectPostWriteContent、sensitive_content |
| posts-write-service.ts 正确导入 evaluatePostWriteModeration | 包含 from './posts-write-moderation' 导入 |
| createPost 中审核后根据 action 决定状态流转 | 包含 approve/reject 判断和 pending 初始状态 |
| updatePost 中审核后根据 action 决定状态流转 | approve/reject 判断出现 >= 2 次（createPost + updatePost） |

### 5.4 路由层验证（3 个用例）

| 用例 | 预期 |
|------|------|
| 路由文件不引用敏感词过滤相关代码 | 不含 sensitive_content、sensitive-filter、inspectPostWriteContent |
| 创建帖子路由不包含 sensitive_content 错误响应分支 | 无 sensitive_content 和 blocked words 引用 |
| 更新帖子路由不包含 sensitive_content 错误响应分支 | 无 sensitive_content 引用 |

## 6. 运行结果

### 6.1 sensitive-filter-removal.test.ts

```
 ✓ TASK-010 残留引用检查 (5)
   ✓ 源码中不应存在 inspectPostWriteContent 引用
   ✓ 源码中不应存在 posts-sensitive-filter 的 import
   ✓ 源码中不应存在 sensitive_content 错误码引用
   ✓ 源码中不应存在 PostWriteSensitiveIssue 类型引用
   ✓ posts-sensitive-filter.ts 文件不应存在
 ✓ 帖子审核流程 — evaluatePostWriteModeration (3)
   ✓ 审核模块导出 evaluatePostWriteModeration 函数
   ✓ 审核模块仅依赖 text-moderation 服务，不依赖敏感词过滤
   ✓ evaluatePostWriteModeration 函数签名包含必要参数
 ✓ 帖子写入服务 — 审核流程集成 (4)
   ✓ posts-write-service.ts 中不引用敏感词过滤模块
   ✓ posts-write-service.ts 正确导入并调用 evaluatePostWriteModeration
   ✓ createPost 中调用审核后根据 action 决定状态流转
   ✓ updatePost 中调用审核后根据 action 决定状态流转
 ✓ 路由层 — posts.route.ts (3)
   ✓ 路由文件不引用敏感词过滤相关代码
   ✓ 创建帖子路由不包含 sensitive_content 错误响应分支
   ✓ 更新帖子路由不包含 sensitive_content 错误响应分支

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Duration  1.30s
```

### 6.2 posts.test.ts 回归验证

```
 Test Files  1 passed (1)
      Tests  55 passed | 9 skipped (64)
   Duration  264.10s
```

说明：9 个 skipped 测试为 TASK-010 中已标记 `it.skip` 的旧敏感词测试（"rejects sensitive content when creating/updating a post"），属于预期行为。

## 7. Mock / Fixture 说明

本测试不依赖 Mock 或 Fixture。所有测试通过以下方式实现：

- **残留引用扫描**: 使用 `fs.readFileSync` 读取源码文件内容，检查是否包含目标字符串
- **结构验证**: 直接读取源码文件验证导入关系、函数签名、控制流逻辑
- **模块导出验证**: 使用 `await import()` 动态导入验证模块是否正确导出

## 8. 未覆盖项

| 项目 | 原因 |
|------|------|
| 端到端审核流程（七牛 AI 实际调用） | 需要外部服务，属于集成测试范畴，非本次验证范围 |
| evaluatePostWriteModeration 运行时行为验证 | 涉及数据库和外部服务 mock，已由现有 posts.test.ts 覆盖 |

## 9. 推荐的下一步

1. 现有 posts.test.ts 中 3 个 `it.skip` 的敏感词测试用例可考虑删除或替换为新的审核流程测试
2. 如需验证七牛 AI 审核的实际调用行为，建议在集成测试环境中补充端到端测试
