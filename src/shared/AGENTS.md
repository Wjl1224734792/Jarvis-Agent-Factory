<!-- Generated: 2026-06-03T16:32:00+08:00 -->
<!-- Parent: ../AGENTS.md -->

# shared — 共享工具模块

## Purpose
整个 Jarvis 引擎使用的共享工具函数和常量——集中化 frontmatter 解析、MCP 配置 I/O、模型默认值和版本读取逻辑。

## Role
共享工具——被所有其他模块依赖，自身无内部依赖。

## Key Abstractions

| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| `parseFrontmatter()` | markdown-utils.ts | function | 将 YAML frontmatter 解析为键值对 |
| `readFrontmatter()` | markdown-utils.ts | function | 从 Markdown 文件读取 frontmatter，缺失时默认 "0.0.0" |
| `splitMarkdownSections()` | markdown-utils.ts | function | 按 `##` 二级标题分割 Markdown，计算每区域 SHA256 |
| `computeSectionHashes()` | markdown-utils.ts | function | 计算 preamble 和各区域 SHA256 哈希 |
| `McpServerConfig` | mcp-config.ts | interface | `.mcp.json` 中单个 MCP 服务器的类型定义 |
| `readMcpConfig()` | mcp-config.ts | function | 从项目根目录读取 `.mcp.json` |
| `writeMcpConfig()` | mcp-config.ts | function | 写入 `.mcp.json` |
| `DEFAULT_HEAVY_MODEL` | model-config.ts | const | 全局默认重型模型 (`deepseek-v4-pro`) |
| `DEFAULT_LIGHT_MODEL` | model-config.ts | const | 全局默认轻型模型 (`deepseek-v4-flash`) |
| `readPackageVersion()` | package-version.ts | function | 从 package.json 读取版本号 |

## Key Files

| File | Role | Description |
|------|------|-------------|
| `markdown-utils.ts` | Frontmatter + Markdown 解析 | wiki-store、routes、install.ts、agent-registry 的核心依赖 |
| `mcp-config.ts` | MCP 配置 I/O | 读/写/合并 `.mcp.json`，供 install.ts 和 CLI 使用 |
| `model-config.ts` | 默认模型名称 | 供 Web 面板和 agent-config API 使用 |
| `package-version.ts` | 版本读取 | 供 server.ts、routes.ts、doctor.ts 显示版本号 |

## External Dependencies
仅 Node.js 内置模块（`node:fs`、`node:path`、`node:crypto`）— 无第三方依赖

## For AI Agents
- **修改 shared 模块前**：运行 `grep -rn "from.*shared/" --include="*.ts"` 检查所有调用者
- **修改 markdown-utils.ts**：`FM_SEARCH_LIMIT` 常量需与 `install.ts` 保持一致
- **修改 model-config.ts**：默认模型变更影响所有未自定义模型的用户
- **修改 mcp-config.ts**：不引入引擎级依赖，保持轻量 I/O 职责

<!-- MANUAL:START -->
<!-- MANUAL:END -->
