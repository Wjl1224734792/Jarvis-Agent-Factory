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
  await seedDatabase();
});

afterAll(async () => {
  await dbPool.end();
});

describe("rankings flows", () => {
  it("returns official and community rankings", async () => {
    const response = await app.request(API_ROUTES.rankings.overview, {
      method: "GET"
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      official: {
        items: Array<{
          bayesianScore: number;
          totalReviews: number;
          reputation: { label: string };
        }>;
      };
      community: Array<{ items: Array<{ model: { slug: string } }> }>;
    };

    expect(payload.official.items.length).toBeGreaterThanOrEqual(5);
    expect(payload.official.items[0]!.bayesianScore).toBeGreaterThanOrEqual(
      payload.official.items[1]!.bayesianScore
    );
    expect(payload.official.items.some((item) => item.totalReviews === 0)).toBe(true);
    expect(payload.official.items.some((item) => item.reputation.label === "神机")).toBe(true);
    expect(payload.community.length).toBeGreaterThanOrEqual(2);
    expect(payload.community[0]!.items.length).toBeGreaterThan(0);
  });

  it("includes the current user's quick rating in ranking items", async () => {
    const cookie = await loginUser("13800138000");

    await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rating: 5,
        content: null
      })
    });

    const response = await app.request(API_ROUTES.rankings.overview, {
      method: "GET",
      headers: {
        cookie
      }
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      official: {
        items: Array<{ model: { slug: string }; myRating: number | null }>;
      };
    };

    expect(payload.official.items.find((item) => item.model.slug === "joby-s4")?.myRating).toBe(5);
  });
});
