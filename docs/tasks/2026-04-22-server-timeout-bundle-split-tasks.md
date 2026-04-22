# 2026-04-22 server 超时治理与前端拆包任务

## TASK-STBS-001 server 测试超时治理
- 类型：测试基础设施
- 目标：让完整 server 集成测试在合理超时阈值下稳定运行。
- 完成标准：
  - 找到超时的真实根因
  - 修改测试入口或配置
  - `bun run test` 通过

## TASK-STBS-002 admin/web 进一步拆包
- 类型：前端构建优化
- 目标：继续收敛大 chunk 风险，优先做构建层拆包。
- 完成标准：
  - `apps/admin` 与 `apps/web` 至少一侧 manualChunks 策略进一步优化
  - `bun run build` 通过
  - review 中记录改动前后的关键 chunk 变化

## TASK-STBS-003 审查与收尾
- 类型：验证与文档
- 目标：沉淀本轮结论与残余风险。
- 完成标准：
  - 更新 review 文档
  - 记录验证命令与结果
