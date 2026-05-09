/**
 * Jarvis Gate Check Tool — OpenCode 原生工具
 * 检查指定操作在当前 Gate 是否被允许执行。
 * 包装引擎 MCP 工具 gate_check。
 */
import { tool } from "@opencode-ai/plugin";

export default tool({
  description: "检查指定操作在当前Gate是否允许执行。返回Gate名、允许/禁止状态及原因。",
  args: {
    operation: tool.schema
      .string()
      .describe("要执行的操作类型，如 spawn_impl/write_code/build/review/deploy 等"),
  },
  async execute(args) {
    const { execFileSync } = await import("node:child_process");

    try {
      const result = execFileSync(
        'jarvis', ['hook', 'gate-check', '--operation', args.operation],
        { encoding: 'utf-8', timeout: 10_000 },
      );
      return result.trim();
    } catch (err: any) {
      // exit 1 = BLOCKED（操作被禁止），返回禁止原因
      if (err.stdout) return err.stdout.trim();
      if (err.stderr) return err.stderr.trim();
      return `❌ Gate检查失败: ${err.message || '未知错误'}`;
    }
  },
});
