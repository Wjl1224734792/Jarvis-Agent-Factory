<!-- Generated: 2026-06-03 -->
<!-- Parent: ../AGENTS.md -->

# tests — 集成测试

## Role
Vitest 集成测试套件，覆盖引擎核心、CLI、安装流程、Web 路由、数据库等关键模块。`npm test` 运行全部测试。

## Key Files
| File | Role | Description |
|------|------|-------------|
| gates.test.ts | Gate 测试 | 流水线定义完整性、Gate 配置正确性（30KB） |
| commands-api.test.ts | 命令 API 测试 | CLI 命令到引擎的端到端调用链 |
| db.test.ts | 数据库测试 | Schema、迁移、CRUD 完整性 |
| server-mcp-core.test.ts | MCP 核心测试 | MCP 工具调用正确性 |
| guardian.test.ts | 守护进程测试 | 崩溃恢复、PID 管理、重启逻辑 |
| agent-registry.test.ts | Agent 注册表测试 | 三层配置合并、YAML 解析 |
| install-merge.test.ts | 安装合并测试 | 文件安装、增量同步 |
| sse-broadcast.test.ts | SSE 测试 | 实时推送、去抖、并发 |
| quality-gate.test.ts | 质量门测试 | YAML 配置加载、阈值对比 |
| routes-emit.test.ts | Web 路由测试 | API 端点契约 |
| wiki-store.test.ts | Wiki 测试 | 创建/查询/健康检查 |

## For AI Agents
- 修改核心功能必须同步更新对应测试
- `npm test` 在项目根目录运行
- 测试文件命名: `<module>.test.ts`

<!-- MANUAL:START -->
<!-- MANUAL:END -->
