# Autopilot Spec: 生产就绪度改进

## 来源
UltraQA 生产就绪度审计（17 项发现），聚焦 Critical + High 项。

## 修复范围

### Critical（2 项）
1. **TypeScript 严格性** — `noImplicitAny: false` 削弱类型保护，db.ts 中 40+ 函数无类型签名
2. **MCP 核心 API 零测试** — server.ts 中 session_join/advance_gate/gate_check 等无单元测试

### High（4 项）
3. **`any` 类型污染** — 15 处显式 `any` 分布在 engine/web 模块
4. **静默 catch 块** — db.ts 中 12 处 schema 迁移 `catch {}` 吞错
5. **advance_gate 无事务保护** — 多步 DB 写入无 BEGIN/COMMIT
6. **SSE 竞态条件** — sseClients 无锁迭代

### Medium（4 项）
7. `.git-rewrite/` 历史遗留重复文件
8. `advance_gate` REST 端点同样缺事务
9. `session_join` 重复代码块
10. 测试覆盖缺口（错误路径）

### Low（3 项）
11. `resp()` 无类型安全
12. GATE_DIRS 等 Map 无编译期完整性校验
13. 静态资源代码重复

## 范围决策
- Focus on Critical + High（6 项），Medium/Low 按性价比选择性修复
- 不改动公共 API 签名（避免破坏性变更）
- 保持向后兼容
