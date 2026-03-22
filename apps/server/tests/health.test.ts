import { healthResponseSchema, healthRoute } from "@feijia/schemas";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("GET /health", () => {
  it("returns the shared health payload", async () => {
    const response = await app.request(healthRoute.path, {
      method: healthRoute.method
    });

    expect(response.status).toBe(200);

    const payload = healthResponseSchema.parse(await response.json());

    expect(payload.status).toBe("ok");
    expect(payload.service).toBe("server");
  });
});
