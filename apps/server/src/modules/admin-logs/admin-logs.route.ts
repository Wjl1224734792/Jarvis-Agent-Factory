import {
  adminLogSourceKindSchema,
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

function mapInvalidLogSourceError(error: unknown) {
  return error instanceof Error && error.message === "Selected log source is not configured yet.";
}

function getLogSourceErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Invalid log source.";
}

adminLogsRoute.get(API_ROUTES.admin.logsOverview, requireAdmin, async (context) => {
  const sourceInput = context.req.query("source");
  const source = sourceInput
    ? adminLogSourceKindSchema.parse(sourceInput)
    : undefined;
  logger.security("admin viewed logs overview", {
    adminUserId: context.var.currentUser?.id ?? null,
    source
  });
  try {
    return context.json(adminLogsOverviewResponseSchema.parse({
      item: await adminLogsService.getOverview(source)
    }));
  } catch (error) {
    if (mapInvalidLogSourceError(error)) {
      return context.json({ code: "BAD_REQUEST", message: getLogSourceErrorMessage(error) }, 400);
    }
    throw error;
  }
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

  try {
    return context.json(adminLogFilesResponseSchema.parse({
      items: await adminLogsService.listFiles(input)
    }));
  } catch (error) {
    if (mapInvalidLogSourceError(error)) {
      return context.json({ code: "BAD_REQUEST", message: getLogSourceErrorMessage(error) }, 400);
    }
    throw error;
  }
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

  try {
    return context.json(adminLogEntriesResponseSchema.parse(await adminLogsService.readEntries(input)));
  } catch (error) {
    if (mapInvalidLogSourceError(error)) {
      return context.json({ code: "BAD_REQUEST", message: getLogSourceErrorMessage(error) }, 400);
    }
    throw error;
  }
});
