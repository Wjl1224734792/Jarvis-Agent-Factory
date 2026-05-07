import { Hono } from 'hono';
import { serve, getRequestListener } from '@hono/node-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { openDb, getPipeline, initPipeline, getCheckpoints, addCheckpoint, updatePipelineGate, getSessions, getSession, addSession, heartbeatSession, removeSession, markStaleSessions, resumeSession, migrateSession, getAllPipelines, getAgentConfig, setAgentModel } from './db.js';
import { GATE_CHECKS, GATE_DIRS, AGENT_LIST, PIPELINE_DEFS, findGateArtifacts, formatGateDisplay, getPipelineGates, getPipelineName, getGateOperations, DEFAULT_PIPELINE } from './gates.js';
import { getAgentsByPlatform, getPlatforms, getPlatformModels, getAgentList } from './agent-registry.js';
import { setupApiRoutes } from '../web/routes.js';

const PID_FILE = resolve(homedir(), '.jarvis', 'engine.pid');
const DEFAULT_PORT = 3456;
const DEFAULT_WEB_PORT = 3457;
const SESSION_TIMEOUT = 600_000; // 10分钟超时，标记 inactive 而非删除

/** 绑定地址：仅 IPv4 本地回环 */
const BIND_HOST = '127.0.0.1';

/** 检测端口是否被占用 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const s = createServer();
    s.once('error', () => resolve(true));
    s.once('listening', () => { s.close(); resolve(false); });
    s.listen(port, BIND_HOST);
  });
}

/** 从 session 获取该会话的 Gate 序列 */
function sessionGates(db, sid) {
  const p = getPipeline(db, sid);
  return getPipelineGates(p?.pipeline_type || DEFAULT_PIPELINE);
}

/** 启动 Jarvis 引擎 */
export async function startEngine({ port = DEFAULT_PORT, projectRoot = '.', stdio = false } = {}) {
  // 非 stdio 模式：端口已被占用 → 复用已有引擎
  if (!stdio && await isPortInUse(port)) {
    console.log(`Jarvis Engine already running on port ${port} — reusing existing instance.`);
    if (existsSync(PID_FILE)) {
      const oldPid = Number(readFileSync(PID_FILE, 'utf-8').trim());
      if (oldPid !== process.pid) {
        try { writeFileSync(PID_FILE, String(process.pid)); } catch {}
      }
    }
    return true;
  }

  const root = resolve(projectRoot);
  const pidDir = resolve(homedir(), '.jarvis');
  if (!existsSync(pidDir)) mkdirSync(pidDir, { recursive: true });
  writeFileSync(PID_FILE, String(process.pid));

  const app = new Hono();
  const mcpServer = new McpServer({ name: 'jarvis-engine', version: readPkgVersion() });
  const db = openDb(root);

  // 心跳保活 + 过期标记
  setInterval(() => { markStaleSessions(db, SESSION_TIMEOUT); }, 30_000);

  // ---- MCP Tools (不变) ----
  registerMcpTools(mcpServer, db, root);

  const log = (...args) => (stdio ? process.stderr : process.stdout).write(args.join(' ') + '\n');

  // 注册 REST API 路由（Hono）
  setupApiRoutes(app, db, root);

  if (stdio) {
    // ---- Stdio Transport：MCP 通过 stdin/stdout，Claude Code 自动拉起 ----
    // 先启动 HTTP 服务器（确保 jarvis web 立即可用），再连接 MCP
    try {
      if (!(await isPortInUse(port))) {
        serve({ fetch: app.fetch, port, hostname: BIND_HOST });
        log(`Jarvis Engine v${readPkgVersion()} — stdio MCP`);
        log(`   API: http://localhost:${port}/api/pipeline`);
        log(`   Web: jarvis web`);
      } else {
        log(`Jarvis Engine v${readPkgVersion()} — stdio MCP (HTTP on port ${port} handled by another instance)`);
      }
    } catch (e) {
      log(`Jarvis Engine v${readPkgVersion()} — HTTP server unavailable: ${e.message}`);
    }

    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
  } else {
    // ---- HTTP Transport：MCP 通过 HTTP + SSE（手动启动 jarvis engine start） ----
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    // MCP 路由需要原始 Node.js req/res，使用 getRequestListener + createServer 拦截
    const honoHandler = getRequestListener(app.fetch);

    const httpServer = createHttpServer(async (req, res) => {
      if (req.url.startsWith('/mcp')) {
        let body;
        if (['POST', 'DELETE'].includes(req.method)) {
          body = await new Promise((resolve) => {
            let data = '';
            req.on('data', chunk => data += chunk);
            req.on('end', () => {
              try { resolve(JSON.parse(data)); } catch { resolve(data); }
            });
          });
        }
        try {
          await transport.handleRequest(req, res, body);
        } catch (e) {
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
              .end(JSON.stringify({ error: e.message }));
          }
        }
        return;
      }
      honoHandler(req, res);
    });

    await mcpServer.connect(transport);

    httpServer.listen(port, BIND_HOST, () => {
      console.log(`Jarvis Engine v${readPkgVersion()} — http://localhost:${port}`);
      console.log(`   MCP: http://localhost:${port}/mcp`);
      console.log(`   API: http://localhost:${port}/api/pipeline`);
      console.log(`   Web: jarvis web (独立启动)`);
    });
  }
}

/** 注册所有 MCP 工具 */
function registerMcpTools(server, db, root) {
  server.tool('session_join',
    '注册/恢复会话。每个会话独立流水线状态。支持 resume_session_id 恢复旧会话，pipeline_type 指定流水线类型（full/frontend/backend）。',
    {
      platform: z.enum(['claude', 'opencode', 'codex', 'other']).optional(),
      resume_session_id: z.string().optional(),
      pipeline_type: z.string().optional(),
    },
    async ({ platform, resume_session_id, pipeline_type }, extra) => {
      const sid = extra?.sessionId || `s${Date.now()}`;
      const pt = pipeline_type || DEFAULT_PIPELINE;
      if (resume_session_id) {
        const old = getSession(db, resume_session_id);
        if (old) {
          migrateSession(db, resume_session_id, sid);
          removeSession(db, resume_session_id);
        }
      }
      const existing = getSession(db, sid);
      if (existing) {
        heartbeatSession(db, sid);
        const p = getPipeline(db, sid);
        return resp({
          session_id: sid, platform: existing.platform,
          gate: p?.current_gate || 'Gate A',
          pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE,
          project: p?.project || root, resumed: false,
        });
      }
      addSession(db, sid, platform || 'unknown', 'member');
      if (!getPipeline(db, sid)) initPipeline(db, sid, root, pt);
      const p = getPipeline(db, sid);
      return resp({
        session_id: sid, platform: platform || 'unknown',
        gate: p?.current_gate || 'Gate A',
        pipeline_type: pt, project: p?.project || root,
        message: '\u{1F195} 新会话已初始化，独立流水线已就绪。',
        resumed: !!resume_session_id,
      });
    });

  server.tool('session_heartbeat', '心跳保活。', {},
    async (_args, extra) => {
      const sid = extra?.sessionId;
      if (!sid || !getSession(db, sid)) return resp({ error: 'Session not found.' });
      heartbeatSession(db, sid);
      return resp({ ok: true });
    });

  server.tool('session_list', '列出所有活跃会话。', {}, async () => {
    markStaleSessions(db, SESSION_TIMEOUT);
    const sessions = getSessions(db, 'active').map(s => {
      const p = getPipeline(db, s.id);
      return {
        id: s.id, platform: s.platform, role: s.role,
        gate: p?.current_gate || '?',
        pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE,
        heartbeat: s.last_heartbeat, status: s.status,
      };
    });
    return resp({ sessions, count: sessions.length });
  });

  server.tool('session_leave', '离开会话。', {},
    async (_args, extra) => {
      const sid = extra?.sessionId;
      if (!sid || !getSession(db, sid)) return resp({ ok: true });
      removeSession(db, sid);
      return resp({ ok: true, message: 'Session removed.' });
    });

  server.tool('pipeline_init', '【会话隔离】初始化当前会话流水线。',
    { project_name: z.string().optional(), pipeline_type: z.string().optional() },
    async ({ project_name, pipeline_type }, extra) => {
      const sid = extra?.sessionId || 'legacy';
      const pt = pipeline_type || DEFAULT_PIPELINE;
      initPipeline(db, sid, project_name || root, pt);
      return resp({
        ok: true, session_id: sid, pipeline_type: pt,
        message: 'Pipeline initialized. Next: Gate A',
        state: getPipeline(db, sid),
      });
    });

  server.tool('pipeline_status', '【会话隔离】当前会话流水线状态。', {},
    async (_args, extra) => {
      const sid = extra?.sessionId || 'legacy';
      const p = getPipeline(db, sid);
      const pt = p?.pipeline_type || DEFAULT_PIPELINE;
      const gateList = getPipelineGates(pt);
      const docs = join(root, 'docs');
      const gates = gateList.map(g => {
        const cp = getCheckpoints(db, g, sid);
        return {
          gate: g, passed: cp.length > 0, checkpoints: cp,
          artifacts: findGateArtifacts(docs, g),
          requirement: GATE_CHECKS[g]?.check || '',
        };
      });
      const current = gates.find(g => !g.passed)?.gate || 'Complete';
      return resp({
        session_id: sid, project: root, pipeline_type: pt,
        pipeline_name: getPipelineName(pt),
        current_gate: current,
        completed: gates.filter(g => g.passed).map(g => g.gate),
        gates,
        all_sessions: getSessions(db).map(s => ({
          id: s.id, gate: getPipeline(db, s.id)?.current_gate || '?',
        })),
        _display: formatGateDisplay(gates, current),
      });
    });

  server.tool('gate_enforce', '【会话隔离·硬约束】验证Gate条件。',
    { gate: z.string().optional() },
    async ({ gate }, extra) => {
      const sid = extra?.sessionId || 'legacy';
      const gateList = sessionGates(db, sid);
      const target = gate || getPipeline(db, sid)?.current_gate || gateList[0];
      const artifacts = findGateArtifacts(join(root, 'docs'), target);
      const checkpoints = getCheckpoints(db, target, sid);
      const allowed = artifacts.length > 0 || checkpoints.length > 0;
      return resp(allowed
        ? { gate: target, allowed: true, session_id: sid, message: `${target} — proceed.` }
        : {
            gate: target, allowed: false, session_id: sid,
            blocked_reasons: [artifacts.length ? '' : `No artifacts in docs/${GATE_DIRS[target] || '?'}/`].filter(Boolean),
            action_required: GATE_CHECKS[target]?.check || '',
          });
    });

  server.tool('advance_gate', '【会话隔离·硬约束】推进Gate。',
    { gate: z.string() },
    async ({ gate }, extra) => {
      const sid = extra?.sessionId || 'legacy';
      const p = getPipeline(db, sid);
      const gateList = sessionGates(db, sid);
      const cur = p?.current_gate || gateList[0];
      const ci = gateList.indexOf(cur), ti = gateList.indexOf(gate);
      if (ti === -1) return resp({ allowed: false, error: `Unknown gate: ${gate}. Valid gates for this pipeline: ${gateList.join(', ')}` });
      if (ti <= ci) return resp({ allowed: false, error: `FSM blocked: Cannot move backward. Current: ${cur}` });
      if (ti > ci + 1) return resp({ allowed: false, error: `FSM blocked: Cannot skip gates. Next: ${gateList[ci + 1]}` });
      const artifacts = findGateArtifacts(join(root, 'docs'), cur);
      const cps = getCheckpoints(db, cur, sid);
      if (artifacts.length === 0 && cps.length === 0) return resp({ allowed: false, error: `${cur} conditions NOT met.` });
      addCheckpoint(db, cur, gate, sid);
      updatePipelineGate(db, sid, gate);
      return resp({
        allowed: true, session_id: sid, previous_gate: cur, current_gate: gate,
        next: gateList[ti + 1] || 'Complete',
        message: gateList[ti + 1] ? `Next: ${gateList[ti + 1]}` : 'Complete!',
      });
    });

  server.tool('gate_jump',
    '【lite模式·入口跳转】跳过无关Gate直接进入目标Gate。仅当pipeline_type为lite时可用。',
    { gate: z.string().describe('目标Gate，如 Gate C / Gate D / Gate E') },
    async ({ gate }, extra) => {
      const sid = extra?.sessionId || 'legacy';
      const p = getPipeline(db, sid);
      const pt = p?.pipeline_type || DEFAULT_PIPELINE;
      const def = PIPELINE_DEFS[pt];
      if (!def?.allow_jump) return resp({ allowed: false, error: `gate_jump 仅在 lite 模式可用。当前: ${pt}` });
      const gateList = sessionGates(db, sid);
      const ti = gateList.indexOf(gate);
      if (ti === -1) return resp({ allowed: false, error: `未知 Gate: ${gate}。有效: ${gateList.join(', ')}` });
      updatePipelineGate(db, sid, gate);
      return resp({
        allowed: true, session_id: sid, pipeline_type: pt, entry_gate: gate,
        message: `已跳转至 ${gate}，跳过了 ${gateList.slice(0, ti).join(', ')}。剩余: ${gateList.slice(ti).join(' → ')}`,
      });
    });

  server.tool('report_status', '【会话隔离】流水线完整报告。', {},
    async (_args, extra) => {
      const sid = extra?.sessionId || 'legacy';
      const gateList = sessionGates(db, sid);
      const gates = gateList.map(g => ({
        gate: g, passed: getCheckpoints(db, g, sid).length > 0,
        artifacts: findGateArtifacts(join(root, 'docs'), g),
      }));
      const completed = gates.filter(g => g.passed).length;
      return resp({
        session_id: sid, project: root,
        pipeline_type: getPipeline(db, sid)?.pipeline_type || DEFAULT_PIPELINE,
        progress: `${completed}/${gateList.length}`,
        current: gates.find(g => !g.passed)?.gate || 'Complete',
      });
    });

  server.tool('gate_check',
    '【硬约束·操作前检查】在执行关键操作（写代码/生成Agent/测试/构建/审查/部署）之前调用。返回该操作在当前Gate是否被允许，以及被阻止的原因和下一步指引。',
    {
      operation: z.enum([
        'read', 'write_doc', 'write_code', 'sweep_arch',
        'spawn_impl', 'spawn_test', 'lint', 'build', 'preview',
        'review', 'audit', 'deploy', 'fix',
      ]).describe('要执行的操作类型'),
    },
    async ({ operation }, extra) => {
      const sid = extra?.sessionId || 'legacy';
      const p = getPipeline(db, sid);
      const gateList = sessionGates(db, sid);
      const cur = p?.current_gate || gateList[0];
      const ops = getGateOperations(cur);
      const allowed = ops.allow.includes(operation);
      if (allowed) return resp({ allowed: true, gate: cur, operation, session_id: sid, message: `${operation} 在 ${cur} 允许执行` });
      return resp({
        allowed: false, gate: cur, operation, session_id: sid,
        blocked_reasons: [
          `操作 "${operation}" 在 ${cur} 不被允许`,
          `允许的操作: ${ops.allow.join(', ')}`,
          `下一步: ${GATE_CHECKS[cur]?.check || '完成当前Gate条件'}`,
        ],
        allowed_operations: ops.allow,
        next_step: GATE_CHECKS[cur]?.check || '',
      });
    });

  server.tool('pipeline_guide',
    '【硬约束·流程指引】返回当前Gate的完整上下文：允许/禁止的操作、可生成的Agent类型、下一步行动指南。在不确定下一步做什么时调用。',
    {},
    async (_args, extra) => {
      const sid = extra?.sessionId || 'legacy';
      const p = getPipeline(db, sid);
      const gateList = sessionGates(db, sid);
      const cur = p?.current_gate || gateList[0];
      const ci = gateList.indexOf(cur);
      const ops = getGateOperations(cur);
      const agentGuide = {
        'Gate A':    { can_spawn: ['code-explore-expert', 'docs-research-expert'], note: '需求澄清阶段，只探索和写文档' },
        'Gate B':    { can_spawn: ['task-design'], note: '任务分解阶段，spawn task-design 做垂直切片' },
        'Gate C':    { can_spawn: ['planner', 'frontend-architect', 'backend-architect', 'database-architect'], note: '规划阶段，spawn planner 产出 parallel_batches；按需做架构评审' },
        'Gate C1':   { can_spawn: [], note: '代码质量门——Lint/Type-check/Build/Deps Audit。失败则修复后重跑' },
        'Gate C1.5': { can_spawn: [], note: '视觉验证门——截图+样式检查。失败则退回实现Agent补充证据' },
        'Gate C2':   { can_spawn: ['frontend-test-expert', 'backend-test-expert', 'browser-test-expert', 'api-contract-expert', 'perf-test-expert', 'e2e-test-expert'], note: '测试阶段——先并行单元/组件测试，最后E2E' },
        'Gate D':    { can_spawn: ['frontend-review-expert', 'backend-review-expert', 'security-review-expert', 'perf-review-expert', 'qa-review-expert'], note: '评审阶段——4个领域审查并行，最后qa-review-expert综合签核' },
        'Gate E':    { can_spawn: ['security-review-expert', 'infra-deploy-expert'], note: '发布阶段——安全审计+上线检查+版本管理+归档' },
      };
      return resp({
        session_id: sid, gate: cur, gate_index: ci + 1, total_gates: gateList.length,
        pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE,
        pipeline_name: getPipelineName(p?.pipeline_type || DEFAULT_PIPELINE),
        allowed_operations: ops.allow, forbidden_operations: ops.deny,
        agent_spawn: agentGuide[cur] || { can_spawn: [], note: '未知Gate' },
        gate_requirement: GATE_CHECKS[cur]?.check || '',
        next_gate: gateList[ci + 1] || 'Complete',
        previous_gate: ci > 0 ? gateList[ci - 1] : null,
        fix_loop: (cur === 'Gate C1' || cur === 'Gate C1.5' || cur === 'Gate C2' || cur === 'Gate D')
          ? '当前Gate支持修复回退循环，最多2轮。调用 gate_check("fix") 确认修复操作已允许。' : null,
      });
    });

  const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
  server.tool('agent_config', 'Agent模型+思考等级配置。',
    { agent_id: z.string().optional(), model: z.string().optional(), effort: z.string().optional() },
    async ({ agent_id, model, effort }) => {
      if (agent_id && model) {
        setAgentModel(db, agent_id, model, effort || 'high');
        return resp({ ok: true, agent_id, model, effort: effort || 'high' });
      }
      const cfg = getAgentConfig(db);
      const agents = getAgentList(true);
      return resp({
        agents: agents.map(a => {
          const c = cfg[a.id];
          return {
            id: a.id, name: a.name, role: a.role, platform: a.platform,
            model: c?.model || a.defaultModel,
            effort: c?.effort || a.defaultEffort || 'high',
            is_custom: !!c,
          };
        }),
        available_models: [...new Set(agents.map(a => a.defaultModel).filter(Boolean))],
        available_efforts: EFFORTS,
      });
    });

  server.tool('platform_info',
    '获取平台信息：支持哪些平台（claude/opencode/codex）、各平台 Agent 数量、可用模型列表。用于引擎扩展和平台适配。',
    { platform: z.string().optional().describe('指定平台名称（claude/opencode/codex），不传则返回全部平台信息') },
    async ({ platform }) => {
      const platforms = getPlatforms();
      const models = getPlatformModels(true);
      if (platform) {
        if (!platforms.includes(platform)) return resp({ error: `Unknown platform: ${platform}. Available: ${platforms.join(', ')}` });
        const agents = getAgentsByPlatform(platform, true);
        return resp({
          platform,
          agent_count: agents.length,
          available_models: models[platform] || [],
          agents: agents.map(a => ({
            id: a.id, name: a.name, role: a.role, category: a.category,
            defaultModel: a.defaultModel, defaultEffort: a.defaultEffort,
          })),
        });
      }
      const summary = {};
      for (const p of platforms) {
        const agents = getAgentsByPlatform(p, true);
        summary[p] = { agent_count: agents.length, available_models: models[p] || [] };
      }
      return resp({ platforms: summary, total_agents: getAgentList(true).length });
    });
}

/** 启动独立 Web 面板（需先启动引擎） */
export async function startWeb({ port = DEFAULT_WEB_PORT, enginePort = DEFAULT_PORT } = {}) {
  // 检查引擎是否在运行
  if (!(await isPortInUse(enginePort))) {
    console.log(`❌ Engine not running on port ${enginePort}.`);
    console.log(`   Start it first: jarvis engine start`);
    return false;
  }

  if (await isPortInUse(port)) {
    console.log(`Web panel already running on port ${port} — open http://localhost:${port}/dashboard`);
    return true;
  }

  const app = new Hono();

  // SSE 事件流代理（必须在 /api/* 之前注册，避免被通配符拦截）
  app.get('/api/events', async (c) => {
    try {
      const resp = await fetch(`http://127.0.0.1:${enginePort}/api/events`, {
        headers: { accept: 'text/event-stream' },
      });
      if (!resp.ok) return c.json({ error: 'Engine SSE unreachable' }, 502);
      const respHeaders = {};
      resp.headers.forEach((v, k) => respHeaders[k] = v);
      return new Response(resp.body, { status: resp.status, headers: respHeaders });
    } catch {
      return c.json({ error: 'Engine SSE unreachable' }, 502);
    }
  });

  // 代理 /api/* 请求到引擎（通配符路由放在最后）
  app.all('/api/*', async (c) => {
    const reqHeaders = {};
    for (const [k, v] of c.req.raw.headers.entries()) {
      if (['host', 'connection', 'keep-alive'].includes(k.toLowerCase())) continue;
      reqHeaders[k] = v;
    }
    if (!reqHeaders['content-type'] && ['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
      reqHeaders['content-type'] = 'application/json';
    }

    let body = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
      body = await c.req.raw.clone().text();
    }

    try {
      // Hono c.req.url 返回完整 URL，需提取 path + query
      const u = new URL(c.req.url);
      const targetPath = u.pathname + u.search;
      const resp = await fetch(`http://127.0.0.1:${enginePort}${targetPath}`, {
        method: c.req.method,
        headers: reqHeaders,
        body,
      });
      const respHeaders = {};
      resp.headers.forEach((v, k) => respHeaders[k] = v);
      return new Response(resp.body, { status: resp.status, headers: respHeaders });
    } catch {
      return c.json({ error: 'Engine unreachable' }, 502);
    }
  });

  // 健康检查透传
  app.get('/health', async (c) => {
    try {
      const resp = await fetch(`http://127.0.0.1:${enginePort}/health`);
      const data = await resp.json();
      return c.json(data);
    } catch {
      return c.json({ status: 'ok', engine: 'unreachable' });
    }
  });

  // 静态页面
  const viewsDir = resolve(import.meta.dirname, '..', 'web', 'views');
  app.get('/', (c) => c.redirect('/dashboard'));
  app.get('/dashboard', (c) =>
    c.html(readFileSync(resolve(viewsDir, 'pipeline.html'), 'utf-8')));
  app.get('/agents', (c) =>
    c.html(readFileSync(resolve(viewsDir, 'agents.html'), 'utf-8')));

  serve({ fetch: app.fetch, port, hostname: BIND_HOST });

  console.log(`Jarvis Web Panel — http://localhost:${port}/dashboard`);
  console.log(`   引擎: http://localhost:${enginePort}`);
  console.log(`   智能体: http://localhost:${port}/agents`);

  return true;
}

/** 停止引擎 */
export function stopEngine() {
  if (!existsSync(PID_FILE)) { console.log('No running engine found.'); return; }
  const pid = readFileSync(PID_FILE, 'utf-8').trim();
  try {
    process.kill(Number(pid), 'SIGTERM');
    try { unlinkSync(PID_FILE); } catch {}
    console.log(`Engine stopped (PID ${pid}).`);
  } catch {
    console.log(`Engine not running (stale PID ${pid}).`);
    try { unlinkSync(PID_FILE); } catch {}
  }
}

/** 查询引擎状态 */
export function engineStatus() {
  if (!existsSync(PID_FILE)) { console.log('Engine: not running'); return false; }
  const pid = readFileSync(PID_FILE, 'utf-8').trim();
  try {
    process.kill(Number(pid), 0);
    console.log(`Engine: running (PID ${pid})`);
    return true;
  } catch {
    console.log(`Engine: not running (stale PID ${pid})`);
    try { unlinkSync(PID_FILE); } catch {}
    return false;
  }
}

/** MCP 工具响应 */
function resp(obj) {
  return { content: [{ type: 'text', text: JSON.stringify(obj) }] };
}

/** 从 package.json 读取版本号 */
function readPkgVersion() {
  try {
    return JSON.parse(readFileSync(resolve(import.meta.dirname, '..', '..', 'package.json'), 'utf-8')).version;
  } catch {
    return '?.?.?';
  }
}
