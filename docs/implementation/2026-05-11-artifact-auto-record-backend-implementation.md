# TASK-003: 自动记录 artifact + 重构 findSessionGateArtifacts

## 1. 当前实现目标

- Gate 推进时自动扫描产物目录并写入 artifacts 表
- 将 `findSessionGateArtifacts` 改为 DB 精确查询（优先）+ 日期匹配回退（兼容）
- 确保不同 session/run 在同一天的产物不再互相污染

## 2. 对应需求 ID / 任务 ID

- REQ-026 / TASK-003

## 3. 输入依据

- TASK-002 已在 `src/engine/db.ts` 中完成的：
  - `artifacts` 表（id, run_id, gate, filepath, created_at, UNIQUE(run_id, gate, filepath)）
  - `insertArtifact(db, runId, gate, filepath)` — `INSERT OR IGNORE`
  - `getArtifactsByRun(db, runId)`
  - `getArtifactsByRunAndGate(db, runId, gate)`
- 现有 `findSessionGateArtifacts(docsDir, gate, sessionId, db)` 使用日期匹配，存在跨 session 污染问题
- `GATE_DIRS` 映射：`{ 'Gate A':'requirements', 'Gate B':'tasks', ... }`

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 行数变化 |
|------|---------|---------|
| `src/engine/gates.ts` | 重构函数签名 + 新增 DB 分支 | +18 / -3 |
| `src/engine/server.ts` | advance_gate 新增 artifact 扫描 | +19 / -2 |
| `src/web/routes.ts` | 3 处 handler 传递 run_id + 1 处新增扫描 | +26 / -7 |

合计：3 文件，+63 行，-12 行。

## 5. 实现说明

### 5.1 gates.ts — `findSessionGateArtifacts` 重构

**函数签名变更**：
```ts
// 旧签名
findSessionGateArtifacts(docsDir, gate, sessionId, db)

// 新签名（runId 可选，向后兼容）
findSessionGateArtifacts(docsDir, gate, sessionId, db, runId?)
```

**新逻辑**：
1. 若 `runId` 存在且 `db` 可用 → 调用 `getArtifactsByRunAndGate(db, runId, gate)`
   - 有结果 → 提取文件名（`filepath` 最后一段），返回 `string[]`
   - 无结果 → 继续到步骤 2
2. 回退日期匹配（兼容旧数据和无 runId 的调用）：
   - 查询 checkpoints 表的 passed_at 日期
   - 匹配文件名前缀（YYYY-MM-DD 格式），返回最多 5 个

**新增 import**：`getArtifactsByRunAndGate` from `./db.js`

### 5.2 server.ts — advance_gate 新增 artifact 扫描

在 `advance_gate` MCP 工具中，条件检查通过后、`addCheckpoint` 之前：

```ts
// 扫描当前 Gate 产物目录，写入 artifacts 表（失败不阻塞推进）
if (runId) {
  try {
    const gateSubdir = GATE_DIRS[cur];
    if (gateSubdir) {
      const artifactDir = join(root, 'docs', gateSubdir);
      if (existsSync(artifactDir)) {
        const mdFiles = readdirSync(artifactDir).filter(f => f.endsWith('.md'));
        for (const f of mdFiles) {
          insertArtifact(db, runId, cur, `${gateSubdir}/${f}`);
        }
      }
    }
  } catch (e) {
    console.warn(`[artifact-scan] 扫描 ${cur} 产物失败:`, e.message);
  }
}
```

**关键设计决策**：
- 扫描在条件检查通过之后执行（Gate 条件用 `findGateArtifacts` 文件系统检查）
- 包裹在 `try/catch` 中，扫描失败不影响 Gate 推进
- `INSERT OR IGNORE` 保证重复推进不报错
- 文件路径存储为 `{gateSubdir}/{filename}`（如 `requirements/REQ-001.md`）

**新增 imports**：`readdirSync`（fs），`insertArtifact`（db）

### 5.3 routes.ts — 三处 handler 修改

#### 5.3.1 `GET /api/pipeline`（Dashboard 用）
- 已有 `run` 变量（`getActiveRun(db, s.id)`）
- 传递 `run?.id` 作为第 5 参数给 `findSessionGateArtifacts`

```ts
artifacts: findSessionGateArtifacts(getDocsDir(root), g, s.id, db, run?.id),
```

#### 5.3.2 `GET /api/gate/:gate/enforce`
- 新增 `getActiveRun(db, sid)` 调用获取 run_id
- 传递 `run?.id` 给 `findSessionGateArtifacts`

```ts
const run = getActiveRun(db, sid);
const artifacts = sid ? findSessionGateArtifacts(getDocsDir(root), gate, sid, db, run?.id) : [];
```

#### 5.3.3 `POST /api/gate/advance`
- 传递 `run?.id` 给 `findSessionGateArtifacts`
- 条件检查通过后、返回响应前，扫描产物并写入 artifacts 表
- 扫描逻辑与 server.ts 完全一致（try/catch + INSERT OR IGNORE）

**新增 imports**：`readdirSync`、`join`、`insertArtifact`、`GATE_DIRS`

## 6. 测试和验证结果

| 验证项 | 结果 |
|--------|------|
| TypeScript 类型检查 (`npx tsc --noEmit`) | 通过，零错误 |
| ESLint (`npx eslint` 变更文件) | 通过，零错误 |
| 全量单元测试 (`npx vitest run`) | 111/111 通过 (7 文件) |
| 全量构建 (`npm run build`) | 通过 |
| 向后兼容（不传 runId 的调用） | 保留日期匹配回退路径 |

## 7. 数据与接口边界

### 数据流向
```
advance_gate (MCP) / POST /api/gate/advance (HTTP)
    │
    ├─ 条件检查（文件系统 findGateArtifacts）
    │
    ├─ [新增] 扫描 docs/{gate_subdir}/*.md → INSERT OR IGNORE artifacts
    │
    ├─ addCheckpoint → checkpoints 表
    ├─ updatePipelineGate → pipeline 表
    └─ updateRunGate → pipeline_runs 表
```

### artifacts 写入路径格式
- `insertArtifact(db, runId, gate, filepath)` where `filepath = "{gateSubdir}/{filename}"`
- 例：`insertArtifact(db, 'run_123', 'Gate A', 'requirements/REQ-026.md')`

### findSessionGateArtifacts 读取路径
- DB 优先：`getArtifactsByRunAndGate(db, runId, gate)` → 提取文件名
- 日期回退：as before (checkpoints.passed_at 日期匹配文件名)

### 返回值兼容性
- 返回值保持 `string[]`（文件名列表），未变更为对象数组
- 旧调用方（不传 runId）行为完全不变

## 8. 风险 / 未解决项

| 风险 | 级别 | 说明 |
|------|------|------|
| artifact 扫描在条件检查后 | 低 | 条件检查仍用文件系统扫描，不受 DB 写入影响；DB 写入仅作记录 |
| 旧数据无 run_id 映射 | 低 | 回退日期匹配可正常工作；后续推进时会自动补录到 artifacts |
| 文件已被删除但 DB 仍有记录 | 低 | 面板显示的是 DB 历史记录，用户可通过归档/删除 run 清理 |
| 事务化未实现 | 未解决 | 当前未使用事务包裹 artifact 写入 + checkpoint，但 scan 失败不影响推进，影响可接受 |

## 9. 需要前端配合的点

- 无需前端配合。`/api/pipeline` 返回的 `artifacts` 字段结构不变（`string[]`），前端 Dashboard 的 DocDrawer 无需修改。

## 10. 推荐的下一步

- TASK-003 至此完成，建议由 qa-review-expert 审查变更
- 后续可在 Dashboard.tsx 中考虑展示 artifacts 的来源（DB 精准 vs 日期匹配），当前透明处理
- 若需支持非 .md 文件（如 .png 截图），扩大扫描过滤器即可
