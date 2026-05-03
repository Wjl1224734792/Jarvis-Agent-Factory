import { API_ROUTES, APP_PORTS } from "@feijia/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../src/lib/api-client";

const baseUrl = `http://localhost:${APP_PORTS.server}`;

const admin = {
  id: "admin_1",
  displayName: "系统管理员",
  avatarUrl: null,
  ipLocationLabel: null,
  role: "admin" as const
};

describe("admin api client refresh", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refreshes an expired access cookie before returning the current admin", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "TOKEN_EXPIRED",
            message: "Access token expired."
          }),
          {
            status: 401,
            headers: { "content-type": "application/json" }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: admin }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: admin }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

    await expect(apiClient.getCurrentAdmin()).resolves.toEqual(admin);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${baseUrl}${API_ROUTES.auth.adminCurrentUser}`,
      expect.objectContaining({
        method: "GET",
        credentials: "include"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${baseUrl}${API_ROUTES.auth.webRefresh}`,
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `${baseUrl}${API_ROUTES.auth.adminCurrentUser}`,
      expect.objectContaining({
        method: "GET",
        credentials: "include"
      })
    );
  });
});
