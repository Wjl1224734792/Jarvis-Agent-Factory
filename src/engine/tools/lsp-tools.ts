/**
 * LSP MCP 工具 — 从 OMC lsp-tools.ts vendor + adapt
 * 12 个工具，统一 jarvis_ 前缀
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from './types.js';
import { getOrCreateClient, disconnectAll } from './lsp/client.js';
import { getAllServers, getServerForFile } from './lsp/servers.js';
import { formatHover, formatLocations, formatDocumentSymbols, formatWorkspaceSymbols, formatDiagnostics, formatCodeActions, formatWorkspaceEdit, countEdits } from './lsp/utils.js';

type LspResult<T> = { ok: true; result: T } | { ok: false; error: string };

async function withLsp<T>(root: string, file: string, op: string, fn: (client: any) => Promise<T>): Promise<LspResult<T>> {
  try {
    const cfg = getServerForFile(file);
    if (!cfg) return { ok: false, error: `No language server available for: ${file}` };
    const client = getOrCreateClient(root, file);
    if (!client) return { ok: false, error: `Language server '${cfg.command}' not installed.\nInstall: ${cfg.installHint}` };
    await client.connect();
    const result = await fn(client);
    return { ok: true, result };
  } catch (e: any) {
    return { ok: false, error: `${op}: ${e.message}` };
  }
}

export function registerLspTools(server: McpServer, _db: any, root: string, ctx: ToolContext) {
  server.tool('jarvis_lsp_hover',
    '获取光标位置的类型签名和文档。',
    {
      file: z.string().describe('源文件路径'),
      line: z.number().int().min(1).describe('行号（1-indexed）'),
      character: z.number().int().min(0).describe('列（0-indexed）'),
    },
    async ({ file, line, character }) => {
      const r = await withLsp(root, file, 'hover', c => c.hover(file, line - 1, character));
      if (!r.ok) return ctx.resp({ error: r.error });
      return ctx.resp({ hover: formatHover(r.result as any) });
    });

  server.tool('jarvis_lsp_goto_definition',
    '跳转到符号定义。',
    {
      file: z.string().describe('源文件路径'),
      line: z.number().int().min(1).describe('行号'),
      character: z.number().int().min(0).describe('列'),
    },
    async ({ file, line, character }) => {
      const r = await withLsp(root, file, 'definition', c => c.definition(file, line - 1, character));
      if (!r.ok) return ctx.resp({ error: r.error });
      return ctx.resp({ locations: formatLocations(r.result as any) });
    });

  server.tool('jarvis_lsp_find_references',
    '查找所有引用。',
    {
      file: z.string().describe('源文件路径'),
      line: z.number().int().min(1).describe('行号'),
      character: z.number().int().min(0).describe('列'),
      includeDeclaration: z.boolean().optional().describe('是否包含声明（默认 true）'),
    },
    async ({ file, line, character, includeDeclaration = true }) => {
      const r = await withLsp(root, file, 'references', c => c.references(file, line - 1, character, includeDeclaration));
      if (!r.ok) return ctx.resp({ error: r.error });
      const locs = r.result;
      if (!locs || (Array.isArray(locs) && locs.length === 0)) return ctx.resp({ locations: 'No references found', count: 0 });
      return ctx.resp({ count: Array.isArray(locs) ? locs.length : 0, locations: formatLocations(locs as any) });
    });

  server.tool('jarvis_lsp_document_symbols',
    '获取文件结构大纲（函数/类/变量等）。',
    { file: z.string().describe('源文件路径') },
    async ({ file }) => {
      const r = await withLsp(root, file, 'symbols', c => c.documentSymbols(file));
      if (!r.ok) return ctx.resp({ error: r.error });
      return ctx.resp({ symbols: formatDocumentSymbols(r.result as any) });
    });

  server.tool('jarvis_lsp_workspace_symbols',
    '全局搜索符号。',
    {
      query: z.string().describe('符号名'),
      file: z.string().describe('任意工作区文件（用于定位 LSP）'),
    },
    async ({ query, file }) => {
      const r = await withLsp(root, file, 'workspace symbols', c => c.workspaceSymbols(query));
      if (!r.ok) return ctx.resp({ error: r.error });
      const syms = r.result;
      if (!syms || (Array.isArray(syms) && syms.length === 0)) return ctx.resp({ count: 0, symbols: `No symbols matching: ${query}` });
      return ctx.resp({ count: Array.isArray(syms) ? syms.length : 0, symbols: formatWorkspaceSymbols(syms as any) });
    });

  server.tool('jarvis_lsp_diagnostics',
    '获取文件 LSP 诊断（错误/警告/提示），秒级，无需编译。',
    {
      file: z.string().describe('源文件路径'),
      severity: z.enum(['error', 'warning', 'info', 'hint']).optional().describe('按严重性过滤'),
    },
    async ({ file, severity }) => {
      const r = await withLsp(root, file, 'diagnostics', async c => {
        await c.openDocument(file);
        let diags = c.supportsPullDiagnostics ? await c.pullDiagnostics(file) : [];
        if (severity) {
          const sm: Record<string, number> = { error: 1, warning: 2, info: 3, hint: 4 };
          diags = diags.filter((d: any) => d.severity === sm[severity]);
        }
        return diags;
      });
      if (!r.ok) return ctx.resp({ error: r.error });
      const diags = r.result;
      if (!diags || (Array.isArray(diags) && diags.length === 0)) return ctx.resp({ count: 0, diagnostics: severity ? `No ${severity} diagnostics` : 'No diagnostics' });
      return ctx.resp({ count: diags.length, diagnostics: formatDiagnostics(diags as any, file) });
    });

  server.tool('jarvis_lsp_diagnostics_directory',
    '项目级诊断（tsc --noEmit）。',
    {
      directory: z.string().describe('项目目录'),
      strategy: z.enum(['tsc', 'lsp', 'auto']).optional().describe('策略（默认 auto）'),
    },
    async ({ directory, strategy = 'auto' }) => {
      // 简化：直接用 tsc --noEmit
      const { execSync } = await import('node:child_process');
      try {
        const out = execSync('npx tsc --noEmit 2>&1', { cwd: directory, timeout: 60000, encoding: 'utf-8' });
        return ctx.resp({ strategy: 'tsc', passed: true, output: out || 'No errors', count: 0 });
      } catch (e: any) {
        const stdout = e.stdout || ''; const stderr = e.stderr || '';
        const lines = (stdout + stderr).split('\n').filter(Boolean);
        const errors = lines.filter((l: string) => l.includes('error TS'));
        return ctx.resp({ strategy: 'tsc', passed: false, count: errors.length, diagnostics: errors.slice(0, 50).join('\n') });
      }
    });

  server.tool('jarvis_lsp_servers',
    '列出语言服务器状态。',
    {},
    async () => {
      const all = getAllServers();
      const installed = all.filter(s => s.installed);
      const not = all.filter(s => !s.installed);
      const txt = '## Language Server Status\n\n### Installed:\n' +
        installed.map(s => `- ${s.name} (${s.command}) — ${s.extensions.join(', ')}`).join('\n') +
        '\n\n### Not Installed:\n' +
        not.map(s => `- ${s.name} — Install: ${s.installHint}`).join('\n');
      return ctx.resp({ servers: { installed: installed.length, total: all.length }, details: txt });
    });

  server.tool('jarvis_lsp_prepare_rename',
    '检查符号是否可安全重命名。',
    {
      file: z.string().describe('源文件路径'),
      line: z.number().int().min(1),
      character: z.number().int().min(0),
    },
    async ({ file, line, character }) => {
      const r = await withLsp(root, file, 'prepare rename', c => c.prepareRename(file, line - 1, character));
      if (!r.ok) return ctx.resp({ error: r.error });
      return (r.result as any)
        ? ctx.resp({ renamable: true, range: r.result as any })
        : ctx.resp({ renamable: false, message: 'Cannot rename at this position' });
    });

  server.tool('jarvis_lsp_rename',
    '安全重命名符号（全仓同步）。返回文件编辑列表，不自动应用。',
    {
      file: z.string().describe('源文件路径'),
      line: z.number().int().min(1),
      character: z.number().int().min(0),
      newName: z.string().min(1).describe('新名称'),
    },
    async ({ file, line, character, newName }) => {
      const r = await withLsp(root, file, 'rename', c => c.rename(file, line - 1, character, newName));
      if (!r.ok) return ctx.resp({ error: r.error });
      if (!r.result) return ctx.resp({ ok: false, message: 'Rename returned no edits' });
      const { files, edits } = countEdits(r.result as any);
      return ctx.resp({ ok: true, files, edits, newName, preview: formatWorkspaceEdit(r.result as any) });
    });

  server.tool('jarvis_lsp_code_actions',
    '获取可用重构/修复操作。',
    {
      file: z.string().describe('源文件路径'),
      startLine: z.number().int().min(1),
      startCharacter: z.number().int().min(0),
      endLine: z.number().int().min(1),
      endCharacter: z.number().int().min(0),
    },
    async ({ file, startLine, startCharacter, endLine, endCharacter }) => {
      const range = { start: { line: startLine - 1, character: startCharacter }, end: { line: endLine - 1, character: endCharacter } };
      const r = await withLsp(root, file, 'code actions', c => c.codeActions(file, range as any));
      if (!r.ok) return ctx.resp({ error: r.error });
      return ctx.resp({ actions: formatCodeActions(r.result as any) });
    });

  server.tool('jarvis_lsp_code_action_resolve',
    '查看代码操作的具体变更。',
    {
      file: z.string().describe('源文件路径'),
      startLine: z.number().int().min(1), startCharacter: z.number().int().min(0),
      endLine: z.number().int().min(1), endCharacter: z.number().int().min(0),
      actionIndex: z.number().int().min(1).describe('操作序号（来自 lsp_code_actions 输出）'),
    },
    async ({ file, startLine, startCharacter, endLine, endCharacter, actionIndex }) => {
      const range = { start: { line: startLine - 1, character: startCharacter }, end: { line: endLine - 1, character: endCharacter } };
      const r = await withLsp(root, file, 'code action resolve', async (c: any) => {
        const actions = await c.codeActions(file, range);
        if (!actions || actions.length === 0) return 'No code actions';
        if (actionIndex < 1 || actionIndex > actions.length) return `Invalid index: 1-${actions.length}`;
        const a = actions[actionIndex - 1];
        let txt = `${actionIndex}. ${a.title}\n`;
        if (a.edit) txt += `\n${formatWorkspaceEdit(a.edit)}`;
        if (a.command) txt += `\nCommand: ${a.command.title}`;
        return txt;
      });
      if (!r.ok) return ctx.resp(r);
      return ctx.resp({ detail: r.result });
    });
}
