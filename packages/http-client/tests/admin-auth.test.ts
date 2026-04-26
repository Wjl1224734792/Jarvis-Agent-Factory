import { afterEach, describe, expect, it, vi } from "vitest";
import { API_ROUTES } from "@feijia/shared";
import { createApiClient } from "../src";

describe("admin auth api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests admin password changes with credentials", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    const client = createApiClient({ baseUrl: "http://localhost:17382" });
    const payload = await client.changeAdminPassword({
      currentPassword: "Admin#123",
      newPassword: "Admin#456"
    });

    expect(payload.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:17382${API_ROUTES.auth.adminChangePassword}`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          currentPassword: "Admin#123",
          newPassword: "Admin#456"
        })
      })
    );
  });
});
