<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# @feijia/config

## Purpose
共享 TypeScript 配置基础文件。各 `apps/*` 和 `packages/*` 的 `tsconfig.json` 通过 `extends` 引用此包的配置。

## Key Files

| File | Description |
|------|-------------|
| `package.json` | 导出 `tsconfig.base`、`tsconfig.react`、`tsconfig.server` |
| `tsconfig.base.json` | 全仓通用 TS 配置（strict、module、target、paths） |
| `tsconfig.react.json` | React 项目配置（extends base + jsx、lib） |
| `tsconfig.server.json` | 服务端配置（extends base + bun types） |

## For AI Agents

### Working In This Directory
- 改 TS 编译选项 → 检查所有 `tsconfig.json` 引用处是否兼容
- 此包无构建输出（`build` 脚本为空）
- 此包无运行时代码

### Testing Requirements
- 改配置后运行 `bun run typecheck`（全仓）验证

## Dependencies

### Internal
- 无

### External
- `typescript` — TypeScript 编译器
