# 项目编码规范

所有代理必须遵循以下规范。Codex 会自动加载此文件。

## 环境

- 文档/注释/沟通语言：中文
- 终端：Windows PowerShell
- 操作系统：**开发运行环境** :Windows , **Linux** :生产运行环境

## 代码风格 (Prettier)

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "trailingComma": "es5",
  "endOfLine": "lf",
  "arrowParens": "avoid"
}
```

- 使用 `eslint-config-prettier` 避免冲突
- 编辑器：保存时格式化。Husky：`pre-commit` 触发格式化

## 代码质量 (ESLint + TypeScript)

- `@typescript-eslint` 用于类型规则
- `import` / `unused-imports` 用于导入排序和清理
- TS：必须启用 `strict=true`，禁止隐式 `any` — 使用 `unknown` 或泛型
- 未使用的变量/导入：报错
- `console` / `debugger`：生产环境警告，开发环境允许
- 临时禁用：仅限本地，需添加原因注释

## Git 工作流

- 分支：`main`（受保护）→ `develop`（受保护）→ `feature/*`、`hotfix/*`、`release/*`、`docs/*`
- 命名：`feature/YYYYMMDD_xxx`、`hotfix/YYYYMMDD_xxx`、`release/vX.Y.Z`
- 合并：受保护分支；≥1 名核心审查者；合并前 rebase；CI 通过；线性历史

## 提交规范 (Conventional Commits)

格式：`<type>(scope): <subject>`
类型：`feat / fix / docs / style / refactor / test / chore / perf / ci`
工具：`commitlint` + husky `commit-msg`；`pre-commit` 运行 `lint-staged`

## 质量门禁 (Commit 前)

1. 嵌套层级 ≤ 4
2. 无循环依赖
3. 多分支判断：使用 Map/object 查找。严格相等 `===`。空值合并 `?.` 和 `??`
4. 异步：正确使用 Promise 并处理错误
5. 数据库：无物理外键 — 仅 ORM 层逻辑关联

## TypeScript：Type vs Interface

决策流程：
```
if (联合类型 | 元组 | 映射/条件类型 | 原始类型别名) → 使用 type
else if (声明合并 | implements) → 使用 interface
else → 使用 interface（对象形状默认）
```

**必须使用 `type`：** 联合类型 (`type Status = 'a' | 'b'`)、元组 (`type Point = [number, number]`)、工具类型、原始类型别名、函数类型

**必须使用 `interface`：** 声明合并 (`interface Window { ... }`)、类契约 (`implements`)

**默认 (`interface`)：** 纯对象形状、数据模型、extends 链

```typescript
// ✅ 推荐
interface User { id: string; name: string }
interface Admin extends User { permissions: string[] }

// ❌ 仅当 interface 无法表达时才用 type 定义对象
type UserType = { id: string; name: string }
```

## 代码规范

- 注释：JSDoc/TSDoc，使用 `@param`、`@returns`、`@throws`，避免冗余
- 嵌套：推荐 1-3 层，最多 4 层。使用卫语句和函数提取
- 数组：仅使用不可变操作 (`map`、`filter`、`reduce`、ES2023 `toSpliced`/`toSorted`)。禁止 `push`/`pop`/`splice`/`sort`/`reverse`（空数组初始化除外）
- 模块：优先命名导出。使用别名路径 (`@/services`)。无循环依赖。避免深层相对路径
- 设计：SOLID、DRY、KISS。3+ 分支 → 对象查找。始终使用 `===`。空值检查用 `??` 和 `?.`
- 箭头函数：禁止在对象/类方法中使用（`this` 绑定问题）
- Promise：使用 `Promise.all`/`allSettled`。避免无意义的 `return await`
- Tailwind CSS：必须使用内联类名，禁止将样式提取到自定义 CSS 类或单独样式文件

## 数据库

- 无物理外键约束。仅 ORM 层逻辑关联 (`createForeignKeyConstraints: false`)
- 数据完整性通过应用层事务、业务规则、乐观锁保证
- 级联删除：在应用层显式处理，不依赖数据库隐式行为
- 定期进行逻辑外键引用的数据一致性检查

## CI/CD 流水线

流水线：`lint → type-check → unit → (integration/e2e) → build`
主分支：部署前进行预发布验证并准备回滚方案
