/**
 * 会话归档 — 自动消费 session_events + working_memory → 生成摘要 → 写入 session-logs
 * 实现 OMC 风格"被动收集+自动注入"的跨会话知识传递
 */
import type { DatabaseSync } from 'node:sqlite';
import {
  getSessionEvents, getWorkingMemory, saveSessionContext,
  getRecentSessionContexts, pruneWorkingMemory,
} from './db.js';
import { saveSessionLog } from './session-log-store.js';

interface ArchiveResult {
  archived: boolean;
  summary: string;
  decisions: string[];
  pending: string[];
  wikiSlug?: string;
}

/**
 * 归档会话：消费事件日志 + 工作记忆 → 生成摘要 → 写入 session-logs + session_context 表
 */
export async function archiveSession(
  root: string,
  db: DatabaseSync,
  sessionId: string,
  runId: string,
  taskName?: string,
): Promise<ArchiveResult> {
  const events = getSessionEvents(db, sessionId, 100) as any[];
  const memories = getWorkingMemory(db, sessionId, 50) as any[];

  if (events.length === 0 && memories.length === 0) {
    return { archived: false, summary: '', decisions: [], pending: [] };
  }

  // 提取关键决策（gate_advance, run_aborted, run_completed 事件）
  const decisions: string[] = [];
  const gateTransitions: string[] = [];

  for (const e of events) {
    if (e.event_type === 'gate_advance') {
      gateTransitions.push(e.detail || `${e.gate}`);
    } else if (e.event_type === 'run_aborted' || e.event_type === 'pipeline_cancel') {
      decisions.push(`会话在 ${e.gate || '?'} 中止：${e.detail || ''}`);
    }
  }

  // 从 working_memory 提取发现和待办
  const pending: string[] = [];
  for (const m of memories) {
    if (m.category === 'decision') decisions.push(m.content);
    else if (m.category === 'blocker') pending.push(m.content);
    else if (m.category === 'discovery') decisions.push(`发现：${m.content}`);
  }

  const taskLabel = taskName || '(未命名任务)';
  const summary = [
    `## 会话归档：${taskLabel}`,
    `- 时间：${new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
    `- Gate 进度：${gateTransitions.length > 0 ? gateTransitions.join(' → ') : '未推进'}`,
    `- 事件数：${events.length}`,
    decisions.length > 0 ? `\n### 关键决策\n${decisions.map(d => `- ${d}`).join('\n')}` : '',
    pending.length > 0 ? `\n### 未完成事项\n${pending.map(p => `- ${p}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');

  // 写入 session_context 表
  saveSessionContext(db, sessionId, runId, summary, decisions, pending);

  // 写入 session-logs 目录（独立于 RepoWiki）
  try {
    const slug = `会话记录-${taskLabel.replace(/[^a-zA-Z0-9一-鿿-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 64)}`;
    const logContent = [
      '---',
      `title: "会话记录：${taskLabel}"`,
      'tags: ["session-log", "auto-archived"]',
      `created: "${new Date().toISOString()}"`,
      `updated: "${new Date().toISOString()}"`,
      'category: session-log',
      `session_id: "${sessionId}"`,
      '---',
      '',
      summary,
    ].join('\n');
    saveSessionLog(root, slug, logContent);
    return { archived: true, summary, decisions, pending, wikiSlug: slug };
  } catch {
    return { archived: true, summary, decisions, pending };
  }
}

/**
 * 获取会话上下文摘要 — 供 session_join 注入
 */
export function getSessionContextSummary(db: DatabaseSync, _root: string): string | null {
  const recentContexts = getRecentSessionContexts(db, 3) as any[];
  if (recentContexts.length === 0) return null;

  const parts: string[] = ['## 历史会话摘要\n'];
  for (const ctx of recentContexts) {
    const date = ctx.created_at?.slice(0, 10) || '?';
    parts.push(`### ${date} — ${ctx.summary?.split('\n')[0]?.replace('## 会话归档：', '') || '(归档)'}`);
    if (ctx.key_decisions) {
      try {
        const decs = JSON.parse(ctx.key_decisions);
        if (decs.length > 0) parts.push(`关键决策：${decs.slice(0, 3).join('；')}`);
      } catch { /* skip */ }
    }
    if (ctx.pending_items) {
      try {
        const pends = JSON.parse(ctx.pending_items);
        if (pends.length > 0) parts.push(`⚠ 未完成：${pends.slice(0, 3).join('；')}`);
      } catch { /* skip */ }
    }
    parts.push('');
  }
  return parts.join('\n');
}

/**
 * 清理过期记忆 — 应在 session_join 时调用
 */
export function cleanExpiredMemories(db: DatabaseSync): number {
  return pruneWorkingMemory(db);
}
