import { dbPool, resetDatabaseState, runMigrations, seedDatabase } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authRepo } from "../src/modules/auth/auth.repo";
import { resetRedisForTesting } from "../src/modules/auth/redis-client";
import { app } from "../src/app";

function extractCookies(response: Response): string {
  const setCookies = response.headers.getSetCookie();
  if (setCookies.length === 0) {
    throw new Error("missing set-cookie headers");
  }
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
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

  return completeRegistrationIfNeeded(loginResponse);
}

async function loginAdmin() {
  const response = await app.request(API_ROUTES.auth.adminLogin, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      account: "admin",
      password: "Admin#123"
    })
  });

  return extractCookies(response);
}

async function readCurrentUserId(cookie: string) {
  const response = await app.request(API_ROUTES.auth.currentUser, {
    method: "GET",
    headers: { cookie }
  });
  expect(response.status).toBe(200);
  const payload = (await response.json()) as { user: { id: string } | null };
  expect(payload.user?.id).toBeTruthy();
  return payload.user?.id ?? "";
}

async function readFirstContentCategoryId() {
  const response = await app.request(API_ROUTES.content.categories, {
    method: "GET"
  });
  expect(response.status).toBe(200);
  const payload = (await response.json()) as { items: Array<{ id: string }> };
  expect(payload.items[0]?.id).toBeTruthy();
  return payload.items[0]?.id ?? "";
}

async function createArticle(
  cookie: string,
  input: { title: string; content: string; contentCategoryId: string }
) {
  const response = await app.request(API_ROUTES.posts.create, {
    method: "POST",
    headers: {
      cookie,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      type: "article",
      title: input.title,
      content: input.content,
      contentCategoryId: input.contentCategoryId,
      imageIds: [],
      videoIds: []
    })
  });
  expect(response.status).toBe(200);
  return (await response.json()) as { item: { id: string } };
}

async function publishPost(adminCookie: string, postId: string) {
  const response = await app.request(API_ROUTES.posts.adminDetail(postId), {
    method: "PUT",
    headers: {
      cookie: adminCookie,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      status: "published"
    })
  });

  expect(response.status).toBe(200);
}

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  await resetRedisForTesting();
  authRepo.resetEphemeralState();
  await resetDatabaseState();
  await seedDatabase();
});

afterAll(async () => {
  await dbPool.end();
});

describe("search routes", () => {
  it("returns published article matches in exact -> prefix -> contains order", async () => {
    const adminCookie = await loginAdmin();
    const authorCookie = await loginWebUser("13800138191");
    const categoryId = await readFirstContentCategoryId();

    const exactPost = await createArticle(authorCookie, {
      title: "OrionSearch",
      content: "Exact search candidate",
      contentCategoryId: categoryId
    });
    const prefixPost = await createArticle(authorCookie, {
      title: "OrionSearch Pro",
      content: "Prefix search candidate",
      contentCategoryId: categoryId
    });
    const containsPost = await createArticle(authorCookie, {
      title: "Best OrionSearch Camera",
      content: "Contains search candidate",
      contentCategoryId: categoryId
    });
    const pendingPost = await createArticle(authorCookie, {
      title: "OrionSearch Pending",
      content: "Should stay hidden from public search",
      contentCategoryId: categoryId
    });

    await publishPost(adminCookie, exactPost.item.id);
    await publishPost(adminCookie, prefixPost.item.id);
    await publishPost(adminCookie, containsPost.item.id);

    const response = await app.request(`${API_ROUTES.search.site}?q=OrionSearch`, {
      method: "GET"
    });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      items: Array<{
        id: string;
        type: string;
        title: string;
      }>;
    };

    const articleItems = payload.items.filter((item) => item.type === "post_article");
    expect(articleItems.slice(0, 3).map((item) => item.id)).toEqual([
      exactPost.item.id,
      prefixPost.item.id,
      containsPost.item.id
    ]);
    expect(articleItems.some((item) => item.id === pendingPost.item.id)).toBe(false);
  });

  it("respects follower and private profile visibility in public user search", async () => {
    const ownerCookie = await loginWebUser("13800138192");
    const followerCookie = await loginWebUser("13800138193");
    const strangerCookie = await loginWebUser("13800138194");
    const ownerId = await readCurrentUserId(ownerCookie);

    const followersOnlyName = "SearchVisibilityFollowers";
    const privateName = "SearchVisibilityPrivate";

    const followersUpdateResponse = await app.request(API_ROUTES.users.meProfile, {
      method: "PUT",
      headers: {
        cookie: ownerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        displayName: followersOnlyName,
        profileVisibility: "followers"
      })
    });
    expect(followersUpdateResponse.status).toBe(200);

    const strangerSearchResponse = await app.request(
      `${API_ROUTES.search.site}?q=${followersOnlyName}`,
      {
        method: "GET",
        headers: { cookie: strangerCookie }
      }
    );
    expect(strangerSearchResponse.status).toBe(200);
    const strangerSearchPayload = (await strangerSearchResponse.json()) as {
      items: Array<{ type: string; id: string }>;
    };
    expect(
      strangerSearchPayload.items.some((item) => item.type === "user" && item.id === ownerId)
    ).toBe(false);

    const followResponse = await app.request(API_ROUTES.social.follow(ownerId), {
      method: "POST",
      headers: { cookie: followerCookie }
    });
    expect(followResponse.status).toBe(200);

    const followerSearchResponse = await app.request(
      `${API_ROUTES.search.site}?q=${followersOnlyName}`,
      {
        method: "GET",
        headers: { cookie: followerCookie }
      }
    );
    expect(followerSearchResponse.status).toBe(200);
    const followerSearchPayload = (await followerSearchResponse.json()) as {
      items: Array<{ type: string; id: string }>;
    };
    expect(
      followerSearchPayload.items.some((item) => item.type === "user" && item.id === ownerId)
    ).toBe(true);

    const privateUpdateResponse = await app.request(API_ROUTES.users.meProfile, {
      method: "PUT",
      headers: {
        cookie: ownerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        displayName: privateName,
        profileVisibility: "private"
      })
    });
    expect(privateUpdateResponse.status).toBe(200);

    const privateStrangerSearchResponse = await app.request(
      `${API_ROUTES.search.site}?q=${privateName}`,
      {
        method: "GET",
        headers: { cookie: strangerCookie }
      }
    );
    expect(privateStrangerSearchResponse.status).toBe(200);
    const privateStrangerPayload = (await privateStrangerSearchResponse.json()) as {
      items: Array<{ type: string; id: string }>;
    };
    expect(
      privateStrangerPayload.items.some((item) => item.type === "user" && item.id === ownerId)
    ).toBe(false);

    const ownerSearchResponse = await app.request(`${API_ROUTES.search.site}?q=${privateName}`, {
      method: "GET",
      headers: { cookie: ownerCookie }
    });
    expect(ownerSearchResponse.status).toBe(200);
    const ownerSearchPayload = (await ownerSearchResponse.json()) as {
      items: Array<{ type: string; id: string }>;
    };
    expect(
      ownerSearchPayload.items.some((item) => item.type === "user" && item.id === ownerId)
    ).toBe(true);
  });

  it("returns admin search results with section and status metadata", async () => {
    const adminCookie = await loginAdmin();
    const authorCookie = await loginWebUser("13800138195");
    const categoryId = await readFirstContentCategoryId();

    await createArticle(authorCookie, {
      title: "AdminSearchPendingArticle",
      content: "Pending moderation article for admin search metadata.",
      contentCategoryId: categoryId
    });

    const pendingPostResponse = await app.request(
      `${API_ROUTES.search.admin}?q=AdminSearchPendingArticle`,
      {
        method: "GET",
        headers: { cookie: adminCookie }
      }
    );
    expect(pendingPostResponse.status).toBe(200);
    const pendingPostPayload = (await pendingPostResponse.json()) as {
      items: Array<{
        type: string;
        section: string;
        statusLabel: string | null;
      }>;
    };
    expect(
      pendingPostPayload.items.some(
        (item) =>
          item.type === "post_article" &&
          item.section === "moderation" &&
          item.statusLabel === "待审核"
      )
    ).toBe(true);

    const moderationResponse = await app.request(`${API_ROUTES.search.admin}?q=DJI`, {
      method: "GET",
      headers: { cookie: adminCookie }
    });
    expect(moderationResponse.status).toBe(200);
    const moderationPayload = (await moderationResponse.json()) as {
      items: Array<{
        type: string;
        section: string;
        statusLabel: string | null;
      }>;
    };

    expect(
      moderationPayload.items.some(
        (item) => item.type === "model" && item.section === "operations"
      )
    ).toBe(true);
    expect(
      moderationPayload.items.some(
        (item) => item.type === "brand" && item.section === "management"
      )
    ).toBe(true);
  });
});
