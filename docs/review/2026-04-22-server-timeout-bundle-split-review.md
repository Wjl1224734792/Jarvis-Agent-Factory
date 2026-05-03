# 2026-04-22 server 超时治理与前端拆包复盘

## 本轮结论
- `server` 测试主链路已经恢复稳定，完整 `bun run test` 通过。
- `admin/web` 的拆包策略已进一步细化，显著降低了单一超大图表 chunk 的聚合度。
- 构建仍有大 chunk 告警，但已经从“单个异常巨块”收敛为“少量仍偏大的上游/核心块”。

## server 测试治理
### 根因
- `apps/server` 的测试入口此前仍使用 Vitest 默认 5 秒超时。
- `apps/server/tests` 中大量集成测试包含真实的 DB reset、seed、登录链路和多步业务操作，单条用例天然可能超过 5 秒。
- 当测试被超时中断后，会继续残留未完成请求，进一步污染后续日志与查询错误，造成“看起来像业务坏了”的假象。
- 另外，在并发跑两套 server 测试时，共享 DB/Redis 也会制造大量假阳性失败。

### 落地改动
- [apps/server/package.json](E:/CodeStore/feijia/apps/server/package.json)
  - `test` 脚本增加 `--testTimeout 30000`

### 验证
- `bun run test` 通过
- 单独 server 运行结果：
  - 19 files passed
  - 130 tests passed

## 前端拆包
### 落地改动
- [apps/web/vite.config.ts](E:/CodeStore/feijia/apps/web/vite.config.ts)
  - 将 editor 相关依赖细分为 `wangeditor-core-vendor`、`wangeditor-react-vendor`、`editor-react-vendor`、`editor-core-vendor`、`editor-kit-vendor`
- [apps/admin/vite.config.ts](E:/CodeStore/feijia/apps/admin/vite.config.ts)
  - 将 `@antv/g2` 细分为 `charts-runtime-vendor`、`charts-axis-vendor`、`charts-legend-vendor`、`charts-control-vendor`、`charts-component-vendor`、`charts-interaction-vendor`、`charts-grammar-vendor`、`charts-render-vendor`

### 关键变化
- `web`
  - 原 `editor-vendor` 约 `798.75 kB`
  - 现拆为：
    - `wangeditor-core-vendor` `796.89 kB`
    - `wangeditor-react-vendor` `1.90 kB`
  - 通用 `vendor` 从约 `263.82 kB` 降到 `236.55 kB`
- `admin`
  - 原 `charts-grammar-vendor` 约 `1307.79 kB`
  - 现最大图表块变为：
    - `charts-axis-vendor` `603.67 kB`
    - `charts-core-vendor` `537.49 kB`
  - 其余已拆散到 `charts-runtime/control/component/plot` 等更小块

## 剩余风险
- `web` 仍有 `wangeditor-core-vendor` `796.89 kB`
  - 更像上游单体包问题，单靠 `manualChunks` 已接近上限
- `admin` 仍有 `charts-axis-vendor` 与 `charts-core-vendor` 超过 500 kB
  - 若要继续压缩，下一步应考虑更高层级的路由边界或按场景懒加载图表能力
- 当前结论默认建立在“不要并发跑多套会写同一测试库的 server 集成测试”前提上

## 最终验证
- 通过：`bun run lint`
- 通过：`bun run typecheck`
- 通过：`bun run test`
- 通过：`bun run build`
