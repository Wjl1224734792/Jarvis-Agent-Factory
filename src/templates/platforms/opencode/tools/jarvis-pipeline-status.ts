/**
 * Jarvis Pipeline Status Tool — OpenCode 原生工具
 * 获取当前流水线状态，包括当前Gate、已完成Gate、进度、会话信息。
 * 包装引擎 MCP 工具 pipeline_status。
 */
import { tool } from "@opencode-ai/plugin";

export default tool({
  description: "获取当前流水线状态——当前处于哪个Gate、已通过哪些Gate、进度比例、活跃会话列表。",
  args: {},
  async execute() {
    const { execSync } = await import("node:child_process");

    try {
      const raw = execSync(
        'jarvis hook status --json',
        { encoding: 'utf-8', timeout: 10_000 },
      );

      const pipeline = JSON.parse(raw);
      const sessions = pipeline.sessions || [];
      if (sessions.length === 0) {
        return "暂无活跃流水线会话。请先通过编排工具初始化流水线。";
      }

      const lines: string[] = [];
      lines.push("流水线状态报告");
      lines.push("=".repeat(40));

      for (const s of sessions) {
        const passed = s.gates?.filter((g: any) => g.passed).length || 0;
        const total = s.gates?.length || 0;
        const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
        const badge = s.status === 'active' ? '进行中' : '已休眠';

        lines.push(`\n会话: ${s.session_id}`);
        lines.push(`  平台: ${s.platform || '?'}`);
        lines.push(`  流水线: ${s.pipeline_name || '?'}`);
        lines.push(`  状态: ${badge}`);
        lines.push(`  当前Gate: ${s.current_gate}`);
        lines.push(`  进度: ${passed}/${total} (${pct}%)`);

        if (s.gates?.length) {
          lines.push('  Gate详情:');
          for (const g of s.gates) {
            const mark = g.passed ? '✅' : '⬜';
            const dur = g.duration_display ? ` (耗时${g.duration_display})` : '';
            lines.push(`    ${mark} ${g.gate}${dur}`);
          }
        }
      }

      lines.push(`\n会话总数: ${sessions.length}`);
      return lines.join('\n');
    } catch (err: any) {
      if (err.stdout) return err.stdout.trim();
      if (err.stderr) return err.stderr.trim();
      return `流水线状态查询失败: ${err.message || '未知错误'}`;
    }
  },
});
