import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import type { DirEntry } from './scanner.js';

/** 简单的 mustache 风格模板渲染 */
function render(template: string, ctx: Record<string, unknown>): string {
  let result = template;

  // {{#list}} ... {{/list}} 区块
  result = result.replace(/\{\{#(\w+)\}\}\n?([\s\S]*?)\{\{\/\1\}\}/g, (_, key, body) => {
    const items = ctx[key];
    if (!Array.isArray(items) || items.length === 0) return '';
    return items.map((item: unknown) => {
      let b = body;
      if (typeof item === 'string') {
        // scalar array: {{.}} → value
        b = b.replace(/\{\{\.\}\}/g, item);
      } else if (item && typeof item === 'object') {
        for (const [k, v] of Object.entries(item as Record<string, string>)) {
          b = b.replace(new RegExp(`\\{\\{\\.${k}\\}\\}`, 'g'), v || '');
        }
      }
      return b;
    }).join('');
  });

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
    purpose_desc: `This directory contains the ${entry.name} module of the project.`,
    key_files: keyFiles,
    subdirs,
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
    const shouldGenClaude = entry.depth === 0 || entry.subdirs.length > 0;
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
        const shouldGenClaude = entry.depth === 0 || entry.subdirs.length > 0;
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
          const shouldGenClaude = entry.depth === 0 || entry.subdirs.length > 0;
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
  changedRelPaths: Set<string>,
  rootDir: string,
): { dir: string; agents: string; claude: string | null }[] {
  const now = new Date().toISOString();
  const ctx: GenContext = { entry: flatEntries[0], rootDir, now };
  const results: { dir: string; agents: string; claude: string | null }[] = [];

  for (const entry of flatEntries) {
    if (!changedRelPaths.has(entry.relPath)) continue;
    const parentRel = entry.depth > 0 ? '../AGENTS.md' : null;
    const agentsContent = generateAgentsMd(entry, parentRel, ctx);
    const shouldGenClaude = entry.depth === 0 || entry.subdirs.length > 0;
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
  changedRelPaths: Set<string>,
  rootDir: string,
  concurrency: number = 0,
): { dir: string; agents: string; claude: string | null }[] {
  const changedEntries = flatEntries.filter(e => changedRelPaths.has(e.relPath));
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
        const shouldGenClaude = entry.depth === 0 || entry.subdirs.length > 0;
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
          const shouldGenClaude = entry.depth === 0 || entry.subdirs.length > 0;
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

// ---- smart dispatch ----

interface SmartContext {
  /** 项目类型检测结果 */
  projectType: 'node' | 'frontend' | 'fullstack' | 'library' | 'unknown';
  /** 检测到的框架 */
  frameworks: string[];
  /** 文件分析缓存: relPath → 分析结果 */
  fileAnalysis: Map<string, FileAnalysis>;
}

interface FileAnalysis {
  exports: string[];
  imports: string[];
  summary: string;
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
  const smartCtx = buildSmartContext(flatEntries);
  const results: { dir: string; agents: string; claude: string | null }[] = [];
  const groups = groupByDepth(flatEntries);
  const maxDepth = Math.max(...groups.keys());

  for (let depth = 0; depth <= maxDepth; depth++) {
    const batch = groups.get(depth);
    if (!batch || batch.length === 0) continue;

    for (const entry of batch) {
      const parentRel = entry.depth > 0 ? '../AGENTS.md' : null;
      const agentsContent = generateAgentsMdSmart(entry, parentRel, ctx, smartCtx);
      const shouldGenClaude = entry.depth === 0 || entry.subdirs.length > 0;
      const claudeContent = shouldGenClaude ? generateClaudeMd(entry, parentRel !== null, ctx) : null;
      results.push({ dir: entry.absPath, agents: agentsContent, claude: claudeContent });
    }
  }

  return results;
}

function buildSmartContext(flatEntries: DirEntry[]): SmartContext {
  const frameworks: string[] = [];
  const fileAnalysis = new Map<string, FileAnalysis>();
  const allFiles = flatEntries.flatMap(e => e.files.map(f => join(e.absPath, f)));

  // 检测框架
  for (const f of allFiles) {
    const base = basename(f);
    if (base === 'package.json') {
      try {
        const pkg = JSON.parse(readFileSync(f, 'utf-8'));
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
      } catch { /* ignore */ }
    }
    if (base === 'tsconfig.json') {
      frameworks.push('TypeScript');
    }
  }

  // 分析关键文件的导出和导入
  for (const entry of flatEntries) {
    for (const file of entry.files) {
      const absPath = join(entry.absPath, file);
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        try {
          const content = readFileSync(absPath, 'utf-8');
          const exports = [...content.matchAll(/export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/g)].map(m => m[1]);
          const imports = [...content.matchAll(/import\s+\{?\s*(\w+)/g)].map(m => m[1]);
          fileAnalysis.set(join(entry.relPath, file), {
            exports: exports.slice(0, 10),
            imports: imports.slice(0, 10),
            summary: exports.length > 0 ? `Exports: ${exports.slice(0, 5).join(', ')}` : 'No exports',
          });
        } catch { /* ignore */ }
      }
    }
  }

  let projectType: SmartContext['projectType'] = 'unknown';
  if (frameworks.includes('React') || frameworks.includes('Vue')) {
    projectType = frameworks.includes('Express') || frameworks.includes('Fastify') || frameworks.includes('Hono')
      ? 'fullstack' : 'frontend';
  } else if (frameworks.includes('Express') || frameworks.includes('Fastify') || frameworks.includes('Hono')) {
    projectType = 'node';
  } else if (frameworks.includes('TypeScript') || frameworks.includes('Vitest/Jest')) {
    projectType = 'library';
  }

  return { projectType, frameworks, fileAnalysis };
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

  // Smart: 按文件内容分析生成更精准的描述
  const keyFiles = entry.files.slice(0, 30).map(f => {
    const analysisPath = join(entry.relPath, f);
    const analysis = smartCtx.fileAnalysis.get(analysisPath);
    return {
      name: f,
      desc: analysis ? `${describeFile(f, entry)} — ${analysis.summary}` : describeFile(f, entry),
    };
  });

  const subdirs = entry.subdirs.map(s => ({
    name: s.name,
    desc: describeDirSmart(s.name, smartCtx),
  }));

  const aiInstructions = generateAiInstructionsSmart(entry, smartCtx);

  return render(tmpl, {
    generated: ctx.now,
    updated: ctx.now,
    parent: parentRel || '(root)',
    dirname: entry.name,
    purpose: describeDirSmart(entry.name, smartCtx),
    purpose_desc: generatePurposeDesc(entry, smartCtx),
    key_files: keyFiles,
    subdirs,
    ai_instructions: aiInstructions,
    internal_deps: inferInternalDepsSmart(entry, smartCtx),
    external_deps: inferExternalDeps(entry),
  });
}

function describeDirSmart(name: string, smartCtx: SmartContext): string {
  if (name === 'src' && smartCtx.projectType === 'frontend') return 'Frontend source code (React/Vue components)';
  if (name === 'src' && smartCtx.projectType === 'node') return 'Server-side source code (API routes, services)';
  if (name === 'src' && smartCtx.projectType === 'fullstack') return 'Full-stack source code (client + server)';
  return describeDir(name);
}

function generatePurposeDesc(entry: DirEntry, smartCtx: SmartContext): string {
  if (entry.depth === 0) {
    const typeLabels: Record<string, string> = {
      frontend: 'Frontend application',
      node: 'Node.js backend service',
      fullstack: 'Full-stack application',
      library: 'TypeScript/JavaScript library',
      unknown: 'Project',
    };
    const label = typeLabels[smartCtx.projectType] || 'Project';
    const fw = smartCtx.frameworks.length > 0 ? ` (${smartCtx.frameworks.slice(0, 4).join(', ')})` : '';
    return `${label}${fw}. This is the project root directory.`;
  }
  return `This directory contains the ${entry.name} module of the project.`;
}

function generateAiInstructionsSmart(entry: DirEntry, smartCtx: SmartContext): string[] {
  const instructions: string[] = [];
  if (entry.depth === 0) {
    instructions.push('This is the project root. All agents must read this file on startup.');
    instructions.push(`Project type: ${smartCtx.projectType}${smartCtx.frameworks.length > 0 ? ` using ${smartCtx.frameworks.join(', ')}` : ''}.`);
    instructions.push('Run `npm test` to execute the test suite.');
    instructions.push('Run `npm run build` to compile the project.');
  }
  if (entry.files.some(f => f.endsWith('.test.ts') || f.endsWith('.spec.ts'))) {
    instructions.push('Test files are present in this directory. Run tests before modifying.');
  }
  if (entry.name === 'src' && smartCtx.projectType === 'frontend') {
    instructions.push('Frontend source directory. Follow component patterns and existing style conventions.');
  }
  if (entry.name === 'src' && smartCtx.projectType === 'node') {
    instructions.push('Backend source directory. Maintain API contracts and service boundaries.');
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
  return map[name] || 'Project subdirectory';
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

# {{dirname}}

## Purpose
{{purpose_desc}}

## Key Files
| File | Description |
|------|-------------|
{{#key_files}}
| {{.name}} | {{.desc}} |
{{/key_files}}

## Subdirectories
| Directory | Description | AGENTS |
|-----------|-------------|--------|
{{#subdirs}}
| {{.name}}/ | {{.desc}} | [AGENTS.md]({{.name}}/AGENTS.md) |
{{/subdirs}}

## For AI Agents
{{#ai_instructions}}
- {{.}}
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
Parent: [{{.}}](../AGENTS.md)
{{/parent_agents}}
`;
