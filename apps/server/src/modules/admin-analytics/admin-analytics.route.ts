import { adminAnalyticsOverviewResponseSchema } from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  type AuthVariables
} from "../auth/auth.middleware";
import { adminAnalyticsService } from "./admin-analytics.service";

export const adminAnalyticsRoute = new Hono<{ Variables: AuthVariables }>();

// 统计概览只对管理员开放，这里显式挂当前用户解析，避免权限依赖隐式成立。
adminAnalyticsRoute.use("*", attachCurrentUser);

adminAnalyticsRoute.get(API_ROUTES.admin.analyticsOverview, requireAdmin, async (context) => {
  const item = await adminAnalyticsService.getOverview();
  return context.json(adminAnalyticsOverviewResponseSchema.parse({ item }));
});
