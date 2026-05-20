import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import { setupApiRoutes } from '../src/web/routes.js';

const TEST_DIR = resolve(process.cwd(), '.jarvis', '__test__');
const TEST_FILE = resolve(TEST_DIR, 'test-doc.md');
const TEST_CONTENT = '# 测试文档\n\n这是一份测试 Markdown 文件。';

describe('Jarvis API - GET /api/jarvis/:filepath', () => {
  const app = new Hono();
  setupApiRoutes(app, null, process.cwd());

  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_FILE, TEST_CONTENT, 'utf-8');
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('正常读取 Markdown 文件返回 200 + 文本内容', async () => {
    const res = await app.request('/api/jarvis/__test__/test-doc.md');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe(TEST_CONTENT);
  });

  it('路径遍历攻击返回 400', async () => {
    const res = await app.request('/api/jarvis/..%2F..%2F..%2Fetc%2Fpasswd');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Path traversal');
  });

  it('URL 编码路径遍历返回 400', async () => {
    const res = await app.request('/api/jarvis/..%2F..%2F..%2F..%2Fsecret%2Ffile.md');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Path traversal');
  });

  it('文件不存在返回 404', async () => {
    const res = await app.request('/api/jarvis/nonexistent/file.md');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('File not found');
  });

  it('非 .md 文件返回 400', async () => {
    const res = await app.request('/api/jarvis/requirements/test.txt');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Only .md files allowed');
  });

  it('空路径返回 400', async () => {
    const res = await app.request('/api/jarvis/');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('File path required');
  });
});
