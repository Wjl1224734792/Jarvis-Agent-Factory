<!-- Generated: 2026-05-23T01:20:00.000Z | Updated: 2026-05-23T01:20:00.000Z -->
<!-- Parent: ../AGENTS.md -->

# lsp — LSP 客户端与语言服务器

## Purpose
Vendor from OMC，为 Jarvis 提供 12 个 LSP 代码智能 MCP 工具（hover、goto def、find refs、diagnostics、symbols、rename、code actions 等）。

## Key Files
| File | Description |
|------|-------------|
| client.ts | LSP JSON-RPC 客户端管理器，按根目录单例缓存连接 |
| servers.ts | 19 个语言服务器配置（TypeScript、Python、Go、Rust 等） |
| utils.ts | 格式化工具函数（位置转换、URI 处理） |

## For AI Agents

### Working In This Directory
- LSP 工具文件参数限制在项目根目录内，防止搜索/修改外部文件
- `client.ts` 使用 stdio 通信 + Content-Length 帧协议

## Dependencies
- **Internal:** `../lsp-tools.ts` 调用本目录模块
- **External:** `@modelcontextprotocol/sdk` 间接依赖
