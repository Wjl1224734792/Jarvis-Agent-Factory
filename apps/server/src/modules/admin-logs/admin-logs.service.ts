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

type LogFileItem = {
  sourceKey: string;
  category: AdminLogCategory;
  fileName: string;
  pathLabel: string;
  sizeBytes: number;
  modifiedAt: string;
};

type LogSourceAdapter = {
  key: string;
  label: string;
  kind: "local-files";
  listCategories: () => Promise<
    Array<{
      category: AdminLogCategory;
      fileCount: number;
      totalSizeBytes: number;
      latestFileName: string | null;
      latestFileModifiedAt: string | null;
    }>
  >;
  listFiles: (input: LogFilesQuery) => Promise<LogFileItem[]>;
  readEntries: (input: LogEntriesQuery) => Promise<{
    file: LogFileItem;
    totalLines: number;
    items: ReturnType<typeof parseLogLine>[];
  }>;
};

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

function createLocalFilesLogSource(): LogSourceAdapter {
  const sourceKey = "local-files";

  function safeResolveLogFile(category: AdminLogCategory, fileName: string) {
    const normalizedFileName = path.basename(fileName);
    const baseDir = getLogCategoryDir(category);
    const resolved = path.resolve(baseDir, normalizedFileName);

    if (!resolved.startsWith(path.resolve(baseDir))) {
      throw new Error("Invalid log file path.");
    }

    return {
      fileName: normalizedFileName,
      absolutePath: resolved,
      pathLabel: `${category}/${normalizedFileName}`
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
            sourceKey,
            category,
            fileName: entry.name,
            pathLabel: `${category}/${entry.name}`,
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

  return {
    key: sourceKey,
    label: "本地文件日志",
    kind: "local-files",
    async listCategories() {
      return Promise.all(
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
    },
    async listFiles(input: LogFilesQuery) {
      const category = normalizeCategory(input.category);
      return (await listCategoryFiles(category)).slice(0, input.limit ?? 50);
    },
    async readEntries(input: LogEntriesQuery) {
      const category = normalizeCategory(input.category);
      const { absolutePath, fileName, pathLabel } = safeResolveLogFile(category, input.fileName);

      if (!(await pathExists(absolutePath))) {
        throw new Error(`Log file not found: ${fileName}`);
      }

      const [stats, allLines] = await Promise.all([
        stat(absolutePath),
        readLogFileLines(absolutePath)
      ]);
      const filtered = allLines
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
      const limit = input.limit ?? getLoggerConfig().maxReadLines;

      return {
        file: {
          sourceKey,
          category,
          fileName,
          pathLabel,
          sizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString()
        },
        totalLines: filtered.length,
        items: filtered.slice(-limit).reverse()
      };
    }
  };
}

const logSources = [createLocalFilesLogSource()] as const;

function resolveLogSource(sourceKey?: string) {
  const resolved =
    logSources.find((source) => source.key === sourceKey) ??
    logSources[0];

  if (!resolved) {
    throw new Error("No log source configured.");
  }

  return resolved;
}

export const adminLogsService = {
  async getOverview(sourceKey?: string) {
    const config = getLoggerConfig();
    const activeSource = resolveLogSource(sourceKey);

    return {
      mode: config.mode,
      dir: config.dir,
      level: config.level,
      maxReadLines: config.maxReadLines,
      activeSourceKey: activeSource.key,
      sources: logSources.map((source) => ({
        key: source.key,
        label: source.label,
        kind: source.kind
      })),
      categories: await activeSource.listCategories()
    };
  },

  async listFiles(input: LogFilesQuery) {
    return resolveLogSource(input.source).listFiles(input);
  },

  async readEntries(input: LogEntriesQuery) {
    return resolveLogSource(input.source).readEntries(input);
  },

  // Keep an async raw-read helper for future adapters (object storage, cloud log sinks).
  async readRawFile(category: AdminLogCategory, fileName: string, sourceKey?: string) {
    const source = resolveLogSource(sourceKey);
    if (source.kind !== "local-files") {
      throw new Error("Raw file reads are not supported for this log source.");
    }

    const baseDir = getLogCategoryDir(category);
    const normalizedFileName = path.basename(fileName);
    const absolutePath = path.resolve(baseDir, normalizedFileName);
    return readFile(absolutePath, "utf8");
  }
};
