import {
  aiFeaturesResponseSchema,
  aiFormatRequestSchema,
  aiSettingsSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  requireAuth,
  type AuthVariables
} from "../auth/auth.middleware";
import { aiSettingsService } from "./ai-settings.service";
import { formatContent } from "./ai.service";

export const aiRoute = new Hono<{ Variables: AuthVariables }>();

aiRoute.use("*", attachCurrentUser);

/**
 * GET /api/v1/admin/ai/settings — 获取 AI 配置（脱敏）。
 */
aiRoute.get(API_ROUTES.ai.adminSettings, requireAdmin, async (context) => {
  const item = await aiSettingsService.getAiSettings();
  return context.json({ item });
});

/**
 * PUT /api/v1/admin/ai/settings — 更新 AI 配置。
 */
aiRoute.put(API_ROUTES.ai.adminSettings, requireAdmin, async (context) => {
  const input = aiSettingsSchema.parse(await context.req.json());
  const item = await aiSettingsService.updateAiSettings(input);
  return context.json({ item });
});

/**
 * POST /api/v1/admin/ai/settings/test — 测试 LLM API 连接。
 */
aiRoute.post(API_ROUTES.ai.adminSettingsTest, requireAdmin, async (context) => {
  const result = await aiSettingsService.testConnection();
  return context.json(result);
});

/**
 * GET /api/v1/ai/features — 查询 AI 功能开关状态。
 * 返回 format 布尔值，不含 apiKey 等敏感字段。需登录。
 */
aiRoute.get(API_ROUTES.ai.features, requireAuth, async (context) => {
  const settings = await aiSettingsService.getRawSettings();
  const features = aiFeaturesResponseSchema.parse(settings.features);
  return context.json({ features });
});

/**
 * POST /api/v1/ai/format — AI 辅助排版。
 * 支持 beautify（局部美化）和 structure（全文结构化）两种模式。需登录。
 */
aiRoute.post(API_ROUTES.ai.format, requireAuth, async (context) => {
  const body = aiFormatRequestSchema.parse(await context.req.json());

  try {
    const userId = context.get("currentUser")?.id ?? "anonymous";
  const result = await formatContent(userId, body.content, body.mode);
    return context.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("400")) {
      return context.json({ code: "INVALID_INPUT", message }, 400);
    }

    if (message.includes("403")) {
      return context.json({ code: "FEATURE_DISABLED", message }, 403);
    }

    if (message.includes("LLM_API_ERROR")) {
      return context.json({ code: "LLM_API_ERROR", message }, 502);
    }

    throw error;
  }
});

