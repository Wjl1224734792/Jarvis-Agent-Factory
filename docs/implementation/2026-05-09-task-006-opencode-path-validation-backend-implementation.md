# TASK-006: Install/Upgrade OpenCode 路径验证 — 后端实现文档

## 1. 当前实现目标

审核并修复 `jarvis add opencode` 安装流程的路径完整性，确保 npm 包中 OpenCode 模板文件完整且不包含多余文件（如 `node_modules/`）。

## 2. 对应需求 ID / 任务 ID

- **需求 ID**: REQ-007
- **任务 ID**: TASK-006
- **任务名**: Install/Upgrade OpenCode 路径验证

## 3. 输入依据

- Execution Packet TASK-006（编排者分配）
- 文件：`src/install.ts`, `package.json`, `dist/`

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `package.json` (line 43, build script) | 修改 | 在 `cpSync` 模板后增加 `rmSync` 清理 `node_modules/` |
| `dist/` | 审核 | 确认构建产物完整性，无需修改 |
| `src/install.ts` | 审核 | 确认 OpenCode 安装路径完整，无需修改 |

## 5. 实现说明

### 5.1 `src/install.ts` 审核结果（无需修改）

审核 OpenCode 安装流程全部路径，确认完整正确：

| 安装步骤 | 路径逻辑 | 状态 |
|---------|---------|------|
| 源码根路径 | `resolve(pkgRoot, 'dist/src', 'templates', 'platforms', platform)` | 正确 |
| MCP 配置安装 | `mcp-opencode.json` → `.opencode/opencode.json` | 正确 |
| 插件安装 | `mergeDir(srcRoot/plugins, destRoot/plugins)` 通过 INSTALL_BUCKETS | 正确 |
| 技能安装 | `mergeDir(srcRoot/skills, destRoot/skills)` 通过 INSTALL_BUCKETS | 正确 |
| 智能体安装 | `mergeDir(srcRoot/agents, destRoot/agents)` 通过 INSTALL_BUCKETS | 正确 |
| 全局目标路径 | `~/.config/opencode/` | 正确 |
| 文件跳过 | `SKIP_FILES` 包含 `node_modules`、`.git`、`settings.json` | 正确 |
| hooks 安装 | OpenCode 原生插件系统，清理旧版 hooks.json | 正确 |

### 5.2 `package.json` 修复详情

**问题**：构建脚本中 `cpSync('src/templates', 'dist/src/templates', {recursive:true})` 会将 `src/templates/platforms/opencode/node_modules/`（25+ 个包）复制到 `dist/`。虽然该目录的 `.gitignore` 在 `npm pack` 时会排除 `node_modules`，但残留文件浪费磁盘空间且存在不确定风险。

**修复**：在 `cpSync` 后增加清理步骤：

```js
// 修复前
import{cpSync,readFileSync,writeFileSync}from'fs';
// ...
cpSync('src/templates','dist/src/templates',{recursive:true});
// ...

// 修复后
import{cpSync,readFileSync,writeFileSync,rmSync}from'fs';
// ...
cpSync('src/templates','dist/src/templates',{recursive:true});
try{rmSync('dist/src/templates/platforms/opencode/node_modules',{recursive:true,force:true})}catch{};
// ...
```

### 5.3 `files` 字段审核（无需修改）

`"files": ["bin/", "dist/"]` 覆盖了所有需要发布的内容，包括：
- `dist/src/templates/mcp-opencode.json`
- `dist/src/templates/platforms/opencode/` 全部子目录

## 6. 测试和验证结果

### 6.1 构建验证

```
$ npm run build
> tsc && node -e "...(含 rmSync 清理)..."
# 构建成功，无错误
```

### 6.2 dist/ 目录结构验证

| 路径 | 预期 | 实际 |
|------|------|------|
| `dist/src/templates/platforms/opencode/agents/` | 54 个 .md 文件 | ✅ 54 个 |
| `dist/src/templates/platforms/opencode/plugins/jarvis-gate-check.ts` | 存在 | ✅ 存在 |
| `dist/src/templates/platforms/opencode/skills/` | 27 个技能目录 | ✅ 27 个 |
| `dist/src/templates/mcp-opencode.json` | 存在 | ✅ 330B |
| `dist/src/templates/platforms/opencode/node_modules/` | 不存在 | ✅ 已清理 |

### 6.3 npm pack --dry-run 验证

```
$ npm pack --dry-run
npm notice total files: 363
npm notice jarvis-agent-factory-3.28.2.tgz

# 关键内容确认：
- node_modules: 0 条目（已排除）
- opencode/agents/: 54 个 agent .md 文件
- opencode/plugins/: jarvis-gate-check.ts + 编译产物
- opencode/skills/: 27 个技能目录
- mcp-opencode.json: 330B
```

## 7. 数据与接口边界

- 无 API 接口变更
- 无数据库变更
- 无共享类型变更
- 仅影响 npm 打包流程

## 8. 风险 / 未解决项

### 已知风险

| 风险 | 严重度 | 说明 |
|------|--------|------|
| `cpSync` 复制 `package-lock.json` | 低 | 13.8KB 文件被复制到 dist/，但被 `.gitignore` 排除出 npm 包 |
| TSC 编译了模板中的插件 `.ts` 文件 | 低 | `tsconfig.json` exclude 列表含 `src/templates` 但似乎未完全阻止编译，产生冗余 `.js`/`.js.map`/`.d.ts` 文件（共约 8.7KB），但对功能无影响 |

### 未解决项

无。所有验收标准已满足。

## 9. 需要前端配合的点

无。本任务为纯后端构建/审核任务。

## 10. 推荐的下一步

- 可考虑在 `tsconfig.json` 中将 `exclude` 修正为 `src/templates/**` 以确保 TSC 完全跳过模板目录（减少冗余编译产物），但此项为优化而非缺陷。
- 可考虑构建脚本中同步清理 `package-lock.json`，保持 dist 目录干净（低优先级）。
