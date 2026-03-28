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

async function completeRegistrationIfNeeded(response: Response) {
  const payload = (await response.json()) as
    | { kind: "authenticated" }
    | { kind: "registration_required"; registrationToken: string; suggestedDisplayName: string };

  if (payload.kind === "authenticated") {
    return extractCookie(response.headers.get("set-cookie"));
  }

  const completeResponse = await app.request(API_ROUTES.auth.webRegisterComplete, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      registrationToken: payload.registrationToken,
      displayName: payload.suggestedDisplayName,
      avatarUrl: null
    })
  });

  return extractCookie(completeResponse.headers.get("set-cookie"));
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

  return completeRegistrationIfNeeded(loginResponse);
}

async function updateSiteSettings(
  adminCookie: string,
  input: {
    postModerationEnabled: boolean;
    commentModerationEnabled: boolean;
    reviewModerationEnabled: boolean;
    submissionModerationEnabled: boolean;
  }
) {
  const response = await app.request(API_ROUTES.admin.siteSettings, {
    method: "PUT",
    headers: {
      cookie: adminCookie,
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });

  expect(response.status).toBe(200);
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
        content: "Stable flight profile for weekend field tests."
      })
    });

    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as {
      item: { id: string; content: string | null };
      summary: { totalReviews: number; myReview: { id: string } | null };
    };
    expect(created.item.content).toBe("Stable flight profile for weekend field tests.");
    expect(created.summary.totalReviews).toBe(beforePayload.summary.totalReviews + 1);
    expect(created.summary.myReview?.id).toBe(created.item.id);
    expect("averageScore" in created.summary).toBe(false);

    const updateResponse = await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "Updated with a longer endurance note."
      })
    });

    const updated = (await updateResponse.json()) as {
      item: { id: string; content: string | null };
      summary: { totalReviews: number };
    };

    expect(updated.item.id).toBe(created.item.id);
    expect(updated.item.content).toBe("Updated with a longer endurance note.");
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
        content: "Overall handling feels predictable in crosswind."
      })
    });

    const response = await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "GET",
      headers: { cookie }
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      items: Array<{ id: string; content: string | null }>;
      summary: { totalReviews: number; myReview: { id: string; content: string | null } | null };
    };

    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.summary.totalReviews).toBeGreaterThan(0);
    expect(payload.summary.myReview?.id).toBeTruthy();
    expect(payload.summary.myReview?.content).toBe("Overall handling feels predictable in crosswind.");
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
        content: "Needs further tuning before regular operation."
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

  it("keeps reviews pending for authors only when review moderation is enabled", async () => {
    const adminCookie = await loginAdmin();
    await updateSiteSettings(adminCookie, {
      postModerationEnabled: true,
      commentModerationEnabled: true,
      reviewModerationEnabled: true,
      submissionModerationEnabled: true
    });

    const reviewerCookie = await loginUser("13800138040");
    const createResponse = await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "POST",
      headers: {
        cookie: reviewerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "Pending review content"
      })
    });
    expect(createResponse.status).toBe(200);
    const createPayload = (await createResponse.json()) as {
      item: { id: string; status: string };
      summary: { myReview: { id: string; status: string } | null };
    };
    expect(createPayload.item.status).toBe("pending");
    expect(createPayload.summary.myReview?.status).toBe("pending");

    const publicResponse = await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "GET"
    });
    const publicPayload = (await publicResponse.json()) as {
      items: Array<{ id: string }>;
    };
    expect(publicPayload.items.some((item) => item.id === createPayload.item.id)).toBe(false);

    const reviewerView = await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "GET",
      headers: { cookie: reviewerCookie }
    });
    const reviewerPayload = (await reviewerView.json()) as {
      items: Array<{ id: string; status: string }>;
    };
    expect(reviewerPayload.items.some((item) => item.id === createPayload.item.id && item.status === "pending")).toBe(true);
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
