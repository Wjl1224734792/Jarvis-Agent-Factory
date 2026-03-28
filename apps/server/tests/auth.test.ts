import { dbPool, resetDatabaseState, runMigrations, seedAuthDatabase } from "@feijia/db";
import { API_ROUTES, APP_PORTS } from "@feijia/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authRepo } from "../src/modules/auth/auth.repo";
import { app } from "../src/app";

function extractCookie(setCookie: string | null): string {
  if (!setCookie) {
    throw new Error("missing set-cookie header");
  }
  return setCookie.split(";")[0];
}

async function loginWebUser(phone: string) {
  const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
    method: "POST"
  });
  const captchaPayload = (await captchaResponse.json()) as {
    challengeId: string;
    imageOrText: string;
  };

  const smsResponse = await app.request(API_ROUTES.auth.smsRequest, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phone,
      captchaChallengeId: captchaPayload.challengeId,
      captchaCode: captchaPayload.imageOrText
    })
  });
  const smsPayload = (await smsResponse.json()) as { mockCode?: string };

  const loginResponse = await app.request(API_ROUTES.auth.webLogin, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phone,
      captchaChallengeId: captchaPayload.challengeId,
      captchaCode: captchaPayload.imageOrText,
      smsCode: smsPayload.mockCode
    })
  });

  return extractCookie(loginResponse.headers.get("set-cookie"));
}

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  authRepo.resetEphemeralState();
  await resetDatabaseState();
  await seedAuthDatabase();
});

afterAll(async () => {
  await dbPool.end();
});

describe("auth flows", () => {
  it("returns credential-friendly CORS headers for web and admin origins", async () => {
    const webOrigin = `http://localhost:${APP_PORTS.web}`;
    const adminOrigin = `http://localhost:${APP_PORTS.admin}`;

    const preflightResponse = await app.request(API_ROUTES.auth.webLogin, {
      method: "OPTIONS",
      headers: {
        origin: webOrigin,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type"
      }
    });

    expect(preflightResponse.status).toBe(204);
    expect(preflightResponse.headers.get("access-control-allow-origin")).toBe(webOrigin);
    expect(preflightResponse.headers.get("access-control-allow-credentials")).toBe("true");
    expect(preflightResponse.headers.get("access-control-allow-methods")).toContain("POST");
    expect(preflightResponse.headers.get("access-control-allow-headers")).toContain(
      "content-type"
    );

    const meResponse = await app.request(API_ROUTES.auth.currentUser, {
      method: "GET",
      headers: {
        origin: adminOrigin
      }
    });

    expect(meResponse.headers.get("access-control-allow-origin")).toBe(adminOrigin);
    expect(meResponse.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("supports web captcha + sms + login + me + logout flow", async () => {
    const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
      method: "POST"
    });
    expect(captchaResponse.status).toBe(200);
    const captchaPayload = (await captchaResponse.json()) as {
      challengeId: string;
      imageOrText: string;
    };

    const smsResponse = await app.request(API_ROUTES.auth.smsRequest, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138000",
        captchaChallengeId: captchaPayload.challengeId,
        captchaCode: captchaPayload.imageOrText
      })
    });
    expect(smsResponse.status).toBe(200);
    const smsPayload = (await smsResponse.json()) as { mockCode?: string };
    expect(smsPayload.mockCode).toBeDefined();

    const loginResponse = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138000",
        captchaChallengeId: captchaPayload.challengeId,
        captchaCode: captchaPayload.imageOrText,
        smsCode: smsPayload.mockCode
      })
    });
    expect(loginResponse.status).toBe(200);
    const userCookie = extractCookie(loginResponse.headers.get("set-cookie"));

    const meResponse = await app.request(API_ROUTES.auth.currentUser, {
      method: "GET",
      headers: { cookie: userCookie }
    });
    expect(meResponse.status).toBe(200);
    const mePayload = (await meResponse.json()) as {
      user: { role: string; avatarUrl: string | null } | null;
    };
    expect(mePayload.user?.role).toBe("user");
    expect(mePayload.user?.avatarUrl ?? null).toBeNull();

    const logoutResponse = await app.request(API_ROUTES.auth.logout, {
      method: "POST",
      headers: { cookie: userCookie }
    });
    expect(logoutResponse.status).toBe(200);

    const meAfterLogout = await app.request(API_ROUTES.auth.currentUser, {
      method: "GET",
      headers: { cookie: userCookie }
    });
    const meAfterPayload = (await meAfterLogout.json()) as { user: unknown };
    expect(meAfterPayload.user).toBeNull();
  });

  it("supports reading and updating current user profile and settings", async () => {
    const cookie = await loginWebUser("13800138009");

    const beforeResponse = await app.request(API_ROUTES.users.meProfile, {
      method: "GET",
      headers: { cookie }
    });
    expect(beforeResponse.status).toBe(200);
    const beforePayload = (await beforeResponse.json()) as {
      item: {
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        phone: string | null;
        phoneMasked: string | null;
        profileVisibility: "community" | "followers" | "private";
        notifyComments: boolean;
        notifyMentions: boolean;
        sessionAlerts: boolean;
        emailDigest: boolean;
      };
    };
    expect(beforePayload.item.displayName).toBeTruthy();
    expect(beforePayload.item.bio).toBeNull();
    expect(beforePayload.item.avatarUrl).toBeNull();
    expect(beforePayload.item.phone).toBe("13800138009");
    expect(beforePayload.item.phoneMasked).toMatch(/8009$/);
    expect(beforePayload.item.profileVisibility).toBe("community");
    expect(beforePayload.item.notifyComments).toBe(true);
    expect(beforePayload.item.notifyMentions).toBe(true);
    expect(beforePayload.item.sessionAlerts).toBe(true);
    expect(beforePayload.item.emailDigest).toBe(false);

    const updateResponse = await app.request(API_ROUTES.users.meProfile, {
      method: "PUT",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        displayName: "Profile Pilot",
        bio: "Low altitude test profile.",
        avatarUrl: "https://cdn.example.com/avatar/profile-pilot.png",
        phone: "13800139009",
        profileVisibility: "followers",
        notifyComments: false,
        notifyMentions: false,
        sessionAlerts: false,
        emailDigest: true
      })
    });
    expect(updateResponse.status).toBe(200);

    const updatedPayload = (await updateResponse.json()) as {
      item: {
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        phone: string | null;
        phoneMasked: string | null;
        profileVisibility: "community" | "followers" | "private";
        notifyComments: boolean;
        notifyMentions: boolean;
        sessionAlerts: boolean;
        emailDigest: boolean;
      };
    };
    expect(updatedPayload.item.displayName).toBe("Profile Pilot");
    expect(updatedPayload.item.bio).toBe("Low altitude test profile.");
    expect(updatedPayload.item.avatarUrl).toBe(
      "https://cdn.example.com/avatar/profile-pilot.png"
    );
    expect(updatedPayload.item.phone).toBe("13800139009");
    expect(updatedPayload.item.phoneMasked).toMatch(/9009$/);
    expect(updatedPayload.item.profileVisibility).toBe("followers");
    expect(updatedPayload.item.notifyComments).toBe(false);
    expect(updatedPayload.item.notifyMentions).toBe(false);
    expect(updatedPayload.item.sessionAlerts).toBe(false);
    expect(updatedPayload.item.emailDigest).toBe(true);

    const partialUpdateResponse = await app.request(API_ROUTES.users.meProfile, {
      method: "PUT",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        notifyComments: true
      })
    });
    expect(partialUpdateResponse.status).toBe(200);

    const afterResponse = await app.request(API_ROUTES.users.meProfile, {
      method: "GET",
      headers: { cookie }
    });
    const afterPayload = (await afterResponse.json()) as {
      item: {
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        phone: string | null;
        phoneMasked: string | null;
        profileVisibility: "community" | "followers" | "private";
        notifyComments: boolean;
        notifyMentions: boolean;
        sessionAlerts: boolean;
        emailDigest: boolean;
      };
    };
    expect(afterPayload.item.displayName).toBe("Profile Pilot");
    expect(afterPayload.item.bio).toBe("Low altitude test profile.");
    expect(afterPayload.item.avatarUrl).toBe(
      "https://cdn.example.com/avatar/profile-pilot.png"
    );
    expect(afterPayload.item.phone).toBe("13800139009");
    expect(afterPayload.item.phoneMasked).toMatch(/9009$/);
    expect(afterPayload.item.profileVisibility).toBe("followers");
    expect(afterPayload.item.notifyComments).toBe(true);
    expect(afterPayload.item.notifyMentions).toBe(false);
    expect(afterPayload.item.sessionAlerts).toBe(false);
    expect(afterPayload.item.emailDigest).toBe(true);
  });

  it("supports requesting and confirming a phone rebind with masked profile output", async () => {
    const cookie = await loginWebUser("13800138019");

    const beforeResponse = await app.request(API_ROUTES.users.meProfile, {
      method: "GET",
      headers: { cookie }
    });
    const beforePayload = (await beforeResponse.json()) as {
      item: {
        phone: string | null;
        phoneMasked: string | null;
      };
    };
    expect(beforePayload.item.phone).toBe("13800138019");
    expect(beforePayload.item.phoneMasked).toMatch(/8019$/);

    const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
      method: "POST"
    });
    const captchaPayload = (await captchaResponse.json()) as {
      challengeId: string;
      imageOrText: string;
    };

    const requestResponse = await app.request(API_ROUTES.users.mePhoneChangeRequest, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        phone: "13800138119",
        captchaChallengeId: captchaPayload.challengeId,
        captchaCode: captchaPayload.imageOrText
      })
    });
    expect(requestResponse.status).toBe(200);
    const requestPayload = (await requestResponse.json()) as {
      requestId: string;
      expiresInSeconds: number;
      mockCode?: string;
    };
    expect(requestPayload.requestId).toBeTruthy();
    expect(requestPayload.mockCode).toBeTruthy();

    const confirmResponse = await app.request(API_ROUTES.users.mePhoneChangeConfirm, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        phone: "13800138119",
        requestId: requestPayload.requestId,
        smsCode: requestPayload.mockCode
      })
    });
    expect(confirmResponse.status).toBe(200);
    const confirmPayload = (await confirmResponse.json()) as {
      item: {
        phone: string | null;
        phoneMasked: string | null;
      };
    };
    expect(confirmPayload.item.phone).toBe("13800138119");
    expect(confirmPayload.item.phoneMasked).toMatch(/8119$/);

    const afterResponse = await app.request(API_ROUTES.users.meProfile, {
      method: "GET",
      headers: { cookie }
    });
    const afterPayload = (await afterResponse.json()) as {
      item: {
        phone: string | null;
        phoneMasked: string | null;
      };
    };
    expect(afterPayload.item.phone).toBe("13800138119");
    expect(afterPayload.item.phoneMasked).toMatch(/8119$/);
  });

  it("rejects phone rebind confirmation when the target phone is already taken", async () => {
    const cookie = await loginWebUser("13800138029");
    await loginWebUser("13800138039");

    const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
      method: "POST"
    });
    const captchaPayload = (await captchaResponse.json()) as {
      challengeId: string;
      imageOrText: string;
    };

    const requestResponse = await app.request(API_ROUTES.users.mePhoneChangeRequest, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        phone: "13800138039",
        captchaChallengeId: captchaPayload.challengeId,
        captchaCode: captchaPayload.imageOrText
      })
    });
    expect(requestResponse.status).toBe(200);
    const requestPayload = (await requestResponse.json()) as {
      requestId: string;
      mockCode?: string;
    };

    const confirmResponse = await app.request(API_ROUTES.users.mePhoneChangeConfirm, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        phone: "13800138039",
        requestId: requestPayload.requestId,
        smsCode: requestPayload.mockCode
      })
    });
    expect(confirmResponse.status).toBe(409);
  });

  it("rejects protected route without session", async () => {
    const response = await app.request(API_ROUTES.auth.protectedPing, {
      method: "GET"
    });
    expect(response.status).toBe(401);
  });

  it("supports admin login and enforces admin-only access", async () => {
    const userCaptchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
      method: "POST"
    });
    const userCaptcha = (await userCaptchaResponse.json()) as {
      challengeId: string;
      imageOrText: string;
    };
    const userSmsResponse = await app.request(API_ROUTES.auth.smsRequest, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138001",
        captchaChallengeId: userCaptcha.challengeId,
        captchaCode: userCaptcha.imageOrText
      })
    });
    const userSms = (await userSmsResponse.json()) as { mockCode?: string };
    const userLogin = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138001",
        captchaChallengeId: userCaptcha.challengeId,
        captchaCode: userCaptcha.imageOrText,
        smsCode: userSms.mockCode
      })
    });
    const userCookie = extractCookie(userLogin.headers.get("set-cookie"));

    const forbiddenResponse = await app.request(API_ROUTES.auth.adminProtectedPing, {
      method: "GET",
      headers: { cookie: userCookie }
    });
    expect(forbiddenResponse.status).toBe(403);

    const adminLoginResponse = await app.request(API_ROUTES.auth.adminLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        account: "admin",
        password: "Admin#123"
      })
    });
    expect(adminLoginResponse.status).toBe(200);
    const adminCookie = extractCookie(adminLoginResponse.headers.get("set-cookie"));

    const adminMe = await app.request(API_ROUTES.auth.adminCurrentUser, {
      method: "GET",
      headers: { cookie: adminCookie }
    });
    expect(adminMe.status).toBe(200);
    const adminMePayload = (await adminMe.json()) as {
      user: { role: string } | null;
    };
    expect(adminMePayload.user?.role).toBe("admin");

    const adminProtected = await app.request(API_ROUTES.auth.adminProtectedPing, {
      method: "GET",
      headers: { cookie: adminCookie }
    });
    expect(adminProtected.status).toBe(200);
  });
});
