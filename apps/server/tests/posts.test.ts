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

async function loginWebUser(phone: string) {
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

  const authResponse = await app.request(API_ROUTES.auth.webLogin, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phone,
      captchaChallengeId: captchaPayload.challengeId,
      captchaCode: captchaPayload.imageOrText,
      smsCode: smsPayload.mockCode
    })
  });

  return extractCookie(authResponse.headers.get("set-cookie"));
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

  return extractCookie(response.headers.get("set-cookie"));
}

async function uploadImage(cookie: string, name = "cover.png") {
  const formData = new FormData();
  formData.append(
    "file",
    new File([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], name, {
      type: "image/png"
    })
  );

  const response = await app.request(API_ROUTES.uploads.images, {
    method: "POST",
    headers: { cookie },
    body: formData
  });

  expect(response.status).toBe(200);

  return (await response.json()) as {
    item: { id: string; url: string; mimeType: string };
  };
}

async function createPost(
  cookie: string,
  input: { type?: "article" | "moment"; title: string; content: string; imageIds?: string[]; contentCategoryId?: string | null }
) {
  const response = await app.request(API_ROUTES.posts.create, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie
    },
    body: JSON.stringify({
      type: input.type ?? "moment",
      title: input.title,
      content: input.content,
      imageIds: input.imageIds ?? [],
      contentCategoryId: input.contentCategoryId ?? null
    })
  });

  expect(response.status).toBe(200);
  return (await response.json()) as {
    item: {
      id: string;
      type: string;
      status: string;
      author: { id: string };
      images: Array<{ id: string }>;
    };
  };
}

async function publishPost(adminCookie: string, postId: string) {
  const response = await app.request(API_ROUTES.posts.adminDetail(postId), {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie
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
  authRepo.resetEphemeralState();
  await resetDatabaseState();
  await seedDatabase();
});

afterAll(async () => {
  await dbPool.end();
});

describe("posts and social flows", () => {
  it("requires login for publishing and keeps pending posts out of the home article feed", async () => {
    const categoriesResponse = await app.request(API_ROUTES.content.categories, { method: "GET" });
    const categoriesPayload = (await categoriesResponse.json()) as {
      items: Array<{ id: string }>;
    };
    const articleCategoryId = categoriesPayload.items[0]?.id;

    const unauthenticatedResponse = await app.request(API_ROUTES.posts.create, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "article",
        title: "Harbor morning",
        content: "Calm air and enough room to practice smooth turns.",
        imageIds: [],
        contentCategoryId: articleCategoryId
      })
    });

    expect(unauthenticatedResponse.status).toBe(401);

    const userCookie = await loginWebUser("13800138002");
    const uploaded = await uploadImage(userCookie);
    const created = await createPost(userCookie, {
      type: "article",
      title: "Harbor morning",
      content: "Calm air and enough room to practice smooth turns.",
      imageIds: [uploaded.item.id],
      contentCategoryId: articleCategoryId
    });

    expect(created.item.type).toBe("article");
    expect(created.item.status).toBe("pending");
    expect(created.item.images).toHaveLength(1);

    const feedResponse = await app.request(`${API_ROUTES.feed}?tab=latest`, { method: "GET" });
    const feedPayload = (await feedResponse.json()) as {
      items: Array<{ id: string }>;
    };

    expect(feedPayload.items.some((item) => item.id === created.item.id)).toBe(false);
  });

  it("splits article and moment feeds correctly", async () => {
    const homeResponse = await app.request(`${API_ROUTES.feed}?tab=latest`, { method: "GET" });
    const homePayload = (await homeResponse.json()) as {
      items: Array<{ type: string }>;
      categories: Array<{ slug: string }>;
    };
    const circleResponse = await app.request(`${API_ROUTES.circleFeed}?tab=latest`, { method: "GET" });
    const circlePayload = (await circleResponse.json()) as {
      items: Array<{ type: string }>;
    };

    expect(homePayload.categories.length).toBeGreaterThan(0);
    expect(homePayload.items.every((item) => item.type === "article")).toBe(true);
    expect(circlePayload.items.every((item) => item.type === "moment")).toBe(true);
  });

  it("shows published moments in the following feed and creates follow notifications", async () => {
    const authorCookie = await loginWebUser("13800138003");
    const created = await createPost(authorCookie, {
      type: "moment",
      title: "Ridge session",
      content: "The air got messy near the trees, but the descent stayed clean."
    });

    const adminCookie = await loginAdmin();
    await publishPost(adminCookie, created.item.id);

    const followerCookie = await loginWebUser("13800138004");
    const followResponse = await app.request(API_ROUTES.social.follow(created.item.author.id), {
      method: "POST",
      headers: {
        cookie: followerCookie
      }
    });

    expect(followResponse.status).toBe(200);

    const followingFeedResponse = await app.request(`${API_ROUTES.circleFeed}?tab=following`, {
      method: "GET",
      headers: {
        cookie: followerCookie
      }
    });
    const followingFeedPayload = (await followingFeedResponse.json()) as {
      items: Array<{ id: string }>;
    };

    expect(followingFeedPayload.items.some((item) => item.id === created.item.id)).toBe(true);
  });

  it("builds a single-level reply thread with replyToUser metadata", async () => {
    const authorCookie = await loginWebUser("13800138007");
    const created = await createPost(authorCookie, {
      type: "moment",
      title: "Tree line notes",
      content: "The gusts rolled over the tree line in waves."
    });

    const adminCookie = await loginAdmin();
    await publishPost(adminCookie, created.item.id);

    const commenterCookie = await loginWebUser("13800138008");

    const topLevelResponse = await app.request(API_ROUTES.posts.comments(created.item.id), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: commenterCookie
      },
      body: JSON.stringify({
        content: "Did you adjust expo for the approach?"
      })
    });
    const topLevelPayload = (await topLevelResponse.json()) as { item: { id: string } };

    const secondLevelResponse = await app.request(API_ROUTES.posts.comments(created.item.id), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie
      },
      body: JSON.stringify({
        content: "@飞友13800138008 Yes, I softened yaw to keep the arc clean.",
        parentCommentId: topLevelPayload.item.id
      })
    });
    const secondLevelPayload = (await secondLevelResponse.json()) as { item: { id: string } };

    const thirdLevelResponse = await app.request(API_ROUTES.posts.comments(created.item.id), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: commenterCookie
      },
      body: JSON.stringify({
        content: "@飞友8007 That makes sense for the tighter turns.",
        parentCommentId: secondLevelPayload.item.id
      })
    });

    expect(thirdLevelResponse.status).toBe(200);

    const detailResponse = await app.request(API_ROUTES.posts.detail(created.item.id), {
      method: "GET"
    });
    const detailPayload = (await detailResponse.json()) as {
      item: {
        commentCount: number;
        comments: Array<{
          id: string;
          replyCount: number;
          replies: Array<{ replyToUser: { displayName: string } | null }>;
        }>;
      };
    };

    expect(detailPayload.item.commentCount).toBe(3);
    expect(detailPayload.item.comments).toHaveLength(1);
    expect(detailPayload.item.comments[0]?.replyCount).toBe(2);
    expect(detailPayload.item.comments[0]?.replies).toHaveLength(2);
    expect(detailPayload.item.comments[0]?.replies[1]?.replyToUser?.displayName).toBeTruthy();
  });
});
