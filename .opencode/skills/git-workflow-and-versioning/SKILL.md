---
name: git-workflow-and-versioning
description: "Git 工作流与版本管理——Gitee/GitHub 双平台支持。分支策略、提交规范、合并与变基、标签与发布、回滚与修复。用于统一团队的 Git 操作习惯，确保提交历史清晰可追溯。"
---

# Git 工作流与版本管理

## 概述

Git 是你的**变更日志、协作协议和回滚保险**。本技能提供统一的工作流规范，同时适配 Gitee（国内）和 GitHub（国际）双平台。

**核心原则：** 每个 commit 都是一个可独立理解的最小变更单元。commit message 解释"为什么"，diff 展示"改了什么"。工作流服务于团队效率，不为流程而流程。

## 平台适配

| 特性 | Gitee | GitHub |
|------|-------|--------|
| 国内访问 | 快 | 不稳定 |
| 代码审查 | PR | PR |
| CI/CD | Gitee Go | GitHub Actions |
| 免费私有仓库 | 有 | 有 |
| 适合场景 | 国内团队/开源 | 国际项目 |

### Gitee 配置

```bash
git remote add origin https://gitee.com/<org>/<repo>.git
# SSH: git remote add origin git@gitee.com:<org>/<repo>.git
```

### GitHub 配置

```bash
git remote add origin https://github.com/<org>/<repo>.git
# SSH: git remote add origin git@github.com:<org>/<repo>.git
```

### 双推送（镜像同步）

```bash
git remote set-url --add --push origin https://gitee.com/<org>/<repo>.git
git remote set-url --add --push origin https://github.com/<org>/<repo>.git
```

## 分支策略

### 推荐：主干开发（小团队 2-8 人）

```
main ──●──●──●──●──●──●──●── (始终可发布)
        \   /  \   /    \   /
feat/x  ●─●   ●─●   fix ●─●  (短命分支，1-2 天)
```

- 从 main 拉出功能分支
- 每天合并回 main
- 用 Feature Flag 隐藏未完成功能

### 备选：简化 Git Flow（中大团队）

```
main     ──●──────●──────●──── 生产环境（受保护）
            \    / \    /
dev      ──●──●─●──●──●─●──── 开发/测试环境
             \  /    \  /
feat/x       ●●      ●●       功能分支
```

- `main` 受保护，只通过 PR/MR 合并
- `dev` 对应测试环境
- 功能分支从 dev 拉，合回 dev
- dev 测试通过后合并到 main

## 分支命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 功能 | `feat/<描述>` | `feat/user-login` |
| 修复 | `fix/<描述>` | `fix/login-timeout` |
| 紧急修复 | `hotfix/<描述>` | `hotfix/payment-crash` |
| 发布 | `release/v<版本>` | `release/v1.2.0` |
| 重构 | `refactor/<描述>` | `refactor/auth-module` |

规则：全小写，`-`连接单词，前缀明确分支类型。

## 提交规范（Conventional Commits）

### 格式

```
<type>(<scope>): <简短描述>

<详细描述（可选）>

<关联信息（可选）>
```

### 类型清单

| type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(auth): 添加邮箱验证登录` |
| `fix` | Bug 修复 | `fix(api): 修复用户查询超时` |
| `refactor` | 重构（不改变行为） | `refactor(db): 简化查询构建` |
| `perf` | 性能优化 | `perf(list): 引入虚拟滚动` |
| `test` | 测试相关 | `test(auth): 补充登录测试` |
| `docs` | 文档变更 | `docs(api): 更新接口文档` |
| `style` | 格式（不影响逻辑） | `style: 统一缩进` |
| `chore` | 构建/工具/依赖 | `chore: 升级 TypeScript` |
| `ci` | CI/CD 配置 | `ci: 添加 lint 步骤` |
| `revert` | 回滚 | `revert: 回滚 feat(auth) 提交` |

### 规则

1. **简短描述不超过 72 字符**（GitHub 截断阈值）
2. **使用祈使语气**："增加"而非"增加了"
3. **一个 commit 一件事**：不混入不相关改动
4. **关联需求 ID**：`REQ-XXX` 或 Closes #123

### 好 vs 坏

```
✅ feat(auth): 添加用户注册 API [TASK-001]
✅ fix(login): 修复过期 token 未刷新问题
✅ refactor(db): 提取公共查询条件

❌ update code / fix bug / WIP / 修了几个问题
❌ feat: 增加注册、登录、找回密码、修改资料（一次做了太多）
```

## 合并 vs 变基

| 场景 | 用 Merge | 用 Rebase |
|------|---------|----------|
| 功能分支 → develop/main | ✅ | — |
| 清理本地历史再推送 | — | ✅ |
| 已推送的公共分支 | — | ❌ 禁止 |

**黄金规则：永远不要 rebase 已推送的公共分支上的 commits。**

## 标签与版本管理

### 语义化版本

```
MAJOR.MINOR.PATCH

MAJOR：不兼容的 API 变更（1.0.0 → 2.0.0）
MINOR：向后兼容的新功能（1.0.0 → 1.1.0）
PATCH：向后兼容的 Bug 修复（1.0.0 → 1.0.1）
```

### 操作

```bash
# 创建注释标签（推荐）
git tag -a v1.0.0 -m "v1.0.0：新增用户注册和登录功能"

# 推送标签
git push origin v1.0.0
git push origin --tags

# 查看标签
git tag -l "v*"
```

## PR/MR 描述模板

### Gitee：`.gitee/PULL_REQUEST_TEMPLATE.md`
### GitHub：`.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## 变更说明
<!-- 简要描述改了什么，解决了什么问题 -->

## 变更类型
- [ ] 新功能 [ ] Bug 修复 [ ] 重构 [ ] 性能优化 [ ] 文档

## 关联信息
- 需求/Bug 链接：
## 测试情况
- [ ] 单元测试通过 [ ] 手动测试通过 [ ] 回归测试通过
## 部署注意事项
- [ ] 需数据库迁移 [ ] 需更新配置 [ ] 无特殊注意事项
```

## 回滚与修复

```bash
# 撤销未推送的 commit（保留更改）
git reset --soft HEAD~1

# 撤销已推送的 commit（最安全）
git revert <commit_hash>

# 紧急回滚：创建回滚分支
git checkout -b hotfix/rollback v1.0.0
```

## 常用操作

```bash
git status                         # 当前状态
git log --oneline -20              # 提交历史
git stash / git stash pop          # 暂存/恢复工作
git diff develop..feature/xxx      # 分支对比
git show <hash>                    # commit 详情
```

## 验证清单

每次提交前：
- [ ] 分支命名符合规范（feat/fix/hotfix 等前缀）
- [ ] commit message 格式正确（type + scope + 描述）
- [ ] 一个 commit 只含一个逻辑变更
- [ ] 没有提交调试代码、密钥、临时文件
- [ ] 没有 force push 到共享分支
- [ ] 如涉及发布，tag 已按语义化版本打上

## 反合理化表

| 合理化借口 | 现实 |
|-----------|------|
| "commit message 随便写，反正只有我看" | 3 个月后的你也看不懂 |
| "小改动不用分支，直接在 main 改" | 直接改 main = 没有安全网 |
| "一次 commit 放多个功能省事" | revert 会连坐丢掉其他功能 |
| "force push 一下没关系" | 破坏其他人的本地分支 |

## 红线

**以下行为均绕过 Git 规范，停下来按流程走：**
- 不写 commit message（"后面 squash 就行"）
- 在共享分支 force push
- hotfix 直接改 main，不走分支流程
- "先把代码提交了，测试后面跑"
