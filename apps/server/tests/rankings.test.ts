import { dbPool, resetDatabaseState, runMigrations, seedDatabase } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authRepo } from "../src/modules/auth/auth.repo";
import { app } from "../src/app";

function extractCookie(setCookie: string | null) {
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

describe("rankings flows", () => {
  it("returns official rankings plus persisted community rankings", async () => {
    const response = await app.request(API_ROUTES.rankings.overview, { method: "GET" });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      official: {
        items: Array<{ id: string; averageScore: number; linkedModel: { slug: string } | null }>;
      };
      community: Array<{ id: string; items: Array<{ id: string; title: string }> }>;
    };

    expect(payload.official.items.length).toBeGreaterThanOrEqual(5);
    expect(payload.official.items[0]?.averageScore).toBeGreaterThanOrEqual(
      payload.official.items[1]?.averageScore ?? 0
    );
    expect(payload.community.length).toBeGreaterThanOrEqual(1);
    expect(payload.community[0]?.items.length).toBeGreaterThan(0);
  });

  it("supports ranking detail, item detail, rating and comments", async () => {
    const cookie = await loginUser("13800138000");

    const overviewResponse = await app.request(API_ROUTES.rankings.overview, {
      method: "GET",
      headers: { cookie }
    });
    const overviewPayload = (await overviewResponse.json()) as {
      community: Array<{ id: string; items: Array<{ id: string }> }>;
    };
    const rankingId = overviewPayload.community[0]?.id;
    const rankingItemId = overviewPayload.community[0]?.items[0]?.id;

    expect(rankingId).toBeTruthy();
    expect(rankingItemId).toBeTruthy();

    const rankingDetailResponse = await app.request(API_ROUTES.rankings.detail(rankingId!), {
      method: "GET",
      headers: { cookie }
    });
    expect(rankingDetailResponse.status).toBe(200);

    const rankingCommentResponse = await app.request(API_ROUTES.rankings.comments(rankingId!), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "这份榜单对我选购城市航拍设备很有帮助。"
      })
    });
    expect(rankingCommentResponse.status).toBe(200);

    const ratingResponse = await app.request(API_ROUTES.rankings.itemRatings(rankingItemId!), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rating: 5
      })
    });
    expect(ratingResponse.status).toBe(200);

    const itemCommentResponse = await app.request(API_ROUTES.rankings.itemComments(rankingItemId!), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "这一项放在榜首完全合理。"
      })
    });
    expect(itemCommentResponse.status).toBe(200);

    const itemDetailResponse = await app.request(API_ROUTES.rankings.itemDetail(rankingItemId!), {
      method: "GET",
      headers: { cookie }
    });
    expect(itemDetailResponse.status).toBe(200);
    const itemDetailPayload = (await itemDetailResponse.json()) as {
      item: {
        myRating: number | null;
        comments: Array<{ content: string }>;
      };
    };

    expect(itemDetailPayload.item.myRating).toBe(5);
    expect(itemDetailPayload.item.comments.some((item) => item.content.includes("榜首"))).toBe(true);
  });
});
