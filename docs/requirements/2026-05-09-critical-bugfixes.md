# 需求文档：紧急 Bug 修复与体验优化

> 状态: confirmed | 日期: 2026-05-09 | 版本: 1.0

---

## 背景

用户在使用 `jarvis upgrade`/`jarvis add` 和 Web 面板时发现多项 Bug，经代码探索已定位全部根因。

---

## 需求列表

### REQ-001：统一 Web 面板侧边栏导航

**根因**：`pipeline.html` 侧边栏有 3 项（看板/归档/智能体），`agents.html` 侧边栏只有 2 项（看板/智能体），缺少"归档记录"链接。两个页面使用不同 HTML 文件，侧边栏 DOM 完全独立。

**修复**：
- `agents.html` 侧边栏补充"归档记录"链接（`href="/dashboard#/archive"`）
- 可选：将侧边栏抽取为共享片段（服务端注入），避免后续不同步
- 可选：在 `server.ts` 添加 `/archive` 路由重定向到 `/dashboard#/archive`

**验收标准**：
- 在任意页面（看板/智能体配置）侧边栏均能看到"归档记录"链接
- 点击"归档记录"链接能正确跳转到归档面板

### REQ-002：构建脚本复制模板目录到 dist

**根因**：`tsc` 只编译 `.ts` 文件，不复制 `.md`/`.json`/`.toml` 等非 TS 文件。`package.json` 的 `build` 脚本只手动复制了 `src/web/views`，遗漏了 `src/templates`。

**修复**：
- `build` 脚本增加 `cpSync('src/templates', 'dist/src/templates', {recursive: true})`
- `package.json` 的 `files` 字段无需修改（`dist/` 已包含）

**验收标准**：
- `npm run build` 后 `dist/src/templates/` 目录存在
- `dist/src/templates/platforms/claude/agents/` 下有 `.md` 文件
- `dist/src/templates/mcp-claude.json` 等 MCP 模板文件存在

### REQ-003：修复 install.ts 模板路径适配编译后

**根因**：`install.ts` 有两种路径解析方式：
- 路径 A（MCP 模板）：`resolve(__dirname, 'templates')` → 编译后为 `dist/src/templates`
- 路径 B（平台模板）：`resolve(pkgRoot, 'src', 'templates', 'platforms', platform)` → 直接读 `src/`

路径 B 在 npm 全局安装后必然失败（`src/` 不在发布范围内）。

**修复**：
- 路径 B 改为从 `dist/` 读取：`resolve(pkgRoot, 'dist', 'src', 'templates', 'platforms', platform)`
- `cli.ts` 中 `diffPlatform` 函数同步修改

**验收标准**：
- npm 全局安装后 `jarvis upgrade` 不报 "Source not found" 错误
- `jarvis diff` 正常工作
- 本地 dev 环境（`tsx` 运行）仍然正常工作

### REQ-004：修复 agent-registry.ts 模板路径适配编译后

**根因**：`TEMPLATES_DIR = resolve(__dirname, '..', 'templates', 'platforms')`，编译后 `__dirname` 指向 `dist/src/engine/`，拼接得到 `dist/src/templates/platforms`。在 REQ-002 修复构建后，此路径将有效。但当前（无 dist/src/templates）返回空数组导致智能体配置页面无数据。

**修复**：
- REQ-002 解决后此问题自动修复
- 额外加固：`getAgentList` 增加 fallback 逻辑——`dist/src/templates` 不存在时尝试从项目源码目录读取

**验收标准**：
- Web 面板 `/agents` 页面能显示智能体列表
- 三个平台（Claude/OpenCode/Codex）切换均显示对应列表
- 智能体列表非空（至少 40+ per 平台）

### REQ-005：统一 jarvis init/add/remove 无参数行为

**根因**：`jarvis init` 无平台参数时默认安装全部平台，但 `jarvis add` 无参数时直接报错 `No valid platform specified`。行为不一致。

**修复**：
- `jarvis add` 无平台参数时，默认安装全部平台（与 `init` 行为一致）
- `jarvis remove` 同样处理

**验收标准**：
- `jarvis add` 不带参数 → 弹出交互确认后安装全部平台
- 报错信息保留但仅在非法平台名时触发

### REQ-006：MD 文档抽屉渲染为 HTML 预览

**根因**：`pipeline.html` 中"文档预览"抽屉使用 `marked.parse(md)` + `innerHTML` 赋值，但安全审查发现可能未正确触发渲染。需确认 `marked` CDN 是否正确加载且 `innerHTML` 赋值是否正确执行。

**修复**：
- 检查 `marked` 库 CDN 引入（`pipeline.html` `<script src="marked CDN">`）
- 确保 `openDocDrawer` 函数正确调用 `marked.parse()` 并赋值 `innerHTML`
- 如 `marked` 未加载，增加 CDN fallback 或使用 `fetch` 加载后手动解析

**验收标准**：
- 打开文档抽屉后，Markdown 内容渲染为格式化 HTML（标题/列表/代码块）
- 不是纯文本源码

### REQ-007：全局/项目级智能体配置分类读取

**背景**：当前智能体配置仅从 `src/templates/` 读取（模板），未考虑全局用户配置和项目级配置的合并。用户需要：
- 全局智能体配置（`~/.jarvis/agents/` 或 `~/.claude/agents/`）
- 项目级智能体配置（`<project>/.claude/agents/`）
- 两者合并展示，项目级覆盖全局级

**修复**：
- `agent-registry.ts` 增加全局配置目录扫描
- 增加项目级配置目录扫描（通过 `projectRoot` 参数传入）
- 合并策略：项目级 > 全局级 > 模板默认

**验收标准**：
- Web 面板智能体列表包含全局 + 项目级智能体
- 项目级配置覆盖全局级同名智能体

### REQ-008：抑制 SQLite ExperimentalWarning

**根因**：Node.js 的 `node:sqlite` 是实验性 API，运行时自动打印警告。

**修复**：
- 检查是否使用了 `node:sqlite` 还是 `better-sqlite3`
- 如果是 `node:sqlite`：在入口文件添加 `--no-warnings` flag 或使用 `process.removeAllListeners('warning')` 过滤
- 如果已使用 `better-sqlite3`：检查是否有地方错误引入了 `node:sqlite`

**验收标准**：
- 执行 `jarvis upgrade` 不出现 `ExperimentalWarning: SQLite` 警告
- 执行 `jarvis add` 不出现该警告

### REQ-009：智能体模板增加 .{platform}/rules/* 规则读取

**背景**：当前智能体加载了 `AGENTS.md`、`CLAUDE.md` 和 `.claude/rules/*.md` 规则，但缺少平台级规则目录 `.{platform}/rules/*` 的读取逻辑。用户希望智能体自动遵守这些规则。

**修复**：
- 在智能体模板中增加说明：Agent 启动时需读取 `.{platform}/rules/*.md`
- 模板文件的 system prompt 或 instructions 部分添加规则读取指令

**验收标准**：
- 模板文件中包含 `.{platform}/rules/*` 目录的读取指引
- 新创建的智能体配置自动包含规则读取逻辑

---

## 涉及文件

| 文件 | 变更类型 | 关联需求 |
|------|---------|----------|
| `package.json` (build 脚本) | 修改 | REQ-002 |
| `src/web/views/agents.html` | 修改 | REQ-001 |
| `src/web/views/pipeline.html` | 修改 | REQ-006 |
| `src/engine/agent-registry.ts` | 修改 | REQ-004, REQ-007 |
| `src/install.ts` | 修改 | REQ-003 |
| `src/cli.ts` | 修改 | REQ-003, REQ-005, REQ-008 |
| `src/templates/` 下智能体模板 | 修改 | REQ-009 |

## 不变更范围

- 数据库 Schema
- MCP 工具接口
- 服务器路由结构（仅追加 `/archive` 重定向可选）
- Gate 流水线逻辑
