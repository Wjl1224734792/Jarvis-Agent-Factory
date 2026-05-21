import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { ToolContext } from './types.js';
import { getPipeline, getCheckpoints, getActiveRun, saveFlowSkill, getFlowSkill, getFlowSkills } from '../db.js';
import { DEFAULT_PIPELINE, getPipelineGates, getPipelineName, findSessionGateArtifacts } from '../gates.js';

export function registerFlowTools(server: McpServer, db: DatabaseSync, root: string, ctx: ToolContext) {
  server.tool('session_export',
    '【流程导出】导出当前会话的流水线流程数据（Gate序列、Agent spawn记录、产物引用、时间线），用于生成可复用的Skill模板。',
    { run_id: z.string().optional() },
    async ({ run_id }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ error: 'session_id required. Call session_join first.' });
      const runId = run_id || getActiveRun(db, sid)?.id;
      const p = getPipeline(db, sid);
      const pt = p?.pipeline_type || DEFAULT_PIPELINE;
      const gateList = getPipelineGates(pt);
      const cps = gateList.map(g => ({
        gate: g,
        passed: getCheckpoints(db, g, sid).length > 0,
        artifacts: findSessionGateArtifacts(join(root, '.jarvis'), g, sid, db, runId),
      }));
      const events = db.prepare('SELECT * FROM session_events WHERE session_id=? ORDER BY created_at ASC').all(sid);
      const artifacts = runId ? db.prepare('SELECT * FROM artifacts WHERE run_id=? ORDER BY gate, created_at').all(runId) : [];
      return ctx.resp({
        session_id: sid,
        run_id: runId,
        pipeline_type: pt,
        pipeline_name: getPipelineName(pt),
        gate_sequence: gateList,
        gate_progress: cps,
        total_gates: gateList.length,
        completed_gates: cps.filter(c => c.passed).length,
        events: events || [],
        artifacts: artifacts || [],
        export_ready: (cps.filter(c => c.passed).length) >= 1,
      });
    });

  server.tool('flow_skill_save',
    '【流程保存】将导出的会话流程数据保存为可复用的 Skill 模板（存储到 flow_skills 表）。',
    {
      name: z.string().describe('Skill 名称，如 "my-release-flow"'),
      description: z.string().optional().describe('Skill 描述'),
      pipeline_type: z.string().optional().describe('流水线类型，默认使用当前会话的 pipeline_type'),
      gate_sequence: z.string().optional().describe('Gate序列JSON数组，默认使用当前会话的Gate序列'),
      agent_spawns: z.string().optional().describe('Agent spawn记录JSON数组'),
      skill_loads: z.string().optional().describe('Skill加载记录JSON数组'),
    },
    async ({ name, description, pipeline_type, gate_sequence, agent_spawns, skill_loads }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ error: 'session_id required. Call session_join first.' });
      if (!name || !/^[a-z0-9_-]+$/.test(name)) {
        return ctx.resp({ error: 'Invalid name. Use lowercase letters, numbers, hyphens, and underscores only.' });
      }
      const p = getPipeline(db, sid);
      const pt = pipeline_type || p?.pipeline_type || DEFAULT_PIPELINE;
      const gates = gate_sequence || JSON.stringify(getPipelineGates(pt));
      const id = saveFlowSkill(db, name, description || '', pt, gates, agent_spawns || '[]', skill_loads || '[]', sid);
      const skill = getFlowSkill(db, id);
      return ctx.resp({ saved: true, id, skill });
    });

  server.tool('flow_skill_list',
    '【流程列表】列出所有已保存的流程 Skill 模板。',
    {},
    async () => {
      const skills = getFlowSkills(db);
      return ctx.resp({ skills: skills || [], count: skills?.length || 0 });
    });
}
