import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { flushLogger, getLoggerRuntimeConfig, logger } from "../src/lib/logger";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_LOG_MODE = process.env.LOG_MODE;
const ORIGINAL_LOG_DIR = process.env.LOG_DIR;
const ORIGINAL_LOG_LEVEL = process.env.LOG_LEVEL;
const ORIGINAL_LOG_MAX_READ_LINES = process.env.LOG_MAX_READ_LINES;

let tempLogDir: string | null = null;

function restoreEnv() {
  if (ORIGINAL_NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  }
  if (ORIGINAL_LOG_MODE === undefined) {
    delete process.env.LOG_MODE;
  } else {
    process.env.LOG_MODE = ORIGINAL_LOG_MODE;
  }
  if (ORIGINAL_LOG_DIR === undefined) {
    delete process.env.LOG_DIR;
  } else {
    process.env.LOG_DIR = ORIGINAL_LOG_DIR;
  }
  if (ORIGINAL_LOG_LEVEL === undefined) {
    delete process.env.LOG_LEVEL;
  } else {
    process.env.LOG_LEVEL = ORIGINAL_LOG_LEVEL;
  }
  if (ORIGINAL_LOG_MAX_READ_LINES === undefined) {
    delete process.env.LOG_MAX_READ_LINES;
  } else {
    process.env.LOG_MAX_READ_LINES = ORIGINAL_LOG_MAX_READ_LINES;
  }
}

afterEach(() => {
  if (tempLogDir) {
    rmSync(tempLogDir, { recursive: true, force: true });
    tempLogDir = null;
  }
  restoreEnv();
});

describe("logger configuration and categorized files", () => {
  it("defaults to console mode in non-production", () => {
    process.env.NODE_ENV = "development";
    delete process.env.LOG_MODE;
    const config = getLoggerRuntimeConfig();
    expect(config.mode).toBe("console");
    expect(config.configuredMode).toBe("auto");
  });

  it("defaults to file mode in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.LOG_MODE;
    const config = getLoggerRuntimeConfig();
    expect(config.mode).toBe("file");
    expect(config.configuredMode).toBe("auto");
  });

  it("writes logs into category files when file mode is enabled", async () => {
    tempLogDir = mkdtempSync(path.join(os.tmpdir(), "feijia-logger-"));
    process.env.LOG_MODE = "file";
    process.env.LOG_DIR = tempLogDir;
    process.env.LOG_LEVEL = "DEBUG";
    process.env.NODE_ENV = "production";

    logger.info("app-log");
    logger.request("request-log");
    logger.error("error-log");
    logger.security("security-log");
    await flushLogger();

    const day = new Date().toISOString().slice(0, 10);
    const appLogFile = path.join(tempLogDir, "app", `app-${day}.log`);
    const requestLogFile = path.join(tempLogDir, "request", `request-${day}.log`);
    const errorLogFile = path.join(tempLogDir, "error", `error-${day}.log`);
    const securityLogFile = path.join(tempLogDir, "security", `security-${day}.log`);

    expect(existsSync(appLogFile)).toBe(true);
    expect(existsSync(requestLogFile)).toBe(true);
    expect(existsSync(errorLogFile)).toBe(true);
    expect(existsSync(securityLogFile)).toBe(true);

    expect(readFileSync(appLogFile, "utf8")).toContain("[app] app-log");
    expect(readFileSync(requestLogFile, "utf8")).toContain("[request] request-log");
    expect(readFileSync(errorLogFile, "utf8")).toContain("[error] error-log");
    expect(readFileSync(securityLogFile, "utf8")).toContain("[security] security-log");
  });
});
