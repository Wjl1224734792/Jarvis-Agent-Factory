import { describe, expect, it } from "vitest";
import { healthResponseSchema, healthRoute } from "../src/health";

describe("health contract", () => {
  it("exposes a stable route path", () => {
    expect(healthRoute.path).toBe("/health");
    expect(healthRoute.method).toBe("GET");
  });

  it("parses the shared health response payload", () => {
    const payload = healthResponseSchema.parse({
      status: "ok",
      service: "server",
      timestamp: "2026-03-22T08:00:00.000Z",
      version: "0.1.0"
    });

    expect(payload.status).toBe("ok");
    expect(payload.service).toBe("server");
  });
});
