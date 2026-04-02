# 通用编码规范

所有代理必须遵循以下规范。Codex 自动加载此文件。

项目专属配置（架构、脚本、运行时）见根目录 `AGENTS.md`。

## 环境

- 文档/注释/沟通语言：中文
- 终端：Windows PowerShell
- 操作系统：开发 Windows，生产 Linux

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

- 目标：同一套规则覆盖前端（browser）与后端（node/bun），按目录/包做差异化 override
- `@typescript-eslint` 用于类型规则
- `import` / `unused-imports` 用于导入排序和清理
- TS：必须启用 `strict=true`，禁止隐式 `any` — 使用 `unknown` 或泛型优先，`any` 仅告警或需说明
- 未使用的变量/导入：error（自动清理）
- `console` / `debugger`：生产环境 warn，开发环境允许
- 临时禁用：仅限本地，需添加原因注释（`eslint-disable-next-line`）

## Git 工作流

- 分支：`main`（受保护）→ `develop`（受保护）→ `feature/*`、`hotfix/*`、`release/*`、`docs/*`
- 命名：`feature/YYYYMMDD_xxx`、`hotfix/YYYYMMDD_xxx`、`release/vX.Y.Z`
- 合并：受保护分支；≥1 名核心审查者；合并前 rebase；CI 通过；线性历史

## 提交规范 (Conventional Commits)

格式：`<type>(scope): <subject>`
类型：`feat / fix / docs / style / refactor / test / chore / perf / ci`
工具：`commitlint` + husky `commit-msg`；`pre-commit` 运行 `lint-staged`（eslint --fix + prettier）

## 质量门禁 (Commit 前)

1. 嵌套层级 ≤ 4
2. 无循环依赖
3. 多分支判断：使用 Map/object 查找。严格相等 `===`。空值合并 `?.` 和 `??`
4. 异步：正确使用 Promise 并处理错误，善用 `Promise.all`/`allSettled`，避免无意义 `return await`
5. 数据库：无物理外键 — 仅 ORM 层逻辑关联（`createForeignKeyConstraints: false`）
6. Tailwind CSS：禁止 `@apply`，只能使用内联类名
7. 运行 `lint`、`typecheck`、`build`（若有）、`test`，全部通过
8. 核心业务规则在聚合根/领域服务，不泄露到应用层
9. 新增核心逻辑附带单元测试

## TypeScript：Type vs Interface

决策流程：
```
if (联合类型 | 元组 | 映射/条件类型 | 原始类型别名) → 使用 type
else if (声明合并 | implements) → 使用 interface
else → 使用 interface（对象形状默认）
```

**必须使用 `type`：** 联合类型、元组、工具类型、原始类型别名、函数类型

**必须使用 `interface`：** 声明合并、类契约（`implements`）

**默认 (`interface`)：** 纯对象形状、数据模型、extends 链

```typescript
// ✅ 推荐
interface User { id: string; name: string }
interface Admin extends User { permissions: string[] }

// ❌ 仅当 interface 无法表达时才用 type 定义对象
type UserType = { id: string; name: string }
```

### Zod 实践

- Zod 用于运行时校验，`z.infer<typeof schema>` 本质是 type alias
- `interface` 的声明合并、类实现契约能力 Zod 无法替代

| 场景 | 纯 TS | 用 Zod 后 |
|------|-------|----------|
| API 请求/响应体 | `interface` | 只写 Zod schema，`z.infer` 自动生成 |
| 复杂联合/元组 | `type` | 仍需 `type` |
| 全局类型扩展 | `interface` | 仍用 `interface` |
| 类契约 | `interface` | 仍用 `interface` |
| 工具类型 | `type` | 基于 `z.infer` 运算或纯 `type` |

> 外部数据结构（API/DB/表单）→ Zod schema；声明合并/类实现/TS 特有运算 → `interface`/`type` 规范

## 代码编写规范

- 注释：JSDoc/TSDoc，使用 `@param`、`@returns`、`@throws`，只写关键逻辑与边界条件
- 嵌套：推荐 1-3 层，最多 4 层。使用卫语句和函数提取
- 数组：仅使用不可变操作（`map`、`filter`、`reduce`、`toSpliced`、`toSorted`、`with`、扩展运算符）。禁止 `push`/`pop`/`shift`/`splice`/`sort`/`reverse`（空数组初始化除外）
- 模块：优先命名导出。使用别名路径（`@/`）。无循环依赖
- 设计原则：SOLID、DRY、KISS。3+ 分支 → Map/对象查找。始终使用 `===`。空值检查用 `??` 和 `?.`
- 箭头函数：禁止在对象/类方法中使用（`this` 绑定问题）

## DDD（领域驱动设计）

- **适用**：仅复杂业务逻辑（状态流转、多聚合交互）
- **战术模式**：聚合根（业务边界）、值对象（不可变）、领域服务（跨聚合）、领域事件（解耦）
- **禁止**：数据访问逻辑放入实体；应用层编写核心业务规则

## TDD（测试驱动开发）

- **流程**：红（失败测试）→ 绿（最快通过）→ 重构
- **要求**：新增核心业务逻辑必须先写单元测试；每个测试验证一个行为
- **例外**：UI 快照、集成测试不强制，但关键流程仍需 TDD

## 数据库

- 无物理外键约束。仅 ORM 层逻辑关联（`createForeignKeyConstraints: false`）
- 数据完整性通过应用层事务、业务规则、乐观锁保证
- 级联删除：在应用层显式处理，不依赖数据库隐式行为

## 研发流程与门禁

- 流程：需求→设计→开发→评审→测试→上线（每步有对应文档/记录）
- 质量门禁：ESLint 无 error、TS type-check 通过、测试覆盖≥80%（或约定阈值）、build 通过、依赖漏洞扫描通过

## CI/CD 流水线

流水线：`lint → type-check → unit → (integration/e2e) → build`
主分支：部署前进行预发布验证并准备回滚方案

## 沟通风格

- 友好表达（适当 Emoji）
- 错误 vs 正确对比示例
- 结构化响应：问题→方案→实践→注意
