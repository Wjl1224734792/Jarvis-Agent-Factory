import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from './types.js';

// ── 内存文件声明存储（引擎进程生命周期） ──
// run_id → Map<agent_name, Set<normalized_path>>

interface ClaimEntry {
  agent: string;
  paths: Set<string>;
  registeredAt: number;
}

const claimsByRun = new Map<string, Map<string, ClaimEntry>>();

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase();
}

/** 检测两路径集冲突：任一 target 路径在任一 claimed 路径下（含子目录） */
function hasOverlap(targets: string[], claimed: Set<string>): string | null {
  for (const t of targets) {
    const nt = normalizePath(t);
    for (const cp of claimed) {
      // 子树匹配：target 是 claimed 的子路径 OR 反之
      if (nt.startsWith(cp) || cp.startsWith(nt)) {
        return t;
      }
    }
  }
  return null;
}

/** 获取一个 run 的所有当前声明（供 pipeline_guide 使用） */
export function getRunFileClaims(runId: string): Record<string, string[]> {
  const run = claimsByRun.get(runId);
  if (!run) return {};
  const out: Record<string, string[]> = {};
  for (const [agent, entry] of run) {
    out[agent] = [...entry.paths];
  }
  return out;
}

/** 当 run 取消/完成时清理声明 */
export function clearRunFileClaims(runId: string): void {
  claimsByRun.delete(runId);
}

export function registerFileClaimTools(server: McpServer, ctx: ToolContext) {
  server.tool('file_claim_register',
    '【文件冲突防护】注册 Agent 的独占文件路径。并行 Agent 之间不应共享同一文件，此工具在 spawn Agent 后调用以记录其 allowed_paths。',
    {
      run_id: z.string().describe('当前流水线 run ID'),
      agent_name: z.string().describe('Agent 名称或 task_id'),
      paths: z.array(z.string()).describe('该 Agent 独占的文件路径或目录（Glob 模式暂不支持，仅精确路径/目录前缀）'),
    },
    async ({ run_id, agent_name, paths }) => {
      if (!run_id || !agent_name) {
        return ctx.resp({ ok: false, error: 'run_id and agent_name are required' });
      }
      let run = claimsByRun.get(run_id);
      if (!run) {
        run = new Map();
        claimsByRun.set(run_id, run);
      }
      // 先检测冲突
      const conflicts: string[] = [];
      for (const [, entry] of run) {
        const overlap = hasOverlap(paths, entry.paths);
        if (overlap) {
          conflicts.push(`${overlap} (已被 ${entry.agent} 占用)`);
        }
      }
      // 注册
      run.set(agent_name, {
        agent: agent_name,
        paths: new Set(paths.map(normalizePath)),
        registeredAt: Date.now(),
      });
      return ctx.resp({
        ok: true,
        agent: agent_name,
        registered_paths: paths,
        conflicts: conflicts.length > 0 ? conflicts : null,
        warning: conflicts.length > 0
          ? `⚠ 路径冲突！以下路径与已有 Agent 重叠：${conflicts.join('; ')}。请检查 batch 拆分是否正确。`
          : null,
      });
    });

  server.tool('file_claim_release',
    '【文件冲突防护】释放 Agent 的文件独占声明。Agent 完成后调用，解除其对文件的独占，允许后续 Agent 修改。',
    {
      run_id: z.string().describe('当前流水线 run ID'),
      agent_name: z.string().describe('要释放的 Agent 名称'),
    },
    async ({ run_id, agent_name }) => {
      const run = claimsByRun.get(run_id);
      if (!run) return ctx.resp({ ok: true, message: '该 run 无文件声明记录' });
      const existed = run.has(agent_name);
      run.delete(agent_name);
      return ctx.resp({
        ok: true,
        released: existed,
        message: existed ? `${agent_name} 文件声明已释放` : `未找到 ${agent_name} 的声明`,
        remaining_agents: [...run.keys()],
      });
    });

  server.tool('file_claim_check',
    '【文件冲突防护·预检查】在 spawn Agent 之前调用，检查计划的 allowed_paths 是否与已有 Agent 的独占路径冲突。返回冲突路径和占用者。',
    {
      run_id: z.string().describe('当前流水线 run ID'),
      paths: z.array(z.string()).describe('拟分配给 Agent 的文件路径列表'),
    },
    async ({ run_id, paths }) => {
      const run = claimsByRun.get(run_id);
      if (!run || run.size === 0) {
        return ctx.resp({ ok: true, conflict_free: true, message: '无已有声明，可以安全分配' });
      }
      const conflicts: { path: string; claimed_by: string }[] = [];
      for (const [agent, entry] of run) {
        const overlap = hasOverlap(paths, entry.paths);
        if (overlap) {
          conflicts.push({ path: overlap, claimed_by: agent });
        }
      }
      if (conflicts.length === 0) {
        return ctx.resp({ ok: true, conflict_free: true, message: '无冲突' });
      }
      return ctx.resp({
        ok: true,
        conflict_free: false,
        conflicts,
        warning: `⚠ 检测到 ${conflicts.length} 个路径冲突。同 Batch 内 Agent 不应共享文件。请调整 allowed_paths 或将冲突的 Agent 移到不同 Batch。`,
        suggestion: '调整目标路径或将该 Agent 延后到冲突 Agent 完成后的下一 Batch',
      });
    });
}
