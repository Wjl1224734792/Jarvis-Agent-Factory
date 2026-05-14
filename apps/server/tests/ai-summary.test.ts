import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock 层：Redis / DB / Logger / CacheService / aiSettingsService / fetch
// ---------------------------------------------------------------------------

const getMock = vi.fn();
const setMock = vi.fn();

vi.mock("redis", () => ({
  createClient: () => ({
    get: getMock,
    set: setMock,
    connect: vi.fn(async () => undefined),
    isOpen: true
  })
}));

vi.mock("../src/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() }
}));

vi.mock("../src/lib/cache-service", () => {
  return {
    CacheService: class {
      async getOrSet<T>(
        _key: string,
        _ttl: number,
        fetchFn: () => Promise<T>
      ): Promise<T> {
        return cacheHandler(fetchFn) as Promise<T>;
      }
    }
  };
});

let cacheHandler: (fetchFn: () => Promise<unknown>) => Promise<unknown> = async fn =>
  fn();

const dbSelectMock = vi.fn();
const dbUpdateMock = vi.fn();

vi.mock("@feijia/db", () => ({
  db: {
    select: dbSelectMock,
    update: dbUpdateMock
  },
  postsTable: {
    aiSummary: "ai_summary",
    aiSummaryGeneratedAt: "ai_summary_generated_at"
  }
}));

const getRawSettingsMock = vi.fn();

vi.mock("../src/modules/ai/ai-settings.service", () => ({
  aiSettingsService: {
    getRawSettings: getRawSettingsMock
  }
}));

vi.mock("../src/modules/ai/ai-rate-limit.repo", () => ({
  aiRateLimitRepo: {
    acquireSlot: vi.fn(async () => "mock-request-id"),
    releaseSlot: vi.fn(async () => undefined)
  }
}));

const fetchMock = Object.assign(vi.fn(), { preconnect: vi.fn() });

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

function createDbMock(rows: Array<{ aiSummary: string | null; aiSummaryGeneratedAt: Date | null }>) {
  const mock: Record<string, unknown> = {};

  const fromFn = vi.fn();
  const whereFn = vi.fn();
  const limitFn = vi.fn().mockResolvedValue(rows);
  const setFn = vi.fn();

  const builder = {
    from: fromFn,
    where: whereFn,
    limit: limitFn,
    set: setFn
  };

  fromFn.mockReturnValue(builder);
  whereFn.mockReturnValue(builder);
  setFn.mockReturnValue(builder);

  mock.select = vi.fn().mockReturnValue(builder);
  mock.update = vi.fn().mockReturnValue(builder);

  return mock as { select: typeof dbSelectMock; update: typeof dbUpdateMock };
}

// ---------------------------------------------------------------------------
// 生命周期
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = fetchMock;
});

// ---------------------------------------------------------------------------
// 测试：6 种路径
// ---------------------------------------------------------------------------

describe("generateSummary", () => {
  it("缓存命中 — Redis 有值时直接返回，不调用 DB 和 LLM", async () => {
    cacheHandler = async () => ({ summary: "缓存中的摘要", cached: true });

    getRawSettingsMock.mockResolvedValue({
      apiKey: "test-key",
      baseUrl: "https://api.test.com/v1",
      summaryModel: "qwen-plus",
      features: { summary: true, format: true }
    });

    const { generateSummary } = await import("../src/modules/ai/ai.service");
    const result = await generateSummary("test-user", "post-1");

    expect(result).toStrictEqual({ summary: "缓存中的摘要", cached: true });
    expect(dbSelectMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("DB 有值 — Redis 无值但 DB 有 aiSummary 时，返回 DB 值（cached: true）", async () => {
    cacheHandler = async fn => fn();

    getRawSettingsMock.mockResolvedValue({
      apiKey: "test-key",
      baseUrl: "https://api.test.com/v1",
      summaryModel: "qwen-plus",
      features: { summary: true, format: true }
    });

    const mockDb = createDbMock([
      { aiSummary: "数据库中的摘要", aiSummaryGeneratedAt: new Date(Date.now() - 48 * 3600 * 1000) }
    ]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    const { generateSummary } = await import("../src/modules/ai/ai.service");
    const result = await generateSummary("test-user", "post-2");

    expect(result).toStrictEqual({ summary: "数据库中的摘要", cached: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("LLM 生成 — Redis 和 DB 都无值时，调用 LLM API 并写入 DB", async () => {
    cacheHandler = async fn => fn();

    getRawSettingsMock.mockResolvedValue({
      apiKey: "test-key",
      baseUrl: "https://api.test.com/v1",
      summaryModel: "qwen-plus",
      features: { summary: true, format: true }
    });

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "LLM 生成的摘要内容" } }]
      })
    });
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");
    const result = await generateSummary("test-user", "post-3", "这是一篇测试文章的内容");

    expect(result).toStrictEqual({ summary: "LLM 生成的摘要内容", cached: false });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(dbUpdateMock).toHaveBeenCalled();
  });

  it("功能开关关闭 — features.summary 为 false 时抛出 403 错误", async () => {
    getRawSettingsMock.mockResolvedValue({
      apiKey: "test-key",
      baseUrl: "https://api.test.com/v1",
      summaryModel: "qwen-plus",
      features: { summary: false, format: true }
    });

    const { generateSummary } = await import("../src/modules/ai/ai.service");

    try {
      await generateSummary("test-user", "post-4");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("403");
      expect((error as Error).message).toContain("AI 摘要功能已关闭");
    }

    expect(fetchMock).not.toHaveBeenCalled();
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("频率限制 — aiSummaryGeneratedAt 在 24h 内时抛出 429 错误", async () => {
    cacheHandler = async fn => fn();

    getRawSettingsMock.mockResolvedValue({
      apiKey: "test-key",
      baseUrl: "https://api.test.com/v1",
      summaryModel: "qwen-plus",
      features: { summary: true, format: true }
    });

    const recentTime = new Date(Date.now() - 12 * 3600 * 1000);
    const mockDb = createDbMock([
      { aiSummary: "已存在的摘要", aiSummaryGeneratedAt: recentTime }
    ]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    const { generateSummary } = await import("../src/modules/ai/ai.service");

    try {
      await generateSummary("test-user", "post-5");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("429");
      expect((error as Error).message).toContain("24 小时");
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("API 失败 — LLM API 返回非 200 时抛出 502 错误", async () => {
    cacheHandler = async fn => fn();

    getRawSettingsMock.mockResolvedValue({
      apiKey: "test-key",
      baseUrl: "https://api.test.com/v1",
      summaryModel: "qwen-plus",
      features: { summary: true, format: true }
    });

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error"
    });
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");

    try {
      await generateSummary("test-user", "post-6", "测试内容");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("LLM_API_ERROR");
      expect((error as Error).message).toContain("502");
    }

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 边界条件测试（TEST-006）
// ---------------------------------------------------------------------------

describe("generateSummary -- 边界条件", () => {
  const defaultSettings = {
    apiKey: "test-key",
    baseUrl: "https://api.test.com/v1",
    summaryModel: "qwen-plus",
    features: { summary: true, format: true }
  };

  it("空文章内容 — content 为空字符串时，LLM 收到空内容仍正常调用", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "该文章内容为空，无法生成有效摘要" } }]
      })
    });
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");
    const result = await generateSummary("test-user", "post-empty", "");

    expect(result.cached).toBe(false);
    expect(result.summary).toBe("该文章内容为空，无法生成有效摘要");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("content 为 undefined 时，LLM 收到空字符串内容", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "摘要内容" } }]
      })
    });
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");
    // 不传 content 参数
    const result = await generateSummary("test-user", "post-undef");

    expect(result.cached).toBe(false);
    // 验证 fetch 被调用，即 content undefined 时不会崩溃
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("超长文章裁剪 — content 超过 4000 字符时被截断到 4000", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    let capturedBody: string = "";
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "摘要" } }]
        })
      };
    });
    globalThis.fetch = fetchMock;

    const longContent = "A".repeat(5000);
    const { generateSummary } = await import("../src/modules/ai/ai.service");
    await generateSummary("test-user", "post-long", longContent);

    // 从请求体中提取实际发送给 LLM 的内容
    const bodyObj = JSON.parse(capturedBody) as {
      messages: Array<{ content: string }>;
    };
    const prompt = bodyObj.messages[0].content;
    // 提取 prompt 中 "文章内容：" 之后的部分
    const contentInPrompt = prompt.split("文章内容：")[1] ?? "";

    // 裁剪后内容不超过 4000
    expect(contentInPrompt.length).toBeLessThanOrEqual(4000);
    // 且确实是从原内容头部截取的
    expect(contentInPrompt).toBe("A".repeat(4000));
  });

  it("特殊字符/emoji/HTML 标签内容 — 包含特殊字符的内容正常传递给 LLM", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    let capturedBody: string = "";
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "特殊内容摘要" } }]
        })
      };
    });
    globalThis.fetch = fetchMock;

    const specialContent =
      '<p>HTML 标签内容</p><script>alert("xss")</script>Emoji: 🎉🔥💻 特殊字符: @#$%^&*()';

    const { generateSummary } = await import("../src/modules/ai/ai.service");
    const result = await generateSummary("test-user", "post-special", specialContent);

    expect(result.cached).toBe(false);
    expect(result.summary).toBe("特殊内容摘要");

    // 验证特殊字符内容被正确传递
    const bodyObj = JSON.parse(capturedBody) as {
      messages: Array<{ content: string }>;
    };
    expect(bodyObj.messages[0].content).toContain("🎉");
    expect(bodyObj.messages[0].content).toContain("<p>");
  });

  it("中英文混合内容 — 混合语言内容正常处理", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Mixed content summary" } }]
      })
    });
    globalThis.fetch = fetchMock;

    const mixedContent = "这是一篇关于 TypeScript 的文章。TypeScript is a typed superset of JavaScript.";

    const { generateSummary } = await import("../src/modules/ai/ai.service");
    const result = await generateSummary("test-user", "post-mixed", mixedContent);

    expect(result.summary).toBe("Mixed content summary");
    expect(result.cached).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 缓存失效路径测试
// ---------------------------------------------------------------------------

describe("generateSummary -- 缓存失效路径", () => {
  const defaultSettings = {
    apiKey: "test-key",
    baseUrl: "https://api.test.com/v1",
    summaryModel: "qwen-plus",
    features: { summary: true, format: true }
  };

  it("缓存失效后重新生成 — cacheHandler 绕过缓存时走 DB + LLM 路径", async () => {
    // 模拟缓存失效：cacheHandler 直接调用 fetchFn
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "重新生成的摘要" } }]
      })
    });
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");
    const result = await generateSummary("test-user", "post-retry", "文章内容");

    expect(result.cached).toBe(false);
    expect(result.summary).toBe("重新生成的摘要");
    expect(dbSelectMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(dbUpdateMock).toHaveBeenCalled();
  });

  it("DB 有值但已超过 24h 限流窗口 — 返回已有摘要（cached: true），不触发重新生成", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    // 生成时间在 25 小时前，超过 24h 限流窗口
    const oldTime = new Date(Date.now() - 25 * 3600 * 1000);
    const mockDb = createDbMock([
      { aiSummary: "旧摘要", aiSummaryGeneratedAt: oldTime }
    ]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "刷新后的摘要" } }]
      })
    });
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");
    const result = await generateSummary("test-user", "post-expired", "新内容");

    // 超过 24h 但已有摘要，直接返回（实现行为：有摘要即返回，不区分时间）
    expect(result.cached).toBe(true);
    expect(result.summary).toBe("旧摘要");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("DB 文章不存在但有 content 时直接调用 LLM 生成（不抛错误）", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    const { generateSummary } = await import("../src/modules/ai/ai.service");
    const result = await generateSummary("test-user", "post-nonexistent", "测试内容");

    expect(result.cached).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("DB 文章不存在且无 content 时抛出错误", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    const { generateSummary } = await import("../src/modules/ai/ai.service");

    try {
      await generateSummary("test-user", "post-nonexistent");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("文章不存在");
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// LLM 异常响应测试
// ---------------------------------------------------------------------------

describe("generateSummary -- LLM 异常响应", () => {
  const defaultSettings = {
    apiKey: "test-key",
    baseUrl: "https://api.test.com/v1",
    summaryModel: "qwen-plus",
    features: { summary: true, format: true }
  };

  it("LLM 返回空 choices 数组 — 抛出空摘要错误", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] })
    });
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");

    try {
      await generateSummary("test-user", "post-empty-choices", "内容");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("LLM_API_ERROR");
      expect((error as Error).message).toContain("LLM 返回空摘要");
    }

    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("LLM 返回 content 为空字符串 — 抛出空摘要错误", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "   " } }]
      })
    });
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");

    try {
      await generateSummary("test-user", "post-empty-content", "内容");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("LLM_API_ERROR");
      expect((error as Error).message).toContain("LLM 返回空摘要");
    }
  });

  it("LLM 返回异常 JSON 结构（无 choices 字段）— 抛出空摘要错误", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ error: "something went wrong" })
    });
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");

    try {
      await generateSummary("test-user", "post-bad-json", "内容");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("LLM_API_ERROR");
      expect((error as Error).message).toContain("LLM 返回空摘要");
    }
  });

  it("LLM 返回 JSON 解析失败 — 抛出 502 错误", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("Unexpected token");
      }
    });
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");

    try {
      await generateSummary("test-user", "post-json-err", "内容");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("LLM_API_ERROR");
      expect((error as Error).message).toContain("502");
    }
  });

  it("网络超时 — fetch 抛出 AbortError 时包装为 502", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    fetchMock.mockRejectedValue(new Error("The operation was aborted"));
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");

    try {
      await generateSummary("test-user", "post-timeout", "内容");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("LLM_API_ERROR");
      expect((error as Error).message).toContain("502");
    }
  });
});

// ---------------------------------------------------------------------------
// Prompt 构造验证
// ---------------------------------------------------------------------------

describe("generateSummary -- Prompt 构造验证", () => {
  const defaultSettings = {
    apiKey: "test-key",
    baseUrl: "https://api.test.com/v1",
    summaryModel: "qwen-plus",
    features: { summary: true, format: true }
  };

  it("Prompt 包含指定模板结构 — 验证 prompt 格式正确", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    let capturedBody: string = "";
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "摘要" } }]
        })
      };
    });
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");
    await generateSummary("test-user", "post-prompt", "测试文章");

    const bodyObj = JSON.parse(capturedBody) as {
      messages: Array<{ role: string; content: string }>;
      model: string;
      max_tokens: number;
      temperature: number;
    };

    // 验证 LLM 请求结构
    expect(bodyObj.model).toBe("qwen-plus");
    expect(bodyObj.max_tokens).toBe(512);
    expect(bodyObj.temperature).toBe(0.3);
    expect(bodyObj.messages).toHaveLength(1);
    expect(bodyObj.messages[0].role).toBe("user");

    // 验证 prompt 模板内容
    const prompt = bodyObj.messages[0].content;
    expect(prompt).toContain("专业的文章摘要助手");
    expect(prompt).toContain("摘要字数 150-300 字");
    expect(prompt).toContain("文章内容：");
    expect(prompt).toContain("测试文章");
  });

  it("超长内容裁剪后嵌入 prompt — 验证裁剪点正确", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    let capturedBody: string = "";
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "摘要" } }]
        })
      };
    });
    globalThis.fetch = fetchMock;

    const content4001 = "B".repeat(4001);
    const { generateSummary } = await import("../src/modules/ai/ai.service");
    await generateSummary("test-user", "post-trim", content4001);

    const bodyObj = JSON.parse(capturedBody) as {
      messages: Array<{ content: string }>;
    };
    const prompt = bodyObj.messages[0].content;
    const contentPart = prompt.split("文章内容：")[1] ?? "";

    // 应被裁剪为 4000 字符
    expect(contentPart).toBe("B".repeat(4000));
    expect(contentPart.length).toBe(4000);
  });

  it("API baseUrl 尾部斜杠被清理 — 验证 URL 构造正确", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue({
      ...defaultSettings,
      baseUrl: "https://api.test.com/v1///"
    });

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "摘要" } }]
      })
    });
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");
    await generateSummary("test-user", "post-url", "内容");

    // 验证 URL 尾部斜杠被清理
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test.com/v1/chat/completions",
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// 并发请求测试
// ---------------------------------------------------------------------------

describe("generateSummary -- 并发请求", () => {
  const defaultSettings = {
    apiKey: "test-key",
    baseUrl: "https://api.test.com/v1",
    summaryModel: "qwen-plus",
    features: { summary: true, format: true }
  };

  it("相同文章并发请求 — 各请求均能正常返回结果", async () => {
    // 模拟无缓存场景：每次直接调用 fetchFn
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "并发摘要" } }]
      })
    });
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");

    // 并发 3 个相同请求
    const results = await Promise.all([
      generateSummary("test-user", "post-concurrent", "内容A"),
      generateSummary("test-user", "post-concurrent", "内容B"),
      generateSummary("test-user", "post-concurrent", "内容C")
    ]);

    // 每个请求都能拿到结果
    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(r.summary).toBe("并发摘要");
      expect(r.cached).toBe(false);
    }
  });

  it("不同文章并发请求 — 各自独立处理", async () => {
    cacheHandler = async fn => fn();
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const mockDb = createDbMock([{ aiSummary: null, aiSummaryGeneratedAt: null }]);
    dbSelectMock.mockImplementation(mockDb.select);
    dbUpdateMock.mockImplementation(mockDb.update);

    let callCount = 0;
    fetchMock.mockImplementation(async () => {
      callCount += 1;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: `摘要${callCount}` } }]
        })
      };
    });
    globalThis.fetch = fetchMock;

    const { generateSummary } = await import("../src/modules/ai/ai.service");

    const results = await Promise.all([
      generateSummary("test-user", "post-1", "文章1"),
      generateSummary("test-user", "post-2", "文章2"),
      generateSummary("test-user", "post-3", "文章3")
    ]);

    expect(results).toHaveLength(3);
    // 每篇文章都独立调用了 LLM
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
