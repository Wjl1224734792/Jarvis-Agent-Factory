import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
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
 * 生成整个目录树的文档文件。
 */
export function generateAll(flatEntries: DirEntry[], rootDir: string): { dir: string; agents: string; claude: string | null }[] {
  const now = new Date().toISOString();
  const ctx: GenContext = { entry: flatEntries[0], rootDir, now };
  const results: { dir: string; agents: string; claude: string | null }[] = [];

  for (const entry of flatEntries) {
    // 计算父级 AGENTS.md 相对路径
    const parentRel = entry.depth > 0 ? '../AGENTS.md' : null;

    const agentsContent = generateAgentsMd(entry, parentRel, ctx);
    const shouldGenClaude = entry.depth === 0 || entry.subdirs.length > 0;
    const claudeContent = shouldGenClaude ? generateClaudeMd(entry, parentRel !== null, ctx) : null;

    results.push({ dir: entry.absPath, agents: agentsContent, claude: claudeContent });
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
