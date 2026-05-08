/**
 * jarvis hook — Called by Claude Code / OpenCode / Codex hooks.
 * Uses engine REST API (bypasses MCP transport).
 *
 *   jarvis hook gate-check [--session <id>]   Check current gate (exit 1 if blocked)
 *   jarvis hook gate-advance [--session <id>]  Advance to next gate
 *   jarvis hook status [--json]                Pipeline status
 */

const ENGINE_URL = process.env.JARVIS_ENGINE_URL || 'http://localhost:3456';

async function api(path) {
  const r = await fetch(`${ENGINE_URL}${path}`);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

/** 从 pipeline 响应中解析出最相关的 session */
function pickSession(pipeline, explicitSid) {
  const sessions = pipeline.sessions || [];
  if (sessions.length === 0) return null;
  if (explicitSid) {
    return sessions.find(s => s.session_id === explicitSid) || null;
  }
  // 优先返回 active session，其次返回第一个
  const active = sessions.filter(s => s.status === 'active');
  return active[0] || sessions[0];
}

export async function hookCommand(args) {
  const sub = args[0];
  // 解析 --session <id> 参数
  const sidIdx = args.indexOf('--session');
  const sessionId = sidIdx >= 0 ? args[sidIdx + 1] : null;

  if (sub === 'gate-check') {
    try {
      const pipeline = await api('/api/pipeline');
      const session = pickSession(pipeline, sessionId);
      if (!session) { console.log('⚠️  No sessions found'); process.exit(2); }
      const current = session.current_gate;
      if (current === 'Complete') { console.log('✅ All gates passed'); process.exit(0); }
      const g = await api(`/api/gate/${encodeURIComponent(current)}/enforce?session_id=${session.session_id}`);
      if (g.allowed) { console.log(`✅ ${current} — OK (${session.pipeline_name})`); process.exit(0); }
      else { console.log(`🚫 ${current} BLOCKED — ${g.artifacts?.length ? 'missing artifacts' : 'checkpoint required'} (${session.pipeline_name})`); process.exit(1); }
    } catch {
      console.error(`\n⚠️  Jarvis Engine is NOT running. Gate enforcement is INACTIVE.`);
      console.error(`   Start it: jarvis engine start\n`);
      process.exit(2);
    }
  }

  else if (sub === 'gate-advance') {
    try {
      const pipeline = await api('/api/pipeline');
      const session = pickSession(pipeline, sessionId);
      if (!session) { console.log('⚠️  No sessions found'); process.exit(2); }
      const r = await fetch(`${ENGINE_URL}/api/gate/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gate: session.current_gate, session_id: session.session_id }),
      });
      const g = await r.json();
      if (g.allowed) { console.log(`🚀 ${g.previous || session.current_gate} → ${g.current}${g.next ? ` (next: ${g.next})` : ''}`); process.exit(0); }
      else { console.log(`🚫 BLOCKED — ${g.error} (${session.pipeline_name})`); process.exit(1); }
    } catch {
      console.error(`\n⚠️  Jarvis Engine is NOT running. Cannot advance gate.`);
      console.error(`   Start it: jarvis engine start\n`);
      process.exit(2);
    }
  }

  else if (sub === 'status') {
    try {
      const pipeline = await api('/api/pipeline');
      const sessions = pipeline.sessions || [];
      if (args.includes('--json')) {
        console.log(JSON.stringify(pipeline, null, 2));
      } else if (sessions.length === 0) {
        console.log('Engine: running, no sessions');
      } else {
        console.log(`Engine: ${sessions.length} session(s), ${pipeline.active_count || sessions.filter(s => s.status === 'active').length} active\n`);
        for (const s of sessions) {
          const badge = s.status === 'active' ? '🟢' : '⚪';
          const task = s.task_name ? ` · ${s.task_name}` : '';
          console.log(`  ${badge} ${s.pipeline_name} · ${s.current_gate} · ${s.platform || '?'}${task}`);
        }
      }
      process.exit(0);
    } catch {
      console.log('Engine: not running. Start with: jarvis engine start');
      process.exit(0);
    }
  }

  else {
    console.log('Usage: jarvis hook <gate-check|gate-advance|status> [--json] [--session <id>]');
    process.exit(0);
  }
}
