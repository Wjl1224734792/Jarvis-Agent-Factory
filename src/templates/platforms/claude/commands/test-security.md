---
name: test-security
description: 安全测试(DAST)指令——OWASP ZAP 动态扫描，检测运行时安全漏洞，生成安全报告
model: inherit
argument-hint: [测试目标URL或应用名称]
tools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit", "Skill", "WebFetch", "WebSearch", "mcp__jarvis-engine__session_join", "mcp__jarvis-engine__pipeline_guide", "mcp__jarvis-engine__gate_check", "mcp__jarvis-engine__gate_jump", "mcp__jarvis-engine__advance_gate", "mcp__jarvis-engine__gate_enforce"]
---

# 安全测试 (DAST)

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎
```
Skill("behavioral-guidelines")
Skill("security-and-hardening")
Skill("security-testing")
```

**引擎会话注册**（硬约束——引擎确保测试操作按 Gate 权限执行）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "auto" })`
- `mcp__jarvis-engine__gate_jump({ gate: "Gate C2" })`
- 会话注册后调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 上下文与阶段指引
- 扫描前调用 `mcp__jarvis-engine__gate_check({ operation: "spawn_test" })`
- 扫描过程中只读，不修改代码

代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

### 步骤 0：并行信息收集（同一消息同时发出）
Agent(code-explore-expert, "扫描安全配置（CSP/CORS/认证中间件）、现有安全测试配置和依赖漏洞清单")

## 步骤 1：确认测试范围与授权（不可绕过）

**安全测试前必须确认**：
- [ ] 测试环境是 staging/test，不是生产环境
- [ ] 已获得安全测试授权（书面或系统记录）
- [ ] 测试数据是隔离的，不包含真实用户数据
- [ ] 已通知运维团队（避免误触发安全告警）

**阶段完成——Gate 推进**：调用 `mcp__jarvis-engine__gate_enforce` 验证授权 Gate 通过，通过后调用 `mcp__jarvis-engine__advance_gate` 推进到工具准备阶段。

## 步骤 2：选择扫描工具

| 工具 | 适用场景 | 安装方式 |
|------|---------|---------|
| **OWASP ZAP** | 全面 DAST 扫描 | Docker / 本地安装 |
| **Nikto** | Web 服务器配置检查 | `apt install nikto` |
| **Nuclei** | 模板化漏洞扫描 | `go install nuclei` |

### OWASP ZAP 启动
```bash
# Docker 方式（推荐）
docker run -d --name zap -p 8080:8080 -p 8090:8090 \
  ghcr.io/zaproxy/zaproxy:stable zap.sh -daemon \
  -host 0.0.0.0 -port 8080 -config api.key=changeme

# 或本地安装
zap.sh -daemon -host 0.0.0.0 -port 8080
```

## 步骤 3：执行安全扫描

### 3.1 蜘蛛爬取（Spider Scan）
```
ZAP API: POST /JSON/spider/action/scan/
参数: url=<目标URL>, maxChildren=10, recurse=true
```
爬取目标应用的所有页面和端点。

**阶段完成——Gate 推进**：调用 `mcp__jarvis-engine__gate_enforce` 验证爬取阶段通过，通过后调用 `mcp__jarvis-engine__advance_gate` 推进到主动扫描阶段。

### 3.2 主动扫描（Active Scan）
```
ZAP API: POST /JSON/ascan/action/scan/
参数: url=<目标URL>, recurse=true, scanPolicyName=Default Policy
```
执行主动安全测试，包括：

| OWASP 类别 | 测试内容 | 风险等级 |
|-----------|---------|---------|
| **注入 (A03)** | SQL 注入、命令注入、LDAP 注入 | Critical/High |
| **XSS (A03)** | 反射型、存储型、DOM 型跨站脚本 | High |
| **认证失效 (A07)** | 弱密码、会话固定、JWT 漏洞 | High |
| **敏感数据暴露 (A02)** | 明文传输、错误信息泄露 | High/Medium |
| **安全配置错误 (A05)** | 默认密码、不必要的 HTTP 方法 | Medium |
| **访问控制失效 (A01)** | IDOR、路径遍历、权限提升 | Critical |

**阶段完成——Gate 推进**：调用 `mcp__jarvis-engine__gate_enforce` 验证扫描阶段通过，通过后调用 `mcp__jarvis-engine__advance_gate` 推进到 AJAX 爬虫/分析阶段。

### 3.3 AJAX 蜘蛛（SPA 应用）
```
ZAP API: POST /JSON/ajaxSpider/action/scan/
参数: url=<目标URL>, maxCrawlStates=10
```
用于 React/Vue/Angular 等 SPA 应用。

**阶段完成——Gate 推进**：调用 `mcp__jarvis-engine__gate_enforce` 验证扫描执行阶段通过，通过后调用 `mcp__jarvis-engine__advance_gate` 推进到结果分析阶段。

## 步骤 4：分析扫描结果

```bash
# 导出报告
curl "http://localhost:8080/JSON/core/view/alerts/?baseurl=<目标>" > alerts.json

# 生成 HTML 报告
curl "http://localhost:8080/OTHER/core/other/htmlreport/" > security-report.html
```

按风险等级分类告警：

| 风险等级 | 处理策略 |
|---------|---------|
| **Critical** | 必须立即修复，阻塞发布 |
| **High** | 必须修复，阻塞发布 |
| **Medium** | 应在发布前修复，记录风险接受 |
| **Low** | 记录技术债务，非阻塞 |
| **Info** | 参考信息，无需处理 |

**阶段完成——Gate 推进**：调用 `mcp__jarvis-engine__gate_enforce` 验证分析阶段通过，通过后调用 `mcp__jarvis-engine__advance_gate` 推进到报告生成阶段。

## 步骤 5：生成安全报告

输出 `.jarvis/YYYY-MM-DD/testing/security-test-report.md`：
```markdown
# 安全测试报告
## 扫描信息
- 目标 URL、扫描时间、工具版本
## 漏洞汇总
- Critical: N, High: N, Medium: N, Low: N
## 漏洞详情
| ID | 类型 | 风险 | 端点 | 描述 | 修复建议 |
## 风险接受
- 接受的 Low/Info 风险及原因
## 修复验证
- 修复后重新扫描结果
```

**阶段完成——Gate 推进**：调用 `mcp__jarvis-engine__gate_enforce` 验证报告阶段通过，通过后调用 `mcp__jarvis-engine__advance_gate` 完成安全测试流水线。

## 闭环图示
```
确认授权 → 启动ZAP → 蜘蛛爬取 → 主动扫描
                              ↓
                        分析告警结果
                    ↓              ↓
               有Critical/High   无严重漏洞
                    ↓              ↓
            修复 → 重新扫描    ✅ 完成
            (最多2轮)
```

## 红线
- 对生产环境执行主动扫描（可能造成数据破坏/服务中断）
- 未经授权执行安全测试（法律风险）
- 忽略 Critical/High 漏洞（安全债务 = 事故倒计时）
- 扫描后不清理测试数据（残留测试账号/数据）
- 仅依赖自动化工具（手动验证 Critical 漏洞真实性，防止误报）
- 扫描过程中修改应用代码（确保扫描结果可复现）
