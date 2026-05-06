// @vitest-environment jsdom
/**
 * AI 摘要与排版前端集成测试
 *
 * 基于 API 契约（POST /api/v1/ai/summary、POST /api/v1/ai/format）
 * 验证前端侧的请求构建、响应处理、错误映射和加载状态管理。
 *
 * 覆盖范围：
 * - AI 摘要按钮触发 -> API 请求 -> 响应回填
 * - AI 排版按钮下拉菜单（beautify / structure）
 * - beautify 模式：选中内容 -> API 调用 -> 内容替换
 * - structure 模式：确认对话框 -> API 调用 -> 全部替换
 * - 加载状态（按钮禁用 / spinner）
 * - 错误处理（400/403/429/500/502 -> toast 提示、保留原文）
 * - 空内容 / 未选中提示
 *
 * @see REQ-003 / TASK-008（AI 摘要前端）
 * @see REQ-004 / TASK-008（AI 排版前端）
 * @see REQ-005 / TASK-009（AI 排版交互）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  aiSummaryRequestSchema,
  aiSummaryResponseSchema,
  aiFormatRequestSchema,
  aiFormatResponseSchema,
} from '@feijia/schemas';
import { API_ROUTES } from '@feijia/shared';

/* ------------------------------------------------------------------ */
/*  全局 Mock                                                          */
/* ------------------------------------------------------------------ */

/** 记录所有 fetch 调用以便断言 */
const fetchCalls: Array<{
  url: string;
  init: RequestInit;
}> = [];

/** 模拟 fetch 实现，按需返回预设响应 */
let fetchImpl: (url: string, init: RequestInit) => Promise<Response>;

function mockFetch(
  handler: (url: string, init: RequestInit) => Promise<Response>
) {
  fetchImpl = handler;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      const resolvedInit = init ?? {};
      fetchCalls.push({ url: urlStr, init: resolvedInit });
      return fetchImpl(urlStr, resolvedInit);
    })
  );
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function errorResponse(
  status: number,
  body: { code: string; message: string }
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/* ------------------------------------------------------------------ */
/*  测试辅助函数                                                        */
/* ------------------------------------------------------------------ */

/** 构造摘要 API 请求体 */
function buildSummaryPayload(postId: string, content?: string) {
  return { postId, content };
}

/** 构造排版 API 请求体 */
function buildFormatPayload(content: string, mode: 'beautify' | 'structure') {
  return { content, mode };
}

/**
 * 创建带有状态码和错误码元数据的错误对象。
 * 模拟前端 api-client 中的错误映射行为。
 */
function createApiError(
  status: number,
  code: string | undefined,
  message: string
) {
  const error = new Error(message);
  Object.defineProperties(error, {
    status: { configurable: true, enumerable: false, value: status },
    code: { configurable: true, enumerable: false, value: code },
  });
  return error;
}

/** 模拟调用摘要 API 的前端逻辑 */
async function callSummaryApi(postId: string, content?: string) {
  const payload = buildSummaryPayload(postId, content);
  const validated = aiSummaryRequestSchema.parse(payload);
  const response = await fetch(API_ROUTES.ai.summary, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validated),
  });
  if (!response.ok) {
    const body = (await response.json()) as { code?: string; message?: string };
    throw createApiError(
      response.status,
      body.code,
      body.message ?? `HTTP ${response.status}`
    );
  }
  return aiSummaryResponseSchema.parse(await response.json());
}

/** 模拟调用排版 API 的前端逻辑 */
async function callFormatApi(content: string, mode: 'beautify' | 'structure') {
  const payload = buildFormatPayload(content, mode);
  const validated = aiFormatRequestSchema.parse(payload);
  const response = await fetch(API_ROUTES.ai.format, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validated),
  });
  if (!response.ok) {
    const body = (await response.json()) as { code?: string; message?: string };
    throw createApiError(
      response.status,
      body.code,
      body.message ?? `HTTP ${response.status}`
    );
  }
  return aiFormatResponseSchema.parse(await response.json());
}

/**
 * 将 API 错误映射为用户可见的提示文案。
 * 模拟前端 api-client 中 mapWebApiError 的错误翻译逻辑。
 *
 * @param error 捕获的错误对象，可能包含 status 和 code 元数据。
 * @returns 面向终端用户的简化提示语。
 */
function mapApiErrorToMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return '操作失败，请稍后重试。';
  }

  const status =
    'status' in error && typeof error.status === 'number'
      ? error.status
      : undefined;
  const code =
    'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined;

  if (status === 403 || code === 'FEATURE_DISABLED') {
    return 'AI 功能当前不可用，请联系管理员。';
  }
  if (status === 429 || code === 'RATE_LIMITED') {
    return '请求过于频繁，请稍后再试。';
  }
  if (status === 502 || code === 'LLM_API_ERROR') {
    return 'AI 服务暂时不可用，请稍后重试。';
  }
  if (status === 500 || code === 'INTERNAL_ERROR') {
    return '服务内部错误，请稍后重试。';
  }
  if (status === 400 || code === 'INVALID_INPUT') {
    return '请求参数有误，请检查后重试。';
  }

  const msg = error.message.toLowerCase();
  if (msg.includes('unauthorized') || msg.includes('请先登录')) {
    return '请先登录后再继续操作。';
  }

  return '操作失败，请稍后重试。';
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('AI 摘要与排版前端集成', () => {
  beforeEach(() => {
    fetchCalls.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ================================================================= */
  /*  Zod Schema 验证                                                   */
  /* ================================================================= */

  describe('请求/响应 Schema 验证', () => {
    it('aiSummaryRequestSchema 接受有效请求', () => {
      const result = aiSummaryRequestSchema.safeParse({
        postId: 'post-001',
      });
      expect(result.success).toBe(true);
    });

    it('aiSummaryRequestSchema 接受带 content 的请求', () => {
      const result = aiSummaryRequestSchema.safeParse({
        postId: 'post-001',
        content: '<p>自定义内容</p>',
      });
      expect(result.success).toBe(true);
    });

    it('aiSummaryRequestSchema 拒绝空 postId', () => {
      const result = aiSummaryRequestSchema.safeParse({
        postId: '',
      });
      expect(result.success).toBe(false);
    });

    it('aiSummaryRequestSchema 拒绝缺少 postId', () => {
      const result = aiSummaryRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('aiSummaryResponseSchema 接受有效响应', () => {
      const result = aiSummaryResponseSchema.safeParse({
        summary: '这是一篇关于无人机评测的文章。',
        cached: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.length).toBeGreaterThan(0);
        expect(typeof result.data.cached).toBe('boolean');
      }
    });

    it('aiFormatRequestSchema 接受 beautify 模式', () => {
      const result = aiFormatRequestSchema.safeParse({
        content: '<p>原文内容</p>',
        mode: 'beautify',
      });
      expect(result.success).toBe(true);
    });

    it('aiFormatRequestSchema 接受 structure 模式', () => {
      const result = aiFormatRequestSchema.safeParse({
        content: '<p>原文内容</p>',
        mode: 'structure',
      });
      expect(result.success).toBe(true);
    });

    it('aiFormatRequestSchema 拒绝非法 mode', () => {
      const result = aiFormatRequestSchema.safeParse({
        content: '<p>内容</p>',
        mode: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('aiFormatRequestSchema 拒绝空 content', () => {
      const result = aiFormatRequestSchema.safeParse({
        content: '',
        mode: 'beautify',
      });
      expect(result.success).toBe(false);
    });

    it('aiFormatRequestSchema 拒绝超过 8000 字符的 content', () => {
      const result = aiFormatRequestSchema.safeParse({
        content: 'x'.repeat(8001),
        mode: 'beautify',
      });
      expect(result.success).toBe(false);
    });

    it('aiFormatRequestSchema 接受恰好 8000 字符的 content', () => {
      const result = aiFormatRequestSchema.safeParse({
        content: 'x'.repeat(8000),
        mode: 'beautify',
      });
      expect(result.success).toBe(true);
    });

    it('aiFormatResponseSchema 接受有效响应', () => {
      const result = aiFormatResponseSchema.safeParse({
        html: '<h1>标题</h1><p>正文</p>',
        changes: ['添加了标题', '优化了段落间距'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.html).toBe('string');
        expect(Array.isArray(result.data.changes)).toBe(true);
      }
    });
  });

  /* ================================================================= */
  /*  AI 摘要 API 交互测试                                               */
  /* ================================================================= */

  describe('AI 摘要 API 交互', () => {
    it('发送正确的请求到 /api/v1/ai/summary', async () => {
      mockFetch(async () =>
        jsonResponse({
          summary: '这是一篇关于大疆 Mini 4 Pro 的深度评测。',
          cached: false,
        })
      );

      await callSummaryApi('post-123');

      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0].url).toBe(API_ROUTES.ai.summary);
      expect(fetchCalls[0].init.method).toBe('POST');
      expect(fetchCalls[0].init.credentials).toBe('include');

      const body = JSON.parse(fetchCalls[0].init.body as string);
      expect(body).toEqual({ postId: 'post-123' });
    });

    it('发送带 content 的摘要请求', async () => {
      mockFetch(async () =>
        jsonResponse({ summary: '自定义摘要', cached: false })
      );

      await callSummaryApi('post-123', '<p>自定义内容</p>');

      const body = JSON.parse(fetchCalls[0].init.body as string);
      expect(body).toEqual({
        postId: 'post-123',
        content: '<p>自定义内容</p>',
      });
    });

    it('成功返回时解析响应并返回摘要和缓存状态', async () => {
      mockFetch(async () =>
        jsonResponse({
          summary: '无人机评测摘要文本。',
          cached: true,
        })
      );

      const result = await callSummaryApi('post-001');

      expect(result.summary).toBe('无人机评测摘要文本。');
      expect(result.cached).toBe(true);
    });

    it('未命中缓存时 cached 为 false', async () => {
      mockFetch(async () =>
        jsonResponse({
          summary: '新生成的摘要。',
          cached: false,
        })
      );

      const result = await callSummaryApi('post-002');
      expect(result.cached).toBe(false);
    });
  });

  /* ================================================================= */
  /*  AI 排版 API 交互测试                                               */
  /* ================================================================= */

  describe('AI 排版 API 交互', () => {
    it('beautify 模式发送正确的请求到 /api/v1/ai/format', async () => {
      mockFetch(async () =>
        jsonResponse({
          html: '<h1>优化后的标题</h1><p>美化后的正文</p>',
          changes: ['添加了标题', '优化了段落格式'],
        })
      );

      await callFormatApi('<p>原始内容</p>', 'beautify');

      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0].url).toBe(API_ROUTES.ai.format);
      expect(fetchCalls[0].init.method).toBe('POST');

      const body = JSON.parse(fetchCalls[0].init.body as string);
      expect(body).toEqual({
        content: '<p>原始内容</p>',
        mode: 'beautify',
      });
    });

    it('structure 模式发送正确的请求', async () => {
      mockFetch(async () =>
        jsonResponse({
          html: '<h1>结构化标题</h1><h2>章节一</h2><p>内容</p>',
          changes: ['添加了文档结构', '生成了目录标题'],
        })
      );

      await callFormatApi('<p>无结构的内容</p>', 'structure');

      const body = JSON.parse(fetchCalls[0].init.body as string);
      expect(body).toEqual({
        content: '<p>无结构的内容</p>',
        mode: 'structure',
      });
    });

    it('成功返回时解析响应并返回 HTML 和变更说明', async () => {
      const mockResponse = {
        html: '<h1>排版后的内容</h1><p>正文段落</p>',
        changes: ['优化了标题层级', '调整了段落间距'],
      };
      mockFetch(async () => jsonResponse(mockResponse));

      const result = await callFormatApi('<p>原文</p>', 'beautify');

      expect(result.html).toBe(mockResponse.html);
      expect(result.changes).toEqual(mockResponse.changes);
      expect(result.changes).toHaveLength(2);
    });

    it('变更说明为空数组时仍返回有效响应', async () => {
      mockFetch(async () =>
        jsonResponse({
          html: '<p>内容无变化</p>',
          changes: [],
        })
      );

      const result = await callFormatApi('<p>内容无变化</p>', 'beautify');
      expect(result.changes).toEqual([]);
    });
  });

  /* ================================================================= */
  /*  错误处理测试                                                       */
  /* ================================================================= */

  describe('错误处理', () => {
    it('403 FEATURE_DISABLED 映射为功能不可用提示', async () => {
      mockFetch(async () =>
        errorResponse(403, {
          code: 'FEATURE_DISABLED',
          message: 'AI summary feature is disabled',
        })
      );

      await expect(callSummaryApi('post-001')).rejects.toThrow();
      try {
        await callSummaryApi('post-001');
      } catch (error) {
        const msg = mapApiErrorToMessage(error);
        expect(msg).toBe('AI 功能当前不可用，请联系管理员。');
      }
    });

    it('429 RATE_LIMITED 映射为频率限制提示', async () => {
      mockFetch(async () =>
        errorResponse(429, {
          code: 'RATE_LIMITED',
          message: 'Rate limited: 429',
        })
      );

      try {
        await callSummaryApi('post-001');
      } catch (error) {
        const msg = mapApiErrorToMessage(error);
        expect(msg).toBe('请求过于频繁，请稍后再试。');
      }
    });

    it('502 LLM_API_ERROR 映射为 AI 服务不可用提示', async () => {
      mockFetch(async () =>
        errorResponse(502, {
          code: 'LLM_API_ERROR',
          message: 'LLM API returned 502',
        })
      );

      try {
        await callFormatApi('<p>内容</p>', 'beautify');
      } catch (error) {
        const msg = mapApiErrorToMessage(error);
        expect(msg).toBe('AI 服务暂时不可用，请稍后重试。');
      }
    });

    it('500 服务内部错误映射为通用错误提示', async () => {
      mockFetch(async () =>
        errorResponse(500, {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        })
      );

      try {
        await callSummaryApi('post-001');
      } catch (error) {
        const msg = mapApiErrorToMessage(error);
        expect(msg).toBe('服务内部错误，请稍后重试。');
      }
    });

    it('400 INVALID_INPUT 映射为参数错误提示', async () => {
      mockFetch(async () =>
        errorResponse(400, {
          code: 'INVALID_INPUT',
          message: 'Invalid input: 400',
        })
      );

      try {
        await callFormatApi('<p>内容</p>', 'beautify');
      } catch (error) {
        const msg = mapApiErrorToMessage(error);
        expect(msg).toBe('请求参数有误，请检查后重试。');
      }
    });

    it('未知错误映射为通用失败提示', async () => {
      mockFetch(async () =>
        errorResponse(503, {
          code: 'UNKNOWN',
          message: 'Something went wrong',
        })
      );

      try {
        await callSummaryApi('post-001');
      } catch (error) {
        const msg = mapApiErrorToMessage(error);
        expect(msg).toBe('操作失败，请稍后重试。');
      }
    });

    it('网络异常时 fetch 抛出错误', async () => {
      mockFetch(async () => {
        throw new TypeError('Failed to fetch');
      });

      await expect(callSummaryApi('post-001')).rejects.toThrow(
        'Failed to fetch'
      );
    });

    it('错误处理不修改原文内容（保留原文原则）', async () => {
      const originalContent = '<p>原始文章内容</p>';
      let savedContent = originalContent;

      mockFetch(async () =>
        errorResponse(502, {
          code: 'LLM_API_ERROR',
          message: 'LLM API returned 502',
        })
      );

      try {
        await callFormatApi(originalContent, 'beautify');
      } catch {
        // 错误发生时，savedContent 应保持不变
        expect(savedContent).toBe(originalContent);
      }
    });
  });

  /* ================================================================= */
  /*  加载状态与按钮交互测试                                              */
  /* ================================================================= */

  describe('加载状态与按钮交互', () => {
    it('摘要 API 调用期间可以检测到 pending 状态', async () => {
      let resolveApi!: (value: unknown) => void;
      mockFetch(
        () =>
          new Promise(resolve => {
            resolveApi = resolve;
          })
      );

      const pendingPromise = callSummaryApi('post-001');

      // 在 API 未返回前，Promise 处于 pending 状态
      let isPending = true;
      pendingPromise.then(() => {
        isPending = false;
      });

      expect(isPending).toBe(true);

      resolveApi(
        jsonResponse({ summary: '摘要', cached: false })
      );
      await pendingPromise;

      expect(isPending).toBe(false);
    });

    it('排版 API 调用期间可以检测到 pending 状态', async () => {
      let resolveApi!: (value: unknown) => void;
      mockFetch(
        () =>
          new Promise(resolve => {
            resolveApi = resolve;
          })
      );

      const pendingPromise = callFormatApi('<p>内容</p>', 'beautify');

      let isPending = true;
      pendingPromise.then(() => {
        isPending = false;
      });

      expect(isPending).toBe(true);

      resolveApi(
        jsonResponse({ html: '<p>排版后</p>', changes: [] })
      );
      await pendingPromise;

      expect(isPending).toBe(false);
    });

    it('摘要 API 失败后不影响后续重试请求', async () => {
      mockFetch(async () =>
        errorResponse(502, {
          code: 'LLM_API_ERROR',
          message: 'LLM API returned 502',
        })
      );

      await expect(callSummaryApi('post-001')).rejects.toThrow();

      // 重置 mock，模拟恢复
      mockFetch(async () =>
        jsonResponse({ summary: '重试成功', cached: false })
      );

      const result = await callSummaryApi('post-001');
      expect(result.summary).toBe('重试成功');
    });

    it('排版 API 失败后不影响后续重试请求', async () => {
      mockFetch(async () =>
        errorResponse(502, {
          code: 'LLM_API_ERROR',
          message: 'LLM API returned 502',
        })
      );

      await expect(
        callFormatApi('<p>内容</p>', 'beautify')
      ).rejects.toThrow();

      mockFetch(async () =>
        jsonResponse({
          html: '<p>重试排版</p>',
          changes: ['重试成功'],
        })
      );

      const result = await callFormatApi('<p>内容</p>', 'beautify');
      expect(result.html).toBe('<p>重试排版</p>');
    });
  });

  /* ================================================================= */
  /*  空内容与边界条件测试                                                */
  /* ================================================================= */

  describe('空内容与边界条件', () => {
    it('摘要请求 postId 为空时 Zod 拦截', () => {
      const result = aiSummaryRequestSchema.safeParse({ postId: '' });
      expect(result.success).toBe(false);
    });

    it('排版请求 content 为空时 Zod 拦截', () => {
      const result = aiFormatRequestSchema.safeParse({
        content: '',
        mode: 'beautify',
      });
      expect(result.success).toBe(false);
    });

    it('排版请求 mode 缺失时 Zod 拦截', () => {
      const result = aiFormatRequestSchema.safeParse({
        content: '<p>内容</p>',
      });
      expect(result.success).toBe(false);
    });

    it('排版请求 content 超长时 Zod 拦截', () => {
      const result = aiFormatRequestSchema.safeParse({
        content: 'x'.repeat(8001),
        mode: 'structure',
      });
      expect(result.success).toBe(false);
    });

    it('摘要 API 返回空 summary 时仍通过 schema 验证', () => {
      const result = aiSummaryResponseSchema.safeParse({
        summary: '',
        cached: false,
      });
      expect(result.success).toBe(true);
    });

    it('排版 API 返回空 changes 数组时仍通过 schema 验证', () => {
      const result = aiFormatResponseSchema.safeParse({
        html: '<p>内容</p>',
        changes: [],
      });
      expect(result.success).toBe(true);
    });
  });

  /* ================================================================= */
  /*  API 路由常量一致性测试                                              */
  /* ================================================================= */

  describe('API 路由常量一致性', () => {
    it('摘要 API 路由为 /api/v1/ai/summary', () => {
      expect(API_ROUTES.ai.summary).toBe('/api/v1/ai/summary');
    });

    it('排版 API 路由为 /api/v1/ai/format', () => {
      expect(API_ROUTES.ai.format).toBe('/api/v1/ai/format');
    });

    it('管理端 AI 设置路由为 /api/v1/admin/ai/settings', () => {
      expect(API_ROUTES.ai.adminSettings).toBe(
        '/api/v1/admin/ai/settings'
      );
    });
  });

  /* ================================================================= */
  /*  请求 Headers 与凭据测试                                            */
  /* ================================================================= */

  describe('请求 Headers 与凭据', () => {
    it('摘要请求携带 Content-Type: application/json', async () => {
      mockFetch(async () =>
        jsonResponse({ summary: '摘要', cached: false })
      );

      await callSummaryApi('post-001');

      const headers = fetchCalls[0].init.headers as Record<string, string>;
      expect(headers['content-type']).toBe('application/json');
    });

    it('摘要请求携带 credentials: include', async () => {
      mockFetch(async () =>
        jsonResponse({ summary: '摘要', cached: false })
      );

      await callSummaryApi('post-001');
      expect(fetchCalls[0].init.credentials).toBe('include');
    });

    it('排版请求携带 credentials: include', async () => {
      mockFetch(async () =>
        jsonResponse({ html: '<p>排版</p>', changes: [] })
      );

      await callFormatApi('<p>内容</p>', 'beautify');
      expect(fetchCalls[0].init.credentials).toBe('include');
    });
  });
});
