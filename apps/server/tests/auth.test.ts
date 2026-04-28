import { dbPool, hashPassword, runMigrations } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildDefaultCorsOrigins } from "../src/lib/cors-origins";
import { redis, resetRedisForTesting } from "../src/modules/auth/redis-client";
import { app, resolveCorsOrigin } from "../src/app";
import {
  completeRegistrationIfNeeded,
  extractCookies,
  requestCaptcha,
  loginAdmin,
  loginWebUser,
  requestCaptchaAndSms,
  resolveSmsCode
} from "./auth-test-helpers";
import { resetIntegrationState } from "./test-state";
import { readCaptchaAnswerForTests } from "./captcha-test-helpers";
import { restoreEnvValue, restoreEnvValues } from "./env-test-helpers";

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

const TEST_REGISTRATION_PASSWORD = "StrongPass#2026";
const TEST_AUTH_CODE_HASH_SECRET = "feijia-dev-auth-code-hash-secret";

type LoginHeaders = Record<string, string>;
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

function readCookieValue(cookieHeader: string, name: string) {
  const matched = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!matched) {
    throw new Error(`Missing cookie ${name}`);
  }

  return matched.slice(name.length + 1);
}

async function requestAdminLoginWithCaptcha(
  credentials: { account: string; password: string },
  headers: LoginHeaders = {},
  captcha?: { challengeId: string; captchaCode: string }
) {
  const { challengeId, captchaCode } = captcha ?? (await requestCaptcha(headers));
  return app.request(API_ROUTES.auth.adminLogin, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify({
      ...credentials,
      captchaChallengeId: challengeId,
      captchaCode
    })
  });
}

const originalUploadMaxImageSizeMb = process.env.UPLOAD_MAX_IMAGE_SIZE_MB;
const originalUploadMaxAvatarImageSizeMb =
  process.env.UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB;

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  restoreEnvValues({
    UPLOAD_MAX_IMAGE_SIZE_MB: originalUploadMaxImageSizeMb,
    UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB: originalUploadMaxAvatarImageSizeMb
  });
  await resetIntegrationState("auth");
});

afterAll(async () => {
  restoreEnvValues({
    UPLOAD_MAX_IMAGE_SIZE_MB: originalUploadMaxImageSizeMb,
    UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB: originalUploadMaxAvatarImageSizeMb
  });
  // The server suite shares one cached dbPool across files; ending it here
  // breaks later integration files running in the same Vitest process.
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

  it("rejects wildcard cors origins in production", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousCorsOrigin = process.env.CORS_ORIGIN;
    const previousCorsOrigins = process.env.CORS_ORIGINS;

    process.env.NODE_ENV = "production";
    process.env.CORS_ORIGIN = "all";
    delete process.env.CORS_ORIGINS;

    try {
      expect(() => resolveCorsOrigin()).toThrow(/CORS_ORIGIN=all/i);
    } finally {
      restoreEnvValues({
        NODE_ENV: previousNodeEnv,
        CORS_ORIGIN: previousCorsOrigin,
        CORS_ORIGINS: previousCorsOrigins
      });
    }
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
        password: TEST_REGISTRATION_PASSWORD,
        avatarFileId: null
      })
    });
    expect(completeResponse.status).toBe(200);
    const userLookup = await dbPool.query<{ password_hash: string | null }>(
      `select password_hash from users where phone = $1`,
      ["13800138000"]
    );
    expect(userLookup.rows).toHaveLength(1);
    expect(userLookup.rows[0]?.password_hash).toBeTruthy();
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

  it("supports web password login with captcha and rejects invalid captcha", async () => {
    const phone = "13800138700";
    const smsPayload = await requestCaptchaAndSms(phone);
    const loginResponse = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone,
        smsCode: smsPayload.smsCode
      })
    });
    expect(loginResponse.status).toBe(200);
    const registrationPayload = (await loginResponse.json()) as {
      kind: "registration_required";
      registrationToken: string;
    };
    expect(registrationPayload.kind).toBe("registration_required");

    const registerResponse = await app.request(API_ROUTES.auth.webRegisterComplete, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        registrationToken: registrationPayload.registrationToken,
        displayName: "Password Pilot",
        password: TEST_REGISTRATION_PASSWORD,
        avatarFileId: null
      })
    });
    expect(registerResponse.status).toBe(200);

    const invalidCaptcha = await requestCaptcha();
    const invalidLoginResponse = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        method: "password",
        phone,
        password: TEST_REGISTRATION_PASSWORD,
        captchaChallengeId: invalidCaptcha.challengeId,
        captchaCode: "0000"
      })
    });
    expect(invalidLoginResponse.status).toBe(400);
    expect(await invalidLoginResponse.json()).toMatchObject({ code: "INVALID_CAPTCHA" });

    const validCaptcha = await requestCaptcha();
    const passwordLoginResponse = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        method: "password",
        phone,
        password: TEST_REGISTRATION_PASSWORD,
        captchaChallengeId: validCaptcha.challengeId,
        captchaCode: validCaptcha.captchaCode
      })
    });
    expect(passwordLoginResponse.status).toBe(200);
    const passwordLoginPayload = (await passwordLoginResponse.json()) as {
      kind: "authenticated";
      user: { id: string };
    };
    expect(passwordLoginPayload.kind).toBe("authenticated");
    expect(passwordLoginPayload.user.id).toBeTruthy();
  });

  it("rate limits web password login failures by phone and source ip", async () => {
    const phone = "13800138701";
    await loginWebUser(phone, { "x-forwarded-for": "203.0.113.51" });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const captcha = await requestCaptcha({ "x-forwarded-for": "203.0.113.51" });
      const failedResponse = await app.request(API_ROUTES.auth.webLogin, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.51"
        },
        body: JSON.stringify({
          method: "password",
          phone,
          password: "WrongPass#2026",
          captchaChallengeId: captcha.challengeId,
          captchaCode: captcha.captchaCode
        })
      });
      expect(failedResponse.status).toBe(400);
    }

    const lockedCaptcha = await requestCaptcha({ "x-forwarded-for": "203.0.113.51" });
    const lockedResponse = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.51"
      },
      body: JSON.stringify({
        method: "password",
        phone,
        password: TEST_REGISTRATION_PASSWORD,
        captchaChallengeId: lockedCaptcha.challengeId,
        captchaCode: lockedCaptcha.captchaCode
      })
    });
    expect(lockedResponse.status).toBe(429);
    expect(await lockedResponse.json()).toMatchObject({ code: "RATE_LIMITED" });

    const otherIpCaptcha = await requestCaptcha({ "x-forwarded-for": "203.0.113.52" });
    const otherIpResponse = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.52"
      },
      body: JSON.stringify({
        method: "password",
        phone,
        password: TEST_REGISTRATION_PASSWORD,
        captchaChallengeId: otherIpCaptcha.challengeId,
        captchaCode: otherIpCaptcha.captchaCode
      })
    });
    expect(otherIpResponse.status).toBe(200);
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

  it("stores verification answers as hashes and keeps sms usable after one wrong attempt", async () => {
    const phone = "13800138221";
    const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
      method: "POST"
    });
    expect(captchaResponse.status).toBe(200);
    const captchaPayload = (await captchaResponse.json()) as {
      challengeId: string;
      imageOrText: string;
    };
    const captchaAnswer = await readCaptchaAnswerForTests(captchaPayload.challengeId);
    const rawCaptcha = await redis.get(`captcha:${captchaPayload.challengeId}`);
    expect(rawCaptcha).toBeTruthy();
    expect(rawCaptcha).not.toContain(captchaAnswer);
    expect(JSON.parse(rawCaptcha ?? "{}")).toMatchObject({
      codeHash: expect.any(String)
    });

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
    const rawSms = await redis.get(`sms:${phone}`);
    expect(rawSms).toBeTruthy();
    expect(rawSms).not.toContain(smsCode);
    expect(JSON.parse(rawSms ?? "{}")).toMatchObject({
      codeHash: expect.any(String),
      requestId: expect.any(String)
    });

    const wrongLoginResponse = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone,
        smsCode: "000000"
      })
    });
    expect(wrongLoginResponse.status).toBe(400);

    const loginResponse = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone,
        smsCode
      })
    });
    expect(loginResponse.status).toBe(200);
    await expect(loginResponse.json()).resolves.toMatchObject({
      kind: "registration_required",
      phone
    });
  });

  it("limits sms requests by client ip across different phones", async () => {
    const clientIp = "203.0.113.7";

    async function requestSmsFor(phone: string) {
      const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
        method: "POST",
        headers: { "x-forwarded-for": clientIp }
      });
      const captchaPayload = (await captchaResponse.json()) as {
        challengeId: string;
      };
      const captchaAnswer = await readCaptchaAnswerForTests(captchaPayload.challengeId);

      return app.request(API_ROUTES.auth.smsRequest, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": clientIp
        },
        body: JSON.stringify({
          phone,
          captchaChallengeId: captchaPayload.challengeId,
          captchaCode: captchaAnswer
        })
      });
    }

    for (let offset = 0; offset < 10; offset += 1) {
      const response = await requestSmsFor(`138001382${String(30 + offset).padStart(2, "0")}`);
      expect(response.status).toBe(200);
    }

    const limitedResponse = await requestSmsFor("13800138240");
    expect(limitedResponse.status).toBe(429);
    await expect(limitedResponse.json()).resolves.toMatchObject({
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
        password: TEST_REGISTRATION_PASSWORD,
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
        password: TEST_REGISTRATION_PASSWORD,
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

  it("revokes user web sessions after changing password", async () => {
    const cookie = await loginWebUser("13800138997");
    const changeResponse = await app.request(API_ROUTES.auth.webChangePassword, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        currentPassword: TEST_REGISTRATION_PASSWORD,
        newPassword: "AnotherPass#2026"
      })
    });
    expect(changeResponse.status).toBe(200);

    const afterChangeProtected = await app.request(API_ROUTES.auth.protectedPing, {
      method: "GET",
      headers: { cookie }
    });
    expect(afterChangeProtected.status).toBe(401);

    const validCaptcha = await requestCaptcha();
    const loginWithNewPassword = await app.request(API_ROUTES.auth.webLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        method: "password",
        phone: "13800138997",
        password: "AnotherPass#2026",
        captchaChallengeId: validCaptcha.challengeId,
        captchaCode: validCaptcha.captchaCode
      })
    });
    expect(loginWithNewPassword.status).toBe(200);
    const loginPayload = (await loginWithNewPassword.json()) as {
      kind: "authenticated";
      user: { id: string };
    };
    expect(loginPayload.kind).toBe("authenticated");

    const newCookie = extractCookies(loginWithNewPassword);
    const revertChange = await app.request(API_ROUTES.auth.webChangePassword, {
      method: "POST",
      headers: {
        cookie: newCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        currentPassword: "AnotherPass#2026",
        newPassword: TEST_REGISTRATION_PASSWORD
      })
    });
    expect(revertChange.status).toBe(200);

    const verifyUserResponse = await app.request(API_ROUTES.auth.protectedPing, {
      method: "GET",
      headers: { cookie: newCookie }
    });
    expect(verifyUserResponse.status).toBe(401);
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
      restoreEnvValue("UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB", previousValue);
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

    const adminCookie = await loginAdmin();

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

  it("rejects admin-role web sessions from admin-only routes", async () => {
    await dbPool.query(
      `update users set phone = $1 where account = 'admin' and role = 'admin'`,
      ["13800138666"]
    );

    const adminWebCookie = await loginWebUser("13800138666");

    const adminProtected = await app.request(API_ROUTES.auth.adminProtectedPing, {
      method: "GET",
      headers: { cookie: adminWebCookie }
    });
    expect(adminProtected.status).toBe(403);

    const adminMe = await app.request(API_ROUTES.auth.adminCurrentUser, {
      method: "GET",
      headers: { cookie: adminWebCookie }
    });
    expect(adminMe.status).toBe(200);
    await expect(adminMe.json()).resolves.toMatchObject({
      user: null
    });
  });

  it("rotates web refresh tokens and revokes the session on replay", async () => {
    const cookie = await loginWebUser("13800138676");
    const originalRefreshToken = readCookieValue(cookie, "feijia_refresh");

    const refreshResponse = await app.request(API_ROUTES.auth.webRefresh, {
      method: "POST",
      headers: { cookie }
    });
    expect(refreshResponse.status).toBe(200);
    const refreshedCookie = extractCookies(refreshResponse);
    const rotatedRefreshToken = readCookieValue(refreshedCookie, "feijia_refresh");
    expect(rotatedRefreshToken).not.toBe(originalRefreshToken);

    const replayResponse = await app.request(API_ROUTES.auth.webRefresh, {
      method: "POST",
      headers: {
        cookie: `feijia_refresh=${originalRefreshToken}`
      }
    });
    expect(replayResponse.status).toBe(401);

    const afterReplayResponse = await app.request(API_ROUTES.auth.webRefresh, {
      method: "POST",
      headers: { cookie: refreshedCookie }
    });
    expect(afterReplayResponse.status).toBe(401);
  });

  it("returns TOKEN_EXPIRED when the access cookie is expired but refresh may still recover", async () => {
    const cookie = await loginWebUser("13800138678");
    const accessToken = readCookieValue(cookie, "feijia_access");
    await dbPool.query(
      `update sessions set access_expires_at = now() - interval '1 second' where id = $1`,
      [accessToken]
    );

    const meResponse = await app.request(API_ROUTES.auth.currentUser, {
      method: "GET",
      headers: { cookie }
    });
    expect(meResponse.status).toBe(401);
    await expect(meResponse.json()).resolves.toMatchObject({
      code: "TOKEN_EXPIRED"
    });
  });

  it("keeps web and app refresh tokens scoped to their own clients", async () => {
    const webCookie = await loginWebUser("13800138686");
    const webRefreshToken = readCookieValue(webCookie, "feijia_refresh");

    const appLoginPayload = await requestCaptchaAndSms("13800138696");
    const appLoginResponse = await app.request(API_ROUTES.auth.appLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "13800138696",
        smsCode: appLoginPayload.smsCode,
        deviceLabel: "iPhone 16 Pro"
      })
    });
    const appLoginResult = (await appLoginResponse.json()) as {
      kind: "registration_required";
      registrationToken: string;
    };
    const appRegisterResponse = await app.request(API_ROUTES.auth.appRegisterComplete, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        registrationToken: appLoginResult.registrationToken,
        displayName: "移动端隔离测试",
        password: TEST_REGISTRATION_PASSWORD,
        avatarFileId: null,
        deviceLabel: "iPhone 16 Pro"
      })
    });
    const appRegisterPayload = (await appRegisterResponse.json()) as {
      refreshToken: string;
    };

    const appTokenOnWebRefresh = await app.request(API_ROUTES.auth.webRefresh, {
      method: "POST",
      headers: {
        cookie: `feijia_refresh=${appRegisterPayload.refreshToken}`
      }
    });
    expect(appTokenOnWebRefresh.status).toBe(401);

    const webTokenOnAppRefresh = await app.request(API_ROUTES.auth.appRefresh, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        refreshToken: webRefreshToken
      })
    });
    expect(webTokenOnAppRefresh.status).toBe(400);
  });

  it("scopes admin login lockout to the account and source ip", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failedResponse = await requestAdminLoginWithCaptcha(
        {
          account: "admin",
          password: "wrong-password"
        },
        { "x-forwarded-for": "203.0.113.41" }
      );
      expect(failedResponse.status).toBe(400);
    }

    const lockedResponse = await requestAdminLoginWithCaptcha(
      { account: "admin", password: "Admin#123" },
      { "x-forwarded-for": "203.0.113.41" }
    );
    expect(lockedResponse.status).toBe(429);

    const otherIpResponse = await requestAdminLoginWithCaptcha(
      { account: "admin", password: "Admin#123" },
      { "x-forwarded-for": "203.0.113.42" }
    );
    expect(otherIpResponse.status).toBe(200);
  });

  it("rejects admin login with invalid captcha code", async () => {
    const captcha = await requestCaptcha();
    const response = await app.request(API_ROUTES.auth.adminLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        account: "admin",
        password: "Admin#123",
        captchaChallengeId: captcha.challengeId,
        captchaCode: "0000"
      })
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_CAPTCHA" });
  });

  it("marks auth cookies as secure in production mode", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousAuthCodeHashSecret = process.env.AUTH_CODE_HASH_SECRET;
    process.env.AUTH_CODE_HASH_SECRET = TEST_AUTH_CODE_HASH_SECRET;
    const captcha = await requestCaptcha();
    process.env.NODE_ENV = "production";

    try {
      const loginResponse = await requestAdminLoginWithCaptcha(
        {
          account: "admin",
          password: "Admin#123"
        },
        {},
        captcha
      );

      expect(loginResponse.status).toBe(200);
      const setCookies = loginResponse.headers.getSetCookie();
      const rawSetCookie = loginResponse.headers.get("set-cookie");
      const cookieHeaders = setCookies.length > 0 ? setCookies : rawSetCookie ? [rawSetCookie] : [];

      expect(cookieHeaders.length).toBeGreaterThan(0);
      expect(cookieHeaders.every((cookie) => cookie.includes("Secure"))).toBe(true);
    } finally {
      restoreEnvValues({
        NODE_ENV: previousNodeEnv,
        AUTH_CODE_HASH_SECRET: previousAuthCodeHashSecret
      });
    }
  });

  it("allows admins to change password and requires the new password on next login", async () => {
    try {
      const adminCookie = await loginAdmin();

      const changePasswordResponse = await app.request(API_ROUTES.auth.adminChangePassword, {
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

      const oldPasswordLoginResponse = await requestAdminLoginWithCaptcha({
        account: "admin",
        password: "Admin#123"
      });
      expect(oldPasswordLoginResponse.status).toBe(400);

      const newPasswordLoginResponse = await requestAdminLoginWithCaptcha({
        account: "admin",
        password: "Admin#456"
      });
      expect(newPasswordLoginResponse.status).toBe(200);
      const newPasswordAdminCookie = extractCookies(newPasswordLoginResponse);

      const restorePasswordResponse = await app.request(API_ROUTES.auth.adminChangePassword, {
        method: "POST",
        headers: {
          cookie: newPasswordAdminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          currentPassword: "Admin#456",
          newPassword: "Admin#123"
        })
      });
      expect(restorePasswordResponse.status).toBe(200);
    } finally {
      const restoredHash = await hashPassword("Admin#123");
      await dbPool.query(
        `update users set password_hash = $1 where account = 'admin' and role = 'admin'`,
        [restoredHash]
      );
    }
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

    const adminCookie = await loginAdmin();

    const recentSessionsResponse = await app.request(API_ROUTES.auth.adminSessions, {
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

    const suggestResponse = await app.request(API_ROUTES.auth.registrationDisplayNameSuggest, {
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
        password: TEST_REGISTRATION_PASSWORD,
        avatarFileId: null
      })
    });
    expect(completeResponse.status).toBe(200);
    expect(completeResponse.headers.get("set-cookie")).toBeTruthy();
  });

  it("supports app login, registration completion, refresh, me and logout", async () => {
    const loginPayload = await requestCaptchaAndSms("13800138141");
    const appLoginResponse = await app.request(API_ROUTES.auth.appLogin, {
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

    const appRegisterResponse = await app.request(API_ROUTES.auth.appRegisterComplete, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "FeijiaApp/1.0 (iOS 18.0; iPhone16,2)",
        "x-forwarded-for": "198.51.100.18"
      },
      body: JSON.stringify({
        registrationToken: (appLoginPayload as { registrationToken: string }).registrationToken,
        displayName: "移动端飞友",
        password: TEST_REGISTRATION_PASSWORD,
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

    const meResponse = await app.request(API_ROUTES.auth.appCurrentUser, {
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

    const refreshResponse = await app.request(API_ROUTES.auth.appRefresh, {
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

    const logoutResponse = await app.request(API_ROUTES.auth.appLogout, {
      method: "POST",
      headers: {
        authorization: `Bearer ${refreshPayload.accessToken}`
      }
    });
    expect(logoutResponse.status).toBe(200);

    const afterLogoutResponse = await app.request(API_ROUTES.auth.appCurrentUser, {
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
