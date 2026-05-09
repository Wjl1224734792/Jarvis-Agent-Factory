import { Hono } from 'hono';
import { serve, getRequestListener } from '@hono/node-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { openDb, getPipeline, initPipeline, getCheckpoints, addCheckpoint, updatePipelineGate, getSessions, getSession, addSession, touchSession, removeSession, markStaleSessions, migrateSession, getAgentConfig, setAgentModel, createPipelineRun, getActiveRun, updateRunGate, updateRunGateEnteredAt, setRunTaskName } from './db.js';
import { GATE_CHECKS, GATE_DIRS, PIPELINE_DEFS, findGateArtifacts, formatGateDisplay, getPipelineGates, getPipelineName, getGateOperations, getGateAgentGuide, DEFAULT_PIPELINE } from './gates.js';
import { getAgentsByPlatform, getPlatforms, getPlatformModels, getAgentList } from './agent-registry.js';
import { setupApiRoutes } from '../web/routes.js';

const PID_FILE = resolve(homedir(), '.jarvis', 'engine.pid');
const DEFAULT_PORT = 3456;
const DEFAULT_WEB_PORT = 3457;
const SESSION_TIMEOUT = 7_200_000; // 2小时无活动 → 标记 inactive（个人工具，不需要频繁过期）

/** stdio 模式下 extra?.sessionId 为空，用此变量记录最近一次 session_join 的会话 ID */
let _lastSessionId = null;

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

  // 旧数据库迁移：从 <projectRoot>/.jarvis/ 移动到 ~/.jarvis/
  const oldDbPath = resolve(root, '.jarvis', 'engine.db');
  const newDbPath = resolve(homedir(), '.jarvis', 'engine.db');
  if (existsSync(oldDbPath) && !existsSync(newDbPath)) {
    copyFileSync(oldDbPath, newDbPath);
    for (const suffix of ['-wal', '-shm']) {
      const oldAux = oldDbPath + suffix;
      const newAux = newDbPath + suffix;
      if (existsSync(oldAux)) copyFileSync(oldAux, newAux);
    }
    console.log('  ✓  旧数据库已迁移: ' + oldDbPath + ' → ' + newDbPath);
  }

  const app = new Hono();
  const mcpServer = new McpServer({ name: 'jarvis-engine', version: readPkgVersion() });
  const db = openDb();

  // 过期标记：每 5 分钟检查一次（活动追踪在每次工具调用时自动完成）
  setInterval(() => { markStaleSessions(db, SESSION_TIMEOUT); }, 300_000);

  // ---- MCP Tools (不变) ----
  registerMcpTools(mcpServer, db, root);

  const log = (...args) => (stdio ? process.stderr : process.stdout).write(args.join(' ') + '\n');

  // 注册 REST API 路由（Hono）
  setupApiRoutes(app, db, root);

  // SPA 静态资源 & Web 面板（jarvis engine start 一站式服务）
  const webDistDir = resolve(import.meta.dirname, '..', '..', 'dist', 'web');
  // 静态文件：/assets/* 映射到 dist/web/assets/
  app.get('/assets/*', async (c) => {
    const filePath = c.req.path.replace(/^\/assets\//, '');
    const fullPath = resolve(webDistDir, 'assets', filePath);
    if (!fullPath.startsWith(resolve(webDistDir, 'assets'))) {
      return c.text('Forbidden', 403);
    }
    if (!existsSync(fullPath)) return c.text('Not Found', 404);
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mime: Record<string, string> = {
      js: 'application/javascript', css: 'text/css', svg: 'image/svg+xml',
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', woff: 'font/woff', woff2: 'font/woff2',
    };
    return new Response(readFileSync(fullPath), {
      status: 200,
      headers: { 'Content-Type': mime[ext || ''] || 'application/octet-stream' },
    });
  });
  // SPA catch-all：非 API/非 assets 路径返回 index.html
  const indexPath = resolve(webDistDir, 'index.html');
  const indexHtml = existsSync(indexPath) ? readFileSync(indexPath, 'utf-8') : null;
  app.get('*', (c) => {
    if (!indexHtml) {
      return c.html(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#FAFAEE;color:#51463B;text-align:center">
        <h2>Web 面板未构建</h2>
        <p>请运行 <code>npm run build:web</code> 构建前端产物。</p>
      </body></html>`);
    }
    return c.html(indexHtml);
  });

  if (stdio) {
    // ---- Stdio Transport：MCP 通过 stdin/stdout，Claude Code 自动拉起 ----
    // 先启动 HTTP 服务器（确保 jarvis web 立即可用），再连接 MCP
    try {
      if (!(await isPortInUse(port))) {
        serve({ fetch: app.fetch, port, hostname: BIND_HOST });
        log(`Jarvis Engine v${readPkgVersion()} — stdio MCP`);
        log(`   API: http://localhost:${port}/api/pipeline`);
        log(`   Web: http://localhost:${port}`);
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
      if (req.url?.startsWith('/mcp')) {
        let body;
        if (['POST', 'DELETE'].includes(req.method!)) {
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
      console.log(`   MCP:  http://localhost:${port}/mcp`);
      console.log(`   API:  http://localhost:${port}/api/pipeline`);
      console.log(`   Web:  http://localhost:${port}`);
    });
  }
}

/**
 * 平台特性映射：根据 PLATFORM_CONFIG.subdirs 推导，排除 'agents' 后即为平台独有特性。
 * - opencode 支持 plugins（插件市场）
 * - claude 支持 commands（自定义命令）
 * - codex 无额外特性
 */
const PLATFORM_FEATURES: Record<string, string[]> = {
  claude: ['commands'],
  opencode: ['plugins'],
  codex: [],
};

/** 平台信息——单平台查询 */
interface PlatformInfoSingle {
  platform: string;
  agent_count: number;
  available_models: string[];
  features: string[];
  agents: Array<{
    id: string; name: string; role: string; category?: string;
    defaultModel: string; defaultEffort: string;
  }>;
}

/** 平台信息——汇总查询 */
interface PlatformInfoSummary {
  platforms: Record<string, { agent_count: number; available_models: string[]; features: string[] }>;
  total_agents: number;
}

/** 平台信息——错误响应 */
interface PlatformInfoError {
  error: string;
}

type PlatformInfoResult = PlatformInfoError | PlatformInfoSingle | PlatformInfoSummary;

/**
 * 解析平台信息：汇总或单平台查询。
 * 提取为独立函数以便于测试，不依赖 MCP 工具框架。
 *
 * @param platform - 可选平台名称（claude/opencode/codex），不传则返回全部平台汇总
 * @returns 平台信息对象（不含 MCP content 包装层）
 */
export function resolvePlatformInfo(platform?: string): PlatformInfoResult {
  const platforms = getPlatforms();
  const models = getPlatformModels(true);

  if (platform) {
    if (!platforms.includes(platform)) {
      return { error: `Unknown platform: ${platform}. Available: ${platforms.join(', ')}` };
    }
    const agents = getAgentsByPlatform(platform, true);
    return {
      platform,
      agent_count: agents.length,
      available_models: models[platform] || [],
      features: PLATFORM_FEATURES[platform] || [],
      agents: agents.map(a => ({
        id: a.id, name: a.name, role: a.role, category: a.category,
        defaultModel: a.defaultModel, defaultEffort: a.defaultEffort,
      })),
    };
  }

  const summary: Record<string, { agent_count: number; available_models: string[]; features: string[] }> = {};
  for (const p of platforms) {
    const agents = getAgentsByPlatform(p, true);
    summary[p] = {
      agent_count: agents.length,
      available_models: models[p] || [],
      features: PLATFORM_FEATURES[p] || [],
    };
  }
  return { platforms: summary, total_agents: getAgentList(true).length };
}

/** 注册所有 MCP 工具 */
function registerMcpTools(server, db, root) {
  /** 解析 sessionId 并自动记录活动——每次工具调用即视为心跳 */
  const resolveSid = (extra) => {
    const sid = extra?.sessionId || _lastSessionId;
    if (sid) touchSession(db, sid);
    return sid;
  };

  server.tool('session_join',
    '注册/恢复会话。每个会话独立流水线状态。支持 resume_session_id 恢复旧会话，pipeline_type 指定流水线类型（full/frontend/backend）。',
    {
      platform: z.enum(['claude', 'opencode', 'codex', 'other']).optional(),
      resume_session_id: z.string().optional(),
      pipeline_type: z.string().optional(),
    },
    async ({ platform, resume_session_id, pipeline_type }, extra) => {
      const sid = extra?.sessionId || `s${Date.now()}`;
      _lastSessionId = sid; // stdio 模式回退：记录最近会话
      const pt = pipeline_type || DEFAULT_PIPELINE;
      // 白名单校验 pipeline_type，防止存储型 XSS
      if (!['full', 'frontend', 'backend', 'lite'].includes(pt)) {
        return resp({ error: `Invalid pipeline_type: ${pt}. Valid: full, frontend, backend, lite` });
      }
      if (resume_session_id) {
        const old = getSession(db, resume_session_id);
        if (old) {
          migrateSession(db, resume_session_id, sid);
          removeSession(db, resume_session_id);
        }
      }
      const existing = getSession(db, sid);
      if (existing) {
        touchSession(db, sid);
        const p = getPipeline(db, sid);
        // Session Model B: 无活跃 run 时自动创建并设置默认任务名
        let runId = getActiveRun(db, sid)?.id;
        if (!runId) {
          runId = createPipelineRun(db, sid, p?.project || root, p?.pipeline_type || pt);
          const proj = (p?.project || root || '').split(/[\\/]/).filter(Boolean).pop() || 'project';
          const now = new Date();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          setRunTaskName(db, runId, `${proj} · ${mm}-${dd}`);
        }
        return resp({
          session_id: sid, platform: existing.platform,
          gate: p?.current_gate || 'Gate A',
          pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE,
          project: p?.project || root, run_id: runId, resumed: false,
        });
      }
      addSession(db, sid, platform || 'unknown', 'member');
      if (!getPipeline(db, sid)) initPipeline(db, sid, root, pt);
      const p = getPipeline(db, sid);
      const runId = createPipelineRun(db, sid, p?.project || root, p?.pipeline_type || pt);
      const proj = (p?.project || root || '').split(/[\\/]/).filter(Boolean).pop() || 'project';
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setRunTaskName(db, runId, `${proj} · ${mm}-${dd}`);
      return resp({
        session_id: sid, platform: platform || 'unknown',
        gate: p?.current_gate || 'Gate A',
        pipeline_type: pt, project: p?.project || root, run_id: runId,
        message: '\u{1F195} 新会话已初始化，独立流水线已就绪。',
        resumed: !!resume_session_id,
      });
    });

  server.tool('session_heartbeat', '心跳保活——活动追踪模式下仅标记当前会话活跃。', {},
    async (_args, extra) => {
      const sid = resolveSid(extra);
      return resp({ ok: true, session_id: sid || 'unknown' });
    });

  server.tool('session_list', '列出所有会话（含活跃和休眠）。', {}, async () => {
    markStaleSessions(db, SESSION_TIMEOUT);
    const sessions = getSessions(db).map(s => {
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

  server.tool('session_set_name',
    '设置当前流水线运行的任务名称。空字符串清除名称。',
    {
      name: z.string().describe('任务名称（如"给web增加归档功能"），空字符串清除名称'),
    },
    async ({ name }, extra) => {
      const sid = resolveSid(extra);
      if (!sid) return resp({ ok: false, error: 'session_id required. Call session_join first.' });
      const run = getActiveRun(db, sid);
      if (!run) return resp({ ok: false, error: 'No active pipeline run found. Call pipeline_init first.' });
      const result = setRunTaskName(db, run.id, name);
      return resp(result);
    });

  server.tool('pipeline_init', '【会话隔离】初始化当前会话流水线。',
    { project_name: z.string().optional(), pipeline_type: z.string().optional() },
    async ({ project_name, pipeline_type }, extra) => {
      const sid = resolveSid(extra);
      if (!sid) return resp({ error: 'session_id required. Call session_join first.' });
      const pt = pipeline_type || DEFAULT_PIPELINE;
      // Session Model B: 创建新 run，同步更新 pipeline 快照
      const runId = createPipelineRun(db, sid, project_name || root, pt);
      initPipeline(db, sid, project_name || root, pt);
      // 自动设置任务名称（若用户未显式传入）
      const effectiveProject = project_name || root;
      const projectShortName = effectiveProject.split(/[\\/]/).filter(Boolean).pop() || effectiveProject;
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const defaultTaskName = `${projectShortName} 流水线任务 · ${mm}-${dd}`;
      setRunTaskName(db, runId, defaultTaskName);
      return resp({
        ok: true, session_id: sid, run_id: runId, pipeline_type: pt,
        message: 'New pipeline run created. Next: Gate A',
        state: getPipeline(db, sid),
      });
    });

  server.tool('pipeline_status', '【会话隔离】当前会话流水线状态。',
    { run_id: z.string().optional() },
    async ({ run_id }, extra) => {
      const sid = resolveSid(extra);
      if (!sid) return resp({ error: 'session_id required. Call session_join first.' });
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
      const runId = run_id || getActiveRun(db, sid)?.id;
      return resp({
        session_id: sid, project: root, pipeline_type: pt,
        pipeline_name: getPipelineName(pt),
        current_gate: current,
        completed: gates.filter(g => g.passed).map(g => g.gate),
        gates,
        run_id: runId,
        all_sessions: getSessions(db).map(s => ({
          id: s.id, gate: getPipeline(db, s.id)?.current_gate || '?',
        })),
        _display: formatGateDisplay(gates, current),
      });
    });

  server.tool('gate_enforce', '【会话隔离·硬约束】验证Gate条件。',
    { gate: z.string().optional(), run_id: z.string().optional() },
    async ({ gate, run_id }, extra) => {
      const sid = resolveSid(extra);
      if (!sid) return resp({ error: 'session_id required. Call session_join first.' });
      const runId = run_id || getActiveRun(db, sid)?.id;
      const gateList = sessionGates(db, sid);
      const target = gate || getPipeline(db, sid)?.current_gate || gateList[0];
      const artifacts = findGateArtifacts(join(root, 'docs'), target);
      const checkpoints = getCheckpoints(db, target, sid);
      const allowed = artifacts.length > 0 || checkpoints.length > 0;
      return resp(allowed
        ? { gate: target, allowed: true, session_id: sid, run_id: runId, message: `${target} — proceed.` }
        : {
            gate: target, allowed: false, session_id: sid, run_id: runId,
            blocked_reasons: [artifacts.length ? '' : `No artifacts in docs/${GATE_DIRS[target] || '?'}/`].filter(Boolean),
            action_required: GATE_CHECKS[target]?.check || '',
          });
    });

  server.tool('advance_gate', '【会话隔离·硬约束】推进Gate。',
    { gate: z.string(), run_id: z.string().optional() },
    async ({ gate, run_id }, extra) => {
      const sid = resolveSid(extra);
      if (!sid) return resp({ error: 'session_id required. Call session_join first.' });
      const runId = run_id || getActiveRun(db, sid)?.id;
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
      // TASK-001: 计算当前 Gate 耗时（进入时间 → 现在）
      let durationSeconds: number | null = null;
      if (runId) {
        const enteredRow = db.prepare("SELECT strftime('%s', gate_entered_at) AS entered_epoch FROM pipeline_runs WHERE id=?").get(runId);
        if (enteredRow?.entered_epoch) {
          const enteredEpoch = Number(enteredRow.entered_epoch);
          durationSeconds = Math.floor(Date.now() / 1000) - enteredEpoch;
        }
      }
      addCheckpoint(db, cur, gate, sid, durationSeconds ?? undefined);
      updatePipelineGate(db, sid, gate);
      // Session Model B: 同步更新 pipeline_runs 中的 current_gate 和新 Gate 进入时间
      if (runId) {
        updateRunGate(db, runId, gate);
        updateRunGateEnteredAt(db, runId, new Date().toISOString());
      }
      return resp({
        allowed: true, session_id: sid, run_id: runId, previous_gate: cur, current_gate: gate,
        next: gateList[ti + 1] || 'Complete',
        message: gateList[ti + 1] ? `Next: ${gateList[ti + 1]}` : 'Complete!',
        duration_seconds: durationSeconds ?? null,
      });
    });

  server.tool('gate_jump',
    '【lite模式·入口跳转】跳过无关Gate直接进入目标Gate。仅当pipeline_type为lite时可用。',
    { gate: z.string().describe('目标Gate，如 Gate C / Gate D / Gate E'), run_id: z.string().optional() },
    async ({ gate, run_id }, extra) => {
      const sid = resolveSid(extra);
      if (!sid) return resp({ error: 'session_id required. Call session_join first.' });
      const runId = run_id || getActiveRun(db, sid)?.id;
      const p = getPipeline(db, sid);
      const pt = p?.pipeline_type || DEFAULT_PIPELINE;
      const def = PIPELINE_DEFS[pt];
      if (!def?.allow_jump) return resp({ allowed: false, error: `gate_jump 仅在 lite 模式可用。当前: ${pt}` });
      const gateList = sessionGates(db, sid);
      const ti = gateList.indexOf(gate);
      if (ti === -1) return resp({ allowed: false, error: `未知 Gate: ${gate}。有效: ${gateList.join(', ')}` });
      updatePipelineGate(db, sid, gate);
      // TASK-001: 写入目标 Gate 的进入时间
      if (runId) {
        updateRunGate(db, runId, gate);
        updateRunGateEnteredAt(db, runId, new Date().toISOString());
      }
      return resp({
        allowed: true, session_id: sid, run_id: runId, pipeline_type: pt, entry_gate: gate,
        message: `已跳转至 ${gate}，跳过了 ${gateList.slice(0, ti).join(', ')}。剩余: ${gateList.slice(ti).join(' → ')}`,
      });
    });

  server.tool('report_status', '【会话隔离】流水线完整报告。',
    { run_id: z.string().optional() },
    async ({ run_id }, extra) => {
      const sid = resolveSid(extra);
      if (!sid) return resp({ error: 'session_id required. Call session_join first.' });
      const runId = run_id || getActiveRun(db, sid)?.id;
      const gateList = sessionGates(db, sid);
      const gates = gateList.map(g => ({
        gate: g, passed: getCheckpoints(db, g, sid).length > 0,
        artifacts: findGateArtifacts(join(root, 'docs'), g),
      }));
      const completed = gates.filter(g => g.passed).length;
      return resp({
        session_id: sid, project: root, run_id: runId,
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
      run_id: z.string().optional(),
    },
    async ({ operation, run_id }, extra) => {
      const sid = resolveSid(extra);
      if (!sid) return resp({ error: 'session_id required. Call session_join first.' });
      const runId = run_id || getActiveRun(db, sid)?.id;
      const p = getPipeline(db, sid);
      const gateList = sessionGates(db, sid);
      const cur = p?.current_gate || gateList[0];
      const ops = getGateOperations(cur);
      const allowed = ops.allow.includes(operation);
      if (allowed) return resp({ allowed: true, gate: cur, operation, session_id: sid, run_id: runId, message: `${operation} 在 ${cur} 允许执行` });
      return resp({
        allowed: false, gate: cur, operation, session_id: sid, run_id: runId,
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
    { run_id: z.string().optional() },
    async ({ run_id }, extra) => {
      const sid = resolveSid(extra);
      if (!sid) return resp({ error: 'session_id required. Call session_join first.' });
      const runId = run_id || getActiveRun(db, sid)?.id;
      const p = getPipeline(db, sid);
      const gateList = sessionGates(db, sid);
      const cur = p?.current_gate || gateList[0];
      const ci = gateList.indexOf(cur);
      const ops = getGateOperations(cur);
      const agentGuide = getGateAgentGuide(cur);
      return resp({
        session_id: sid, gate: cur, gate_index: ci + 1, total_gates: gateList.length,
        pipeline_type: p?.pipeline_type || DEFAULT_PIPELINE,
        pipeline_name: getPipelineName(p?.pipeline_type || DEFAULT_PIPELINE),
        run_id: runId,
        allowed_operations: ops.allow, forbidden_operations: ops.deny,
        agent_spawn: agentGuide || { can_spawn: [], note: '未知Gate' },
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
    '获取平台信息：支持哪些平台（claude/opencode/codex）、各平台 Agent 数量、可用模型列表、平台特性（features）。Claude 支持 commands 特性，OpenCode 支持 plugins 特性，Codex 无额外特性。用于引擎扩展和平台适配。',
    { platform: z.string().optional().describe('指定平台名称（claude/opencode/codex），不传则返回全部平台信息') },
    async ({ platform }) => {
      const result = resolvePlatformInfo(platform);
      return resp(result);
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
      /** @type {Record<string, string>} */
      const respHeaders = {};
      resp.headers.forEach((v, k) => respHeaders[k] = v);
      return new Response(resp.body, { status: resp.status, headers: respHeaders });
    } catch {
      return c.json({ error: 'Engine SSE unreachable' }, 502);
    }
  });

  // 代理 /api/* 请求到引擎（通配符路由放在最后）
  app.all('/api/*', async (c) => {
    /** @type {Record<string, string>} */
    const reqHeaders = {};
    for (const [k, v] of c.req.raw.headers.entries()) {
      if (['host', 'connection', 'keep-alive'].includes(k.toLowerCase())) continue;
      reqHeaders[k] = v;
    }
    if (!reqHeaders['content-type'] && ['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
      reqHeaders['content-type'] = 'application/json';
    }

    let body: string | undefined = undefined;
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
      /** @type {Record<string, string>} */
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

  // SPA 静态资源服务：dist/web/ 目录
  const webDistDir = resolve(import.meta.dirname, '..', '..', 'dist', 'web');

  // 静态文件：/assets/* 映射到 dist/web/assets/
  app.get('/assets/*', async (c) => {
    const filePath = c.req.path.replace(/^\/assets\//, '');
    const fullPath = resolve(webDistDir, 'assets', filePath);
    // 路径遍历防护
    if (!fullPath.startsWith(resolve(webDistDir, 'assets'))) {
      return c.text('Forbidden', 403);
    }
    if (!existsSync(fullPath)) return c.text('Not Found', 404);
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mime: Record<string, string> = {
      js: 'application/javascript', css: 'text/css', svg: 'image/svg+xml',
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', woff: 'font/woff', woff2: 'font/woff2',
    };
    return new Response(readFileSync(fullPath), {
      status: 200,
      headers: { 'Content-Type': mime[ext || ''] || 'application/octet-stream' },
    });
  });

  // SPA catch-all：非 API/非 assets 路径返回 index.html
  const indexPath = resolve(webDistDir, 'index.html');
  const indexHtml = existsSync(indexPath)
    ? readFileSync(indexPath, 'utf-8')
    : null;

  app.get('*', (c) => {
    if (!indexHtml) {
      return c.html(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#FAFAEE;color:#51463B;text-align:center">
        <h2>Web 面板未构建</h2>
        <p>请运行 <code>cd web && npm run build</code> 构建前端产物。</p>
      </body></html>`);
    }
    return c.html(indexHtml);
  });

  serve({ fetch: app.fetch, port, hostname: BIND_HOST });

  console.log(`Jarvis Web Panel — http://localhost:${port}`);
  console.log(`   引擎: http://localhost:${enginePort}`);

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
