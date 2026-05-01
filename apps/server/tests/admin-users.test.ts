import { dbPool, runMigrations } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { resetRedisForTesting } from "../src/modules/auth/redis-client";
import { loginAdmin, loginWebUser, requestCaptchaAndSms } from "./auth-test-helpers";
import { resetIntegrationState } from "./test-state";

async function getCurrentUserId(cookie: string) {
  const response = await app.request(API_ROUTES.auth.currentUser, {
    method: "GET",
    headers: { cookie }
  });
  expect(response.status).toBe(200);

  const payload = (await response.json()) as { user: { id: string } | null };
  expect(payload.user).toBeTruthy();
  return payload.user?.id ?? "";
}

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  await resetIntegrationState("auth");
});

afterAll(async () => {
  // The server suite shares one cached dbPool across files; ending it here
  // breaks later integration files running in the same Vitest process.
});

describe("admin user management", () => {
  it("requires admin access for user management endpoints", async () => {
    const userCookie = await loginWebUser("13800138901");

    const anonymousResponse = await app.request(API_ROUTES.admin.users);
    const userResponse = await app.request(API_ROUTES.admin.users, {
      headers: { cookie: userCookie }
    });

    expect(anonymousResponse.status).toBe(401);
    expect(userResponse.status).toBe(403);
  });

  it("lists, details, bans, and unbans users", async () => {
    const userCookie = await loginWebUser("13800138902");
    const userId = await getCurrentUserId(userCookie);
    const adminCookie = await loginAdmin();

    const listResponse = await app.request(`${API_ROUTES.admin.users}?keyword=38902`, {
      headers: { cookie: adminCookie }
    });
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      items: Array<{ id: string; status: string; phoneMasked: string | null }>;
    };
    expect(listPayload.items.some((item) => item.id === userId)).toBe(true);
    expect(listPayload.items.find((item) => item.id === userId)?.phoneMasked).toBe("138****8902");

    const detailResponse = await app.request(API_ROUTES.admin.userDetail(userId), {
      headers: { cookie: adminCookie }
    });
    expect(detailResponse.status).toBe(200);
    const detailPayload = (await detailResponse.json()) as {
      item: {
        id: string;
        phoneMasked: string | null;
        activeSessionCount: number;
        recentSessions: Array<{ id: string; scope: string }>;
      };
    };
    expect(detailPayload.item.id).toBe(userId);
    expect(detailPayload.item.phoneMasked).toBe("138****8902");
    expect(detailPayload.item.activeSessionCount).toBeGreaterThan(0);
    expect(detailPayload.item.recentSessions.some((session) => session.scope === "web")).toBe(true);

    const banResponse = await app.request(API_ROUTES.admin.userBan(userId), {
      method: "POST",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({ reason: "spam reports", bannedUntil: null })
    });
    expect(banResponse.status).toBe(200);
    const banPayload = (await banResponse.json()) as { item: { status: string; banReason: string | null } };
    expect(banPayload.item.status).toBe("banned");
    expect(banPayload.item.banReason).toBe("spam reports");

    const activeSessions = await dbPool.query<{ count: string }>(
      "select count(*) from sessions where user_id = $1 and revoked_at is null",
      [userId]
    );
    expect(Number(activeSessions.rows[0]?.count ?? 0)).toBe(0);

    const protectedResponse = await app.request(API_ROUTES.auth.protectedPing, {
      headers: { cookie: userCookie }
    });
    expect(protectedResponse.status).toBe(401);

    await resetRedisForTesting();
    const bannedLoginPayload = await requestCaptchaAndSms("13800138902");
    const bannedLoginResponse = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138902",
        smsCode: bannedLoginPayload.smsCode
      })
    });
    expect(bannedLoginResponse.status).toBe(403);
    expect(await bannedLoginResponse.json()).toMatchObject({
      code: "USER_BANNED"
    });

    const unbanResponse = await app.request(API_ROUTES.admin.userUnban(userId), {
      method: "POST",
      headers: { cookie: adminCookie }
    });
    expect(unbanResponse.status).toBe(200);
    const unbanPayload = (await unbanResponse.json()) as { item: { status: string; banReason: string | null } };
    expect(unbanPayload.item.status).toBe("active");
    expect(unbanPayload.item.banReason).toBe(null);

    await resetRedisForTesting();
    const restoredCookie = await loginWebUser("13800138902");
    await expect(getCurrentUserId(restoredCookie)).resolves.toBe(userId);
  });

  it("prevents banning the current admin account", async () => {
    const adminCookie = await loginAdmin();
    const adminId = await getCurrentUserId(adminCookie);

    const response = await app.request(API_ROUTES.admin.userBan(adminId), {
      method: "POST",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({ reason: "self ban", bannedUntil: null })
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 for missing admin user detail", async () => {
    const adminCookie = await loginAdmin();

    const response = await app.request(API_ROUTES.admin.userDetail("user_missing"), {
      headers: { cookie: adminCookie }
    });

    expect(response.status).toBe(404);
  });
});
