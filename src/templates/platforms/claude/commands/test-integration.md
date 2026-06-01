---
name: test-integration
description: 集成测试/API 测试指令——基于 OpenAPI 契约生成集成测试，启动测试环境，验证 API 端点行为
model: inherit
argument-hint: [API 端点或服务名称]
tools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit", "Skill", "WebFetch", "mcp__jarvis-engine__session_join", "mcp__jarvis-engine__pipeline_guide", "mcp__jarvis-engine__gate_check", "mcp__jarvis-engine__gate_jump", "mcp__jarvis-engine__advance_gate", "mcp__jarvis-engine__gate_enforce"]
---

# 集成测试 / API 测试

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎
```
Skill("behavioral-guidelines")
Skill("test-driven-development")
Skill("test-data-factory")
```

**引擎会话注册**（硬约束——引擎确保测试操作按 Gate 权限执行）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "auto" })`
- `mcp__jarvis-engine__gate_jump({ gate: "Gate C2" })`
- **每个 Gate 开始时**调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 上下文
- 生成测试前调用 `mcp__jarvis-engine__gate_check({ operation: "spawn_test" })`
- 启动测试环境前调用 `mcp__jarvis-engine__gate_check({ operation: "build" })`
- **每个 Gate 完成后**调用 `mcp__jarvis-engine__gate_enforce` 验证条件，通过后 `mcp__jarvis-engine__advance_gate` 推进

代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

## 步骤 1：识别 API 契约（不可绕过）

按优先级查找 API 定义：

1. **OpenAPI 契约文件**：`openapi.json`、`swagger.json`、`openapi.yaml`
2. **路由定义文件**：Express/Next 路由文件、FastAPI router、Gin handler
3. **契约文档**：`.jarvis/YYYY-MM-DD/api/`

提取关键信息：
- HTTP 方法（GET/POST/PUT/PATCH/DELETE）
- 端点路径（如 `/api/users/:id`）
- 请求 Body/Query/Params Schema
- 响应 Status Code + Body Schema
- 认证要求（Bearer Token、API Key、Session）

**Gate 推进**：`mcp__jarvis-engine__gate_enforce()` 验证通过后 `mcp__jarvis-engine__advance_gate()` 推进，然后 `mcp__jarvis-engine__pipeline_guide()` 获取下一 Gate 上下文。

## 步骤 2：启动测试环境

```bash
# Node.js
npm run dev &          # 或 npm start
docker-compose up -d   # 数据库/依赖服务

# Python
uvicorn main:app --reload &
docker-compose up -d

# Go
go run ./cmd/server/ &
docker-compose up -d
```

**环境确认**：
- 服务启动成功（HTTP 200 on health check）
- 数据库连接正常（测试数据库，隔离生产数据）
- 环境变量已设置（`NODE_ENV=test`、`DATABASE_URL=test_db`）

**Gate 推进**：`mcp__jarvis-engine__gate_enforce()` 验证通过后 `mcp__jarvis-engine__advance_gate()` 推进，然后 `mcp__jarvis-engine__pipeline_guide()` 获取下一 Gate 上下文。

## 步骤 3：生成集成测试用例

为每个 API 端点生成测试，覆盖：

| 测试类型 | 示例 | 验证点 |
|---------|------|--------|
| **正向-200** | POST /users 有效数据 | 201, 返回资源 + ID |
| **正向-200** | GET /users/:id 存在 | 200, 返回正确用户 |
| **正向-204** | DELETE /users/:id 存在 | 204, 无响应体 |
| **边界-400** | POST /users 缺失必填字段 | 400, 错误消息含字段名 |
| **边界-404** | GET /users/99999 不存在 | 404, 资源不存在 |
| **边界-409** | POST /users 重复邮箱 | 409, 冲突错误 |
| **认证-401** | 任何端点 无Token | 401, 未授权 |
| **授权-403** | DELETE /users/:id 无权限 | 403, 禁止 |

测试框架选择：
- Node.js: Supertest + Jest/Vitest
- Python: httpx + Pytest
- Go: httptest + testing

**Gate 推进**：`mcp__jarvis-engine__gate_enforce()` 验证通过后 `mcp__jarvis-engine__advance_gate()` 推进，然后 `mcp__jarvis-engine__pipeline_guide()` 获取下一 Gate 上下文。

## 步骤 4：运行集成测试

```bash
# Node.js
npx jest --config jest.integration.config.ts

# Python
pytest tests/integration/ -v

# Go
go test ./tests/integration/... -v
```

**集成测试通过标准**：
- 所有正向路径 100% 通过
- 所有错误处理路径 100% 通过
- 无竞态条件导致的 flaky 测试
- 测试之间互相隔离（可独立运行、不可依赖执行顺序）

**Gate 推进**：`mcp__jarvis-engine__gate_enforce()` 验证通过后 `mcp__jarvis-engine__advance_gate()` 推进，然后 `mcp__jarvis-engine__pipeline_guide()` 获取下一 Gate 上下文。

## 步骤 5：清理测试环境

```bash
docker-compose down -v    # 清理测试数据库
kill %1                   # 停止测试服务器
```

**Gate 推进**：`mcp__jarvis-engine__gate_enforce()` 验证通过后 `mcp__jarvis-engine__advance_gate()` 推进，然后 `mcp__jarvis-engine__pipeline_guide()` 获取下一 Gate 上下文。

## 闭环图示
```
识别契约 → 启动环境 → 生成测试 → 运行测试
                ↓                        ↓
          环境就绪              全部通过 → ✅ 完成
                ↓                        ↓
          启动失败              失败/Flaky
                ↓                        ↓
          修复环境              分析根因(最多2轮)
```

## 红线
- 在测试中使用生产数据库（数据污染不可逆）
- 测试间共享可变状态（导致 flaky 测试）
- 不等待服务就绪就发请求（端口未监听导致误报失败）
- 忘记清理测试数据（影响下次运行）
- 跳过认证/授权测试（安全关键路径）
- 对第三方 API 做真实调用（必须 mock/stub）
