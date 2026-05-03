import {
  siteSettingsResponseSchema,
  updateSiteSettingsInputSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  type AuthVariables
} from "../auth/auth.middleware";
import { siteSettingsService } from "./site-settings.service";

export const siteSettingsRoute = new Hono<{ Variables: AuthVariables }>();

// 站点设置只允许管理员访问，并在这里统一做 schema 级别的输入约束。
siteSettingsRoute.use("*", attachCurrentUser);

siteSettingsRoute.get(API_ROUTES.admin.siteSettings, requireAdmin, async (context) => {
  const item = await siteSettingsService.getResolvedSettings();
  return context.json(siteSettingsResponseSchema.parse({ item }));
});

siteSettingsRoute.put(API_ROUTES.admin.siteSettings, requireAdmin, async (context) => {
  const input = updateSiteSettingsInputSchema.parse(await context.req.json());
  const item = await siteSettingsService.update(input);

  if (!item) {
    return context.json({ code: "INTERNAL_ERROR", message: "Failed to update site settings." }, 500);
  }

  return context.json(siteSettingsResponseSchema.parse({ item }));
});
