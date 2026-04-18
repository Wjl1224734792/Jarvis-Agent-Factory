import { dbPool, resetDatabaseState, runMigrations, seedAuthDatabase } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildDefaultCorsOrigins } from "../src/lib/cors-origins";
import { authRepo } from "../src/modules/auth/auth.repo";
import { ensureRedisConnected, redis, resetRedisForTesting } from "../src/modules/auth/redis-client";
import { app } from "../src/app";
import {
  readCaptchaAnswerForTests
} from "./captcha-test-helpers";

function extractCookies(response: Response): string {
  const setCookies = response.headers.getSetCookie();
  if (setCookies.length === 0) {
    throw new Error("missing set-cookie headers");
  }
  return setCookies.map((c) => c.split(";")[0]).join("; ");
}

function expectPresignedUrlToMatch(actualUrl: string | null, expectedUrl: string) {
  expect(actualUrl).toBeTruthy();
  if (!actualUrl) {
    return;
  }

  const actual = new URL(actualUrl);
  const expected = new URL(expectedUrl);

  expect(actual.origin).toBe(expected.origin);
  expect(actual.pathname).toBe(expected.pathname);

  for (const key of [
    "X-Amz-Algorithm",
    "X-Amz-Credential",
    "X-Amz-Date",
    "X-Amz-Expires",
    "X-Amz-Signature",
    "X-Amz-SignedHeaders",
    "x-amz-checksum-mode",
    "x-id"
  ]) {
    expect(actual.searchParams.get(key)).toBeTruthy();
  }
}

async function completeRegistrationIfNeeded(response: Response) {
  const payload = (await response.json()) as
    | { kind: "authenticated" }
    | { kind: "registration_required"; registrationToken: string; suggestedDisplayName: string };

  if (payload.kind === "authenticated") {
    return extractCookies(response);
  }

  const completeResponse = await app.request(API_ROUTES.auth.webRegisterComplete, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      registrationToken: payload.registrationToken,
      displayName: payload.suggestedDisplayName,
      avatarFileId: null
    })
  });

  return extractCookies(completeResponse);
}

async function resolveSmsCode(phone: string, payload: { mockCode?: string }) {
  if (payload.mockCode) {
    return payload.mockCode;
  }

  await ensureRedisConnected();
  const raw = await redis.get(`sms:${phone}`);
  if (!raw) {
    throw new Error(`missing sms code for ${phone}`);
  }

  const record = JSON.parse(raw) as { code: string };
  return record.code;
}

async function loginWebUser(phone: string) {
  const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
    method: "POST"
  });
  const captchaPayload = (await captchaResponse.json()) as {
    challengeId: string;
    imageOrText: string;
  };

  const captchaAnswer = await readCaptchaAnswerForTests(captchaPayload.challengeId);

  const smsResponse = await app.request(API_ROUTES.auth.smsRequest, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phone,
      captchaChallengeId: captchaPayload.challengeId,
      captchaCode: captchaAnswer
    })
  });
  expect(smsResponse.status).toBe(200);
  const smsPayload = (await smsResponse.json()) as { mockCode?: string };
  const smsCode = await resolveSmsCode(phone, smsPayload);

  const loginResponse = await app.request(API_ROUTES.auth.webLogin, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phone,
      smsCode
    })
  });

  return completeRegistrationIfNeeded(loginResponse);
}

async function requestCaptchaAndSms(phone: string) {
  const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
    method: "POST"
  });
  const captchaPayload = (await captchaResponse.json()) as {
    challengeId: string;
    imageOrText: string;
  };

  const captchaAnswer = await readCaptchaAnswerForTests(captchaPayload.challengeId);

  const smsResponse = await app.request(API_ROUTES.auth.smsRequest, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phone,
      captchaChallengeId: captchaPayload.challengeId,
      captchaCode: captchaAnswer
    })
  });
  expect(smsResponse.status).toBe(200);
  const smsPayload = (await smsResponse.json()) as { mockCode?: string };
  const smsCode = await resolveSmsCode(phone, smsPayload);

  return {
    challengeId: captchaPayload.challengeId,
    captchaCode: captchaAnswer,
    smsCode
  };
}

async function uploadAvatar(cookie: string, name = "avatar.png") {
  const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const initResponse = await app.request(API_ROUTES.uploads.init, {
    method: "POST",
    headers: {
      cookie,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      bizType: "avatar-image",
      filename: name,
      contentType: "image/png",
      size: bytes.byteLength
    })
  });
  expect(initResponse.status).toBe(200);

  const initPayload = (await initResponse.json()) as {
    fileId: string;
    upload: {
      mode: "presigned-put";
      url: string;
      headers?: Record<string, string>;
    };
  };

  const uploadResponse = await fetch(initPayload.upload.url, {
    method: "PUT",
    headers: initPayload.upload.headers,
    body: new File([bytes], name, { type: "image/png" })
  });
  expect(uploadResponse.status).toBe(200);

  const completeResponse = await app.request(API_ROUTES.uploads.complete, {
    method: "POST",
    headers: {
      cookie,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      fileId: initPayload.fileId
    })
  });
  expect(completeResponse.status).toBe(200);

  return (await completeResponse.json()) as {
    item: { id: string; url: string };
  };
}

const originalUploadMaxImageSizeMb = process.env.UPLOAD_MAX_IMAGE_SIZE_MB;
const originalUploadMaxAvatarImageSizeMb =
  process.env.UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB;

async function resetAndSeedAuthState() {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await resetRedisForTesting();
      authRepo.resetEphemeralState();
      await resetDatabaseState();
      await seedAuthDatabase();
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  process.env.UPLOAD_MAX_IMAGE_SIZE_MB = originalUploadMaxImageSizeMb;
  process.env.UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB =
    originalUploadMaxAvatarImageSizeMb;
  await resetAndSeedAuthState();
});

afterAll(async () => {
  process.env.UPLOAD_MAX_IMAGE_SIZE_MB = originalUploadMaxImageSizeMb;
  process.env.UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB =
    originalUploadMaxAvatarImageSizeMb;
  await dbPool.end();
});

describe("auth flows", () => {
  it("keeps reserved wechat identity columns on users for future login support", async () => {
    const result = await dbPool.query<{
      column_name: string;
    }>(
      `select column_name
       from information_schema.columns
       where table_name = 'users'
         and column_name in ('wechat_open_id', 'wechat_union_id')
       order by column_name`
    );

    expect(result.rows.map((row) => row.column_name)).toEqual([
      "wechat_open_id",
      "wechat_union_id"
    ]);
  });

  it("returns credential-friendly CORS headers for web and admin origins", async () => {
    const origins = buildDefaultCorsOrigins();
    const webOrigin = origins[0];
    const adminOrigin = origins[2];

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

    const captchaAnswer = await readCaptchaAnswerForTests(captchaPayload.challengeId);

    const smsResponse = await app.request(API_ROUTES.auth.smsRequest, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138000",
        captchaChallengeId: captchaPayload.challengeId,
        captchaCode: captchaAnswer
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
        smsCode: smsPayload.mockCode
      })
    });
    expect(loginResponse.status).toBe(200);
    const loginPayload = (await loginResponse.json()) as {
      kind: "registration_required";
      registrationToken: string;
      suggestedDisplayName: string;
      phone: string;
    };
    expect(loginPayload.kind).toBe("registration_required");
    expect(loginPayload.phone).toBe("13800138000");
    expect(loginPayload.registrationToken).toBeTruthy();
    expect(loginResponse.headers.get("set-cookie")).toBeNull();

    const completeResponse = await app.request(API_ROUTES.auth.webRegisterComplete, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        registrationToken: loginPayload.registrationToken,
        displayName: loginPayload.suggestedDisplayName,
        avatarFileId: null
      })
    });
    expect(completeResponse.status).toBe(200);
    const userCookie = extractCookies(completeResponse);

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

  it("returns 429 instead of 500 when sms requests hit the rate limit", async () => {
    const firstCaptchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
      method: "POST"
    });
    const firstCaptchaPayload = (await firstCaptchaResponse.json()) as {
      challengeId: string;
      imageOrText: string;
    };

    const firstCaptchaAnswer = await readCaptchaAnswerForTests(firstCaptchaPayload.challengeId);

    const firstSmsResponse = await app.request(API_ROUTES.auth.smsRequest, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138151",
        captchaChallengeId: firstCaptchaPayload.challengeId,
        captchaCode: firstCaptchaAnswer
      })
    });
    expect(firstSmsResponse.status).toBe(200);

    const secondCaptchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
      method: "POST"
    });
    const secondCaptchaPayload = (await secondCaptchaResponse.json()) as {
      challengeId: string;
      imageOrText: string;
    };

    const secondCaptchaAnswer = await readCaptchaAnswerForTests(secondCaptchaPayload.challengeId);

    const secondSmsResponse = await app.request(API_ROUTES.auth.smsRequest, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138151",
        captchaChallengeId: secondCaptchaPayload.challengeId,
        captchaCode: secondCaptchaAnswer
      })
    });

    expect(secondSmsResponse.status).toBe(429);
    await expect(secondSmsResponse.json()).resolves.toMatchObject({
      code: "SMS_RATE_LIMITED"
    });
  });

  it("returns 429 instead of 500 when sms resend hits rate limit", async () => {
    const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
      method: "POST"
    });
    const captchaPayload = (await captchaResponse.json()) as {
      challengeId: string;
      imageOrText: string;
    };

    const captchaAnswer = await readCaptchaAnswerForTests(captchaPayload.challengeId);

    const firstResponse = await app.request(API_ROUTES.auth.smsRequest, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138166",
        captchaChallengeId: captchaPayload.challengeId,
        captchaCode: captchaAnswer
      })
    });
    expect(firstResponse.status).toBe(200);

    const secondCaptchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
      method: "POST"
    });
    const secondCaptchaPayload = (await secondCaptchaResponse.json()) as {
      challengeId: string;
      imageOrText: string;
    };

    const secondCaptchaAnswer = await readCaptchaAnswerForTests(secondCaptchaPayload.challengeId);

    const secondResponse = await app.request(API_ROUTES.auth.smsRequest, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138166",
        captchaChallengeId: secondCaptchaPayload.challengeId,
        captchaCode: secondCaptchaAnswer
      })
    });

    expect(secondResponse.status).toBe(429);
    await expect(secondResponse.json()).resolves.toMatchObject({
      code: "SMS_RATE_LIMITED"
    });
  });

  it("logs in directly for an existing phone and enforces unique display names", async () => {
    const firstCookie = await loginWebUser("13800138991");
    const meResponse = await app.request(API_ROUTES.auth.currentUser, {
      method: "GET",
      headers: { cookie: firstCookie }
    });
    const mePayload = (await meResponse.json()) as { user: { displayName: string } | null };
    const existingDisplayName = mePayload.user?.displayName ?? "";
    expect(existingDisplayName).toBeTruthy();

    // 首次注册登录已经触发过一次短信发送，清空测试 Redis 状态以避免 60 秒限流干扰
    // 本用例关注的是“已注册手机号直接登录”和“用户名唯一性”，不是短信频控本身。
    await resetRedisForTesting();

    const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
      method: "POST"
    });
    const captchaPayload = (await captchaResponse.json()) as {
      challengeId: string;
      imageOrText: string;
    };
    const captchaAnswer = await readCaptchaAnswerForTests(captchaPayload.challengeId);
    const smsResponse = await app.request(API_ROUTES.auth.smsRequest, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138991",
        captchaChallengeId: captchaPayload.challengeId,
        captchaCode: captchaAnswer
      })
    });
    const smsPayload = (await smsResponse.json()) as { mockCode?: string };
    const smsCode = await resolveSmsCode("13800138991", smsPayload);
    const loginResponse = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138991",
        smsCode
      })
    });
    const loginPayload = (await loginResponse.json()) as {
      kind: "authenticated";
      user: { id: string };
    };
    expect(loginPayload.kind).toBe("authenticated");
    expect(loginResponse.headers.get("set-cookie")).toBeTruthy();

    const secondCaptchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
      method: "POST"
    });
    const secondCaptchaPayload = (await secondCaptchaResponse.json()) as {
      challengeId: string;
      imageOrText: string;
    };
    const secondCaptchaAnswer = await readCaptchaAnswerForTests(secondCaptchaPayload.challengeId);
    const secondSmsResponse = await app.request(API_ROUTES.auth.smsRequest, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138992",
        captchaChallengeId: secondCaptchaPayload.challengeId,
        captchaCode: secondCaptchaAnswer
      })
    });
    const secondSmsPayload = (await secondSmsResponse.json()) as { mockCode?: string };
    const secondSmsCode = await resolveSmsCode("13800138992", secondSmsPayload);
    const secondLoginResponse = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138992",
        smsCode: secondSmsCode
      })
    });
    const secondLoginPayload = (await secondLoginResponse.json()) as {
      kind: "registration_required";
      registrationToken: string;
    };
    expect(secondLoginPayload.kind).toBe("registration_required");

    const duplicateNameResponse = await app.request(API_ROUTES.auth.webRegisterComplete, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        registrationToken: secondLoginPayload.registrationToken,
        displayName: existingDisplayName,
        avatarFileId: null
      })
    });
    expect(duplicateNameResponse.status).toBe(409);

    const retryResponse = await app.request(API_ROUTES.auth.webRegisterComplete, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        registrationToken: secondLoginPayload.registrationToken,
        displayName: "Retry Pilot",
        avatarFileId: null
      })
    });
    expect(retryResponse.status).toBe(200);
    expect(retryResponse.headers.get("set-cookie")).toBeTruthy();
  });

  it("supports reading and updating current user profile and settings", async () => {
    const cookie = await loginWebUser("13800138009");
    const uploadedAvatar = await uploadAvatar(cookie);

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
        avatarFileId: uploadedAvatar.item.id,
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
    expectPresignedUrlToMatch(updatedPayload.item.avatarUrl, uploadedAvatar.item.url);
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
    expectPresignedUrlToMatch(afterPayload.item.avatarUrl, uploadedAvatar.item.url);
    expect(afterPayload.item.phone).toBe("13800139009");
    expect(afterPayload.item.phoneMasked).toMatch(/9009$/);
    expect(afterPayload.item.profileVisibility).toBe("followers");
    expect(afterPayload.item.notifyComments).toBe(true);
    expect(afterPayload.item.notifyMentions).toBe(false);
    expect(afterPayload.item.sessionAlerts).toBe(false);
    expect(afterPayload.item.emailDigest).toBe(true);
  });

  it("rejects avatar upload when image size exceeds configured env limit", async () => {
    const previousValue = process.env.UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB;
    process.env.UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB = "0.000001";

    try {
      const cookie = await loginWebUser("13800138188");
      const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

      const response = await app.request(API_ROUTES.uploads.init, {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          bizType: "avatar-image",
          filename: "too-large-avatar.png",
          contentType: "image/png",
          size: bytes.byteLength
        })
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        code: "BAD_REQUEST",
        message: "File size exceeds limit. Current max allowed is 0.00 MB.",
        details: {
          reason: "file_too_large",
          bizType: "avatar-image",
          mediaKind: "image",
          limit: {
            mb: "0.00"
          }
        }
      });
    } finally {
      process.env.UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB = previousValue;
    }
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

    const captchaAnswer = await readCaptchaAnswerForTests(captchaPayload.challengeId);

    const requestResponse = await app.request(API_ROUTES.users.mePhoneChangeRequest, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        phone: "13800138119",
        captchaChallengeId: captchaPayload.challengeId,
        captchaCode: captchaAnswer
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

    const captchaAnswer = await readCaptchaAnswerForTests(captchaPayload.challengeId);

    const requestResponse = await app.request(API_ROUTES.users.mePhoneChangeRequest, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        phone: "13800138039",
        captchaChallengeId: captchaPayload.challengeId,
        captchaCode: captchaAnswer
      })
    });
    expect(requestResponse.status).toBe(409);
    const requestPayload = (await requestResponse.json()) as {
      requestId: string;
      mockCode?: string;
    };

    expect("requestId" in requestPayload).toBe(false);
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
    const userCaptchaAnswer = await readCaptchaAnswerForTests(userCaptcha.challengeId);
    const userSmsResponse = await app.request(API_ROUTES.auth.smsRequest, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138001",
        captchaChallengeId: userCaptcha.challengeId,
        captchaCode: userCaptchaAnswer
      })
    });
    const userSms = (await userSmsResponse.json()) as { mockCode?: string };
    const userSmsCode = await resolveSmsCode("13800138001", userSms);
    const userLogin = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138001",
        smsCode: userSmsCode
      })
    });
    const userCookie = await completeRegistrationIfNeeded(userLogin);

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
    const adminCookie = extractCookies(adminLoginResponse);

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

  it("marks auth cookies as secure in production mode", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const loginResponse = await app.request(API_ROUTES.auth.adminLogin, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          account: "admin",
          password: "Admin#123"
        })
      });

      expect(loginResponse.status).toBe(200);
      const setCookies = loginResponse.headers.getSetCookie();
      const rawSetCookie = loginResponse.headers.get("set-cookie");
      const cookieHeaders = setCookies.length > 0 ? setCookies : rawSetCookie ? [rawSetCookie] : [];

      expect(cookieHeaders.length).toBeGreaterThan(0);
      expect(cookieHeaders.every((cookie) => cookie.includes("Secure"))).toBe(true);
    } finally {
      process.env.NODE_ENV = previousNodeEnv ?? "test";
    }
  });

  it("allows admins to change password and requires the new password on next login", async () => {
    const adminLoginResponse = await app.request(API_ROUTES.auth.adminLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        account: "admin",
        password: "Admin#123"
      })
    });
    expect(adminLoginResponse.status).toBe(200);
    const adminCookie = extractCookies(adminLoginResponse);

    const changePasswordResponse = await app.request("/auth/admin/password/change", {
      method: "POST",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        currentPassword: "Admin#123",
        newPassword: "Admin#456"
      })
    });
    expect(changePasswordResponse.status).toBe(200);

    const oldPasswordLoginResponse = await app.request(API_ROUTES.auth.adminLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        account: "admin",
        password: "Admin#123"
      })
    });
    expect(oldPasswordLoginResponse.status).toBe(400);

    const newPasswordLoginResponse = await app.request(API_ROUTES.auth.adminLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        account: "admin",
        password: "Admin#456"
      })
    });
    expect(newPasswordLoginResponse.status).toBe(200);
  });

  it("records session ip/device metadata and exposes recent sessions to admin", async () => {
    const webLoginPayload = await requestCaptchaAndSms("13800138121");
    const webLoginResponse = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
        "x-forwarded-for": "203.0.113.25"
      },
      body: JSON.stringify({
        phone: "13800138121",
        smsCode: webLoginPayload.smsCode
      })
    });
    const userCookie = await completeRegistrationIfNeeded(webLoginResponse);

    const logoutResponse = await app.request(API_ROUTES.auth.logout, {
      method: "POST",
      headers: { cookie: userCookie }
    });
    expect(logoutResponse.status).toBe(200);

    const adminLoginResponse = await app.request(API_ROUTES.auth.adminLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        account: "admin",
        password: "Admin#123"
      })
    });
    const adminCookie = extractCookies(adminLoginResponse);

    const recentSessionsResponse = await app.request("/admin/auth/sessions", {
      method: "GET",
      headers: { cookie: adminCookie }
    });
    expect(recentSessionsResponse.status).toBe(200);

    const recentSessionsPayload = (await recentSessionsResponse.json()) as {
      items: Array<{
        scope: string;
        clientIp: string | null;
        userAgent: string | null;
        deviceLabel: string | null;
        status: "active" | "revoked" | "expired";
        user: {
          phone?: string | null;
        };
      }>;
    };

    const matched = recentSessionsPayload.items.find((item) => item.user.phone === "13800138121");
    expect(matched).toBeTruthy();
    expect(matched?.scope).toBe("web");
    expect(matched?.clientIp).toBe("203.0.113.25");
    expect(matched?.userAgent).toContain("iPhone");
    expect(matched?.deviceLabel).toContain("iPhone");
    expect(matched?.status).toBe("revoked");
  });

  it("suggests a random display name without consuming the registration token", async () => {
    const loginPayload = await requestCaptchaAndSms("13800138131");
    const loginResponse = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138131",
        smsCode: loginPayload.smsCode
      })
    });
    expect(loginResponse.status).toBe(200);

    const registrationPayload = (await loginResponse.json()) as {
      kind: "registration_required";
      registrationToken: string;
      suggestedDisplayName: string;
    };
    expect(registrationPayload.kind).toBe("registration_required");

    const suggestResponse = await app.request("/auth/registration/display-name/suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        registrationToken: registrationPayload.registrationToken
      })
    });
    expect(suggestResponse.status).toBe(200);

    const suggestPayload = (await suggestResponse.json()) as {
      displayName: string;
    };
    expect(suggestPayload.displayName).toBeTruthy();
    expect(suggestPayload.displayName).not.toBe(registrationPayload.suggestedDisplayName);

    const completeResponse = await app.request(API_ROUTES.auth.webRegisterComplete, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        registrationToken: registrationPayload.registrationToken,
        displayName: suggestPayload.displayName,
        avatarFileId: null
      })
    });
    expect(completeResponse.status).toBe(200);
    expect(completeResponse.headers.get("set-cookie")).toBeTruthy();
  });

  it("supports app login, registration completion, refresh, me and logout", async () => {
    const loginPayload = await requestCaptchaAndSms("13800138141");
    const appLoginResponse = await app.request("/auth/app/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "FeijiaApp/1.0 (iOS 18.0; iPhone16,2)",
        "x-forwarded-for": "198.51.100.18"
      },
      body: JSON.stringify({
        phone: "13800138141",
        smsCode: loginPayload.smsCode,
        deviceLabel: "iPhone 16 Pro"
      })
    });
    expect(appLoginResponse.status).toBe(200);

    const appLoginPayload = (await appLoginResponse.json()) as
      | {
          kind: "registration_required";
          registrationToken: string;
          suggestedDisplayName: string;
        }
      | {
          kind: "authenticated";
          accessToken: string;
          refreshToken: string;
          user: { id: string };
        };
    expect(appLoginPayload.kind).toBe("registration_required");

    const appRegisterResponse = await app.request("/auth/app/register/complete", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "FeijiaApp/1.0 (iOS 18.0; iPhone16,2)",
        "x-forwarded-for": "198.51.100.18"
      },
      body: JSON.stringify({
        registrationToken: (appLoginPayload as { registrationToken: string }).registrationToken,
        displayName: "移动端飞友",
        avatarFileId: null,
        deviceLabel: "iPhone 16 Pro"
      })
    });
    expect(appRegisterResponse.status).toBe(200);

    const appRegisterPayload = (await appRegisterResponse.json()) as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; role: string };
    };
    expect(appRegisterPayload.accessToken).toBeTruthy();
    expect(appRegisterPayload.refreshToken).toBeTruthy();
    expect(appRegisterPayload.user.role).toBe("user");

    const meResponse = await app.request("/auth/app/me", {
      method: "GET",
      headers: {
        authorization: `Bearer ${appRegisterPayload.accessToken}`
      }
    });
    expect(meResponse.status).toBe(200);
    const mePayload = (await meResponse.json()) as {
      user: { id: string } | null;
    };
    expect(mePayload.user?.id).toBe(appRegisterPayload.user.id);

    const refreshResponse = await app.request("/auth/app/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        refreshToken: appRegisterPayload.refreshToken
      })
    });
    expect(refreshResponse.status).toBe(200);
    const refreshPayload = (await refreshResponse.json()) as {
      accessToken: string;
      refreshToken: string;
      user: { id: string };
    };
    expect(refreshPayload.accessToken).toBeTruthy();
    expect(refreshPayload.refreshToken).toBeTruthy();
    // 滑动续期：access token (session ID) 保持不变，只是续期了过期时间
    expect(refreshPayload.accessToken).toBe(appRegisterPayload.accessToken);

    const logoutResponse = await app.request("/auth/app/logout", {
      method: "POST",
      headers: {
        authorization: `Bearer ${refreshPayload.accessToken}`
      }
    });
    expect(logoutResponse.status).toBe(200);

    const afterLogoutResponse = await app.request("/auth/app/me", {
      method: "GET",
      headers: {
        authorization: `Bearer ${refreshPayload.accessToken}`
      }
    });
    expect(afterLogoutResponse.status).toBe(200);
    const afterLogoutPayload = (await afterLogoutResponse.json()) as {
      user: unknown;
    };
    expect(afterLogoutPayload.user).toBeNull();
  });
});
