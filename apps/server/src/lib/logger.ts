import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export const LOG_CATEGORIES = ["app", "request", "error", "security"] as const;

export type LogCategory = (typeof LOG_CATEGORIES)[number];
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
export type LogMode = "auto" | "console" | "file" | "both";

const levelRank: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};

function parseLogMode(value: string | undefined): LogMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "console" || normalized === "file" || normalized === "both") {
    return normalized;
  }

  return "auto";
}

function parseLogLevel(value: string | undefined): LogLevel {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "DEBUG" || normalized === "INFO" || normalized === "WARN" || normalized === "ERROR") {
    return normalized;
  }

  return process.env.NODE_ENV === "production" ? "INFO" : "DEBUG";
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveLogDir(value: string | undefined) {
  const raw = value?.trim();
  if (!raw) {
    return path.resolve(process.cwd(), "logs");
  }

  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

export function getLoggerConfig() {
  const configuredMode = parseLogMode(process.env.LOG_MODE);
  const mode =
    configuredMode === "auto"
      ? (process.env.NODE_ENV === "production" ? "file" : "console")
      : configuredMode;

  return {
    configuredMode,
    mode,
    level: parseLogLevel(process.env.LOG_LEVEL),
    dir: resolveLogDir(process.env.LOG_DIR),
    maxReadLines: parsePositiveInt(process.env.LOG_MAX_READ_LINES, 200)
  };
}

export const getLoggerRuntimeConfig = getLoggerConfig;

export function getLogCategoryDir(category: LogCategory) {
  return path.join(getLoggerConfig().dir, category);
}

function shouldEmit(level: LogLevel) {
  return levelRank[level] >= levelRank[getLoggerConfig().level];
}

function formatLine(
  level: LogLevel,
  category: LogCategory,
  message: string,
  meta?: Record<string, unknown>
): string {
  const ts = new Date().toISOString();
  const metaStr = meta !== undefined && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `${ts} [${level}] [${category}] ${message}${metaStr}`;
}

function logToConsole(level: LogLevel, line: string): void {
  if (level === "ERROR") {
    console.error(line);
    return;
  }
  if (level === "WARN") {
    console.warn(line);
    return;
  }
  console.info(line);
}

function appendFileLine(category: LogCategory, line: string): void {
  const categoryDir = getLogCategoryDir(category);
  try {
    mkdirSync(categoryDir, { recursive: true });
  } catch (error) {
    console.error("[logger] failed to create log directory", categoryDir, error);
    return;
  }

  const day = new Date().toISOString().slice(0, 10);
  const filePath = path.join(categoryDir, `${category}-${day}.log`);
  try {
    appendFileSync(filePath, `${line}\n`, "utf8");
  } catch (error) {
    console.error("[logger] failed to write log file", filePath, error);
  }
}

function emit(
  level: LogLevel,
  category: LogCategory,
  message: string,
  meta?: Record<string, unknown>
): void {
  if (!shouldEmit(level)) {
    return;
  }

  const { mode } = getLoggerConfig();
  const line = formatLine(level, category, message, meta);

  if (mode === "console" || mode === "both") {
    logToConsole(level, line);
  }

  if (mode === "file" || mode === "both") {
    appendFileLine(category, line);
  }
}

export function parseLogLine(raw: string) {
  const match = raw.match(
    /^(?<timestamp>\S+) \[(?<level>DEBUG|INFO|WARN|ERROR)] \[(?<category>[a-z]+)] (?<rest>.*)$/
  );

  if (!match?.groups) {
    return {
      raw,
      timestamp: null,
      level: null,
      message: raw,
      meta: null
    };
  }

  const rest = match.groups.rest ?? "";
  const metaMatch = rest.match(/^(?<message>.*?)(?: (?<meta>\{.*\}))?$/);
  const metaText = metaMatch?.groups?.meta;
  let meta: Record<string, unknown> | null = null;
  if (metaText) {
    try {
      const parsed = JSON.parse(metaText) as unknown;
      meta = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      meta = null;
    }
  }

  return {
    raw,
    timestamp: match.groups.timestamp ?? null,
    level: (match.groups.level as LogLevel | undefined) ?? null,
    message: metaMatch?.groups?.message ?? rest,
    meta
  };
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    emit("DEBUG", "app", message, meta);
  },

  info(message: string, meta?: Record<string, unknown>): void {
    emit("INFO", "app", message, meta);
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    emit("WARN", "app", message, meta);
  },

  error(message: string, meta?: Record<string, unknown>): void {
    emit("ERROR", "error", message, meta);
  },

  request(message: string, meta?: Record<string, unknown>): void {
    emit("INFO", "request", message, meta);
  },

  security(message: string, meta?: Record<string, unknown>): void {
    emit("WARN", "security", message, meta);
  }
};
