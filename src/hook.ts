/**
 * jarvis hook — Called by Claude Code / OpenCode / Codex hooks.
 * Uses engine REST API (bypasses MCP transport).
 *
 *   jarvis hook gate-check [--operation <op>] [--session <id>]
 *   jarvis hook gate-advance [--gate <gate>] [--session <id>]
 *   jarvis hook status [--json] [--session <id>]
 *   jarvis hook report-status [--json] [--session <id>]
 *   jarvis hook agent-config [--agent-id <id>] [--model <model>] [--effort <effort>]
 */

import { GATE_OPERATIONS } from './engine/gates.js';

const ENGINE_URL = process.env.JARVIS_ENGINE_URL || 'http://localhost:3456';
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

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
    // 解析 --operation 参数（TASK-002: gate_check 工具支持按操作类型检查）
    const opIdx = args.indexOf('--operation');
    const operation = opIdx >= 0 ? args[opIdx + 1] : null;
    try {
      const pipeline = await api('/api/pipeline');
      const session = pickSession(pipeline, sessionId);
      if (!session) { console.log('⚠️  No sessions found'); process.exit(2); }
      const current = session.current_gate;
      if (current === 'Complete') { console.log('✅ All gates passed'); process.exit(0); }

      // 指定操作时：检查操作在当前 Gate 是否允许
      if (operation) {
        const ops = GATE_OPERATIONS[current] || { allow: [], deny: [] };
        if (ops.allow.includes(operation)) {
          console.log(`✅ ${current}: 操作 "${operation}" 允许执行 (${session.pipeline_name})`);
          process.exit(0);
        }
        console.log(`🚫 ${current}: 操作 "${operation}" 被禁止 (${session.pipeline_name})`);
        console.log(`  允许的操作: ${ops.allow.join(', ')}`);
        process.exit(1);
      }

      // 默认：检查 Gate 条件
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
    // 解析 --gate 参数（TASK-002: advance_gate 工具指定目标 Gate）
    const gIdx = args.indexOf('--gate');
    const targetGate = gIdx >= 0 ? args[gIdx + 1] : null;
    try {
      const pipeline = await api('/api/pipeline');
      const session = pickSession(pipeline, sessionId);
      if (!session) { console.log('⚠️  No sessions found'); process.exit(2); }
      const r = await fetch(`${ENGINE_URL}/api/gate/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gate: targetGate || session.current_gate, session_id: session.session_id }),
      });
      const g = await r.json();
      if (g.allowed) {
        console.log(`🚀 ${g.previous || session.current_gate} → ${g.current}${g.next ? ` (next: ${g.next})` : ''}`);
        process.exit(0);
      }
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

  else if (sub === 'report-status') {
    // TASK-002: report_status 工具 — 流水线完整报告
    try {
      const pipeline = await api('/api/pipeline');
      const sessions = pipeline.sessions || [];
      if (args.includes('--json')) {
        console.log(JSON.stringify({ sessions, timestamp: new Date().toISOString() }, null, 2));
        process.exit(0);
      }
      if (sessions.length === 0) {
        console.log('📊 暂无可报告的流水线会话');
        process.exit(0);
      }
      for (const s of sessions) {
        const passed = s.gates?.filter((g: any) => g.passed).length || 0;
        const total = s.gates?.length || 0;
        const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
        const badge = s.status === 'active' ? '🟢' : '⚪';
        console.log(`${badge} ${s.pipeline_name} · ${s.current_gate} · 进度 ${passed}/${total} (${pct}%)`);
        if (s._display) console.log(s._display);
      }
      process.exit(0);
    } catch {
      console.log('Engine: not running. Start with: jarvis engine start');
      process.exit(0);
    }
  }

  else if (sub === 'agent-config') {
    // TASK-002: agent_config 工具 — 查询/设置 Agent 模型与思考等级
    const aidx = args.indexOf('--agent-id');
    const agentId = aidx >= 0 ? args[aidx + 1] : null;
    const midx = args.indexOf('--model');
    const model = midx >= 0 ? args[midx + 1] : null;
    const eidx = args.indexOf('--effort');
    const effort = eidx >= 0 ? args[eidx + 1] : null;

    try {
      if (agentId && model) {
        // 设置模式：POST /api/agents
        const r = await fetch(`${ENGINE_URL}/api/agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agentId, model, effort: effort || 'high' }),
        });
        if (!r.ok) {
          console.log(`❌ 设置失败: HTTP ${r.status} ${r.statusText}`);
          process.exit(1);
        }
        const g = await r.json();
        if (g.ok) {
          console.log(`✅ Agent "${agentId}": 模型=${g.model}, 思考等级=${g.effort}`);
          process.exit(0);
        }
        console.log(`❌ ${g.error || '设置失败'}`);
        process.exit(1);
      }

      // 查询模式：GET /api/agents
      const query = agentId ? `?agent_id=${encodeURIComponent(agentId)}` : '';
      const r = await fetch(`${ENGINE_URL}/api/agents${query}`);
      if (!r.ok) {
        console.log(`❌ 查询失败: HTTP ${r.status}`);
        process.exit(1);
      }
      const data = await r.json();
      const agents = data.agents || [];

      if (agentId) {
        const a = agents.find((x: any) => x.id === agentId);
        if (a) {
          console.log(JSON.stringify({ id: a.id, name: a.name, model: a.model, effort: a.effort, is_custom: a.is_custom }));
        } else {
          console.log(`⚠️ Agent "${agentId}" 未找到`);
          process.exit(1);
        }
      } else {
        console.log(`智能体数量: ${agents.length}`);
        console.log(`可用模型: ${(data.available_models || []).join(', ')}`);
        console.log(`可用思考等级: ${(data.available_efforts || EFFORTS).join(', ')}`);
        for (const a of agents) {
          console.log(`  ${a.id.padEnd(24)} ${(a.model || '?').padEnd(20)} ${a.effort || 'high'}`);
        }
      }
      process.exit(0);
    } catch {
      console.log('Engine: not running. Start with: jarvis engine start');
      process.exit(0);
    }
  }

  else {
    console.log('Usage: jarvis hook <gate-check|gate-advance|status|report-status|agent-config> [--json] [--session <id>] [--operation <op>] [--gate <gate>] [--agent-id <id>] [--model <model>] [--effort <effort>]');
    process.exit(0);
  }
}
