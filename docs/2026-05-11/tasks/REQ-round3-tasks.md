# 任务分解 — 第三轮修正与增强

> 日期：2026-05-11 | 需求文档：[REQ-round3.md](../requirements/REQ-round3.md)

---

## 1. 需求盘点

| REQ | 说明 | 优先级 |
|-----|------|--------|
| REQ-032 | 纠正 docs-engineer 智能体职责 | P0 |
| REQ-033 | Web UI 移除所有硬编码颜色，回归 antd 默认风格 | P0 |
| REQ-034 | 修复 GitHub Release 自动创建 & README 版本同步 | P1 |
| REQ-035 | CI/CD 仅 main 分支触发 | P1 |
| REQ-036 | 临时文件目录重构 | P1 |
| REQ-037 | 添加 /dashboard 路由 | P1 |
| REQ-038 | dev/main 分支策略 | P2（本轮最后执行） |

---

## 2. 任务概览

| TASK | 关联 REQ | 名称 | 类型 | 优先级 | 规模 | Batch |
|------|---------|------|------|--------|------|-------|
| TASK-001 | REQ-032 | 修复 docs-engineer 模板职责 | 直接开发 | P0 | S | 1 |
| TASK-002 | REQ-033 | Layout.tsx 移除硬编码颜色 | 直接开发 | P0 | M | 1 |
| TASK-003 | REQ-033 | Dashboard.tsx 移除硬编码颜色 | 直接开发 | P0 | M | 1 |
| TASK-004 | REQ-033 | Agents.tsx 移除硬编码颜色 | 直接开发 | P0 | M | 1 |
| TASK-005 | REQ-033 | Archive.tsx + App.tsx 移除硬编码颜色 | 直接开发 | P0 | S | 1 |
| TASK-006 | REQ-037 | 添加 /dashboard 路由 | 直接开发 | P1 | XS | 1 |
| TASK-007 | REQ-034, REQ-035 | 修复 Release 工作流 + CI/CD 分支 + README 版本同步 | TDD | P1 | M | 1 |
| TASK-008 | REQ-036 | 临时文件目录清理 | 直接开发 | P1 | S | 1 |
| TASK-009 | REQ-038 | dev/main 分支策略 | 直接开发 | P2 | XS | 2 |

> **总预估变更：约 300-350 行（不含临时文件删除），单轮次，无需拆分多轮。**

---

## 3. 任务分解

### Batch 1 — 全部并行（无共享文件冲突）

---

### TASK-001
- **任务名称**: 修复 docs-engineer 模板职责
- **关联需求**: REQ-032
- **类型**: 直接开发
- **优先级**: P0
- **预估变更行数**: ~25 行
- **测试策略**: manual_only（模板文档变更，无需自动化测试）
- **依赖**: 无
- **被依赖**: 无
- **并行组**: Batch 1（与所有 TASK-002 至 TASK-008 无共享文件）
- **风险等级**: 低
- **涉及文件**:
  - `src/templates/platforms/claude/agents/docs-engineer.md`（唯一修改文件）
- **完成标准**:
  1. 模板中不再引用 `docs/<YYYY>-<MM>-<DD>/shipping/` 路径
  2. "输出文件" 路径改为 `.jarvis/docs-sync-report.md`
  3. 职责描述明确为：检查并同步 AGENTS.md、README.md、CLAUDE.md 与最新代码变更
  4. 输出改为直接在仓库根目录修改上述文档（就地修复不一致），可选同步报告写 `.jarvis/`

---

### TASK-002
- **任务名称**: Layout.tsx 移除硬编码颜色
- **关联需求**: REQ-033
- **类型**: 直接开发
- **优先级**: P0
- **预估变更行数**: ~70 行
- **测试策略**: test_after（修改后视觉验证 + `npm run typecheck`）
- **依赖**: 无
- **被依赖**: 无
- **并行组**: Batch 1（与 TASK-003/004/005 各自处理不同文件，无冲突）
- **风险等级**: 低
- **涉及文件**:
  - `web/src/components/Layout.tsx`（唯一修改文件）
- **完成标准**:
  1. 移除所有内联 style 中的硬编码颜色值（`#52C41A`、`#FFF9F0`、`#2C2C2C`、`#E8F5E9`、`#FFD93D`、`#FA5252`、`#CBC4AF`）
  2. 语义化颜色改用 antd token（通过 `useToken()` 获取 `token.colorSuccess`、`token.colorError`、`token.colorText` 等）
  3. 背景色统一使用 `transparent` 或 `token.colorBgContainer`
  4. `PLATFORM_INFO`、`CMD_LABELS` 中的颜色常量使用 antd token 语义色
  5. `npm run typecheck` 通过
  6. 视觉效果回归 antd 蓝白默认风格（主色 `#1677ff`）

---

### TASK-003
- **任务名称**: Dashboard.tsx 移除硬编码颜色
- **关联需求**: REQ-033
- **类型**: 直接开发
- **优先级**: P0
- **预估变更行数**: ~90 行
- **测试策略**: test_after（修改后视觉验证 + `npm run typecheck`）
- **依赖**: 无
- **被依赖**: 无
- **并行组**: Batch 1（与 TASK-002/004/005 各自处理不同文件，无冲突）
- **风险等级**: 中（L 级粒度，Dashboard.tsx 行数最多、颜色实例最多）
- **风险描述**: Dashboard.tsx 共 ~474 行，含 15+ 处 `#52C41A`、15+ 处 `#2C2C2C`、GATE_COLORS 常量表、MARKDOWN_CSS 内联样式块，变更面最大。需谨慎处理语义色映射，避免功能色（如进度条绿/红）错位。
- **涉及文件**:
  - `web/src/pages/Dashboard.tsx`（唯一修改文件）
- **完成标准**:
  1. 移除所有内联 style 中的硬编码颜色值
  2. `GATE_COLORS` 常量表改为使用 antd token 语义色（`token.colorSuccess`、`token.colorError`、`token.colorText`），或直接通过组件属性传递（`color` prop 等）
  3. `MARKDOWN_CSS` 内联样式块中的硬编码颜色替换为 antd token 引用
  4. `RUN_STATUS` 颜色常量使用 antd token
  5. `Statistic` 组件的 `styles.content.color` 移除硬编码 `#52C41A`
  6. `LoadingOutlined` 的 `style={{ color: '#52C41A' }}` 改用 token 引用
  7. `npm run typecheck` 通过
  8. 视觉效果回归 antd 蓝白默认风格

---

### TASK-004
- **任务名称**: Agents.tsx 移除硬编码颜色
- **关联需求**: REQ-033
- **类型**: 直接开发
- **优先级**: P0
- **预估变更行数**: ~60 行
- **测试策略**: test_after（修改后视觉验证 + `npm run typecheck`）
- **依赖**: 无
- **被依赖**: 无
- **并行组**: Batch 1（与 TASK-002/003/005 各自处理不同文件，无冲突）
- **风险等级**: 低
- **涉及文件**:
  - `web/src/pages/Agents.tsx`（唯一修改文件）
- **完成标准**:
  1. 移除所有内联 style 中的硬编码颜色值
  2. `PLATFORM_INFO` 颜色常量使用 antd token 语义色
  3. `PixelAvatar` 组件中的硬编码颜色（`#52C41A`、`#51CF66`、`#FA5252`、`#2C2C2C`）替换为 antd token
  4. `PixelAvatar` 背景色 `#FFF9F0` 改为 `token.colorBgContainer`
  5. `npm run typecheck` 通过

---

### TASK-005
- **任务名称**: Archive.tsx 移除硬编码颜色
- **关联需求**: REQ-033
- **类型**: 直接开发
- **优先级**: P0
- **预估变更行数**: ~35 行
- **测试策略**: test_after（修改后视觉验证 + `npm run typecheck`）
- **依赖**: 无
- **被依赖**: 无
- **并行组**: Batch 1（与 TASK-002/003/004 各自处理不同文件，无冲突）
- **风险等级**: 低
- **涉及文件**:
  - `web/src/pages/Archive.tsx`（唯一修改文件）
- **完成标准**:
  1. 移除所有内联 style 中的硬编码颜色值
  2. `CMD_LABELS`、`STATUS_LABELS` 颜色常量使用 antd token 语义色
  3. `npm run typecheck` 通过

---

### TASK-006
- **任务名称**: 添加 /dashboard 路由
- **关联需求**: REQ-037
- **类型**: 直接开发
- **优先级**: P1
- **预估变更行数**: ~5 行
- **测试策略**: manual_only（路由变更，启动 `npm run dev:web` 确认 `/dashboard` 可访问）
- **依赖**: 无
- **被依赖**: 无
- **并行组**: Batch 1（App.tsx 不与 TASK-002/003/004/005 的文件重叠——Layout.tsx 是独立组件，Dashboard 是页面组件，App.tsx 是路由入口）
- **风险等级**: 低
- **涉及文件**:
  - `web/src/App.tsx`（唯一修改文件）
- **完成标准**:
  1. `App.tsx` 的 `<Routes>` 中新增 `<Route path="/dashboard" element={<Dashboard />} />`
  2. 保持 `/` 也映射到 Dashboard（向后兼容）
  3. 访问 `http://localhost:3457/dashboard` 正常显示流水线看板

---

### TASK-007
- **任务名称**: 修复 Release 工作流 + CI/CD 分支约束 + README 版本同步
- **关联需求**: REQ-034, REQ-035
- **类型**: TDD
- **优先级**: P1
- **预估变更行数**: ~40 行
- **测试策略**: tdd（需编写 release workflow 验证逻辑说明 + 本地验证 README 版本号一致性）
- **依赖**: 无
- **被依赖**: 无
- **并行组**: Batch 1（release.yml 和 README.md 与其他任务无共享文件）
- **风险等级**: 中
- **风险描述**: CI/CD 工作流修改具有高风险——错误配置可能导致 Release 中断或错误发布。release.yml 修改需在本地通过 `act` 或手动审查确保语法正确；分支过滤逻辑需覆盖 tag push 场景。
- **涉及文件**:
  - `.github/workflows/release.yml`
  - `README.md`
- **完成标准**:
  1. release workflow 的 `release` job 中，`npm ci` 后增加 `cd web && npm install`，确保 `build:web` 有 web 依赖
  2. `permissions: contents: write` 已存在（当前已正确配置），确认无需修改
  3. release workflow 增加分支检查：仅当 tag 指向 main 分支时才触发 release job
     - 实现方式：在 `release` job 中添加 `if` 条件，检查 `github.ref_type == 'tag'` 且 tag 指向 main 分支
     - 或使用 `git branch --contains $GITHUB_SHA | grep -q 'main'` 校验
  4. README.md 的版本徽章从 `v3.27.1` 更新为当前 `package.json` 版本号 `3.35.0`
  5. release workflow 增加步骤：自动更新 README 版本徽章为最新 tag 版本（用 `sed` 替换版本号）
  6. CI workflow 已满足 `branches: [main]`，确认无需修改

---

### TASK-008
- **任务名称**: 临时文件目录清理
- **关联需求**: REQ-036
- **类型**: 直接开发
- **优先级**: P1
- **预估变更行数**: ~5 行（`.gitignore` 确认 + 文件删除脚本）
- **测试策略**: manual_only（删除后 `git status` 确认干净，`ls` 确认文件已移除）
- **依赖**: 无
- **被依赖**: 无
- **并行组**: Batch 1（仅涉及根目录临时文件删除 + `.gitignore` 确认，与其他任务无共享文件）
- **风险等级**: 低
- **风险描述**: `skills-lock.json` 和 `tsconfig.json` 是合法项目文件（在 `.npmignore` 中引用），不可删除。
- **涉及操作**:
  - 删除以下根目录临时文件：
    - `agents-filter-buttons.yml` — 浏览器测试产物
    - `agents-mobile.txt` — 浏览器快照
    - `drawer-open.txt` — 测试快照
    - `sessions.json` — 会话数据转储
    - `snapshot-home.txt` — 浏览器快照
  - 确认 `.gitignore` 已包含 `.jarvis/`（已满足，第 35 行）
  - 确认 `.claude/` 已在 `.gitignore` 中排除（已满足，第 26 行），`.claude/.jarvis/file-hashes.json` 不会被提交
- **完成标准**:
  1. 根目录的 5 个临时文件已删除（`agents-filter-buttons.yml`、`agents-mobile.txt`、`drawer-open.txt`、`sessions.json`、`snapshot-home.txt`）
  2. `git status` 显示仅删除操作，无其他意外变更
  3. `.gitignore` 确认 `.jarvis/` 已忽略（当前第 35 行，无需修改）
  4. `skills-lock.json` 保留（合法项目文件）

---

### Batch 2 — 串行（需 Batch 1 全部完成后执行）

---

### TASK-009
- **任务名称**: dev/main 分支策略
- **关联需求**: REQ-038
- **类型**: 直接开发
- **优先级**: P2
- **预估变更行数**: 0 行（纯 Git 操作）
- **测试策略**: manual_only（Git 分支检查 + 远程推送确认）
- **依赖**: TASK-001 至 TASK-008 全部完成
- **被依赖**: 无
- **风险等级**: 低
- **涉及操作**:
  - 从当前 main 分支创建 `dev` 分支：`git checkout -b dev`
  - 推送到 GitHub：`git push origin dev`
  - 推送到 Gitee：`git push gitee dev`
  - 本地切换到 dev：`git checkout dev`
- **完成标准**:
  1. `dev` 分支已从 main 创建
  2. `dev` 分支已推送到 GitHub（origin）和 Gitee（gitee）远程
  3. 本地当前分支为 `dev`
  4. `git branch -a` 确认 `dev` 分支存在于本地和远程
  5. 后续开发在 dev 分支，仅在用户明确指令时才合并到 main

---

## 4. DDD 分类

本轮无 DDD 任务。七个需求均为模板修正、样式清理、配置修复和 Git 操作，不涉及：
- 聚合根 / 值对象建模
- 状态机 / 状态转换
- 跨聚合业务一致性
- 领域服务 / 领域事件

---

## 5. TDD 与直接开发分类

### TDD

| TASK | 理由 |
|------|------|
| TASK-007 | CI/CD 工作流修改属于高风险配置变更。release.yml 的 branch check 逻辑必须在推送到 GitHub 前通过本地模拟验证（`act` 或手动审查）。README 版本号同步需验证替换逻辑正确。 |

### 直接开发

| TASK | 理由 |
|------|------|
| TASK-001 | 模板文档文字修改，无逻辑变更，验证方式为人工阅读 |
| TASK-002 | 样式清理，语义明确（硬编码 → antd token），`typecheck` 即验证 |
| TASK-003 | 同 TASK-002，Dashboard.tsx 实现面更大但本质仍是样式替换 |
| TASK-004 | 同 TASK-002 |
| TASK-005 | 同 TASK-002 |
| TASK-006 | 单行路由添加，无逻辑变更，浏览器访问即验证 |
| TASK-008 | 文件删除操作 + `.gitignore` 确认，`git status` 即验证 |
| TASK-009 | 纯 Git 分支操作，`git branch` 即验证 |

---

## 6. 风险任务

| TASK | 风险等级 | 风险描述 | 缓解措施 |
|------|---------|---------|---------|
| TASK-003 | 中 | Dashboard.tsx 变更面最大（~90 行），含 GATE_COLORS 常量表重构 + MARKDOWN_CSS 内联样式块改造。错误映射可能导致 Gate 进度条/卡片状态颜色语义错乱。 | 逐项替换、保留语义色映射表作为注释；`typecheck` + visual 双重验证 |
| TASK-007 | 中 | CI/CD 工作流修改直接关联生产发布通道。release.yml 的分支过滤逻辑错误可能导致 tag push 不触发 release，或允许非 main 分支发布。 | 在 `if` 条件中显式使用 `github.ref` 判断；提供 `act`/GitHub Actions UI 验证步骤说明；READMD 版本号同步需人工核实 |

---

## 7. 文件所有权与共享路径提醒

### 文件修改映射

| 文件 | 负责 TASK | 共享风险 |
|------|-----------|---------|
| `src/templates/platforms/claude/agents/docs-engineer.md` | TASK-001 | 独占 |
| `web/src/components/Layout.tsx` | TASK-002 | 独占 |
| `web/src/pages/Dashboard.tsx` | TASK-003 | 独占 |
| `web/src/pages/Agents.tsx` | TASK-004 | 独占 |
| `web/src/pages/Archive.tsx` | TASK-005 | 独占 |
| `web/src/App.tsx` | TASK-006 | 独占 |
| `.github/workflows/release.yml` | TASK-007 | 独占（REQ-034 + REQ-035 合并为一个任务） |
| `README.md` | TASK-007 | 独占 |
| 根目录临时文件（删除） | TASK-008 | 独占 |

> **本轮无共享文件冲突。所有 8 个 Batch 1 任务均可并行执行。**

### 共享区域说明

- **release.yml**：原本 REQ-034 和 REQ-035 都需要修改此文件，已合并为单一 TASK-007，避免两个并行任务在同一文件上产生冲突。
- **App.tsx Loading 颜色**：`App.tsx` 第 13 行有 `color: '#9CD3D3'` 硬编码颜色，已在 REQ-033 覆盖范围内。TASK-006 修改 `App.tsx` 时顺带替换此颜色（使用 antd token `colorText` 或 `colorPrimary`），避免另起任务造成同一文件双重修改。

---

## 8. 推荐交付顺序

```
第 1 步（并行 Batch 1）：TASK-001 → 008 同时执行
  │
  ├─ TASK-001  修复 docs-engineer 模板 (~5min)
  ├─ TASK-002  Layout.tsx 颜色清理 (~15min)
  ├─ TASK-003  Dashboard.tsx 颜色清理 (~20min，注意风险)
  ├─ TASK-004  Agents.tsx 颜色清理 (~15min)
  ├─ TASK-005  Archive.tsx 颜色清理 (~10min)
  ├─ TASK-006  添加 /dashboard 路由 (~3min)
  ├─ TASK-007  修复 Release 工作流 + README (~20min，TDD)
  └─ TASK-008  临时文件清理 (~5min)
  │
  ▼ 验证大门：全部 typecheck + build:web + 视觉检查
  │
第 2 步（串行 Batch 2）：依赖 Batch 1 全部完成
  │
  └─ TASK-009  dev/main 分支策略 (~2min)
```

### 验证检查点

Batch 1 全部完成后执行以下统一的验证步骤：

```bash
# 1. 类型检查
npm run typecheck

# 2. Web 构建
npm run build:web

# 3. 视觉验证（手动）
npm run dev:web  # 访问 http://localhost:3457 检查所有页面
# 确认：蓝白风格统一，无硬编码颜色残留

# 4. README 版本号
grep "version-v" README.md  # 应显示 v3.35.0

# 5. Git 状态
git status  # 应仅有预期的文件变更，无临时文件
```

---

## 9. 推荐的下一步

1. 将本任务文档交付给 **planner** 做执行规划
2. planner 将 8 个 Batch 1 任务分配给实现 Agent 并行执行
3. Batch 1 完成后通过统一验证大门
4. 最后执行 TASK-009（dev/main 分支策略）
5. 按发布流程打 tag 并推送
