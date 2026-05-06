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

  // ==============================
  // TOOLS
  // ==============================

  // Tool: pipeline_status (Phase 1, enhanced)
  server.tool(
    'pipeline_status',
    '完整流水线状态：当前 Gate、已完成 Gate、产物文件、Gate 检查点时间戳',
    {},
    async () => {
      const gates = GATES.map(gate => {
        const checkpoints = readCheckpoints(root, gate);
        return {
          gate,
          passed: checkpoints.length > 0,
          checkpoints,
          artifacts: findGateArtifacts(join(root, 'docs'), gate),
          requirement: GATE_CHECKS[gate]?.check || '',
        };
      });
      const current = gates.find(g => !g.passed) || gates[gates.length - 1];
      return {
        content: [{ type: 'text', text: JSON.stringify({
          project: root,
          current_gate: current.gate,
          completed: gates.filter(g => g.passed).map(g => g.gate),
          gates,
          _display: formatGateDisplay(gates, current.gate),
        }, null, 2) }],
      };
    }
  );

  // Tool: check_gate
  server.tool(
    'check_gate',
    '验证指定 Gate 的通过条件：检查产物文件、Gate 文档完整性',
    { gate: z.enum(GATES).describe('要检查的 Gate 名称') },
    async ({ gate }) => {
      const artifacts = findGateArtifacts(join(root, 'docs'), gate);
      const passed = artifacts.length > 0;
      const checkpoints = readCheckpoints(root, gate);
      const requirement = GATE_CHECKS[gate];
      return {
        content: [{ type: 'text', text: JSON.stringify({
          gate,
          passed,
          checkpoints,
          artifacts_found: artifacts,
          requirement: requirement?.check || 'No specific check defined',
          suggestion: passed ? 'Gate 条件满足，可以推进' : `需要完成：${requirement?.check}`,
        }, null, 2) }],
      };
    }
  );

  // Tool: advance_gate
  server.tool(
    'advance_gate',
    '标记 Gate 为已通过，写入检查点文件。调用前应先 check_gate 确认条件满足。',
    { gate: z.enum(GATES).describe('要推进到的 Gate（标记此 Gate 之前的 Gate 为已通过）') },
    async ({ gate }) => {
      const idx = GATES.indexOf(gate);
      if (idx === -1) return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown gate: ${gate}` }) }] };
      const prevGate = GATES[Math.max(0, idx - 1)];
      const cpDir = join(root, '.jarvis', 'checkpoints');
      if (!existsSync(cpDir)) mkdirSync(cpDir, { recursive: true });
      const cpFile = join(cpDir, `${prevGate.replace(/ /g, '_')}.json`);
      writeFileSync(cpFile, JSON.stringify({
        gate: prevGate, passed_at: new Date().toISOString(), advance_to: gate,
      }, null, 2));
      return {
        content: [{ type: 'text', text: JSON.stringify({
          ok: true,
          previous_gate: prevGate,
          marked_passed_at: new Date().toISOString(),
          current_gate: gate,
          next: GATES[idx + 1] || 'Done',
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
  app.get('/health', (_req, res) => res.json({ status: 'ok', version: readPkgVersion(), tools: ['pipeline_status', 'check_gate', 'advance_gate', 'report_status'] }));

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
