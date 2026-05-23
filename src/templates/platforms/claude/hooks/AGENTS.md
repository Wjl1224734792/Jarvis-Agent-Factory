# hooks

> 钩子模板目录 — 定义 Jarvis 引擎在 Claude Code 平台的事件钩子

| 钩子 | 触发时机 | 用途 |
|------|---------|------|
| [PreToolUse](./PreToolUse.md) | 工具调用前 | Gate 权限硬约束检查 |
| [PostToolUse](./PostToolUse.md) | 工具调用后 | 产物自动记录到 artifacts 表 |
| [SessionStart](./SessionStart.md) | 会话启动 | 引擎注册提醒 + 上下文注入 |
| [Stop](./Stop.md) | 会话停止前 | 保存恢复数据 + 未完成提醒 |
| [UserPromptSubmit](./UserPromptSubmit.md) | 用户提交提示词后 | 命令路由检测 |

## 使用方式

在 `.claude/settings.json` 中配置钩子路径，指向本目录下的对应模板文件。
