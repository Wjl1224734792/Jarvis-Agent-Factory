---
name: release
description: 发布指令——RL0环境检测→RL1质量门→RL2版本递增→RL3发布执行→RL4发布验证，5Gate发布流程
model: inherit
argument-hint: [版本类型：patch|minor|major，默认patch]
tools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit", "Skill", "Agent", "mcp__jarvis-engine__session_join", "mcp__jarvis-engine__pipeline_guide", "mcp__jarvis-engine__gate_check", "mcp__jarvis-engine__gate_enforce", "mcp__jarvis-engine__advance_gate"]
---

# 发布（Tag + Push）

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎
```
Skill("behavioral-guidelines")
Skill("code-quality-gate")
Skill("git-workflow-and-versioning")
```

**引擎会话注册**（硬约束——引擎确保发布操作按 Gate 权限执行）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "release", task_name: "发布: v<version>" })`
- 每个 Gate 开始前调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 允许的操作
- RL3 发布前调用 `mcp__jarvis-engine__gate_check({ operation: "deploy" })`

代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

> **与 `/publish` 的区别**：`/release` 专注 tag + push + npm publish，不创建 PR、不合并分支。适用于当前分支直接发布场景。需要完整 PR→合并→tag 流程请使用 `/publish`。

---

## RL0：环境检测

**Gate 检查条件**：环境检测报告已产出，含分支/包管理器/版本文件/测试命令

### 步骤

#### 0.1 检测当前分支
```bash
git branch --show-current
```
当前分支记作 `<CURRENT>`。

#### 0.2 检测包管理器
按优先级检测锁文件：
| 锁文件 | 包管理器 | 运行脚本命令 |
|--------|---------|-------------|
| `package-lock.json` | npm | `npm run` |
| `yarn.lock` | yarn | `yarn` |
| `pnpm-lock.yaml` | pnpm | `pnpm` |
| `bun.lock` | bun | `bun run` |

若无任何锁文件，默认使用 `npm`。对应前缀记作 `<PKG>`。

#### 0.3 检测版本文件
按优先级检测：
| 文件 | 项目类型 | 版本字段 |
|------|---------|---------|
| `package.json` | JS/TS | `version` |
| `pyproject.toml` | Python | `[project] version` |
| `Cargo.toml` | Rust | `[package] version` |

检测到的文件记作 `<VERSION_FILE>`，当前版本记作 `<CUR_VER>`。

#### 0.4 检测测试命令
```bash
<PKG> test -- --listTests 2>/dev/null && echo "found" || echo "not found"
```
若 `package.json` 含 `scripts.test` 则使用 `<PKG> test`，否则按 `Makefile test` → `pytest` → `cargo test` → `go test ./...` 优先级查找。

#### 0.5 汇总检测结果
```
=== 环境检测结果 ===
当前分支: <CURRENT>
包管理器: <npm|yarn|pnpm|bun>
版本文件: <VERSION_FILE>
当前版本: <CUR_VER>
测试命令: <TEST_CMD>
===================
```

**引擎推进**：`mcp__jarvis-engine__gate_enforce()` → `mcp__jarvis-engine__advance_gate({ gate: "RL1" })`

---

## RL1：质量门（不可绕过）

**Gate 检查条件**：Lint+Type-check+Build+Deps Audit全部通过

### 步骤

加载 `Skill("code-quality-gate")` 后执行四项检查：

#### 1.1 Lint
| 项目特征 | 检测方式 | 命令 |
|---------|---------|------|
| `eslint` 配置存在 | `.eslintrc.*` / `eslint.config.*` | `<PKG> lint` 或 `npx eslint .` |
| 无已知配置 | — | 跳过（标记 N/A） |

#### 1.2 类型检查
| 项目特征 | 配置 | 命令 |
|---------|------|------|
| TypeScript | `tsconfig.json` | `<PKG> typecheck` 或 `npx tsc --noEmit` |
| 无类型检查 | — | 跳过（标记 N/A） |

#### 1.3 构建
```bash
<PKG> build
```
若无 `build` 脚本，跳过（标记 N/A）。

#### 1.4 依赖审计
```bash
<PKG> audit
```

```
┌─────────────────────────────────────────────────┐
│  质量门检查（全部通过才继续）                      │
│  1. Lint                                        │
│  2. Type-check                                  │
│  3. Build                                       │
│  4. Deps Audit                                  │
└─────────────────────────────────────────────────┘
```

**全部通过 → 进入 RL2**

**任意项失败**：
1. 输出失败项的详细错误信息
2. **立即停止**，不继续后续步骤
3. 向用户报告：哪个检查失败、具体错误、修复建议

**引擎推进**：`mcp__jarvis-engine__gate_enforce()` → `mcp__jarvis-engine__advance_gate({ gate: "RL2" })`

---

## RL2：版本递增

**Gate 检查条件**：版本号已递增，CHANGELOG已更新

### 步骤

参数：用户可指定 `patch`（默认）、`minor`、`major`。未指定则默认 `patch`。

1. 从 `<VERSION_FILE>` 读取当前版本号 `<CUR_VER>`
2. 按类型递增：
   - `patch`：X.Y.Z → X.Y.(Z+1)
   - `minor`：X.Y.Z → X.(Y+1).0
   - `major`：X.Y.Z → (X+1).0.0
3. 更新 `<VERSION_FILE>` 中的版本字段为新版本号 `<NEW_VER>`
4. 更新 `CHANGELOG.md`，添加新版本条目

输出：`版本递增：v<CUR_VER> → v<NEW_VER>（类型：<patch|minor|major>）`

**引擎推进**：`mcp__jarvis-engine__gate_enforce()` → `mcp__jarvis-engine__advance_gate({ gate: "RL3" })`

---

## RL3：发布执行

**Gate 检查条件**：Commit+Tag+Push+npm publish已完成

### 步骤

1. **提交版本变更**：
   ```bash
   git add <VERSION_FILE> CHANGELOG.md
   git commit -m "chore(release): bump version to v<NEW_VER>"
   ```

2. **创建 Tag**：
   ```bash
   git tag -a v<NEW_VER> -m "v<NEW_VER>"
   ```

3. **推送代码和 Tag**：
   ```bash
   git push origin <CURRENT>
   git push origin v<NEW_VER>
   ```

4. **发布到 Registry**（如适用）：
   ```bash
   npm publish --access public
   ```

> 推送失败时报告错误并停止。Tag 已存在时提示用户确认是否覆盖。

**引擎推进**：`mcp__jarvis-engine__gate_enforce()` → `mcp__jarvis-engine__advance_gate({ gate: "RL4" })`

---

## RL4：发布验证

**Gate 检查条件**：Tag存在+CI已触发+Registry版本已更新

### 步骤

1. **验证 Tag 存在**：
   ```bash
   git tag -l "v<NEW_VER>"
   ```

2. **检查 CI 状态**（如有 GitHub Actions）：
   ```bash
   gh run list --limit=3
   ```

3. **验证 Registry 版本**（如适用）：
   ```bash
   npm view <package-name> version
   ```

4. 输出发布完成报告：
   ```
   ## 发布完成报告
   - 版本：v<CUR_VER> → v<NEW_VER>
   - 类型：<patch|minor|major>
   - 分支：<CURRENT>
   - Tag：v<NEW_VER> ✅
   - CI：<状态>
   - Registry：v<NEW_VER> ✅
   ```

---

## 流程总览

```
RL0: 环境检测（分支 + 包管理器 + 版本文件 + 测试命令）
  ↓
RL1: 质量门（Lint + Type-check + Build + Audit）
  ↓ 全部通过
RL2: 版本递增（patch/minor/major + CHANGELOG更新）
  ↓
RL3: 发布执行（commit + tag + push + npm publish）
  ↓
RL4: 发布验证（tag存在 + CI触发 + Registry更新）
```

---

## 红线
- 质量门失败仍继续发布（带问题的代码不能发布）
- 不递增版本号就发布（版本混乱）
- 工作区不干净时发布（未提交变更混入发布）
- Tag 已存在时直接覆盖（需用户确认）
- 只推送 tag 不推送代码（tag 和 commit 分离）
- 跳过 RL4 验证（发布后必须确认成功）

---
## Agent 编排参考

| Gate | 推荐 Agent | 操作类型 | 说明 |
|------|-----------|---------|------|
| RL0 | — | read | 编排者检查工作区干净 + 分支正确 |
| RL1 | — | build/lint/test | 编排者执行质量门全项检查 |
| RL2 | — | write | 编排者版本递增 + CHANGELOG |
| RL3 | infra-deploy-expert | deploy | git commit+tag+push → CI 发布 |
| RL4 | — | read | 编排者验证 npm view + GitHub Release |

> Gate 权限由 `gate_check({ operation })` 强制执行。Agent 不可递归 spawn。
