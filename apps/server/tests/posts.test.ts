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
    headers: {
      cookie
    },
    body: formData
  });

  expect(response.status).toBe(200);

  return (await response.json()) as {
    item: { id: string; url: string; mimeType: string };
  };
}

async function createPost(
  cookie: string,
  input: { title: string; content: string; imageIds?: string[] }
) {
  const response = await app.request(API_ROUTES.posts.create, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie
    },
    body: JSON.stringify(input)
  });

  expect(response.status).toBe(200);

  return (await response.json()) as {
    item: {
      id: string;
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
  it("requires login for publishing and keeps pending image posts out of the public feed", async () => {
    const unauthenticatedResponse = await app.request(API_ROUTES.posts.create, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Harbor morning",
        content: "Calm air and enough room to practice smooth turns.",
        imageIds: []
      })
    });

    expect(unauthenticatedResponse.status).toBe(401);

    const userCookie = await loginWebUser("13800138002");
    const uploaded = await uploadImage(userCookie);
    expect(uploaded.item.mimeType).toBe("image/png");

    const created = await createPost(userCookie, {
      title: "Harbor morning",
      content: "Calm air and enough room to practice smooth turns.",
      imageIds: [uploaded.item.id]
    });

    expect(created.item.status).toBe("pending");
    expect(created.item.images).toHaveLength(1);

    const feedResponse = await app.request(`${API_ROUTES.feed}?tab=latest`, {
      method: "GET"
    });
    const feedPayload = (await feedResponse.json()) as {
      items: Array<{ id: string }>;
    };

    expect(feedPayload.items.some((item) => item.id === created.item.id)).toBe(false);
  });

  it("shows published posts in the following feed and creates follow notifications", async () => {
    const authorCookie = await loginWebUser("13800138003");
    const created = await createPost(authorCookie, {
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

    const followingFeedResponse = await app.request(`${API_ROUTES.feed}?tab=following`, {
      method: "GET",
      headers: {
        cookie: followerCookie
      }
    });
    const followingFeedPayload = (await followingFeedResponse.json()) as {
      items: Array<{ id: string }>;
    };

    expect(followingFeedPayload.items.some((item) => item.id === created.item.id)).toBe(true);

    const notificationsResponse = await app.request(API_ROUTES.social.notifications, {
      method: "GET",
      headers: {
        cookie: authorCookie
      }
    });
    const notificationsPayload = (await notificationsResponse.json()) as {
      unreadCount: number;
      items: Array<{ type: string; actor: { id: string } }>;
    };

    expect(notificationsPayload.unreadCount).toBe(1);
    expect(notificationsPayload.items[0]?.type).toBe("followed");
  });

  it("tracks like, favorite, and share actions and exposes notifications", async () => {
    const authorCookie = await loginWebUser("13800138005");
    const created = await createPost(authorCookie, {
      title: "Bridge practice",
      content: "Signal stayed stable, but the return path needed more altitude."
    });

    const adminCookie = await loginAdmin();
    await publishPost(adminCookie, created.item.id);

    const viewerCookie = await loginWebUser("13800138006");

    for (const type of ["like", "favorite", "share"] as const) {
      const response = await app.request(API_ROUTES.posts.interaction(created.item.id, type), {
        method: "POST",
        headers: {
          cookie: viewerCookie
        }
      });

      expect(response.status).toBe(200);
    }

    const detailResponse = await app.request(API_ROUTES.posts.detail(created.item.id), {
      method: "GET",
      headers: {
        cookie: viewerCookie
      }
    });
    const detailPayload = (await detailResponse.json()) as {
      item: {
        engagement: {
          likeCount: number;
          favoriteCount: number;
          shareCount: number;
          viewer: {
            hasLiked: boolean;
            hasFavorited: boolean;
            hasShared: boolean;
          };
        };
      };
    };

    expect(detailPayload.item.engagement.likeCount).toBe(1);
    expect(detailPayload.item.engagement.favoriteCount).toBe(1);
    expect(detailPayload.item.engagement.shareCount).toBe(1);
    expect(detailPayload.item.engagement.viewer.hasLiked).toBe(true);
    expect(detailPayload.item.engagement.viewer.hasFavorited).toBe(true);
    expect(detailPayload.item.engagement.viewer.hasShared).toBe(true);

    const notificationsResponse = await app.request(API_ROUTES.social.notifications, {
      method: "GET",
      headers: {
        cookie: authorCookie
      }
    });
    const notificationsPayload = (await notificationsResponse.json()) as {
      unreadCount: number;
      items: Array<{ type: string }>;
    };

    expect(notificationsPayload.unreadCount).toBe(3);
    expect(notificationsPayload.items.map((item) => item.type)).toEqual(
      expect.arrayContaining(["post_liked", "post_favorited", "post_shared"])
    );

    const markReadResponse = await app.request(API_ROUTES.social.notificationsReadAll, {
      method: "POST",
      headers: {
        cookie: authorCookie
      }
    });

    expect(markReadResponse.status).toBe(200);
  });

  it("supports infinitely nested comments and deletes an entire subtree", async () => {
    const authorCookie = await loginWebUser("13800138007");
    const created = await createPost(authorCookie, {
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
    const topLevelPayload = (await topLevelResponse.json()) as {
      item: { id: string };
    };

    const secondLevelResponse = await app.request(API_ROUTES.posts.comments(created.item.id), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie
      },
      body: JSON.stringify({
        content: "Yes, I softened yaw to keep the arc clean.",
        parentCommentId: topLevelPayload.item.id
      })
    });
    const secondLevelPayload = (await secondLevelResponse.json()) as {
      item: { id: string };
    };

    const thirdLevelResponse = await app.request(API_ROUTES.posts.comments(created.item.id), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: commenterCookie
      },
      body: JSON.stringify({
        content: "That makes sense for the tighter turns.",
        parentCommentId: secondLevelPayload.item.id
      })
    });
    const thirdLevelPayload = (await thirdLevelResponse.json()) as {
      item: { id: string };
    };

    const fourthLevelResponse = await app.request(API_ROUTES.posts.comments(created.item.id), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie
      },
      body: JSON.stringify({
        content: "Exactly, it kept the correction gentle.",
        parentCommentId: thirdLevelPayload.item.id
      })
    });

    expect(fourthLevelResponse.status).toBe(200);

    const detailBeforeDelete = await app.request(API_ROUTES.posts.detail(created.item.id), {
      method: "GET"
    });
    const detailBeforePayload = (await detailBeforeDelete.json()) as {
      item: {
        commentCount: number;
        comments: Array<{
          id: string;
          replies: Array<{
            id: string;
            replies: Array<{
              id: string;
              replies: Array<{ id: string }>;
            }>;
          }>;
        }>;
      };
    };

    expect(detailBeforePayload.item.commentCount).toBe(4);
    expect(detailBeforePayload.item.comments).toHaveLength(1);
    expect(detailBeforePayload.item.comments[0]?.replies).toHaveLength(1);
    expect(detailBeforePayload.item.comments[0]?.replies[0]?.replies).toHaveLength(1);
    expect(detailBeforePayload.item.comments[0]?.replies[0]?.replies[0]?.replies).toHaveLength(1);

    const deleteResponse = await app.request(
      API_ROUTES.posts.commentDetail(created.item.id, topLevelPayload.item.id),
      {
        method: "DELETE",
        headers: {
          cookie: commenterCookie
        }
      }
    );

    expect(deleteResponse.status).toBe(200);

    const detailAfterDelete = await app.request(API_ROUTES.posts.detail(created.item.id), {
      method: "GET"
    });
    const detailAfterPayload = (await detailAfterDelete.json()) as {
      item: { commentCount: number; comments: Array<unknown> };
    };

    expect(detailAfterPayload.item.commentCount).toBe(0);
    expect(detailAfterPayload.item.comments).toHaveLength(0);
  });
});
