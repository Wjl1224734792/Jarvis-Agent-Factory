/**
 * AI 基础设施验证测试
 *
 * 验证 TASK-001（DB Schema + 路由常量 + Zod Schema）和
 * TASK-002（OpenAPI 文档）的变更正确且不破坏现有功能。
 *
 * @see requirement_ids: REQ-003, REQ-004, REQ-005, REQ-007
 * @see task_id: TEST-001
 */
import { describe, expect, it } from 'vitest';
import { withApiV1Prefix } from '@feijia/shared';
import { API_ROUTES, APP_ROUTES } from '@feijia/shared';
import {
  aiSummaryRequestSchema,
  aiSummaryResponseSchema,
  aiFormatRequestSchema,
  aiFormatResponseSchema,
  aiSettingsSchema,
  aiSettingsResponseSchema,
} from '@feijia/schemas';
import { postsTable } from '@feijia/db';
import { app } from '../src/app';
import { OPENAPI_DOCUMENT_PATH } from '../src/openapi/document';

// ---------------------------------------------------------------------------
// 1. 路由常量验证
// ---------------------------------------------------------------------------

describe('AI 路由常量', () => {
  it('API_ROUTES.ai.summary 解析为正确的 API v1 路径', () => {
    expect(API_ROUTES.ai.summary).toBe('/api/v1/ai/summary');
    expect(API_ROUTES.ai.summary).toBe(withApiV1Prefix('/ai/summary'));
  });

  it('API_ROUTES.ai.format 解析为正确的 API v1 路径', () => {
    expect(API_ROUTES.ai.format).toBe('/api/v1/ai/format');
    expect(API_ROUTES.ai.format).toBe(withApiV1Prefix('/ai/format'));
  });

  it('API_ROUTES.ai.adminSettings 解析为正确的 API v1 路径', () => {
    expect(API_ROUTES.ai.adminSettings).toBe('/api/v1/admin/ai/settings');
    expect(API_ROUTES.ai.adminSettings).toBe(
      withApiV1Prefix('/admin/ai/settings')
    );
  });

  it('APP_ROUTES.adminAiSettings 值为 /admin/settings/ai', () => {
    expect(APP_ROUTES.adminAiSettings).toBe('/admin/settings/ai');
  });
});

// ---------------------------------------------------------------------------
// 2. DB Schema 新增字段验证
// ---------------------------------------------------------------------------

describe('postsTable AI 字段定义', () => {
  it('postsTable 包含 aiSummary 字段', () => {
    expect(postsTable.aiSummary).toBeDefined();
    expect(postsTable.aiSummary.name).toBe('ai_summary');
  });

  it('postsTable 包含 aiSummaryGeneratedAt 字段', () => {
    expect(postsTable.aiSummaryGeneratedAt).toBeDefined();
    expect(postsTable.aiSummaryGeneratedAt.name).toBe(
      'ai_summary_generated_at'
    );
  });

  it('postsTable 包含 aiFormattedAt 字段', () => {
    expect(postsTable.aiFormattedAt).toBeDefined();
    expect(postsTable.aiFormattedAt.name).toBe('ai_formatted_at');
  });

  it('AI 字段均为可空类型（无 notNull 约束）', () => {
    // aiSummary 是 text 类型，默认为 null（不设置 notNull）
    // 验证 Drizzle 列定义中没有 required 标记
    const aiSummaryCol = postsTable.aiSummary;
    const aiSummaryGeneratedAtCol = postsTable.aiSummaryGeneratedAt;
    const aiFormattedAtCol = postsTable.aiFormattedAt;

    // Drizzle 列的 notNull 属性为 false 表示可空
    expect(aiSummaryCol.notNull).toBe(false);
    expect(aiSummaryGeneratedAtCol.notNull).toBe(false);
    expect(aiFormattedAtCol.notNull).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Zod Schema 验证 — aiSummaryRequestSchema
// ---------------------------------------------------------------------------

describe('aiSummaryRequestSchema', () => {
  it('合法输入：仅 postId', () => {
    const result = aiSummaryRequestSchema.safeParse({ postId: 'post-123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.postId).toBe('post-123');
      expect(result.data.content).toBeUndefined();
    }
  });

  it('合法输入：postId + content', () => {
    const result = aiSummaryRequestSchema.safeParse({
      postId: 'post-abc',
      content: '自定义内容',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('自定义内容');
    }
  });

  it('非法输入：缺少 postId', () => {
    const result = aiSummaryRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('非法输入：postId 为空字符串', () => {
    const result = aiSummaryRequestSchema.safeParse({ postId: '' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Zod Schema 验证 — aiSummaryResponseSchema
// ---------------------------------------------------------------------------

describe('aiSummaryResponseSchema', () => {
  it('合法响应体', () => {
    const result = aiSummaryResponseSchema.safeParse({
      summary: '这是一段 AI 生成的摘要。',
      cached: false,
    });
    expect(result.success).toBe(true);
  });

  it('合法响应体：cached 为 true', () => {
    const result = aiSummaryResponseSchema.safeParse({
      summary: '缓存的摘要内容',
      cached: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cached).toBe(true);
    }
  });

  it('非法输入：缺少 summary', () => {
    const result = aiSummaryResponseSchema.safeParse({ cached: false });
    expect(result.success).toBe(false);
  });

  it('非法输入：cached 不是布尔值', () => {
    const result = aiSummaryResponseSchema.safeParse({
      summary: 'test',
      cached: 'yes',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Zod Schema 验证 — aiFormatRequestSchema
// ---------------------------------------------------------------------------

describe('aiFormatRequestSchema', () => {
  it('合法输入：beautify 模式', () => {
    const result = aiFormatRequestSchema.safeParse({
      content: '<p>测试内容</p>',
      mode: 'beautify',
    });
    expect(result.success).toBe(true);
  });

  it('合法输入：structure 模式', () => {
    const result = aiFormatRequestSchema.safeParse({
      content: '<p>测试内容</p>',
      mode: 'structure',
    });
    expect(result.success).toBe(true);
  });

  it('非法输入：mode 值不在枚举范围内', () => {
    const result = aiFormatRequestSchema.safeParse({
      content: '<p>test</p>',
      mode: 'invalid-mode',
    });
    expect(result.success).toBe(false);
  });

  it('非法输入：content 为空字符串', () => {
    const result = aiFormatRequestSchema.safeParse({
      content: '',
      mode: 'beautify',
    });
    expect(result.success).toBe(false);
  });

  it('非法输入：content 超过 8000 字符限制', () => {
    const longContent = 'a'.repeat(8001);
    const result = aiFormatRequestSchema.safeParse({
      content: longContent,
      mode: 'beautify',
    });
    expect(result.success).toBe(false);
  });

  it('合法边界：content 恰好 8000 字符', () => {
    const maxContent = 'a'.repeat(8000);
    const result = aiFormatRequestSchema.safeParse({
      content: maxContent,
      mode: 'structure',
    });
    expect(result.success).toBe(true);
  });

  it('非法输入：缺少 content', () => {
    const result = aiFormatRequestSchema.safeParse({ mode: 'beautify' });
    expect(result.success).toBe(false);
  });

  it('非法输入：缺少 mode', () => {
    const result = aiFormatRequestSchema.safeParse({ content: '<p>t</p>' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Zod Schema 验证 — aiFormatResponseSchema
// ---------------------------------------------------------------------------

describe('aiFormatResponseSchema', () => {
  it('合法响应体', () => {
    const result = aiFormatResponseSchema.safeParse({
      html: '<p>格式化后的 HTML</p>',
      changes: ['调整了段落间距', '优化了标题层级'],
    });
    expect(result.success).toBe(true);
  });

  it('合法响应体：空变更列表', () => {
    const result = aiFormatResponseSchema.safeParse({
      html: '<p>内容</p>',
      changes: [],
    });
    expect(result.success).toBe(true);
  });

  it('非法输入：changes 不是数组', () => {
    const result = aiFormatResponseSchema.safeParse({
      html: '<p>test</p>',
      changes: 'not-array',
    });
    expect(result.success).toBe(false);
  });

  it('非法输入：changes 数组元素非字符串', () => {
    const result = aiFormatResponseSchema.safeParse({
      html: '<p>test</p>',
      changes: [123, true],
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. Zod Schema 验证 — aiSettingsSchema
// ---------------------------------------------------------------------------

describe('aiSettingsSchema', () => {
  const validSettings = {
    provider: 'openai',
    apiKey: 'sk-test-key',
    baseUrl: 'https://api.openai.com/v1',
    summaryModel: 'gpt-4o-mini',
    formatModel: 'gpt-4o',
    features: { summary: true, format: false },
  };

  it('合法配置', () => {
    const result = aiSettingsSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
  });

  it('非法输入：baseUrl 非合法 URL', () => {
    const result = aiSettingsSchema.safeParse({
      ...validSettings,
      baseUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('非法输入：provider 为空', () => {
    const result = aiSettingsSchema.safeParse({
      ...validSettings,
      provider: '',
    });
    expect(result.success).toBe(false);
  });

  it('非法输入：apiKey 为空', () => {
    const result = aiSettingsSchema.safeParse({
      ...validSettings,
      apiKey: '',
    });
    expect(result.success).toBe(false);
  });

  it('非法输入：缺少 features', () => {
    const { features: _, ...withoutFeatures } = validSettings;
    const result = aiSettingsSchema.safeParse(withoutFeatures);
    expect(result.success).toBe(false);
  });

  it('非法输入：features.summary 非布尔值', () => {
    const result = aiSettingsSchema.safeParse({
      ...validSettings,
      features: { summary: 'yes', format: true },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. Zod Schema 验证 — aiSettingsResponseSchema
// ---------------------------------------------------------------------------

describe('aiSettingsResponseSchema', () => {
  it('合法响应体（apiKey 已脱敏）', () => {
    const result = aiSettingsResponseSchema.safeParse({
      provider: 'openai',
      apiKey: 'sk-****',
      baseUrl: 'https://api.openai.com/v1',
      summaryModel: 'gpt-4o-mini',
      formatModel: 'gpt-4o',
      features: { summary: true, format: false },
    });
    expect(result.success).toBe(true);
  });

  it('非法输入：features 缺少 format', () => {
    const result = aiSettingsResponseSchema.safeParse({
      provider: 'openai',
      apiKey: 'sk-****',
      baseUrl: 'https://api.openai.com/v1',
      summaryModel: 'gpt-4o-mini',
      formatModel: 'gpt-4o',
      features: { summary: true },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 9. OpenAPI 文档包含 AI 路径
// ---------------------------------------------------------------------------

describe('OpenAPI 文档 AI 路径', () => {
  it('文档包含 /api/v1/ai/summary、/api/v1/ai/format、/api/v1/admin/ai/settings', async () => {
    const response = await app.request(OPENAPI_DOCUMENT_PATH, {
      method: 'GET',
    });

    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      paths: Record<string, unknown>;
    };

    expect(payload.paths['/api/v1/ai/summary']).toBeDefined();
    expect(payload.paths['/api/v1/ai/format']).toBeDefined();
    expect(payload.paths['/api/v1/admin/ai/settings']).toBeDefined();
  });

  it('/api/v1/ai/summary 定义了 POST 方法', async () => {
    const response = await app.request(OPENAPI_DOCUMENT_PATH, {
      method: 'GET',
    });
    const payload = (await response.json()) as {
      paths: Record<string, { post?: unknown }>;
    };

    const summaryPath = payload.paths['/api/v1/ai/summary'] as {
      post?: { tags?: string[]; summary?: string };
    };

    expect(summaryPath?.post).toBeDefined();
    expect(summaryPath?.post?.tags).toContain('AI');
    expect(summaryPath?.post?.summary).toContain('摘要');
  });

  it('/api/v1/ai/format 定义了 POST 方法', async () => {
    const response = await app.request(OPENAPI_DOCUMENT_PATH, {
      method: 'GET',
    });
    const payload = (await response.json()) as {
      paths: Record<string, { post?: unknown }>;
    };

    const formatPath = payload.paths['/api/v1/ai/format'] as {
      post?: { tags?: string[]; summary?: string };
    };

    expect(formatPath?.post).toBeDefined();
    expect(formatPath?.post?.tags).toContain('AI');
    expect(formatPath?.post?.summary).toContain('排版');
  });

  it('/api/v1/admin/ai/settings 定义了 GET 和 PUT 方法', async () => {
    const response = await app.request(OPENAPI_DOCUMENT_PATH, {
      method: 'GET',
    });
    const payload = (await response.json()) as {
      paths: Record<string, { get?: unknown; put?: unknown }>;
    };

    const settingsPath = payload.paths['/api/v1/admin/ai/settings'] as {
      get?: { tags?: string[]; summary?: string };
      put?: { tags?: string[]; summary?: string };
    };

    expect(settingsPath?.get).toBeDefined();
    expect(settingsPath?.get?.tags).toContain('AI');
    expect(settingsPath?.get?.summary).toContain('AI 配置');

    expect(settingsPath?.put).toBeDefined();
    expect(settingsPath?.put?.tags).toContain('AI');
    expect(settingsPath?.put?.summary).toContain('更新');
  });

  it('/api/v1/ai/summary 包含 403 和 502 错误响应', async () => {
    const response = await app.request(OPENAPI_DOCUMENT_PATH, {
      method: 'GET',
    });
    const payload = (await response.json()) as {
      paths: Record<string, unknown>;
    };

    const summaryPath = payload.paths['/api/v1/ai/summary'] as {
      post?: { responses?: Record<string, unknown> };
    };

    expect(summaryPath?.post?.responses?.['403']).toBeDefined();
    expect(summaryPath?.post?.responses?.['502']).toBeDefined();
  });

  it('/api/v1/ai/format 包含 403 和 502 错误响应', async () => {
    const response = await app.request(OPENAPI_DOCUMENT_PATH, {
      method: 'GET',
    });
    const payload = (await response.json()) as {
      paths: Record<string, unknown>;
    };

    const formatPath = payload.paths['/api/v1/ai/format'] as {
      post?: { responses?: Record<string, unknown> };
    };

    expect(formatPath?.post?.responses?.['403']).toBeDefined();
    expect(formatPath?.post?.responses?.['502']).toBeDefined();
  });

  it('/api/v1/admin/ai/settings 包含 403 错误响应', async () => {
    const response = await app.request(OPENAPI_DOCUMENT_PATH, {
      method: 'GET',
    });
    const payload = (await response.json()) as {
      paths: Record<string, unknown>;
    };

    const settingsPath = payload.paths['/api/v1/admin/ai/settings'] as {
      get?: { responses?: Record<string, unknown> };
      put?: { responses?: Record<string, unknown> };
    };

    expect(settingsPath?.get?.responses?.['403']).toBeDefined();
    expect(settingsPath?.put?.responses?.['403']).toBeDefined();
  });
});
