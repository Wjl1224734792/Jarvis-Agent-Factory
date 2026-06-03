import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DatabaseSync } from 'node:sqlite';
import type { ToolContext } from './types.js';
import { getAgentConfig, setAgentModel } from '../db.js';
import { getAgentList, getAgentModelValues, getSkillList, getSkillNames } from '../agent-registry.js';
import { resolvePlatformInfo } from '../platform-info.js';

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

export function registerAgentTools(server: McpServer, db: DatabaseSync, root: string, ctx: ToolContext) {
  server.tool('agent_config', 'Agent模型+思考等级配置。',
    { agent_id: z.string().optional(), model: z.string().optional(), effort: z.string().optional() },
    async ({ agent_id, model, effort }) => {
      if (agent_id && model) {
        setAgentModel(db, agent_id, model, effort || 'high');
        return ctx.resp({ ok: true, agent_id, model, effort: effort || 'high' });
      }
      const cfg = getAgentConfig(db);
      const agents = getAgentList(true, root);
      return ctx.resp({
        agents: agents.map(a => {
          const c = cfg[a.id];
          return {
            id: a.id, name: a.name, role: a.role, platform: a.platform,
            model: c?.model || a.defaultModel,
            effort: c?.effort || a.defaultEffort || 'high',
            is_custom: !!c,
          };
        }),
        available_models: getAgentModelValues(),
        available_efforts: EFFORTS,
      });
    });

  server.tool('platform_info',
    '获取平台信息：当前仅支持 claude 平台，返回 Agent 数量、可用模型列表、平台特性（commands）。用于引擎扩展和平台适配。',
    { platform: z.string().optional().describe('指定平台名称（claude），不传则返回全部平台信息') },
    async ({ platform }) => {
      const result = resolvePlatformInfo(platform);
      return ctx.resp(result);
    });

  server.tool('skill_list',
    '【技能列表】列出所有可用技能（三层动态发现：模板默认 → 全局用户 → 项目级）。返回技能ID、名称、描述、来源、版本等。',
    {
      platform: z.string().optional().describe('按平台过滤'),
      source: z.string().optional().describe('按来源过滤: template | global | project'),
    },
    async ({ platform, source }) => {
      const skills = getSkillList(true, root);
      let list = [...skills];
      if (platform) list = list.filter(s => s.platform === platform);
      if (source) list = list.filter(s => (s.source || 'template') === source);
      return ctx.resp({
        skills: list.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          platform: s.platform,
          version: s.version,
          updated: s.updated,
          source: s.source,
          category: s.category,
        })),
        available_names: getSkillNames(),
        total_count: skills.length,
      });
    });
}
