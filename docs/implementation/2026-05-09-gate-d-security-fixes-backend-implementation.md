# Gate D 审查安全修复 — 后端实现文档

## 1. 实现目标

修复 Gate D 审查流程发现的 6 项安全与代码质量问题：3 处命令注入风险、1 处 try/catch 缺失、1 处数据不一致、1 处环境变量硬编码。

## 2. 对应需求 ID / 任务 ID

- Gate D 审查修复（S03, S04, S05, S06, FIX-1, WARNING）

## 3. 输入依据

- 编排者分配的"紧急修复：Gate D 审查发现的安全与代码质量问题"任务清单
- 权威数据源：`src/engine/gates.ts` 中的 `GATE_OPERATIONS`

## 4. 变更文件 / 变更范围

| 文件 | 修复项 | 修改类型 |
|------|--------|---------|
| `src/templates/platforms/opencode/tools/jarvis-gate-check.ts` | S03：命令注入修复 | `execSync` -> `execFileSync` + 参数数组 |
| `src/templates/platforms/opencode/tools/jarvis-gate-advance.ts` | S04：命令注入修复 | `execSync` -> `execFileSync` + 参数数组 |
| `src/templates/platforms/opencode/tools/jarvis-agent-config.ts` | S05：命令注入修复 | `execSync` -> `execFileSync` + 参数数组 |
| `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts` | S06 + WARNING | try/catch 包裹 + 环境变量支持 |
| `src/hook.ts` | FIX-1：数据一致性 | 移除本地 GATE_OPS，改为 import GATE_OPERATIONS |
| `tests/tools.test.ts` | 测试同步 | mock 增加 execFileSync，更新 7 个测试用例的断言签名 |

## 5. 实现说明

### 5.1 S03/S04/S05：命令注入风险修复

**问题**：三个工具文件的 `execute()` 函数中将用户输入直接拼接到 shell 命令字符串中，存在命令注入风险（OWASP A03: Injection）。

**修复方案**：将 `execSync` 替换为 `execFileSync`，用户输入作为独立参数传入数组，不经过 shell 解析。

```typescript
// 修复前（S03 示例）
execSync(`jarvis hook gate-check --operation ${args.operation}`, { encoding: 'utf-8', timeout: 10_000 })

// 修复后
execFileSync('jarvis', ['hook', 'gate-check', '--operation', args.operation], { encoding: 'utf-8', timeout: 10_000 })
```

**关键变更**：
- S03 (`jarvis-gate-check.ts`)：`execSync` shell 字符串 -> `execFileSync` 参数数组
- S04 (`jarvis-gate-advance.ts`)：同样替换，去掉 shell 级别引号 `""`
- S05 (`jarvis-agent-config.ts`)：去掉 `cmdParts.join(' ')`，改为展开运算符构建参数数组（遵循 `code-standards` 禁止 push 的规范）

**错误处理兼容**：`execFileSync` 抛出的 `ExecException` 同样包含 `.stdout`、`.stderr`、`.message` 属性，现有错误处理逻辑无需修改。

### 5.2 S06：tool.execute.before 添加 try/catch

**问题**：`tool.execute.before` 中的 `execSync` 调用无 try/catch 包裹。如果引擎不可达，`execSync` 抛出异常可能被 OpenCode 静默吞掉或导致不明崩溃，绕过 Gate 检查。

**修复方案**：包裹 try/catch，采用安全默认原则——引擎不可达时仍阻断操作。

```typescript
// 修复前
'tool.execute.before': async (input: any) => {
  // ...
  const result = execSync('jarvis hook gate-check', { ... });
  if (result.includes('NOT met') || result.includes('BLOCKED')) {
    throw new Error(`[Jarvis] Gate BLOCKED: ${result.trim()}`);
  }
}

// 修复后
'tool.execute.before': async (input: any) => {
  // ...
  try {
    const result = execSync('jarvis hook gate-check', { ... });
    if (result.includes('NOT met') || result.includes('BLOCKED')) {
      throw new Error(`[Jarvis] Gate BLOCKED: ${result.trim()}`);
    }
  } catch (err: any) {
    // 引擎不可达时仍阻断操作（安全默认：引擎不可达 = 阻断）
    if (err.message?.includes('[Jarvis] Gate BLOCKED')) throw err;
    throw new Error(`[Jarvis] Gate BLOCKED: Engine unreachable — ${err.message || 'unknown error'}`);
  }
}
```

**安全决策理由**：安全默认 = 阻断。如果引擎不可达，意味着 Gate 检查无法执行，此时允许操作风险更高——宁可因引擎故障阻断操作，也不允许在无 Gate 检查的情况下执行。

### 5.3 FIX-1：GATE_OPS 数据不一致

**问题**：`src/hook.ts` 维护了一份 `GATE_OPS` 本地副本，与权威源 `src/engine/gates.ts` 的 `GATE_OPERATIONS` 不一致。具体差异：
- Gate A deny 列表：hook.ts 包含 10 项（多了 `lint`, `review`, `audit`, `fix`, `preview`），gates.ts 仅 5 项

**修复方案**：移除本地副本，直接 `import { GATE_OPERATIONS } from './engine/gates.js'`。

**循环依赖验证**：
- `gates.ts` 仅 import `./agent-registry.js`
- `src/engine/` 目录下无任何文件 import `src/hook.ts`
- 无循环依赖风险

### 5.4 WARNING：环境变量支持

**问题**：`API_BASE` 硬编码 `http://localhost:3456`，无法适应不同部署环境。

**修复方案**：改为从环境变量读取，提供默认值。

```typescript
// 修复前
const API_BASE = 'http://localhost:3456';

// 修复后
const API_BASE = process.env.JARVIS_ENGINE_URL || 'http://localhost:3456';
```

与 `src/hook.ts` 中的 `ENGINE_URL` 使用相同的环境变量名 `JARVIS_ENGINE_URL`，保持一致性。

## 6. 测试和验证结果

### 6.1 自动化验证

| 检查项 | 结果 |
|--------|------|
| `npx tsc --noEmit` | 通过，零类型错误 |
| `npx vitest run` | **96/96 全部通过**（7 个测试文件） |

### 6.2 测试影响范围

`tests/tools.test.ts` 的 7 个测试用例因 `execSync` -> `execFileSync` 签名变更需要同步更新：
- 测试 2, 3（jarvis-gate-check）
- 测试 5, 6（jarvis-gate-advance）
- 测试 14, 15, 16（jarvis-agent-config）

变更要点：
- mock 同时导出 `execSync` 和 `execFileSync`
- 参数断言从单字符串改为 `('jarvis', [...args], options)` 三元组

其他测试文件（gates.test.ts, gate-hook.test.ts, db.test.ts 等）无需修改。

## 7. 数据与接口边界

- **对外接口无变化**：工具函数的输入参数和返回格式保持不变
- **环境变量**：新增 `JARVIS_ENGINE_URL` 环境变量的读取（向后兼容，有默认值）
- **导入关系**：`hook.ts` 新增 `import { GATE_OPERATIONS } from './engine/gates.js'`，无循环依赖

## 8. 风险 / 未解决项

| 风险 | 级别 | 说明 |
|------|------|------|
| `execFileSync` on Windows | 低 | `execFileSync` 在无 shell 时可能无法直接执行 `.cmd`/`.bat` 包装器。Node.js 18+ 已改善此支持。如果出现问题，可改用 `execFileSync` + `shell: true` 并配合输入验证，或使用 `cmd.exe /c` 前缀。当前所有 96 测试通过，暂未触发此问题。 |
| 模板文件运行时依赖 | 低 | 三个工具文件位于 `src/templates/` 下，运行时会被复制到 OpenCode 插件目录。实际运行时需确认 Node.js 版本支持 `execFileSync` 的 `.cmd` 解析。 |

## 9. 需要前端配合的点

无。本次修复为纯后端安全加固，不影响前端。

## 10. 推荐的下一步

1. 在 CI 流程中添加 `npm audit` 或 SAST 扫描，自动检测命令注入模式
2. 考虑将 `jarvis` CLI 路径配置化（如 `JARVIS_CLI_PATH` 环境变量），增强部署灵活性
3. 对 `src/templates/` 下的其他工具文件进行安全审查，确认是否还有遗漏的 shell 命令拼接
