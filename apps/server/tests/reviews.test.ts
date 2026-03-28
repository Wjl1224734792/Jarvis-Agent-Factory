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

async function loginAdmin() {
  const loginResponse = await app.request(API_ROUTES.auth.adminLogin, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      account: "admin",
      password: "Admin#123"
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

describe("reviews flows", () => {
  it("allows a logged-in user to create or update a unique review", async () => {
    const cookie = await loginUser("13800138000");

    const beforeResponse = await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "GET",
      headers: { cookie }
    });
    const beforePayload = (await beforeResponse.json()) as {
      summary: { totalReviews: number };
    };

    const createResponse = await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rating: 4,
        content: "续航稳定，适合周末飞行。"
      })
    });

    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as {
      item: { id: string; rating: number };
      summary: { totalReviews: number; averageScore: number };
    };
    expect(created.item.rating).toBe(4);
    expect(created.summary.totalReviews).toBe(beforePayload.summary.totalReviews + 1);

    const updateResponse = await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rating: 5,
        content: "更新后的点评。"
      })
    });

    const updated = (await updateResponse.json()) as {
      item: { id: string; rating: number; content: string | null };
      summary: { totalReviews: number; averageScore: number };
    };

    expect(updated.item.id).toBe(created.item.id);
    expect(updated.item.rating).toBe(5);
    expect(updated.summary.totalReviews).toBe(created.summary.totalReviews);
  });

  it("returns review list, summary and myReview on detail reviews endpoint", async () => {
    const cookie = await loginUser("13800138000");

    await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rating: 4,
        content: "总体不错。"
      })
    });

    const response = await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "GET",
      headers: { cookie }
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      items: Array<{ id: string }>;
      summary: { totalReviews: number; myReview: { rating: number } | null };
    };

    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.summary.totalReviews).toBeGreaterThan(0);
    expect(payload.summary.myReview?.rating).toBe(4);
  });

  it("allows admin to hide a review from public list", async () => {
    const userCookie = await loginUser("13800138000");

    const createdResponse = await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "POST",
      headers: {
        cookie: userCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rating: 3,
        content: "需要进一步调校。"
      })
    });
    const createdPayload = (await createdResponse.json()) as {
      item: { id: string };
    };

    const adminCookie = await loginAdmin();
    const updateResponse = await app.request(API_ROUTES.models.adminReviewDetail(createdPayload.item.id), {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "hidden"
      })
    });

    expect(updateResponse.status).toBe(200);

    const publicResponse = await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "GET",
      headers: {
        cookie: userCookie
      }
    });
    const publicPayload = (await publicResponse.json()) as {
      items: Array<{ id: string }>;
    };

    expect(publicPayload.items.some((item) => item.id === createdPayload.item.id)).toBe(false);
  });

  it("supports review comment, reply and delete flows", async () => {
    const reviewerCookie = await loginUser("13800138020");
    const reviewResponse = await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "POST",
      headers: {
        cookie: reviewerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rating: 4,
        content: "Solid climb profile in steady wind."
      })
    });
    const reviewPayload = (await reviewResponse.json()) as { item: { id: string } };

    const commenterCookie = await loginUser("13800138021");
    const createCommentResponse = await app.request(
      API_ROUTES.models.reviewComments(reviewPayload.item.id),
      {
        method: "POST",
        headers: {
          cookie: commenterCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          content: "Thanks for sharing this field result."
        })
      }
    );

    expect(createCommentResponse.status).toBe(200);
    const createdComment = (await createCommentResponse.json()) as { item: { id: string } };

    const replyResponse = await app.request(API_ROUTES.models.reviewComments(reviewPayload.item.id), {
      method: "POST",
      headers: {
        cookie: reviewerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "Glad it helps.",
        parentCommentId: createdComment.item.id
      })
    });
    expect(replyResponse.status).toBe(200);

    const listResponse = await app.request(API_ROUTES.models.reviewComments(reviewPayload.item.id), {
      method: "GET"
    });
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      items: Array<{ id: string; replyCount: number }>;
    };

    expect(listPayload.items).toHaveLength(1);
    expect(listPayload.items[0]?.replyCount).toBe(1);

    const deleteResponse = await app.request(
      API_ROUTES.models.reviewCommentDetail(reviewPayload.item.id, createdComment.item.id),
      {
        method: "DELETE",
        headers: {
          cookie: commenterCookie
        }
      }
    );
    expect(deleteResponse.status).toBe(200);

    const listAfterDeleteResponse = await app.request(API_ROUTES.models.reviewComments(reviewPayload.item.id), {
      method: "GET"
    });
    const listAfterDeletePayload = (await listAfterDeleteResponse.json()) as {
      items: Array<{ id: string }>;
    };
    expect(listAfterDeletePayload.items).toHaveLength(0);
  });
});
