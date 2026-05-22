/**
 * LSP Client — 从 OMC lsp/client.ts vendor + adapt
 * 去掉 devcontainer/worktree 逻辑，适配 Jarvis project root
 */
import { spawn, ChildProcess } from 'node:child_process';
import { resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { LspServerConfig } from './servers.js';
import { getServerForFile, commandExists } from './servers.js';

// ---- LSP 协议类型 ----
export interface Position { line: number; character: number; }
export interface Range { start: Position; end: Position; }
export interface Location { uri: string; range: Range; }
export interface Hover { contents: any; range?: Range; }
export interface Diagnostic { range: Range; severity?: number; code?: string | number; source?: string; message: string; }
export interface DocumentSymbol { name: string; kind: number; range: Range; selectionRange: Range; children?: DocumentSymbol[]; }
export interface SymbolInformation { name: string; kind: number; location: Location; containerName?: string; }
export interface WorkspaceEdit {
  changes?: Record<string, Array<{ range: Range; newText: string }>>;
  documentChanges?: Array<{ textDocument: { uri: string }; edits: Array<{ range: Range; newText: string }> }>;
}
export interface CodeAction { title: string; kind?: string; isPreferred?: boolean; edit?: WorkspaceEdit; command?: any; }

interface JsonRpcRequest { jsonrpc: '2.0'; id: number; method: string; params?: unknown; }
interface JsonRpcResponse { jsonrpc: '2.0'; id: number; result?: unknown; error?: { code: number; message: string }; }
interface JsonRpcNotification { jsonrpc: '2.0'; method: string; params?: unknown; }

const DEFAULT_TIMEOUT = 15_000;
const MAX_BUFFER = 50 * 1024 * 1024;

function fileUri(fp: string): string { return pathToFileURL(resolvePath(fp)).href; }

// ---- LspClient 单例缓存 ----
const clientCache = new Map<string, LspClient>();

export function getOrCreateClient(root: string, filePath: string): LspClient | null {
  const config = getServerForFile(filePath);
  if (!config) return null;
  if (!commandExists(config.command)) return null;
  const key = `${root}:${config.command}`;
  if (!clientCache.has(key)) clientCache.set(key, new LspClient(root, config));
  return clientCache.get(key)!;
}

export function disconnectAll() {
  for (const c of clientCache.values()) c.forceKill();
  clientCache.clear();
}

// ---- LSP Client ----
export class LspClient {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timeout: ReturnType<typeof setTimeout> }>();
  private buffer = Buffer.alloc(0);
  private initialized = false;
  public supportsPullDiagnostics = false;

  constructor(private root: string, private config: LspServerConfig) {}

  async connect(): Promise<void> {
    if (this.process) return;
    if (!commandExists(this.config.command)) {
      throw new Error(`Language server '${this.config.command}' not found.\nInstall: ${this.config.installHint}`);
    }
    return new Promise((resolve, reject) => {
      const opts: any = { cwd: resolvePath(this.root), stdio: ['pipe', 'pipe', 'pipe'] };
      if (process.platform === 'win32') opts.shell = true;
      this.process = (spawn as any)(this.config.command, this.config.args, opts);
      const proc = this.process!;
      proc.stdout?.on('data', (d: Buffer) => this.handleData(d));
      proc.stderr?.on('data', (d: Buffer) => console.error(`[lsp:${this.config.command}] ${d.toString().trim()}`));
      proc.on('error', e => reject(new Error(`LSP spawn: ${e.message}`)));
      proc.on('exit', code => {
        this.process = null; this.initialized = false;
        for (const [, p] of this.pending) { clearTimeout(p.timeout); p.reject(new Error(`LSP exited (${code})`)); }
        this.pending.clear();
      });
      this.initialize().then(() => { this.initialized = true; resolve(); }).catch(reject);
    });
  }

  async disconnect() {
    if (!this.process) return;
    try { await this.request('shutdown', null, 3000); this.notify('exit', null); } catch {}
    if (this.process) { this.process.kill(); this.process = null; }
    this.initialized = false;
    for (const [, p] of this.pending) { clearTimeout(p.timeout); p.reject(new Error('disconnected')); }
  }

  forceKill() { if (this.process) { try { this.process.kill('SIGKILL'); } catch {} this.process = null; } }

  get isConnected() { return this.initialized && this.process !== null; }

  // ---- LSP 方法 ----
  async hover(file: string, line: number, character: number): Promise<Hover | null> {
    return this.request('textDocument/hover', { textDocument: { uri: fileUri(file) }, position: { line, character } }) as Promise<Hover | null>;
  }

  async definition(file: string, line: number, character: number): Promise<Location | Location[] | null> {
    return this.request('textDocument/definition', { textDocument: { uri: fileUri(file) }, position: { line, character } }) as Promise<Location | Location[] | null>;
  }

  async references(file: string, line: number, character: number, includeDecl = true): Promise<Location[] | null> {
    return this.request('textDocument/references', {
      textDocument: { uri: fileUri(file) }, position: { line, character },
      context: { includeDeclaration: includeDecl },
    }) as Promise<Location[] | null>;
  }

  async documentSymbols(file: string): Promise<DocumentSymbol[] | SymbolInformation[] | null> {
    return this.request('textDocument/documentSymbol', { textDocument: { uri: fileUri(file) } }) as Promise<DocumentSymbol[] | null>;
  }

  async workspaceSymbols(query: string): Promise<SymbolInformation[] | null> {
    return this.request('workspace/symbol', { query }) as Promise<SymbolInformation[] | null>;
  }

  async prepareRename(file: string, line: number, character: number): Promise<Range | null> {
    return this.request('textDocument/prepareRename', { textDocument: { uri: fileUri(file) }, position: { line, character } }) as Promise<Range | null>;
  }

  async rename(file: string, line: number, character: number, newName: string): Promise<WorkspaceEdit | null> {
    return this.request('textDocument/rename', { textDocument: { uri: fileUri(file) }, position: { line, character }, newName }) as Promise<WorkspaceEdit | null>;
  }

  async codeActions(file: string, range: Range): Promise<CodeAction[] | null> {
    return this.request('textDocument/codeAction', { textDocument: { uri: fileUri(file) }, range, context: { diagnostics: [] } }) as Promise<CodeAction[] | null>;
  }

  async openDocument(file: string) {
    this.notify('textDocument/didOpen', { textDocument: { uri: fileUri(file), languageId: this.config.name, version: 1, text: '' } });
  }

  getDiagnostics(file: string): Diagnostic[] { return []; } // simplified — diagnostics via pull only
  async waitForDiagnostics(_file: string, _ms: number) { /* no-op */ }
  async pullDiagnostics(file: string): Promise<Diagnostic[]> {
    const result = await this.request('textDocument/diagnostic', { textDocument: { uri: fileUri(file) } }) as any;
    return result?.items || [];
  }

  // ---- JSON-RPC 核心 ----
  private async initialize() {
    const result = await this.request('initialize', {
      processId: process.pid,
      rootUri: fileUri(this.root),
      capabilities: {
        textDocument: {
          hover: { contentFormat: ['markdown', 'plaintext'] },
          definition: { linkSupport: true },
          references: {},
          documentSymbol: { hierarchicalDocumentSymbolSupport: true },
          rename: { prepareSupport: true },
          codeAction: {},
        },
        workspace: { symbol: {} },
      },
      workspaceFolders: [{ uri: fileUri(this.root), name: 'workspace' }],
    }, 60000);
    this.notify('initialized', {});
    const caps = (result as any)?.capabilities || {};
    this.supportsPullDiagnostics = !!caps.diagnosticProvider;
  }

  private request(method: string, params: unknown, timeoutMs = DEFAULT_TIMEOUT): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`LSP request timeout: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
      this.send({ jsonrpc: '2.0', id, method, params });
    });
  }

  private notify(method: string, params: unknown) {
    this.send({ jsonrpc: '2.0', method, params });
  }

  private send(msg: JsonRpcRequest | JsonRpcNotification) {
    if (!this.process?.stdin) return;
    const body = JSON.stringify(msg);
    const header = `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`;
    this.process.stdin.write(header + body);
  }

  private handleData(data: Buffer) {
    this.buffer = Buffer.concat([this.buffer, data]);
    if (this.buffer.length > MAX_BUFFER) { this.buffer = Buffer.alloc(0); return; }
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;
      const header = this.buffer.slice(0, headerEnd).toString();
      const match = header.match(/Content-Length: (\d+)/i);
      if (!match) { this.buffer = Buffer.alloc(0); break; }
      const contentLen = parseInt(match[1], 10);
      const msgStart = headerEnd + 4;
      if (this.buffer.length < msgStart + contentLen) break;
      const body = this.buffer.slice(msgStart, msgStart + contentLen).toString();
      this.buffer = this.buffer.slice(msgStart + contentLen);
      try {
        const msg = JSON.parse(body);
        if (msg.id !== undefined && msg.method === undefined) this.handleResponse(msg);
      } catch { /* skip malformed */ }
    }
  }

  private handleResponse(msg: JsonRpcResponse) {
    const pending = this.pending.get(msg.id);
    if (!pending) return;
    clearTimeout(pending.timeout);
    this.pending.delete(msg.id);
    if (msg.error) pending.reject(new Error(msg.error.message));
    else pending.resolve(msg.result);
  }
}
