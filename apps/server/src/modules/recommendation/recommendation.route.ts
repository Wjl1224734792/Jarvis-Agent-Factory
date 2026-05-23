import {
  recommendationSettingsResponseSchema,
  updateRecommendationSettingsInputSchema,
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import { requireRole, type AuthVariables } from "../auth/auth.middleware";
import { recommendationService } from "./recommendation.service";

export const recommendationRoute = new Hono<{ Variables: AuthVariables }>();

// Admin: 获取推荐配置
recommendationRoute.get(API_ROUTES.recommendation.adminSettings, requireRole("super_admin", "admin", "editor", "operator"), async (context) => {
  const item = await recommendationService.getSettings();
  return context.json(recommendationSettingsResponseSchema.parse({ item }));
});

// Admin: 更新推荐配置
recommendationRoute.put(API_ROUTES.recommendation.adminSettings, requireRole("super_admin", "admin", "editor", "operator"), async (context) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const body = await context.req.json();
  const input = updateRecommendationSettingsInputSchema.parse(body);
  const item = await recommendationService.updateSettings(input);
  return context.json(recommendationSettingsResponseSchema.parse({ item }));
});

// Public: 前端获取推荐配置（无需登录）
recommendationRoute.get(API_ROUTES.recommendation.publicSettings, async (context) => {
  const item = await recommendationService.getSettings();
  return context.json(recommendationSettingsResponseSchema.parse({ item }));
});
