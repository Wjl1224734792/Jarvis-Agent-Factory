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

adminLogsRoute.get(API_ROUTES.admin.logsOverview, requireAdmin, (context) => {
  logger.security("admin viewed logs overview", {
    adminUserId: context.var.currentUser?.id ?? null
  });
  return context.json(adminLogsOverviewResponseSchema.parse({
    item: adminLogsService.getOverview()
  }));
});

adminLogsRoute.get(API_ROUTES.admin.logsFiles, requireAdmin, (context) => {
  const input = adminLogFilesQuerySchema.parse({
    category: context.req.query("category"),
    limit: context.req.query("limit")
  });
  logger.security("admin listed log files", {
    adminUserId: context.var.currentUser?.id ?? null,
    category: input.category,
    limit: input.limit
  });

  return context.json(adminLogFilesResponseSchema.parse({
    items: adminLogsService.listFiles(input)
  }));
});

adminLogsRoute.get(API_ROUTES.admin.logsEntries, requireAdmin, (context) => {
  const input = adminLogEntriesQuerySchema.parse({
    category: context.req.query("category"),
    fileName: context.req.query("fileName"),
    limit: context.req.query("limit"),
    level: context.req.query("level"),
    search: context.req.query("search")
  });
  logger.security("admin read log entries", {
    adminUserId: context.var.currentUser?.id ?? null,
    category: input.category,
    fileName: input.fileName,
    level: input.level ?? null,
    search: input.search ?? null,
    limit: input.limit
  });

  return context.json(adminLogEntriesResponseSchema.parse(adminLogsService.readEntries(input)));
});
