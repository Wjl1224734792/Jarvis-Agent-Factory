# AGENTS.md — 项目级约束

Jarvis Agent Factory 项目级上下文入口。**所有智能体启动时必须读取此文件。**

> 架构概览见 [CLAUDE.md](./CLAUDE.md) 和 [README.md](./README.md)

## 🔴 文档同步约束（每次提交必须检查）

**每次提交代码必须同步更新以下文档，确保文档与项目状态一致：**

- **AGENTS.md**（本文件）— Agent 列表、技能列表、统计数字、关键约束
- **README.md** — 版本号、特性列表、Web 面板页面、统计数据、CLI 命令
- **docs/README.md** — 流水线产物目录结构

> 提交前自问：我改了什么？AGENTS.md / README.md / docs/README.md 需要同步更新吗？

## 项目类型

跨平台多智能体配置工程（非业务应用代码），三平台：`.claude/`（Claude Code）、`.opencode/`（OpenCode）、`.codex/`（Codex）。

模板源文件位于 `src/templates/platforms/`，通过 CLI `jarvis` 命令安装到目标项目。

## 生命周期流水线

```
想法细化 → 需求澄清 → 任务分解 → 执行规划 → 并行实现 → 代码质量 → 视觉验证 → 测试 → 评审 → 发布
  Gate 0     Gate A     Gate B     Gate C     Gate C     Gate C1   Gate C1.5  Gate C2  Gate D  Gate E
```

## 工作模式

| 模式 | Claude Code | OpenCode | Codex |
|------|-----------|----------|-------|
| 全栈编排 | `/jarvis` | 切换到 `jarvis` agent | 加载 `jarvis` skill |
| 轻量编排 | `/jarvis-lite` | 切换到 `jarvis-lite` agent | 加载 `jarvis-lite` skill |
| 前端生命周期 | `/frontend` | 切换到 `frontend` agent | 加载 `frontend` skill |
| 后端生命周期 | `/backend` | 切换到 `backend` agent | 加载 `backend` skill |
| 移动端开发 | `/taro` `/android` `/ios` `/expo` `/flutter` | 切换到对应 agent | 加载对应 skill |
| 浏览器测试 | `/browser-test` | 切换到 `browser-test-worker` | 加载 `browser-test` skill |
| Bug 修复 | `/bug-fix` | 切换到编排者触发 | 加载 `bug-fix` skill |
| 只读审查 | `/review` | 切换到 `review-only` agent | 加载 `review-only` skill |
| 审查修复闭环 | `/review-fix` | 切换到 `review-fix-optimize` agent | 加载 `review-fix-optimize` skill |
| 算法专家 | `/algorithm-expert` | 切换到 `algorithm-expert` agent | 加载 `algorithm-expert` skill |
| 架构对话 | `/frontend-architect` `/backend-architect` | 切换到对应 agent | 加载对应 skill |

## Web 面板

| 页面 | Hash 路由 | 功能 |
|------|----------|------|
| 流水线看板 | `#/dashboard` | 会话列表 · 指令标签 · Gate 进度 · MCP 平台接入状态 · 置顶/归档/删除 |
| 归档记录 | `#/archive` | 已归档运行记录 · 搜索过滤 · 恢复/永久删除 |
| 智能体配置 | `#/agents` | Agent 搜索/筛选 · 模型/思考等级配置 · 文件同步 |

会话命名：通过 MCP 工具 `session_set_name` 给运行记录设置任务名称，Web 面板优先显示任务名而非会话 ID。

## 浏览器测试文档驱动工作流

```
测试文档编写者 → 测试执行者 → 修复复测者
(test-doc-writer)  (test-executor)  (fix-retest)
```

1. **test-doc-writer** — 编写测试用例文档（结构化步骤、预期结果），不执行测试
2. **test-executor** — 按照文档执行测试，输出通过/失败清单，不编写用例
3. **fix-retest** — 分析失败用例，spawn 修复 Agent，最多 2 轮修复-重测循环

此工作流已集成到 Gate C2 测试验证阶段。

## 浏览器自动化

统一使用 **agent-browser** CLI（Vercel Labs，80+ 命令）。

```bash
npm i -g agent-browser && agent-browser install
```

Claude Code 额外搭配 Preview MCP 做本地预览验证。

## 🔴 关键约束（不可绕过）

1. **禁止凭记忆编码** — 修改前必须读取相关源码、测试、契约
2. **修改技能前先读 writing-skills** — 技能文件需遵循 TDD 规范
3. **三平台技能同步** — `.claude/skills/`、`.codex/skills/`、`.opencode/skills/` 同名目录内容须一致
4. **子智能体不可递归** — 子智能体不得再 spawn 其他子智能体
5. **闸门不可绕过** — Gate A→B→C→C1→C1.5→C2→D→E 顺序不可跳跃
6. **同 Batch 并行** — 无依赖任务必须在同一消息中批量发起
7. **敏感信息不入库** — `.gitignore` 已排除 `settings.local.json`、`.env*`、`*.token`、`*.pem` 等
8. **维护 .gitignore** — 每次新增文件类型（临时文件、截图、日志、数据库文件等）必须同步更新 `.gitignore`，防止误提交。提交前检查 `git status` 无异常文件
9. **不修改共享区域** — 共享契约/配置变更需提交 plan patch
10. **垂直切片优先** — 任务按端到端功能拆分，非技术层级
11. **Agent 失败重试** — 超时重试最多 2 次 / 3 次全失败标记 BLOCKED
12. **修改完必须测试** — 每次代码变更后验证功能正常，引擎启动无误，CLI 命令可用
13. **修改完必须发布** — 测试通过后按下方「发布流程」推送到 Gitee + GitHub，GitHub Actions 自动发布 npm
14. **提交必须同步文档** — 每次提交必须维护 AGENTS.md 与 README.md 保持与项目状态同步，版本号、统计数据、特性列表必须一致
15. **临时文件统一存放** — 所有流水线过程产物（截图、快照、导出的验证数据等）统一放入 `docs/tmp/` 目录，禁止散落在项目根目录。`docs/tmp/` 已配置 `.gitignore` 排除。

## 🚀 发布流程（每次变更完成后必须执行）

### 1. 更新版本号

编辑 `package.json`，按语义化版本递增 `version` 字段：
- **patch** (`x.y.Z`) — Bug 修复、格式修正、小优化
- **minor** (`x.Y.z`) — 新功能、新参数、向后兼容增强
- **major** (`X.y.z`) — 破坏性变更、架构重写

### 2. 维护文档与 .gitignore

**每次提交必须同步：**

- **AGENTS.md** — Agent 列表、技能列表、统计数字、关键约束是否与代码一致
- **README.md** — 版本号、特性列表、Web 面板页面、统计数据是否与代码一致
- **docs/README.md** — 流水线产物目录结构是否与当前一致
- **.gitignore** — 是否遗漏新增临时文件类型（截图/日志/数据库/快照等），`git status` 是否干净

### 3. 提交并打 Tag

**每次代码变更完成后必须打 Tag，不可攒批。提交信息禁止添加 `Co-Authored-By` 等机器签名尾注。**

```bash
git add <changed-files>
git commit -m "<type>: <简短描述>"
git tag -a v<version> -m "v<version> - <概要>"
```

### 4. 推送到 GitHub + 同步 Tag

```bash
git push origin main && git push origin v<version>
```

| 远程 | 地址 |
|------|------|
| origin (GitHub) | `https://github.com/Wjl1224734792/Jarvis-Agent-Factory.git` |

### 5. GitHub Actions 自动发布

两个工作流分工明确：

| 工作流 | 触发条件 | 职责 |
|--------|---------|------|
| `.github/workflows/ci.yml` | push/PR to main | Lint + Type-check + Test + Build |
| `.github/workflows/release.yml` | Tag `v*` 推送 | 质量检查 → 生成 Changelog → 创建 GitHub Release → npm publish → 验证版本 |

推送 Tag 到 GitHub 后，Release 工作流自动执行全流程，无需手动 `npm publish`。

> 若 Release 失败，检查 GitHub Actions 日志。需要 `NPM_TOKEN` secret 配置在仓库 Settings → Secrets 中。

### 6. 验证（两项全部确认）

```bash
npm view jarvis-agent-factory version                    # 确认 npm 版本
git ls-remote --tags origin | grep "v<version>"          # 确认 GitHub tag
```

> 🔴 **验证标准：npm 版本号与 GitHub Tag 必须一致。** 任一缺失立即补推。

## 技能体系

| 类别 | 技能 |
|------|------|
| **基础** | `behavioral-guidelines` `context-engineering` `using-agent-skills` |
| **需求** | `spec-driven-development` `idea-refine` |
| **规划** | `planning-and-task-breakdown` |
| **实现** | `source-driven-development` `incremental-implementation` `test-driven-development` `code-standards` `code-simplification` `frontend-design` |
| **质量** | `code-quality-gate` `code-review-and-quality` `verification-before-completion` |
| **调试** | `debugging-and-error-recovery` |
| **浏览器** | `agent-browser` `browser-testing` |
| **安全** | `security-and-hardening` |
| **流程** | `shipping-and-launch` `git-workflow-and-versioning` `finishing-a-development-branch` |
| **文档** | `chinese-documentation` `documentation-and-adrs` `writing-skills` |
| **探索** | `find-docs` `find-skills` |
| **工具** | `mcp-builder` |

## 智能体体系

### 实现类
`frontend-implementer` `frontend-ui-worker` `frontend-state-worker` `frontend-test-worker` `backend-implementer` `backend-api-worker` `backend-service-worker` `backend-data-worker` `backend-test-worker` `taro-worker` `taro-ui-worker` `taro-state-worker` `android-worker` `android-ui-worker` `android-state-worker` `ios-worker` `ios-ui-worker` `ios-state-worker` `react-native-worker` `rn-ui-worker` `rn-state-worker` `flutter-worker` `flutter-ui-worker` `flutter-state-worker`

### 测试类
`browser-test-worker` `e2e-test-worker` `performance-test-worker` `test-doc-writer` `test-executor` `fix-retest` `api-test-expert`

### 规划评审类
`task-design` `planner` `review-qa`

### 审查类
`diff-code-reviewer` `project-audit-reviewer` `performance-audit-reviewer` `security-auditor` `post-change-reviewer` `remediation-planner` `remediation-worker`

### 架构/专家类
`algorithm-expert` `frontend-architect` `backend-architect` `database-specialist`

### 探索/支撑类
`repo-explorer` `docs-researcher` `api-docs-worker` `infra-worker`

### 编排主控类（OpenCode Primary）
`jarvis` `frontend` `backend` `android` `ios` `flutter` `expo` `taro` `review-only` `review-fix-optimize`
