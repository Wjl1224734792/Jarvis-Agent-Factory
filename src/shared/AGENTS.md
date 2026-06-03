<!-- Generated: 2026-06-03 -->
<!-- Parent: ../AGENTS.md -->

# shared — 共享工具模块

## Role
跨模块共享的工具函数集合。无业务逻辑，纯工具性质。被 CLI、引擎、Web 三个层次共同依赖。

## Key Files
| File | Role | Description |
|------|------|-------------|
| markdown-utils.ts | Markdown 工具 | YAML frontmatter 解析、section 分割/hash、三路合并——安装+升级+Agent 注册表的基石 |
| mcp-config.ts | MCP 配置 | MCP 服务器配置读写（.mcp.json），多平台支持 |
| package-version.ts | 版本工具 | 从 package.json 读取版本号 |
| model-config.ts | 模型配置 | Agent 模型配置处理 |

## For AI Agents
- markdown-utils 是核心依赖——修改会影响安装/升级/Agent 注册表
- 新增共享工具需评估模块间耦合风险
- 所有工具函数应为纯函数，不依赖外部状态

<!-- MANUAL:START -->
<!-- MANUAL:END -->
