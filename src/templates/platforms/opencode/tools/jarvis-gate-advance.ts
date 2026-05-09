/**
 * Jarvis Gate Advance Tool — OpenCode 原生工具
 * 将流水线推进到指定的下一个 Gate。
 * 包装引擎 MCP 工具 advance_gate。
 */
import { tool } from "@opencode-ai/plugin";

export default tool({
  description: "将流水线推进到指定Gate。Gate条件必须已满足，且只能逐级推进不能跳Gate。",
  args: {
    gate: tool.schema
      .string()
      .describe("目标Gate名称，如 Gate B/Gate C/Gate D 等。只能推进到当前Gate的下一级。"),
  },
  async execute(args) {
    const { execFileSync } = await import("node:child_process");

    try {
      const result = execFileSync(
        'jarvis', ['hook', 'gate-advance', '--gate', args.gate],
        { encoding: 'utf-8', timeout: 10_000 },
      );
      return result.trim();
    } catch (err: any) {
      if (err.stdout) return err.stdout.trim();
      if (err.stderr) return err.stderr.trim();
      return `❌ Gate推进失败: ${err.message || '未知错误'}`;
    }
  },
});
