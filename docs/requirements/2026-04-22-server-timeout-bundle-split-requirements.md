# 2026-04-22 server 超时治理与前端拆包需求

## 背景
- API v1 版本化已完成。
- 当前剩余的高价值问题主要有两类：
  - `server` 集成测试在默认 5 秒超时阈值下频繁中断，阻塞完整交付验证。
  - `admin/web` 构建仍存在明显大 chunk，影响后续上线前的前端性能治理。

## 本轮目标
- 修复完整 `bun run test` 的 server 超时阻塞，使测试链路恢复稳定通过。
- 继续推进 `admin/web` 的拆包优化，优先处理构建层面的高收益低风险项。
- 输出本轮审查/优化结论，明确哪些问题已关闭，哪些仍需后续继续治理。

## 范围内
- `apps/server/package.json`
- `apps/admin/vite.config.ts`
- `apps/web/vite.config.ts`
- 本轮相关 review / plan / task 文档

## 范围外
- 重写 server 业务逻辑。
- 大规模修改前端页面结构或视觉布局。
- 修改数据库 schema、seed、env 契约。

## 成功标准
- `bun run test` 通过。
- `bun run build` 通过。
- build 产物的拆包策略得到进一步优化，并记录变化。
