/**
 * Wiki 存储层 — 文件系统 Markdown + YAML frontmatter
 * 数据目录: <projectRoot>/.jarvis/wiki/
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync, openSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCK_TIMEOUT = 5000;
const LOCK_RETRY_MS = 50;
const MAX_PAGE_SIZE = 10240;

interface WikiPageMeta {
  title: string;
  tags: string[];
  created: string;
  updated: string;
  sources: string[];
  links: string[];
  category: string;
  confidence: string;
  schemaVersion: number;
}

interface WikiPage {
  meta: WikiPageMeta;
  body: string;
  slug: string;
  size: number;
}

function ensureWikiDir(root: string) {
  const dir = resolve(root, '.jarvis', 'wiki', 'pages');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const gitignore = resolve(root, '.jarvis', '.gitignore');
  let gi = '';
  try { gi = readFileSync(gitignore, 'utf-8'); } catch { /* ok */ }
  if (!gi.includes('wiki/')) {
    writeFileSync(gitignore, (gi ? gi + '\n' : '') + 'wiki/\n', 'utf-8');
  }
  return resolve(root, '.jarvis', 'wiki');
}

export function titleToSlug(title: string): string {
  let slug = title.toLowerCase().replace(/[^a-z0-9一-鿿가-힯぀-ゟ゠-ヿ-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
  if (!slug) slug = `page-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return slug;
}

function parseFrontmatter(raw: string): { meta: Partial<WikiPageMeta>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const meta: Partial<WikiPageMeta> = {};
  if (!m) return { meta, body: raw };
  const fm = m[1];
  const body = m[2];
  for (const line of fm.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)/);
    if (!kv) continue;
    const key = kv[1];
    let val: any = kv[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    } else {
      val = val.replace(/^"|"$/g, '');
    }
    (meta as any)[key] = val;
  }
  return { meta, body };
}

function stringifyFrontmatter(meta: Partial<WikiPageMeta>): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map(s => `"${s}"`).join(', ')}]`);
    } else if (typeof v === 'number') {
      lines.push(`${k}: ${v}`);
    } else {
      lines.push(`${k}: "${v}"`);
    }
  }
  return `---\n${lines.join('\n')}\n---\n`;
}

function lockPath(root: string) { return resolve(root, '.wiki-lock'); }

function withWikiLock<T>(root: string, fn: () => T): T {
  const lp = lockPath(root);
  const start = Date.now();
  while (Date.now() - start < LOCK_TIMEOUT) {
    try {
      const fd = openSync(lp, 'wx');
      closeSync(fd);
      try { return fn(); } finally {
        try { unlinkSync(lp); } catch { /* ok */ }
      }
    } catch (e: any) {
      if (e.code !== 'EEXIST') throw e;
      const waited = Date.now() - start;
      if (waited >= LOCK_TIMEOUT) throw new Error('Wiki lock timeout', { cause: e });
      const now = Date.now();
      while (Date.now() - now < LOCK_RETRY_MS) { /* spin */ }
    }
  }
  throw new Error('Wiki lock timeout');
}

export function addWikiPage(root: string, title: string, content: string, tags?: string[], category?: string): { slug: string; created: boolean } {
  const dir = ensureWikiDir(root);
  const slug = titleToSlug(title);
  const pagePath = resolve(dir, 'pages', `${slug}.md`);
  return withWikiLock(root, () => {
    if (existsSync(pagePath)) {
      return { slug, created: false };
    }
    const meta: Partial<WikiPageMeta> = {
      title,
      tags: tags || [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      sources: [],
      links: [],
      category: category || 'reference',
      confidence: 'medium',
      schemaVersion: 1,
    };
    writeFileSync(pagePath, stringifyFrontmatter(meta) + content, 'utf-8');
    appendLog(dir, 'add', slug, title);
    rebuildIndex(dir);
    return { slug, created: true };
  });
}

export function ingestWikiPage(root: string, title: string, content: string, tags?: string[], category?: string, sources?: string[], confidence?: string): { slug: string; appended: boolean } {
  const dir = ensureWikiDir(root);
  const slug = titleToSlug(title);
  const pagePath = resolve(dir, 'pages', `${slug}.md`);
  return withWikiLock(root, () => {
    const now = new Date().toISOString();
    if (existsSync(pagePath)) {
      const existing = readFileSync(pagePath, 'utf-8');
      const { meta, body } = parseFrontmatter(existing);
      // Merge: append new content with timestamp, merge tags
      const mergedTags = [...new Set([...(meta.tags || []), ...(tags || [])])];
      const mergedSources = [...new Set([...(meta.sources || []), ...(sources || [])])];
      const newMeta = { ...meta, tags: mergedTags, sources: mergedSources, updated: now, confidence: confidence || meta.confidence || 'medium' };
      const newBody = body.trimEnd() + '\n\n---\n_Appended ' + now + '_\n\n' + content;
      writeFileSync(pagePath, stringifyFrontmatter(newMeta) + newBody, 'utf-8');
      appendLog(dir, 'ingest', slug, title);
      rebuildIndex(dir);
      return { slug, appended: true };
    }
    const meta: Partial<WikiPageMeta> = {
      title,
      tags: tags || [],
      created: now,
      updated: now,
      sources: sources || [],
      links: [],
      category: category || 'reference',
      confidence: confidence || 'medium',
      schemaVersion: 1,
    };
    writeFileSync(pagePath, stringifyFrontmatter(meta) + content, 'utf-8');
    appendLog(dir, 'ingest', slug, title);
    rebuildIndex(dir);
    return { slug, appended: false };
  });
}

function safeSlug(page: string): string {
  return page.replace(/\.md$/, '').replace(/\.\./g, '').replace(/[/\\]/g, '');
}

export function readWikiPage(root: string, page: string): WikiPage | null {
  const dir = resolve(root, '.jarvis', 'wiki');
  const slug = safeSlug(page);
  const pagesDir = resolve(dir, 'pages');
  const pagePath = resolve(pagesDir, `${slug}.md`);
  if (!pagePath.startsWith(pagesDir)) return null;
  if (!existsSync(pagePath)) return null;
  const raw = readFileSync(pagePath, 'utf-8');
  const { meta, body } = parseFrontmatter(raw);
  const stat = statSync(pagePath);
  return {
    meta: {
      title: meta.title || slug,
      tags: meta.tags || [],
      created: meta.created || '',
      updated: meta.updated || '',
      sources: meta.sources || [],
      links: meta.links || [],
      category: meta.category || 'reference',
      confidence: meta.confidence || 'medium',
      schemaVersion: meta.schemaVersion || 1,
    },
    body,
    slug,
    size: stat.size,
  };
}

export function deleteWikiPage(root: string, page: string): boolean {
  const dir = resolve(root, '.jarvis', 'wiki');
  const slug = safeSlug(page);
  const pagesDir = resolve(dir, 'pages');
  const pagePath = resolve(pagesDir, `${slug}.md`);
  if (!pagePath.startsWith(pagesDir)) return false;
  return withWikiLock(root, () => {
    if (!existsSync(pagePath)) return false;
    unlinkSync(pagePath);
    appendLog(dir, 'delete', slug, slug);
    rebuildIndex(dir);
    return true;
  });
}

export function listWikiPages(root: string): { slug: string; title: string; category: string; tags: string[]; updated: string; size: number }[] {
  const dir = resolve(root, '.jarvis', 'wiki');
  const pagesDir = resolve(dir, 'pages');
  if (!existsSync(pagesDir)) return [];
  const files = readdirSync(pagesDir).filter(f => f.endsWith('.md'));
  return files.map(f => {
    const raw = readFileSync(resolve(pagesDir, f), 'utf-8');
    const { meta } = parseFrontmatter(raw);
    const stat = statSync(resolve(pagesDir, f));
    return {
      slug: f.replace(/\.md$/, ''),
      title: meta.title || f.replace(/\.md$/, ''),
      category: meta.category || 'reference',
      tags: meta.tags || [],
      updated: meta.updated || '',
      size: stat.size,
    };
  }).sort((a, b) => b.updated.localeCompare(a.updated));
}

export function queryWikiPages(root: string, query: string, opts?: { tags?: string[]; category?: string; limit?: number }): { slug: string; title: string; snippet: string; category: string; tags: string[]; updated: string }[] {
  const pages = listWikiPages(root);
  const results: { slug: string; title: string; snippet: string; category: string; tags: string[]; updated: string; score: number }[] = [];
  const q = query.toLowerCase();
  for (const p of pages) {
    if (opts?.category && p.category !== opts.category) continue;
    if (opts?.tags && !opts.tags.some(t => p.tags.includes(t))) continue;
    let score = 0;
    if (p.title.toLowerCase().includes(q)) score += 10;
    if (p.tags.some(t => t.toLowerCase().includes(q))) score += 5;
    if (score > 0) {
      const page = readWikiPage(root, p.slug);
      const bodyMatch = page ? page.body.toLowerCase().includes(q) : false;
      if (bodyMatch) score += 2;
      let snippet = '';
      if (page) {
        const idx = page.body.toLowerCase().indexOf(q);
        if (idx >= 0) {
          snippet = page.body.slice(Math.max(0, idx - 40), idx + q.length + 60).replace(/\n/g, ' ');
          if (idx > 40) snippet = '...' + snippet;
          if (idx + q.length + 60 < page.body.length) snippet += '...';
        } else {
          snippet = page.body.slice(0, 100).replace(/\n/g, ' ') + '...';
        }
      }
      results.push({ ...p, snippet, score });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, opts?.limit || 20);
}

function rebuildIndex(dir: string) {
  const pages = readdirSync(resolve(dir, 'pages')).filter(f => f.endsWith('.md'));
  const byCategory: Record<string, string[]> = {};
  for (const f of pages) {
    const raw = readFileSync(resolve(dir, 'pages', f), 'utf-8');
    const { meta } = parseFrontmatter(raw);
    const cat = meta.category || 'reference';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(`- [${meta.title || f.replace(/\.md$/, '')}](${f}) — ${meta.updated || '?'}`);
  }
  const lines = ['# Wiki Index', '', `_${pages.length} pages, rebuilt ${new Date().toISOString()}_`, ''];
  for (const [cat, items] of Object.entries(byCategory).sort()) {
    lines.push(`## ${cat}`, '');
    for (const item of items) lines.push(item);
    lines.push('');
  }
  writeFileSync(resolve(dir, 'index.md'), lines.join('\n'), 'utf-8');
}

function appendLog(dir: string, action: string, slug: string, title: string) {
  const logPath = resolve(dir, 'log.md');
  const entry = `| ${new Date().toISOString()} | ${action} | [${title}](${slug}.md) |\n`;
  if (!existsSync(logPath)) {
    writeFileSync(logPath, '# Wiki Operation Log\n\n| Timestamp | Action | Page |\n|-----------|--------|------|\n' + entry, 'utf-8');
  } else {
    writeFileSync(logPath, readFileSync(logPath, 'utf-8') + entry, 'utf-8');
  }
}

export function lintWikiPages(root: string): { orphanPages: string[]; stalePages: string[]; brokenLinks: string[]; oversizedPages: string[]; lowConfidencePages: string[] } {
  const pages = listWikiPages(root);
  const dir = resolve(root, '.jarvis', 'wiki');
  const now = Date.now();
  const staleMs = 30 * 24 * 60 * 60 * 1000;
  const orphanPages: string[] = [];
  const stalePages: string[] = [];
  const brokenLinks: string[] = [];
  const oversizedPages: string[] = [];
  const lowConfidencePages: string[] = [];

  // Build all slugs + link references
  const allSlugs = new Set(pages.map(p => p.slug));
  const allLinks = new Set<string>();
  for (const p of pages) {
    const page = readWikiPage(root, p.slug);
    if (!page) continue;
    for (const link of page.meta.links) allLinks.add(link.replace(/\.md$/, ''));

    if (p.size > MAX_PAGE_SIZE) oversizedPages.push(p.slug);
    if (page.meta.confidence === 'low') lowConfidencePages.push(p.slug);
    if (page.meta.updated && new Date(page.meta.updated).getTime() < now - staleMs) stalePages.push(p.slug);
  }

  for (const p of pages) {
    let linked = false;
    for (const link of allLinks) {
      if (link === p.slug || link === p.title) { linked = true; break; }
    }
    // Also check raw body for [[links]]
    const page = readWikiPage(root, p.slug);
    if (page) {
      const wikiLinks = page.body.match(/\[\[([^\]]+)\]\]/g);
      if (wikiLinks) {
        for (const wl of wikiLinks) {
          const target = wl.slice(2, -2).replace(/\.md$/, '');
          if (!allSlugs.has(target) && !existsSync(resolve(dir, 'pages', `${target}.md`))) {
            brokenLinks.push(`${p.slug} → ${target}`);
          }
        }
      }
    }
    if (!linked && p.category !== 'session-log') orphanPages.push(p.slug);
  }

  return { orphanPages, stalePages, brokenLinks, oversizedPages, lowConfidencePages };
}
