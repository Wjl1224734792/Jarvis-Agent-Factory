import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { dbPool, resetDatabaseState, runMigrations, seedAuthDatabase } from "@feijia/db";
import { app } from "../src/app";
import { authRepo } from "../src/modules/auth/auth.repo";
import { resetRedisForTesting } from "../src/modules/auth/redis-client";

let tempLogDir = "";

async function loginAdmin() {
  const response = await app.request("/auth/admin/login", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      account: "admin",
      password: "Admin#123"
    })
  });

  expect(response.status).toBe(200);
  return response.headers.get("set-cookie") ?? "";
}

function writeLog(category: string, fileName: string, lines: string[]) {
  const dir = path.join(tempLogDir, category);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, fileName), `${lines.join("\n")}\n`, "utf8");
}

beforeEach(() => {
  tempLogDir = mkdtempSync(path.join(os.tmpdir(), "feijia-admin-logs-"));
  process.env.LOG_DIR = tempLogDir;
  process.env.LOG_MODE = "file";
  process.env.LOG_LEVEL = "INFO";
  process.env.LOG_MAX_READ_LINES = "50";

  writeLog("app", "app-2026-04-14.log", [
    '2026-04-14T10:00:00.000Z [INFO] [app] server started {"port":17382}'
  ]);
  writeLog("request", "request-2026-04-14.log", [
    '2026-04-14T10:01:00.000Z [INFO] [request] GET /admin/logs {"status":200,"ms":12}',
    '2026-04-14T10:02:00.000Z [WARN] [request] GET /admin/reports {"status":500,"ms":42}'
  ]);
  writeLog("error", "error-2026-04-14.log", [
    '2026-04-14T10:03:00.000Z [ERROR] [error] unexpected server error {"path":"/admin/logs"}'
  ]);
});

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  await resetRedisForTesting();
  authRepo.resetEphemeralState();
  await resetDatabaseState();
  await seedAuthDatabase();
});

afterEach(() => {
  rmSync(tempLogDir, { recursive: true, force: true });
  delete process.env.LOG_DIR;
  delete process.env.LOG_MODE;
  delete process.env.LOG_LEVEL;
  delete process.env.LOG_MAX_READ_LINES;
});

afterAll(async () => {
  await dbPool.end();
});

describe("admin logs route", () => {
  it("returns logs overview for admins", async () => {
    const cookie = await loginAdmin();
    const response = await app.request("/admin/logs/overview", {
      method: "GET",
      headers: {
        Cookie: cookie
      }
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      item: {
        dir: string;
        activeSourceKey: string;
        sources: Array<{ key: string }>;
        categories: Array<{ category: string; fileCount: number }>;
      };
    };

    expect(payload.item.dir).toBe(tempLogDir);
    expect(payload.item.activeSourceKey).toBe("local-files");
    expect(payload.item.sources[0]?.key).toBe("local-files");
    expect(payload.item.categories.find((item) => item.category === "request")?.fileCount).toBe(1);
  });

  it("lists files by category and reads filtered entries", async () => {
    const cookie = await loginAdmin();
    const filesResponse = await app.request("/admin/logs/files?category=request&limit=10", {
      method: "GET",
      headers: {
        Cookie: cookie
      }
    });

    expect(filesResponse.status).toBe(200);
    const filesPayload = (await filesResponse.json()) as {
      items: Array<{ fileName: string; category: string; sourceKey: string; pathLabel: string }>;
    };
    expect(filesPayload.items[0]?.category).toBe("request");
    expect(filesPayload.items[0]?.sourceKey).toBe("local-files");
    expect(filesPayload.items[0]?.pathLabel).toContain("request");

    const entriesResponse = await app.request(
      `/admin/logs/entries?category=request&fileName=${encodeURIComponent(filesPayload.items[0]?.fileName ?? "")}&level=WARN&limit=10`,
      {
        method: "GET",
        headers: {
          Cookie: cookie
        }
      }
    );

    expect(entriesResponse.status).toBe(200);
    const entriesPayload = (await entriesResponse.json()) as {
      totalLines: number;
      items: Array<{ level: string | null; message: string }>;
    };
    expect(entriesPayload.totalLines).toBe(1);
    expect(entriesPayload.items[0]?.level).toBe("WARN");
    expect(entriesPayload.items[0]?.message).toContain("GET /admin/reports");
  });
});
