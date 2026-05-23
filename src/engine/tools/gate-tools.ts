import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DatabaseSync } from 'node:sqlite';
import type { ToolContext } from './types.js';
import { getPipeline, getActiveRun } from '../db.js';
import { GATE_CHECKS, GATE_CONFIG, DEFAULT_PIPELINE, getPipelineName, getGateOperations, getGateAgentGuide, getGateTeamStrategy } from '../gates.js';
import { sessionGates } from './shared.js';

export function registerGateTools(server: McpServer, db: DatabaseSync, root: string, ctx: ToolContext) {
  server.tool('gate_check',
    '【硬约束·操作前检查】在执行关键操作（写代码/生成Agent/测试/构建/审查/部署）之前调用。返回该操作在当前Gate是否被允许，以及被阻止的原因和下一步指引。',
    {
      operation: z.enum([
        'read', 'write_doc', 'write_code', 'sweep_arch',
        'spawn_impl', 'spawn_test', 'lint', 'build', 'preview',
        'review', 'audit', 'deploy', 'fix',
      ]).describe('要执行的操作类型'),
      run_id: z.string().optional(),
    },
    async ({ operation, run_id }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ error: 'session_id required. Call session_join first.' });
      const runId = run_id || getActiveRun(db, sid)?.id;
      const p = getPipeline(db, sid);
      const gateList = sessionGates(db, sid);
      const cur = p?.current_gate || gateList[0];
      if (!GATE_CONFIG[cur]) {
        return ctx.resp({
          allowed: false, gate: cur, operation, session_id: sid, run_id: runId,
          blocked_reasons: [`未知 Gate: "${cur}" 不在 GATE_CONFIG 中。有效 Gate: ${gateList.join(', ')}`],
          error: `Unknown gate: ${cur}`,
        });
      }
      const ops = getGateOperations(cur);
      const allowed = ops.allow.includes(operation);
      if (allowed) return ctx.resp({ allowed: true, gate: cur, operation, session_id: sid, run_id: runId, message: `${operation} 在 ${cur} 允许执行` });
      return ctx.resp({
        allowed: false, gate: cur, operation, session_id: sid, run_id: runId,
        blocked_reasons: [
          `操作 "${operation}" 在 ${cur} 不被允许`,
          `允许的操作: ${ops.allow.join(', ')}`,
          `下一步: ${GATE_CHECKS[cur]?.check || '完成当前Gate条件'}`,
        ],
        allowed_operations: ops.allow,
        next_step: GATE_CHECKS[cur]?.check || '',
      });
    });

  server.tool('pipeline_guide',
    '【硬约束·流程指引】返回当前Gate的完整上下文：允许/禁止的操作、可生成的Agent类型、下一步行动指南。在不确定下一步做什么时调用。',
    { run_id: z.string().optional() },
    async ({ run_id }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ error: 'session_id required. Call session_join first.' });
      const runId = run_id || getActiveRun(db, sid)?.id;
      const p = getPipeline(db, sid);
      const gateList = sessionGates(db, sid);
      const cur = p?.current_gate || gateList[0];
      const ci = gateList.indexOf(cur);
      const ops = getGateOperations(cur);
      const agentGuide = getGateAgentGuide(cur);
      return ctx.resp({
        session_id: sid, gate: cur, gate_index: ci + 1, total_gates: gateList.length,
        pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE,
        pipeline_name: getPipelineName(p?.pipeline_type || DEFAULT_PIPELINE),
        run_id: runId,
        allowed_operations: ops.allow, forbidden_operations: ops.deny,
        agent_spawn: agentGuide || { can_spawn: [], note: '未知Gate' },
        team_strategy: getGateTeamStrategy(cur),
        agent_mode: getGateTeamStrategy(cur) === 'prefer_team' ? '推荐使用 Agent Team(TeamCreate) 并行调度,轻量任务用 Agent 工具(spawn agent)' : '使用 Agent 工具(spawn subagent)',
        team_rules: agentGuide?.team_rules || '团队成员按模块/区域独立,禁止共享文件或模块',
        gate_requirement: GATE_CHECKS[cur]?.check || '',
        next_gate: gateList[ci + 1] || 'Complete',
        previous_gate: ci > 0 ? gateList[ci - 1] : null,
        fix_loop: (cur === 'Gate C1' || cur === 'Gate C1.5' || cur === 'Gate C2' || cur === 'Gate D')
          ? '当前Gate支持修复回退循环，最多2轮。调用 gate_check("fix") 确认修复操作已允许。' : null,
      });
    });
}
