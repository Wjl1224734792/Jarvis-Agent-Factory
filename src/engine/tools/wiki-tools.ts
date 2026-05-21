import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from './types.js';
import { addWikiPage, ingestWikiPage, readWikiPage, deleteWikiPage, listWikiPages, queryWikiPages, lintWikiPages } from '../wiki-store.js';

export function registerWikiTools(server: McpServer, _db: any, root: string, ctx: ToolContext) {
  server.tool('repowiki_add',
    '【知识库】快速创建单页。若 slug 已存在则拒绝，提示使用 repowiki_ingest 追加。',
    {
      title: z.string().describe('页面标题'),
      content: z.string().describe('Markdown 格式页面内容'),
      tags: z.array(z.string()).optional().describe('标签列表'),
      category: z.enum(['architecture', 'decision', 'pattern', 'debugging', 'environment', 'session-log', 'reference', 'convention']).optional(),
    },
    async ({ title, content, tags, category }) => {
      if (!title || !content) return ctx.resp({ error: 'title 和 content 为必填参数' });
      const result = await addWikiPage(root, title, content, tags, category);
      if (!result.created) return ctx.resp({ error: `页面 "${result.slug}" 已存在。使用 repowiki_ingest 追加内容。`, slug: result.slug });
      return ctx.resp({ ok: true, slug: result.slug, created: true });
    });

  server.tool('repowiki_ingest',
    '【知识库】创建或追加知识到页面（合并模式）。已存在则追加带时间戳的新节。',
    {
      title: z.string().describe('页面标题'),
      content: z.string().describe('Markdown 格式页面内容'),
      tags: z.array(z.string()).optional().describe('标签列表（合并到已有标签）'),
      category: z.enum(['architecture', 'decision', 'pattern', 'debugging', 'environment', 'session-log', 'reference', 'convention']).optional(),
      sources: z.array(z.string()).optional().describe('来源会话 ID 列表'),
      confidence: z.enum(['high', 'medium', 'low']).optional(),
    },
    async ({ title, content, tags, category, sources, confidence }) => {
      if (!title || !content) return ctx.resp({ error: 'title 和 content 为必填参数' });
      const result = await ingestWikiPage(root, title, content, tags, category, sources, confidence);
      return ctx.resp({
        ok: true, slug: result.slug,
        action: result.appended ? 'appended' : 'created',
      });
    });

  server.tool('repowiki_query',
    '【知识库】关键字+标签搜索。返回匹配页面及其摘要片段。纯文本匹配，非向量搜索。',
    {
      query: z.string().describe('搜索关键词'),
      tags: z.array(z.string()).optional().describe('按标签过滤'),
      category: z.enum(['architecture', 'decision', 'pattern', 'debugging', 'environment', 'session-log', 'reference', 'convention']).optional(),
      limit: z.number().optional().describe('返回结果数量上限，默认 20'),
    },
    async ({ query, tags, category, limit }) => {
      if (!query) return ctx.resp({ results: [], count: 0 });
      const results = queryWikiPages(root, query, { tags, category, limit });
      return ctx.resp({ results, count: results.length, query });
    });

  server.tool('repowiki_list',
    '【知识库】列出所有 Wiki 页面。返回 slug、标题、分类、标签、更新时间。',
    {},
    async () => {
      const pages = listWikiPages(root);
      return ctx.resp({ pages, count: pages.length });
    });

  server.tool('repowiki_read',
    '【知识库】读取指定页面完整内容（含 frontmatter 元数据）。参数为 slug 或文件名。',
    {
      page: z.string().describe('页面 slug 或文件名（如 "auth-architecture" 或 "auth-architecture.md"）'),
    },
    async ({ page }) => {
      if (!page) return ctx.resp({ error: 'page 参数必填' });
      const data = readWikiPage(root, page);
      if (!data) return ctx.resp({ error: `页面 "${page}" 不存在` });
      return ctx.resp({
        slug: data.slug,
        meta: data.meta,
        body: data.body,
        size: data.size,
      });
    });

  server.tool('repowiki_delete',
    '【知识库】删除指定页面。不可逆操作。',
    {
      page: z.string().describe('要删除的页面 slug 或文件名'),
    },
    async ({ page }) => {
      if (!page) return ctx.resp({ error: 'page 参数必填' });
      const ok = await deleteWikiPage(root, page);
      if (!ok) return ctx.resp({ error: `页面 "${page}" 不存在` });
      return ctx.resp({ ok: true, deleted: page });
    });

  server.tool('repowiki_lint',
    '【知识库】健康检查：孤立页、陈旧页、损坏引用、超大页、低置信度页。',
    {},
    async () => {
      const result = lintWikiPages(root);
      return ctx.resp(result);
    });
}
