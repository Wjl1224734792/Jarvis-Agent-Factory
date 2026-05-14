import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireRole,
  type AuthVariables
} from "../auth/auth.middleware";
import {
  parseAdminReportRecordsResponse,
  parseAdminReportSummaryResponse
} from "./admin-reports.helpers";
import { adminReportsService } from "./admin-reports.service";

export const adminReportsRoute = new Hono<{ Variables: AuthVariables }>();

const reportKinds = [
  "post",
  "model",
  "review",
  "post-comment",
  "review-comment",
  "model-comment",
  "ranking",
  "rating-target",
  "ranking-comment",
  "rating-target-comment"
] as const;

type ReportKind = (typeof reportKinds)[number];

function isReportKind(value: string): value is ReportKind {
  return (reportKinds as readonly string[]).includes(value);
}

adminReportsRoute.use("*", attachCurrentUser);

adminReportsRoute.get(API_ROUTES.admin.reports, requireRole('super_admin', 'moderator'), async (context) => {
  const payload = await adminReportsService.listReportSummary();
  return context.json(parseAdminReportSummaryResponse(payload));
});

adminReportsRoute.get(API_ROUTES.admin.reportDetail(":kind", ":id"), requireRole('super_admin', 'moderator'), async (context) => {
  const kind = context.req.param("kind");
  const id = context.req.param("id");
  if (!kind || !id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  if (!isReportKind(kind)) {
    return context.json({ code: "BAD_REQUEST", message: "Invalid report kind." }, 400);
  }

  const payload = await adminReportsService.getReportDetails(kind, id);
  return context.json(parseAdminReportRecordsResponse(payload));
});
