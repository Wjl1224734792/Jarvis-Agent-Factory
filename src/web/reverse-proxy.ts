/**
 * 反向代理 — 从 GitHub Release CDN 拉取远程 HTML，缓存后返回。
 * 取不到时回退到本地文件。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CDN_BASE = 'https://github.com/Wjl1224734792/Jarvis-Agent-Factory/releases/latest/download';
const CACHE_TTL = 3_600_000; // 1 小时

const htmlCache = new Map<string, { html: string; ts: number }>();

/** 从 GitHub Release CDN 获取 HTML */
async function fetchRemoteHtml(page: string): Promise<string | null> {
  const cached = htmlCache.get(page);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.html;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(`${CDN_BASE}/${page}.html`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'jarvis-agent-factory' },
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const html = await resp.text();
    htmlCache.set(page, { html, ts: Date.now() });
    console.log(`  ✓ 远程 HTML 已缓存: ${page}.html (${html.length} 字节)`);
    return html;
  } catch {
    return null;
  }
}

/** 读取本地 HTML（回退方案） */
function loadLocalHtml(viewsDir: string, page: string): string {
  const p = resolve(viewsDir, `${page}.html`);
  return readFileSync(p, 'utf-8');
}

/**
 * 获取 HTML 内容：优先远程 CDN，失败则回退本地文件。
 * @param viewsDir - 本地 views 目录（回退用）
 * @param page - 页面名（不含 .html 后缀）
 */
export async function getHtml(viewsDir: string, page: string): Promise<string> {
  const remote = await fetchRemoteHtml(page);
  if (remote) return remote;
  console.log(`  ⚠ 远程 HTML 不可用，使用本地文件: ${page}.html`);
  return loadLocalHtml(viewsDir, page);
}

/** 预加载指定页面到缓存（后台静默更新） */
export function preloadCache(viewsDir: string, pages: string[]): void {
  for (const page of pages) {
    fetchRemoteHtml(page).catch(() => {});
  }
}
