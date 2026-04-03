# 审查必须修复项 — 任务分解

> **生成日期**: 2026-04-03  
> **需求来源**: 全面审查报告 `docs/review/comprehensive-review-2026-04-03.md`  
> **审查结论**: ⚠️ 有条件通过 — 3 个必须修复项

---

## 任务概览

| 优先级 | 数量 | 类型 |
|--------|------|------|
| 高 (High) | 3 | 数据完整性 / 安全 / 类型安全 |
| **合计** | **3** | — |

---

## 任务分解列表

### FIX-001 [数据完整性] 数据库枚举字段 CHECK 约束

- **类型**: data-integrity
- **优先级**: high
- **涉及文件**:
  - `packages/db/src/schema.ts` — 所有 text 枚举字段（role, status, type, scope, visibility 等）
  - `packages/db/src/migrate.ts` — 可能需要新增迁移
- **DDD 分类**: 否（纯技术约束）
- **TDD 分类**: 否（数据库约束变更）
- **完成标准**:
  1. 为 `usersTable.role` 添加 CHECK 约束（`IN ('user', 'admin')`）
  2. 为 `sessionsTable.scope` 添加 CHECK 约束（`IN ('web', 'app', 'admin')`）
  3. 为 `postsTable.type` 添加 CHECK 约束（`IN ('article', 'moment')`）
  4. 为 `postsTable.status` 添加 CHECK 约束（`IN ('pending', 'published', 'rejected', 'hidden')`）
  5. 为其他关键枚举字段添加约束
  6. 生成并执行迁移
  7. 类型检查通过
- **风险说明**:
  - ⚠️ 如果数据库中已有非法值，迁移会失败。需要先清理数据。
  - ⚠️ 需要确认所有枚举值已完整覆盖。

### FIX-002 [安全] 管理员登录暴力破解防护

- **类型**: security
- **优先级**: high
- **涉及文件**:
  - `apps/server/src/modules/auth/auth.service.ts` — `loginAdmin()` 方法
  - `apps/server/src/modules/auth/auth.repo.ts` — 添加登录失败计数方法
  - `apps/server/src/modules/auth/auth.route.ts` — 错误码处理
  - `packages/schemas/src/auth.ts` — 新增错误码
- **DDD 分类**: 否（安全策略）
- **TDD 分类**: 是 — 安全功能需要测试覆盖
- **完成标准**:
  1. Redis 中添加登录失败计数器（key: `admin_login_fail:{account}`）
  2. 5 分钟内最多 5 次失败，超过后锁定 15 分钟
  3. 锁定期间返回明确错误码 `ADMIN_ACCOUNT_LOCKED`
  4. 登录成功后清除失败计数
  5. 新增错误码和错误消息
  6. 类型检查通过
- **风险说明**:
  - ⚠️ 需要确保 Redis 可用，否则影响登录流程
  - ⚠️ 锁定时间不宜过长，避免误锁

### FIX-003 [类型安全] 前端 API 客户端类型安全重构

- **类型**: type-safety
- **优先级**: high
- **涉及文件**:
  - `apps/web/src/lib/api-client.ts` — 循环包装逻辑（372-386 行）
- **DDD 分类**: 否
- **TDD 分类**: 否（重构）
- **完成标准**:
  1. 移除 `for...of` 循环 + `as any` 包装
  2. 改为显式包装每个方法，或使用类型安全的 Proxy
  3. 保持错误翻译功能不变
  4. 类型检查通过
  5. 测试通过
- **风险说明**:
  - 低风险纯重构
  - 需要确保所有方法的错误翻译行为不变

---

## 推荐执行顺序

### 并行执行（无依赖关系）

```
FIX-001: CHECK 约束 ──┐
FIX-002: 登录防爆破 ──┤── 可并行
FIX-003: 类型安全重构 ─┘
```

### 执行后验证

```
所有修复完成 → 类型检查 → 单元测试 → 最终审查
```

---

## 智能体分工

| 任务 | 智能体 | 类型 |
|------|--------|------|
| FIX-001 | `backend_data_worker` | 数据库约束 |
| FIX-002 | `backend_service_worker` | 业务逻辑 + 安全 |
| FIX-003 | `frontend_state_worker` | 前端状态/数据 |

---

> **备注**: 所有任务均为修复性变更，应保持最小影响范围。
