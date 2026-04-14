import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync
} from "node:fs";
import path from "node:path";
import type {
  AdminLogCategory,
  adminLogEntriesQuerySchema,
  adminLogFilesQuerySchema
} from "@feijia/schemas";
import type { z } from "zod";
import { getLogCategoryDir, getLoggerConfig, LOG_CATEGORIES, parseLogLine } from "../../lib/logger";

type LogFilesQuery = z.infer<typeof adminLogFilesQuerySchema>;
type LogEntriesQuery = z.infer<typeof adminLogEntriesQuerySchema>;

function normalizeCategory(category: AdminLogCategory) {
  return category;
}

function safeResolveLogFile(category: AdminLogCategory, fileName: string) {
  const normalizedFileName = path.basename(fileName);
  const baseDir = getLogCategoryDir(category);
  const resolved = path.resolve(baseDir, normalizedFileName);

  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new Error("Invalid log file path.");
  }

  return {
    fileName: normalizedFileName,
    absolutePath: resolved
  };
}

function listCategoryFiles(category: AdminLogCategory) {
  const categoryDir = getLogCategoryDir(category);
  if (!existsSync(categoryDir)) {
    return [];
  }

  return readdirSync(categoryDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".log"))
    .map((entry) => {
      const absolutePath = path.join(categoryDir, entry.name);
      const stats = statSync(absolutePath);

      return {
        category,
        fileName: entry.name,
        absolutePath,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString()
      };
    })
    .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
}

function filterEntries(
  lines: string[],
  input: { level?: string; search?: string }
) {
  return lines
    .map((raw) => parseLogLine(raw))
    .filter((entry) => {
      if (input.level && entry.level !== input.level) {
        return false;
      }

      if (input.search) {
        const keyword = input.search.toLowerCase();
        const metaText = entry.meta ? JSON.stringify(entry.meta).toLowerCase() : "";
        return (
          entry.raw.toLowerCase().includes(keyword) ||
          entry.message.toLowerCase().includes(keyword) ||
          metaText.includes(keyword)
        );
      }

      return true;
    });
}

export const adminLogsService = {
  getOverview() {
    const config = getLoggerConfig();

    return {
      mode: config.mode,
      dir: config.dir,
      level: config.level,
      maxReadLines: config.maxReadLines,
      categories: LOG_CATEGORIES.map((category) => {
        const files = listCategoryFiles(category);
        return {
          category,
          fileCount: files.length,
          totalSizeBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0),
          latestFileName: files[0]?.fileName ?? null,
          latestFileModifiedAt: files[0]?.modifiedAt ?? null
        };
      })
    };
  },

  listFiles(input: LogFilesQuery) {
    const category = normalizeCategory(input.category);
    return listCategoryFiles(category).slice(0, input.limit ?? 50);
  },

  readEntries(input: LogEntriesQuery) {
    const category = normalizeCategory(input.category);
    const { absolutePath, fileName } = safeResolveLogFile(category, input.fileName);

    if (!existsSync(absolutePath)) {
      throw new Error(`Log file not found: ${fileName}`);
    }

    const stats = statSync(absolutePath);
    const content = readFileSync(absolutePath, "utf8");
    const allLines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const filtered = filterEntries(allLines, {
      level: input.level,
      search: input.search
    });
    const limit = input.limit ?? getLoggerConfig().maxReadLines;

    return {
      file: {
        category,
        fileName,
        absolutePath,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString()
      },
      totalLines: filtered.length,
      items: filtered.slice(-limit).reverse()
    };
  }
};
