# 飞加开发流程与版本规则

## 1. 分支策略

```
main ────●────────●────────●────── (生产/保护)
          ╲        ╲        ╲
dev  ─────●────────●────────●── (集成/保护)
           ╲        ╲
feature ───●──●     ●──●───── (功能分支，开发完删除)

test ─────● (测试分支，验证完删除，不合并)
```

### 分支定义

| 分支 | 用途 | 保护 | 合并要求 |
|------|------|:--:|------|
| `main` | 生产就绪代码，每次提交可发布 | ✅ | PR + Review + CI 全绿 |
| `dev` | 日常集成，所有 feature 合入点 | ✅ | CI 全绿 |
| `feature/YYYYMMDD_xxx` | 功能开发 | ❌ | 开发完 → dev |
| `test/YYYYMMDD_xxx` | 测试/探索 | ❌ | 不合并，验证完删除 |
| `hotfix/YYYYMMDD_xxx` | 紧急修复 | ❌ | 修复完 → main + dev |
| `release/vX.Y.Z` | 发布候选 | ❌ | 测试通过 → main |

### 分支命名规则

```
feature/20260515_admin-rbac-multi-role
test/20260515_browser-explore
hotfix/20260515_login-crash-fix
release/v1.6.0
```

- `feature/` + 日期 + 简短描述（kebab-case）
- `test/` + 日期 + 简短描述（用于浏览器测试、探索性验证，不合并）
- `hotfix/` + 日期 + 简短描述
- `release/` + 语义化版本号

## 2. 版本规则（语义化版本）

```
v<MAJOR>.<MINOR>.<PATCH>

v1.5.11
 │ │  └── PATCH：Bug 修复、小调整（向下兼容）
 │ └───── MINOR：新功能（向下兼容）
 └─────── MAJOR：破坏性变更（不向下兼容）
```

### 版本递增规则

| 变更类型 | 版本号 | 示例 |
|---------|--------|------|
| Bug 修复 | PATCH +1 | v1.5.10 → v1.5.11 |
| 新功能 | MINOR +1, PATCH=0 | v1.5.11 → v1.6.0 |
| 破坏性变更 | MAJOR +1, 其余归零 | v1.6.0 → v2.0.0 |

### 打 Tag 规则

- **每次合入 main 后**必须打 tag
- Tag 信息用中文简要说明变更内容
- Tag 标记在 main 分支的 merge commit 上

```bash
git tag -a v1.5.11 -m "fix: 角色API 500错误 + seed各角色测试账号"
git push origin v1.5.11
```

## 3. 提交规范

### 格式

```
<type>(<scope>): <subject>
```

### Type

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: Admin多角色RBAC权限系统` |
| `fix` | Bug 修复 | `fix: 侧边栏SubMenu点击无响应` |
| `refactor` | 代码重构（不改变功能） | `refactor: AI排版按钮简化为单个` |
| `chore` | 构建/工具/配置变更 | `chore: dev脚本改用concurrently` |
| `docs` | 文档变更 | `docs: 新增开发流程文档` |
| `style` | 格式变更（空格/分号等） | `style: 统一缩进格式` |
| `test` | 测试变更 | `test: 新增角色管理页面测试` |
| `perf` | 性能优化 | `perf: 优化首页加载速度` |
| `ci` | CI/CD 变更 | `ci: 新增自动化部署流水线` |

### Scope（可选）

```
feat(admin): 多角色RBAC权限系统
fix(web): AI摘要按钮未条件渲染
chore(server): 更新依赖版本
```

### Co-Authored-By

```
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

## 4. 开发流程

### 标准流程

```
1. 从 main 创建 feature 分支
   git checkout main && git pull origin main
   git checkout -b feature/20260515_xxx

2. 开发 + 提交
   （每次提交遵循提交规范）

3. 推送到远程
   git push -u origin feature/20260515_xxx

4. 创建 PR → dev
   - 至少 1 人 Review
   - CI 必须全绿（Lint + Build + Type-check）

5. 合并到 dev
   git checkout dev && git merge feature/20260515_xxx --no-ff
   git push origin dev

6. 合并到 main
   git checkout main && git merge dev --no-ff
   git push origin main

7. 打 Tag
   git tag -a vX.Y.Z -m "说明"
   git push origin vX.Y.Z

8. 删除 feature 分支
   git branch -d feature/20260515_xxx
```

### 紧急修复流程

```
1. 从 main 创建 hotfix 分支
2. 修复 + 提交
3. 合并到 main → 打 tag
4. 同步到 dev
5. 删除 hotfix 分支
```

## 5. 合并规则

| 规则 | 说明 |
|------|------|
| `--no-ff` | 始终使用 `--no-ff`，保留分支历史 |
| Rebase 前先 Pull | 合并前确保本地最新 |
| 不 Squash | 保留完整提交历史 |
| CI 全绿 | Lint + Type-check + Build 全部通过 |
| 无冲突 | 有冲突先解决再合并 |

## 6. 禁止事项

| 禁止 | 原因 |
|------|------|
| 直接提交到 main | 必须走 feature 分支 + PR |
| 直接提交到 dev | 必须走 feature 分支 |
| Force Push 到 main/dev | 保护分支，历史不可改写 |
| 跳过 Hook（--no-verify） | 质量门禁不可绕过 |
| 提交 .env / .local 文件 | 敏感信息和本地配置 |
| tag 打在 feature 分支 | tag 只在 main 上打 |
| 合并时 squash | 丢失提交细节 |
| 跨分支 cherry-pick | 优先走正常合并流程 |

## 7. 发布检查清单

- [ ] main 分支最新，所有 feature 已合入
- [ ] Lint + Type-check + Build 全部通过
- [ ] 浏览器测试通过（admin + web）
- [ ] 数据库迁移已就绪（如有 Schema 变更）
- [ ] 版本号已递增，changelog 已更新
- [ ] Tag 已创建并推送
- [ ] dev 已同步

## 8. 版本历史

| 版本 | 日期 | 主要变更 |
|------|------|---------|
| v1.5.11 | 2026-05-15 | 修复角色API + seed角色账号 |
| v1.5.10 | 2026-05-15 | 简化AI排版按钮 |
| v1.5.9 | 2026-05-15 | 移除AI摘要 + seed真实媒体 |
| v1.5.8 | 2026-05-15 | 移除AI聊天 + 角色管理页面 |
| v1.5.7 | 2026-05-15 | RBAC多角色 + P2修复 |
| v1.5.6 | 2026-05-15 | RBAC多角色 |
| v1.5.5 | 2026-05-14 | AI功能开关 + Admin布局重构 |
| v1.5.4 | 2026-05-13 | AI聊天侧边栏 |
| v1.5.3 | 2026-05-12 | AI安全规则完善 |
| v1.5.2 | 2026-05-12 | 字体替换+Admin按钮修复 |
