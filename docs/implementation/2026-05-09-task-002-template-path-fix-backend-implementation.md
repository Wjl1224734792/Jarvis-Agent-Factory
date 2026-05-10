# TASK-002：修复 install.ts / diffPlatform 模板路径

## 1. 当前实现目标

将 `install.ts` 和 `cli.ts` 中从 `src/` 读取模板的路径改为从 `dist/src/` 读取，确保 npm 全局安装后 `jarvis upgrade` 和 `jarvis diff` 正常工作。

## 2. 对应需求 ID / 任务 ID

- **任务 ID**：TASK-002

## 3. 输入依据

- TASK-002 任务描述（编排者分配）
- npm 包 `files` 字段不含 `src/`，构建后模板复制到 `dist/src/templates/`

## 4. 变更文件 / 变更范围

| 文件 | 行号 | 变更内容 |
|------|------|---------|
| `src/install.ts` | 第 40 行 | `'src'` → `'dist/src'` |
| `src/cli.ts` | 第 298 行 | `'src'` → `'dist/src'` |

### 不修改的范围

- `install.ts` 第 10 行 `TEMPLATES_DIR`（编译后 `__dirname` 指向 `dist/src/`，自动正确）
- 其他所有文件

## 5. 实现说明

**根因**：`install.ts` 第 40 行和 `cli.ts` 第 298 行均使用 `resolve(pkgRoot, 'src', 'templates', 'platforms', platform)` 读取模板。但 npm 包的 `files` 字段不包含 `src/` 目录，只有 `dist/`。`build` 脚本通过 `tsc` 编译后执行 `cpSync('src/templates', 'dist/src/templates', ...)` 将模板复制到 `dist/src/templates/`。因此运行时模板路径应为 `dist/src/templates/platforms/<platform>`。

**修复**：将两处 `'src'` 替换为 `'dist/src'`，使模板路径与构建产物位置一致。

**影响范围**：
- `install()` 函数（`src/install.ts`）：影响 `install`、`upgrade`、`add` 命令
- `diffPlatform()` 函数（`src/cli.ts`）：影响 `diff` 命令

## 6. 测试和验证结果

| 验证项 | 结果 | 说明 |
|--------|------|------|
| TypeScript 类型检查 (`tsc --noEmit`) | 通过 | 零错误 |
| ESLint (`src/install.ts src/cli.ts`) | 通过 | 零错误 |
| 构建 (`npm run build`) | 通过 | 编译 + 模板复制成功 |
| 编译产物路径验证 | 通过 | `dist/src/cli.js:307` 和 `dist/src/install.js:35` 均使用 `'dist/src'` |
| 模板目录存在性 | 通过 | `dist/src/templates/platforms/{claude,codex,opencode}` 均存在 |

### 关于 `npx tsx src/cli.ts diff` 的说明

通过 `tsx` 直接运行源码时，`PKG_ROOT` 计算使用 `resolve(__dirname, '..', '..')`。源码中 `__dirname` 是 `src/`，`.., ..` 会跳转到项目父目录而非根目录，导致 `package.json` 读取失败。这是**预存问题**，编译后运行正常（`node dist/src/cli.js diff` 路径解析正确）。修复的两个路径变更不影响该预存问题。

## 7. 数据与接口边界

- 无 API 变更
- 无数据库变更
- 无共享契约变更

## 8. 风险 / 未解决项

- **预存问题**：`PKG_ROOT` 在源码执行模式下（`tsx`）解析错误，不在本次任务范围
- 无其他已知风险

## 9. 需要前端配合的点

无（纯后端路径修复）

## 10. 推荐的下一步

- 发布 npm 包后在真实环境中验证 `jarvis upgrade` 和 `jarvis diff` 命令
- 如需修复 `PKG_ROOT` 源码执行路径问题，可单独提交任务
