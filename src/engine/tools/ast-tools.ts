/**
 * AST 结构化搜索替换 — 从 OMC ast-tools.ts vendor + adapt
 * 依赖 @ast-grep/napi（Anthropic 赞助，MIT 协议）
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, relative, isAbsolute } from 'node:path';
import { createRequire } from 'node:module';
import type { ToolContext } from './types.js';

const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'tsx', 'python', 'ruby', 'go', 'rust',
  'java', 'kotlin', 'swift', 'c', 'cpp', 'csharp', 'html', 'css', 'json', 'yaml',
] as const;

const EXT_TO_LANG: Record<string, string> = {
  '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript', '.jsx': 'javascript',
  '.ts': 'typescript', '.mts': 'typescript', '.cts': 'typescript', '.tsx': 'tsx',
  '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust', '.java': 'java',
  '.kt': 'kotlin', '.kts': 'kotlin', '.swift': 'swift',
  '.c': 'c', '.h': 'c', '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.hpp': 'cpp',
  '.cs': 'csharp', '.html': 'html', '.htm': 'html', '.css': 'css',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
};

// ---- lazy load @ast-grep/napi ----
let sgModule: typeof import('@ast-grep/napi') | null = null;
let sgLoadFailed = false;
let sgLoadError = '';

async function getSgModule() {
  if (sgLoadFailed) return null;
  if (!sgModule) {
    try {
      const require = createRequire(import.meta.url || process.cwd() + '/');
      sgModule = require('@ast-grep/napi');
    } catch {
      try { sgModule = await import('@ast-grep/napi'); } catch (error) {
        sgLoadFailed = true;
        sgLoadError = error instanceof Error ? error.message : String(error);
        return null;
      }
    }
  }
  return sgModule;
}

function toLang(sg: typeof import('@ast-grep/napi'), language: string): any {
  const m: Record<string, string> = {
    javascript: 'JavaScript', typescript: 'TypeScript', tsx: 'Tsx',
    python: 'Python', ruby: 'Ruby', go: 'Go', rust: 'Rust',
    java: 'Java', kotlin: 'Kotlin', swift: 'Swift',
    c: 'C', cpp: 'Cpp', csharp: 'CSharp',
    html: 'Html', css: 'Css', json: 'Json', yaml: 'Yaml',
  };
  const key = m[language];
  if (!key) throw new Error(`Unsupported language: ${language}`);
  return (sg.Lang as any)[key];
}

// ---- 路径安全校验（Jarvis 适配版） ----
function validatePath(root: string, inputPath: string): string {
  const resolved = resolve(inputPath);
  const rel = relative(resolve(root), resolved);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Path '${inputPath}' is outside project root.`);
  }
  return resolved;
}

function getFilesForLanguage(dirPath: string, language: string, maxFiles = 1000): string[] {
  const files: string[] = [];
  const extensions = Object.entries(EXT_TO_LANG).filter(([, l]) => l === language).map(([e]) => e);
  const skip = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__', '.venv', 'venv']);

  function walk(dir: string) {
    if (files.length >= maxFiles) return;
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (files.length >= maxFiles) return;
        const fp = join(dir, entry.name);
        if (entry.isDirectory()) { if (!skip.has(entry.name)) walk(fp); }
        else if (entry.isFile() && extensions.includes(extname(entry.name).toLowerCase())) files.push(fp);
      }
    } catch { /* permission errors */ }
  }

  const rp = resolve(dirPath);
  try { if (statSync(rp).isFile()) return [rp]; } catch (e: any) { throw new Error(`Cannot access "${rp}": ${e.message}`, { cause: e }); }
  walk(rp);
  return files;
}

function formatMatch(filePath: string, matchText: string, startLine: number, endLine: number, ctx: number, content: string): string {
  const lines = content.split('\n');
  const cs = Math.max(0, startLine - ctx - 1);
  const ce = Math.min(lines.length, endLine + ctx);
  return `${filePath}:${startLine}\n` + lines.slice(cs, ce).map((line, i) => {
    const ln = cs + i + 1;
    return `${ln >= startLine && ln <= endLine ? '>' : ' '} ${String(ln).padStart(4)}: ${line}`;
  }).join('\n');
}

// ---- MCP 工具注册 ----
export function registerAstTools(server: McpServer, _db: any, root: string, ctx: ToolContext) {
  server.tool('jarvis_ast_search',
    `AST 结构化搜索——用语法树匹配，比文本 Grep 更精确。支持 17 种语言。
meta-variables: $NAME 匹配单个 AST 节点, $$$ARGS 匹配多个节点。
示例: "console.log($MSG)" → 只搜代码中的 console.log 调用（注释/字符串不匹配）`,
    {
      pattern: z.string().describe('AST 匹配模式（如 "function $NAME($$$ARGS)"）'),
      language: z.enum(SUPPORTED_LANGUAGES).describe('编程语言'),
      path: z.string().optional().describe('搜索路径（默认项目根目录）'),
      context: z.number().int().min(0).max(10).optional().describe('上下文行数（默认 2）'),
      maxResults: z.number().int().min(1).max(100).optional().describe('最大结果数（默认 20）'),
    },
    async ({ pattern, language, path = '.', context = 2, maxResults = 20 }, extra) => {
      try {
        const validated = validatePath(root, path);
        const sg = await getSgModule();
        if (!sg) return ctx.resp({ error: `@ast-grep/napi 未安装。npm install @ast-grep/napi\n${sgLoadError}` });

        const files = getFilesForLanguage(validated, language);
        if (files.length === 0) return ctx.resp({ results: [], count: 0, message: `No ${language} files in ${path}` });

        const results: string[] = [];
        let total = 0;
        for (const fp of files) {
          if (total >= maxResults) break;
          try {
            const content = readFileSync(fp, 'utf-8');
            const root = sg.parse(toLang(sg, language), content).root();
            for (const m of root.findAll(pattern)) {
              if (total >= maxResults) break;
              const r = m.range();
              results.push(formatMatch(fp, m.text(), r.start.line + 1, r.end.line + 1, context, content));
              total++;
            }
          } catch { /* parse failure */ }
        }

        if (results.length === 0) {
          return ctx.resp({ results: [], count: 0, files_scanned: files.length, message: `No matches for: ${pattern}` });
        }
        return ctx.resp({ results, count: total, files_scanned: files.length, pattern, language });
      } catch (e) {
        return ctx.resp({ error: e instanceof Error ? e.message : String(e) });
      }
    });

  server.tool('jarvis_ast_replace',
    `AST 结构化替换——用语法树匹配后替换。dryRun=true（默认，仅预览），dryRun=false 真正写入文件。
示例: "var $NAME = $VALUE" → "const $NAME = $VALUE"`,
    {
      pattern: z.string().describe('匹配模式'),
      replacement: z.string().describe('替换模式（使用相同 meta-variables）'),
      language: z.enum(SUPPORTED_LANGUAGES).describe('编程语言'),
      path: z.string().optional().describe('搜索路径（默认项目根目录）'),
      dryRun: z.boolean().optional().describe('仅预览不写入（默认 true）'),
    },
    async ({ pattern, replacement, language, path = '.', dryRun = true }, extra) => {
      try {
        const validated = validatePath(root, path);
        const sg = await getSgModule();
        if (!sg) return ctx.resp({ error: `@ast-grep/napi 未安装。npm install @ast-grep/napi\n${sgLoadError}` });

        const files = getFilesForLanguage(validated, language);
        if (files.length === 0) return ctx.resp({ results: [], count: 0, message: `No ${language} files in ${path}` });

        const changes: { file: string; before: string; after: string; line: number }[] = [];
        let total = 0;

        for (const fp of files) {
          try {
            const content = readFileSync(fp, 'utf-8');
            const root = sg.parse(toLang(sg, language), content).root();
            const matches = root.findAll(pattern);
            if (matches.length === 0) continue;

            const edits: { start: number; end: number; replacement: string; line: number; before: string }[] = [];
            for (const match of matches) {
              const range = match.range();
              let finalRep = replacement;
              try {
                for (const mv of replacement.match(/\$\$?\$?[A-Z_][A-Z0-9_]*/g) || []) {
                  const varName = mv.replace(/^\$+/, '');
                  const captured = match.getMatch(varName);
                  if (captured) finalRep = finalRep.replaceAll(mv, captured.text().replace(/\$/g, '$$$$'));
                }
              } catch { /* meta-var substitution best-effort */ }

              edits.push({ start: range.start.index, end: range.end.index, replacement: finalRep, line: range.start.line + 1, before: match.text() });
            }

            edits.sort((a, b) => b.start - a.start);
            let newContent = content;
            for (const e of edits) {
              newContent = newContent.slice(0, e.start) + e.replacement + newContent.slice(e.end);
              changes.push({ file: fp, before: e.before, after: e.replacement, line: e.line });
              total++;
            }

            if (!dryRun && edits.length > 0) writeFileSync(fp, newContent, 'utf-8');
          } catch { /* parse failure */ }
        }

        if (changes.length === 0) {
          return ctx.resp({ results: [], count: 0, files_scanned: files.length, message: `No matches for: ${pattern}` });
        }

        const mode = dryRun ? 'DRY RUN (no changes)' : 'APPLIED';
        const preview = changes.slice(0, 50).map(c => `${c.file}:${c.line}\n  - ${c.before}\n  + ${c.after}`).join('\n\n');
        return ctx.resp({
          mode, count: total, files_scanned: files.length,
          pattern, replacement, language,
          changes: preview + (changes.length > 50 ? `\n\n... and ${changes.length - 50} more` : ''),
          ...(dryRun ? { hint: 'Set dryRun: false to apply changes.' } : {}),
        });
      } catch (e) {
        return ctx.resp({ error: e instanceof Error ? e.message : String(e) });
      }
    });
}
