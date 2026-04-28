# .codex/AGENTS.md

本文件给仓库内 Codex 相关代理、编排文档与子代理配置使用。项目专属规则以根目录 [AGENTS.md](../AGENTS.md) 为准。

## 语言与环境

- 对外说明、注释、文档统一使用中文。
- 本地终端默认是 Windows PowerShell。
- 生产环境按 Linux 习惯考虑路径、权限和大小写问题。

## 编码要求

- TypeScript 开启 `strict=true`。
- 避免隐式 `any`。
- 优先命名导出。
- 优先不可变数组操作。
- 通过卫语句和小函数降低嵌套。

## 工程要求

- 先读代码再改代码。
- 先复用再抽象。
- 避免循环依赖。
- 新增核心逻辑时补测试。

## 数据库要求

- 不依赖物理外键。
- 一致性通过应用层事务和业务规则保证。
- 级联删除在应用层显式处理。

## 代理与文档同步要求

- `.codex/agents/*.toml` 是子代理职责、权限和执行约束的真源。
- [`agent-orchestration/reference/agents-overview.md`](./skills/agent-orchestration/reference/agents-overview.md) 是面向人的职责、路由和并发策略摘要；调整 agent 职责后必须同步更新。
- [`agent-orchestration/README.md`](./skills/agent-orchestration/README.md) 负责说明编排入口、流程和当前代理分工，不记录底层运行参数。
- 其它文档只引用职责、路由、并发边界和交接规则；不要复制底层运行参数清单。

## 交付要求

- 说明风险、假设、影响范围。
- 文档和环境变量变更要同步更新相关文件。
