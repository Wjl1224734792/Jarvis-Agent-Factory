# `/test-security` — 安全测试 (DAST) 流程图

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
