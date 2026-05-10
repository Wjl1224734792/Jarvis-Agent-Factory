# 安全审计报告：Gate 任务时长统计

**日期**：2026-05-09
**审计范围**：TASK-001 + TASK-002（Gate 进入时间记录与耗时计算）
**审查模式**：只读静态分析
**严重度定义**：Critical > High > Medium > Low > Info

---

## 1. 审计范围与威胁模型

### 1.1 审查文件

| 文件 | 变更性质 |
|------|---------|
| src/engine/db.ts | 新增 ALTER TABLE 迁移 + 回填 SQL + updateRunGateEnteredAt |
| src/engine/server.ts | advance_gate/gate_jump 追加耗时计算逻辑 |
| src/web/routes.ts | /api/pipeline 和 /api/pipeline-runs 响应追加时间字段 |
| src/web/views/pipeline.html | 新增耗时统计卡片 + Gate 时间行 + formatDateTime |
| tests/db.test.ts | 19 个单元测试（TASK-001 + TASK-002） |

### 1.2 威胁模型（STRIDE 简化）

| 威胁 | 适用性 | 说明 |
|------|--------|------|
| Spoofing（身份伪造） | 低 | 工具绑定 localhost，无外部网络暴露 |
| Tampering（数据篡改） | 中 | REST API 无鉴权，任意 localhost 用户可操作 run |
| Repudiation（抵赖） | 低 | 审计日志不在此变更范围内 |
| Info Disclosure（信息泄露） | 低 | project 路径和 gate_entered_at 通过 API 暴露 |
| DoS（拒绝服务） | 低 | 无速率限制，但仅 localhost 可访问 |
| Elevation of Privilege | 低 | 无外部攻击面 |

### 1.3 信任边界

所有通信均绑定 127.0.0.1。外部攻击面为零，威胁主要来自：
- 同一主机上的其他进程（低概率）
- 供应链攻击（CDN 脚本劫持）

---

## 2. 发现清单

### 2.1 S01 — marked.parse() 无 HTML 净化（Medium）

**严重度**：Medium
**CWE**：CWE-79（XSS）
**OWASP**：A03:2021 — Injection
**文件**：src/web/views/pipeline.html 第 839 行
**类别**：存储型 XSS

#### 描述

文档抽屉 openDocDrawer 在渲染 Markdown 时直接使用 marked.parse(md)
输出设置 innerHTML。marked.parse() 默认允许原始 HTML 通过，
若 Markdown 文件含 script 标签或 img onerror 等，将被执行。

#### 攻击场景

1. 攻击者通过 Agent 生成的 Gate 产物注入恶意 HTML
2. 用户在 Web 面板点击该产物的文档链接
3. 抽屉内的 marked.parse() 渲染时执行注入脚本
4. 脚本可读取面板数据、发起伪造 API 请求

#### 修复建议（P1 / 本迭代内修复）

方案 A（推荐）：使用 DOMPurify 净化 marked.parse() 输出
方案 B：配置 marked 禁用原始 HTML
方案 C：添加 CSP 头限制内联脚本执行（纵深防御）

---

### 2.2 S02 — CDN 脚本无 SRI 完整性校验（Low）

**严重度**：Low
**CWE**：CWE-829（Untrusted Control Sphere）
**OWASP**：A08:2021 — Software and Data Integrity Failures
**文件**：src/web/views/pipeline.html 第 7/10/11 行

#### 描述

三个 CDN 脚本（Tailwind CSS、Lucide Icons、Marked）均未使用
Subresource Integrity (SRI) 哈希，且 marked 未锁定版本。
若 CDN 被入侵，注入的 JS 可执行任意操作。

#### 修复建议（P3 / 本迭代或下迭代）

1. 为所有 CDN 脚本添加 integrity 属性
2. 将 marked 从 CDN 移至本地 bundle（推荐）
3. 添加 crossorigin="anonymous" 属性

---

### 2.3 S03 — API 响应展开暴露 project 路径（Low）

**严重度**：Low
**CWE**：CWE-200（Information Disclosure）
**OWASP**：A01:2021 — Broken Access Control
**文件**：src/web/routes.ts 第 211-213 行

#### 描述

/api/pipeline-runs 使用 ...r 展开将 pipeline_runs 表全量返回，
包括 project 列（文件系统绝对路径，如 E:CodeStorejarvis）。

#### 修复建议（P3）

解构排除 project 字段，或仅暴露项目名（路径最后一段）。

---

### 2.4 S04 — 缺失安全响应头（Low）

**严重度**：Low
**CWE**：CWE-693（Protection Mechanism Failure）
**OWASP**：A05:2021 — Security Misconfiguration
**文件**：src/engine/server.ts（Hono app 初始化）

#### 缺失头部

| 头部 | 风险 |
|------|------|
| Content-Security-Policy | 允许任意内联脚本，放大 XSS 影响 |
| X-Content-Type-Options | MIME 嗅探可能导致脚本注入 |
| X-Frame-Options | 面板可被 iframe 嵌入（点击劫持） |
| Referrer-Policy | 跨域引用泄露 URL 路径 |

#### 修复建议（P3）

在 Hono app 初始化后添加安全头中间件。

---

### 2.5 S05 — REST API 无资源归属校验（Low）

**严重度**：Low
**CWE**：CWE-639（IDOR）
**OWASP**：A01:2021 — Broken Access Control
**文件**：src/web/routes.ts 第 231-276 行

#### 描述

Run 操作端点（归档/置顶/删除）仅从 URL 参数获取 run_id，
不校验操作者是否有权操作该 run。localhost 场景风险低，
但若未来扩展为多用户将升级为 Medium/High。

#### 修复建议（P3 / 架构演进时）

添加可选的 session_id 归属校验。

---

### 2.6 S06 — 测试代码 SQL 拼接反模式（Info）

**严重度**：Info
**CWE**：CWE-89（SQL Injection）
**文件**：tests/db.test.ts 第 180 行

#### 描述

测试辅助函数 tableColumns 使用模板字面量拼接 tableName。
虽然调用点均为硬编码字符串且位于测试代码，但违反安全编码规范。

#### 修复建议（P4 / 下次重构）

改为参数化：PRAGMA table_info(?)

---

## 3. 审计要点逐项检查

### 3.1 SQL 注入风险

**结论：通过。无 SQL 注入漏洞。**

| 检查点 | 状态 | 说明 |
|--------|------|------|
| db.ts 回填 SQL | 安全 | 全静态 SQL，无用户输入 |
| advance_gate 耗时查询 | 安全 | SELECT 使用 ? 参数化 |
| addCheckpoint 扩展 | 安全 | INSERT 使用 ? 参数化 |
| updateRunGateEnteredAt | 安全 | UPDATE 使用 ? 参数化 |
| completeRun / abortRun | 安全 | 全参数化查询 |
| REST API param id | 安全 | 通过参数化查询传递 |

所有生产代码中的 SQL 查询均使用 ? 占位符的参数化方式，无字符串拼接。

### 3.2 时间数据泄露

**结论：通过。暴露的时间数据为合理的业务元数据，非 PII。**

| 字段 | 暴露途径 | 敏感性 | 评估 |
|------|---------|--------|------|
| gate_entered_at | /api/pipeline | 低 | ISO 时间戳，操作元数据 |
| duration_seconds | /api/pipeline | 低 | 整数秒数 |
| duration_display | /api/pipeline | 低 | 格式化字符串（如 3分20秒） |
| total_duration_seconds | /api/pipeline-runs | 低 | 整数秒数 |

### 3.3 MCP 工具输入校验

**结论：通过。输入校验充分。**

| 工具 | 参数 | 校验方式 | 评估 |
|------|------|---------|------|
| advance_gate | gate | gateList.indexOf() 白名单 | 安全 |
| advance_gate | run_id | getActiveRun 查询降级 | 安全 |
| gate_jump | gate | 同白名单校验 | 安全 |
| session_join | pipeline_type | includes() 白名单 | 安全 |
| session_set_name | name | 参数化 SQL + escHtml | 安全 |

### 3.4 XSS 风险

**结论：基本通过。存在 1 个 Medium 级别的间接 XSS 风险（S01）。**

| 检查点 | 状态 | 说明 |
|--------|------|------|
| escHtml() 包装 duration_display | 安全 | 明确调用 escHtml() |
| formatDateTime() 输出 | 安全 | 固定格式纯文本 |
| formatDuration() 输出 | 安全 | 纯文本字符串 |
| innerHTML gatesList | 安全 | timeHtml 由安全函数构建 |
| marked.parse() -> innerHTML | 风险 | 见 S01 |

### 3.5 API 响应敏感数据泄露

**结论：基本通过。存在 1 个 Low 级别的路径泄露（S03）。**

---

## 4. 依赖扫描结果

### 4.1 npm 依赖

本次变更未修改 package.json 或 package-lock.json，未引入新 npm 依赖。

### 4.2 CDN 依赖

| CDN 脚本 | 版本锁定 | SRI | 风险 |
|---------|---------|-----|------|
| cdn.tailwindcss.com | latest | 无 | Low |
| unpkg.com/lucide@latest | latest | 无 | Low |
| cdn.jsdelivr.net/npm/marked | latest | 无 | Low（见 S02） |

---

## 5. 安全头 / CSP / CORS 评估

| 检查项 | 状态 |
|--------|------|
| Content-Security-Policy | 未设置 |
| X-Content-Type-Options | 未设置 |
| X-Frame-Options | 未设置 |
| Strict-Transport-Security | 未设置（localhost 可接受） |
| Referrer-Policy | 未设置 |
| CORS Access-Control-Allow-Origin | 未显式设置（默认同源，安全） |

外部攻击面为零（仅 127.0.0.1），但同主机恶意软件可利用缺失安全头的浏览器行为。

---

## 6. 密钥泄露检测

**结论：通过。**

- .env 已加入 .gitignore
- 仅 .env.example 存在于仓库（无敏感值）
- 新增代码中无硬编码密钥/密码/Token
- 数据库路径使用 homedir() 动态解析

---

## 7. 修复优先级汇总

| 优先级 | 发现 | 严重度 | 建议时间 |
|--------|------|--------|---------|
| **P1** | S01: marked.parse() 无 HTML 净化 | Medium | 本迭代内 |
| P3 | S02: CDN 脚本无 SRI | Low | 本迭代或下迭代 |
| P3 | S03: 展开暴露 project 路径 | Low | 本迭代或下迭代 |
| P3 | S04: 缺失安全响应头 | Low | 本迭代或下迭代 |
| P3 | S05: REST API 无资源归属校验 | Low | 架构演进时 |
| P4 | S06: 测试代码 SQL 拼接反模式 | Info | 下次重构 |

---

## 8. 总体评估

**结论：变更可以合入，条件性通过。**

核心安全质量较高：
- SQL 查询全部参数化，无注入风险
- 前端时间展示逻辑正确使用 escHtml() 编码
- 时间数据为合理的业务元数据，不涉及 PII
- 无新增依赖、无密钥泄露

主要关注点 S01（marked.parse() XSS）虽非本次变更新增，
但应在合入前或本迭代内修复。

---

*审计工具：Claude Code Security Review Expert*
*审计依据：OWASP Top 10:2021、CWE Top 25、STRIDE*