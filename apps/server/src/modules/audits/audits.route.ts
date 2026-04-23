import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  adminAuditManualDecisionInputSchema,
  adminAuditRecordResponseSchema,
  adminAuditRecordListQuerySchema,
  adminAuditRecordListResponseSchema
} from "@feijia/schemas";
import { attachCurrentUser, requireAdmin, type AuthVariables } from "../auth/auth.middleware";
import { auditsService } from "./audits.service";
import { qiniuAuditService } from "./qiniu-audit.service";

export const auditsRoute = new Hono<{ Variables: AuthVariables }>();

auditsRoute.use("*", attachCurrentUser);

auditsRoute.get(API_ROUTES.admin.audits, requireAdmin, async (context) => {
  const query = adminAuditRecordListQuerySchema.parse({
    domain: context.req.query("domain") ?? undefined,
    entityId: context.req.query("entityId") ?? undefined,
    limit: context.req.query("limit") ?? undefined
  });

  const payload = await auditsService.listAdminAuditRecords(query);
  return context.json(adminAuditRecordListResponseSchema.parse(payload));
});

auditsRoute.put(API_ROUTES.admin.auditManualReview(":id"), requireAdmin, async (context) => {
  const auditId = context.req.param("id");
  const currentUser = context.get("currentUser");
  if (!auditId || !currentUser) {
    return context.json({ code: "BAD_REQUEST", message: "Missing audit id." }, 400);
  }

  const input = adminAuditManualDecisionInputSchema.parse(await context.req.json());
  const result = await auditsService.applyManualDecision({
    auditId,
    reviewerId: currentUser.id,
    status: input.status,
    reviewNote: input.reviewNote ?? null
  });

  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Audit record not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json(
      {
        code: "FORBIDDEN",
        message:
          "Manual review is only supported for the latest file, brand application, aircraft submission, and comment audits."
      },
      403
    );
  }

  return context.json(adminAuditRecordResponseSchema.parse(result.payload));
});

auditsRoute.post(API_ROUTES.audits.qiniuCallback, async (context) => {
  const requestBody = await context.req.text();
  const callbackAuth = context.req.header("authorization");

  if (!callbackAuth) {
    return context.json({ code: "UNAUTHORIZED", message: "Missing callback authorization." }, 401);
  }

  const headers = Object.fromEntries(context.req.raw.headers.entries());
  const verified = qiniuAuditService.verifyCallback({
    requestUrl: context.req.url,
    requestBody,
    callbackAuth,
    method: context.req.method,
    contentType: context.req.header("content-type"),
    headers
  });

  if (!verified) {
    return context.json({ code: "FORBIDDEN", message: "Invalid qiniu callback signature." }, 403);
  }

  const payload = JSON.parse(requestBody) as Record<string, unknown>;
  await qiniuAuditService.handleVideoCallback(payload);

  return context.json({ ok: true });
});
