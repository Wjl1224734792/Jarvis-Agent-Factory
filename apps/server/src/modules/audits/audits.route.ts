import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
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
