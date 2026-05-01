import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src";
import { API_ROUTES } from "@feijia/shared";

const nowIso = new Date("2026-04-25T00:00:00.000Z").toISOString();

function buildUserPayload() {
  return {
    id: "user_1",
    displayName: "Pilot 1",
    avatarUrl: null,
    role: "user",
    status: "active",
    phone: "13800138000",
    phoneMasked: "138****8000",
    createdAt: nowIso,
    updatedAt: nowIso,
    bannedAt: null,
    bannedUntil: null,
    banReason: null,
    bannedBy: null,
    lastSeenAt: null,
    activeSessionCount: 1,
    contentCounts: {
      posts: 0,
      comments: 0,
      reviews: 0,
      rankings: 0,
      aircraftSubmissions: 0,
      brandApplications: 0
    }
  };
}

describe("admin users api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests admin users with filters and credentials", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [buildUserPayload()],
          meta: {
            page: 2,
            pageSize: 10,
            total: 1
          }
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );

    const client = createApiClient({ baseUrl: "http://localhost:17382" });
    const payload = await client.listAdminUsers({
      keyword: "Pilot",
      status: "active",
      role: "user",
      page: 2,
      pageSize: 10
    });

    expect(payload.items[0]?.displayName).toBe("Pilot 1");
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:17382${API_ROUTES.admin.users}?keyword=Pilot&status=active&role=user&page=2&pageSize=10`,
      expect.objectContaining({
        method: "GET",
        credentials: "include"
      })
    );
  });

  it("requests admin user detail, ban, and unban actions", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ item: { ...buildUserPayload(), recentSessions: [] } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            item: {
              ...buildUserPayload(),
              status: "banned",
              bannedAt: nowIso,
              banReason: "spam",
              bannedBy: { id: "admin_1", displayName: "系统管理员" },
              recentSessions: []
            }
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ item: { ...buildUserPayload(), recentSessions: [] } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

    const client = createApiClient({ baseUrl: "http://localhost:17382" });

    await client.getAdminUser("user_1");
    await client.banAdminUser("user_1", { reason: "spam", bannedUntil: null });
    await client.unbanAdminUser("user_1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `http://localhost:17382${API_ROUTES.admin.userDetail("user_1")}`,
      expect.objectContaining({ method: "GET", credentials: "include" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `http://localhost:17382${API_ROUTES.admin.userBan("user_1")}`,
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `http://localhost:17382${API_ROUTES.admin.userUnban("user_1")}`,
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
  });
});
