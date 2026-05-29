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

import { spawn } from 'child_process';
import { GATE_OPERATIONS } from './engine/gates.js';

const ENGINE_URL = process.env.JARVIS_ENGINE_URL || 'http://localhost:3456';
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

function tryStartEngine() {
  try {
    const child = spawn('jarvis', ['engine', 'start'], { detached: true, stdio: 'ignore' });
    child.on('error', () => {}); // 忽略 ENOENT 等异步错误
    child.unref();
  } catch { /* 启动失败不阻塞 */ }
}

async function api(path) {
  const r = await fetch(`${ENGINE_URL}${path}`);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

/** 最近心跳阈值（毫秒）：超过此时间无心跳的 session 视为僵尸，不计入 gate 执行 */
const RECENT_HEARTBEAT_MS = 600_000; // 10分钟

/** 从 pipeline 响应中解析出最相关的 session */
function pickSession(pipeline, explicitSid) {
  const sessions = pipeline.sessions || [];
  if (sessions.length === 0) return null;
  if (explicitSid) {
    return sessions.find(s => s.session_id === explicitSid) || null;
  }
  // 优先返回最近有活动的 active session
  const active = sessions.filter(s => s.status === 'active');
  if (active.length === 0) return null;
  // 有心跳数据的 session：过滤超过 10 分钟无心跳的僵尸 session
  const now = Date.now();
  const withHeartbeat = active.filter(s => s.heartbeat != null);
  if (withHeartbeat.length > 0) {
    const alive = withHeartbeat.filter(s => (now - s.heartbeat) < RECENT_HEARTBEAT_MS);
    return alive.length > 0 ? alive[0] : null;
  }
  // 无心跳数据（旧版引擎或测试 Mock）：回退到旧行为
  return active[0];
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
      if (!session) { process.exit(0); }
      const current = session.current_gate;
      if (current === 'Complete') { console.log('✅ All gates passed'); process.exit(0); }

      // 指定操作时：检查操作在当前 Gate 是否允许
      if (operation) {
        const ops = GATE_OPERATIONS[current] || { allow: [], deny: [] };
        if (ops.allow.includes(operation)) {
          console.log(`✅ ${current}: 操作 "${operation}" 允许执行 (${session.pipeline_name})`);
          process.exit(0);
        }
        console.error(`🚫 ${current}: 操作 "${operation}" 被禁止 (${session.pipeline_name})`);
        console.error(`  允许的操作: ${ops.allow.join(', ')}`);
        process.exit(2);
      }

      // 默认：无 --operation（如 Agent hook）→ 检查 spawn_impl 是否在允许列表中
      // 仅检查操作权限，不调用 enforce（与 MCP gate_check 行为一致）
      const ops = GATE_OPERATIONS[current] || { allow: [], deny: [] };
      if (ops.allow.includes('spawn_impl')) {
        console.log(`✅ ${current}: spawn_impl 允许执行 (${session.pipeline_name})`);
        process.exit(0);
      } else {
        console.error(`🚫 ${current}: Agent spawn 被禁止 (${session.pipeline_name})`);
        console.error(`  允许的操作: ${ops.allow.join(', ')}`);
        process.exit(2);
      }
    } catch {
      console.error('⚠️  Jarvis Engine is NOT running. Gate enforcement is INACTIVE.');
      tryStartEngine();
      process.exit(0);
    }
  }

  else if (sub === 'gate-advance') {
    // 解析 --gate 参数（TASK-002: advance_gate 工具指定目标 Gate）
    const gIdx = args.indexOf('--gate');
    const targetGate = gIdx >= 0 ? args[gIdx + 1] : null;
    try {
      const pipeline = await api('/api/pipeline');
      const session = pickSession(pipeline, sessionId);
      if (!session) { process.exit(0); }
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
      else { console.error(`🚫 BLOCKED — ${g.error} (${session.pipeline_name})`); process.exit(2); }
    } catch {
      console.error('⚠️  Jarvis Engine is NOT running. Cannot advance gate.');
      tryStartEngine();
      process.exit(0);
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
        let hasIncomplete = false;
        for (const s of sessions) {
          const badge = s.status === 'active' ? '🟢' : '⚪';
          const task = s.task_name ? ` · ${s.task_name}` : '';
          console.log(`  ${badge} ${s.pipeline_name} · ${s.current_gate} · ${s.platform || '?'}${task}`);
          // 检测未完成的活跃流水线：current_gate 不是 Complete / Gate E 且状态为 active
          if (s.status === 'active' && s.current_gate !== 'Complete' && s.current_gate !== 'Gate E') {
            hasIncomplete = true;
          }
        }
        if (hasIncomplete) {
          console.log('\n⚠️  存在未完成的活跃流水线。输入 /cancel 中止或继续推进到 Gate E 完成发布。');
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
          body: JSON.stringify({ agent_id: agentId, model, effort: effort }),
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
          console.log(`  ${a.id.padEnd(24)} ${(a.model || '?').padEnd(20)} ${a.effort || ''}`);
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
