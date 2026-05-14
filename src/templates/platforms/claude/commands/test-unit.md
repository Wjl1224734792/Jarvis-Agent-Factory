---
name: test-unit
description: 单元测试生成与执行——自动检测测试框架，生成覆盖率门禁测试用例，验证核心逻辑正确性
model: deepseek-v4-pro
argument-hint: [测试范围或模块路径]
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill
version: "3.45.8"
updated: "2026-05-14"
---

# 单元测试生成与执行

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎
```
Skill("behavioral-guidelines")
Skill("test-driven-development")
```

**引擎会话注册**（硬约束——引擎确保测试操作按 Gate 权限执行）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "full" })`
- 生成测试前调用 `mcp__jarvis-engine__gate_check({ operation: "spawn_test" })`
- 执行测试前调用 `mcp__jarvis-engine__gate_check({ operation: "lint" })` 确保代码质量

代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

## 步骤 1：检测测试框架（不可绕过）

自动检测项目中使用的测试框架：

| 检测依据 | 框架 | 配置文件 |
|---------|------|---------|
| `jest.config.*` / `"jest"` in package.json | Jest | jest.config.ts |
| `vitest.config.*` / `"vitest"` in package.json | Vitest | vitest.config.ts |
| `.mocharc.*` / `"mocha"` in package.json | Mocha | .mocharc.yml |
| `pytest` / `pyproject.toml` [tool.pytest] | Pytest | pytest.ini |
| `go test` / `_test.go` 文件 | Go testing | N/A |

输出检测结果和将使用的测试命令。

## 步骤 2：分析目标代码（不可绕过）

1. 读取目标源文件，识别：
   - 导出函数/类/方法签名
   - 参数类型与返回值类型
   - 分支条件（if/else、switch、三元运算符）
   - 异常路径（throw、Promise.reject）
   - 边界条件（null/undefined、空数组、极值）

2. 列出待覆盖的测试场景矩阵：
   ```
   | 场景 | 输入 | 预期输出 | 覆盖分支 |
   |------|------|---------|---------|
   | 正常路径 | ... | ... | 主流程 |
   | 边界-空值 | null | throws | 卫语句 |
   | 边界-最大值 | MAX_INT | ... | 计算逻辑 |
   | 异常路径 | 无效参数 | throws ValidationError | 错误处理 |
   ```

## 步骤 3：生成测试用例（TDD Red 阶段）

1. 按框架约定创建/扩展测试文件（如 `*.test.ts`、`*_test.go`）
2. 每个测试用例遵循 AAA 模式：
   - **Arrange**：准备测试数据和依赖
   - **Act**：执行被测函数
   - **Assert**：验证结果
3. Mock 外部依赖（数据库、HTTP、文件系统）但不 mock 被测单元内部逻辑

测试命名规范：
- Jest/Vitest: `describe('模块名', () => { it('应<行为>当<条件>', () => {}) })`
- Pytest: `def test_<函数名>_<场景描述>():`
- Go: `func Test<函数名>_<场景>(t *testing.T) {}`

## 步骤 4：运行测试并验证覆盖率（Green 阶段）

```bash
# Jest/Vitest
npx jest --coverage
npx vitest run --coverage

# Pytest
pytest --cov=. --cov-report=term

# Go
go test ./... -coverprofile=coverage.out
```

**覆盖率门禁（Gate C2 标准）**：
- 行覆盖率 >= 80%（核心模块 >= 90%）
- 分支覆盖率 >= 70%
- 所有关键路径至少 1 个测试用例
- 所有异常路径至少 1 个测试用例

**不通过时**：分析未覆盖分支，补充测试用例后重新运行。最多 2 轮。

## 步骤 5：重构测试代码（Refactor 阶段）

- 提取重复的 Arrange 逻辑到 setup/helper
- 合并相似场景使用 `it.each` / `@pytest.mark.parametrize` / table-driven tests
- 确保测试文件可读性：描述性名称 > 简洁名称

## 闭环图示
```
检测框架 → 分析代码 → 生成测试(Red) → 运行(Green)
    ↓                                      ↓
覆盖率达标                         覆盖率不达标
    ↓                                      ↓
✅ 完成                            补充测试(最多2轮)
```

## 红线
- 不检测框架就生成测试代码（用错误的断言库/运行器）
- 测试无断言（只调用函数不验证结果）
- Mock 过度（mock 了被测单元内部逻辑，测试失去意义）
- 跳过覆盖率门禁（未达标就声称完成）
- 测试用例中包含真实外部调用（数据库、第三方 API——必须 mock）
- 只用 Happy Path 测试（边界和异常路径必须覆盖）
