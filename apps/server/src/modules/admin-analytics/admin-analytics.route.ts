import { adminAnalyticsOverviewResponseSchema } from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import { requireAdmin, type AuthVariables } from "../auth/auth.middleware";
import { adminAnalyticsService } from "./admin-analytics.service";

export const adminAnalyticsRoute = new Hono<{ Variables: AuthVariables }>();

adminAnalyticsRoute.get(API_ROUTES.admin.analyticsOverview, requireAdmin, async (context) => {
  const item = await adminAnalyticsService.getOverview();
  return context.json(adminAnalyticsOverviewResponseSchema.parse({ item }));
});
