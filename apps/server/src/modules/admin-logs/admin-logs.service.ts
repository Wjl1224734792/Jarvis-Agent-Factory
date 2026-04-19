import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import {
  access,
  readdir,
  readFile,
  stat
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
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

type ParsedLogEntry = ReturnType<typeof parseLogLine>;

type LogSourceAdapter = {
  key: string;
  label: string;
  kind: "local-files" | "journald";
  isAvailable: () => Promise<boolean>;
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
    items: ParsedLogEntry[];
  }>;
};

const execFileAsync = promisify(execFile);
let journalctlAvailable: boolean | null = null;

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

function filterEntries(
  lines: string[],
  input: { category?: AdminLogCategory; level?: string; search?: string }
) {
  return lines
    .map((raw) => parseLogLine(raw))
    .filter((entry) => {
      if (input.category && entry.raw.includes(`[${input.category}]`) === false) {
        return false;
      }

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
    async isAvailable() {
      return true;
    },
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
      const filtered = filterEntries(allLines, {
        category,
        level: input.level,
        search: input.search
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

async function ensureJournalctlAvailable() {
  if (process.platform !== "linux") {
    return false;
  }

  if (journalctlAvailable !== null) {
    return journalctlAvailable;
  }

  try {
    await execFileAsync("journalctl", ["--version"]);
    journalctlAvailable = true;
  } catch {
    journalctlAvailable = false;
  }

  return journalctlAvailable;
}

async function readJournalLines(limit: number) {
  if (!(await ensureJournalctlAvailable())) {
    return [];
  }

  const args = ["--no-pager", "-o", "cat", "-n", String(limit)];
  const unit = process.env.LOG_JOURNAL_UNIT?.trim();
  if (unit) {
    args.unshift(unit);
    args.unshift("-u");
  }

  const { stdout } = await execFileAsync("journalctl", args, {
    maxBuffer: 8 * 1024 * 1024
  });

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function createJournalLogSource(): LogSourceAdapter {
  const sourceKey = "journald";

  return {
    key: sourceKey,
    label: "systemd journal",
    kind: "journald",
    async isAvailable() {
      return ensureJournalctlAvailable();
    },
    async listCategories() {
      const lines = await readJournalLines(2000);
      return LOG_CATEGORIES.map((category) => {
        const filtered = filterEntries(lines, { category });
        const latestEntry = filtered[filtered.length - 1] ?? null;
        return {
          category,
          fileCount: filtered.length > 0 ? 1 : 0,
          totalSizeBytes: filtered.reduce((sum, entry) => sum + entry.raw.length, 0),
          latestFileName: filtered.length > 0 ? `${category}.journal` : null,
          latestFileModifiedAt: latestEntry?.timestamp ?? null
        };
      });
    },
    async listFiles(input: LogFilesQuery) {
      const category = normalizeCategory(input.category);
      const lines = await readJournalLines(2000);
      const filtered = filterEntries(lines, { category });
      if (filtered.length === 0) {
        return [];
      }

      const latestEntry = filtered[filtered.length - 1] ?? null;
      return [
        {
          sourceKey,
          category,
          fileName: `${category}.journal`,
          pathLabel: `journald/${category}`,
          sizeBytes: filtered.reduce((sum, entry) => sum + entry.raw.length, 0),
          modifiedAt: latestEntry?.timestamp ?? new Date().toISOString()
        }
      ];
    },
    async readEntries(input: LogEntriesQuery) {
      const category = normalizeCategory(input.category);
      const lines = await readJournalLines(4000);
      const filtered = filterEntries(lines, {
        category,
        level: input.level,
        search: input.search
      });
      const limit = input.limit ?? getLoggerConfig().maxReadLines;
      const latestEntry = filtered[filtered.length - 1] ?? null;

      return {
        file: {
          sourceKey,
          category,
          fileName: `${category}.journal`,
          pathLabel: `journald/${category}`,
          sizeBytes: filtered.reduce((sum, entry) => sum + entry.raw.length, 0),
          modifiedAt: latestEntry?.timestamp ?? new Date().toISOString()
        },
        totalLines: filtered.length,
        items: filtered.slice(-limit).reverse()
      };
    }
  };
}

const allLogSources = [createLocalFilesLogSource(), createJournalLogSource()] as const;

async function listAvailableLogSources() {
  const availability = await Promise.all(
    allLogSources.map(async (source) => ({
      source,
      available: await source.isAvailable()
    }))
  );

  return availability.filter((entry) => entry.available).map((entry) => entry.source);
}

async function resolveLogSource(sourceKey?: string) {
  const availableSources = await listAvailableLogSources();
  const resolved =
    availableSources.find((source) => source.key === sourceKey) ??
    availableSources[0];

  if (!resolved) {
    throw new Error("No log source configured.");
  }

  return {
    resolved,
    availableSources
  };
}

export const adminLogsService = {
  async getOverview(sourceKey?: string) {
    const config = getLoggerConfig();
    const { resolved, availableSources } = await resolveLogSource(sourceKey);

    return {
      mode: config.mode,
      dir: config.dir,
      level: config.level,
      maxReadLines: config.maxReadLines,
      activeSourceKey: resolved.key,
      sources: availableSources.map((source) => ({
        key: source.key,
        label: source.label,
        kind: source.kind
      })),
      categories: await resolved.listCategories()
    };
  },

  async listFiles(input: LogFilesQuery) {
    const { resolved } = await resolveLogSource(input.source);
    return resolved.listFiles(input);
  },

  async readEntries(input: LogEntriesQuery) {
    const { resolved } = await resolveLogSource(input.source);
    return resolved.readEntries(input);
  },

  async readRawFile(category: AdminLogCategory, fileName: string, sourceKey?: string) {
    const { resolved } = await resolveLogSource(sourceKey);
    if (resolved.kind !== "local-files") {
      throw new Error("Raw file reads are not supported for this log source.");
    }

    const baseDir = getLogCategoryDir(category);
    const normalizedFileName = path.basename(fileName);
    const absolutePath = path.resolve(baseDir, normalizedFileName);
    return readFile(absolutePath, "utf8");
  }
};
