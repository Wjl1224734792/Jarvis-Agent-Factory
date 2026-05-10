# Gate 文档按会话过滤 — 后端实现

## 当前实现目标

修改 Gate 文档追踪逻辑，使每个会话的 Gate 卡片只展示该会话自己产出的文档文件，而非全局所有文档。

## 对应需求 ID / 任务 ID

- **需求**：REQ-SL-011
- **任务**：TASK-003

## 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/engine/gates.ts` | 新增函数 | 新增 `findSessionGateArtifacts()` 按会话过滤产物文档 |
| `src/web/routes.ts` | 修改调用 | `/api/pipeline`、`/api/gate/:gate/enforce`、`/api/gate/advance` 三处改用新函数 |

## 业务规则说明

### 文档过滤规则

`findSessionGateArtifacts(docsDir, gate, sessionId, db)` 的过滤逻辑：

1. 根据 `gate` 查 `GATE_DIRS` 映射表获取子目录名
2. 查 `checkpoints` 表获取该会话在该 Gate 的历史通过日期
3. 扫描对应子目录下的 `.md` 文件
4. 按检查点日期过滤文件名前缀（`YYYY-MM-DD` 格式匹配）
5. 返回最多 5 个匹配文件

### 无产物会话处理

- 无检查点记录的会话返回空数组 `[]`
- 目录不存在的 Gate 返回空数组 `[]`
- 无 `.md` 文件的目录返回空数组 `[]`

### 向后兼容

- 原 `findGateArtifacts(docsDir, gate)` 函数保持不变
- `src/engine/server.ts` 中的 4 处调用继续使用原函数（全局扫描）
- API 响应 JSON 结构不变，仅 `artifacts` 数组内容从全局改为会话级

## 状态机 / 状态转换说明

不涉及状态机变更。Gate 状态流转逻辑不变（`/api/gate/advance` 端点逻辑未改动）。

## 权限与幂等性说明

- **权限**：不涉及，该函数为只读查询，无权限校验逻辑
- **幂等性**：函数为纯读取操作（DB SELECT + 文件系统读取），无副作用，天然幂等

## 测试和验证结果

### 自动化检查

| 检查项 | 结果 |
|--------|------|
| `npx vitest run` | 2 test files passed, 24 tests passed |
| `npx tsc --noEmit` | 零类型错误 |
| `npm run lint` | 零 lint 错误 |
| `npm run build` | 构建成功 |

### 验证细节

- 原 `findGateArtifacts` 函数未经修改，`server.ts` 中的 4 处调用不受影响
- `routes.ts` 中已移除未使用的 `findGateArtifacts` import（因改动导致的孤儿子 import）
- 3 处调用点均正确传递 `sessionId` 和 `db` 参数

## 风险 / 未解决项

### 风险 1：advance 端点的鸡-蛋问题

`/api/gate/advance` 端点原逻辑：
```
artifacts = findGateArtifacts(全局扫描)  // 只要有任何人产出过文档即可通过
checkpoints = getCheckpoints(会话级)     // 当前 Gate 通常无检查点
→ OR 条件：任意满足即可推进
```

新逻辑：
```
artifacts = findSessionGateArtifacts(会话级)  // 当前 Gate 无检查点 → 返回 []
checkpoints = getCheckpoints(当前Gate+会话)   // 尚未创建检查点 → 返回 []
→ 两者皆空 → 被阻断
```

**影响**：会话首次从某个 Gate 推进时，`findSessionGateArtifacts` 因该 Gate 无检查点而返回空数组，导致 advance 被阻断。原全局扫描不存在此问题。

**缓解**：Gate 推进逻辑中 `artifacts` 的原始设计意图是"该 Gate 类型的产出目录是否非空"，而非"该会话是否产出"。若后续发现此风险影响实际使用，可考虑：
- advance 端点保留原 `findGateArtifacts` 调用
- 或为 `findSessionGateArtifacts` 添加无检查点时的降级逻辑（如按当前日期过滤）

当前按任务规格实现，此风险已记录。

## 推荐的下一步

1. 前端验证：确认 Dashboard Gate 卡片在不同会话间展示不同的 artifacts 列表
2. 观察 advance 端点实际调用流程，确认鸡-蛋问题是否影响生产使用
3. 若 advance 受阻，调整策略：advance 端点回退用 `findGateArtifacts` 或增加降级逻辑
