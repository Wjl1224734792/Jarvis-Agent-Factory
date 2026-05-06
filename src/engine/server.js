import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

/**
 * Jarvis Engine — HTTP MCP Server
 * Phase 1: pipeline_status tool + requirements resource
 *
 * Start:  jarvis engine start [--port 3456] [--dashboard]
 * Stop:   jarvis engine stop
 * Status: jarvis engine status
 */

const PID_FILE = resolve(homedir(), '.jarvis', 'engine.pid');
const DEFAULT_PORT = 3456;

export async function startEngine({ port = DEFAULT_PORT, dashboard = false, projectRoot = '.' } = {}) {
  const root = resolve(projectRoot);

  // Save PID
  const pidDir = resolve(homedir(), '.jarvis');
  if (!existsSync(pidDir)) {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(pidDir, { recursive: true });
  }
  writeFileSync(PID_FILE, String(process.pid));

  const app = express();
  app.use(express.json());

  // ---- MCP Server ----
  const server = new McpServer({
    name: 'jarvis-engine',
    version: readPkgVersion(),
  });

  // Tool: pipeline_status
  server.tool(
    'pipeline_status',
    '读取当前项目的流水线状态：当前 Gate、已通过 Gate、产物文件列表',
    {},
    async () => {
      const gates = ['Gate A', 'Gate B', 'Gate C', 'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D', 'Gate E'];
      const status = [];
      const docsDir = join(root, 'docs');

      for (const gate of gates) {
        const results = findGateArtifacts(docsDir, gate);
        status.push({ gate, complete: results.length > 0, artifacts: results });
      }

      const currentGate = status.find(g => !g.complete)?.gate || 'Gate E';
      const completedGates = status.filter(g => g.complete).map(g => g.gate);

      return {
        content: [{ type: 'text', text: JSON.stringify({
          project: root,
          current_gate: currentGate,
          completed_gates: completedGates,
          gates: status,
        }, null, 2) }],
      };
    }
  );

  // Resource: requirements://list
  server.resource(
    'requirements_list',
    'requirements://list',
    {
      name: 'Requirements List',
      description: '列出项目中所有 REQ-XXX 需求文档',
      mimeType: 'text/markdown',
    },
    async () => {
      const reqsDir = join(root, 'docs', 'requirements');
      if (!existsSync(reqsDir)) {
        return { contents: [{ uri: 'requirements://list', text: '# No requirements found\n\nRun Gate A first.', mimeType: 'text/markdown' }] };
      }
      const files = readdirSync(reqsDir).filter(f => f.endsWith('.md'));
      if (files.length === 0) {
        return { contents: [{ uri: 'requirements://list', text: '# No requirements yet\n\nNo REQ documents found.', mimeType: 'text/markdown' }] };
      }
      const list = files.map(f => {
        const content = readFileSync(join(reqsDir, f), 'utf-8');
        const reqMatch = content.match(/REQ-\d{3}/g);
        const reqs = reqMatch ? [...new Set(reqMatch)] : [];
        return `- **${f}** — ${reqs.join(', ') || 'no REQ found'}`;
      }).join('\n');
      return { contents: [{ uri: 'requirements://list', text: `# Requirements\n\n${list}`, mimeType: 'text/markdown' }] };
    }
  );

  // Resource: requirement detail
  server.resource(
    'requirement_detail',
    'requirements://{reqId}',
    {
      name: 'Requirement Detail',
      description: '读取指定 REQ-XXX 的完整需求文档内容',
      mimeType: 'text/markdown',
    },
    async (uri) => {
      const reqId = uri.pathname.replace('/requirements/', '').replace('/', '');
      const reqsDir = join(root, 'docs', 'requirements');
      if (!existsSync(reqsDir)) return { contents: [{ uri: uri.href, text: `# ${reqId} — Not Found`, mimeType: 'text/markdown' }] };

      const files = readdirSync(reqsDir).filter(f => f.endsWith('.md'));
      for (const f of files) {
        const content = readFileSync(join(reqsDir, f), 'utf-8');
        if (content.includes(reqId)) {
          return { contents: [{ uri: uri.href, text: content, mimeType: 'text/markdown' }] };
        }
      }
      return { contents: [{ uri: uri.href, text: `# ${reqId} — Not Found`, mimeType: 'text/markdown' }] };
    }
  );

  // ---- MCP Transport ----
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  app.post('/mcp', async (req, res) => {
    try {
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      console.error('MCP error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/mcp/sse', async (req, res) => {
    await transport.handleRequest(req, res, undefined);
  });

  await server.connect(transport);

  // ---- Health ----
  app.get('/health', (_req, res) => res.json({ status: 'ok', version: readPkgVersion() }));

  // ---- Dashboard (placeholder) ----
  if (dashboard) {
    app.get('/dashboard', (_req, res) => {
      res.send(`<!DOCTYPE html><html><head><title>Jarvis Engine</title>
<style>body{font-family:system-ui;max-width:800px;margin:40px auto;padding:20px;background:#111;color:#eee}
h1{color:#FF6B35}.card{background:#1a1a2e;border-radius:8px;padding:16px;margin:8px 0}</style></head>
<body><h1>🧠 Jarvis Engine v${readPkgVersion()}</h1>
<div class="card"><h3>MCP Endpoint</h3><code>POST /mcp</code> · <code>GET /mcp/sse</code></div>
<div class="card"><h3>Tools</h3><p>pipeline_status — 流水线状态</p></div>
<div class="card"><h3>Resources</h3><p>requirements://list · requirements://{reqId}</p></div>
</body></html>`);
    });
  }

  // Start server
  app.listen(port, () => {
    console.log(`🧠 Jarvis Engine v${readPkgVersion()} — http://localhost:${port}`);
    console.log(`   MCP:  POST http://localhost:${port}/mcp`);
    if (dashboard) console.log(`   Web:  http://localhost:${port}/dashboard`);
    console.log(`   PID:  ${process.pid} (saved to ${PID_FILE})`);
  });
}

export function stopEngine() {
  if (!existsSync(PID_FILE)) {
    console.log('No running engine found.');
    return;
  }
  const pid = readFileSync(PID_FILE, 'utf-8').trim();
  try {
    process.kill(Number(pid), 'SIGTERM');
    const { unlinkSync } = require('node:fs');
    try { unlinkSync(PID_FILE); } catch {}
    console.log(`Engine stopped (PID ${pid}).`);
  } catch {
    console.log(`Engine not running (stale PID ${pid}).`);
    try { require('node:fs').unlinkSync(PID_FILE); } catch {}
  }
}

export function engineStatus() {
  if (!existsSync(PID_FILE)) {
    console.log('Engine: not running');
    return false;
  }
  const pid = readFileSync(PID_FILE, 'utf-8').trim();
  try { process.kill(Number(pid), 0); } catch {
    console.log(`Engine: not running (stale PID ${pid})`);
    try { require('node:fs').unlinkSync(PID_FILE); } catch {}
    return false;
  }
  console.log(`Engine: running (PID ${pid})`);
  return true;
}

function readPkgVersion() {
  try {
    return JSON.parse(readFileSync(resolve(import.meta.dirname, '..', '..', 'package.json'), 'utf-8')).version;
  } catch { return '?.?.?'; }
}

function findGateArtifacts(docsDir, gate) {
  const gateMap = {
    'Gate A': 'requirements',
    'Gate B': 'tasks',
    'Gate C': 'plans',
    'Gate C1': 'implementation',
    'Gate C1.5': 'implementation',
    'Gate C2': 'testing',
    'Gate D': 'review',
    'Gate E': 'shipping',
  };
  const subdir = gateMap[gate];
  if (!subdir) return [];
  const dir = join(docsDir, subdir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.md')).slice(0, 5);
}
