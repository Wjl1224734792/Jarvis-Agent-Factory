/**
 * wiki-store 单元测试 — 文件 I/O、frontmatter 解析、索引、锁、lint
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import {
  titleToSlug,
  addWikiPage,
  ingestWikiPage,
  readWikiPage,
  deleteWikiPage,
  listWikiPages,
  queryWikiPages,
  lintWikiPages,
} from '../src/engine/wiki-store.js';

const TEST_ROOT = resolve(tmpdir(), `jarvis-test-wiki-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

describe('wiki-store', () => {
  beforeEach(() => {
    if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(TEST_ROOT, { recursive: true, force: true }); } catch { /* ok */ }
  });

  describe('titleToSlug', () => {
    it('英文标题转为小写 slug', () => {
      expect(titleToSlug('Hello World')).toBe('hello-world');
    });

    it('中文标题生成 hash slug', () => {
      const slug = titleToSlug('认证架构设计');
      expect(slug.length).toBeGreaterThan(0);
    });

    it('特殊字符被替换为连字符', () => {
      expect(titleToSlug('Hello & World!')).toBe('hello-world');
    });

    it('超长标题被截断', () => {
      const slug = titleToSlug('a'.repeat(100));
      expect(slug.length).toBeLessThanOrEqual(64);
    });
  });

  describe('addWikiPage', () => {
    it('创建新页面返回 created=true', () => {
      const result = addWikiPage(TEST_ROOT, 'Test Page', '# Hello', ['test'], 'reference');
      expect(result.created).toBe(true);
      expect(result.slug).toBe('test-page');
      const pagePath = resolve(TEST_ROOT, '.jarvis', 'wiki', 'pages', 'test-page.md');
      expect(existsSync(pagePath)).toBe(true);
    });

    it('重复创建返回 created=false', () => {
      addWikiPage(TEST_ROOT, 'Test Page', '# Hello');
      const result = addWikiPage(TEST_ROOT, 'Test Page', '# Another');
      expect(result.created).toBe(false);
    });
  });

  describe('ingestWikiPage', () => {
    it('首次 ingest 创建页面', () => {
      const result = ingestWikiPage(TEST_ROOT, 'Auth Design', '# JWT Auth', ['auth'], 'architecture');
      expect(result.appended).toBe(false);
      expect(result.slug).toBe('auth-design');
    });

    it('重复 ingest 追加内容', () => {
      ingestWikiPage(TEST_ROOT, 'Auth Design', '# JWT Auth');
      const result = ingestWikiPage(TEST_ROOT, 'Auth Design', '## Token Refresh');
      expect(result.appended).toBe(true);
      const page = readWikiPage(TEST_ROOT, 'auth-design');
      expect(page).not.toBeNull();
      expect(page!.body).toContain('Token Refresh');
    });
  });

  describe('readWikiPage', () => {
    it('读取存在的页面', () => {
      addWikiPage(TEST_ROOT, 'Read Me', 'content here');
      const page = readWikiPage(TEST_ROOT, 'read-me');
      expect(page).not.toBeNull();
      expect(page!.meta.title).toBe('Read Me');
      expect(page!.body).toContain('content here');
    });

    it('不存在的页面返回 null', () => {
      expect(readWikiPage(TEST_ROOT, 'nonexistent')).toBeNull();
    });
  });

  describe('deleteWikiPage', () => {
    it('删除存在的页面返回 true', () => {
      addWikiPage(TEST_ROOT, 'Delete Me', 'gone');
      expect(deleteWikiPage(TEST_ROOT, 'delete-me')).toBe(true);
      expect(readWikiPage(TEST_ROOT, 'delete-me')).toBeNull();
    });

    it('删除不存在的页面返回 false', () => {
      expect(deleteWikiPage(TEST_ROOT, 'nope')).toBe(false);
    });
  });

  describe('listWikiPages', () => {
    it('空目录返回空数组', () => {
      expect(listWikiPages(TEST_ROOT)).toEqual([]);
    });

    it('列出所有创建的页面', () => {
      addWikiPage(TEST_ROOT, 'Page A', 'a');
      addWikiPage(TEST_ROOT, 'Page B', 'b');
      const pages = listWikiPages(TEST_ROOT);
      expect(pages.length).toBe(2);
    });
  });

  describe('queryWikiPages', () => {
    it('按关键词匹配标题', () => {
      addWikiPage(TEST_ROOT, 'Architecture Overview', 'some content about architecture', ['tech'], 'architecture');
      addWikiPage(TEST_ROOT, 'Debug Guide', 'debugging tips', ['debug'], 'debugging');
      const results = queryWikiPages(TEST_ROOT, 'architecture');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].slug).toBe('architecture-overview');
    });

    it('返回无结果的空数组', () => {
      const results = queryWikiPages(TEST_ROOT, 'nothing-here');
      expect(results).toEqual([]);
    });
  });

  describe('lintWikiPages', () => {
    it('空 wiki 返回空报告', () => {
      const result = lintWikiPages(TEST_ROOT);
      expect(result.orphanPages).toEqual([]);
      expect(result.stalePages).toEqual([]);
    });

    it('检测孤立页面（无入链的页面）', () => {
      addWikiPage(TEST_ROOT, 'Orphan', 'no links here', [], 'reference');
      const result = lintWikiPages(TEST_ROOT);
      // 单页无入链 → 孤立
      expect(result.orphanPages).toContain('orphan');
    });
  });
});
