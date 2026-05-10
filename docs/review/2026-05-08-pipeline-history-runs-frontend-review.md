# 前端审查报告：历史 Runs 面板

**审查日期**：2026-05-08
**审查范围**：`src/web/views/pipeline.html` 中新增的"历史 Runs"面板（HTML + JavaScript）
**关联提交**：`0a6f207` — fix(web): 统一控制台暗色侧边栏风格
**审查者**：前端代码审查专家

---

## 1. 审查结论

**结论：有条件通过（需修复 2 项 FIX_REQUIRED 后合并）**

代码功能实现完整，逻辑流程清晰。发现 2 项必须修复问题和 6 项建议改进问题，无阻塞级（BLOCKED）问题。

---

## 2. 审查维度检查结果

| 维度 | 状态 | 摘要 |
|------|------|------|
| 组件结构与架构 | 通过 | 面板拆分合理，职责单一 |
| 样式实现 | 通过 | 遵循 Tailwind 内联类名约定，无硬编码颜色 |
| 状态管理 | **有问题** | 错误状态无反馈 + 潜在竞态条件 |
| 性能 | 通过 | 数据量小，无虚拟滚动需求 |
| 可访问性 | **有问题** | 缺少键盘操作 + aria 属性 |
| 代码质量 | **有问题** | var/const 不一致 + 日期解析脆弱 |

---

## 3. 问题列表

### [FIX_REQUIRED] #1 — 错误状态无反馈，空数据 UI 误导用户

**文件**：`src/web/views/pipeline.html`
**位置**：第 535-548 行（`fetchPipelineRuns`），第 270-273 行（`fetchAPI`）

**证据**：
```javascript
// fetchAPI 静默吞掉所有错误
async function fetchAPI(path) {
  try { const r = await fetch(path); return await r.json(); }
  catch { return null; }                      // 网络错误、JSON解析错误全部吞掉
}

// fetchPipelineRuns 将"API 错误"与"真的没数据"视为同一状态
async function fetchPipelineRuns(sessionId) {
  // ...
  const data = await fetchAPI('/api/pipeline-runs?session_id=' + encodeURIComponent(sessionId));
  if (!data || !data.runs) {
    document.getElementById('runsList').innerHTML = '<p>暂无运行记录</p>';  // API 挂了也显示这个
    document.getElementById('runsCount').textContent = '0 次运行';
    return;
  }
  renderRunsHistory(data);
}
```

**影响**：当 API 返回 500、网络断开、或 `/api/pipeline-runs` 未实现时，用户看到的是"暂无运行记录"而非错误提示。对于已有运行记录的会话，用户会被误导认为记录丢失，引发不必要的困惑和支持请求。

**建议**：区分三种状态：
- **加载中**（显示骨架屏或加载指示器）
- **错误**（显示错误提示 + 重试按钮，或至少 Toast 通知）
- **空数据**（显示"暂无运行记录"）

---

### [FIX_REQUIRED] #2 — 日期解析极脆弱，fallback 路径直接将原始字符串写入 innerHTML

**文件**：`src/web/views/pipeline.html`
**位置**：第 576-582 行（`renderRunsHistory`）

**证据**：
```javascript
var dateText = '---';
if (run.started_at) {
  try {
    var d = new Date(run.started_at.replace(' ', 'T'));   // 假设格式中空格分隔日期和时间
    dateText = d.toLocaleString('zh-CN', { ... });
  } catch (_) { dateText = run.started_at; }              // fallback：原始字符串直接写入 DOM
}
// ...
'<span ...>' + dateText + '</span>'                       // line 593: 直接拼入 innerHTML
```

**影响总结**：
- `replace(' ', 'T')` 仅处理"YYYY-MM-DD HH:MM:SS"格式。若数据库返回 ISO 8601（含 `T`）、Unix 时间戳或带时区后缀，解析可能产生错误日期或不触发 fallback 但显示 `Invalid Date`
- SQLite `started_at` 默认使用 `datetime('now')` 生成，格式为 `YYYY-MM-DD HH:MM:SS`，所以当前恰好正确——但这是**侥幸耦合**，代码假设了后端实现细节
- fallback 路径 `dateText = run.started_at` 将原始 DB 字符串直接写入 `innerHTML`，若未来后端变更数据来源或格式引入特殊字符，存在理论 XSS 风险

**建议**：使用更健壮的解析方式：
```javascript
const d = new Date(run.started_at);
dateText = isNaN(d.getTime()) ? '---' : d.toLocaleString('zh-CN', { ... });
```

---

### [WARNING] #3 — `renderRunsHistory` 内使用 `var` 而非 `const`/`let`

**文件**：`src/web/views/pipeline.html`
**位置**：第 572-581 行

**证据**：
```javascript
// 第 572-581 行全部使用 var
var st = STATUS_MAP[run.status] || STATUS_MAP.active;
var isActive = run.status === 'active';
var shortRunId = (run.id || '').slice(0, 16) + '...';
var ptName = PIPELINE_NAMES[run.pipeline_type] || run.pipeline_type || '未知';
var dateText = '---';
// ...
var d = new Date(run.started_at.replace(' ', 'T'));
```

**对比文件其他位置**（第 246-268 行均使用 `const`/`let`）：
```javascript
const GATES = ['Gate A', ...];
const GATE_INFO = { ... };
let selectedSession = null, allSessions = [], sessionPlatform = 'all';
```

**影响**：代码风格不一致，`var` 已过时且存在变量提升的隐性风险。`run` 遍历过程中所有 `var` 会被提升到函数作用域顶，可能导致混淆。

**建议**：统一改为 `const`。

---

### [WARNING] #4 — 历史 Runs 面板缺少键盘可访问性

**文件**：`src/web/views/pipeline.html`
**位置**：第 149 行（`toggleRunsPanel` 触发元素）

**证据**：
```html
<div class="... cursor-pointer ..." onclick="toggleRunsPanel()">
  <!-- 无 tabindex, 无 role="button", 无键盘事件 -->
</div>
```

**影响**：纯键盘用户（Tab 导航）和屏幕阅读器用户无法展开/收起面板。

**缺失属性/事件**：
- 缺少 `tabindex="0"`：无法聚焦
- 缺少 `role="button"`：屏幕阅读器不识别为按钮
- 缺少 `onkeydown`（Enter / Space）：无法键盘触发
- 缺少 `aria-expanded`：无法传达当前状态

**建议**：
```html
<div role="button" tabindex="0" aria-expanded="false"
     onclick="toggleRunsPanel()"
     onkeydown="if(event.key==='Enter'||event.key===' ')toggleRunsPanel()">
```

并同步在 `toggleRunsPanel()` 中更新 `aria-expanded`。

---

### [WARNING] #5 — 日期格式化 try/catch 使用空下划线约定

**文件**：`src/web/views/pipeline.html`
**位置**：第 581 行

**证据**：
```javascript
} catch (_) { dateText = run.started_at; }
```

**影响**：项目规范要求（`通用编程规范与指南.md` 第 2.1 节）注释关键逻辑与边界条件。此处虽然 `_` 明确表达了"有意忽略"的意图，但缺少注释解释为何 fallback 是安全的，以及什么情况下会触发此路径。应补充一行注释说明边界条件。

---

### [WARNING] #6 — `fetchPipelineRuns` 缺乏竞态条件防护

**文件**：`src/web/views/pipeline.html`
**位置**：第 311 行（调用点）+ 第 535-548 行（函数定义）

**证据**：
```javascript
// refresh() 内 fire-and-forget 调用
fetchPipelineRuns(selectedSession);   // 无 await，无 AbortController

// 5 秒轮询 + 用户手动切换会话
setInterval(refresh, 5000);           // 每 5 秒触发
function selectSession(sid) {         // 用户点击触发
  selectedSession = sid;
  refresh();                          // 立即触发
}
```

**场景**：用户快速双击两个不同会话 → 两个 `fetchPipelineRuns` 并发执行 → 后完成的覆盖先完成的 DOM。在当前实现中，由于 `selectedSession` 是全局变量且在同一次 `refresh()` 内的同一位置读取，实际触发同一 session 的重复请求概率更高。但若未来代码结构调整（例如将 `fetchPipelineRuns` 移到 `refresh()` 外部独立调用），就可能出现旧请求覆盖新状态的问题。

**建议**：添加请求序列号或 AbortController 标记，抛弃过期响应。

---

### [INFO] #7 — `fetchAPI` 不校验 HTTP 状态码

**文件**：`src/web/views/pipeline.html`
**位置**：第 270-273 行

**证据**：
```javascript
async function fetchAPI(path) {
  try { const r = await fetch(path); return await r.json(); }
  catch { return null; }
}
```

`fetch()` 仅在**网络层错误**时 reject（DNS 失败、连接中断等）。HTTP 4xx/5xx 不会触发 catch——它们会正常 resolve，然后 `r.json()` 尝试解析响应体。若后端返回 502 HTML 错误页，`r.json()` 会 throw 并被 catch 捕获；若后端返回 400 JSON（如 `{ error: "..." }`），则会正常通过。

**影响**：对 4xx 错误响应的 JSON body（如后端返回 `{ error: "session_id query parameter required" }`）不会触发任何错误处理逻辑。当前因为 `fetchPipelineRuns` 检查了 `!data.runs`，恰巧命中了 fallback。但这种防御是间接的——依赖了 `runs` 字段缺失而非真正检测到错误状态。

**建议**：添加 `if (!r.ok)` 检查，即便如此也建议保留在调用端的二次校验。

---

### [INFO] #8 — 面板标题区缺少 Loading 状态视觉反馈

**文件**：`src/web/views/pipeline.html`
**位置**：第 153 行（`runsCount`）和第 161 行（`runsList`）

**现状**：`fetchPipelineRuns` 被调用到响应返回之间，UI 无任何变化——保持上一次的数据显示。这在 API 响应较慢时会让用户困惑（是否点击了？是否在加载？）。

**建议**：在 `fetchPipelineRuns` 开始时设置轻量 loading 状态（例如 `runsCount` 显示"加载中..."，或加一个微小的 spinner）。

---

## 4. 必须修复项清单

| # | 严重度 | 问题 | 位置 |
|---|--------|------|------|
| 1 | FIX_REQUIRED | 错误状态与空数据状态未区分，API 故障时 UI 误导用户 | `fetchPipelineRuns`:535-548 |
| 2 | FIX_REQUIRED | 日期解析假设后端实现细节，fallback 路径不安全 | `renderRunsHistory`:576-582 |

---

## 5. 优化建议

| # | 严重度 | 问题 | 位置 |
|---|--------|------|------|
| 3 | WARNING | `var` → `const` 统一代码风格 | `renderRunsHistory`:572-581 |
| 4 | WARNING | 添加键盘可访问性和 `aria-expanded` | HTML:149 + `toggleRunsPanel`:516 |
| 5 | WARNING | 补充 catch 块注释说明 fallback 安全性 | `renderRunsHistory`:581 |
| 6 | WARNING | 添加竞态条件防护（请求版本号/AbortController） | `fetchPipelineRuns`:535 |
| 7 | INFO | `fetchAPI` 增加 `r.ok` 状态码检查 | `fetchAPI`:270 |
| 8 | INFO | 添加 Loading 状态视觉反馈 | `runsCount`/`runsList` |

---

## 6. 变更文件清单

审查涉及的代码变更均在单一文件内：

| 文件 | 变更类型 | 行号 |
|------|----------|------|
| `src/web/views/pipeline.html` | 新增 HTML（面板结构） | 147-165 |
| `src/web/views/pipeline.html` | 新增 JS（`toggleRunsPanel`） | 510-529 |
| `src/web/views/pipeline.html` | 新增 JS（`fetchPipelineRuns`） | 535-548 |
| `src/web/views/pipeline.html` | 新增 JS（`renderRunsHistory`） | 554-600 |
| `src/web/views/pipeline.html` | 修改 JS（`refresh` 中添加调用） | 311 |

支持文件（未修改，仅参考）：
| 文件 | 用途 |
|------|------|
| `src/web/routes.js:185-190` | 后端 `/api/pipeline-runs` 端点定义 |
| `src/engine/db.js:55-66` | `pipeline_runs` 表 Schema |
| `src/engine/db.js:261-263` | `getSessionRuns` 查询函数 |

---

## 7. 行为准则审计（behavioral-guidelines）

| 准则 | 状态 | 说明 |
|------|------|------|
| 准则 2（简单优先） | 通过 | 未发现过度抽象或不必要的灵活性 |
| 准则 3（精准修改） | 通过 | diff 确认仅修改了目标代码，无相邻代码无关改动（仅暗色→亮色的全局颜色变量替换为同一提交内的配套改造） |
| 准则 5（注释语言） | 通过 | JSDoc 注释使用中文，与项目约定一致 |

---

## 8. 测试缺口

以下场景未被覆盖（前端无自动化测试文件）：

- **单元测试**：`toggleRunsPanel` 的展开/收起状态切换
- **单元测试**：`fetchPipelineRuns` 的三种数据返回情况（正常 / 空 / 错误）
- **单元测试**：`renderRunsHistory` 对不同 status 的状态映射渲染
- **集成测试**：`selectSession` → `refresh` → `fetchPipelineRuns` 的完整调用链
- **边界测试**：`run.id` 为空字符串时的截断行为
- **边界测试**：`run.started_at` 为 null/undefined/Invalid Date 时的 fallback

---

## 9. 残余风险

| 风险 | 可能性 | 影响 | 缓解 |
|------|--------|------|------|
| API 返回的 `run.id` 含特殊字符破坏 HTML | 极低（UUID 生成） | 显示异常/理论 XSS | 后端保证 UUID 格式 + 前端使用 `textContent` |
| SQLite `started_at` 格式未来变更导致日期显示异常 | 低 | 日期显示为 `---` 或 `Invalid Date` | 使用 `new Date()` 原生解析 |
| 快速切换会话导致重复 API 请求 | 中（用户操作） | 轻微性能损耗 | 添加 debounce 或 AbortController |

---

> **审查完成。请修复 2 项 FIX_REQUIRED 后重新提交审查。**
