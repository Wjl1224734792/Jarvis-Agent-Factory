import { Hono } from 'hono';
import { serve, getRequestListener } from '@hono/node-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { openDb, touchSession, markStaleSessions } from './db.js';
import { setupApiRoutes } from '../web/routes.js';
import { readPackageVersion } from '../shared/package-version.js';
import { writePidFile, removePidFile, readPidFile, isEngineRunning, startGuardian, stopGuardian } from './guardian.js';
import type { ToolContext } from './tools/types.js';
import { registerSessionTools } from './tools/session-tools.js';
import { registerPipelineTools } from './tools/pipeline-tools.js';
import { registerGateTools } from './tools/gate-tools.js';
import { registerAgentTools } from './tools/agent-tools.js';
import { registerFlowTools } from './tools/flow-tools.js';
import { registerWikiTools } from './tools/wiki-tools.js';


// ── TASK-003: 全局错误处理 + 请求日志 ─────────────────────

/** 敏感信息脱敏：替换 API 密钥（sk-前缀）、Bearer Token 等 */
export function sanitizeErrorMessage(msg: string): string {
  if (!msg) return '';
  return msg
    .replace(/(sk-[A-Za-z0-9_-]{10,})/g, 'sk-***')
    .replace(/(Bearer\s+)[A-Za-z0-9-._~+/=]{4,}/gi, (_, prefix) => `${prefix}***`);
}

/** 解析错误响应：统一格式 { error: string, code: number } */
export function resolveErrorResponse(err: Error) {
  // 4xx vs 5xx 分类：检查错误是否携带 4xx 状态码
  const status =
    typeof (err as any).status === 'number' &&
    (err as any).status >= 400 &&
    (err as any).status < 500
      ? (err as any).status
      : 500;
  const message = sanitizeErrorMessage(err.message || 'Internal Server Error');
  // 生产环境：5xx 屏蔽具体错误信息，所有错误屏蔽堆栈
  const isProd = process.env.NODE_ENV === 'production';
  const body: Record<string, any> = {
    error: status >= 500 && isProd ? 'Internal Server Error' : message,
    code: status,
  };
  if (!isProd && err.stack) {
    body.stack = err.stack;
  }
  return { status, body };
}

/** 请求日志中间件工厂：记录 [时间戳] [METHOD] /path - status duration_ms */
export function createLoggerMiddleware() {
  return async (c: any, next: any) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    const status = c.res?.status ?? 0;
    const marker = status >= 400 ? ' !!!' : '';
    process.stderr.write(
      `[${new Date().toISOString()}] [${c.req.method}] ${c.req.path} - ${status} ${duration}ms${marker}\n`,
    );
  };
}

// ── 引擎核心 ──────────────────────────────────────────────

const DEFAULT_PORT = 3456;
const DEFAULT_WEB_PORT = 3457;
const SESSION_TIMEOUT = 7_200_000; // 2小时无活动 → 标记 inactive（个人工具，不需要频繁过期）

/** stdio 模式下 extra?.sessionId 为空，用此变量记录最近一次 session_join 的会话 ID */
let _lastSessionId: any = null;

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
/** 扫描冲突文件：检测 .claude/agents/、commands/、skills/ 下含 <<<<<<< user 标记的 .md 文件 */
function scanConflictFiles(projectRoot: string): void {
  const baseDirs = ['.claude/agents', '.claude/commands', '.claude/skills'];
  let scanned = 0;
  const MAX = 200;
  const conflictPaths: string[] = [];

  /** 递归扫描子目录 */
  const scanDir = (dirPath: string, relPath: string): void => {
    if (scanned >= MAX) return;
    if (!existsSync(dirPath)) return;

    let entries: string[];
    try { entries = readdirSync(dirPath); } catch { return; }

    for (const entry of entries) {
      if (scanned >= MAX) return;
      const fullPath = join(dirPath, entry);
      const relEntry = join(relPath, entry).replace(/\\/g, '/');

      let isDir: boolean;
      try { isDir = statSync(fullPath).isDirectory(); } catch { continue; }

      if (isDir) {
        scanDir(fullPath, relEntry);
      } else if (entry.endsWith('.md') || entry.endsWith('.json')) {
        scanned++;
        try {
          const content = readFileSync(fullPath, 'utf-8');
          if (content.includes('<<<<<<< user')) {
            conflictPaths.push(relEntry);
          }
        } catch { /* 文件读取失败跳过 */ }
      }
    }
  };

  for (const dir of baseDirs) {
    if (scanned >= MAX) break;
    scanDir(resolve(projectRoot, dir), dir);
  }

  // 批量输出警告
  for (const f of conflictPaths) {
    console.warn(`  ⚠ 冲突文件: ${f}`);
  }
}

/** 启动 Jarvis 引擎 */
export async function startEngine({ port = DEFAULT_PORT, projectRoot = '.', stdio = false } = {}) {
  const root = resolve(projectRoot);

  // 非 stdio 模式：端口已被占用 → 复用已有引擎
  if (!stdio && await isPortInUse(port)) {
    console.log(`Jarvis Engine already running on port ${port} — reusing existing instance.`);
    if (!isEngineRunning(root) || (readPidFile(root)?.pid !== process.pid)) {
      writePidFile(process.pid, root);
    }
    return true;
  }

  writePidFile(process.pid, root);

  // 检测是否需要从全局 DB 迁移 agent 配置（DB 尚未创建则需迁移）
  const globalDbPath = resolve(homedir(), '.jarvis', 'engine.db');
  const projectDbPath = resolve(root, '.jarvis', 'engine.db');
  const needsMigration = existsSync(globalDbPath) && !existsSync(projectDbPath);

  const app = new Hono();

  // TASK-003: 请求日志中间件（最外层）
  app.use('*', createLoggerMiddleware());

  // TASK-003: 全局 onError（在路由之前注册，确保所有异常被正确捕获）
  app.onError((err, c) => {
    const { status, body } = resolveErrorResponse(err);
    return c.json(body, status as any);
  });

  const mcpServer = new McpServer({ name: 'jarvis-engine', version: readPkgVersion() });
  const db = openDb(root);

  // 迁移：从全局 ~/.jarvis/ 仅迁移用户级 agent 模型偏好到项目级数据库
  // sessions 和 pipeline_runs 是项目级数据，不跨项目复制——每个项目拥有独立的会话记忆
  if (needsMigration) {
    try {
      const globalDb = new DatabaseSync(globalDbPath);
      const models = globalDb.prepare('SELECT agent_id, model, effort FROM agent_models').all();
      if (models.length > 0) {
        for (const m of models) {
          db.prepare('INSERT OR REPLACE INTO agent_models (agent_id, model, effort, updated_at) VALUES (?, ?, ?, ?)')
            .run(m.agent_id, m.model, m.effort, new Date().toISOString());
        }
        process.stderr.write(`  ✓  已从全局迁移 ${models.length} 条 agent 模型偏好到项目级数据库\n`);
      }
      globalDb.close();
    } catch (e) {
      process.stderr.write(`  ⚠  agent 配置迁移失败: ${(e as Error).message}\n`);
    }
  }

  // TASK-003: 冲突文件扫描（不阻塞启动）
  scanConflictFiles(root);

  // 过期标记：每 5 分钟检查一次（活动追踪在每次工具调用时自动完成）
  setInterval(() => { markStaleSessions(db, SESSION_TIMEOUT); }, 300_000);

  // ---- MCP Tools (不变) ----
  registerMcpTools(mcpServer, db, root);

  const log = (...args: any[]) => (stdio ? process.stderr : process.stdout).write(args.join(' ') + '\n');

  // 注册 REST API 路由（Hono）
  setupApiRoutes(app, db, root);

  // TASK-004: 优雅退出端点（Windows PID kill 可能不支持，用 HTTP shutdown 兜底）
  app.post('/api/shutdown', async (c) => {
    const token = process.env.JARVIS_SHUTDOWN_TOKEN;
    if (token && c.req.header('x-shutdown-token') !== token) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    stopGuardian();
    removePidFile(root);
    setTimeout(() => process.exit(0), 100);
    return c.json({ ok: true, message: 'Shutting down...' });
  });

  // SPA 静态资源 & Web 面板（jarvis engine start 一站式服务）
  const webDistDir = getWebDistDir(root);
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
      headers: {
        'Content-Type': mime[ext || ''] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  });
  // SPA catch-all：非 API/非 assets 路径返回 index.html
  const indexPath = resolve(webDistDir, 'index.html');
  app.get('*', (c) => {
    // 静态资源扩展名请求不 fallback 到 index.html，避免 MIME 类型错误
    const staticExts = /\.(js|mjs|ts|tsx|css|scss|json|map|svg|png|jpe?g|ico|woff2?)([?#].*)?$/i;
    if (staticExts.test(c.req.path)) {
      return c.text('Not Found', 404);
    }
    // 每次请求从磁盘重新读取，确保 npm update -g 后无需重启引擎
    if (!existsSync(indexPath)) {
      return c.html(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#fff;color:#1a1a1a;text-align:center">
        <h2>Web 面板未构建</h2>
        <p>请运行 <code>npm run build:web</code> 构建前端产物，或从 GitHub Release 下载预构建包。</p>
      </body></html>`);
    }
    const indexHtml = readFileSync(indexPath, 'utf-8');
    return c.html(indexHtml, 200, { 'Cache-Control': 'no-store, no-cache, must-revalidate' });
  });

  // TASK-004: 优雅退出信号处理（SIGINT/SIGTERM）
  const gracefulShutdown = () => {
    stopGuardian();
    removePidFile(root);
    process.exit(0);
  };
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  // TASK-004: 启动守护进程 — 崩溃自动重启
  // stdio 模式：进程崩溃后退出，由 Claude Code 自动重启进程
  // HTTP 模式：尝试恢复（重新写入 PID 文件）
  const restartHandler = stdio
    ? () => {
        process.stderr.write('[jarvis-engine] stdio mode: exiting after crash, Claude Code will restart.\n');
        process.exit(1);
      }
    : () => {
        writePidFile(process.pid, root);
      };
  startGuardian(port, restartHandler, root);

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
      log(`Jarvis Engine v${readPkgVersion()} — HTTP server unavailable: ${String(e)}`);
    }

    const transport = new StdioServerTransport();
    try {
      await mcpServer.connect(transport);
    } catch (e) {
      log(`FATAL: MCP stdio transport failed — ${(e as Error).message}`);
      log('The engine will now exit. Claude Code will restart it automatically.');
      process.exit(1);
    }
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
              .end(JSON.stringify({ error: String(e) }));
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

/** 注册所有 MCP 工具 */
export function registerMcpTools(server: McpServer, db: DatabaseSync, root: string): void {
  const ctx: ToolContext = {
    resolveSid: (extra) => {
      const sid = extra?.sessionId || _lastSessionId;
      if (sid) touchSession(db, sid);
      return sid;
    },
    resp: (obj) => ({ content: [{ type: 'text' as const, text: JSON.stringify(obj) }] }),
    setLastSessionId: (sid) => { _lastSessionId = sid; },
  };
  registerSessionTools(server, db, root, ctx);
  registerPipelineTools(server, db, root, ctx);
  registerGateTools(server, db, root, ctx);
  registerAgentTools(server, db, root, ctx);
  registerFlowTools(server, db, root, ctx);
  registerWikiTools(server, db, root, ctx);
}

export async function startWeb({ port = DEFAULT_WEB_PORT, enginePort = DEFAULT_PORT, projectRoot = '.' } = {}) {
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

  const root = resolve(projectRoot);
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
  const webDistDir = getWebDistDir(root);

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
      headers: {
        'Content-Type': mime[ext || ''] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  });

  // SPA catch-all：非 API/非 assets 路径返回 index.html
  const indexPath = resolve(webDistDir, 'index.html');

  app.get('*', (c) => {
    // 静态资源扩展名请求不 fallback 到 index.html，避免 MIME 类型错误
    const staticExts = /\.(js|mjs|ts|tsx|css|scss|json|map|svg|png|jpe?g|ico|woff2?)([?#].*)?$/i;
    if (staticExts.test(c.req.path)) {
      return c.text('Not Found', 404);
    }
    // 每次请求从磁盘重新读取，确保 npm update -g 后无需重启引擎
    if (!existsSync(indexPath)) {
      return c.html(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#fff;color:#1a1a1a;text-align:center">
        <h2>Web 面板未构建</h2>
        <p>请运行 <code>cd web && npm run build</code> 构建前端产物。</p>
      </body></html>`);
    }
    const indexHtml = readFileSync(indexPath, 'utf-8');
    return c.html(indexHtml, 200, { 'Cache-Control': 'no-store, no-cache, must-revalidate' });
  });

  serve({ fetch: app.fetch, port, hostname: BIND_HOST });

  console.log(`Jarvis Web Panel — http://localhost:${port}`);
  console.log(`   引擎: http://localhost:${enginePort}`);

  return true;
}

/** 停止引擎 */
export function stopEngine(projectRoot?: string) {
  const data = readPidFile(projectRoot);
  if (!data) { console.log('No running engine found.'); return; }
  try {
    process.kill(data.pid, 'SIGTERM');
    removePidFile(projectRoot);
    console.log(`Engine stopped (PID ${data.pid}).`);
  } catch {
    console.log(`Engine not running (stale PID ${data.pid}).`);
    removePidFile(projectRoot);
  }
}

/** 查询引擎状态 */
export function engineStatus(projectRoot?: string) {
  const data = readPidFile(projectRoot);
  if (!data) { console.log('Engine: not running'); return false; }
  if (isEngineRunning(projectRoot)) {
    const uptime = Math.floor((Date.now() - data.startedAt) / 1000);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;
    const uptimeStr = h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
    console.log(`Engine: running (PID ${data.pid}, uptime ${uptimeStr}, restarts ${data.restartCount})`);
    return true;
  }
  console.log(`Engine: not running (stale PID ${data.pid})`);
  return false;
}

/** 获取 web 面板 dist 目录：JARVIS_DEV=1 → 项目本地；否则 → 包安装目录 */
function getWebDistDir(root: string) {
  if (process.env.JARVIS_DEV === '1' || process.env.JARVIS_DEV === 'true') {
    return resolve(root, 'dist', 'web');
  }
  // import.meta.dirname = <pkg>/dist/src/engine/ → ../../ = <pkg>/dist/
  return resolve(import.meta.dirname, '..', '..', 'web');
}

function readPkgVersion() { return readPackageVersion(import.meta.dirname); }
