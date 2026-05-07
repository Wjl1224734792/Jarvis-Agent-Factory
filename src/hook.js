/**
 * jarvis hook — Called by Claude Code / OpenCode / Codex hooks.
 * Uses engine REST API (bypasses MCP transport).
 *
 *   jarvis hook gate-check        Check current gate (exit 1 if blocked)
 *   jarvis hook gate-advance       Advance to next gate
 *   jarvis hook status [--json]    Pipeline status
 */

const ENGINE_URL = process.env.JARVIS_ENGINE_URL || 'http://localhost:3456';

async function api(path) {
  const r = await fetch(`${ENGINE_URL}${path}`);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

export async function hookCommand(args) {
  const sub = args[0];

  if (sub === 'gate-check') {
    try {
      const p = await api('/api/pipeline');
      const current = p.current_gate;
      const g = await api(`/api/gate/${encodeURIComponent(current)}/enforce`);
      if (g.allowed) { console.log(`✅ ${current} — OK`); process.exit(0); }
      else { console.log(`🚫 ${current} BLOCKED — ${g.required}`); process.exit(1); }
    } catch (e) {
      // Engine not running — warn loudly so user knows enforcement is absent
      console.error(`\n⚠️  Jarvis Engine is NOT running. Gate enforcement is INACTIVE.`);
      console.error(`   Start it: jarvis engine start\n`);
      process.exit(2); // Exit 2 = block (Claude Code treats exit 2 as feedback)
    }
  }

  else if (sub === 'gate-advance') {
    try {
      const r = await fetch(`${ENGINE_URL}/api/gate/advance`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const g = await r.json();
      if (g.allowed) { console.log(`🚀 ${g.previous} → ${g.current}${g.next ? ` (next: ${g.next})` : ''}`); process.exit(0); }
      else { console.log(`🚫 BLOCKED — ${g.error}`); process.exit(1); }
    } catch (e) {
      console.error(`\n⚠️  Jarvis Engine is NOT running. Cannot advance gate.`);
      console.error(`   Start it: jarvis engine start\n`);
      process.exit(2);
    }
  }

  else if (sub === 'status') {
    try {
      const p = await api('/api/pipeline');
      if (args.includes('--json')) console.log(JSON.stringify(p, null, 2));
      else console.log(p._display || `${p.current_gate}`);
      process.exit(0);
    } catch (e) {
      console.log('Engine: not running. Start with: jarvis engine start');
      process.exit(0);
    }
  }

  else {
    console.log('Usage: jarvis hook <gate-check|gate-advance|status> [--json]');
    process.exit(0);
  }
}
