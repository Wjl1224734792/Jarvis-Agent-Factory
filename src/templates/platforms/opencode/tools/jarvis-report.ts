/**
 * Jarvis Report Tool — OpenCode 原生工具
 * 生成流水线完整报告，包含各会话进度、Gate状态、完成百分比。
 * 包装引擎 MCP 工具 report_status。
 */
import { tool } from "@opencode-ai/plugin";

export default tool({
  description: "生成流水线完整报告——各会话的Gate完成进度、当前Gate、通过率等概览信息。",
  args: {},
  async execute() {
    const { execSync } = await import("node:child_process");

    try {
      const result = execSync(
        'jarvis hook report-status',
        { encoding: 'utf-8', timeout: 10_000 },
      );
      return result.trim();
    } catch (err: any) {
      if (err.stdout) return err.stdout.trim();
      if (err.stderr) return err.stderr.trim();
      return `❌ 报告生成失败: ${err.message || '未知错误'}`;
    }
  },
});
