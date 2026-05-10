# API 实现文档：/api/pipeline entered_at 每 Gate 正确值修复

## 1. 当前实现目标

修复 `/api/pipeline` 端点中每个 Gate 的 `entered_at` 字段返回值，使其按 Gate 在流水线序列中的位置分情形返回正确的进入时间。

## 2. 对应需求 ID / 任务 ID

QA 签核 [BLOCKED] — 当前所有 Gate 的 `entered_at` 都返回同一个 `run.gate_entered_at` 值，数据语义错误。

## 3. 变更文件 / 变更范围

| 文件 | 变更说明 |
|------|---------|
| `src/web/routes.ts` | 修改 `/api/pipeline` 处理器中 `gates` 数组的 `entered_at` 计算逻辑 |

仅修改上述文件，未变更任何共享契约、数据库结构、路由前缀或配置文件。

## 4. 路由清单（无变更，仅内部逻辑修复）

| 方法 | 路径 | 说明 | 变更 |
|------|------|------|------|
| GET | `/api/pipeline` | 获取所有会话合并流水线视图 | 修正 `entered_at` 计算逻辑（响应体改变） |

## 5. 请求/响应格式说明

### 请求

```
GET /api/pipeline
```

无请求参数。

### 响应

```json
{
  "sessions": [
    {
      "session_id": "string",
      "platform": "string",
      "status": "string",
      "pipeline_type": "string",
      "pipeline_name": "string",
      "current_gate": "string",
      "completed": ["string"],
      "gates": [
        {
          "gate": "string",
          "passed": true,
          "artifacts": [],
          "entered_at": "ISO datetime string | null",
          "duration_seconds": "number | null",
          "duration_display": "string | null"
        }
      ],
      "_display": "string"
    }
  ],
  "active_count": "number"
}
```

### `entered_at` 计算规则

| Gate 位置 | 计算规则 | 返回值 |
|-----------|---------|--------|
| 首个 Gate（index === 0） | 使用 `run.started_at` | 运行开始时间 |
| 已通过的非首个 Gate（0 < index < currentIdx） | 使用前一个 Gate 的 `checkpoint.passed_at` 作为近似 | 前一 Gate 的通过时间 |
| 当前 Gate（index === currentIdx） | 使用 `run.gate_entered_at` | 当前 Gate 进入时间 |
| 未到达的 Gate（index > currentIdx） | 未进入，无值 | `null` |
| 无当前 Gate（已完成全流程等） | 全部视为已通过 Gate | 按前三项规则之一 |

其中 `currentIdx` 取自 pipeline 状态的 `current_gate` 在 gateList 中的 index。

## 6. 中间件与错误处理说明

无变更。该端点未使用额外中间件，错误处理遵循统一模式。

## 7. 验证结果

| 检查项 | 结果 |
|--------|------|
| `npx tsc --noEmit` | 通过（零类型错误） |
| `npx vitest run` | 通过（3 个测试文件，45 个测试全部通过） |
| 嵌套层级 ≤ 4 | 通过（最大嵌套：map 回调内 if-else 链，3 层） |
| 变更范围 | 仅 `src/web/routes.ts` |
| 无遗留调试代码 | 通过 |

## 8. 风险 / 未解决项

- **`currentIdx = -1` 兜底**：当 pipeline 状态的 `current_gate` 为 `undefined` 或 `'Complete'` 时（不在 gateList 中），`currentIdx` 被设为 `gateList.length`，使所有 Gate 按"已通过"处理。这是合理的语义兜底。
- **前一个 Gate 的 checkpoint 可能不存在**：在 `index < currentIdx` 且 `index > 0` 时，用前一个 Gate 的 `checkpoint.passed_at`。如果 checkpoint 不存在（数据异常），回退到 `null`。
- **`run` 为 null**：如果当前无活跃 run，`run.started_at`、`run.gate_entered_at` 均为 `null`，所有非未来 Gate 的 `entered_at` 也将为 `null`。这是合理降级。

## 9. 推荐的下一步

无。本次为单一 Bug 修复，范围已全部覆盖。
