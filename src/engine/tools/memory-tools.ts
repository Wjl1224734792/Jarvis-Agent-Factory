import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { ToolContext } from './types.js';
import {
  addWorkingMemory, getWorkingMemory, queryWorkingMemory,
  getActiveRun, getRecentSessionContexts, getSessionContext,
} from '../db.js';
import { archiveSession, getSessionContextSummary, cleanExpiredMemories } from '../session-archive.js';

const PRIORITY_FILE = '.jarvis/priority-context.md';

function getPriorityFile(root: string) { return join(root, PRIORITY_FILE); }
function readPriorityContext(root: string): string | null {
  const fp = getPriorityFile(root);
  return existsSync(fp) ? readFileSync(fp, 'utf-8').trim() || null : null;
}
function writePriorityContext(root: string, content: string) {
  writeFileSync(getPriorityFile(root), content, 'utf-8');
}

export function getPriorityContextForInjection(root: string): string | null {
  return readPriorityContext(root);
}

export function registerMemoryTools(server: McpServer, db: DatabaseSync, root: string, ctx: ToolContext) {
  server.tool('working_memory_add',
    '【短期记忆】记录流水线执行中的关键事件。支持分类（decision/discovery/blocker/progress），默认 7 天 TTL。',
    {
      content: z.string().describe('记忆内容'),
      category: z.enum(['decision', 'discovery', 'blocker', 'progress', 'general']).optional().describe('分类，默认 general'),
      ttl_days: z.number().optional().describe('过期天数，默认 7 天'),
    },
    async ({ content, category, ttl_days }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ ok: false, error: 'session_id required. Call session_join first.' });
      const run = getActiveRun(db, sid);
      addWorkingMemory(db, sid, content, {
        runId: run?.id,
        category: category || 'general',
        ttlDays: ttl_days,
      });
      return ctx.resp({ ok: true, session_id: sid, category: category || 'general' });
    });

  server.tool('working_memory_query',
    '【短期记忆】查询当前会话或关键字匹配的工作记忆。',
    {
      query: z.string().optional().describe('搜索关键词，不传则返回当前会话的最近记忆'),
      limit: z.number().optional().describe('返回条数上限，默认 20'),
    },
    async ({ query, limit }, extra) => {
      const sid = ctx.resolveSid(extra);
      if (query) {
        const results = queryWorkingMemory(db, query, limit || 20) as any[];
        return ctx.resp({ results, count: results.length, query });
      }
      if (!sid) return ctx.resp({ ok: false, error: 'session_id required. Call session_join first.' });
      const results = getWorkingMemory(db, sid, limit || 20) as any[];
      return ctx.resp({ results, count: results.length, session_id: sid });
    });

  server.tool('session_context',
    '【会话上下文】获取历史会话摘要，当前会话的上下文注入。调用 session_join 时自动加载。',
    {},
    async (_args, extra) => {
      const sid = ctx.resolveSid(extra);
      cleanExpiredMemories(db);
      const summary = getSessionContextSummary(db, root);
      const recentCtx = getRecentSessionContexts(db, 3) as any[];
      const myCtx = sid ? getSessionContext(db, sid) : null;
      return ctx.resp({
        has_context: !!summary,
        context_summary: summary,
        recent_archives: recentCtx.map((c: any) => ({
          session_id: c.session_id,
          summary_preview: c.summary?.slice(0, 200) || '',
          pending_items: (() => { try { return JSON.parse(c.pending_items || '[]'); } catch { return []; } })(),
          created_at: c.created_at,
        })),
        current_session_archive: myCtx ? {
          summary: (myCtx as any).summary,
          key_decisions: (() => { try { return JSON.parse((myCtx as any).key_decisions || '[]'); } catch { return []; } })(),
          pending_items: (() => { try { return JSON.parse((myCtx as any).pending_items || '[]'); } catch { return []; } })(),
        } : null,
      });
    });

  server.tool('session_archive',
    '【会话归档】手动触发当前会话的事件归档到 repowiki。通常由 advance_gate(最终Gate) 或 pipeline_cancel 自动触发。',
    {},
    async (_args, extra) => {
      const sid = ctx.resolveSid(extra);
      if (!sid) return ctx.resp({ ok: false, error: 'session_id required. Call session_join first.' });
      const run = getActiveRun(db, sid);
      if (!run) return ctx.resp({ ok: false, error: 'No active run to archive.' });
      const result = await archiveSession(root, db, sid, run.id, (run as any).task_name);
      return ctx.resp({
        ok: result.archived,
        session_id: sid,
        run_id: run.id,
        summary: result.summary,
        decisions: result.decisions,
        pending: result.pending,
        wiki_slug: result.wikiSlug || null,
      });
    });

  server.tool('jarvis_priority_context',
    '【优先上下文】读取或设置项目级永久优先上下文。Set 的内容会在每次 session_join 时自动注入到 context_summary。类似 OMC notepad 的 Priority Context。',
    {
      action: z.enum(['get', 'set', 'clear']).describe('get=读取, set=写入(覆盖), clear=清除'),
      content: z.string().optional().describe('要设置的上下文内容（仅 set 时需要）'),
    },
    async ({ action, content }) => {
      if (action === 'get') {
        const text = readPriorityContext(root);
        return ctx.resp({ ok: true, has_content: !!text, content: text || null });
      }
      if (action === 'set') {
        if (!content || !content.trim()) return ctx.resp({ ok: false, error: 'content required for set action' });
        writePriorityContext(root, content.trim());
        return ctx.resp({ ok: true, action: 'set', message: `Priority context saved (${content.trim().length} chars). Will be injected on next session_join.` });
      }
      if (action === 'clear') {
        const fp = getPriorityFile(root);
        if (existsSync(fp)) unlinkSync(fp);
        return ctx.resp({ ok: true, action: 'clear', message: 'Priority context cleared.' });
      }
      return ctx.resp({ ok: false, error: `Unknown action: ${action}` });
    });
}
