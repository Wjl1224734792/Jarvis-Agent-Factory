/**
 * Jarvis Gate Check Plugin — OpenCode 原生插件
 * 监听 Task/Agent 工具执行后自动触发门禁检查
 *
 * 安装位置: .opencode/plugins/jarvis-gate-check.ts
 * 文档: https://opencode.ai/docs/plugins
 */

export const JarvisGateCheck = async (context: any) => {
  const { execSync } = await import('node:child_process');

  return {
    /** PostToolUse(Agent) → tool.execute.after(Task) */
    'tool.execute.after': async (input: any, output: any) => {
      const toolName = input?.tool || input?.params?.name || '';
      // OpenCode 用 Task 工具调度子 Agent，等价于 Claude Code 的 Agent 工具
      if (toolName === 'Task' || toolName === 'Agent' || toolName === 'task') {
        try {
          const result = execSync('jarvis hook gate-check', {
            encoding: 'utf-8',
            stdio: 'pipe',
            timeout: 10_000,
          });
          // 输出引擎返回结果（静默模式，仅在 Gate 不满足时报错）
          if (result.includes('NOT met') || result.includes('BLOCKED')) {
            console.error('[Jarvis] Gate enforcement:', result.trim());
          }
        } catch (err: any) {
          // gate-check 失败不阻止 Agent 执行，仅报警
          if (err.stderr) console.error('[Jarvis] Gate check failed:', err.stderr.trim());
        }
      }
    },

    /** 会话结束时显示流水线状态 */
    'session.idle': async () => {
      try {
        execSync('jarvis hook status', { encoding: 'utf-8', stdio: 'pipe', timeout: 5_000 });
      } catch {}
    },
  };
};
