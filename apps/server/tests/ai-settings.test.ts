import { db, siteSettingsTable } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { app } from "../src/app";
import { loginAdmin, loginWebUser } from "./auth-test-helpers";
import { restoreEnvValues } from "./env-test-helpers";
import { resetIntegrationState } from "./test-state";

let adminCookie: string;
let userCookie: string;
const savedEnv: Record<string, string | undefined> = {};

function saveEnv(keys: string[]) {
  for (const key of keys) {
    savedEnv[key] = process.env[key];
  }
}

beforeAll(async () => {
  await resetIntegrationState("auth");
  // 清除可能残留的 AI 配置，确保测试从干净状态开始
  await clearDbAiSettings();
  adminCookie = await loginAdmin();
  userCookie = await loginWebUser("13800000001");
});

afterAll(() => {
  restoreEnvValues(savedEnv);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const settingsUrl = API_ROUTES.ai.adminSettings;
const testUrl = `${API_ROUTES.ai.adminSettings}/test`;

/** 清除 DB 中的 aiSettings 配置，确保环境变量测试不受其他测试影响 */
async function clearDbAiSettings() {
  await db
    .update(siteSettingsTable)
    .set({ aiSettings: null })
    .where(eq(siteSettingsTable.id, "site_settings_singleton"));
}

describe("GET /api/v1/admin/ai/settings", () => {
  it("无配置时返回内置默认值", async () => {
    const response = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: adminCookie }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      item: {
        provider: string;
        apiKey: string;
        baseUrl: string;
        summaryModel: string;
        formatModel: string;
        features: { summary: boolean; format: boolean };
      };
    };

    expect(body.item.provider).toBe("dashscope");
    expect(body.item.baseUrl).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1");
    expect(body.item.summaryModel).toBe("qwen-plus");
    expect(body.item.formatModel).toBe("qwen-plus");
    expect(body.item.features.summary).toBe(true);
    expect(body.item.features.format).toBe(true);
  });

  it("环境变量覆盖默认值（无后台配置时）", async () => {
    // 清除 DB 配置，确保环境变量能生效
    await clearDbAiSettings();
    saveEnv(["AI_PROVIDER", "AI_API_KEY", "AI_BASE_URL", "AI_SUMMARY_MODEL"]);
    process.env.AI_PROVIDER = "openai";
    process.env.AI_API_KEY = "sk-env-key-12345678";
    process.env.AI_BASE_URL = "https://api.openai.com/v1";
    process.env.AI_SUMMARY_MODEL = "gpt-4o-mini";

    const response = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: adminCookie }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      item: {
        provider: string;
        apiKey: string;
        baseUrl: string;
        summaryModel: string;
      };
    };

    expect(body.item.provider).toBe("openai");
    expect(body.item.baseUrl).toBe("https://api.openai.com/v1");
    expect(body.item.summaryModel).toBe("gpt-4o-mini");
    // API Key 应脱敏
    expect(body.item.apiKey).not.toBe("sk-env-key-12345678");
    expect(body.item.apiKey).toContain("***");
  });

  it("非 Admin 用户访问返回 403", async () => {
    const response = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: userCookie }
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("FORBIDDEN");
  });

  it("未登录访问返回 401", async () => {
    const response = await app.request(settingsUrl, {
      method: "GET"
    });

    expect(response.status).toBe(401);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("UNAUTHORIZED");
  });
});

describe("PUT /api/v1/admin/ai/settings", () => {
  it("保存配置后 GET 返回保存的值（API Key 脱敏）", async () => {
    const putResponse = await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope",
        apiKey: "sk-abc123def456ghi789",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        summaryModel: "qwen-turbo",
        formatModel: "qwen-plus",
        features: { summary: true, format: true }
      })
    });

    expect(putResponse.status).toBe(200);

    const getResponse = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: adminCookie }
    });

    expect(getResponse.status).toBe(200);
    const body = (await getResponse.json()) as {
      item: {
        provider: string;
        apiKey: string;
        summaryModel: string;
        formatModel: string;
        features: { summary: boolean; format: boolean };
      };
    };

    expect(body.item.provider).toBe("dashscope");
    expect(body.item.summaryModel).toBe("qwen-turbo");
    expect(body.item.formatModel).toBe("qwen-plus");
    // API Key 脱敏：保留前3后4，中间用 *** 替换
    expect(body.item.apiKey).not.toBe("sk-abc123def456ghi789");
    expect(body.item.apiKey).toMatch(/^sk-\*\*\*.*i789$/);
  });

  it("后台配置优先级高于环境变量", async () => {
    saveEnv(["AI_PROVIDER"]);
    process.env.AI_PROVIDER = "openai";

    // 先保存后台配置为 dashscope
    await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope",
        apiKey: "sk-test-key-1234",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        summaryModel: "qwen-plus",
        formatModel: "qwen-plus",
        features: { summary: true, format: true }
      })
    });

    const response = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: adminCookie }
    });

    const body = (await response.json()) as { item: { provider: string } };
    // 后台配置应优先于环境变量
    expect(body.item.provider).toBe("dashscope");
  });

  it("功能开关关闭后返回对应值", async () => {
    const putResponse = await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope",
        apiKey: "sk-test-key-1234",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        summaryModel: "qwen-plus",
        formatModel: "qwen-plus",
        features: { summary: false, format: false }
      })
    });

    expect(putResponse.status).toBe(200);

    const getResponse = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: adminCookie }
    });

    const body = (await getResponse.json()) as {
      item: { features: { summary: boolean; format: boolean } };
    };
    expect(body.item.features.summary).toBe(false);
    expect(body.item.features.format).toBe(false);
  });

  it("非 Admin 用户保存返回 403", async () => {
    const response = await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: userCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope",
        apiKey: "sk-test",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        summaryModel: "qwen-plus",
        formatModel: "qwen-plus",
        features: { summary: true, format: true }
      })
    });

    expect(response.status).toBe(403);
  });
});

describe("POST /api/v1/admin/ai/settings/test", () => {
  it("有效配置返回成功", async () => {
    // 先保存配置
    await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope",
        apiKey: "sk-test-valid-key",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        summaryModel: "qwen-plus",
        formatModel: "qwen-plus",
        features: { summary: true, format: true }
      })
    });

    // Mock fetch 模拟成功的 LLM API 响应
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "pong" } }]
        }),
        { status: 200 }
      )
    );

    const response = await app.request(testUrl, {
      method: "POST",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      success: boolean;
      message: string;
    };
    expect(body.success).toBe(true);
    expect(body.message).toContain("成功");

    fetchSpy.mockRestore();
  });

  it("无效配置返回失败", async () => {
    // 先保存配置
    await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope",
        apiKey: "sk-invalid",
        baseUrl: "https://invalid.example.com/v1",
        summaryModel: "qwen-plus",
        formatModel: "qwen-plus",
        features: { summary: true, format: true }
      })
    });

    // Mock fetch 模拟 LLM API 失败
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Unauthorized", { status: 401 })
    );

    const response = await app.request(testUrl, {
      method: "POST",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      success: boolean;
      message: string;
    };
    expect(body.success).toBe(false);
    expect(body.message).toBeTruthy();

    fetchSpy.mockRestore();
  });

  it("非 Admin 用户测试连接返回 403", async () => {
    const response = await app.request(testUrl, {
      method: "POST",
      headers: {
        cookie: userCookie,
        "content-type": "application/json"
      }
    });

    expect(response.status).toBe(403);
  });

  it("网络超时返回连接失败", async () => {
    // 先保存配置
    await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope",
        apiKey: "sk-timeout-test-key-123",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        summaryModel: "qwen-plus",
        formatModel: "qwen-plus",
        features: { summary: true, format: true }
      })
    });

    // Mock fetch 模拟超时
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("The operation was aborted")
    );

    const response = await app.request(testUrl, {
      method: "POST",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      success: boolean;
      message: string;
    };
    expect(body.success).toBe(false);
    expect(body.message).toContain("连接失败");

    fetchSpy.mockRestore();
  });

  it("网络错误返回连接失败", async () => {
    // 先保存配置
    await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope",
        apiKey: "sk-network-error-key-123",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        summaryModel: "qwen-plus",
        formatModel: "qwen-plus",
        features: { summary: true, format: true }
      })
    });

    // Mock fetch 模拟网络错误
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("fetch failed")
    );

    const response = await app.request(testUrl, {
      method: "POST",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      success: boolean;
      message: string;
    };
    expect(body.success).toBe(false);
    expect(body.message).toContain("连接失败");

    fetchSpy.mockRestore();
  });

  it("无 API Key 时返回未配置错误", async () => {
    // 保存一个空 apiKey 的配置 — 但 aiSettingsSchema 要求 apiKey.min(1)
    // 所以通过环境变量和清除 DB 来模拟无 key 场景
    await clearDbAiSettings();
    saveEnv(["AI_API_KEY"]);
    delete process.env.AI_API_KEY;

    const response = await app.request(testUrl, {
      method: "POST",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      success: boolean;
      message: string;
    };
    expect(body.success).toBe(false);
    expect(body.message).toContain("未配置 API Key");
  });
});

// ---------------------------------------------------------------------------
// 边界条件：配置优先级完整链路
// ---------------------------------------------------------------------------

describe("AI 配置优先级完整链路", () => {
  it("仅环境变量生效（无 DB 配置、无内置默认覆盖）", async () => {
    await clearDbAiSettings();
    saveEnv(["AI_PROVIDER", "AI_BASE_URL"]);
    process.env.AI_PROVIDER = "openai";
    process.env.AI_BASE_URL = "https://api.openai.com/v1";

    const response = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: adminCookie }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      item: { provider: string; baseUrl: string };
    };
    expect(body.item.provider).toBe("openai");
    expect(body.item.baseUrl).toBe("https://api.openai.com/v1");
  });

  it("仅内置默认值生效（无 DB 配置、无环境变量）", async () => {
    await clearDbAiSettings();
    // 确保无 AI 相关环境变量
    const aiEnvKeys = [
      "AI_PROVIDER",
      "AI_API_KEY",
      "AI_BASE_URL",
      "AI_SUMMARY_MODEL",
      "AI_FORMAT_MODEL",
      "AI_SUMMARY_ENABLED",
      "AI_FORMAT_ENABLED"
    ];
    saveEnv(aiEnvKeys);
    for (const key of aiEnvKeys) {
      delete process.env[key];
    }

    const response = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: adminCookie }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      item: {
        provider: string;
        baseUrl: string;
        summaryModel: string;
        formatModel: string;
        features: { summary: boolean; format: boolean };
      };
    };
    expect(body.item.provider).toBe("dashscope");
    expect(body.item.baseUrl).toBe(
      "https://dashscope.aliyuncs.com/compatible-mode/v1"
    );
    expect(body.item.summaryModel).toBe("qwen-plus");
    expect(body.item.formatModel).toBe("qwen-plus");
    expect(body.item.features.summary).toBe(true);
    expect(body.item.features.format).toBe(true);
  });

  it("DB 配置 > 环境变量 > 默认值 全链路优先级", async () => {
    saveEnv(["AI_PROVIDER", "AI_BASE_URL", "AI_SUMMARY_MODEL"]);
    process.env.AI_PROVIDER = "openai";
    process.env.AI_BASE_URL = "https://api.openai.com/v1";
    process.env.AI_SUMMARY_MODEL = "gpt-4o-mini";

    // DB 保存 dashscope 配置
    await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope",
        apiKey: "sk-full-chain-test-key-123",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        summaryModel: "qwen-turbo",
        formatModel: "qwen-plus",
        features: { summary: true, format: true }
      })
    });

    const response = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: adminCookie }
    });

    const body = (await response.json()) as {
      item: {
        provider: string;
        baseUrl: string;
        summaryModel: string;
      };
    };
    // DB 配置应优先于环境变量
    expect(body.item.provider).toBe("dashscope");
    expect(body.item.baseUrl).toBe(
      "https://dashscope.aliyuncs.com/compatible-mode/v1"
    );
    expect(body.item.summaryModel).toBe("qwen-turbo");
  });
});

// ---------------------------------------------------------------------------
// 边界条件：异常输入处理
// ---------------------------------------------------------------------------

describe("AI 配置异常输入", () => {
  it("PUT 空 JSON body 返回错误", async () => {
    const response = await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    });

    // Zod 校验失败，应返回 4xx 错误
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("PUT 非法 JSON 字符串返回错误", async () => {
    const response = await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: "not-a-json"
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("PUT 缺少必填字段返回错误", async () => {
    const response = await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope"
        // 缺少 apiKey, baseUrl, summaryModel, formatModel, features
      })
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("PUT baseUrl 非合法 URL 返回错误", async () => {
    const response = await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope",
        apiKey: "sk-test",
        baseUrl: "not-a-valid-url",
        summaryModel: "qwen-plus",
        formatModel: "qwen-plus",
        features: { summary: true, format: true }
      })
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});

// ---------------------------------------------------------------------------
// 边界条件：配置保存后即时生效
// ---------------------------------------------------------------------------

describe("AI 配置保存即时生效", () => {
  it("PUT 保存后 GET 立即返回新值", async () => {
    // 先保存一个配置
    await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "openai",
        apiKey: "sk-immediate-test-key-12345",
        baseUrl: "https://api.openai.com/v1",
        summaryModel: "gpt-4o-mini",
        formatModel: "gpt-4o",
        features: { summary: false, format: false }
      })
    });

    // 立即 GET 验证
    const getResponse = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: adminCookie }
    });

    const body = (await getResponse.json()) as {
      item: {
        provider: string;
        summaryModel: string;
        formatModel: string;
        features: { summary: boolean; format: boolean };
      };
    };

    expect(body.item.provider).toBe("openai");
    expect(body.item.summaryModel).toBe("gpt-4o-mini");
    expect(body.item.formatModel).toBe("gpt-4o");
    expect(body.item.features.summary).toBe(false);
    expect(body.item.features.format).toBe(false);
  });

  it("连续 PUT 两次，GET 返回最后一次的值", async () => {
    await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "openai",
        apiKey: "sk-first-key-12345",
        baseUrl: "https://api.openai.com/v1",
        summaryModel: "gpt-4o-mini",
        formatModel: "gpt-4o",
        features: { summary: true, format: true }
      })
    });

    await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope",
        apiKey: "sk-second-key-12345",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        summaryModel: "qwen-turbo",
        formatModel: "qwen-plus",
        features: { summary: false, format: false }
      })
    });

    const getResponse = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: adminCookie }
    });

    const body = (await getResponse.json()) as {
      item: {
        provider: string;
        summaryModel: string;
        features: { summary: boolean; format: boolean };
      };
    };

    expect(body.item.provider).toBe("dashscope");
    expect(body.item.summaryModel).toBe("qwen-turbo");
    expect(body.item.features.summary).toBe(false);
    expect(body.item.features.format).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 边界条件：API Key 脱敏各种格式
// ---------------------------------------------------------------------------

describe("API Key 脱敏各种格式", () => {
  it("短 key（7字符以下）脱敏为全部 ***", async () => {
    await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope",
        apiKey: "short",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        summaryModel: "qwen-plus",
        formatModel: "qwen-plus",
        features: { summary: true, format: true }
      })
    });

    const getResponse = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: adminCookie }
    });

    const body = (await getResponse.json()) as { item: { apiKey: string } };
    expect(body.item.apiKey).toBe("***");
  });

  it("恰好 8 字符的 key 正确脱敏", async () => {
    await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope",
        apiKey: "12345678",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        summaryModel: "qwen-plus",
        formatModel: "qwen-plus",
        features: { summary: true, format: true }
      })
    });

    const getResponse = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: adminCookie }
    });

    const body = (await getResponse.json()) as { item: { apiKey: string } };
    expect(body.item.apiKey).toBe("123***678");
  });

  it("包含特殊字符的 key 正确脱敏", async () => {
    await app.request(settingsUrl, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "dashscope",
        apiKey: "sk-!@#$%^&*()_+-=",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        summaryModel: "qwen-plus",
        formatModel: "qwen-plus",
        features: { summary: true, format: true }
      })
    });

    const getResponse = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: adminCookie }
    });

    const body = (await getResponse.json()) as { item: { apiKey: string } };
    // 前3="sk-"，后4="_+-="
    expect(body.item.apiKey).toBe("sk-***_+-=");
  });

  it("无 API Key 时返回空字符串", async () => {
    // 清除 DB 配置和环境变量
    await clearDbAiSettings();
    saveEnv(["AI_API_KEY"]);
    delete process.env.AI_API_KEY;

    const getResponse = await app.request(settingsUrl, {
      method: "GET",
      headers: { cookie: adminCookie }
    });

    const body = (await getResponse.json()) as { item: { apiKey: string } };
    expect(body.item.apiKey).toBe("");
  });
});
