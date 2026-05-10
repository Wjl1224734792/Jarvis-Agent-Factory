# 需求文档 — 第三轮修正与增强

> 日期：2026-05-11 | 状态：confirmed

---

## REQ-032：纠正 docs-engineer 智能体职责

**问题**：当前 `docs-engineer.md` 模板定义的输出路径为 `docs/<YYYY>-<MM>-<DD>/shipping/docs-sync-report.md`，即向流水线产物目录写入报告。但该智能体的真正职责是维护项目级同步文档（AGENTS.md、README.md、CLAUDE.md），而非流水线生成的驱动文档。

**要求**：
- 移除模板中对 `docs/<YYYY>-<MM>-<DD>/shipping/` 路径的所有引用
- 职责明确限定为：检查并同步 AGENTS.md、README.md、CLAUDE.md 与最新代码变更
- 输出改为直接在仓库根目录修改上述文档（就地修复不一致）
- 产出可选的同步报告写到 `.jarvis/docs-sync-report.md`（项目级临时目录）

---

## REQ-033：Web UI 移除所有硬编码颜色，回归 antd 默认风格

**问题**：ConfigProvider 已配置蓝色主色 (`#1677ff`) 和标准 token，但所有页面/组件中存在大量硬编码内联颜色（`#52C41A` 绿、`#FFF9F0` 暖黄、`#2C2C2C` 粗黑），直接绕过了 antd 主题系统，导致页面呈现"浅黄色奶油风格"而非 antd 默认蓝白风格。

**涉及文件和颜色分布**：

| 文件 | 硬编码颜色 | 用途 |
|------|-----------|------|
| `web/src/theme.tsx` | 无硬编码（已正确） | ConfigProvider token |
| `web/src/components/Layout.tsx` | `#52C41A` × 7, `#FFF9F0` × 3, `#2C2C2C` × 20+, `#E8F5E9`, `#FFD93D`, `#FA5252` | 布局/会话列表/导航 |
| `web/src/pages/Dashboard.tsx` | `#52C41A` × 15+, `#FFF9F0` × 3, `#2C2C2C` × 15+, `#51CF66`, `#FA5252` | 看板/Gate 进度/统计卡片 |
| `web/src/pages/Agents.tsx` | `#52C41A` × 8, `#FFF9F0` × 3, `#2C2C2C` × 15+, `#FA5252`, `#51CF66` | 智能体卡片/筛选/编辑弹窗 |
| `web/src/pages/Archive.tsx` | `#52C41A` × 4, `#FFF9F0` × 1, `#2C2C2C` × 8+, `#FA5252`, `#51CF66` | 归档列表/操作按钮 |

**要求**：
- 移除所有内联 style 中的硬编码颜色值
- 保留语义化颜色（如 `#FA5252` 用于 danger/error, `#52C41A` 用于 success）——但改用 antd token 引用或语义化 antd 组件属性（`type="primary"`, `danger`, 等）
- 背景色统一使用 `transparent` 或 antd token
- 边框色统一使用 antd token（`colorBorderSecondary` 等）
- 文字颜色使用 `colorText` / `colorTextSecondary` 等 antd token
- Dashboard.tsx 中的 GATE_COLORS、MARKDOWN_CSS 等色彩常量改为语义化类名或无颜色定义
- 最终视觉效果应为 antd 默认蓝白风格（主色 `#1677ff`，背景白，文字黑灰）

---

## REQ-034：修复 GitHub Release 自动创建 & README 版本同步

**问题 A**：推送 tag 后 GitHub Release 未更新。经检查 `release.yml` 已有 `gh release create` 逻辑，但可能因权限、tag 格式或 `npm ci` 在 release job 中缺少 web deps 而失败。

**要求**：
- release workflow 中 `release` job 的 `npm ci` 需要同时安装 web 依赖（`cd web && npm install`）以确保 `build:web` 成功
- 确认 `permissions: contents: write` 正确授权 gh release 操作
- release workflow 增加分支检查：仅当 tag 指向 main 分支时才触发

**问题 B**：README.md 中的版本徽章显示 `v3.27.1`，但 `package.json` 已是 `3.35.0`。版本号未同步更新。

**要求**：
- README.md 中的版本号应反映 `package.json` 的 `version` 字段
- 在 release workflow 中增加步骤：自动更新 README 版本徽章为最新 tag 版本

---

## REQ-035：CI/CD 仅 main 分支触发

**问题**：release workflow 在任意分支推送 tag 都触发，可能发布非 main 分支代码。

**要求**：
- CI workflow：保持 `branches: [main]`（已满足）
- Release workflow：增加分支过滤，仅当 tag 对应的 commit 在 main 分支上时触发
- 或改用 `if: github.ref == 'refs/heads/main'` 条件（对 tag push 需特殊处理）

---

## REQ-036：临时文件目录重构

**问题**：使用贾维斯引擎产生的临时文件散落在项目根目录：
- `agents-filter-buttons.yml`
- `agents-mobile.txt`
- `drawer-open.txt`
- `sessions.json`
- `snapshot-home.txt`
- `.claude/.jarvis/`

这些文件不应污染项目根目录。

**要求**：
- 全局级别文件 → `~/.jarvis/`（用户目录）
- 项目级别文件 → `.jarvis/`（项目根目录，已在 .gitignore 中忽略）
- 检查引擎代码中产生这些临时文件的位置，修改输出路径：
  - `sessions.json` → `.jarvis/sessions.json`（项目级）或 `~/.jarvis/sessions.json`（全局级）
  - 截图/文本快照 → `.jarvis/` 或临时目录
- `.gitignore` 确认 `.jarvis/` 已被忽略（已满足）
- 如 `.claude/.jarvis/` 是引擎产生的，改为统一写到 `.jarvis/`

---

## REQ-037：添加 /dashboard 路由

**问题**：当前路由表中 Dashboard 组件映射到 `/`，没有 `/dashboard` 路由。README 文档中写的是 `http://localhost:3457/dashboard`。

**要求**：
- 在 `App.tsx` 的 Routes 中增加 `<Route path="/dashboard" element={<Dashboard />} />`
- 保持 `/` 也映射到 Dashboard（向后兼容）
- README 和所有文档中的 URL 引用保持 `/dashboard`

---

## REQ-038：dev/main 分支策略

**问题**：当前所有开发都在 main 分支，缺乏开发和稳定版本的隔离。用户需要 dev 分支用于日常开发，main 保持稳定可发布状态。

**要求**：
- 本轮完成后从 main 创建 `dev` 分支
- 本地切换到 dev 分支
- 推送到远程（GitHub + Gitee）
- 后续开发在 dev 分支上进行
- 仅在用户明确请求（`/PR` 或明确说"合并到 main"）时才合并到 main
- CI/CD：main 分支触发发布；dev 分支只触发 CI 检查（lint + typecheck + test），不发布

---

## 优先级排序

| 优先级 | REQ | 理由 |
|--------|-----|------|
| P0 | REQ-033 | 用户最不满意的视觉问题，影响所有使用者 |
| P0 | REQ-032 | docs-engineer 职责错误，误导 Agent 行为 |
| P1 | REQ-037 | 路由缺失，影响导航 |
| P1 | REQ-036 | 临时文件污染根目录 |
| P1 | REQ-034 | Release 不更新影响分发 |
| P1 | REQ-035 | CI/CD 安全性 |
| P2 | REQ-038 | 分支策略（本轮最后执行） |
