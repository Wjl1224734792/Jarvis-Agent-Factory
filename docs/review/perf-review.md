# 性能审计：Gate 任务时长统计

**审查日期**: 2026-05-09
**审查范围**: git diff HEAD 中 src/engine/db.ts、src/engine/server.ts、src/web/routes.ts、src/web/views/pipeline.html 的Gate时长统计相关变更。
**审查类型**: 静态风险分析（无运行时基线数据）
**审查者**: 性能只读审查代理

---

## Performance Findings

### [P2] initSchema 每次启动都执行回填 SQL

- **文件**: src/engine/db.ts:153-167、src/engine/db.ts:173-185
- **风险类型**: 重复计算（每次引擎启动触发）
- **严重度**: P2（低概率触发，但长期累积）
- **触发条件**: 引擎每次启动（openDb() 被调用）时执行以下两条回填 SQL：
  1. checkpoints 回填 (line 153-167): 使用 LAG(passed_at) OVER (PARTITION BY session_id ORDER BY passed_at) 窗口函数对所有 duration_seconds IS NULL 的checkpoints做全表扫描。
  2. pipeline_runs 回填 (line 174-185): 对 total_duration_seconds IS NULL 且 status 为 completed/aborted 的runs执行 julianday() 计算。
- **证据**: 两条回填都有NULL守卫，理论上只在首次升级后执行一次。但以下场景会导致重复开销：
  - 如果任何 addCheckpoint 调用传入 undefined（line 233 的默认值），新 checkpoint 的 duration_seconds 将为 NULL，下次启动时会被CTE窗口函数扫描。
  - CTE的 LAG() OVER (...) 即使在0行匹配时也需要 SQLite 解析+规划开销。
- **建议指标**: 
  - 回填执行次数: 在回填前后添加 console.time/console.timeEnd 日志，记录 SQL 实际耗时。
  - 回填影响行数: 现有 backfillResult.changes 日志足以追踪。
- **建议下一步**: 
  1. 考虑将回填逻辑移出 initSchema，改为独立的迁移脚本或版本标记，在列添加成功后立即执行一次并标记已完成。
  2. gate_jump 路径（server.ts:382）调用 updateRunGateEnteredAt 时未调用 addCheckpoint，跳转gate无checkpoint记录，duration_seconds 为NULL是预期行为。

---

### [P3] completeRun / abortRun 变为双UPDATE

- **文件**: src/engine/db.ts:372-381、src/engine/db.ts:384-393
- **风险类型**: 重复写入
- **严重度**: P3（低影响，单行操作）
- **触发条件**: 每次调用 completeRun() 或 abortRun() 时，从原来的1次UPDATE变为2次UPDATE。
- **分析**:
  - julianday() 是 SQLite built-in，单行计算成本极低（微秒级）。
  - 两次UPDATE均由PRIMARY KEY id 定位，索引查找成本相同。
  - 两次 db.prepare() 调用意味着两次SQL编译+执行，但在 Node.js SQLite API 中prepare是轻量操作。
- **建议指标**: completeRun/abortRun 端到端耗时，使用 console.time 包裹。预计差异 < 1ms。
- **建议下一步**: 
  - 可在单条 SQL 中合并两个UPDATE。注意第2次UPDATE中用 completed_at 而非 datetime() 是为了使用第1次UPDATE刚写入的值，合并后可直接用 datetime() 语义等价。
  - 优先级低——当前双UPDATE在个人工具的调用频率下（每session仅1-2次）无实际影响。

---

### [P3] advance_gate 中新增 SELECT 查询计算 Gate 耗时

- **文件**: src/engine/server.ts:348-353
- **风险类型**: 额外数据库查询
- **严重度**: P3（低影响，PRIMARY KEY 查询）
- **触发条件**: 每次 MCP 调用 advance_gate 时，在原有 addCheckpoint 之前新增一次 SELECT。
- **分析**: 查询使用 id（PRIMARY KEY），索引查找 O(1)。strftime 是 SQLite built-in，单行计算极快。额外开销约 0.1-0.5ms。
- **建议指标**: advance_gate 执行耗时，对比旧版本差异。
- **建议下一步**: 当前实现合理。若未来优化，可将 gate_entered_at 统一为 Unix epoch 格式以省去 strftime 转换。

---

### [P4] API /api/pipeline 对每个 Gate 调用 formatDuration

- **文件**: src/web/routes.ts:98-108
- **风险类型**: 重复计算（CPU），可忽略
- **严重度**: P4
- **分析**: 5会话 x 8Gate = 40次调用，纯算术函数总耗时 < 0.1ms，相比 getCheckpoints IO 查询可忽略。
- **建议下一步**: 无需优化。

---

### [P4] 前端 5秒轮询中新增 Date 计算和 formatDuration

- **文件**: src/web/views/pipeline.html:459-474、527-558、968-994
- **风险类型**: 前端CPU（渲染线程），可忽略
- **严重度**: P4
- **新增计算**: formatDateTime（最多16次 Date 构造）、formatDuration（8次算术）、updateDurationCard（1次 Date.now）。
- **分析**: 纯CPU算术 < 0.05ms，字符串拼接后一次性 innerHTML。相比 marked.js 渲染和 fetch 网络请求可忽略。
- **建议下一步**: 无需优化。若Gate数增至50+，可考虑对 formatDateTime 做结果缓存。

---

### [P4] 新增数据库列对查询计划的影响

- **文件**: src/engine/db.ts:146、149、171
- **风险类型**: 存储膨胀 / 索引缺失
- **严重度**: P4（无影响）

| 列名 | 表 | 类型 | 用途 |
|------|-----|------|------|
| gate_entered_at | pipeline_runs | TEXT | Gate进入时间 |
| duration_seconds | checkpoints | INTEGER | Gate耗时 |
| total_duration_seconds | pipeline_runs | INTEGER | 任务总耗时 |

- **查询计划分析**:
  - 现有索引 idx_pipeline_runs_session ON pipeline_runs(session_id, started_at DESC) 已覆盖主要查询模式。
  - 新增列不参与任何WHERE子句筛选，仅作为SELECT返回值，不会导致全表扫描。
  - checkpoints 表的查询始终走 (session_id, gate) 联合唯一约束的隐式索引。
  - 每次INSERT/UPSERT的行宽增加约20-30字节，对存储影响微乎其微。
- **建议下一步**: 无需添加额外索引。若未来需要在 total_duration_seconds 上排序或筛选，再考虑。

---

### [P4] 前端 formatDuration 与后端 formatDuration 实现不一致

- **文件**: src/web/routes.ts:410-425（后端）、src/web/views/pipeline.html:550-558（前端）
- **风险类型**: 维护风险 + 显示不一致
- **严重度**: P4（UI体验问题，非性能）
- **证据**: 后端对分格式有优化（secs > 0 时追加秒），前端缺少等价优化。前后端独立维护两份格式化逻辑。
- **建议下一步**: 后端只返回 duration_seconds 原始数值，前端统一格式化。可删除后端API中的 duration_display / total_duration_display 字段。

---

### [P4] readVersion 函数在两份文件中重复定义

- **文件**: src/engine/server.ts:659-665（readPkgVersion）、src/web/routes.ts:428-434（readVersion）
- **风险类型**: 重复代码（非性能风险，维护风险）
- **严重度**: P4
- **建议下一步**: 提取为共享模块。

---

## Baseline Gaps

本次审查没有任何运行时基线数据，所有结论均为静态代码分析的风险推断。缺少以下关键指标：

| 缺失指标 | 重要性 | 建议采集方法 |
|----------|--------|-------------|
| advance_gate MCP工具响应时间 | 中 | console.time 包裹关键路径 |
| completeRun/abortRun 执行时间 | 低 | 同上 |
| GET /api/pipeline 响应时间 + JSON体积 | 中 | Hono middleware 或 curl -w |
| GET /api/pipeline-runs 响应时间 | 低 | 同上 |
| initSchema 中回填SQL执行时间 | 中 | 已有 console.log 行数统计，缺耗时 |
| 前端 refresh() 执行时间（含渲染） | 低 | Chrome DevTools Performance |
| 前端 5秒轮询JSON Body大小变化 | 低 | DevTools Network 面板对比 |
| 数据库文件大小变化 | 低 | ls -la ~/.jarvis/engine.db |

---

## Suggested Measurement Plan

### 1. 回填 SQL 耗时（优先级：中）

在 src/engine/db.ts 中为两处回填添加耗时日志（仅建议，不在此审查中修改）：

```js
console.time("backfill-checkpoints");
const backfillResult = db.prepare(/* ... */).run();
console.timeEnd("backfill-checkpoints");
```

重启引擎两次：第一次应有回填行数和耗时（预期 < 10ms for < 1000条），第二次应为空。

### 2. advance_gate 响应时间（优先级：中）

```js
const t0 = performance.now();
// ... 原有逻辑 ...
console.log("[perf] advance_gate: " + (performance.now() - t0).toFixed(2) + "ms");
```

执行一次 Gate A 到 Gate B 推进，记录耗时。

### 3. API JSON 体积对比（优先级：低）

```bash
curl -s http://localhost:3457/api/pipeline | wc -c
```

预期增量：每个Gate约80字节，每个Run约30字节。

### 4. 查询计划验证（优先级：低）

```sql
EXPLAIN QUERY PLAN SELECT * FROM pipeline_runs
WHERE session_id="test" AND status="active" AND archived=0
ORDER BY started_at DESC LIMIT 1;

EXPLAIN QUERY PLAN SELECT * FROM checkpoints
WHERE session_id="test" ORDER BY passed_at;
```

预期：两个查询都使用索引。

---

## Residual Risk

1. **checkpoint回填LAG窗口函数在大数据量时的性能**
   - 个人工具下每个session最多8条checkpoint，10000条需1250个session，几乎不会发生。
   - 判断：风险低，可接受。

2. **julianday() 精度问题**
   - 64位浮点 julian day 乘86400转秒，小时级耗时精度足够。秒级可能 +/- 1秒误差。
   - 判断：可接受。

3. **前端实时计时器时钟偏差**
   - updateDurationCard 使用客户端 Date.now()，若时钟不同步可能不准。差异通常 < 1秒。
   - 判断：可接受。

---

## 推荐的下一步

1. **立即可做**（不涉及代码修改）:
   - 启动引擎，观察控制台回填日志，确认只执行一次。
   - 打开 Dashboard，观察5秒轮询时 Stat Card 任务耗时是否正常更新。

2. **短期优化**（优先级低）:
   - 合并 completeRun/abortRun 的双UPDATE为单UPDATE。
   - 添加回填SQL耗时日志（如 Suggested Measurement Plan 第1点）。
   - 统一前后端 formatDuration 实现，移除冗余的后端格式化字段。

3. **长期监控**（无需立即执行）:
   - 当活跃会话数 > 50 时，测量 GET /api/pipeline 响应时间是否因新增字段导致JSON体积显著增长。

---

## 总结

本次Gate任务时长统计变更整体风险低，引入的计算开销（julianday、strftime、Date.now、formatDuration）均为微秒/毫秒级别，在当前个人工具的调用频率和数据规模下可忽略。

- **P2**: initSchema回填SQL缺少迁移版本标记，每次引擎启动都执行（但有NULL守卫，实际只执行一次）。
- **P3**: completeRun/abortRun从单UPDATE变为双UPDATE，可合并优化。
- **P3**: advance_gate新增一次PRIMARY KEY查询，开销极低。
- **P4**: 新增列不增加索引需求，前端计算开销可忽略。
- 未发现N+1查询、内存泄漏、资源泄漏或其他高风险模式。
