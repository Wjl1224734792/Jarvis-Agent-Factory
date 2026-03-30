import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  type AuthVariables
} from "../auth/auth.middleware";
import { adminReportsService } from "./admin-reports.service";

export const adminReportsRoute = new Hono<{ Variables: AuthVariables }>();

const reportKinds = new Set([
  "post",
  "model",
  "review",
  "post-comment",
  "review-comment",
  "model-comment",
  "ranking",
  "ranking-item",
  "ranking-comment",
  "ranking-item-comment"
] as const);

adminReportsRoute.use("*", attachCurrentUser);

adminReportsRoute.get(API_ROUTES.admin.reportDetail(":kind", ":id"), requireAdmin, async (context) => {
  const kind = context.req.param("kind");
  const id = context.req.param("id");
  if (!kind || !id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  if (!reportKinds.has(kind as (typeof reportKinds extends Set<infer T> ? T : never))) {
    return context.json({ code: "BAD_REQUEST", message: "Invalid report kind." }, 400);
  }

  const payload = await adminReportsService.getReportDetails(kind as any, id);
  return context.json(payload);
});
