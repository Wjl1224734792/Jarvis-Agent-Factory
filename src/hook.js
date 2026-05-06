/**
 * jarvis hook — Platform hook integration
 * Called by Claude Code / OpenCode / Codex hooks to enforce gate discipline.
 *
 * Usage:
 *   jarvis hook gate-check [--gate Gate A]   Check current gate (exit 1 if blocked)
 *   jarvis hook gate-advance [--gate Gate B]  Advance to next gate (if conditions met)
 *   jarvis hook status [--json]              Show pipeline status
 */

const ENGINE_URL = process.env.JARVIS_ENGINE_URL || 'http://localhost:3456';

async function callEngine(tool, args = {}) {
  const r = await fetch(`${ENGINE_URL}/mcp`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool, arguments: args } }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return JSON.parse(j.result.content[0].text);
}

export async function hookCommand(args) {
  const sub = args[0];

  if (sub === 'gate-check') {
    const gate = args.find(a => a.startsWith('--gate='))?.split('=')[1];
    try {
      const result = await callEngine('gate_enforce', gate ? { gate } : {});
      if (result.allowed) {
        console.log(`✅ ${result.gate} — OK`);
        process.exit(0);
      } else {
        console.log(`🚫 GATE BLOCKED: ${result.gate}`);
        for (const r of (result.blocked_reasons || [])) console.log(`   • ${r}`);
        console.log(`   Required: ${result.action_required}`);
        process.exit(1);
      }
    } catch (e) {
      console.error(`⚠ Engine unreachable at ${ENGINE_URL}: ${e.message}`);
      process.exit(0); // Don't block if engine is down
    }
  }

  else if (sub === 'gate-advance') {
    const gate = args.find(a => a.startsWith('--gate='))?.split('=')[1];
    try {
      const status = await callEngine('pipeline_status');
      const target = gate || GATE_NEXT[status.current_gate];
      if (!target) { console.log('Pipeline complete.'); process.exit(0); }
      const result = await callEngine('advance_gate', { gate: target });
      if (result.allowed) {
        console.log(`🚀 ${result.message || `Advanced to ${result.current_gate}`}`);
        process.exit(0);
      } else {
        console.log(`🚫 FSM BLOCKED: ${result.error}`);
        process.exit(1);
      }
    } catch (e) {
      console.error(`⚠ Engine unreachable: ${e.message}`);
      process.exit(0);
    }
  }

  else if (sub === 'status') {
    const jsonFlag = args.includes('--json');
    try {
      const result = await callEngine('pipeline_status');
      if (jsonFlag) { console.log(JSON.stringify(result, null, 2)); }
      else { console.log(result._display || `${result.current_gate} — ${result.completed.length}/${GATES_ALL.length} gates passed`); }
      process.exit(0);
    } catch (e) {
      console.error(`⚠ Engine unreachable: ${e.message}`);
      process.exit(0);
    }
  }

  else {
    console.log('Usage: jarvis hook <gate-check|gate-advance|status> [--gate=X] [--json]');
    process.exit(0);
  }
}

const GATE_NEXT = { 'Gate A':'Gate B','Gate B':'Gate C','Gate C':'Gate C1','Gate C1':'Gate C1.5','Gate C1.5':'Gate C2','Gate C2':'Gate D','Gate D':'Gate E','Gate E':null };
const GATES_ALL = Object.keys(GATE_NEXT);
