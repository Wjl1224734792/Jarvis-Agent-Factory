import { describe, expect, it } from "vitest";
import {
  adminLogEntriesQuerySchema,
  adminLogEntriesResponseSchema,
  adminLogFilesQuerySchema,
  adminLogsOverviewResponseSchema
} from "../src";

describe("admin logs contract", () => {
  it("parses overview payload", () => {
    const payload = adminLogsOverviewResponseSchema.parse({
      item: {
        mode: "file",
        dir: "E:/CodeStore/feijia/apps/server/logs",
        level: "INFO",
        maxReadLines: 200,
        activeSourceKey: "local-files",
        sources: [
          {
            key: "local-files",
            label: "本地文件日志",
            kind: "local-files"
          }
        ],
        categories: [
          {
            category: "app",
            fileCount: 2,
            totalSizeBytes: 2048,
            latestFileName: "app-2026-04-14.log",
            latestFileModifiedAt: "2026-04-14T12:00:00.000Z"
          }
        ]
      }
    });

    expect(payload.item.categories[0]?.category).toBe("app");
    expect(payload.item.level).toBe("INFO");
  });

  it("parses files and entry queries", () => {
    const filesQuery = adminLogFilesQuerySchema.parse({
      source: "local-files",
      category: "error",
      limit: 20
    });
    const entriesQuery = adminLogEntriesQuerySchema.parse({
      source: "local-files",
      category: "request",
      fileName: "request-2026-04-14.log",
      limit: 120,
      level: "WARN",
      search: "GET /admin"
    });

    expect(filesQuery.category).toBe("error");
    expect(entriesQuery.fileName).toBe("request-2026-04-14.log");
    expect(entriesQuery.level).toBe("WARN");
  });

  it("parses log entry response payload", () => {
    const payload = adminLogEntriesResponseSchema.parse({
      file: {
        sourceKey: "local-files",
        category: "request",
        fileName: "request-2026-04-14.log",
        pathLabel: "request/request-2026-04-14.log",
        sizeBytes: 1024,
        modifiedAt: "2026-04-14T12:00:00.000Z"
      },
      totalLines: 3,
      items: [
        {
          raw: '2026-04-14T12:00:00.000Z [INFO] GET /admin/logs {"status":200}',
          timestamp: "2026-04-14T12:00:00.000Z",
          level: "INFO",
          message: "GET /admin/logs",
          meta: {
            status: 200
          }
        }
      ]
    });

    expect(payload.items[0]?.message).toBe("GET /admin/logs");
    expect(payload.file.category).toBe("request");
  });
});
