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

- `.codex/agents/*.toml` 是子代理配置的真源，`model`、`model_reasoning_effort` 以 TOML 为准。
- [`agent-orchestration/reference/agents-overview.md`](./skills/agent-orchestration/reference/agents-overview.md) 是面向人的摘要，调整 agent 配置后必须同步更新。
- [`agent-orchestration/README.md`](./skills/agent-orchestration/README.md) 负责说明编排入口、流程和当前代理分工，不替代 TOML 配置。
- 如果需要在其他文档里引用 agent 模型或职责，优先链接到上述文件，避免复制出第二份会漂移的清单。

## 交付要求

- 说明风险、假设、影响范围。
- 文档和环境变量变更要同步更新相关文件。
