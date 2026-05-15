---
alwaysApply: true
platforms: [claude]
description: Git Flow 分支策略与提交规范 — 所有 .claude 智能体强制遵守
---

# Git Flow 分支管理与提交规范

## 1. 分支模型

```
main     → 生产就绪，每次提交可发布（保护分支）
dev      → 日常集成，feature 汇聚点（保护分支）
feature/* → 新功能，从 dev 创建，合并回 dev
release/* → 发布候选，从 dev 创建，合并到 main + dev
hotfix/*  → 紧急修复，从 main 创建，合并到 main + dev
```

| 分支 | 源自 | 合并到 | 生命周期 |
|------|------|--------|----------|
| `feature/YYYYMMDD_xxx` | **dev** | dev | 合并后删除 |
| `release/vX.Y.Z` | **dev** | main + dev | 发布后删除 |
| `hotfix/YYYYMMDD_xxx` | **main** | main + dev | 修复后删除 |

## 2. 提交规范

```
<type>(<scope>): <subject>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 代码重构 |
| `chore` | 构建/工具/配置 |
| `docs` | 文档 |
| `test` | 测试 |
| `perf` | 性能优化 |

## 3. 合并强制规则

- **必须 `--no-ff`** — 保留分支历史
- **禁止 squash** — 不丢失提交细节
- **禁止直接提交 main/dev** — 必须走分支 + PR
- **禁止 force push main/dev** — 保护分支
- **合并前 CI 全绿** — Lint + Type-check + Build 通过
- **feature 从 dev 创建**，不从 main 创建

## 4. 版本 Tag

- 使用语义化版本：`v<MAJOR>.<MINOR>.<PATCH>`
- **tag 只打在 main 分支的 merge commit 上**
- 每次合入 main 必须打 tag
- Bug 修复: PATCH +1 | 新功能: MINOR +1 | 破坏性变更: MAJOR +1

## 5. 禁止事项

| 禁止 | 原因 |
|------|------|
| 直接提交 main/dev | 必须走分支流程 |
| Force push 保护分支 | 历史不可改写 |
| 跳过 Git Hook | 质量门禁不可绕过 |
| 提交 .env / .local | 敏感信息 |
| tag 在非 main 分支 | 版本追踪混乱 |
| Squash merge | 丢失细节 |
