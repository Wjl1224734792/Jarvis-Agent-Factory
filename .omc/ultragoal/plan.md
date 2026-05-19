# Ultragoal: 参考 OMC loop/ralph + Claude Code goal/loop 设计 Jarvis 适配指令

## 分析对象

### 1. Claude Code `/goal` — 会话级目标锁
- 设置一个目标条件，阻止会话在条件满足前停止
- 条件满足后自动清除
- 问题：跨会话丢失状态，无持久化

### 2. Claude Code `/loop` — 定时重复执行
- 按间隔重复运行指定的 prompt 或斜杠命令
- 适用轮询/监控场景
- 问题：无状态追踪，无完成条件

### 3. OMC `ralph` — 持久化执行循环
- PRD 驱动：用户故事 + 验收标准 + psses 布尔
- 循环：实现 → 验证 → 标记完成 → 检查 PRD → 审查 → deslop → 回归验证
- 持久化：state_write/state_read 跨会话保持
- 停止条件：全部通过 或 用户取消

### 4. OMC `ultragoal` — 多目标持久工作流
- 将简报分解为有序目标序列
- 持久化分类账（ledger）记录开始/检查点/阻塞/失败
- 与 Claude `/goal` 协调：打印模型可读的交接文本
- 最终完成门控：ai-slop-cleaner + 验证 + 代码审查

## Jarvis 适配设计

### 核心原则
- 复用现有基础设施（session_join、pipeline_runs、artifacts、checkpoints）
- 通过 Jarvis MCP 工具与引擎集成
- 命令文件遵循现有 frontmatter 格式
- 产物存入 docs/YYYY-MM-DD/ 日期目录
- Web 面板可查看进度

### Goal 1: `/persist` — 持久化任务执行器（对标 ralph）
### Goal 2: `/focus` — 会话焦点目标（对标 /goal）  
### Goal 3: `/watch` — 定时监控执行器（对标 /loop）
### Goal 4: `/mission` — 多目标任务追踪（对标 ultragoal）
