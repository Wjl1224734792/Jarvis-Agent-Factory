# `/test-security` — 安全测试 (DAST)

- **命令**：`/test-security [目标服务/URL]`
- **类别**：测试
- **说明**：在 staging 环境确认授权后，使用 OWASP ZAP/Nikto/Nuclei 等工具进行动态安全扫描，按 Critical-High-Medium-Low 分级分析告警，发现严重漏洞时修复并重扫。

## 使用场景

| 场景 | 说明 |
|------|------|
| 上线前安全扫描 | 发布前对服务进行动态安全测试，排除高危漏洞 |
| 合规审计 | 满足安全合规要求，生成安全扫描报告 |
| 漏洞复验 | 修复安全漏洞后重新扫描确认修复有效 |
| 定期安全检查 | 周期性扫描已上线服务，及时发现新暴露面 |

## 关键 Agent

| Agent | 职责 |
|-------|------|
| security-review-expert | 执行安全扫描、分析告警并指导漏洞修复 |

## 流程图

```mermaid
flowchart TD
    START([用户输入 /test-security]) --> S0[加载技能<br/>behavioral-guidelines + security]
    S0 --> S1[1. 确认授权<br/>staging环境 + 书面授权]
    S1 --> S2[2. 选择扫描工具<br/>OWASP ZAP / Nikto / Nuclei]
    S2 --> S3[3. 蜘蛛爬取<br/>Spider Scan + AJAX Spider]
    S3 --> S4[4. 主动扫描<br/>Active Scan 全漏洞类别]
    S4 --> S5[5. 分析告警结果<br/>Critical → High → Medium → Low]
    S5 --> |无严重漏洞| DONE([✅ 安全报告])
    S5 --> |有 Critical/High| S6[修复漏洞]
    S6 --> S7[重新扫描]
    S7 --> |通过| DONE
    S7 --> |仍存在| FAIL({已达2轮?})
    FAIL --> |是| BLOCKED([❌ BLOCKED])
    FAIL --> |否| S6
```
