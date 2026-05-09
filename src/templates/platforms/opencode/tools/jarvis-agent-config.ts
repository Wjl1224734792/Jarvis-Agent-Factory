/**
 * Jarvis Agent Config Tool — OpenCode 原生工具
 * 查询或设置 Agent 的模型与思考等级配置。
 * 包装引擎 MCP 工具 agent_config。
 */
import { tool } from "@opencode-ai/plugin";

export default tool({
  description: "查询或设置智能体的模型和思考等级。传入agent_id+model时设置，只传agent_id时查询单个Agent，都不传时列出全部。",
  args: {
    agent_id: tool.schema
      .string()
      .describe("智能体ID，如 frontend-implementer/backend-architect。查询或设置目标。"),
    model: tool.schema
      .string()
      .optional()
      .describe("要设置的模型名称，如 deepseek-v4-pro/gpt-5.5。传入时进入设置模式。"),
    effort: tool.schema
      .string()
      .optional()
      .describe("思考等级：low/medium/high/xhigh/max。默认high。"),
  },
  async execute(args) {
    const { execFileSync } = await import("node:child_process");

    const cmdArgs = [
      'hook', 'agent-config', '--agent-id', args.agent_id,
      ...(args.model ? ['--model', args.model] : []),
      ...(args.effort ? ['--effort', args.effort] : []),
    ];

    try {
      const result = execFileSync('jarvis', cmdArgs, { encoding: 'utf-8', timeout: 10_000 });
      return result.trim();
    } catch (err: any) {
      if (err.stdout) return err.stdout.trim();
      if (err.stderr) return err.stderr.trim();
      return `❌ Agent配置操作失败: ${err.message || '未知错误'}`;
    }
  },
});
