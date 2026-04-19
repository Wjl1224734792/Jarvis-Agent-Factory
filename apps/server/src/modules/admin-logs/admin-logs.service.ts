import { createReadStream } from "node:fs";
import {
  access,
  readdir,
  readFile,
  stat
} from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
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

async function pathExists(absolutePath: string) {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
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

async function listCategoryFiles(category: AdminLogCategory) {
  const categoryDir = getLogCategoryDir(category);
  if (!(await pathExists(categoryDir))) {
    return [];
  }

  const entries = await readdir(categoryDir, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".log"))
      .map(async (entry) => {
        const absolutePath = path.join(categoryDir, entry.name);
        const stats = await stat(absolutePath);

        return {
          category,
          fileName: entry.name,
          absolutePath,
          sizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString()
        };
      })
  );

  return files.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
}

async function readLogFileLines(absolutePath: string) {
  const lines: string[] = [];
  const stream = readline.createInterface({
    input: createReadStream(absolutePath, { encoding: "utf8" }),
    crlfDelay: Infinity
  });

  for await (const line of stream) {
    const trimmed = line.trim();
    if (trimmed) {
      lines.push(trimmed);
    }
  }

  return lines;
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
  async getOverview() {
    const config = getLoggerConfig();
    const categories = await Promise.all(
      LOG_CATEGORIES.map(async (category) => {
        const files = await listCategoryFiles(category);
        return {
          category,
          fileCount: files.length,
          totalSizeBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0),
          latestFileName: files[0]?.fileName ?? null,
          latestFileModifiedAt: files[0]?.modifiedAt ?? null
        };
      })
    );

    return {
      mode: config.mode,
      dir: config.dir,
      level: config.level,
      maxReadLines: config.maxReadLines,
      categories
    };
  },

  async listFiles(input: LogFilesQuery) {
    const category = normalizeCategory(input.category);
    return (await listCategoryFiles(category)).slice(0, input.limit ?? 50);
  },

  async readEntries(input: LogEntriesQuery) {
    const category = normalizeCategory(input.category);
    const { absolutePath, fileName } = safeResolveLogFile(category, input.fileName);

    if (!(await pathExists(absolutePath))) {
      throw new Error(`Log file not found: ${fileName}`);
    }

    const [stats, allLines] = await Promise.all([
      stat(absolutePath),
      readLogFileLines(absolutePath)
    ]);
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
  },

  // Keep an async read helper available for future adapters (object storage, cloud log sinks).
  async readRawFile(category: AdminLogCategory, fileName: string) {
    const { absolutePath } = safeResolveLogFile(category, fileName);
    return readFile(absolutePath, "utf8");
  }
};
