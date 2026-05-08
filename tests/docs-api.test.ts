import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { setupApiRoutes } from '../src/web/routes.js';

describe('Docs API - GET /api/docs/:filepath', () => {
  const app = new Hono();
  setupApiRoutes(app, null, process.cwd());

  it('正常读取 Markdown 文件返回 200 + 文本内容', async () => {
    const res = await app.request('/api/docs/requirements/2026-05-08-session-list-v2-improvements.md');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });

  it('路径遍历攻击返回 400', async () => {
    const res = await app.request('/api/docs/..%2F..%2F..%2Fetc%2Fpasswd');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Path traversal');
  });

  it('URL 编码路径遍历返回 400', async () => {
    const res = await app.request('/api/docs/..%2F..%2F..%2F..%2Fsecret%2Ffile.md');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Path traversal');
  });

  it('文件不存在返回 404', async () => {
    const res = await app.request('/api/docs/nonexistent/file.md');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('File not found');
  });

  it('非 .md 文件返回 400', async () => {
    const res = await app.request('/api/docs/requirements/test.txt');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Only .md files allowed');
  });

  it('空路径返回 400', async () => {
    const res = await app.request('/api/docs/');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('File path required');
  });
});
