---
name: migrate
description: 框架迁移指令——M1规则验证→M2应用迁移→M3编译验证→M4自动修复Lint，4Gate迁移流程
model: deepseek-v4-pro
argument-hint: [迁移描述，如"Express→Fastify"或"Vue2→Vue3"]
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill
version: "4.3.8"
updated: "2026-05-14"
---

# 框架 / 依赖迁移

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎
```
Skill("behavioral-guidelines")
Skill("source-driven-development")
```

**引擎会话注册**（硬约束——引擎确保迁移操作按 Gate 权限执行）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "migrate", task_name: "迁移: <迁移描述>" })`
- 每个 Gate 开始前调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 允许的操作
- 写代码前调用 `mcp__jarvis-engine__gate_check({ operation: "write_code" })`（仅 M2 阶段允许）
- 构建前调用 `mcp__jarvis-engine__gate_check({ operation: "build" })`（仅 M3/M4 阶段允许）

代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

---

## M1：定义迁移规则并验证覆盖率

**Gate 检查条件**：迁移规则文档已产出，规则覆盖率验证通过

### 步骤
1. 定义迁移规则表：
   ```
   | 规则ID | 源模式 | 目标模式 | 适用文件 | 优先级 |
   |--------|--------|---------|---------|--------|
   | M001 | express.Router() | fastify.Router() | src/routes/*.ts | P0 |
   | M002 | res.json(data) | reply.send(data) | src/**/*.ts | P0 |
   | M003 | app.listen(port) | app.listen({ port }) | src/index.ts | P0 |
   | M004 | req.body | req.body (fastify已内置) | src/**/*.ts | P1 |
   ```

2. 验证规则覆盖率：
   - `grep -rn "源模式" --include="*.ts"` 找出所有匹配位置
   - 确保每个匹配位置都有对应迁移规则
   - 补充遗漏的规则

3. 输出 `.jarvis/YYYY-MM-DD/migration/migration-rules.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "M2" })`

---

## M2：应用迁移

**Gate 检查条件**：迁移已执行，代码已按规则表转换完毕

### 步骤
1. 安装新框架依赖：
   ```bash
   npm install fastify @fastify/cors     # 示例
   ```

2. 按规则表逐规则迁移：
   - 每次执行 1 个或相关联的 N 个规则
   - 每批次规则执行后验证文件语法正确
   - 优先执行 P0（阻塞性）规则，最后执行 P1（优化性）规则

3. 迁移顺序建议：
   - 先迁移核心配置（入口文件、路由注册）
   - 再迁移业务逻辑（处理函数、中间件）
   - 最后迁移辅助代码（工具函数、测试文件）

4. 每项规则迁移后做快速语法检查：
   ```bash
   npx tsc --noEmit --skipLibCheck  # TypeScript
   ```

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "M3" })`

---

## M3：编译与构建验证

**Gate 检查条件**：编译/构建通过，Type-check 零错误

### 步骤
1. Type-check：
   ```bash
   npx tsc --noEmit        # TypeScript 项目
   mypy src/               # Python 项目
   cargo check             # Rust 项目
   ```

2. 构建：
   ```bash
   npm run build           # Node.js
   go build ./...          # Go
   cargo build             # Rust
   ```

3. **任意项失败**：
   - 分析错误，定位到具体迁移规则
   - 修正 M2 的规则应用
   - 最多 2 轮修复-重试

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "M4" })`

---

## M4：Lint 自动修复

**Gate 检查条件**：Lint 零错误（自动修复循环最多2轮），构建成功

### 步骤
1. 运行 Lint：
   ```bash
   npm run lint
   ```

2. 自动修复：
   ```bash
   npm run lint -- --fix    # ESLint
   ruff check --fix          # Python Ruff
   golangci-lint run --fix   # Go
   ```

3. 无法自动修复的手动修复：
   - 优先修复 error 级别
   - warning 级别若不影响功能可记录到技术债务

4. 最多 2 轮自动修复循环。2 轮后仍有 error → 标记 BLOCKED，输出失败报告。

5. 最终验证：Lint 0 error + Build 成功

---

## 迁移反模式

| 反模式 | 正确做法 |
|--------|---------|
| 新旧框架代码并存过渡期 | 一次性彻底迁移，避免混用 |
| 迁移同时重构业务逻辑 | 迁移是机械转换，重构是独立任务 |
| 不写规则直接改代码 | 规则先行 — 确保迁移可审查、可回滚 |
| 迁移后不删除旧依赖 | 清理 package.json 中废弃的依赖 |
| 跳过 M3/M4 验证 | 编译和 Lint 是迁移安全网 |

## 红线
- 迁移中修改业务逻辑（迁移 = 机械转换，不是功能修改）
- 未定义规则就开始迁移（无规则 = 无标准 = 不可审查）
- 新旧框架长期共存（技术债务快速累积）
- 不清理旧依赖（增加安全攻击面和构建体积）
- 迁移和功能开发混在一个分支（无法回滚迁移）
