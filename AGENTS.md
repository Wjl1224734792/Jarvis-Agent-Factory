# AGENTS.md

本仓库代理遵循本文件。

## 仓库预期

- 保持变更紧密围绕用户请求
- 优先最小的正确变更而非广泛重构
- 编辑前先阅读相关代码路径
- 引入新抽象前先复用现有模式

## 项目约束

- **运行时**：Bun
- **测试框架**：Vitest
- **依赖方向**：`apps` → `packages` → 独立

## 目录架构

```
feijia/
├── AGENTS.md              # 本文件（项目专属）
├── .codex/AGENTS.md       # 通用编码规范
├── apps/                  # 应用层
├── packages/              # 共享包层
├── docker/                # 本地基础设施
└── docs/                  # 文档
```

## 全局脚本

```bash
bun run dev:web      # 用户端
bun run dev:admin    # 管理端
bun run dev:server   # 后端 API
bun run typecheck    # 类型检查
bun run test         # 单元测试
bun run lint         # 代码规范
bun run db:generate  # 生成 Drizzle 类型
bun run db:migrate   # 执行迁移
```

## 需求澄清

- 收敛需求为清晰可验证的理解
- 明确目标/范围/流程/模块交互

## 实现规则

- 遵循现有架构、命名、文件组织
- 变更共享合约时先检查下游影响
- 避免占位符逻辑和死代码

## 完成定义

- 请求变更已实现或阻塞项已明确
- 相关验证已运行
- TDD 任务具备 Red → Green 可核对记录
- 重要风险和假设已记录

## 验证与评审

- 验证：先最小相关，再按需广泛
- 评审：确认一致性，检查回归
