import { describe, expect, it } from "vitest";
import { API_ROUTES } from "@feijia/shared";
import { app } from "../src/app";

describe("API route versioning", () => {
  it("serves business APIs under /api/v1 and rejects the legacy unversioned auth refresh path", async () => {
    const versionedResponse = await app.request(API_ROUTES.auth.webRefresh, {
      method: "POST"
    });

    expect(versionedResponse.status).toBe(401);

    const legacyResponse = await app.request("/auth/web/refresh", {
      method: "POST"
    });

    expect(legacyResponse.status).toBe(404);
  });
});
