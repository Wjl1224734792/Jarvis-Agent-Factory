import { runMigrations } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { resetIntegrationState } from "./test-state";
import { loginWebUser, loginAdmin } from "./auth-test-helpers";

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

async function createMoment(
  cookie: string,
  input: { title: string; content: string }
) {
  const response = await app.request(API_ROUTES.posts.create, {
    method: "POST",
    headers: {
      cookie,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      type: "moment",
      title: input.title,
      content: input.content,
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

async function updateModerationModes(
  adminCookie: string,
  modes: {
    article?: "manual" | "ai" | "automatic";
    moment?: "manual" | "ai" | "automatic";
    comment?: "manual" | "ai" | "automatic";
    review?: "manual" | "ai" | "automatic";
    brand?: "manual" | "ai" | "automatic";
    model?: "manual" | "ai" | "automatic";
    ranking?: "manual" | "ai" | "automatic";
    ratingTarget?: "manual" | "ai" | "automatic";
  }
) {
  const response = await app.request(API_ROUTES.admin.siteSettings, {
    method: "PUT",
    headers: {
      cookie: adminCookie,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      moderationModes: modes
    })
  });

  expect(response.status).toBe(200);
}

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  await resetIntegrationState("catalog");
});

afterAll(async () => {
  // The server suite shares one cached dbPool across files; ending it here
  // breaks later integration files running in the same Vitest process.
});

describe("search routes", () => {
  it("returns published article matches in exact -> prefix -> contains order", async () => {
    const adminCookie = await loginAdmin();
    const authorCookie = await loginWebUser("13800138191");
    const categoryId = await readFirstContentCategoryId();
    await updateModerationModes(adminCookie, {
      article: "manual"
    });

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
    await updateModerationModes(adminCookie, {
      article: "manual"
    });

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

  it("caps public search results to the requested limit across groups", async () => {
    const adminCookie = await loginAdmin();
    const authorCookie = await loginWebUser("13800138196");
    const categoryId = await readFirstContentCategoryId();

    const article = await createArticle(authorCookie, {
      title: "CrossLimitCase Alpha",
      content: "Shared keyword for site search limit coverage.",
      contentCategoryId: categoryId
    });
    const moment = await createMoment(authorCookie, {
      title: "CrossLimitCase Moment",
      content: "Shared keyword for site search limit coverage."
    });
    await publishPost(adminCookie, article.item.id);
    await publishPost(adminCookie, moment.item.id);

    const profileResponse = await app.request(API_ROUTES.users.meProfile, {
      method: "PUT",
      headers: {
        cookie: authorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        displayName: "CrossLimitCase Pilot"
      })
    });
    expect(profileResponse.status).toBe(200);

    const response = await app.request(`${API_ROUTES.search.site}?q=CrossLimitCase&limit=2`, {
      method: "GET",
      headers: { cookie: authorCookie }
    });
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      total: number;
      items: Array<{ id: string; type: string }>;
    };
    expect(payload.items).toHaveLength(2);
    expect(payload.total).toBe(3);
  });

  it("caps admin search results to the requested limit across groups", async () => {
    const adminCookie = await loginAdmin();
    const authorCookie = await loginWebUser("13800138197");
    const categoryId = await readFirstContentCategoryId();

    const article = await createArticle(authorCookie, {
      title: "AdminCrossLimit Article",
      content: "Shared keyword for admin search limit coverage.",
      contentCategoryId: categoryId
    });
    const moment = await createMoment(authorCookie, {
      title: "AdminCrossLimit Moment",
      content: "Shared keyword for admin search limit coverage."
    });
    expect(article.item.id).toBeTruthy();
    expect(moment.item.id).toBeTruthy();

    const brandResponse = await app.request(API_ROUTES.models.brands, {
      method: "POST",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        slug: "admin-cross-limit",
        name: "AdminCrossLimit Brand",
        categoryId: null,
        sortOrder: 0,
        isEnabled: true,
        logoUrl: null
      })
    });
    expect(brandResponse.status).toBe(200);

    const response = await app.request(`${API_ROUTES.search.admin}?q=AdminCrossLimit&limit=2`, {
      method: "GET",
      headers: { cookie: adminCookie }
    });
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      total: number;
      items: Array<{ id: string; type: string }>;
    };
    expect(payload.items).toHaveLength(2);
    expect(payload.total).toBe(3);
  });
});
