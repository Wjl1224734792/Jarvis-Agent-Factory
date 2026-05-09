/**
 * Jarvis Gate Check Plugin — OpenCode 原生插件
 * 监听 Task/Agent 工具执行前后自动触发门禁检查，同步流水线与事件
 *
 * 安装位置: .opencode/plugins/jarvis-gate-check.ts
 * 文档: https://opencode.ai/docs/plugins
 */

/** 需要 gate-check 前置阻断的关键工具列表 */
const BLOCKABLE_TOOLS = new Set(['Task', 'Agent', 'Write', 'Edit', 'Bash']);

/** gate-check 需要执行的工具（after hook） */
const GATE_CHECK_TOOLS = new Set(['Task', 'Agent', 'task']);

/** 引擎事件 API 基地址，可通过环境变量 JARVIS_ENGINE_URL 覆盖 */
const API_BASE = process.env.JARVIS_ENGINE_URL || 'http://localhost:3456';

/**
 * 向引擎 POST JSON 事件（失败静默，不抛异常）
 * @param path API 路径，如 /api/events
 * @param payload JSON 可序列化的负载对象
 */
async function postEvent(path: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
    });
  } catch {
    // 引擎不可达时静默降级，不阻断 Agent 执行
  }
}

export const JarvisGateCheck = async (context: any) => {
  const { execSync } = await import('node:child_process');

  /** 从 input 中提取工具名称 */
  const getToolName = (input: any): string =>
    String(input?.tool || input?.params?.name || '');

  return {
    /**
     * tool.execute.before — 在关键工具执行前硬阻断
     * Gate 不满足时抛出 Error，OpenCode 捕获后阻断工具调用
     */
    'tool.execute.before': async (input: any) => {
      const toolName = getToolName(input);
      if (BLOCKABLE_TOOLS.has(toolName)) {
        try {
          const result = execSync('jarvis hook gate-check', {
            encoding: 'utf-8',
            stdio: 'pipe',
            timeout: 10_000,
          });
          if (result.includes('NOT met') || result.includes('BLOCKED')) {
            throw new Error(`[Jarvis] Gate BLOCKED: ${result.trim()}`);
          }
        } catch (err: any) {
          // 引擎不可达时仍阻断操作（安全默认：引擎不可达 = 阻断）
          if (err.message?.includes('[Jarvis] Gate BLOCKED')) throw err;
          throw new Error(`[Jarvis] Gate BLOCKED: Engine unreachable — ${err.message || 'unknown error'}`);
        }
      }
    },

    /**
     * tool.execute.after — Task/Agent 执行后检查 Gate + 上报事件
     */
    'tool.execute.after': async (input: any, output: any) => {
      const toolName = getToolName(input);
      if (GATE_CHECK_TOOLS.has(toolName)) {
        // Gate 检查（保持向后兼容的静默报警模式）
        try {
          const result = execSync('jarvis hook gate-check', {
            encoding: 'utf-8',
            stdio: 'pipe',
            timeout: 10_000,
          });
          if (result.includes('NOT met') || result.includes('BLOCKED')) {
            console.error('[Jarvis] Gate enforcement:', result.trim());
          }
        } catch (err: any) {
          if (err.stderr) console.error('[Jarvis] Gate check failed:', err.stderr.trim());
        }

        // 上报事件到引擎
        await postEvent('/api/events', {
          type: 'tool.execute.after',
          tool: toolName,
          status: output ? 'completed' : 'executed',
        });
      }
    },

    /**
     * session.idle — 会话空闲时同步流水线状态
     */
    'session.idle': async () => {
      // 保持原有 status check（向后兼容）
      try {
        execSync('jarvis hook status', { encoding: 'utf-8', stdio: 'pipe', timeout: 5_000 });
      } catch {
        // 静默，引擎不可达不阻断
      }

      // 同步流水线状态到引擎
      await postEvent('/api/pipeline', { type: 'session.idle' });
    },

    /**
     * session.error — 会话错误时上报事件
     */
    'session.error': async (error: any) => {
      await postEvent('/api/events', {
        type: 'session.error',
        error: error?.message || String(error),
      });
    },

    /**
     * permission.asked — 权限请求时记录事件
     */
    'permission.asked': async (permission: any) => {
      await postEvent('/api/events', {
        type: 'permission.asked',
        permission,
      });
    },
  };
};
