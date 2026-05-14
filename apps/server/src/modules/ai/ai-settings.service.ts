import type { AiSettings, AiSettingsResponse } from "@feijia/schemas";
import { logger } from "../../lib/logger";
import { aiSettingsRepo } from "./ai-settings.repo";

/** 内置默认 AI 配置 */
const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: "dashscope",
  apiKey: "",
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  summaryModel: "qwen-plus",
  formatModel: "qwen-plus",
  features: { summary: true, format: true, chat: true }
};

/**
 * 从环境变量读取 AI 配置，未设置的字段返回 undefined。
 */
function readEnvSettings(): Partial<AiSettings> {
  const env: Partial<AiSettings> = {};

  if (process.env.AI_PROVIDER) {
    env.provider = process.env.AI_PROVIDER;
  }
  if (process.env.AI_API_KEY) {
    env.apiKey = process.env.AI_API_KEY;
  }
  if (process.env.AI_BASE_URL) {
    env.baseUrl = process.env.AI_BASE_URL;
  }
  if (process.env.AI_SUMMARY_MODEL) {
    env.summaryModel = process.env.AI_SUMMARY_MODEL;
  }
  if (process.env.AI_FORMAT_MODEL) {
    env.formatModel = process.env.AI_FORMAT_MODEL;
  }

  const summaryEnabled = process.env.AI_SUMMARY_ENABLED;
  const formatEnabled = process.env.AI_FORMAT_ENABLED;
  const chatEnabled = process.env.AI_CHAT_ENABLED;
  if (summaryEnabled !== undefined || formatEnabled !== undefined || chatEnabled !== undefined) {
    env.features = {
      summary: summaryEnabled !== "false",
      format: formatEnabled !== "false",
      chat: chatEnabled !== "false"
    };
  }

  return env;
}

/**
 * API Key 脱敏：保留前 3 个字符和后 4 个字符，中间用 *** 替换。
 * 不足 8 字符时全部用 *** 替换。
 *
 * @param key - 原始 API Key。
 * @returns 脱敏后的 API Key。
 */
export function maskApiKey(key: string): string {
  if (key.length <= 7) {
    return "***";
  }

  return `${key.slice(0, 3)}***${key.slice(-4)}`;
}

/**
 * 解析最终生效的 AI 配置，优先级：后台配置 > 环境变量 > 内置默认值。
 *
 * @returns 完整的 AI 配置（API Key 为原始值，不脱敏）。
 */
async function resolveSettings(): Promise<AiSettings> {
  const json = await aiSettingsRepo.getAiSettingsJson();
  const envSettings = readEnvSettings();

  let dbSettings: Partial<AiSettings> = {};
  if (json) {
    try {
      dbSettings = JSON.parse(json) as Partial<AiSettings>;
    } catch (error) {
      logger.warn("解析 aiSettings JSON 失败，使用环境变量和默认值", {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    provider: dbSettings.provider ?? envSettings.provider ?? DEFAULT_AI_SETTINGS.provider,
    apiKey: dbSettings.apiKey ?? envSettings.apiKey ?? DEFAULT_AI_SETTINGS.apiKey,
    baseUrl: dbSettings.baseUrl ?? envSettings.baseUrl ?? DEFAULT_AI_SETTINGS.baseUrl,
    summaryModel:
      dbSettings.summaryModel ?? envSettings.summaryModel ?? DEFAULT_AI_SETTINGS.summaryModel,
    formatModel:
      dbSettings.formatModel ?? envSettings.formatModel ?? DEFAULT_AI_SETTINGS.formatModel,
    features: {
      summary:
        dbSettings.features?.summary ??
        envSettings.features?.summary ??
        DEFAULT_AI_SETTINGS.features.summary,
      format:
        dbSettings.features?.format ??
        envSettings.features?.format ??
        DEFAULT_AI_SETTINGS.features.format,
      chat:
        dbSettings.features?.chat ??
        envSettings.features?.chat ??
        DEFAULT_AI_SETTINGS.features.chat
    }
  };
}

/**
 * 将内部配置转换为 API 响应格式（API Key 脱敏）。
 */
function toResponse(settings: AiSettings): AiSettingsResponse {
  return {
    provider: settings.provider,
    apiKey: settings.apiKey ? maskApiKey(settings.apiKey) : "",
    baseUrl: settings.baseUrl,
    summaryModel: settings.summaryModel,
    formatModel: settings.formatModel,
    features: settings.features
  };
}

export const aiSettingsService = {
  /**
   * 获取 AI 配置（脱敏）。
   * 优先级：后台配置 > 环境变量 > 内置默认值。
   * @returns 脱敏后的 AI 配置响应。
   */
  async getAiSettings(): Promise<AiSettingsResponse> {
    const settings = await resolveSettings();
    return toResponse(settings);
  },

  /**
   * 获取 AI 配置（原始值，含完整 API Key）。
   * 供内部模块（如 LLM 调用）使用。
   * @returns 完整的 AI 配置。
   */
  async getRawSettings(): Promise<AiSettings> {
    return resolveSettings();
  },

  /**
   * 保存 AI 配置到数据库。
   * @param input - 待保存的 AI 配置。
   * @returns 保存后的脱敏配置。
   */
  async updateAiSettings(input: AiSettings): Promise<AiSettingsResponse> {
    await aiSettingsRepo.upsertAiSettingsJson(JSON.stringify(input));
    return toResponse(input);
  },

  /**
   * 测试 LLM API 连接。
   * 用当前配置发送一个简单的 chat/completions 请求。
   * @returns 测试结果：成功或失败及消息。
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const settings = await resolveSettings();

    if (!settings.apiKey) {
      return { success: false, message: "未配置 API Key" };
    }

    try {
      const url = `${settings.baseUrl.replace(/\/+$/, "")}/chat/completions`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: settings.summaryModel,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        return {
          success: false,
          message: `API 返回 ${response.status}: ${errorText.slice(0, 200)}`
        };
      }

      return { success: true, message: "连接成功" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, message: `连接失败: ${message}` };
    }
  }
};
