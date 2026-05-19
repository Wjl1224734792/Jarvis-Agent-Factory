---
name: debug
description: 调试诊断指令——D0收集信息→D1复现用例→D2调试会话→D3交互诊断→D4输出报告，5Gate诊断流程
model: deepseek-v4-pro
argument-hint: [异常描述或Bug报告]
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill
version: "3.45.8"
updated: "2026-05-14"
---

# 调试诊断

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎
```
Skill("behavioral-guidelines")
Skill("debugging-and-error-recovery")
Skill("debugging-deep")
```

**引擎会话注册**（硬约束——引擎确保调试操作按 Gate 权限执行）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "debug", task_name: "调试: <异常简述>" })`
- 每个 Gate 开始前调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 允许的操作
- D2/D3 阶段写调试代码前 `gate_check({ operation: "write_code" })`

代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

---

## D0：收集异常信息

**Gate 检查条件**：异常描述已记录，日志/堆栈/环境信息已收集

### 步骤
1. 记录异常基本信息：
   ```
   ## 异常信息
   - 异常类型：TypeError / RangeError / Panic / Segmentation Fault
   - 异常消息：完整错误消息
   - 发生时间：YYYY-MM-DD HH:MM
   - 频率：必现 / 间歇性 / 偶发
   ```

2. 收集堆栈追踪：
   ```
   Error: Cannot read property 'name' of undefined
     at UserService.getProfile (src/services/user.ts:42:18)
     at UserController.profile (src/controllers/user.ts:15:10)
     at Layer.handle (node_modules/express/...)
   ```

3. 收集日志证据：
   ```bash
   # 应用日志
   tail -n 200 logs/app.log | grep -A 5 -B 5 "ERROR"
   
   # 系统日志
   journalctl -u myapp -n 100 --no-pager
   ```

4. 收集环境信息：
   | 项目 | 值 |
   |------|-----|
   | Node.js 版本 | `node -v` |
   | 操作系统 | `uname -a` |
   | 依赖版本 | `npm ls <package>` |
   | 数据库版本 | `psql --version` |
   | 最近部署 | `git log --oneline -5` |

5. 输出 `docs/YYYY-MM-DD/debug/error-collection.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "D1" })`

---

## D1：生成最小复现用例

**Gate 检查条件**：最小复现用例已生成，可稳定复现异常

### 步骤
1. 从 D0 收集的信息出发，构建最小复现脚本：
   ```javascript
   // reproduce.js — 最小复现用例
   const { getUser } = require('./src/services/user');
   
   // Arrange: 构造触发异常的条件
   const db = { users: { findById: () => null } };  // 模拟返回 null
   
   // Act: 执行故障路径
   try {
     const result = getUser('non-existent-id', db);
     console.log('UNEXPECTED: succeeded', result);
   } catch (err) {
     // Assert: 确认异常被触发
     console.log('EXPECTED: exception thrown', err.message);
   }
   ```

2. 验证复现稳定性：
   - 连续运行 5 次，确认每次都能复现
   - 如果无法 100% 复现 → 增加日志探针等待下次出现

3. **复现成功标准**：
   - 异常类型与 D0 一致
   - 堆栈路径与 D0 匹配
   - 触发条件明确可控

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "D2" })`

---

## D2：启动调试会话

**Gate 检查条件**：调试会话已启动，断点/日志已插入关键路径

### 步骤
1. 根据运行环境选择调试方式：

   **Node.js 调试：**
   ```bash
   node --inspect-brk reproduce.js
   # Chrome DevTools: chrome://inspect
   ```

   **VS Code 调试（launch.json）：**
   ```json
   {
     "type": "node",
     "request": "launch",
     "name": "Debug Reproduce",
     "program": "${workspaceFolder}/reproduce.js",
     "stopOnEntry": true
   }
   ```

   **日志探针（无法使用调试器时）：**
   ```javascript
   // 在关键路径插入临时日志
   function getUser(id, db) {
     console.log(`[DEBUG] getUser id=${id} db.users=${!!db.users}`);
     const user = db.users.findById(id);
     console.log(`[DEBUG] getUser result=${JSON.stringify(user)}`);
     if (!user) throw new Error('...');  // 故障点
     return user.profile;                 // D0 异常点
   }
   ```

2. 在关键路径设置断点：
   - 异常抛出点
   - 数据转换点（输入 → 处理 → 输出）
   - 条件分支入口

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "D3" })`

---

## D3：交互式诊断

**Gate 检查条件**：交互式诊断完成，根因已定位

### 诊断方法

#### 方法 1：变量追踪
在断点处检查：
- 变量值是否符合预期
- 类型是否正确（typeof / instanceof）
- 对象属性是否存在
- 异步状态是否已完成

#### 方法 2：调用链回溯
从异常点向上回溯：
- 谁调用了这个函数？参数从哪来？
- 参数在传递过程中是否被修改？
- 中间件/拦截器是否改变了上下文？

#### 方法 3：二分排除（多变更时）
```
1. 找到"最后一次正常"和"第一次异常"的提交
2. 取中间点，测试是否异常
3. 如果异常 → 问题在前半段
4. 如果正常 → 问题在后半段
5. 重复直到定位到具体提交和文件
```

#### 方法 4：状态差异分析
对比正常路径和异常路径的状态差异：
| 状态变量 | 正常路径值 | 异常路径值 | 
|---------|-----------|-----------|
| db.users | { findById: fn } | undefined |
| id | 'valid-id' | 'non-existent' |
| user | { profile: ... } | null |

### 诊断结论模板
```
## 根因诊断
- 故障文件：src/services/user.ts:42
- 根因类型：空引用 / 类型错误 / 竞态条件 / 配置缺失
- 直接原因：db.users 在模块热重载后变为 undefined
- 触发条件：当 <具体条件> 时，<异常路径> 被执行
- 影响范围：所有调用 getUser() 的请求
```

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "D4" })`

---

## D4：输出诊断报告

**Gate 检查条件**：诊断报告已产出，含根因分析+修复方案+预防建议

### 步骤
输出 `docs/YYYY-MM-DD/debug/debug-report.md`：
```markdown
# 调试诊断报告
## 异常概述
- 异常类型、消息、发生时间

## D0 证据收集
- 堆栈追踪
- 日志摘录
- 环境信息

## D1 复现用例
- 最小复现脚本（code block）
- 复现率：100% / 80%

## D2 调试会话
- 调试方式：VS Code / Chrome DevTools / 日志探针
- 断点位置列表

## D3 根因分析
- 故障文件:行号
- 根因类型
- 直接原因
- 触发条件
- 影响范围

## 修复方案
- 具体修改方案
- 修复验证方式
- 回归测试建议

## 预防建议
- [ ] 添加类型校验防止空引用
- [ ] 添加单元测试覆盖此边界
- [ ] 添加错误监控告警
```

## 清理
- 删除临时日志输出（如果有）
- 删除复现脚本（或保留为回归测试）
- 确认无遗留调试代码

---

## 红线
- D0 证据不全就开始假设根因（没有证据的诊断 = 猜测）
- 直接改代码碰运气（"试试这样行不行"——先诊断再修复）
- 使用 `console.log` 代替结构化调试（临时日志容易遗漏，用断点更精确）
- 诊断过程中修改无关代码（调试是调查，不是修复）
- 不记录诊断过程（下次类似问题又要从头查）
- 不清除调试代码（残留的 console.log 污染日志/性能）
