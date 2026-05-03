---
name: git-workflow-and-versioning
description: "Git 工作流与版本管理——分支策略、提交规范、合并与变基、标签与发布、回滚与修复。用于统一团队的 Git 操作习惯，确保提交历史清晰可追溯。"
license: MIT
compatibility: "OpenCode >=1.0, Claude Code, Codex"
metadata:
  version: "1.0"
  author: lin
---

# Git 工作流与版本管理

## 概述

Git 不仅是一个保存代码的工具——它是你的**变更日志、协作协议和回滚保险**。本技能提供标准化的 Git 操作规范，确保团队协作一致、历史可追溯、回滚可执行。

**核心原则：** 每个 commit 都是一个可独立理解的最小变更单元。commit message 解释"为什么"，diff 展示"改了什么"。

**必需背景：** 你应在开始编码前就理解本技能。同步参考 `incremental-implementation` 中的小步提交原则。

## 何时使用

**适用场景：**
- 开始新功能开发时（从哪个分支拉？）
- 提交代码时（message 怎么写？）
- 合并代码时（merge 还是 rebase？）
- 发布版本时（怎么打 tag？）
- 线上出问题时（怎么快速回滚？）
- 代码审查后需要修改时（怎么追加？）

---

## 分支策略

### 推荐：简化 Git Flow

```
main ─────●────────●────────●─────── (生产就绪)
           \       /        /
release ────●─────●────────●─────── (发布候选)
              \   /
develop ──────●──●──●──●─────────── (集成)
                \ /
feature/xxx ────●●                  (功能开发)
```

#### 分支命名规范

| 分支类型 | 格式 | 示例 |
|---------|------|------|
| 功能分支 | `feature/<简短描述>` | `feature/user-register` |
| 修复分支 | `fix/<简短描述>` | `fix/login-timeout` |
| 紧急修复 | `hotfix/<简短描述>` | `hotfix/payment-crash` |
| 发布分支 | `release/<版本号>` | `release/v1.2.0` |
| 重构分支 | `refactor/<简短描述>` | `refactor/auth-module` |
| 文档分支 | `docs/<简短描述>` | `docs/api-guide` |

#### 分支生命周期

1. 从 `develop`（或 `main`）拉出分支
2. 在分支上开发，保持与上游同步（定期 `git merge develop` 或 `git rebase develop`）
3. 完成后提交 PR/MR 到 `develop`
4. 合并后删除功能分支
5. `develop` → `release` → `main`

---

## 提交规范

### Commit Message 格式

```
<type>(<scope>): <简短描述>

<详细描述（可选）>

<关联信息（可选）>
```

#### Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(auth): 增加邮箱验证登录` |
| `fix` | Bug 修复 | `fix(api): 修复用户查询超时问题` |
| `refactor` | 重构（不改变行为） | `refactor(db): 简化查询构建逻辑` |
| `perf` | 性能优化 | `perf(list): 引入虚拟滚动减少渲染` |
| `test` | 测试相关 | `test(auth): 补充登录失败测试` |
| `docs` | 文档变更 | `docs(api): 更新用户接口文档` |
| `style` | 格式调整（不影响逻辑） | `style: 统一缩进为 2 空格` |
| `chore` | 构建/工具/依赖 | `chore(deps): 升级 TypeScript 到 5.0` |
| `ci` | CI/CD 配置 | `ci: 增加 lint 检查步骤` |
| `revert` | 回滚 | `revert: 回滚 feat(auth) 提交` |

#### 规则

1. **简短描述不超过 72 个字符**（这是 GitHub 截断的阈值）
2. **使用祈使语气**："增加"而非"增加了"、"修复"而非"修复了"
3. **一个 commit 做一件事**：不要在一个 commit 里混入不相关的改动
4. **关联任务/需求 ID**：`[TASK-003]` 或 `REQ-001`

#### 好 vs 坏

```
✅ feat(auth): 增加用户注册 API 端点 [TASK-001]
✅ fix(login): 修复过期 token 未刷新的问题
✅ refactor(db): 提取公共查询条件构建方法

❌ update code
❌ fix bug
❌ WIP: 保存一下
❌ 修了几个问题和优化了一下性能
❌ feat(auth): 增加注册、登录、找回密码、修改资料、头像上传、绑定手机
```

---

## 合并与变基

### 何时用 Merge

```
场景：将功能分支合并到共享分支（develop/main）
命令：git merge feature/xxx
结果：产生一个合并 commit，保留完整的分支历史
优点：不会改变已有 commit，安全
```

### 何时用 Rebase

```
场景：清理本地分支历史再推送
命令：git rebase develop
结果：将你的 commits 重放到 develop 最新位置
优点：线性历史，更清晰
注意：不要 rebase 已经推送的 commits（会改变 commit hash）
```

### 黄金规则

> **永远不要 rebase 已推送的公共分支上的 commits。**
> 只 rebase 你本地尚未推送的 commits。

---

## 标签与版本管理

### 语义化版本

```
版本格式：MAJOR.MINOR.PATCH

MAJOR：不兼容的 API 变更（1.0.0 → 2.0.0）
MINOR：向后兼容的新功能（1.0.0 → 1.1.0）
PATCH：向后兼容的 Bug 修复（1.0.0 → 1.0.1）

预发布版本：1.0.0-alpha.1, 1.0.0-beta.1, 1.0.0-rc.1
```

### 打标签

```bash
# 轻量标签（用于内部标记）
git tag v1.0.0

# 注释标签（用于发布，推荐）
git tag -a v1.0.0 -m "发布 v1.0.0：新增用户注册和登录功能"

# 推送标签到远程
git push origin v1.0.0
git push origin --tags  # 推送所有标签
```

---

## 回滚与修复

### 撤销最近的 commit（尚未推送）

```bash
# 保留更改在工作区
git reset --soft HEAD~1

# 丢弃更改
git reset --hard HEAD~1
```

### 撤销已推送的 commit

```bash
# 最安全的方式：创建一个反向 commit
git revert <commit_hash>
```

### 紧急回滚

```bash
# 查看要回滚到的 tag
git tag -l "v*"

# 创建回滚分支
git checkout -b hotfix/rollback v1.0.0

# 修复后合并回主分支
```

---

## 常用操作速查

```bash
# 查看当前状态
git status

# 查看提交历史（单行）
git log --oneline -20

# 查看某个文件的变更历史
git log --oneline -- path/to/file

# 暂存当前工作（临时切换分支）
git stash
git stash pop

# 查看两个分支的差异
git diff develop..feature/xxx

# 查看某个 commit 改了什么
git show <commit_hash>

# 取消暂存（但保留更改）
git reset HEAD path/to/file

# 丢弃工作区的更改
git checkout -- path/to/file
```

---

## 常见借口

| 合理化借口 | 现实 |
|-----------|------|
| "commit message 随便写，反正只有我看" | 3 个月后的你也看不懂。规范的 commit history 是穷人的文档。 |
| "小改动不用分支，直接在 main 上改" | 直接改 main = 没有安全网。出问题无法回滚，被阻断时无法切走。 |
| "一次 commit 放多个功能比较省事" | 某个功能出问题时，revert 会丢掉另一个功能。一个 commit = 一件事。 |
| "rebase 之后 force push 一下就行" | force push 破坏其他人的本地分支。除非分支只有你一个人用。 |
| "merge commit 太多看起来很乱" | merge commit 是真实的分支历史的记录。整洁不如完整。 |

## 红线——停下来，按流程走

如果你发现自己在想：
- "不用写 commit message，后面 squash 就行"
- "force push 一下没关系，就我一个人用"
- "hotfix 直接改 main，不用走分支流程"
- "这个改动太小了，不用单独提交"
- "先把代码提交了，测试后面跑"

**以上这些都意味着：你在绕过 Git 规范。停下来，按流程操作。**

## 验证清单

每次提交前确认：

- [ ] 分支命名符合规范（feature/fix/hotfix 等前缀）
- [ ] commit message 格式正确（type + scope + 简短描述）
- [ ] 简短描述不超过 72 字符
- [ ] 一个 commit 只包含一个逻辑变更
- [ ] 没有提交调试代码、密钥、临时文件
- [ ] 没有 force push 到共享分支
- [ ] 没有 rebase 已推送的 commits
- [ ] 如涉及发布，tag 已按语义化版本打上
