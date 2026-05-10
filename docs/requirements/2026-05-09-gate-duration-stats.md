# 需求文档：流程面板 Gate 任务时长统计

> 状态: confirmed | 日期: 2026-05-09 | 版本: 1.0

---

## 背景

当前 Web 面板（`pipeline.html`）仅展示每个 Gate 的"通过时间"，缺少：
- 每个 Gate 的**开始时间**
- 每个 Gate 的**耗时**
- 整个任务的**总耗时**

用户无法直观了解流水线各阶段效率，不利于定位瓶颈。

---

## 需求列表

### REQ-001：Gate 进入时间记录

**描述**：当流水线推进到某个 Gate 时，记录该 Gate 的进入时间戳。

**验收标准**：
- `pipeline_runs` 表新增 `gate_entered_at` 字段（TEXT，ISO 8601），存储当前 Gate 的进入时间
- `advance_gate` 推进到新 Gate 时，自动写入新 Gate 的进入时间
- `gate_jump` 跳转到新 Gate 时，同样写入进入时间
- `createPipelineRun` 创建运行记录时，写入 Gate A 的进入时间（即 `started_at` 也可作为 Gate A 进入时间）
- 有迁移脚本处理已有数据库（已有 run 无需回填）

### REQ-002：Gate 耗时计算

**描述**：当 Gate 通过时，计算该 Gate 从进入到通过的耗时。

**验收标准**：
- `advance_gate` 推进时，计算 `passed_at - gate_entered_at` 得到 Gate 耗时
- 耗时以秒为单位存储，展示时转为人类可读格式
- `checkpoints` 表新增 `duration_seconds` 字段（INTEGER）存储 Gate 耗时
- 迁移脚本为已有 checkpoints 记录回填耗时（使用上一个 checkpoint 的 `passed_at` 作为本 Gate 的近似进入时间）

### REQ-003：任务总耗时计算

**描述**：任务完成或中止时，计算从开始到结束的总耗时。

**验收标准**：
- `completeRun` 和 `abortRun` 写 `completed_at` 时，同步计算 `completed_at - started_at` 得到总耗时
- `pipeline_runs` 表新增 `total_duration_seconds` 字段（INTEGER）
- 迁移脚本回填已完成/已中止 run 的总耗时

### REQ-004：Web API 返回时长数据

**描述**：`/api/pipeline` 和 `/api/pipeline-runs` 接口返回 Gate 耗时和总耗时。

**验收标准**：
- `/api/pipeline` 的 gate 对象增加 `entered_at`、`duration_seconds`、`duration_display` 字段
- `/api/pipeline-runs` 的 run 对象增加 `completed_at`、`total_duration_seconds`、`total_duration_display` 字段
- 不破坏现有字段结构（仅追加新字段，现有字段保持不动）

### REQ-005：Web 面板 Gate 步骤列表展示耗时

**描述**：在流水线看板的 Gate 步骤列表中，每个 Gate 展示开始时间、通过时间、耗时。

**验收标准**：
- 每个 Gate 步骤显示 `开始: YYYY-MM-DD HH:mm:ss` + `通过: YYYY-MM-DD HH:mm:ss`
- 耗时以人类可读格式显示（如 `3分42秒`、`1小时15分`）
- 已通过的 Gate 和当前进行中的 Gate 都有展示
- 进行中的 Gate（未通过）显示"进行中"标签

### REQ-006：Web 面板统计卡片增加总耗时

**描述**：在面板顶部统计区域增加总耗时展示。

**验收标准**：
- 新增（或替换）一张统计卡片展示总任务耗时
- 格式：`开始时间` / `完成时间` / `总耗时 X小时X分X秒`
- 未完成的任务显示"进行中"和当前已用时长
- 已完成的任务显示完整耗时
- 卡片颜色与现有统计卡片风格一致

### REQ-007：Web 面板历史 Runs 列表展示时长

**描述**：历史运行记录列表中每个 run 展示耗时。

**验收标准**：
- 每个历史 run 条目显示耗时（如 `1小时23分`）
- 已完成/已中止的 run 展示完整耗时
- 正在运行的 run 显示"运行中"

---

## 涉及文件

| 文件 | 变更类型 | 关联需求 |
|------|---------|----------|
| `src/engine/db.ts` | Schema 变更 + CRUD 更新 | REQ-001, REQ-002, REQ-003 |
| `src/engine/server.ts` | MCP 工具逻辑更新 | REQ-001, REQ-002, REQ-003 |
| `src/web/routes.ts` | API 返回数据增强 | REQ-004 |
| `src/web/views/pipeline.html` | 前端展示 | REQ-005, REQ-006, REQ-007 |

## 不变更范围

- CLI 输出（`pipeline_status` / `report_status`）— 用户选择仅 Web 面板
- Gat​e 定义和流水线逻辑不变
- 不改变现有 API 字段，仅追加新字段

## 数据兼容性

- 所有新增字段带默认值（`NULL` 或 `0`），不影响现有查询
- 迁移脚本处理已有数据库，不对缺失数据报错
- 前端对缺失时长字段做降级展示（不显示或显示 `--`）
