---
description: 一键发布——版本递增、提交推送、打Tag、CI自动npm publish
name: publish
model: deepseek-v4-pro
argument-hint: [版本类型: patch|minor|major]
allowed-tools: Read, Glob, Grep, Bash, Skill, Agent
version: "4.7.64"
updated: "2026-05-30"
---

# `/publish` — 一键发布完整流程

- **命令**：`/publish [版本类型]`
- **类别**：流程
- **说明**：一键完成从质量检查到版本发布的全流程。版本递增→提交推送→打Tag→CI 自动触发 npm publish。**禁止手动运行 `npm publish`**，CI workflow 在 tag push 后自动发布。

## 使用场景

| 场景 | 说明 |
|------|------|
| 常规版本发布 | 完成开发后的标准发布流程（patch/minor） |
| 重大版本升级 | major 版本发布，需确认破坏性变更 |
| 紧急补丁发布 | 热修复后的快速 patch 发布 |

## 关键 Agent

| Agent | 职责 |
|-------|------|
| infra-deploy-expert | 版本递增、Git 操作、Tag 推送 |
| qa-review-expert | 发布前最终质量签核 |

## 流程概览

```
前置检查 → 质量门 → 版本递增 → 提交推送 → 打Tag → CI自动发布 → 验证 → 完成
```

## 各步骤说明

### 1. 前置检查

确认当前处于 `main` 分支，工作区干净无未提交变更，与远端同步。

### 2. 质量门

执行代码质量检查：

- **Lint**：运行 ESLint 检查代码风格
- **Type-check**：TypeScript 类型检查（`tsc --noEmit`）
- **Build**：执行项目构建，确认产物可正常生成
- **Deps Audit**：检查依赖安全漏洞（`npm audit`）

任一步失败即中止流程并输出错误信息。

### 3. 版本递增

读取当前 `package.json` 版本号，按指定策略递增：

- `patch`：修复版本（1.0.0 → 1.0.1）
- `minor`：功能版本（1.0.0 → 1.1.0）
- `major`：破坏性变更（1.0.0 → 2.0.0）

### 4. 提交推送

更新 `package.json` 版本号，提交（commit message 含新版本号），推送 `main` 分支到远端。

### 5. 打 Tag

在 `main` 分支上创建语义化版本 Tag（如 `v4.7.65`），推送到远端仓库。Tag push 自动触发 CI workflow 执行 npm publish。

### 6. CI 自动发布

CI workflow（`.github/workflows/ci.yml`）在检测到 tag push 后自动执行：
1. 安全校验（Tag 在 main 分支上）
2. 质量门复检（Lint + Type-check + Test + Audit + Build）
3. 生成 Changelog → 创建 GitHub Release
4. npm publish（使用 CI secrets 中的 NPM_TOKEN）

### 7. 验证完成

确认 CI workflow 执行成功，npm registry 版本已更新，GitHub Release 已创建。

## 与 `/release` 的区别

| 维度 | `/publish` | `/release` |
|------|-----------|-----------|
| 定位 | 简化发布流程 | 完整 Gate 流水线发布（RL0→RL4） |
| 适用 | 确定性的常规发布 | 需要分阶段验证的复杂发布 |
| Gate | 无（直接执行） | 5 个 Gate 分步推进 |

> 日常发布推荐 `/publish`，需要严格质量门禁和分阶段确认时使用 `/release`。

## 红线

- **禁止手动运行 `npm publish`** — CI workflow 在 tag push 后自动执行
- **禁止跳过质量门** — 发布前必须通过 Lint/Type-check/Build/Audit
- **禁止在非 main 分支打 Tag** — CI 会验证 Tag 是否在 main 分支上
- **版本号必须与 Tag 对齐** — `package.json` version 与 git tag 保持一致
