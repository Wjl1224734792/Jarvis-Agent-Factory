# REQ: /publish 和 /sync 命令 + Gate E 优化

## REQ-001: /publish 一键发布命令

**目标**：提供 `/publish` slash command，一键执行完整发布流程。

**流程**：
1. 质量门检查（lint + typecheck + build + audit，全部通过才继续）
2. 运行测试套件（npm test，全部通过才继续）
3. 自动 bump 版本号（patch 递增）
4. git commit + push 到 dev 分支
5. 创建 git tag（vX.Y.Z）
6. 推送 tag（触发 release workflow 首次尝试，tag 在 dev 上可能失败）
7. 创建 PR（dev → main）
8. 合并 PR
9. 删除 dev 上的 tag，在 main 上重建 tag
10. 推送 main 上的 tag（触发 release workflow 正式发布）
11. 切换回 dev 分支

**质量门失败处理**：哪个检查失败就停止，报告具体失败项。

**模板位置**：`src/templates/platforms/claude/commands/publish.md`

## REQ-002: /sync 同步命令

**目标**：提供 `/sync` slash command，同步项目文件。

**同步内容**：
- `.claude/commands/*.md` — 从模板同步最新命令
- `.claude/skills/*.md` — 从模板同步最新技能
- CLAUDE.md / AGENTS.md / README.md / CHANGELOG.md — 文档同步
- 清理过时的缓存/临时文件（`.claude/` 下的旧文件）

**不同步的内容**（跳过）：
- `dist/` 构建产物
- `docs/YYYY-MM-DD/` 流水线产物
- `node_modules/`
- `.git/`

**模板位置**：`src/templates/platforms/claude/commands/sync.md`

## REQ-003: Gate E 流程优化

**目标**：优化 Gate E 发布流程，使其更流畅。

**改动**：
- Gate E 中引用 `/publish` 命令作为推荐发布方式
- 更新 `finishing-a-development-branch` skill 引用正确的发布命令
- AGENTS.md 中增加 /publish 和 /sync 命令文档

## REQ-004: Web 面板命令列表同步

**目标**：确保 Web 面板 `/api/commands` 端点能正确发现新命令。

**改动**：
- 确认 `src/web/routes.ts` 的命令发现逻辑能识别 `/publish` 和 `/sync`
- 命令分类正确（publish → 发布类别，sync → 工具类别）

## REQ-005: 模板文件更新

**目标**：所有新增和修改写入模板目录，确保 `jarvis add` 安装到用户项目。

**模板文件清单**：
- `src/templates/platforms/claude/commands/publish.md`
- `src/templates/platforms/claude/commands/sync.md`
- 更新 `src/templates/` 下相关配置
