import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOG_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../logs");

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * 是否视为生产环境（仅文件日志、无控制台输出）。
 *
 * @returns `NODE_ENV === "production"` 时为 `true`
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function formatLine(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const metaStr =
    meta !== undefined && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `${ts} [${level}] ${message}${metaStr}`;
}

let logDirEnsured = false;

/**
 * 将一行日志追加到 `logs/server-YYYY-MM-DD.log`。
 *
 * @param line - 已格式化的一行
 */
function appendProductionLine(line: string): void {
  if (!logDirEnsured) {
    try {
      mkdirSync(LOG_DIR, { recursive: true });
      logDirEnsured = true;
    } catch (e) {
      console.error("[logger] 无法创建日志目录", LOG_DIR, e);
      return;
    }
  }
  const day = new Date().toISOString().slice(0, 10);
  const filePath = path.join(LOG_DIR, `server-${day}.log`);
  try {
    appendFileSync(filePath, `${line}\n`, "utf8");
  } catch (e) {
    console.error("[logger] 写入日志失败", filePath, e);
  }
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
  console.log(line);
}

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const line = formatLine(level, message, meta);
  if (isProduction()) {
    appendProductionLine(line);
    return;
  }
  logToConsole(level, line);
}

/**
 * 应用日志：开发环境写入控制台，生产环境写入 `apps/server/logs/server-日期.log`。
 */
export const logger = {
  /**
   * 调试信息；仅开发环境输出，生产环境忽略。
   *
   * @param message - 主文案
   * @param meta - 可选结构化字段
   * @returns 无
   * @throws 不向外抛出
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    if (isProduction()) {
      return;
    }
    logToConsole("DEBUG", formatLine("DEBUG", message, meta));
  },

  /**
   * @param message - 主文案
   * @param meta - 可选结构化字段
   * @returns 无
   * @throws 不向外抛出
   */
  info(message: string, meta?: Record<string, unknown>): void {
    emit("INFO", message, meta);
  },

  /**
   * @param message - 主文案
   * @param meta - 可选结构化字段
   * @returns 无
   * @throws 不向外抛出
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    emit("WARN", message, meta);
  },

  /**
   * @param message - 主文案
   * @param meta - 可选结构化字段（如 `stack`、请求路径等）
   * @returns 无
   * @throws 不向外抛出
   */
  error(message: string, meta?: Record<string, unknown>): void {
    emit("ERROR", message, meta);
  }
};
