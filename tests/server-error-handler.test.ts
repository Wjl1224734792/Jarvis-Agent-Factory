/**
 * TASK-003: Engine 全局错误处理中间件 + 请求日志 — 单元测试
 *
 * 测试范围:
 *   1. sanitizeErrorMessage — 敏感信息脱敏
 *   2. resolveErrorResponse — 错误响应格式
 *   3. createLoggerMiddleware — 请求日志格式
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import {
  sanitizeErrorMessage,
  resolveErrorResponse,
  createLoggerMiddleware,
} from '../src/engine/server.js';

// ── 测试套件 ────────────────────────────────────────────────

describe('TASK-003: 全局错误处理中间件 + 请求日志', () => {
  // ────────────────────────────────────────────────────────
  // sanitizeErrorMessage — 敏感信息脱敏
  // ────────────────────────────────────────────────────────
  describe('sanitizeErrorMessage — 敏感信息脱敏', () => {
    it('普通消息不含敏感信息则保持原样', () => {
      expect(sanitizeErrorMessage('Something went wrong')).toBe('Something went wrong');
    });

    it('sk- 前缀 API 密钥被替换为 sk-***', () => {
      const result = sanitizeErrorMessage('Invalid API key: sk-ant-abc123def456ghi789');
      expect(result).toBe('Invalid API key: sk-***');
      expect(result).not.toContain('sk-ant-abc123def456ghi789');
    });

    it('Bearer token 被替换为 Bearer ***', () => {
      const result = sanitizeErrorMessage('Unauthorized: Bearer eyJhbGciOiJIUzI1NiJ9.token');
      expect(result).toBe('Unauthorized: Bearer ***');
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiJ9.token');
    });

    it('多个敏感信息均被脱敏', () => {
      const msg = 'Key: sk-abc123def456, Token: Bearer xyz789, Extra: sk-ghi789jkl012';
      const result = sanitizeErrorMessage(msg);
      expect(result).toBe('Key: sk-***, Token: Bearer ***, Extra: sk-***');
    });

    it('空字符串返回空字符串', () => {
      expect(sanitizeErrorMessage('')).toBe('');
    });

    it('null/undefined 不会导致崩溃', () => {
      expect(sanitizeErrorMessage(null as unknown as string)).toBe('');
      expect(sanitizeErrorMessage(undefined as unknown as string)).toBe('');
    });
  });

  // ────────────────────────────────────────────────────────
  // resolveErrorResponse — 错误响应格式
  // ────────────────────────────────────────────────────────
  describe('resolveErrorResponse — 错误响应格式', () => {
    beforeEach(() => {
      // 默认测试环境为非生产，确保错误消息不被屏蔽
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('普通 Error 返回 500 状态码和统一格式', () => {
      const { status, body } = resolveErrorResponse(new Error('数据库连接失败'));
      expect(status).toBe(500);
      expect(body).toMatchObject({ error: '数据库连接失败', code: 500 });
      expect(body).toHaveProperty('stack');
    });

    it('4xx 错误（带 status 属性）正确分类', () => {
      const err = Object.assign(new Error('Validation failed'), { status: 400 });
      const { status, body } = resolveErrorResponse(err);
      expect(status).toBe(400);
      expect(body).toMatchObject({ error: 'Validation failed', code: 400 });
    });

    it('状态码在 400-499 范围外归为 500', () => {
      const err = Object.assign(new Error('Weird error'), { status: 999 });
      const { status, body } = resolveErrorResponse(err);
      expect(status).toBe(500);
      expect(body.code).toBe(500);
    });

    it('生产环境屏蔽堆栈信息', () => {
      process.env.NODE_ENV = 'production';
      const { status, body } = resolveErrorResponse(new Error('test'));
      expect(status).toBe(500);
      expect(body).not.toHaveProperty('stack');
      expect(body.error).toBe('Internal Server Error');
    });

    it('生产环境 + 4xx 错误仍保留具体错误信息', () => {
      process.env.NODE_ENV = 'production';
      const err = Object.assign(new Error('Bad request'), { status: 400 });
      const { status, body } = resolveErrorResponse(err);
      expect(status).toBe(400);
      expect(body.error).toBe('Bad request');
      expect(body).not.toHaveProperty('stack');
    });

    it('错误消息为空时使用默认消息', () => {
      const err = new Error();
      const { body } = resolveErrorResponse(err);
      expect(body.error).toBeDefined();
      expect(typeof body.error).toBe('string');
    });

    it('敏感信息在错误消息中被脱敏', () => {
      const err = new Error('API call failed with key: sk-op-aaabbbcccddd');
      const { body } = resolveErrorResponse(err);
      expect(body.error).toBe('API call failed with key: sk-***');
      expect(body.error).not.toContain('sk-op-aaabbbcccddd');
    });
  });

  // ────────────────────────────────────────────────────────
  // createLoggerMiddleware — 请求日志格式
  // ────────────────────────────────────────────────────────
  describe('createLoggerMiddleware — 请求日志', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('成功请求记录 [METHOD] /path - status duration_ms', async () => {
      const app = new Hono();
      app.use('*', createLoggerMiddleware());
      app.get('/health', (c) => c.json({ status: 'ok' }));

      await app.request('/health');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logMsg = consoleSpy.mock.calls[0][0] as string;
      expect(logMsg).toMatch(/^\[\d{4}-\d{2}-\d{2}T.*\] \[GET\] \/health - 200 \d+ms$/);
    });

    it('错误请求日志附加 !!! 标记', async () => {
      const app = new Hono();
      app.use('*', createLoggerMiddleware());
      app.get('/crash', () => {
        throw new Error('unexpected');
      });
      // 需注册 onError 让请求返回 500 而不是直接抛到框架
      app.onError((err, c) => {
        return c.json({ error: err.message }, 500);
      });

      await app.request('/crash');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logMsg = consoleSpy.mock.calls[0][0] as string;
      expect(logMsg).toMatch(/\[\d{4}-\d{2}-\d{2}T.*\] \[GET\] \/crash - 500 \d+ms !!!$/);
    });

    it('404 请求日志也包含 !!! 标记', async () => {
      const app = new Hono();
      app.use('*', createLoggerMiddleware());

      await app.request('/not-found');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logMsg = consoleSpy.mock.calls[0][0] as string;
      expect(logMsg).toMatch(/\[\d{4}-\d{2}-\d{2}T.*\] \[GET\] \/not-found - 404 \d+ms !!!$/);
    });

    it('POST 请求日志正确记录方法', async () => {
      const app = new Hono();
      app.use('*', createLoggerMiddleware());
      app.post('/api/data', (c) => c.json({ ok: true }));

      await app.request('/api/data', { method: 'POST' });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logMsg = consoleSpy.mock.calls[0][0] as string;
      expect(logMsg).toContain('[POST] /api/data');
    });
  });

  // ────────────────────────────────────────────────────────
  // 实际集成：onError + logger 在 startEngine 中的注册顺序
  // ────────────────────────────────────────────────────────
  describe('集成验证 — onError 与 logger 协作', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      delete process.env.NODE_ENV;
    });

    it('onError 捕获未处理异常返回统一格式', async () => {
      const app = new Hono();
      app.use('*', createLoggerMiddleware());
      app.get('/api/throw', () => {
        throw new Error('runtime exception');
      });
      app.onError((err, c) => {
        const { status, body } = resolveErrorResponse(err);
        return c.json(body, status as any);
      });

      const res = await app.request('/api/throw');
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toMatchObject({ error: 'runtime exception', code: 500 });
      expect(body).toHaveProperty('stack');
    });
  });
});
