# Web 端 RichTextEditor 子路径导出修复

## 1. 当前实现目标

修复 `apps/web/tests/rich-text-editor-helpers.test.ts` 在引用 `@feijia/rich-text-editor` 时因 wangeditor CJS 副作用导致测试崩溃 (`TypeError: Cannot set property navigator`) 的问题，同时保持 TypeScript typecheck 通过。

对应任务: TASK-005 (Web 端文章发布页适配共享 RichTextEditor 组件)

## 2. 对应需求 ID / 任务 ID

- TASK-005: 适配 Web 端 publish-article-page 使用 @feijia/rich-text-editor 共享组件

## 3. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `packages/rich-text-editor/package.json` | 新增 (untracked 包内修改) | 添加 `"./helpers"` 子路径导出 |
| `apps/web/src/components/rich-text-editor-helpers.ts` | 修改 | 导入路径从 `@feijia/rich-text-editor` 改为 `@feijia/rich-text-editor/helpers` |

**未修改的文件:**
- `apps/web/tests/rich-text-editor-helpers.test.ts` — 无需修改，仅依赖导入路径解析
- `apps/web/vitest.config.ts` — 无需额外配置
- 其他 `apps/web/` 和 `apps/admin/` 文件

## 4. 问题分析

### 4.1 根因

`packages/rich-text-editor/src/index.ts` (包入口) 同时导出了 helpers 和 rich-text-editor 组件:

```typescript
export { ... } from "./rich-text-editor-helpers";   // 纯函数, 无副作用
export { RichTextEditor } from "./rich-text-editor"; // 导入 @wangeditor/editor
```

当测试文件通过 `apps/web/src/components/rich-text-editor-helpers.ts` 导入 `@feijia/rich-text-editor` 时，整个包入口被加载，触发了 wangeditor 的 CJS 副作用 (`globalThis.navigator` 赋值)，在 vitest 的 DOM 模拟环境中因 `navigator` 是只读 getter 而崩溃。

### 4.2 三种方案的对比

| 方案 | 测试 | Typecheck | 维护性 |
|------|------|-----------|--------|
| A: `vi.mock("@wangeditor/editor")` 在测试文件 | 失败 (CJS 副作用先于 hoisted mock) | N/A | 差 |
| B: 相对路径导入 `../../packages/.../rich-text-editor-helpers` | 通过 | TS6307 (composite 项目文件未在 include) | 差 |
| **C: 子路径导出 `@feijia/rich-text-editor/helpers`** | **通过** | **通过** | **优** |

### 4.3 选择的方案

方案 C: 在 `packages/rich-text-editor/package.json` 的 `exports` 字段添加 `"./helpers"` 子路径导出，指向 `./src/rich-text-editor-helpers.ts`。这样导入 `@feijia/rich-text-editor/helpers` 时只加载 helpers 模块，不加载富文本编辑器组件，避免了 wangeditor 副作用。

依赖:
- TypeScript 的 `moduleResolution: "Bundler"` (已在 tsconfig.base.json 配置) 支持 package.json exports 子路径解析
- vitest 的 Vite-based 模块解析同样支持子路径

## 5. 测试和验证结果

### 5.1 单元测试

```bash
$ npx vitest run apps/web/tests/rich-text-editor-helpers.test.ts
# 1 file passed, 8 tests passed ✓
```

### 5.2 TypeScript 类型检查

```bash
$ cd apps/web && bun run typecheck
# 无输出 (通过) ✓
```

### 5.3 全量 Web 测试

```bash
$ npx vitest run apps/web
# 47 files passed, 181 tests passed ✓
```

### 5.4 全量项目测试

仅 `apps/server/` (数据库连接) 和 `packages/schemas/`/`packages/http-client/` 中存在预先存在的失败，与本次变更无关。

## 6. 验证清单

- [x] `apps/web/tests/rich-text-editor-helpers.test.ts` 通过 (8 tests)
- [x] `apps/web` typecheck 通过
- [x] `apps/web` 全量测试通过 (47 files, 181 tests)
- [x] git diff 显示仅修改了预期文件
- [x] 无 wangeditor 相关测试错误
- [x] 无 TS6307 错误

## 7. 风险 / 未解决项

- **无已知风险**: 子路径导出是纯加法变更，不改变现有 `"."` 导出行为
- 其他测试失败 (`apps/server/`, `packages/schemas/`, `packages/http-client/`) 为预先存在的数据库连接/环境问题，与本变更无关

## 8. 推荐的下一步

1. 确认 `apps/admin` 的测试兼容性 (admin 使用内联 helper 副本的方式有不同的维护成本)
2. 如日后迁移到 vitest 以 ESM-only 方式运行，可考虑移除 subpath export 直接使用 `@feijia/rich-text-editor` 主入口
