---
description: 完整发布流程（含PR+审查+合并）——环境检测→质量门→测试→版本bump→commit→push→PR→合并→tag→发布；区别于简易的/release指令
argument-hint: [版本类型：patch|minor|major，默认patch]
version: "3.53.0"
updated: "2026-05-19"
---

# 一键发布

> **区别于 `/release`**：`/publish` 走完整的分支工作流（工作分支→PR创建→代码审查→合并到默认分支→tag），适合团队协作的正式发布。如果是在当前分支直接提交+tag+push的快速发布，请使用 `/release`。
>
> | 特性 | `/publish`（本指令） | `/release` |
> |------|---------------------|-----------|
> | 分支策略 | 工作分支→PR→默认分支 | 当前分支直接发布 |
> | 代码审查 | PR 审查流程 | 无 |
> | 适用场景 | 团队正式发布 | 快速迭代/单人项目 |
> | Tag 位置 | 默认分支（main） | 当前分支 |

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 环境检测

```
Skill("code-quality-gate")
Skill("git-workflow-and-versioning")
```

### 0.1 检测默认分支

```bash
git remote show origin | grep "HEAD branch" | awk '{print $NF}'
```

默认分支通常为 `main` 或 `master`。记作 `<DEFAULT>`。

若 `git remote show origin` 失败（无远程仓库），报告用户先配置远程仓库。

### 0.2 检测工作分支

```bash
git branch --show-current
```

当前分支记作 `<CURRENT>`。

- **若 `<CURRENT>` != `<DEFAULT>`**：将 `<CURRENT>` 作为工作分支使用，记作 `<WORK>`。
- **若 `<CURRENT>` == `<DEFAULT>`**：提示用户确认工作分支名称（建议用 `dev`），然后执行：
  ```bash
  git checkout -b dev
  ```
  若 `dev` 已存在（本地或远程），改为 `git checkout dev && git pull origin dev`。
  若用户指定了其他名称，使用用户指定的名称。记作 `<WORK>`。

### 0.3 检测包管理器

按优先级检测锁文件，优先使用已有锁文件的包管理器：

| 锁文件 | 包管理器 | 运行脚本命令前缀 |
|--------|---------|-----------------|
| `package-lock.json` | npm | `npm run` |
| `yarn.lock` | yarn | `yarn` |
| `pnpm-lock.yaml` | pnpm | `pnpm` |

若无任何锁文件，默认使用 `npm`。对应的前缀记作 `<PKG>`。以下各步骤中的脚本调用统一为 `<PKG> <script>` 格式。审计命令为 `<PKG> audit`。

### 0.4 检测版本文件

按优先级检测版本声明文件：

| 文件 | 项目类型 | 版本字段 |
|------|---------|---------|
| `package.json` | JS/TS | `version` |
| `pyproject.toml` | Python | `[project] version` 或 `[tool.poetry] version` |
| `Cargo.toml` | Rust | `[package] version` |

若多个文件同时存在，优先使用 `package.json`。检测到的文件记作 `<VERSION_FILE>`，当前版本记作 `<CUR_VER>`。

### 0.5 检测测试命令

```bash
# 若 package.json 存在且含 test 脚本
<PKG> test -- --listTests 2>/dev/null; echo "found"
```

若检测到 `scripts.test` 则使用 `<PKG> test`，否则按以下优先级查找：
- `Makefile` 中的 `test` 目标
- `pytest`（Python）
- `cargo test`（Rust）
- `go test ./...`（Go）

若无法自动检测，提示用户指定测试命令。

### 0.6 汇总检测结果

向用户展示并确认：

```
=== 环境检测结果 ===
默认分支: <DEFAULT>
工作分支: <WORK>
包管理器: <npm|yarn|pnpm>
版本文件: <VERSION_FILE>
当前版本: <CUR_VER>
测试命令: <TEST_CMD>
===================
```

---

## 步骤 1：前置检查（不可绕过）

1. **工作区干净**：
   ```bash
   git status --porcelain
   ```
   若有未提交变更，列出文件并提示用户处理。

2. **确认分支**：当前分支必须为 `<WORK>`（已由步骤 0.2 保证）。

3. **与远程同步**：
   ```bash
   git fetch origin
   git pull origin <WORK> --rebase
   ```

**前置条件不满足 → 立即停止，向用户报告具体问题和处理建议。**

---

## 步骤 2：质量门（不可绕过）

加载 `Skill("code-quality-gate")` 后执行四项检查。工具按项目特征自适应选择：

### 2.1 Lint

| 项目特征 | 检测方式 | 命令（优先脚本，回退直接调用） |
|---------|---------|------------------------------|
| `eslint` 配置存在 | `.eslintrc.*` / `eslint.config.*` | `<PKG> lint` 或 `npx eslint .` |
| `oxlint` 配置存在 | `oxlintrc.*` | `<PKG> lint` 或 `npx oxlint` |
| `ruff` 配置存在 | `ruff.toml` / `pyproject.toml[tool.ruff]` | `ruff check .` |
| `golangci-lint` 配置 | `.golangci.yml` | `golangci-lint run` |
| 无已知配置 | — | 跳过（标记 N/A） |

### 2.2 类型检查

| 项目特征 | 配置 | 命令 |
|---------|------|------|
| TypeScript | `tsconfig.json` | `<PKG> type-check` 或 `npx tsc --noEmit` |
| Python + mypy | `mypy.ini` / `pyproject.toml[tool.mypy]` | `mypy .` |
| 无类型检查配置 | — | 跳过（标记 N/A） |

### 2.3 构建

```bash
<PKG> build
```

若无 `build` 脚本，尝试项目级构建命令（如 `go build ./...`），无则跳过（标记 N/A）。

### 2.4 依赖审计

```bash
<PKG> audit
```

审计命令不可用时跳过（标记 N/A，注明该包管理器不提供审计功能）。

```
┌─────────────────────────────────────────────────┐
│  质量门检查（全部通过才继续）                      │
│                                                 │
│  1. Lint（自适应: eslint/ruff/golangci-lint/...）│
│  2. Type-check（自适应: tsc/mypy/...）           │
│  3. Build（自适应）                             │
│  4. Deps Audit（自适应: npm auditor/...）       │
└─────────────────────────────────────────────────┘
```

**全部通过 → 进入步骤 3**

**任意项失败**：
1. 输出失败项的详细错误信息
2. **立即停止**，不继续后续步骤
3. 向用户报告：哪个检查失败、具体错误、修复建议
4. 用户修复后重新执行 `/publish` 从步骤 2 开始

---

## 步骤 3：测试（不可绕过）

使用步骤 0.5 检测到的测试命令：

```bash
<TEST_CMD>
```

**全部通过 → 进入步骤 4**

**测试失败**：
1. 输出失败的测试名称和错误详情
2. **立即停止**，不继续后续步骤
3. 向用户报告：失败测试数量、失败原因摘要
4. 用户修复后重新执行 `/publish` 从步骤 2 开始

---

## 步骤 4：版本递增

加载 `Skill("git-workflow-and-versioning")` 执行版本管理。

参数：用户可指定 `patch`（默认）、`minor`、`major`。未指定则默认 `patch`。

1. 从 `<VERSION_FILE>` 读取当前版本号 `<CUR_VER>`
2. 按类型递增：
   - `patch`：X.Y.Z → X.Y.(Z+1)
   - `minor`：X.Y.Z → X.(Y+1).0
   - `major`：X.Y.Z → (X+1).0.0
3. 更新 `<VERSION_FILE>` 中的版本字段为新版本号 `<NEW_VER>`
   - `package.json`：修改 `version` 字段
   - `pyproject.toml`：修改 `[project]` 下 `version`，或 `[tool.poetry]` 下 `version`
   - `Cargo.toml`：修改 `[package]` 下 `version`
4. 若项目使用 Git tag 标注版本（非 npm 包），同时更新版本文件中的 git tag 引用

输出：`版本递增：v<CUR_VER> → v<NEW_VER>（类型：<patch|minor|major>，文件：<VERSION_FILE>）`

---

## 步骤 5：提交并推送

```bash
git add <VERSION_FILE>
git commit -m "chore: bump version to v<NEW_VER>"
git push origin <WORK>
```

> 若版本文件关联了锁文件（如 `package.json` 关联 `package-lock.json`），一并提交锁文件变更。

推送失败时报告错误并停止。

---

## 步骤 6：创建 PR（工作分支 → 默认分支）

```bash
gh pr create \
  --base <DEFAULT> \
  --head <WORK> \
  --title "Release v<NEW_VER>" \
  --body "## 发布内容

- 版本：v<NEW_VER>
- 类型：<patch|minor|major>

## 检查清单
- [x] 质量门通过
- [x] 测试通过
- [x] 版本已递增

Auto-generated by /publish command."
```

PR 创建失败时报告错误并停止。

---

## 步骤 7：合并 PR

```bash
gh pr merge --merge
```

使用 `--merge`（非 squash）保留完整提交历史。

合并失败（如存在冲突）时报告错误并停止，提示用户手动解决冲突后重试。

---

## 步骤 8：在默认分支上创建并推送 tag

**仅在 PR 合并成功后**，在 `<DEFAULT>` 上创建 tag：

```bash
# 1. 切换到默认分支并拉取最新
git checkout <DEFAULT> && git pull origin <DEFAULT>

# 2. 在默认分支上创建 tag（只在这里，不在工作分支上打 tag）
git tag -a v<NEW_VER> -m "Release v<NEW_VER>"

# 3. 推送 tag
git push origin v<NEW_VER>
```

> **关键**：tag 只在默认分支上创建，确保 release workflow 只触发一次。不要在工作分支上打 tag。

推送失败时报告错误并停止。

---

## 步骤 9：切回工作分支并报告结果

```bash
git checkout <WORK>
```

输出发布完成报告：

```
## 发布完成报告

- 版本：v<CUR_VER> → v<NEW_VER>
- 类型：<patch|minor|major>
- 包管理器：<npm|yarn|pnpm>
- 版本文件：<VERSION_FILE>
- 默认分支：<DEFAULT>
- 工作分支：<WORK>
- 质量门：通过
- 测试：通过
- Commit：<commit hash>
- Tag：v<NEW_VER>（指向 <DEFAULT>）
- PR：#<PR number>（已合并）
- 当前分支：<WORK>
```

---

## 流程总览

```
步骤 0: 环境检测（分支名 + 包管理器 + 版本文件 + 测试命令）
  ↓
步骤 1: 前置检查（工作区干净 + 正确分支 + 拉取最新）
  ↓
步骤 2: 质量门（Lint + Type-check + Build + Audit）[自适应工具]
  ↓ 全部通过
步骤 3: 测试（自适应测试命令）
  ↓ 全部通过
步骤 4: 版本递增（patch/minor/major，自适应版本文件）
  ↓
步骤 5: 提交并推送（commit VERSION_FILE + push 工作分支）
  ↓
步骤 6: 创建 PR（工作分支 → 默认分支）
  ↓
步骤 7: 合并 PR
  ↓
步骤 8: 在默认分支上创建并推送 tag
  ↓
步骤 9: 切回工作分支 + 报告完成
```

---

## 红线

- 不确认分支关系就发布（可能导致版本混乱）
- 工作区不干净时发布（未提交变更混入发布）
- 质量门失败仍继续（带问题的代码不能发布）
- 测试失败仍继续（回归未发现的发布是事故）
- 手动修改版本号而不使用版本递增流程（破坏版本号一致性）
- tag 不指向默认分支（tag 应指向正式发布分支，确保 release workflow 正确触发）
- 使用 `--squash` 合并 PR（丢失工作分支的提交历史细节）
- 硬编码包管理器命令而不使用环境检测结果（导致非 npm 项目命令无效）
