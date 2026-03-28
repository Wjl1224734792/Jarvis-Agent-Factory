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

async function uploadVideo(cookie: string, name = "flight.mp4") {
  const formData = new FormData();
  formData.append(
    "file",
    new File([Uint8Array.from([0, 0, 0, 24, 102, 116, 121, 112])], name, {
      type: "video/mp4"
    })
  );

  const response = await app.request(API_ROUTES.uploads.videos, {
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
  input: {
    type?: "article" | "moment";
    title: string;
    content: string;
    imageIds?: string[];
    videoIds?: string[];
    contentCategoryId?: string | null;
  }
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
      videoIds: input.videoIds ?? [],
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
      videos: Array<{ id: string }>;
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

async function updateSiteSettings(adminCookie: string, postModerationEnabled: boolean) {
  const response = await app.request(API_ROUTES.admin.siteSettings, {
    method: "PUT",
    headers: {
      cookie: adminCookie,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      postModerationEnabled
    })
  });

  expect(response.status).toBe(200);
  return response;
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

  it("disables post moderation for regular users when the admin switch is turned off", async () => {
    const categoriesResponse = await app.request(API_ROUTES.content.categories, { method: "GET" });
    const categoriesPayload = (await categoriesResponse.json()) as {
      items: Array<{ id: string }>;
    };
    const articleCategoryId = categoriesPayload.items[0]?.id;
    expect(articleCategoryId).toBeTruthy();

    const adminCookie = await loginAdmin();
    const beforeSettingsResponse = await app.request(API_ROUTES.admin.siteSettings, {
      method: "GET",
      headers: { cookie: adminCookie }
    });
    expect(beforeSettingsResponse.status).toBe(200);
    const beforeSettingsPayload = (await beforeSettingsResponse.json()) as {
      item: {
        postModerationEnabled: boolean;
      };
    };
    expect(beforeSettingsPayload.item.postModerationEnabled).toBe(true);

    await updateSiteSettings(adminCookie, false);

    const userCookie = await loginWebUser("13800138072");
    const created = await createPost(userCookie, {
      type: "article",
      title: "Direct publish article",
      content: "This article should bypass moderation when the switch is off.",
      contentCategoryId: articleCategoryId
    });

    expect(created.item.status).toBe("published");

    const feedResponse = await app.request(`${API_ROUTES.feed}?tab=latest`, { method: "GET" });
    expect(feedResponse.status).toBe(200);
    const feedPayload = (await feedResponse.json()) as {
      items: Array<{ id: string; status: string }>;
    };
    expect(feedPayload.items.some((item) => item.id === created.item.id)).toBe(true);
  });

  it("publishes admin-created official articles immediately and exposes admin authors in feed", async () => {
    const categoriesResponse = await app.request(API_ROUTES.content.categories, { method: "GET" });
    const categoriesPayload = (await categoriesResponse.json()) as {
      items: Array<{ id: string }>;
    };
    const articleCategoryId = categoriesPayload.items[0]?.id;
    expect(articleCategoryId).toBeTruthy();

    const adminCookie = await loginAdmin();
    const createResponse = await app.request(API_ROUTES.posts.create, {
      method: "POST",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type: "article",
        title: "Official operations bulletin",
        content: "This admin-authored article should publish immediately.",
        imageIds: [],
        videoIds: [],
        contentCategoryId: articleCategoryId
      })
    });
    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as {
      item: {
        id: string;
        status: string;
        author: {
          role: string;
        };
      };
    };
    expect(created.item.status).toBe("published");
    expect(created.item.author.role).toBe("admin");

    const feedResponse = await app.request(`${API_ROUTES.feed}?tab=latest`, { method: "GET" });
    expect(feedResponse.status).toBe(200);
    const feedPayload = (await feedResponse.json()) as {
      items: Array<{
        id: string;
        author: {
          role: string;
        };
      }>;
    };
    const feedItem = feedPayload.items.find((item) => item.id === created.item.id);
    expect(feedItem?.author.role).toBe("admin");
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

    const notificationsResponse = await app.request(API_ROUTES.social.notifications, {
      method: "GET",
      headers: {
        cookie: authorCookie
      }
    });
    expect(notificationsResponse.status).toBe(200);
    const notificationsPayload = (await notificationsResponse.json()) as {
      items: Array<{ actor: { avatarUrl: string | null } }>;
    };
    expect(notificationsPayload.items.length).toBeGreaterThan(0);
    expect(notificationsPayload.items.every((item) => item.actor.avatarUrl === null)).toBe(true);

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

  it("supports video uploads and attaches uploaded videos to posts", async () => {
    const userCookie = await loginWebUser("13800138010");
    const uploadedVideo = await uploadVideo(userCookie);

    const created = await createPost(userCookie, {
      type: "moment",
      title: "Video moment",
      content: "Testing video attachments in moment posts.",
      videoIds: [uploadedVideo.item.id]
    });

    expect(created.item.videos).toHaveLength(1);
    expect(created.item.videos[0]?.id).toBe(uploadedVideo.item.id);
  });

  it("returns user profile and aggregated content endpoints", async () => {
    const authorCookie = await loginWebUser("13800138011");
    const created = await createPost(authorCookie, {
      type: "moment",
      title: "Profile content source",
      content: "This post should appear in user aggregated content."
    });

    const adminCookie = await loginAdmin();
    await publishPost(adminCookie, created.item.id);

    const reviewCreateResponse = await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "POST",
      headers: {
        cookie: authorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "Added review item for aggregated profile content checks."
      })
    });
    expect(reviewCreateResponse.status).toBe(200);

    const followerCookie = await loginWebUser("13800138012");
    const followResponse = await app.request(API_ROUTES.social.follow(created.item.author.id), {
      method: "POST",
      headers: { cookie: followerCookie }
    });
    expect(followResponse.status).toBe(200);

    const profileResponse = await app.request(API_ROUTES.users.profile(created.item.author.id), {
      method: "GET",
      headers: { cookie: followerCookie }
    });
    expect(profileResponse.status).toBe(200);
    const profilePayload = (await profileResponse.json()) as {
      item: {
        user: { avatarUrl: string | null };
        postCount: number;
        viewer: {
          isFollowing: boolean;
          canFollow: boolean;
          canViewProfile: boolean;
          canViewContent: boolean;
        };
      };
    };

    const contentResponse = await app.request(API_ROUTES.users.content(created.item.author.id), {
      method: "GET",
      headers: { cookie: followerCookie }
    });
    expect(contentResponse.status).toBe(200);
    const contentPayload = (await contentResponse.json()) as {
      items: Array<
        | { type: "post"; id: string }
        | { type: "review"; id: string; content: string | null; rating?: unknown }
        | { type: string; id: string }
      >;
    };

    expect(profilePayload.item.viewer.isFollowing).toBe(true);
    expect(profilePayload.item.viewer.canFollow).toBe(true);
    expect(profilePayload.item.viewer.canViewProfile).toBe(true);
    expect(profilePayload.item.viewer.canViewContent).toBe(true);
    expect(profilePayload.item.user.avatarUrl).toBeNull();
    expect(profilePayload.item.postCount).toBeGreaterThan(0);
    expect(contentPayload.items.some((item) => item.type === "post" && item.id === created.item.id)).toBe(true);
    const reviewItem = contentPayload.items.find((item) => item.type === "review");
    expect(reviewItem?.type).toBe("review");
    if (reviewItem?.type === "review") {
      expect("rating" in reviewItem).toBe(false);
    }
  });

  it("enforces profile visibility for followers and private modes", async () => {
    const ownerCookie = await loginWebUser("13800138051");
    const ownerPost = await createPost(ownerCookie, {
      type: "moment",
      title: "Visibility source",
      content: "This content should be hidden from non-followers."
    });
    const adminCookie = await loginAdmin();
    await publishPost(adminCookie, ownerPost.item.id);

    const ownerMeResponse = await app.request(API_ROUTES.auth.currentUser, {
      method: "GET",
      headers: { cookie: ownerCookie }
    });
    const ownerMePayload = (await ownerMeResponse.json()) as { user: { id: string } | null };
    const ownerId = ownerMePayload.user?.id ?? "";
    expect(ownerId).toBeTruthy();

    const strangerCookie = await loginWebUser("13800138052");

    const followersModeUpdateResponse = await app.request(API_ROUTES.users.meProfile, {
      method: "PUT",
      headers: {
        cookie: ownerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        profileVisibility: "followers"
      })
    });
    expect(followersModeUpdateResponse.status).toBe(200);

    const followerBlockedProfileResponse = await app.request(API_ROUTES.users.profile(ownerId), {
      method: "GET",
      headers: { cookie: strangerCookie }
    });
    expect(followerBlockedProfileResponse.status).toBe(200);
    const followerBlockedProfilePayload = (await followerBlockedProfileResponse.json()) as {
      item: { viewer: { canViewContent: boolean } };
    };
    expect(followerBlockedProfilePayload.item.viewer.canViewContent).toBe(false);

    const followerBlockedContentResponse = await app.request(API_ROUTES.users.content(ownerId), {
      method: "GET",
      headers: { cookie: strangerCookie }
    });
    expect(followerBlockedContentResponse.status).toBe(403);

    const followResponse = await app.request(API_ROUTES.social.follow(ownerId), {
      method: "POST",
      headers: { cookie: strangerCookie }
    });
    expect(followResponse.status).toBe(200);

    const followerVisibleContentResponse = await app.request(API_ROUTES.users.content(ownerId), {
      method: "GET",
      headers: { cookie: strangerCookie }
    });
    expect(followerVisibleContentResponse.status).toBe(200);
    const followerVisibleContentPayload = (await followerVisibleContentResponse.json()) as {
      items: Array<{ id: string }>;
    };
    expect(
      followerVisibleContentPayload.items.some((item) => item.id === ownerPost.item.id)
    ).toBe(true);

    const privateModeUpdateResponse = await app.request(API_ROUTES.users.meProfile, {
      method: "PUT",
      headers: {
        cookie: ownerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        profileVisibility: "private"
      })
    });
    expect(privateModeUpdateResponse.status).toBe(200);

    const privateBlockedContentResponse = await app.request(API_ROUTES.users.content(ownerId), {
      method: "GET",
      headers: { cookie: strangerCookie }
    });
    expect(privateBlockedContentResponse.status).toBe(403);

    const ownerContentResponse = await app.request(API_ROUTES.users.content(ownerId), {
      method: "GET",
      headers: { cookie: ownerCookie }
    });
    expect(ownerContentResponse.status).toBe(200);
  });

  it("respects notification settings for post comments and replies", async () => {
    const authorCookie = await loginWebUser("13800138061");
    const post = await createPost(authorCookie, {
      type: "moment",
      title: "Notification setting source",
      content: "Testing notification preference gating."
    });
    const adminCookie = await loginAdmin();
    await publishPost(adminCookie, post.item.id);

    const authorMeResponse = await app.request(API_ROUTES.auth.currentUser, {
      method: "GET",
      headers: { cookie: authorCookie }
    });
    const authorMePayload = (await authorMeResponse.json()) as { user: { id: string } | null };
    const authorId = authorMePayload.user?.id ?? "";
    expect(authorId).toBeTruthy();

    const commenterCookie = await loginWebUser("13800138062");

    const disableCommentNotificationsResponse = await app.request(API_ROUTES.users.meProfile, {
      method: "PUT",
      headers: {
        cookie: authorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        notifyComments: false
      })
    });
    expect(disableCommentNotificationsResponse.status).toBe(200);

    const firstCommentResponse = await app.request(API_ROUTES.posts.comments(post.item.id), {
      method: "POST",
      headers: {
        cookie: commenterCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "No notification should be sent to author."
      })
    });
    expect(firstCommentResponse.status).toBe(200);

    const authorNotificationsAfterDisabled = await app.request(API_ROUTES.social.notifications, {
      method: "GET",
      headers: { cookie: authorCookie }
    });
    expect(authorNotificationsAfterDisabled.status).toBe(200);
    const authorNotificationsAfterDisabledPayload = (await authorNotificationsAfterDisabled.json()) as {
      items: Array<{ type: string; post?: { id: string } | null }>;
    };
    expect(
      authorNotificationsAfterDisabledPayload.items.some(
        (item) => item.type === "post_commented" && item.post?.id === post.item.id
      )
    ).toBe(false);

    const enableCommentNotificationsResponse = await app.request(API_ROUTES.users.meProfile, {
      method: "PUT",
      headers: {
        cookie: authorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        notifyComments: true
      })
    });
    expect(enableCommentNotificationsResponse.status).toBe(200);

    const secondCommentResponse = await app.request(API_ROUTES.posts.comments(post.item.id), {
      method: "POST",
      headers: {
        cookie: commenterCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "This should notify the author."
      })
    });
    expect(secondCommentResponse.status).toBe(200);

    const authorNotificationsAfterEnabled = await app.request(API_ROUTES.social.notifications, {
      method: "GET",
      headers: { cookie: authorCookie }
    });
    expect(authorNotificationsAfterEnabled.status).toBe(200);
    const authorNotificationsAfterEnabledPayload = (await authorNotificationsAfterEnabled.json()) as {
      items: Array<{ type: string; post?: { id: string } | null }>;
    };
    expect(
      authorNotificationsAfterEnabledPayload.items.some(
        (item) => item.type === "post_commented" && item.post?.id === post.item.id
      )
    ).toBe(true);
  });
});

