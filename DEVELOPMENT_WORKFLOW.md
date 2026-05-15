# 飞加开发流程与版本规则

> 基于 **Git Flow** 规范，结合项目实际调整。

## 1. 分支模型

```
                    v1.5.11        v1.6.0
main   ────────●──────────●──────────●────── (生产)
               ╲          ╲          ╲
release ─ ─ ─  ● ─ ─ ─ ─  ● ─ ─ ─ ─  ●    (发布候选)
               ╱          ╱          ╱
dev    ────●──────●─────●──────●─────●──── (集成)
            ╲        ╲        ╲
feature ────●──●     ●──●     ●──●────── (功能)
                         ╲
hotfix  ─ ─ ─ ─ ─ ─ ─ ─  ●──● ─ ─ ─ ─ (紧急修复)
```

### 分支定义

| 分支 | 源自 | 合并到 | 用途 | 生命周期 |
|------|------|--------|------|----------|
| `main` | — | — | 生产就绪，每次提交 = 可发布 | 永久 |
| `dev` | `main` | — | 日常集成，feature 汇聚点 | 永久 |
| `feature/*` | **`dev`** | `dev` | 新功能开发 | 合并后删除 |
| `release/*` | **`dev`** | `main` + `dev` | 发布候选，冻结功能只修 bug | 发布后删除 |
| `hotfix/*` | **`main`** | `main` + `dev` | 生产紧急修复 | 修复后删除 |

### 分支命名

```
feature/YYYYMMDD_<kebab-case>
release/v<MAJOR>.<MINOR>.<PATCH>
hotfix/YYYYMMDD_<kebab-case>
```

示例：
```
feature/20260515_admin-rbac-multi-role
release/v1.6.0
hotfix/20260515_login-crash-fix
```

## 2. 标准开发流程

### feature 分支

```bash
# 1. 从 dev 创建 feature 分支
git checkout dev
git pull origin dev
git checkout -b feature/20260515_xxx

# 2. 开发 + 提交
git commit -m "feat: xxx"

# 3. 推送并创建 PR
git push -u origin feature/20260515_xxx
# → Gitee 创建 PR: feature/xxx → dev

# 4. 合并到 dev（PR 通过后）
git checkout dev
git merge --no-ff feature/20260515_xxx
git push origin dev

# 5. 删除 feature 分支
git branch -d feature/20260515_xxx
git push origin --delete feature/20260515_xxx
```

### release 分支

```bash
# 1. 从 dev 创建 release 分支
git checkout dev
git checkout -b release/v1.6.0

# 2. 在 release 上修 bug（只修 bug，不加功能）
git commit -m "fix: xxx"

# 3. 合并到 main
git checkout main
git merge --no-ff release/v1.6.0
git tag -a v1.6.0 -m "feat: xxx"
git push origin main --tags

# 4. 合并回 dev
git checkout dev
git merge --no-ff release/v1.6.0
git push origin dev

# 5. 删除 release 分支
git branch -d release/v1.6.0
```

### hotfix 分支

```bash
# 1. 从 main 创建 hotfix 分支
git checkout main
git checkout -b hotfix/20260515_xxx

# 2. 修复 + 提交
git commit -m "fix: xxx"

# 3. 合并到 main
git checkout main
git merge --no-ff hotfix/20260515_xxx
git tag -a v1.5.12 -m "fix: xxx"
git push origin main --tags

# 4. 合并到 dev
git checkout dev
git merge --no-ff hotfix/20260515_xxx
git push origin dev

# 5. 删除 hotfix 分支
git branch -d hotfix/20260515_xxx
```

## 3. 提交规范

### 格式

```
<type>(<scope>): <subject>
```

### Type

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 代码重构 |
| `chore` | 构建/工具/配置 |
| `docs` | 文档 |
| `style` | 格式 |
| `test` | 测试 |
| `perf` | 性能 |
| `ci` | CI/CD |

### Scope（可选）

```
feat(admin): 多角色RBAC
fix(web): 摘要按钮条件渲染
chore(server): 更新依赖
```

## 4. 合并规则

| 规则 | 说明 |
|------|------|
| `--no-ff` | 强制使用，保留分支历史 |
| 先 Pull 再 Merge | 避免冲突 |
| CI 全绿 | Lint + Type-check + Build 通过 |
| 不 Squash | 保留完整提交记录 |
| feature → dev | PR + Review |
| release → main | 必须打 tag |
| hotfix → main + dev | 必须同步两边 |

## 5. 版本号

```
v<MAJOR>.<MINOR>.<PATCH>

v1.5.11
 │ │  └── PATCH: Bug 修复
 │ └───── MINOR: 新功能
 └─────── MAJOR: 破坏性变更
```

| 变更 | 版本 | 示例 |
|------|------|------|
| Bug 修复 | PATCH +1 | v1.5.10 → v1.5.11 |
| 新功能 | MINOR +1, PATCH=0 | v1.5.11 → v1.6.0 |
| 破坏性变更 | MAJOR +1 | v1.6.0 → v2.0.0 |

> **tag 必须打在 main 分支的 merge commit 上**，不在 feature/dev 上打 tag。

## 6. 禁止事项

| 禁止 | 原因 |
|------|------|
| 直接提交到 main | 必须走 feature + PR |
| 直接提交到 dev | 必须走 feature |
| Force push 到 main/dev | 保护分支 |
| 跳过 hook（`--no-verify`） | 质量门禁 |
| 提交 `.env` / `.local` | 敏感信息 |
| tag 打在非 main 分支 | 版本追踪混乱 |
| squash merge | 丢失提交细节 |
| feature 从 main 创建 | 应从 dev 创建 |

## 7. 发布检查清单

- [ ] 从 dev 创建 release 分支
- [ ] release 分支验证（Lint + Build + 测试）
- [ ] 合并到 main + 打 tag
- [ ] 合并回 dev
- [ ] 删除 release 分支
- [ ] 推送 main + dev + tag

## 8. 版本历史

| 版本 | 日期 | 主要变更 |
|------|------|---------|
| v1.5.11 | 2026-05-15 | 修复角色API + seed角色账号 |
| v1.5.10 | 2026-05-15 | 简化AI排版按钮 |
| v1.5.9 | 2026-05-15 | 移除AI摘要 + seed真实媒体 |
| v1.5.8 | 2026-05-15 | 移除AI聊天 + 角色管理页面 |
| v1.5.7 | 2026-05-15 | RBAC多角色 + P2修复 |
