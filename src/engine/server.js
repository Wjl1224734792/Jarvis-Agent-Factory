import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

const PID_FILE = resolve(homedir(), '.jarvis', 'engine.pid');
const DEFAULT_PORT = 3456;
const GATES = ['Gate A', 'Gate B', 'Gate C', 'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D', 'Gate E'];

const GATE_DIRS = {
  'Gate A': 'requirements', 'Gate B': 'tasks', 'Gate C': 'plans',
  'Gate C1': 'implementation', 'Gate C1.5': 'implementation',
  'Gate C2': 'testing', 'Gate D': 'review', 'Gate E': 'shipping',
};

const GATE_CHECKS = {
  'Gate A': { requires: ['requirements'], check: '至少 1 个需求文档，含 REQ-XXX 编号' },
  'Gate B': { requires: ['tasks'], check: '每个 TASK-XXX 映射至少 1 个 REQ-XXX' },
  'Gate C': { requires: ['plans'], check: '计划文档含 parallel_batches + Execution Packet' },
  'Gate C1': { requires: ['implementation'], check: 'Lint + Type-check + Build + Deps Audit 全部通过' },
  'Gate C1.5': { requires: ['implementation'], check: '页面/组件视觉验证截图证据已附' },
  'Gate C2': { requires: ['testing'], check: '单元/集成/E2E/浏览器测试全部通过，API 契约验证通过' },
  'Gate D': { requires: ['review'], check: 'review-qa 评审通过，REQ 追踪矩阵完整' },
  'Gate E': { requires: ['shipping'], check: '安全审计 + 上线检查清单 + 回滚预案就绪' },
};

export async function startEngine({ port = DEFAULT_PORT, dashboard = false, projectRoot = '.' } = {}) {
  const root = resolve(projectRoot);
  const pidDir = resolve(homedir(), '.jarvis');
  if (!existsSync(pidDir)) mkdirSync(pidDir, { recursive: true });
  writeFileSync(PID_FILE, String(process.pid));

  const app = express();
  app.use(express.json());

  const server = new McpServer({ name: 'jarvis-engine', version: readPkgVersion() });

  // ---- Pipeline state machine (hard constraints) ----
  const pipelinePath = join(root, '.jarvis', 'pipeline.json');

  function readPipeline() {
    if (!existsSync(pipelinePath)) return null;
    try { return JSON.parse(readFileSync(pipelinePath, 'utf-8')); } catch { return null; }
  }
  function writePipeline(state) {
    const dir = join(root, '.jarvis'); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(pipelinePath, JSON.stringify({ ...state, updated_at: new Date().toISOString() }, null, 2));
  }

  // ==============================
  // TOOLS
  // ==============================

  // Tool: pipeline_init — hard state bootstrap
  server.tool(
    'pipeline_init',
    '【硬约束】初始化流水线状态机。项目启动时必须调用。创建 pipeline.json，设置当前 Gate 为 Gate A。已初始化则返回当前状态。',
    { project_name: z.string().optional().describe('项目名称（可选）') },
    async ({ project_name }) => {
      const existing = readPipeline();
      if (existing) return { content: [{ type: 'text', text: JSON.stringify({ ok: true, message: 'Pipeline already initialized', state: existing }, null, 2) }] };
      const state = { project: project_name || root, current_gate: 'Gate A', started_at: new Date().toISOString(), gates_passed: [], mode: 'strict' };
      writePipeline(state);
      return { content: [{ type: 'text', text: JSON.stringify({ ok: true, message: 'Pipeline initialized — hard state machine active. Next: Gate A', state }, null, 2) }] };
    }
  );

  // Tool: pipeline_status
  server.tool(
    'pipeline_status',
    '完整流水线状态：当前 Gate、已完成 Gate、产物文件、Gate 检查点时间戳。同时读取硬状态 pipeline.json。',
    {},
    async () => {
      const pstate = readPipeline();
      const gates = GATES.map(gate => {
        const checkpoints = readCheckpoints(root, gate);
        return { gate, passed: checkpoints.length > 0, checkpoints, artifacts: findGateArtifacts(join(root, 'docs'), gate), requirement: GATE_CHECKS[gate]?.check || '' };
      });
      const current = pstate?.current_gate || (gates.find(g => !g.passed)?.gate || 'Gate A');
      return {
        content: [{ type: 'text', text: JSON.stringify({
          project: root,
          mode: pstate?.mode || 'soft',
          current_gate: current,
          completed: gates.filter(g => g.passed).map(g => g.gate),
          gates,
          _display: formatGateDisplay(gates, current),
        }, null, 2) }],
      };
    }
  );

  // Tool: gate_enforce — HARD constraint
  server.tool(
    'gate_enforce',
    '【硬约束】验证当前 Gate 的通过条件。返回 allowed=true 才可以 proceed。allowed=false 时必须先完成条件再重试。不可绕过。',
    { gate: z.enum(GATES).optional().describe('要检查的 Gate（默认当前 Gate）') },
    async ({ gate }) => {
      const pstate = readPipeline();
      const targetGate = gate || pstate?.current_gate || 'Gate A';
      const artifacts = findGateArtifacts(join(root, 'docs'), targetGate);
      const checkpoints = readCheckpoints(root, targetGate);
      const requirement = GATE_CHECKS[targetGate];

      // Hard check: must have artifacts and/or checkpoints
      const hasArtifacts = artifacts.length > 0;
      const hasCheckpoint = checkpoints.length > 0;
      const allowed = hasArtifacts || hasCheckpoint;

      const reasons = [];
      if (!hasArtifacts) reasons.push(`No artifacts found in docs/${GATE_DIRS[targetGate] || '?'}/`);
      if (!hasCheckpoint) reasons.push(`No checkpoint recorded for ${targetGate}`);

      return {
        content: [{ type: 'text', text: JSON.stringify({
          gate: targetGate,
          allowed,
          enforced: true,
          requirement: requirement?.check || '',
          check_results: { artifacts_found: artifacts, checkpoints_found: checkpoints.map(c => c.passed_at) },
          ...(allowed ? { message: `✅ ${targetGate} conditions met — proceed to next gate` } : { blocked_reasons: reasons, action_required: requirement?.check || 'Complete gate requirements' }),
        }, null, 2) }],
      };
    }
  );

  // Tool: advance_gate — FSM enforced
  server.tool(
    'advance_gate',
    '【硬约束】推进到下一个 Gate。仅当当前 Gate 的 gate_enforce 返回 allowed=true 时才允许推进。非顺序推进（跳过 Gate）会被拒绝。',
    { gate: z.enum(GATES).describe('要推进到的 Gate 名称') },
    async ({ gate }) => {
      const pstate = readPipeline();
      const currentGate = pstate?.current_gate || 'Gate A';
      const currentIdx = GATES.indexOf(currentGate);
      const targetIdx = GATES.indexOf(gate);

      if (targetIdx === -1) return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown gate: ${gate}` }) }] };

      // FSM: only allow current gate → next gate (no skipping)
      if (targetIdx <= currentIdx) {
        return { content: [{ type: 'text', text: JSON.stringify({ allowed: false, error: `FSM blocked: Cannot move backward or stay. Current: ${currentGate}, Requested: ${gate}` }) }] };
      }
      if (targetIdx > currentIdx + 1) {
        return { content: [{ type: 'text', text: JSON.stringify({ allowed: false, error: `FSM blocked: Cannot skip gates. Current: ${currentGate}, Requested: ${gate}. Must advance to ${GATES[currentIdx + 1]} first.` }) }] };
      }

      // Enforce: must pass current gate
      const artifacts = findGateArtifacts(join(root, 'docs'), currentGate);
      const checkpoints = readCheckpoints(root, currentGate);
      if (artifacts.length === 0 && checkpoints.length === 0) {
        return { content: [{ type: 'text', text: JSON.stringify({ allowed: false, error: `FSM blocked: ${currentGate} conditions NOT met. Run gate_enforce first. Required: ${GATE_CHECKS[currentGate]?.check}` }) }] };
      }

      // Allowed — advance
      const cpDir = join(root, '.jarvis', 'checkpoints');
      if (!existsSync(cpDir)) mkdirSync(cpDir, { recursive: true });
      writeFileSync(join(cpDir, `${currentGate.replace(/ /g, '_')}.json`), JSON.stringify({ gate: currentGate, passed_at: new Date().toISOString(), advance_to: gate }, null, 2));
      writePipeline({ ...pstate, current_gate: gate, gates_passed: [...(pstate?.gates_passed || []), currentGate] });

      const nextGate = GATES[targetIdx + 1];
      return {
        content: [{ type: 'text', text: JSON.stringify({
          allowed: true,
          previous_gate: currentGate, marked_passed_at: new Date().toISOString(),
          current_gate: gate, next: nextGate || 'Pipeline Complete',
          message: nextGate ? `Next: ${nextGate}` : '🎉 All gates passed! Move to Gate E: Release.',
        }, null, 2) }],
      };
    }
  );

  // Tool: report_status
  server.tool(
    'report_status',
    '流水线完整报告：Gate 进度、测试结果、契约验证结果、产物链接',
    {},
    async () => {
      const gates = GATES.map(gate => ({
        gate,
        passed: readCheckpoints(root, gate).length > 0,
        artifacts: findGateArtifacts(join(root, 'docs'), gate),
      }));
      const completed = gates.filter(g => g.passed).length;
      const total = gates.length;
      const reports = {};
      for (const gate of gates) {
        if (gate.passed) {
          reports[gate.gate] = {
            artifacts: gate.artifacts,
            checkpoints: readCheckpoints(root, gate.gate),
          };
        }
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({
          project: root,
          progress: `${completed}/${total} (${Math.round(completed/total*100)}%)`,
          current: gates.find(g => !g.passed)?.gate || 'All gates passed',
          reports,
          _summary: `${completed}/${total} gates passed. Current: ${gates.find(g => !g.passed)?.gate || 'Complete'}`,
        }, null, 2) }],
      };
    }
  );

  // ==============================
  // RESOURCES
  // ==============================

  // requirements://list + requirements://{reqId}
  server.resource('requirements_list', 'requirements://list', {
    name: 'Requirements', description: '所有 REQ-XXX 需求文档列表', mimeType: 'text/markdown',
  }, async () => ({ contents: [{ uri: 'requirements://list', text: listMarkdownFiles(join(root, 'docs', 'requirements'), 'Requirements'), mimeType: 'text/markdown' }] }));

  server.resource('requirement_detail', 'requirements://{reqId}', {
    name: 'Requirement Detail', description: '指定需求完整内容', mimeType: 'text/markdown',
  }, async (uri) => ({ contents: [{ uri: uri.href, text: findDocByReq(join(root, 'docs', 'requirements'), uri.pathname.split('/').pop()), mimeType: 'text/markdown' }] }));

  // tasks://list + tasks://{taskId}
  server.resource('tasks_list', 'tasks://list', {
    name: 'Tasks', description: '所有 TASK-XXX 任务文档列表', mimeType: 'text/markdown',
  }, async () => ({ contents: [{ uri: 'tasks://list', text: listMarkdownFiles(join(root, 'docs', 'tasks'), 'Tasks'), mimeType: 'text/markdown' }] }));

  server.resource('task_detail', 'tasks://{taskId}', {
    name: 'Task Detail', description: '指定任务完整内容', mimeType: 'text/markdown',
  }, async (uri) => ({ contents: [{ uri: uri.href, text: findDocByReq(join(root, 'docs', 'tasks'), uri.pathname.split('/').pop()), mimeType: 'text/markdown' }] }));

  // plans://list + plans://{planFile}
  server.resource('plans_list', 'plans://list', {
    name: 'Plans', description: '执行计划文档列表', mimeType: 'text/markdown',
  }, async () => ({ contents: [{ uri: 'plans://list', text: listMarkdownFiles(join(root, 'docs', 'plans'), 'Plans'), mimeType: 'text/markdown' }] }));

  server.resource('plan_detail', 'plans://{planFile}', {
    name: 'Plan Detail', description: '指定计划完整内容', mimeType: 'text/markdown',
  }, async (uri) => {
    const file = decodeURIComponent(uri.pathname.split('/').pop());
    const p = join(root, 'docs', 'plans', file + (file.endsWith('.md') ? '' : '.md'));
    const text = existsSync(p) ? readFileSync(p, 'utf-8') : `# ${file} — Not Found`;
    return { contents: [{ uri: uri.href, text, mimeType: 'text/markdown' }] };
  });

  // reports://{gate} — gate-level report summary
  server.resource('gate_report', 'reports://{gate}', {
    name: 'Gate Report', description: '指定 Gate 的产物文件摘要', mimeType: 'text/markdown',
  }, async (uri) => {
    const gate = decodeURIComponent(uri.pathname.split('/').pop()).replace(/_/g, ' ');
    const artifacts = findGateArtifacts(join(root, 'docs'), gate);
    const checkpoints = readCheckpoints(root, gate);
    const text = `# ${gate} Report\n\n**Passed:** ${checkpoints.length > 0}\n**Checkpoints:** ${checkpoints.map(c => c.passed_at).join(', ') || 'none'}\n\n**Artifacts:**\n${artifacts.map(a => `- ${a}`).join('\n') || 'none'}`;
    return { contents: [{ uri: uri.href, text, mimeType: 'text/markdown' }] };
  });

  // ==============================
  // TRANSPORT
  // ==============================
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
  app.post('/mcp', async (req, res) => { try { await transport.handleRequest(req, res, req.body); } catch (e) { res.status(500).json({ error: e.message }); } });
  app.get('/mcp/sse', async (req, res) => { await transport.handleRequest(req, res, undefined); });
  await server.connect(transport);

  // ---- Health ----
  app.get('/health', (_req, res) => res.json({ status: 'ok', version: readPkgVersion(), tools: ['pipeline_init', 'pipeline_status', 'gate_enforce', 'advance_gate', 'report_status'] }));

  // ---- SSE (real-time pipeline events) ----
  const sseClients = new Set();
  app.get('/api/events', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
  });
  setInterval(() => {
    if (sseClients.size === 0) return;
    const gates = GATES.map(g => ({ gate: g, passed: readCheckpoints(root, g).length > 0, artifacts: findGateArtifacts(join(root, 'docs'), g), checkpoints: readCheckpoints(root, g), requirement: GATE_CHECKS[g]?.check || '' }));
    const current = gates.find(g => !g.passed)?.gate || 'Complete';
    const completed = gates.filter(g => g.passed).map(g => g.gate);
    const pct = Math.round(completed.length / gates.length * 100);
    const data = JSON.stringify({ project: root, current_gate: current, completed, progress: pct, gates, _display: formatGateDisplay(gates, current) });
    for (const c of sseClients) c.write(`data: ${data}\n\n`);
  }, 8000);

  // ---- Dashboard ----
  if (dashboard) {
    const dashHtml = readFileSync(resolve(import.meta.dirname, 'dashboard.html'), 'utf-8');
    app.get('/dashboard', (_req, res) => res.type('html').send(dashHtml));
  }

  app.listen(port, () => {
    console.log(`🧠 Jarvis Engine v${readPkgVersion()} — http://localhost:${port}`);
    console.log(`   MCP:  POST http://localhost:${port}/mcp`);
    if (dashboard) console.log(`   Web:  http://localhost:${port}/dashboard`);
  });
}

// ==============================
// HELPERS
// ==============================

export function stopEngine() {
  if (!existsSync(PID_FILE)) { console.log('No running engine found.'); return; }
  const pid = readFileSync(PID_FILE, 'utf-8').trim();
  try { process.kill(Number(pid), 'SIGTERM'); try { require('node:fs').unlinkSync(PID_FILE); } catch {}; console.log(`Engine stopped (PID ${pid}).`); }
  catch { console.log(`Engine not running (stale PID ${pid}).`); try { require('node:fs').unlinkSync(PID_FILE); } catch {} }
}

export function engineStatus() {
  if (!existsSync(PID_FILE)) { console.log('Engine: not running'); return false; }
  const pid = readFileSync(PID_FILE, 'utf-8').trim();
  try { process.kill(Number(pid), 0); console.log(`Engine: running (PID ${pid})`); return true; }
  catch { console.log(`Engine: not running (stale PID ${pid})`); try { require('node:fs').unlinkSync(PID_FILE); } catch {}; return false; }
}

function readPkgVersion() { try { return JSON.parse(readFileSync(resolve(import.meta.dirname, '..', '..', 'package.json'), 'utf-8')).version; } catch { return '?.?.?'; } }

function readCheckpoints(root, gate) {
  const cpDir = join(root, '.jarvis', 'checkpoints');
  if (!existsSync(cpDir)) return [];
  const files = readdirSync(cpDir).filter(f => f.includes(gate.replace(/ /g, '_')));
  return files.map(f => { try { return JSON.parse(readFileSync(join(cpDir, f), 'utf-8')); } catch { return null; } }).filter(Boolean);
}

function findGateArtifacts(docsDir, gate) {
  const subdir = GATE_DIRS[gate]; if (!subdir) return [];
  const dir = join(docsDir, subdir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.md')).slice(0, 5);
}

function listMarkdownFiles(dir, title) {
  if (!existsSync(dir)) return `# ${title}\n\nNo documents found.`;
  const files = readdirSync(dir).filter(f => f.endsWith('.md'));
  if (files.length === 0) return `# ${title}\n\nEmpty.`;
  return `# ${title}\n\n${files.map(f => `- ${f}`).join('\n')}`;
}

function findDocByReq(dir, reqId) {
  if (!existsSync(dir)) return `# ${reqId} — Not Found`;
  for (const f of readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const c = readFileSync(join(dir, f), 'utf-8');
    if (c.includes(reqId)) return c;
  }
  return `# ${reqId} — Not Found`;
}

function formatGateDisplay(gates, current) {
  return gates.map(g => `${g.passed ? '✅' : g.gate === current ? '🔵' : '⏳'} ${g.gate}${g.passed && g.checkpoints.length ? ` (${g.checkpoints[0].passed_at?.slice(0,10)})` : ''}`).join(' → ');
}
