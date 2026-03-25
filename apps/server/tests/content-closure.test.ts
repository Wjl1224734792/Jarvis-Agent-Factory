import { dbPool, resetDatabaseState, runMigrations, seedDatabase } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authRepo } from "../src/modules/auth/auth.repo";
import { app } from "../src/app";

function extractCookie(setCookie: string | null): string {
  if (!setCookie) {
    throw new Error("missing set-cookie header");
  }

  return setCookie.split(";")[0];
}

async function loginUser(phone: string) {
  const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, { method: "POST" });
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
  await seedDatabase();
});

afterAll(async () => {
  await dbPool.end();
});

describe("content closure flows", () => {
  it("exposes content categories and auto-approves aircraft submissions into the model library", async () => {
    const categoriesResponse = await app.request(API_ROUTES.content.categories, { method: "GET" });
    expect(categoriesResponse.status).toBe(200);

    const categoriesPayload = (await categoriesResponse.json()) as {
      items: Array<{ slug: string }>;
    };
    expect(categoriesPayload.items.length).toBeGreaterThanOrEqual(5);

    const cookie = await loginUser("13800138199");
    const submissionResponse = await app.request(API_ROUTES.submissions.create, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        brandName: "FeiJia Labs",
        modelName: "Sky Weaver X1",
        aircraftType: "无人机",
        powerType: "electric",
        summary: "自动审核直过的投稿样本",
        description: "用于验证飞行器投稿会进入模型库。",
        coverImageUrl: null,
        galleryImageUrls: [],
        videoUrl: null,
        maxFlightTimeMinutes: 38,
        maxRangeKilometers: 22,
        maxSpeedKph: 64,
        takeoffWeightGrams: 920
      })
    });

    expect(submissionResponse.status).toBe(200);
    const submissionPayload = (await submissionResponse.json()) as {
      item: { status: string; approvedModelSlug: string | null };
    };

    expect(submissionPayload.item.status).toBe("approved");
    expect(submissionPayload.item.approvedModelSlug).toBeTruthy();

    const modelsResponse = await app.request(API_ROUTES.models.list, { method: "GET" });
    const modelsPayload = (await modelsResponse.json()) as {
      items: Array<{ slug: string }>;
    };

    expect(
      modelsPayload.items.some((item) => item.slug === submissionPayload.item.approvedModelSlug)
    ).toBe(true);
  });
});
