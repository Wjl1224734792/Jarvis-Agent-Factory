import { z } from "zod";

export const adminLogCategorySchema = z.enum(["app", "request", "error", "security"]);

export const adminLogLevelSchema = z.enum(["DEBUG", "INFO", "WARN", "ERROR"]);

export const adminLogModeSchema = z.enum(["auto", "console", "file", "both"]);

export const adminLogSummaryItemSchema = z.object({
  category: adminLogCategorySchema,
  fileCount: z.number().int().nonnegative(),
  totalSizeBytes: z.number().int().nonnegative(),
  latestFileName: z.string().min(1).nullable(),
  latestFileModifiedAt: z.string().datetime().nullable()
});

export const adminLogsOverviewSchema = z.object({
  mode: adminLogModeSchema,
  dir: z.string().min(1),
  level: adminLogLevelSchema,
  maxReadLines: z.number().int().positive(),
  categories: z.array(adminLogSummaryItemSchema)
});

export const adminLogsOverviewResponseSchema = z.object({
  item: adminLogsOverviewSchema
});

export const adminLogFileItemSchema = z.object({
  category: adminLogCategorySchema,
  fileName: z.string().min(1),
  absolutePath: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  modifiedAt: z.string().datetime()
});

export const adminLogFilesResponseSchema = z.object({
  items: z.array(adminLogFileItemSchema)
});

export const adminLogEntrySchema = z.object({
  raw: z.string().min(1),
  timestamp: z.string().datetime().nullable(),
  level: adminLogLevelSchema.nullable(),
  message: z.string().min(1),
  meta: z.record(z.string(), z.unknown()).nullable()
});

export const adminLogEntriesResponseSchema = z.object({
  file: adminLogFileItemSchema,
  totalLines: z.number().int().nonnegative(),
  items: z.array(adminLogEntrySchema)
});

export const adminLogFilesQuerySchema = z.object({
  category: adminLogCategorySchema,
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export const adminLogEntriesQuerySchema = z.object({
  category: adminLogCategorySchema,
  fileName: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  level: adminLogLevelSchema.optional(),
  search: z.string().trim().max(120).optional()
});

export type AdminLogCategory = z.infer<typeof adminLogCategorySchema>;
