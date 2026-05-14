import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock 层：Redis / Logger / CacheService / aiSettingsService / fetch
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
        return fetchFn();
      }
    }
  };
});

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
// 生命周期
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = fetchMock;
});

// ---------------------------------------------------------------------------
// 辅助：构造合法 settings
// ---------------------------------------------------------------------------

function createSettings(
  overrides: Partial<{
    apiKey: string;
    baseUrl: string;
    summaryModel: string;
    formatModel: string;
    features: { summary: boolean; format: boolean };
  }> = {}
) {
  return {
    apiKey: "test-key",
    baseUrl: "https://api.test.com/v1",
    summaryModel: "qwen-plus",
    formatModel: "qwen-turbo",
    features: { summary: true, format: true },
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// 测试：6 种基础路径（原有测试）
// ---------------------------------------------------------------------------

describe("formatContent", () => {
  it("beautify 模式正常 — 返回优化后 HTML + changes 数组", async () => {
    getRawSettingsMock.mockResolvedValue(createSettings());

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                '{"html":"<p>优化后的内容</p>","changes":["修正了标点符号","统一了中英文空格"]}'
            }
          }
        ]
      })
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");
    const result = await formatContent("test-user", "<p>原始内容</p>", "beautify");

    expect(result.html).toBe("<p>优化后的内容</p>");
    expect(result.changes).toStrictEqual([
      "修正了标点符号",
      "统一了中英文空格"
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("structure 模式正常 — 返回结构化 HTML + changes 数组", async () => {
    getRawSettingsMock.mockResolvedValue(createSettings());

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                '{"html":"<h2>标题</h2><p>段落</p>","changes":["识别了标题层级","拆分了段落"]}'
            }
          }
        ]
      })
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");
    const result = await formatContent("test-user", "标题 段落内容", "structure");

    expect(result.html).toBe("<h2>标题</h2><p>段落</p>");
    expect(result.changes).toStrictEqual(["识别了标题层级", "拆分了段落"]);
  });

  it("输入超过 8000 字符 — 抛出 400 错误", async () => {
    getRawSettingsMock.mockResolvedValue(createSettings());

    const { formatContent } = await import("../src/modules/ai/ai.service");
    const longContent = "a".repeat(8001);

    try {
      await formatContent("test-user", longContent, "beautify");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("400");
      expect((error as Error).message).toContain("8000");
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("功能开关关闭 — features.format 为 false 时抛出 403 错误", async () => {
    getRawSettingsMock.mockResolvedValue(
      createSettings({ features: { summary: true, format: false } })
    );

    const { formatContent } = await import("../src/modules/ai/ai.service");

    try {
      await formatContent("test-user", "<p>内容</p>", "beautify");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("403");
      expect((error as Error).message).toContain("AI 排版功能已关闭");
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("AI API 失败 — 返回 502 错误", async () => {
    getRawSettingsMock.mockResolvedValue(createSettings());

    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error"
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");

    try {
      await formatContent("test-user", "<p>内容</p>", "beautify");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("LLM_API_ERROR");
      expect((error as Error).message).toContain("502");
    }

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("空内容 — 输入空字符串时的行为", async () => {
    getRawSettingsMock.mockResolvedValue(createSettings());

    const { formatContent } = await import("../src/modules/ai/ai.service");

    try {
      await formatContent("test-user", "", "beautify");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      // 空内容应该被 schema 校验拒绝（min(1)），但 service 层也应有防御
      expect((error as Error).message).toContain("400");
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 边界条件测试（TEST-007）
// ---------------------------------------------------------------------------

describe("formatContent -- 边界条件", () => {
  const defaultSettings = createSettings();

  it("空白内容 — 仅空格/换行/制表符时抛出 400 错误", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const { formatContent } = await import("../src/modules/ai/ai.service");
    const whitespaceInputs = ["   ", "\n\t\n", "  \n  \t  "];

    for (const input of whitespaceInputs) {
      try {
        await formatContent("test-user", input, "beautify");
        expect.fail(`输入 "${input}" 应抛出错误`);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("400");
        expect((error as Error).message).toContain("内容不能为空");
      }
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("空 HTML 标签输入 — 标签内容为空时仍调用 LLM", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                '{"html":"<p>默认段落</p>","changes":["添加了默认内容"]}'
            }
          }
        ]
      })
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");
    const result = await formatContent("test-user", "<p></p>", "beautify");

    expect(result.html).toBe("<p>默认段落</p>");
    expect(result.changes).toStrictEqual(["添加了默认内容"]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("纯文本输入 — 无 HTML 标签时正常处理", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                '{"html":"<p>这是一段纯文本内容</p>","changes":["添加了段落标签"]}'
            }
          }
        ]
      })
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");
    const result = await formatContent("test-user", "这是一段纯文本内容", "beautify");

    expect(result.html).toBe("<p>这是一段纯文本内容</p>");
    expect(result.changes).toStrictEqual(["添加了段落标签"]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("复杂嵌套 HTML — 多层 div/table 结构正常传递给 LLM", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    let capturedBody: string = "";
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  '{"html":"<div><table><tr><td>优化后</td></tr></table></div>","changes":["优化了表格结构"]}'
              }
            }
          ]
        })
      };
    });
    globalThis.fetch = fetchMock;

    const complexHtml =
      "<div><div><div><table><tr><td>嵌套内容</td></tr></table></div></div></div>";

    const { formatContent } = await import("../src/modules/ai/ai.service");
    const result = await formatContent("test-user", complexHtml, "beautify");

    expect(result.html).toContain("<table>");
    expect(result.changes).toStrictEqual(["优化了表格结构"]);

    // 验证复杂 HTML 被完整传递
    const bodyObj = JSON.parse(capturedBody) as {
      messages: Array<{ content: string }>;
    };
    expect(bodyObj.messages[0].content).toContain("<div><div><div><table>");
  });

  it("超长输入刚好 8000 字符 — 边界值应正常调用 LLM", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"html":"<p>优化后</p>","changes":["已优化"]}'
            }
          }
        ]
      })
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");
    const exactMaxContent = "a".repeat(8000);
    const result = await formatContent("test-user", exactMaxContent, "beautify");

    expect(result.html).toBe("<p>优化后</p>");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("超长输入 8001 字符 — 边界值应抛出 400 错误", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    const { formatContent } = await import("../src/modules/ai/ai.service");
    const overMaxContent = "a".repeat(8001);

    try {
      await formatContent("test-user", overMaxContent, "beautify");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("400");
      expect((error as Error).message).toContain("8000");
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("包含特殊字符的内容 — emoji/中文标点/HTML 实体正常传递", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    let capturedBody: string = "";
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  '{"html":"<p>特殊内容已优化</p>","changes":["处理了特殊字符"]}'
              }
            }
          ]
        })
      };
    });
    globalThis.fetch = fetchMock;

    const specialContent =
      '<p>Emoji: 🎉🔥💻 中文标点：，。！？ HTML实体：&amp;&lt;&gt;</p>';

    const { formatContent } = await import("../src/modules/ai/ai.service");
    const result = await formatContent("test-user", specialContent, "beautify");

    expect(result.html).toBe("<p>特殊内容已优化</p>");

    // 验证特殊字符被正确传递
    const bodyObj = JSON.parse(capturedBody) as {
      messages: Array<{ content: string }>;
    };
    expect(bodyObj.messages[0].content).toContain("🎉");
    expect(bodyObj.messages[0].content).toContain("&amp;");
  });
});

// ---------------------------------------------------------------------------
// 输出格式一致性测试（TEST-007）
// ---------------------------------------------------------------------------

describe("formatContent -- 输出格式一致性", () => {
  const defaultSettings = createSettings();

  it("beautify 和 structure 返回相同的结构形状", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                '{"html":"<p>内容</p>","changes":["变更说明"]}'
            }
          }
        ]
      })
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");

    const beautifyResult = await formatContent("test-user", "<p>测试</p>", "beautify");
    const structureResult = await formatContent("test-user", "<p>测试</p>", "structure");

    // 两者都应包含 html 和 changes 字段
    expect(beautifyResult).toHaveProperty("html");
    expect(beautifyResult).toHaveProperty("changes");
    expect(structureResult).toHaveProperty("html");
    expect(structureResult).toHaveProperty("changes");

    // 类型一致性
    expect(typeof beautifyResult.html).toBe("string");
    expect(Array.isArray(beautifyResult.changes)).toBe(true);
    expect(typeof structureResult.html).toBe("string");
    expect(Array.isArray(structureResult.changes)).toBe(true);
  });

  it("LLM 返回 changes 为空数组时正常处理", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"html":"<p>内容</p>","changes":[]}'
            }
          }
        ]
      })
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");
    const result = await formatContent("test-user", "<p>内容</p>", "beautify");

    expect(result.html).toBe("<p>内容</p>");
    expect(result.changes).toStrictEqual([]);
  });

  it("LLM 返回缺少 changes 字段时默认为空数组", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"html":"<p>内容</p>"}'
            }
          }
        ]
      })
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");
    const result = await formatContent("test-user", "<p>内容</p>", "structure");

    expect(result.html).toBe("<p>内容</p>");
    // changes 应被默认为空数组
    expect(result.changes).toStrictEqual([]);
  });
});

// ---------------------------------------------------------------------------
// LLM 异常响应测试（TEST-007）
// ---------------------------------------------------------------------------

describe("formatContent -- LLM 异常响应", () => {
  const defaultSettings = createSettings();

  it("LLM 返回空 choices 数组 — 抛出空内容错误", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] })
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");

    try {
      await formatContent("test-user", "<p>内容</p>", "beautify");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("LLM_API_ERROR");
      expect((error as Error).message).toContain("LLM 返回空内容");
    }
  });

  it("LLM 返回 content 为空字符串 — 抛出空内容错误", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "   " } }]
      })
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");

    try {
      await formatContent("test-user", "<p>内容</p>", "structure");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("LLM_API_ERROR");
      expect((error as Error).message).toContain("LLM 返回空内容");
    }
  });

  it("LLM 返回异常 JSON 结构（无 choices 字段）— 抛出空内容错误", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ error: "something went wrong" })
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");

    try {
      await formatContent("test-user", "<p>内容</p>", "beautify");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("LLM_API_ERROR");
      expect((error as Error).message).toContain("LLM 返回空内容");
    }
  });

  it("LLM 返回缺少 html 字段的 JSON — 抛出格式不正确错误", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"changes":["修改了内容"]}'
            }
          }
        ]
      })
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");

    try {
      await formatContent("test-user", "<p>内容</p>", "beautify");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("LLM_API_ERROR");
      expect((error as Error).message).toContain("格式不正确");
    }
  });

  it("LLM 返回非 JSON 字符串 — 抛出 502 错误", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "这不是 JSON 格式的内容"
            }
          }
        ]
      })
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");

    try {
      await formatContent("test-user", "<p>内容</p>", "structure");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("LLM_API_ERROR");
      expect((error as Error).message).toContain("502");
    }
  });

  it("网络超时 — fetch 抛出 AbortError 时包装为 502", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    fetchMock.mockRejectedValue(new Error("The operation was aborted"));
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");

    try {
      await formatContent("test-user", "<p>内容</p>", "beautify");
      expect.fail("应抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("LLM_API_ERROR");
      expect((error as Error).message).toContain("502");
    }
  });
});

// ---------------------------------------------------------------------------
// Prompt 构造验证（TEST-007）
// ---------------------------------------------------------------------------

describe("formatContent -- Prompt 构造验证", () => {
  const defaultSettings = createSettings();

  it("beautify 模式 prompt 包含指定模板结构", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    let capturedBody: string = "";
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"html":"<p>优</p>","changes":[]}' } }]
        })
      };
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");
    await formatContent("test-user", "<p>原始</p>", "beautify");

    const bodyObj = JSON.parse(capturedBody) as {
      messages: Array<{ role: string; content: string }>;
      model: string;
      max_tokens: number;
      temperature: number;
    };

    // 验证 LLM 请求结构
    expect(bodyObj.model).toBe("qwen-turbo");
    expect(bodyObj.max_tokens).toBe(4096);
    expect(bodyObj.temperature).toBe(0.3);
    expect(bodyObj.messages).toHaveLength(1);
    expect(bodyObj.messages[0].role).toBe("user");

    // 验证 beautify prompt 模板内容
    const prompt = bodyObj.messages[0].content;
    expect(prompt).toContain("优化以下 HTML 的排版");
    expect(prompt).toContain("修正标点符号");
    expect(prompt).toContain("统一中英文空格");
    expect(prompt).toContain("优化段落分割");
    expect(prompt).toContain("规范列表格式");
    expect(prompt).toContain("只返回 JSON");
    expect(prompt).toContain("<p>原始</p>");
  });

  it("structure 模式 prompt 包含指定模板结构", async () => {
    getRawSettingsMock.mockResolvedValue(defaultSettings);

    let capturedBody: string = "";
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"html":"<h2>标</h2>","changes":[]}' } }]
        })
      };
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");
    await formatContent("test-user", "原始内容", "structure");

    const bodyObj = JSON.parse(capturedBody) as {
      messages: Array<{ role: string; content: string }>;
    };

    // 验证 structure prompt 模板内容
    const prompt = bodyObj.messages[0].content;
    expect(prompt).toContain("分析以下文章内容");
    expect(prompt).toContain("重新组织结构");
    expect(prompt).toContain("识别标题层级");
    expect(prompt).toContain("拆分段落");
    expect(prompt).toContain("规范化列表");
    expect(prompt).toContain("只返回 JSON");
    expect(prompt).toContain("原始内容");
  });

  it("API baseUrl 尾部斜杠被清理 — 验证 URL 构造正确", async () => {
    getRawSettingsMock.mockResolvedValue({
      ...defaultSettings,
      baseUrl: "https://api.test.com/v1///"
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"html":"<p>优</p>","changes":[]}' } }]
      })
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");
    await formatContent("test-user", "<p>内容</p>", "beautify");

    // 验证 URL 尾部斜杠被清理
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test.com/v1/chat/completions",
      expect.anything()
    );
  });

  it("formatModel 为空时使用默认模型 qwen-plus", async () => {
    getRawSettingsMock.mockResolvedValue({
      ...defaultSettings,
      formatModel: ""
    });

    let capturedBody: string = "";
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"html":"<p>优</p>","changes":[]}' } }]
        })
      };
    });
    globalThis.fetch = fetchMock;

    const { formatContent } = await import("../src/modules/ai/ai.service");
    await formatContent("test-user", "<p>内容</p>", "beautify");

    const bodyObj = JSON.parse(capturedBody) as { model: string };
    expect(bodyObj.model).toBe("qwen-plus");
  });
});
