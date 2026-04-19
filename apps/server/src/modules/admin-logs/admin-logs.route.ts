import {
  adminLogEntriesQuerySchema,
  adminLogEntriesResponseSchema,
  adminLogFilesQuerySchema,
  adminLogFilesResponseSchema,
  adminLogsOverviewResponseSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import { logger } from "../../lib/logger";
import {
  attachCurrentUser,
  requireAdmin,
  type AuthVariables
} from "../auth/auth.middleware";
import { adminLogsService } from "./admin-logs.service";

export const adminLogsRoute = new Hono<{ Variables: AuthVariables }>();

adminLogsRoute.use("*", attachCurrentUser);

adminLogsRoute.get(API_ROUTES.admin.logsOverview, requireAdmin, async (context) => {
  const source = context.req.query("source") ?? undefined;
  logger.security("admin viewed logs overview", {
    adminUserId: context.var.currentUser?.id ?? null,
    source
  });
  return context.json(adminLogsOverviewResponseSchema.parse({
    item: await adminLogsService.getOverview(source)
  }));
});

adminLogsRoute.get(API_ROUTES.admin.logsFiles, requireAdmin, async (context) => {
  const input = adminLogFilesQuerySchema.parse({
    source: context.req.query("source"),
    category: context.req.query("category"),
    limit: context.req.query("limit")
  });
  logger.security("admin listed log files", {
    adminUserId: context.var.currentUser?.id ?? null,
    source: input.source,
    category: input.category,
    limit: input.limit
  });

  return context.json(adminLogFilesResponseSchema.parse({
    items: await adminLogsService.listFiles(input)
  }));
});

adminLogsRoute.get(API_ROUTES.admin.logsEntries, requireAdmin, async (context) => {
  const input = adminLogEntriesQuerySchema.parse({
    source: context.req.query("source"),
    category: context.req.query("category"),
    fileName: context.req.query("fileName"),
    limit: context.req.query("limit"),
    level: context.req.query("level"),
    search: context.req.query("search")
  });
  logger.security("admin read log entries", {
    adminUserId: context.var.currentUser?.id ?? null,
    source: input.source,
    category: input.category,
    fileName: input.fileName,
    level: input.level ?? null,
    search: input.search ?? null,
    limit: input.limit
  });

  return context.json(adminLogEntriesResponseSchema.parse(await adminLogsService.readEntries(input)));
});
