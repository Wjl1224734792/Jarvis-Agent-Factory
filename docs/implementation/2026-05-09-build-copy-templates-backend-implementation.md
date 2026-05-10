# 构建脚本复制模板目录到 dist

## 1. 当前实现目标

修改 `package.json` 的 `"build"` 脚本，增加 `cpSync('src/templates', 'dist/src/templates', {recursive: true})`，使 `npm run build` 后将模板文件（`.md`、`.json`、`.toml`）一并复制到 `dist/` 输出目录。

## 2. 对应需求 ID / 任务 ID

- 任务 ID: **TASK-001**
- 需求范围: 构建脚本复制模板目录到 dist

## 3. 输入依据

- 任务分配中的 `objective`、`in_scope`、`acceptance_criteria`
- 项目根约束 `AGENTS.md`（构建与发布流程）
- `code-standards` / `behavioral-guidelines` 等通用规范

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `package.json` | 修改 | `"build"` 脚本中增加一行 `cpSync('src/templates','dist/src/templates',{recursive:true})` |

无其他文件变更。

## 5. 实现说明

### 根因

`tsc` 只编译 `.ts` 文件，不复制非 TypeScript 资源文件（`.md`、`.json`、`.toml`）。原有 build 脚本只通过 `cpSync` 复制了 `src/web/views/` 中的 HTML 视图文件，遗漏了 `src/templates/` 目录。

结果：`jarvis upgrade` 无法找到模板源，智能体配置页面返回空列表。

### 方案

在 `"build"` 脚本的 inline Node.js 代码块中，紧接现有 `cpSync('src/web/views', ...)` 调用之后，增加一行：

```js
cpSync('src/templates', 'dist/src/templates', {recursive: true});
```

- `src/templates/` 包含 MCP 配置 JSON/TOML 文件、hooks 配置文件，以及 `platforms/claude/agents/` 下的大量智能体 Markdown 模板
- `recursive: true` 确保嵌套子目录（如 `platforms/claude/agents/`）被完整复制
- 目标路径 `dist/src/templates/` 与 `tsc` 的 `outDir: "dist"` + `rootDir: "."` 结构一致

### 变更 diff

```diff
-    "build": "...cpSync('src/web/views','dist/src/web/views',{recursive:true});const v=..."
+    "build": "...cpSync('src/web/views','dist/src/web/views',{recursive:true});cpSync('src/templates','dist/src/templates',{recursive:true});const v=..."
```

## 6. 测试和验证结果

### 验收标准逐条验证

| # | 验收标准 | 结果 | 证据 |
|---|---------|------|------|
| 1 | `dist/src/templates/platforms/claude/agents/` 目录存在并包含 `.md` 文件 | 通过 | `ls dist/src/templates/platforms/claude/agents/` 列出 10+ 个 `.md` 文件 |
| 2 | `dist/src/templates/mcp-claude.json` 等 MCP 模板文件存在 | 通过 | `mcp-claude.json`、`mcp-codex.toml`、`mcp-opencode.json`、`hooks-claude.json` 全部存在 |
| 3 | 现有 `dist/src/web/views/` 仍然正常复制 | 通过 | `pipeline.html`、`agents.html`、`archive.html` 三文件存在 |
| 4 | TypeScript 编译不受影响 | 通过 | `tsc` 零错误退出 |
| 5 | `npm run check` 全部通过 | 通过 | Lint 0 错误 + Typecheck 0 错误 + 3 测试文件 45 测试全部通过 |

## 7. 数据与接口边界

- 无契约变更
- 无 API 边界变更
- 无数据库变更
- 仅影响构建产物 `dist/` 的内容

## 8. 风险 / 未解决项

无已知风险。此变更为纯增量（在现有复制逻辑后增加一行），不影响现有任何行为。

## 9. 需要前端配合的点

无需前端配合。模板文件复制到 `dist/` 后，CLI `jarvis upgrade` 和 Web 面板即可正确读取模板源。

## 10. 推荐的下一步

- 按发布流程：更新版本号（patch bump）、提交并打 Tag、推送到 GitHub 触发 CI + Release
