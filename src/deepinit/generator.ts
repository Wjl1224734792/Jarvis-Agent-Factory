import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import type { DirEntry } from './scanner.js';

/** 简单的 mustache 风格模板渲染（支持嵌套块 + 条件渲染） */
function render(template: string, ctx: Record<string, unknown>): string {
  let result = template;

  // Loop until stable — innermost blocks resolve first, enabling nesting
  let prev = '';
  while (prev !== result) {
    prev = result;
    result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, body) => {
      const items = ctx[key];
      // undefined/null → remove entire block
      if (items === undefined || items === null) return '';
      // empty array → remove
      if (Array.isArray(items) && items.length === 0) return '';
      // non-empty array → iterate
      if (Array.isArray(items)) {
        return items.map((item: unknown) => {
          let b = body;
          if (typeof item === 'string') {
            b = b.replace(/\{\{\.\}\}/g, item);
          } else if (item && typeof item === 'object') {
            for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
              const escapedKey = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              b = b.replace(new RegExp(`\\{\\{\\.${escapedKey}\\}\\}`, 'g'), String(v ?? ''));
            }
          }
          return b;
        }).join('');
      }
      // truthy scalar → conditional: render body once (for strings like "some content")
      if (items) return body;
      return '';
    });
  }

  // {{var}} 简单替换
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => String(ctx[key] ?? ''));

  return result;
}

export interface GenContext {
  entry: DirEntry;
  rootDir: string;
  now: string;
}

/**
 * 为单个目录生成 AGENTS.md 内容。
 */
export function generateAgentsMd(entry: DirEntry, parentRel: string | null, ctx: GenContext): string {
  const templatePath = resolve(ctx.rootDir, 'src', 'templates', 'deepinit', 'AGENTS.md.tmpl');
  let tmpl: string;
  try {
    tmpl = readFileSync(templatePath, 'utf-8');
  } catch {
    // fallback: use inline template
    tmpl = FALLBACK_AGENTS_TMPL;
  }

  const keyFiles = entry.files.slice(0, 20).map(f => ({
    name: f,
    desc: describeFile(f, entry),
  }));

  const subdirs = entry.subdirs.map(s => ({
    name: s.name,
    desc: describeDir(s.name),
  }));

  const aiInstructions = generateAiInstructions(entry);

  return render(tmpl, {
    generated: ctx.now,
    updated: ctx.now,
    parent: parentRel || '(root)',
    dirname: entry.name,
    purpose: describeDir(entry.name),
    architecture_overview: '',
    module_role: '',
    key_abstractions: [],
    key_files: keyFiles,
    subdirs,
    conventions: [],
    entry_points: [],
    ai_instructions: aiInstructions,
    internal_deps: inferInternalDeps(entry),
    external_deps: inferExternalDeps(entry),
  });
}

/**
 * 为单个目录生成 CLAUDE.md 内容（极简引导）。
 * 仅当目录是根或包含 src/ 等关键目录时生成。
 */
export function generateClaudeMd(entry: DirEntry, hasParentAgents: boolean, ctx: GenContext): string {
  const templatePath = resolve(ctx.rootDir, 'src', 'templates', 'deepinit', 'CLAUDE.md.tmpl');
  let tmpl: string;
  try {
    tmpl = readFileSync(templatePath, 'utf-8');
  } catch {
    tmpl = FALLBACK_CLAUDE_TMPL;
  }

  const parentInfo = hasParentAgents
    ? [{ parent_agents: `../AGENTS.md` }]
    : [];

  return render(tmpl, {
    dirname: entry.name,
    parent_agents: parentInfo,
  });
}

/**
 * 生成整个目录树的文档文件（顺序模式，保证层级兼容）。
 */
export function generateAll(flatEntries: DirEntry[], rootDir: string): { dir: string; agents: string; claude: string | null }[] {
  const now = new Date().toISOString();
  const ctx: GenContext = { entry: flatEntries[0], rootDir, now };
  const results: { dir: string; agents: string; claude: string | null }[] = [];

  for (const entry of flatEntries) {
    const parentRel = entry.depth > 0 ? '../AGENTS.md' : null;
    const agentsContent = generateAgentsMd(entry, parentRel, ctx);
    const shouldGenClaude = true; // 每个 AGENTS.md 同级生成 CLAUDE.md 引导入口
    const claudeContent = shouldGenClaude ? generateClaudeMd(entry, parentRel !== null, ctx) : null;
    results.push({ dir: entry.absPath, agents: agentsContent, claude: claudeContent });
  }

  return results;
}

/**
 * 按深度分组，同级目录可并行生成。
 * 深度必须按层串行（子目录引用父级 AGENTS.md），但同层目录完全独立。
 */
function groupByDepth(entries: DirEntry[]): Map<number, DirEntry[]> {
  const groups = new Map<number, DirEntry[]>();
  for (const e of entries) {
    const list = groups.get(e.depth);
    if (list) list.push(e);
    else groups.set(e.depth, [e]);
  }
  return groups;
}

/**
 * 并行生成整个目录树的文档文件。
 * 按深度分层：同层目录并行处理，层间串行保证父子引用正确。
 */
export function generateAllParallel(
  flatEntries: DirEntry[],
  rootDir: string,
  concurrency: number = 0,
): { dir: string; agents: string; claude: string | null }[] {
  const now = new Date().toISOString();
  const ctx: GenContext = { entry: flatEntries[0], rootDir, now };
  const groups = groupByDepth(flatEntries);
  const results: { dir: string; agents: string; claude: string | null }[] = [];
  const maxDepth = Math.max(...groups.keys());

  // 同步逐层处理（同层内并行）
  for (let depth = 0; depth <= maxDepth; depth++) {
    const batch = groups.get(depth);
    if (!batch || batch.length === 0) continue;

    // 小批量或并发度为 1 时保持顺序
    if (batch.length === 1 || concurrency === 1) {
      for (const entry of batch) {
        const parentRel = entry.depth > 0 ? '../AGENTS.md' : null;
        const agentsContent = generateAgentsMd(entry, parentRel, ctx);
        const shouldGenClaude = true; // 每个 AGENTS.md 同级生成 CLAUDE.md 引导入口
        const claudeContent = shouldGenClaude ? generateClaudeMd(entry, parentRel !== null, ctx) : null;
        results.push({ dir: entry.absPath, agents: agentsContent, claude: claudeContent });
      }
    } else {
      // 同层并行
      const chunkSize = concurrency > 0 ? concurrency : batch.length;
      for (let i = 0; i < batch.length; i += chunkSize) {
        const chunk = batch.slice(i, i + chunkSize);
        const chunkResults = chunk.map(entry => {
          const parentRel = entry.depth > 0 ? '../AGENTS.md' : null;
          const agentsContent = generateAgentsMd(entry, parentRel, ctx);
          const shouldGenClaude = true; // 每个 AGENTS.md 同级生成 CLAUDE.md 引导入口
          const claudeContent = shouldGenClaude ? generateClaudeMd(entry, parentRel !== null, ctx) : null;
          return { dir: entry.absPath, agents: agentsContent, claude: claudeContent };
        });
        results.push(...chunkResults);
      }
    }
  }

  return results;
}

/**
 * 将生成的文档写入文件系统。
 */
export function writeDocs(
  results: { dir: string; agents: string; claude: string | null }[],
  opts: { force?: boolean } = {},
): { written: number; skipped: number } {
  let written = 0;
  let skipped = 0;

  for (const r of results) {
    if (!existsSync(r.dir)) {
      mkdirSync(r.dir, { recursive: true });
    }

    const agentsPath = join(r.dir, 'AGENTS.md');
    let shouldWrite = true;
    if (existsSync(agentsPath)) {
      try {
        const existing = readFileSync(agentsPath, 'utf-8');
        if (!existing.includes('<!-- Generated:') && !opts.force) {
          // Preserve hand-crafted AGENTS.md
          skipped++;
          shouldWrite = false;
        }
      } catch { skipped++; shouldWrite = false; }
    }
    if (shouldWrite) {
      writeFileSync(agentsPath, r.agents, 'utf-8');
      written++;
    }

    if (r.claude && (opts.force || !existsSync(join(r.dir, 'CLAUDE.md')))) {
      writeFileSync(join(r.dir, 'CLAUDE.md'), r.claude, 'utf-8');
    }
  }

  return { written, skipped };
}

/**
 * 增量生成：基于 manifest diff 结果，仅重新生成变化目录的文档。
 * 祖先级联已在 computeDiff 中处理——变化的祖先目录自动包含在 changedRelPaths 中。
 */
export function generateIncremental(
  flatEntries: DirEntry[],
  changedRelPaths: Set<string> | string[],
  rootDir: string,
): { dir: string; agents: string; claude: string | null }[] {
  const now = new Date().toISOString();
  const ctx: GenContext = { entry: flatEntries[0], rootDir, now };
  const results: { dir: string; agents: string; claude: string | null }[] = [];
  const changedSet = changedRelPaths instanceof Set ? changedRelPaths : new Set(changedRelPaths);

  for (const entry of flatEntries) {
    if (!changedSet.has(entry.relPath)) continue;
    const parentRel = entry.depth > 0 ? '../AGENTS.md' : null;
    const agentsContent = generateAgentsMd(entry, parentRel, ctx);
    const shouldGenClaude = true; // 每个 AGENTS.md 同级生成 CLAUDE.md 引导入口
    const claudeContent = shouldGenClaude ? generateClaudeMd(entry, parentRel !== null, ctx) : null;
    results.push({ dir: entry.absPath, agents: agentsContent, claude: claudeContent });
  }

  return results;
}

/**
 * 并行增量生成：按深度分层，同层并行处理变更目录。
 */
export function generateIncrementalParallel(
  flatEntries: DirEntry[],
  changedRelPaths: Set<string> | string[],
  rootDir: string,
  concurrency: number = 0,
): { dir: string; agents: string; claude: string | null }[] {
  const changedSet = changedRelPaths instanceof Set ? changedRelPaths : new Set(changedRelPaths);
  const changedEntries = flatEntries.filter(e => changedSet.has(e.relPath));
  if (changedEntries.length === 0) return [];

  const now = new Date().toISOString();
  const ctx: GenContext = { entry: flatEntries[0], rootDir, now };
  const groups = groupByDepth(changedEntries);
  const results: { dir: string; agents: string; claude: string | null }[] = [];
  const maxDepth = Math.max(...groups.keys());

  for (let depth = 0; depth <= maxDepth; depth++) {
    const batch = groups.get(depth);
    if (!batch || batch.length === 0) continue;

    if (batch.length === 1 || concurrency === 1) {
      for (const entry of batch) {
        const parentRel = entry.depth > 0 ? '../AGENTS.md' : null;
        const agentsContent = generateAgentsMd(entry, parentRel, ctx);
        const shouldGenClaude = true; // 每个 AGENTS.md 同级生成 CLAUDE.md 引导入口
        const claudeContent = shouldGenClaude ? generateClaudeMd(entry, parentRel !== null, ctx) : null;
        results.push({ dir: entry.absPath, agents: agentsContent, claude: claudeContent });
      }
    } else {
      const chunkSize = concurrency > 0 ? concurrency : batch.length;
      for (let i = 0; i < batch.length; i += chunkSize) {
        const chunk = batch.slice(i, i + chunkSize);
        const chunkResults = chunk.map(entry => {
          const parentRel = entry.depth > 0 ? '../AGENTS.md' : null;
          const agentsContent = generateAgentsMd(entry, parentRel, ctx);
          const shouldGenClaude = true; // 每个 AGENTS.md 同级生成 CLAUDE.md 引导入口
          const claudeContent = shouldGenClaude ? generateClaudeMd(entry, parentRel !== null, ctx) : null;
          return { dir: entry.absPath, agents: agentsContent, claude: claudeContent };
        });
        results.push(...chunkResults);
      }
    }
  }

  return results;
}

/**
 * 增量智能生成：基于 manifest diff，仅重新生成变化目录的文档（架构感知模式）。
 */
export function generateIncrementalSmart(
  flatEntries: DirEntry[],
  changedRelPaths: Set<string> | string[],
  rootDir: string,
): { dir: string; agents: string; claude: string | null }[] {
  const changedSet = changedRelPaths instanceof Set ? changedRelPaths : new Set(changedRelPaths);
  const changedEntries = flatEntries.filter(e => changedSet.has(e.relPath));
  if (changedEntries.length === 0) return [];

  const now = new Date().toISOString();
  const ctx: GenContext = { entry: flatEntries[0], rootDir, now };
  const smartCtx = buildSmartContext(flatEntries, rootDir);
  const results: { dir: string; agents: string; claude: string | null }[] = [];
  const groups = groupByDepth(changedEntries);
  const maxDepth = Math.max(...groups.keys());

  for (let depth = 0; depth <= maxDepth; depth++) {
    const batch = groups.get(depth);
    if (!batch || batch.length === 0) continue;

    for (const entry of batch) {
      const parentRel = entry.depth > 0 ? '../AGENTS.md' : null;
      const agentsContent = generateAgentsMdSmart(entry, parentRel, ctx, smartCtx);
      const claudeContent = generateClaudeMd(entry, parentRel !== null, ctx);
      results.push({ dir: entry.absPath, agents: agentsContent, claude: claudeContent });
    }
  }

  return results;
}

/**
 * 验证生成的 AGENTS.md 层级完整性。
 * 检查：父级引用可解析、无孤儿文件、目录覆盖完整。
 */
export function validateHierarchy(
  rootDir: string,
  generatedDirs: string[],
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  for (const dir of generatedDirs) {
    const agentsPath = join(rootDir, dir, 'AGENTS.md');
    if (!existsSync(agentsPath)) {
      issues.push(`Missing AGENTS.md: ${dir}/AGENTS.md`);
      continue;
    }
    try {
      const content = readFileSync(agentsPath, 'utf-8');
      const parentMatch = content.match(/<!-- Parent: (.+) -->/);
      if (parentMatch && parentMatch[1] !== '(root)') {
        // Resolve ../AGENTS.md relative path
        const parentRel = parentMatch[1];
        const resolved = join(dir, parentRel);
        if (!existsSync(resolved)) {
          issues.push(`Broken parent reference in ${dir}/AGENTS.md: ${parentMatch[1]}`);
        }
      }
    } catch {
      issues.push(`Unreadable: ${dir}/AGENTS.md`);
    }
  }

  return { valid: issues.length === 0, issues };
}

// ---- enhanced file analysis ----

type FileRole =
  | 'engine-core' | 'state-machine' | 'db-layer' | 'route-handler'
  | 'tool-definition' | 'event-system' | 'process-guardian'
  | 'type-definitions' | 'config-constants' | 'utility'
  | 'file-watcher' | 'template-render' | 'cli-command' | 'agent-registry'
  | 'session-manager' | 'wiki-store' | 'frontend-ui' | 'reverse-proxy'
  | 'scanner' | 'quality-gate' | 'manifest' | 'unknown';

interface ExportInfo {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'const' | 'enum';
  brief: string;
}

interface DeepFileAnalysis {
  exports: ExportInfo[];
  imports: string[];
  role: FileRole;
  summary: string;
}

/** Classify a file's architectural role from its name and content */
function classifyFileRole(fileName: string, content: string): FileRole {
  const combined = (fileName + '\n' + content.slice(0, 2000)).toLowerCase();
  const earlyContent = content.slice(0, 500);

  // Early: detect bin files (CLI executables)
  if (fileName === 'jarvis.js' || /^bin[\\/]/.test(fileName)) return 'cli-command';

  // Specific role patterns (highest priority)
  if (/\b(?:start|stop)engine\b/.test(combined) || /\bstartguardian\b/.test(combined)) return 'engine-core';
  if (/\b(?:gate_config|pipeline_defs|gate_operations|gate_agent_guide)\b/.test(combined)) return 'state-machine';
  if (/\b(?:createtable|altersequence|pragma|sqlite|database)\b/.test(combined) && /\b(?:prepare|exec|run)\b/.test(combined)) return 'db-layer';
  if (/\b(?:app\.(?:get|post|put|patch|delete|all)|setupapiroutes|router)\b/.test(combined)) return 'route-handler';
  if (/\b(?:register\w*tools?|mcpserver|mcp.*tool)\b/.test(combined)) return 'tool-definition';
  if (/\b(?:eventemitter|emit|pubsub|pub.*sub)\b/.test(combined)) return 'event-system';
  if (/\b(?:pid.*file|crash|restart|guardian|uncaughtexception|sigterm)\b/.test(combined)) return 'process-guardian';
  if (/\b(?:quality.*gate|quality.*threshold|violation)\b/.test(combined)) return 'quality-gate';
  if (/\b(?:readdir|stat|watch|chokidar|fs\.read|fs\.write|file.*watch)\b/.test(combined)) return 'file-watcher';
  if (/\b(?:template|handlebars|mustache)\b/.test(combined) && /\b(?:render|generate)\b/.test(combined)) return 'template-render';
  if (/\b(?:\.command|execute\s*\(|cli.*command|commander)\b/.test(combined)) return 'cli-command';
  if (/\b(?:getagentlist|scanallprojectagents|agent.*registr)\b/.test(combined)) return 'agent-registry';
  if (/\b(?:session|touchsession|marksession|resumesession)\b/.test(combined)) return 'session-manager';
  if (/\b(?:wiki.*page|wikipage|readwiki|listwiki)\b/.test(combined)) return 'wiki-store';
  if (/\b(?:hono|html|jsx|tsx|component|page)\b/.test(combined) && !/cli|bin|command/.test(fileName)) return 'frontend-ui';
  if (/\b(?:proxy|reverseproxy|upstream)\b/.test(combined)) return 'reverse-proxy';
  if (/\b(?:scan|traverse|flatten|walk)\b/.test(combined) && /\b(?:directory|filesystem|tree)\b/.test(combined)) return 'scanner';
  if (/\b(?:manifest|diff|snapshot)\b/.test(combined)) return 'manifest';

  // Type-definitions: ONLY if the file is primarily types (exports few functions)
  const exportFuncCount = (earlyContent.match(/export\s+(?:async\s+)?function\s+\w+/g) || []).length;
  const exportClassCount = (earlyContent.match(/export\s+(?:abstract\s+)?class\s+\w+/g) || []).length;
  const exportTypeCount = (earlyContent.match(/export\s+(?:interface|type)\s+\w+/g) || []).length;
  if (exportTypeCount > 0 && exportFuncCount === 0 && exportClassCount === 0) return 'type-definitions';

  // Fallback heuristics
  if (/^types?\.(ts|d\.ts)$/i.test(fileName)) return 'type-definitions';
  if (/config|constants?/.test(fileName)) return 'config-constants';
  if (/util|helper|shared/.test(fileName)) return 'utility';

  return 'unknown';
}

/** Extract meaningful exports from file content */
function extractExports(content: string, filePath: string): ExportInfo[] {
  const exports: ExportInfo[] = [];
  const seen = new Set<string>();

  // export function/async function name
  for (const m of content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      const brief = inferExportBrief(m[1], content, 'function');
      exports.push({ name: m[1], kind: 'function', brief });
    }
  }
  // export class name
  for (const m of content.matchAll(/export\s+(?:abstract\s+)?class\s+(\w+)/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); exports.push({ name: m[1], kind: 'class', brief: '' }); }
  }
  // export interface name
  for (const m of content.matchAll(/export\s+interface\s+(\w+)/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); exports.push({ name: m[1], kind: 'interface', brief: '' }); }
  }
  // export type name
  for (const m of content.matchAll(/export\s+type\s+(\w+)/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); exports.push({ name: m[1], kind: 'type', brief: '' }); }
  }
  // export const name
  for (const m of content.matchAll(/export\s+const\s+(\w+)/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); exports.push({ name: m[1], kind: 'const', brief: '' }); }
  }
  // export enum name
  for (const m of content.matchAll(/export\s+enum\s+(\w+)/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); exports.push({ name: m[1], kind: 'enum', brief: '' }); }
  }

  return exports.slice(0, 15);
}

/** Generate a brief description for an export from surrounding context */
function inferExportBrief(name: string, content: string, _kind: string): string {
  // Look for JSDoc comment right before the export
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const jsdocRe = new RegExp(`\\/\\*\\*\\s*\\n?\\s*\\*?\\s*([^\\n*]*?)\\s*\\*\\/\\s*\\n\\s*export\\s+(?:async\\s+)?function\\s+${escapedName}`, 'm');
  const jsdocMatch = content.match(jsdocRe);
  if (jsdocMatch?.[1]?.trim() && !jsdocMatch[1].includes('@')) {
    return jsdocMatch[1].trim().replace(/^-\s*/, '');
  }

  // Look for inline comment after export
  const inlineRe = new RegExp(`export\\s+(?:async\\s+)?function\\s+${escapedName}[^\\n]*\\/\\/\\s*(.+)`, 'm');
  const inlineMatch = content.match(inlineRe);
  if (inlineMatch?.[1]) return inlineMatch[1].trim();

  return '';
}

// ── Shared role maps ────────────────────────────────────────

const SHORT_ROLE_LABELS: Record<string, string> = {
  'engine-core': 'Engine lifecycle', 'state-machine': 'Pipeline state machine',
  'db-layer': 'SQLite persistence', 'route-handler': 'REST API routes',
  'tool-definition': 'MCP tools', 'event-system': 'PubSub events',
  'process-guardian': 'Crash recovery', 'agent-registry': 'Agent management',
  'session-manager': 'Session management', 'wiki-store': 'Wiki knowledge base',
  'cli-command': 'CLI commands', 'frontend-ui': 'Web dashboard',
  'type-definitions': 'Type definitions', 'config-constants': 'Configuration',
  'utility': 'Shared utilities', 'file-watcher': 'File monitoring',
  'template-render': 'Template rendering', 'scanner': 'Directory scanning',
  'quality-gate': 'Quality gate evaluation', 'manifest': 'Manifest tracking',
  'reverse-proxy': 'Reverse proxy',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  'engine-core': 'Core engine — MCP server with Hono HTTP framework, manages the full engine lifecycle (start, stop, status) and coordinates all subsystems.',
  'state-machine': 'Pipeline orchestration — defines all pipeline types and their Gate sequences, enforces FSM state transitions with per-gate operation allow/deny rules.',
  'db-layer': 'Persistence layer — SQLite database with WAL mode, manages sessions, pipeline state, checkpoints, agent configs, artifacts, and flow skills with incremental schema migrations.',
  'route-handler': 'REST API + SSE — Hono-based HTTP routes for the web dashboard, pipeline management, session lifecycle, agent configuration, and real-time SSE event streaming.',
  'tool-definition': 'MCP tool implementations — registers tools with the MCP server for session management, pipeline operations, gate enforcement, agent configuration, wiki, memory, AST search, and LSP integration.',
  'event-system': 'Event-driven communication — in-process EventEmitter singleton for PubSub messaging between subsystems with debounced SSE broadcast.',
  'process-guardian': 'Process supervision — PID file management, crash recovery with exponential backoff (max 3 restarts, 5s cooldown), and graceful shutdown handling.',
  'type-definitions': 'Type definitions — shared TypeScript interfaces and type aliases for the module.',
  'config-constants': 'Configuration & constants — default values, pipeline definitions, quality thresholds.',
  'utility': 'Shared utilities — cross-module helper functions with no business logic dependencies.',
  'file-watcher': 'Filesystem monitoring — watches .jarvis/ directory for artifact changes and syncs them to the web dashboard sidebar in real-time.',
  'template-render': 'Template rendering — generates AGENTS.md and CLAUDE.md files from directory scans using mustache-style templates.',
  'cli-command': 'CLI command — entry point for a jarvis subcommand, parses arguments and orchestrates the underlying engine modules.',
  'agent-registry': 'Agent discovery — scans template directories for agent definitions, resolves platform-specific models, and merges project-level custom agents.',
  'session-manager': 'Session lifecycle — manages session creation, archival, context summaries, and heartbeat tracking with auto-stale marking.',
  'wiki-store': 'Wiki knowledge base — CRUD operations for persistent markdown wiki pages with tagging, categorization, and full-text search.',
  'frontend-ui': 'Web dashboard UI — provides the visual interface for pipeline monitoring, session management, and agent configuration.',
  'reverse-proxy': 'Reverse proxy — forwards requests from the web panel to the engine process, with SSE event streaming support.',
  'scanner': 'Directory scanner — recursively walks the project tree with symlink protection, inode tracking, and exclusion patterns to build a directory entry tree.',
  'quality-gate': 'Quality gate evaluation — loads quality-gates.yml, merges project thresholds with defaults, and evaluates metrics against configurable quality profiles.',
  'manifest': 'Manifest management — compares saved directory snapshots against current filesystem state, computes diffs with ancestor cascading for incremental regeneration.',
};

// ---- smart dispatch ----

interface SmartContext {
  projectType: 'node' | 'frontend' | 'fullstack' | 'library' | 'cli-tool' | 'unknown';
  frameworks: string[];
  fileAnalysis: Map<string, DeepFileAnalysis>;
  /** All classified roles across the project */
  allRoles: Map<string, FileRole>;
  /** Package info */
  pkgInfo: { name?: string; description?: string; bin?: Record<string, string>; keywords?: string[] };
}

/**
 * Agent 智能分派模式：深度读取文件内容，检测项目类型，生成更精准的文档。
 * 对应 OMC 的 explore agent（目录扫描）+ architect agent（文件分析）+ writer agent（内容生成）三层分派。
 */
export function generateAllSmart(
  flatEntries: DirEntry[],
  rootDir: string,
): { dir: string; agents: string; claude: string | null }[] {
  const now = new Date().toISOString();
  const ctx: GenContext = { entry: flatEntries[0], rootDir, now };
  const smartCtx = buildSmartContext(flatEntries, rootDir);
  const results: { dir: string; agents: string; claude: string | null }[] = [];
  const groups = groupByDepth(flatEntries);
  const maxDepth = Math.max(...groups.keys());

  for (let depth = 0; depth <= maxDepth; depth++) {
    const batch = groups.get(depth);
    if (!batch || batch.length === 0) continue;

    for (const entry of batch) {
      const parentRel = entry.depth > 0 ? '../AGENTS.md' : null;
      const agentsContent = generateAgentsMdSmart(entry, parentRel, ctx, smartCtx);
      const claudeContent = generateClaudeMd(entry, parentRel !== null, ctx);
      results.push({ dir: entry.absPath, agents: agentsContent, claude: claudeContent });
    }
  }

  return results;
}

function buildSmartContext(flatEntries: DirEntry[], rootDir: string): SmartContext {
  const frameworks: string[] = [];
  const fileAnalysis = new Map<string, DeepFileAnalysis>();
  const allRoles = new Map<string, FileRole>();
  let pkgInfo: SmartContext['pkgInfo'] = {};

  // Phase 1: detect frameworks & parse package.json
  for (const entry of flatEntries) {
    for (const file of entry.files) {
      const absPath = join(entry.absPath, file);
      if (file === 'package.json') {
        try {
          const pkg = JSON.parse(readFileSync(absPath, 'utf-8'));
          pkgInfo = { name: pkg.name, description: pkg.description, bin: pkg.bin, keywords: pkg.keywords };
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          if (deps.react) frameworks.push('React');
          if (deps.vue) frameworks.push('Vue');
          if (deps.express) frameworks.push('Express');
          if (deps.fastify) frameworks.push('Fastify');
          if (deps.hono) frameworks.push('Hono');
          if (deps.prisma) frameworks.push('Prisma');
          if (deps.drizzle) frameworks.push('Drizzle');
          if (deps.tailwindcss) frameworks.push('TailwindCSS');
          if (deps.vitest || deps.jest) frameworks.push('Vitest/Jest');
          if (deps['@modelcontextprotocol/sdk']) frameworks.push('MCP SDK');
          if (deps['@ast-grep/napi']) frameworks.push('ast-grep');
          if (deps.yaml) frameworks.push('YAML');
        } catch { /* ignore */ }
      }
      if (file === 'tsconfig.json') {
        frameworks.push('TypeScript');
      }
    }
  }

  // Phase 2: deep analyze all TS/JS files
  for (const entry of flatEntries) {
    for (const file of entry.files) {
      const absPath = join(entry.absPath, file);
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        try {
          const content = readFileSync(absPath, 'utf-8');
          const role = classifyFileRole(file, content);
          const exports = extractExports(content, absPath);
          const imports = [...new Set(
            [...content.matchAll(/import\s+(?:type\s+)?\{?\s*([\w]+)/g)].map(m => m[1])
          )].slice(0, 10);
          const summary = buildFileSummary(file, role, exports);
          const relPath = join(entry.relPath, file).replace(/\\/g, '/');
          fileAnalysis.set(relPath, { exports, imports, role, summary });
          allRoles.set(relPath, role);
        } catch { /* ignore */ }
      }
    }
  }

  // Phase 3: determine project type
  let projectType: SmartContext['projectType'] = 'unknown';
  const hasCli = !!pkgInfo.bin;
  const hasServer = allRoles.has(join('src', 'engine', 'server.ts').replace(/\\/g, '/'))
    || allRoles.has(join('src', 'web', 'routes.ts').replace(/\\/g, '/'));
  if (hasCli && hasServer) {
    projectType = 'cli-tool';
  } else if (frameworks.includes('React') || frameworks.includes('Vue')) {
    projectType = frameworks.includes('Express') || frameworks.includes('Fastify') || frameworks.includes('Hono')
      ? 'fullstack' : 'frontend';
  } else if (hasCli) {
    projectType = 'cli-tool';
  } else if (frameworks.includes('Hono') || hasServer) {
    projectType = 'node';
  } else if (frameworks.includes('TypeScript') || frameworks.includes('Vitest/Jest')) {
    projectType = hasCli ? 'cli-tool' : 'library';
  }

  // Deduplicate frameworks
  const uniqueFrameworks = [...new Set(frameworks)];

  return { projectType, frameworks: uniqueFrameworks, fileAnalysis, allRoles, pkgInfo };
}

/** Build a one-line summary of what a file does */
function buildFileSummary(fileName: string, role: FileRole, exports: ExportInfo[]): string {
  const expNames = exports.map(e => e.name);
  if (expNames.length === 0) {
    const roleLabels: Record<FileRole, string> = {
      'engine-core': 'Engine lifecycle (start/stop)',
      'state-machine': 'Pipeline state machine definitions',
      'db-layer': 'Database schema & queries',
      'route-handler': 'HTTP route handlers',
      'tool-definition': 'MCP tool registration',
      'event-system': 'PubSub event system',
      'process-guardian': 'Crash recovery & PID management',
      'type-definitions': 'Type definitions',
      'config-constants': 'Configuration constants',
      'utility': 'Utility helpers',
      'file-watcher': 'Filesystem monitoring',
      'template-render': 'Template rendering',
      'cli-command': 'CLI command entry',
      'agent-registry': 'Agent registry & discovery',
      'session-manager': 'Session lifecycle management',
      'wiki-store': 'Wiki knowledge base storage',
      'frontend-ui': 'Frontend UI',
      'reverse-proxy': 'Reverse proxy',
      'scanner': 'Directory scanning',
      'quality-gate': 'Quality gate evaluation',
      'manifest': 'Manifest diff & tracking',
      'unknown': 'Source file',
    };
    return roleLabels[role];
  }
  if (expNames.length <= 4) return `Exports: ${expNames.join(', ')}`;
  return `Exports: ${expNames.slice(0, 4).join(', ')} +${expNames.length - 4} more`;
}

function generateAgentsMdSmart(
  entry: DirEntry,
  parentRel: string | null,
  ctx: GenContext,
  smartCtx: SmartContext,
): string {
  const templatePath = resolve(ctx.rootDir, 'src', 'templates', 'deepinit', 'AGENTS.md.tmpl');
  let tmpl: string;
  try {
    tmpl = readFileSync(templatePath, 'utf-8');
  } catch {
    tmpl = FALLBACK_AGENTS_TMPL;
  }

  const isRoot = entry.depth === 0;
  const archOverview = isRoot ? buildArchitectureOverview(smartCtx, entry) : '';
  const moduleRole = !isRoot ? buildModuleRole(entry, smartCtx) : '';
  const keyAbstractions = buildKeyAbstractions(entry, smartCtx);
  const conventions = buildConventions(entry, smartCtx, isRoot);
  const entryPoints = isRoot ? buildEntryPoints(smartCtx) : [];
  const aiInstructions = generateAiInstructionsSmart(entry, smartCtx, isRoot);

  const keyFiles = entry.files.slice(0, 30).map(f => {
    const relPath = join(entry.relPath, f).replace(/\\/g, '/');
    const analysis = smartCtx.fileAnalysis.get(relPath);
    return {
      name: f,
      desc: analysis ? analysis.summary : describeFile(f, entry),
    };
  });

  const subdirs = entry.subdirs.length > 0 ? entry.subdirs.map(s => ({
    name: s.name,
    desc: describeDirArchitectural(s, smartCtx),
  })) : [];

  return render(tmpl, {
    generated: ctx.now,
    updated: ctx.now,
    parent: parentRel || '(root)',
    dirname: entry.name,
    purpose: isRoot ? (smartCtx.pkgInfo.description || describeDirSmart(entry.name, smartCtx)) : describeDirSmart(entry.name, smartCtx),
    architecture_overview: archOverview,
    module_role: moduleRole,
    key_abstractions: keyAbstractions.length > 0 ? keyAbstractions : [],
    key_files: keyFiles,
    subdirs: subdirs.length > 0 ? subdirs : [],
    conventions: conventions.length > 0 ? conventions : [],
    entry_points: entryPoints.length > 0 ? entryPoints : [],
    ai_instructions: aiInstructions,
    internal_deps: inferInternalDepsSmart(entry, smartCtx),
    external_deps: isRoot ? buildExternalDeps(smartCtx) : inferExternalDeps(entry),
  });
}

// ── Architecture-aware builders ─────────────────────────────

function buildArchitectureOverview(smartCtx: SmartContext, _rootEntry: DirEntry): string {
  const lines: string[] = [];
  const { projectType, frameworks, pkgInfo } = smartCtx;

  if (pkgInfo.description) {
    lines.push(`**${pkgInfo.description}**`);
  }

  const typeLabels: Record<string, string> = {
    'cli-tool': 'CLI tool — installable via npm, provides a command-line interface',
    'node': 'Node.js backend service',
    'frontend': 'Frontend application',
    'fullstack': 'Full-stack application',
    'library': 'TypeScript/JavaScript library',
    'unknown': 'Project',
  };
  lines.push(`**Type:** ${typeLabels[projectType] || 'Project'}`);

  if (frameworks.length > 0) {
    lines.push(`**Stack:** ${frameworks.join(', ')}`);
  }

  if (pkgInfo.bin) {
    const bins = typeof pkgInfo.bin === 'string' ? [pkgInfo.name || 'cli'] : Object.keys(pkgInfo.bin);
    lines.push(`**Binary:** \`${bins.join('`, `')}\``);
  }

  // Summarize module layout from file roles
  const roleCounts = new Map<FileRole, number>();
  for (const [, role] of smartCtx.allRoles) {
    roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
  }

  const notableRoles: FileRole[] = ['engine-core', 'state-machine', 'db-layer', 'route-handler',
    'tool-definition', 'event-system', 'process-guardian', 'agent-registry', 'session-manager',
    'wiki-store', 'cli-command', 'frontend-ui'];
  const found = notableRoles.filter(r => roleCounts.has(r));
  if (found.length > 0) {
    lines.push(`**Modules:** ${found.map(r => SHORT_ROLE_LABELS[r] || r).join(' · ')}`);
  }

  return lines.join('\n');
}

function buildModuleRole(entry: DirEntry, smartCtx: SmartContext): string {
  const roleCounts = new Map<FileRole, number>();
  for (const f of entry.files) {
    const relPath = join(entry.relPath, f).replace(/\\/g, '/');
    const analysis = smartCtx.fileAnalysis.get(relPath);
    if (analysis?.role) {
      roleCounts.set(analysis.role, (roleCounts.get(analysis.role) || 0) + 1);
    }
  }

  // Sort by count descending
  const sorted = [...roleCounts.entries()].sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    const fallback = describeDir(entry.name);
    return fallback !== 'Project directory' ? fallback : '';
  }

  // Single dominant role (>= 3 files AND >= 2x runner-up) → use role-specific description
  const [topRole, topCount] = sorted[0];
  const runnerUpCount = sorted.length > 1 ? sorted[1][1] : 0;
  if (topCount >= 3 && topCount >= runnerUpCount * 2 && ROLE_DESCRIPTIONS[topRole]) {
    return ROLE_DESCRIPTIONS[topRole];
  }

  // Multiple subsystems: describe by directory name + list roles
  const dirDesc = describeDir(entry.name);
  const roleNames = sorted.map(([r]) => SHORT_ROLE_LABELS[r] || r).filter(Boolean);
  const prefix = dirDesc !== 'Project directory' ? dirDesc : 'Module';
  const maxDisplay = 6;
  const visible = roleNames.slice(0, maxDisplay);
  const suffix = roleNames.length > maxDisplay ? ` +${roleNames.length - maxDisplay} more` : '';
  return `${prefix} — ${visible.join(', ')}${suffix}`;
}

function buildKeyAbstractions(entry: DirEntry, smartCtx: SmartContext): { name: string; kind: string; brief: string }[] {
  const result: { name: string; kind: string; brief: string }[] = [];
  for (const f of entry.files) {
    const relPath = join(entry.relPath, f).replace(/\\/g, '/');
    const analysis = smartCtx.fileAnalysis.get(relPath);
    if (analysis?.exports.length) {
      for (const exp of analysis.exports.slice(0, 3)) {
        result.push({ name: exp.name, kind: exp.kind, brief: exp.brief });
      }
    }
  }
  return result.slice(0, 20);
}

function buildConventions(entry: DirEntry, smartCtx: SmartContext, isRoot: boolean): string[] {
  const conventions: string[] = [];

  if (isRoot) {
    if (smartCtx.frameworks.includes('TypeScript')) {
      conventions.push('TypeScript strict mode — source in `src/`, compiled to `dist/`');
    }
    if (smartCtx.frameworks.includes('Vitest/Jest')) {
      conventions.push('Tests with vitest — `npm test` runs the test suite');
    }
    conventions.push('Pre-commit hooks via husky + lint-staged — ESLint auto-fix on staged `*.ts` files');
  }

  if (entry.name === 'engine') {
    conventions.push('Each subsystem is a single `.ts` file exporting a focused API');
    conventions.push('Database schema managed via incremental migrations — `ALTER TABLE ADD COLUMN` with try/catch');
  }
  if (entry.name === 'tools') {
    conventions.push('Each tool category: `{category}-tools.ts` exporting `registerXxxTools(server, db, root, ctx)`');
  }
  if (entry.name === 'commands') {
    conventions.push('Each command exports `execute(opts: CliOpts, positional: string[]): Promise<void>`');
  }
  if (entry.name === 'deepinit') {
    conventions.push('Generator functions produce `{ dir, agents, claude }` result objects');
    conventions.push('`writeDocs` handles file persistence with force/skip logic for hand-crafted files');
  }

  return conventions;
}

function buildEntryPoints(smartCtx: SmartContext): { name: string; desc: string }[] {
  const entries: { name: string; desc: string }[] = [];
  if (smartCtx.pkgInfo.bin) {
    const bins = typeof smartCtx.pkgInfo.bin === 'string'
      ? { [smartCtx.pkgInfo.name || 'jarvis']: smartCtx.pkgInfo.bin }
      : smartCtx.pkgInfo.bin;
    for (const [name, path] of Object.entries(bins)) {
      entries.push({ name, desc: `CLI — \`${path}\`` });
    }
  }
  if (smartCtx.frameworks.includes('MCP SDK')) {
    entries.push({ name: 'MCP Server', desc: 'Model Context Protocol server — tools available to AI assistants' });
  }
  const hasRoutes = Array.from(smartCtx.allRoles.values()).some(r => r === 'route-handler');
  if (hasRoutes) {
    entries.push({ name: 'Web API', desc: 'REST API + SSE streaming for web dashboard' });
  }
  return entries;
}

function buildExternalDeps(smartCtx: SmartContext): string {
  const parts: string[] = [];
  if (smartCtx.frameworks.includes('Hono')) parts.push('Hono (HTTP)');
  if (smartCtx.frameworks.includes('MCP SDK')) parts.push('@modelcontextprotocol/sdk');
  if (smartCtx.frameworks.includes('ast-grep')) parts.push('@ast-grep/napi');
  if (smartCtx.frameworks.includes('YAML')) parts.push('yaml');
  if (smartCtx.frameworks.includes('Vitest/Jest')) parts.push('vitest');
  if (smartCtx.frameworks.includes('TypeScript')) parts.push('TypeScript');
  if (parts.length === 0) parts.push('See package.json');
  return parts.join(', ');
}

function describeDirArchitectural(subdir: DirEntry, smartCtx: SmartContext): string {
  const roleCounts = new Map<FileRole, number>();
  for (const f of subdir.files) {
    const relPath = join(subdir.relPath, f).replace(/\\/g, '/');
    const analysis = smartCtx.fileAnalysis.get(relPath);
    if (analysis?.role && analysis.role !== 'unknown') {
      roleCounts.set(analysis.role, (roleCounts.get(analysis.role) || 0) + 1);
    }
  }

  if (roleCounts.size > 0) {
    let topRole: FileRole = 'unknown';
    let topCount = 0;
    for (const [role, count] of roleCounts) { if (count > topCount) { topCount = count; topRole = role; } }
    if (SHORT_ROLE_LABELS[topRole]) return SHORT_ROLE_LABELS[topRole];
  }

  return describeDir(subdir.name);
}

function generateAiInstructionsSmart(entry: DirEntry, smartCtx: SmartContext, isRoot: boolean): string[] {
  const instructions: string[] = [];

  if (isRoot) {
    instructions.push('Read this file first to understand the overall architecture before making changes.');
    if (smartCtx.pkgInfo.description) instructions.push(`Project: ${smartCtx.pkgInfo.description}`);
    if (smartCtx.frameworks.length > 0) instructions.push(`Tech stack: ${smartCtx.frameworks.slice(0, 6).join(', ')}`);
    instructions.push('Run `npm test` to execute the test suite, `npm run build` to compile, `npm run lint` for code style.');
    return instructions;
  }

  if (entry.files.some(f => f.endsWith('.test.ts') || f.endsWith('.spec.ts'))) {
    instructions.push('Test files present — run tests before modifying source files.');
  }

  if (entry.name === 'engine') {
    instructions.push('Changes here affect MCP server behavior. Always test with a full build after changes.');
    instructions.push('DB schema changes: use incremental migration pattern (ALTER TABLE with try/catch for column existence).');
  }
  if (entry.name === 'tools') {
    instructions.push('Pattern: create `{category}-tools.ts`, export `registerXxxTools`, add to `registerMcpTools` in server.ts.');
  }
  if (entry.name === 'web' || entry.relPath.endsWith('/web')) {
    instructions.push('API routes are Hono-based. SSE streaming uses debounced broadcast with PubSub events.');
  }
  if (entry.name === 'deepinit') {
    instructions.push('Generator output: `{ dir, agents, claude }`. Use `writeDocs` for persistence with force/skip logic.');
  }
  if (entry.name === 'commands') {
    instructions.push('Each command exports `execute(opts, positional)` — follow existing command patterns.');
  }

  return instructions;
}

function inferInternalDepsSmart(entry: DirEntry, smartCtx: SmartContext): string {
  if (entry.depth === 0) {
    return smartCtx.projectType === 'fullstack'
      ? 'Client and server subdirectories; see src/ for details'
      : 'All subdirectories under src/, tests/, scripts/';
  }
  if (entry.subdirs.length > 0) return entry.subdirs.map(s => s.name + '/').join(', ');
  return 'None';
}

function describeDirSmart(name: string, smartCtx: SmartContext): string {
  if (name === 'src' && smartCtx.projectType === 'frontend') return 'Frontend source code (React/Vue components)';
  if (name === 'src' && smartCtx.projectType === 'node') return 'Server-side source code (API routes, services)';
  if (name === 'src' && smartCtx.projectType === 'fullstack') return 'Full-stack source code (client + server)';
  if (name === 'src' && smartCtx.projectType === 'cli-tool') return 'CLI tool source code';
  return describeDir(name);
}

function generatePurposeDesc(entry: DirEntry, smartCtx: SmartContext): string {
  if (entry.depth === 0) {
    const typeLabels: Record<string, string> = {
      frontend: 'Frontend application',
      node: 'Node.js backend service',
      fullstack: 'Full-stack application',
      library: 'TypeScript/JavaScript library',
      'cli-tool': 'Command-line tool',
      unknown: 'Project',
    };
    const label = typeLabels[smartCtx.projectType] || 'Project';
    const fw = smartCtx.frameworks.length > 0 ? ` (${smartCtx.frameworks.slice(0, 4).join(', ')})` : '';
    return `${label}${fw}. This is the project root directory.`;
  }
  return `This directory contains the ${entry.name} module of the project.`;
}

// ---- helpers ----

function describeFile(name: string, _entry: DirEntry): string {
  const extMap: Record<string, string> = {
    '.ts': 'TypeScript source',
    '.tsx': 'React component',
    '.js': 'JavaScript source',
    '.json': 'JSON config/data',
    '.md': 'Markdown documentation',
    '.css': 'Style sheet',
    '.html': 'HTML template',
    '.yaml': 'YAML config',
    '.yml': 'YAML config',
    '.toml': 'TOML config',
    '.test.ts': 'Test file',
    '.spec.ts': 'Test spec',
    '.d.ts': 'Type declaration',
  };
  for (const [ext, desc] of Object.entries(extMap)) {
    if (name.endsWith(ext)) return desc;
  }
  return 'Project file';
}

function describeDir(name: string): string {
  const map: Record<string, string> = {
    'src': 'Source code',
    'tests': 'Test suite',
    'docs': 'Documentation',
    'scripts': 'Build/tooling scripts',
    'bin': 'CLI binaries',
    'config': 'Configuration files',
    'public': 'Static assets',
    'assets': 'Assets',
    'data': 'Data files',
    'lib': 'Library code',
    'utils': 'Utility functions',
    'components': 'UI components',
    'hooks': 'React hooks',
    'services': 'Service layer',
    'models': 'Data models',
    'routes': 'Route handlers',
    'middleware': 'Express/Hono middleware',
    'types': 'TypeScript type definitions',
    'shared': 'Shared utilities',
    'cli': 'CLI entry point',
    'engine': 'Core engine logic',
    'templates': 'Code templates',
    'web': 'Web frontend',
    'memory': 'Memory templates',
    'skills': 'Skill definitions',
    'commands': 'Command definitions',
    'agents': 'Agent definitions',
    'platforms': 'Platform-specific configs',
    'deepinit': 'DeepInit documentation generator',
    'flows': 'Pipeline flow diagrams',
  };
  return map[name] || 'Project directory';
}

function generateAiInstructions(entry: DirEntry): string[] {
  const instructions: string[] = [];
  if (entry.depth === 0) {
    instructions.push('This is the project root. All agents must read this file on startup.');
    instructions.push('Run `npm test` to execute the test suite.');
    instructions.push('Run `npm run build` to compile the project.');
  }
  if (entry.files.some(f => f.endsWith('.test.ts') || f.endsWith('.spec.ts'))) {
    instructions.push('Test files are present in this directory. Run tests before modifying.');
  }
  if (entry.name === 'src') {
    instructions.push('Main source directory. Follow the existing code style and patterns.');
  }
  return instructions;
}

function inferInternalDeps(entry: DirEntry): string {
  if (entry.depth === 0) return 'All subdirectories under src/, tests/, scripts/';
  if (entry.subdirs.length > 0) return entry.subdirs.map(s => s.name + '/').join(', ');
  return 'None';
}

function inferExternalDeps(_entry: DirEntry): string {
  return 'See package.json for full dependency list';
}

const FALLBACK_AGENTS_TMPL = `<!-- Generated: {{generated}} | Updated: {{updated}} -->
<!-- Parent: {{parent}} -->

# {{dirname}}{{#purpose}} — {{purpose}}{{/purpose}}

{{#architecture_overview}}
## Architecture
{{architecture_overview}}
{{/architecture_overview}}

{{#module_role}}
## Role
{{module_role}}
{{/module_role}}

## Key Abstractions
| Symbol | Kind | Description |
|--------|------|-------------|
{{#key_abstractions}}| \`{{.name}}\` | {{.kind}} | {{.brief}} |
{{/key_abstractions}}

## Files
| File | Description |
|------|-------------|
{{#key_files}}| \`{{.name}}\` | {{.desc}} |
{{/key_files}}

## Subdirectories
| Directory | Description | AGENTS |
|-----------|-------------|--------|
{{#subdirs}}| {{.name}}/ | {{.desc}} | [AGENTS.md]({{.name}}/AGENTS.md) |
{{/subdirs}}

## Conventions
{{#conventions}}- {{.}}
{{/conventions}}

## Entry Points
{{#entry_points}}- **{{.name}}**: {{.desc}}
{{/entry_points}}

## For AI Agents
{{#ai_instructions}}- {{.}}
{{/ai_instructions}}

## Dependencies
- **Internal:** {{internal_deps}}
- **External:** {{external_deps}}

<!-- MANUAL:START -->
<!-- MANUAL:END -->
`;

const FALLBACK_CLAUDE_TMPL = `# {{dirname}}

> AI Entry → [AGENTS.md](./AGENTS.md)

{{#parent_agents}}
Parent: [{{.parent_agents}}](../AGENTS.md)
{{/parent_agents}}
`;
