import { describe, expect, it } from "vitest";
import {
  adminBanUserInputSchema,
  adminUserListQuerySchema,
  adminUserResponseSchema,
  adminUsersResponseSchema,
  userStatusSchema
} from "../src/users";

const nowIso = new Date("2026-04-25T00:00:00.000Z").toISOString();

describe("admin users contract", () => {
  it("parses admin user filters and ban inputs", () => {
    const query = adminUserListQuerySchema.parse({
      keyword: "  Pilot  ",
      status: "banned",
      role: "user",
      page: "2",
      pageSize: "10"
    });
    const ban = adminBanUserInputSchema.parse({
      reason: "spam reports",
      bannedUntil: nowIso
    });

    expect(userStatusSchema.parse("active")).toBe("active");
    expect(query.keyword).toBe("Pilot");
    expect(query.status).toBe("banned");
    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(10);
    expect(ban.reason).toBe("spam reports");
    expect(ban.bannedUntil).toBe(nowIso);
  });

  it("parses admin user list and detail responses", () => {
    const user = {
      id: "user_1",
      displayName: "Pilot 1",
      avatarUrl: null,
      role: "user",
      status: "banned",
      phone: "13800138000",
      phoneMasked: "138****8000",
      createdAt: nowIso,
      updatedAt: nowIso,
      bannedAt: nowIso,
      bannedUntil: null,
      banReason: "spam",
      bannedBy: {
        id: "admin_1",
        displayName: "系统管理员"
      },
      lastSeenAt: nowIso,
      activeSessionCount: 0,
      contentCounts: {
        posts: 1,
        comments: 2,
        reviews: 0,
        rankings: 0,
        aircraftSubmissions: 0,
        brandApplications: 0
      }
    };

    const list = adminUsersResponseSchema.parse({
      items: [user],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1
      }
    });
    const detail = adminUserResponseSchema.parse({
      item: {
        ...user,
        recentSessions: [
          {
            id: "sess_1",
            scope: "web",
            clientIp: "127.0.0.1",
            userAgent: "Vitest",
            deviceLabel: "Vitest",
            status: "revoked",
            createdAt: nowIso,
            lastSeenAt: nowIso,
            revokedAt: nowIso,
            expiresAt: nowIso
          }
        ]
      }
    });

    expect(list.items[0]?.status).toBe("banned");
    expect(detail.item.recentSessions[0]?.status).toBe("revoked");
  });
});
