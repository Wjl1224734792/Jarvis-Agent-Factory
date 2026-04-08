import {
  contentCategoriesTable,
  db,
  dbPool,
  resetDatabaseState,
  runMigrations,
  seedDatabase
} from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authRepo } from "../src/modules/auth/auth.repo";
import { resetRedisForTesting } from "../src/modules/auth/redis-client";
import { uploadsRepo } from "../src/modules/uploads/upload.repo";
import { app } from "../src/app";

function extractCookies(response: Response): string {
  const setCookies = response.headers.getSetCookie();
  if (setCookies.length === 0) {
    throw new Error("missing set-cookie headers");
  }
  return setCookies.map((c) => c.split(";")[0]).join("; ");
}

function expectDefined<T>(value: T | null | undefined): T {
  expect(value).toBeTruthy();
  if (value === null || value === undefined) {
    throw new Error("Expected value to be defined");
  }
  return value;
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

  return completeRegistrationIfNeeded(authResponse);
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

async function uploadFile(
  cookie: string,
  input: {
    bizType: "post-image" | "post-video" | "avatar-image" | "report-image";
    name: string;
    contentType: string;
    bytes: Uint8Array;
  }
) {
  const meResponse = await app.request(API_ROUTES.auth.currentUser, {
    method: "GET",
    headers: { cookie }
  });
  expect(meResponse.status).toBe(200);
  const mePayload = (await meResponse.json()) as {
    user: { id: string } | null;
  };
  const ownerId = mePayload.user?.id;
  expect(ownerId).toBeTruthy();

  const pending = await uploadsRepo.createPendingFile({
    ownerId: expectDefined(ownerId),
    bizType: input.bizType,
    mediaKind: input.bizType === "post-video" ? "video" : "image",
    provider: "minio",
    bucket: "feijia-media",
    region: "us-east-1",
    objectKey: `${input.bizType}/${ownerId}/${input.name}`,
    fileName: input.name,
    mimeType: input.contentType,
    byteSize: input.bytes.byteLength,
    visibility: "public"
  });
  expect(pending?.id).toBeTruthy();

  const uploaded = await uploadsRepo.markFileUploaded({
    fileId: pending.id,
    etag: "test-etag"
  });

  return {
    item: {
      id: uploaded.id,
      url: "",
      mimeType: uploaded.mimeType,
      fileName: uploaded.fileName
    }
  };
}

async function uploadImage(cookie: string, name = "cover.png") {
  return uploadFile(cookie, {
    bizType: "post-image",
    name,
    contentType: "image/png",
    bytes: Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
  });
}

async function uploadReportImage(cookie: string, name = "report.png") {
  return uploadFile(cookie, {
    bizType: "report-image",
    name,
    contentType: "image/png",
    bytes: new Uint8Array([9, 8, 7, 6])
  });
}

async function uploadVideo(cookie: string, name = "flight.mp4") {
  return uploadFile(cookie, {
    bizType: "post-video",
    name,
    contentType: "video/mp4",
    bytes: Uint8Array.from([0, 0, 0, 24, 102, 116, 121, 112])
  });
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
      postModerationEnabled,
      commentModerationEnabled: true,
      reviewModerationEnabled: true,
      submissionModerationEnabled: true
    })
  });

  expect(response.status).toBe(200);
  return response;
}

async function updateAllSiteSettings(
  adminCookie: string,
  input: {
    postModerationEnabled: boolean;
    commentModerationEnabled: boolean;
    reviewModerationEnabled: boolean;
    submissionModerationEnabled: boolean;
    rankingModerationEnabled?: boolean;
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

const originalUploadMaxReportImageSizeMb =
  process.env.UPLOAD_MAX_REPORT_IMAGE_SIZE_MB;
const originalUploadMaxPostVideoSizeMb =
  process.env.UPLOAD_MAX_POST_VIDEO_SIZE_MB;

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  process.env.UPLOAD_MAX_REPORT_IMAGE_SIZE_MB =
    originalUploadMaxReportImageSizeMb;
  process.env.UPLOAD_MAX_POST_VIDEO_SIZE_MB =
    originalUploadMaxPostVideoSizeMb;
  await resetRedisForTesting();
  authRepo.resetEphemeralState();
  await resetDatabaseState();
  await seedDatabase();
});

afterAll(async () => {
  process.env.UPLOAD_MAX_REPORT_IMAGE_SIZE_MB =
    originalUploadMaxReportImageSizeMb;
  process.env.UPLOAD_MAX_POST_VIDEO_SIZE_MB =
    originalUploadMaxPostVideoSizeMb;
  await dbPool.end();
});

describe.sequential("posts and social flows", () => {
  it("returns edited published posts to pending when moderation stays on", async () => {
    const categoriesResponse = await app.request(API_ROUTES.content.categories, { method: "GET" });
    const categoriesPayload = (await categoriesResponse.json()) as {
      items: Array<{ id: string }>;
    };
    const articleCategoryId = categoriesPayload.items[0]?.id;
    expect(articleCategoryId).toBeTruthy();

    const adminCookie = await loginAdmin();
    const authorCookie = await loginWebUser("13800138171");
    const created = await createPost(authorCookie, {
      type: "article",
      title: "Editable article",
      content: "Initial content",
      contentCategoryId: articleCategoryId
    });

    await app.request(API_ROUTES.posts.adminDetail(created.item.id), {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "published"
      })
    });

    const updateResponse = await app.request(API_ROUTES.posts.detail(created.item.id), {
      method: "PUT",
      headers: {
        cookie: authorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type: "article",
        title: "Editable article updated",
        content: "Updated content should return to review.",
        contentHtml: "<p>Updated content should return to review.</p>",
        contentCategoryId: articleCategoryId,
        imageIds: [],
        videoIds: []
      })
    });

    expect(updateResponse.status).toBe(200);
    const updated = (await updateResponse.json()) as {
      item: { status: string; title: string };
    };
    expect(updated.item.title).toBe("Editable article updated");
    expect(updated.item.status).toBe("pending");

    const publicDetail = await app.request(API_ROUTES.posts.detail(created.item.id), {
      method: "GET"
    });
    expect(publicDetail.status).toBe(404);
  });

  it("supports comment edit, like and report flows", async () => {
    const authorCookie = await loginWebUser("13800138172");
    const created = await createPost(authorCookie, {
      type: "moment",
      title: "Comment action source",
      content: "A moment for comment interaction."
    });
    const adminCookie = await loginAdmin();
    await publishPost(adminCookie, created.item.id);

    const commenterCookie = await loginWebUser("13800138173");
    const createCommentResponse = await app.request(API_ROUTES.posts.comments(created.item.id), {
      method: "POST",
      headers: {
        cookie: commenterCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "Original comment"
      })
    });
    expect(createCommentResponse.status).toBe(200);
    const commentPayload = (await createCommentResponse.json()) as {
      item: { id: string };
    };

    const updateCommentResponse = await app.request(
      API_ROUTES.posts.commentDetail(created.item.id, commentPayload.item.id),
      {
        method: "PUT",
        headers: {
          cookie: commenterCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          content: "Edited comment"
        })
      }
    );
    expect(updateCommentResponse.status).toBe(200);

    const likeResponse = await app.request(
      API_ROUTES.posts.commentLike(created.item.id, commentPayload.item.id),
      {
        method: "POST",
        headers: {
          cookie: authorCookie
        }
      }
    );
    expect(likeResponse.status).toBe(200);

    const reportImage = await uploadReportImage(authorCookie, "comment-report.png");
    const reportResponse = await app.request(
      API_ROUTES.posts.commentReport(created.item.id, commentPayload.item.id),
      {
        method: "POST",
        headers: {
          cookie: authorCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          reason: "Spam wording",
          imageIds: [reportImage.item.id]
        })
      }
    );
    expect(reportResponse.status).toBe(200);

    const detailResponse = await app.request(
      `${API_ROUTES.posts.detail(created.item.id)}?commentSort=hot`,
      {
        method: "GET",
        headers: { cookie: authorCookie }
      }
    );
    expect(detailResponse.status).toBe(200);
    const detailPayload = (await detailResponse.json()) as {
      item: {
        comments: Array<{
          id: string;
          content: string;
          likeCount: number;
          reportCount: number;
          viewer: { hasLiked: boolean; hasReported: boolean };
        }>;
      };
    };

    const target = detailPayload.item.comments.find((item) => item.id === commentPayload.item.id);
    expect(target?.content).toBe("Edited comment");
    expect(target?.likeCount).toBe(1);
    expect(target?.reportCount).toBe(1);
    expect(target?.viewer.hasLiked).toBe(true);
    expect(target?.viewer.hasReported).toBe(true);
  });

  it("supports dedicated admin official article detail/update/delete endpoints", async () => {
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
        title: "Official article before update",
        content: "Initial official article content",
        contentHtml: "<p>Initial official article content</p>",
        imageIds: [],
        videoIds: [],
        contentCategoryId: articleCategoryId
      })
    });
    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as {
      item: { id: string };
    };

    const detailResponse = await app.request(API_ROUTES.posts.adminOfficialDetail(created.item.id), {
      method: "GET",
      headers: {
        cookie: adminCookie
      }
    });
    expect(detailResponse.status).toBe(200);

    const updateResponse = await app.request(API_ROUTES.posts.adminOfficialDetail(created.item.id), {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "Official article after update",
        content: "Updated official article content",
        contentHtml: "<p>Updated official article content</p>",
        contentCategoryId: articleCategoryId,
        imageIds: [],
        videoIds: []
      })
    });
    expect(updateResponse.status).toBe(200);
    const updated = (await updateResponse.json()) as {
      item: { id: string; title: string; content: string };
    };
    expect(updated.item.id).toBe(created.item.id);
    expect(updated.item.title).toBe("Official article after update");
    expect(updated.item.content).toContain("Updated official article content");

    const deleteResponse = await app.request(API_ROUTES.posts.adminOfficialDetail(created.item.id), {
      method: "DELETE",
      headers: {
        cookie: adminCookie
      }
    });
    expect(deleteResponse.status).toBe(200);

    const detailAfterDeleteResponse = await app.request(
      API_ROUTES.posts.adminOfficialDetail(created.item.id),
      {
      method: "GET",
      headers: {
        cookie: adminCookie
      }
      }
    );
    expect(detailAfterDeleteResponse.status).toBe(404);
  });

  it("rejects moment creation when images and videos are mixed or when multiple videos are attached", async () => {
    const cookie = await loginWebUser("13800138151");
    const image = await uploadImage(cookie, "moment-cover.png");
    const videoA = await uploadVideo(cookie, "moment-a.mp4");
    const videoB = await uploadVideo(cookie, "moment-b.mp4");

    const mixedResponse = await app.request(API_ROUTES.posts.create, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie
      },
      body: JSON.stringify({
        type: "moment",
        title: "Harbor mixed media",
        content: "This should be rejected.",
        imageIds: [image.item.id],
        videoIds: [videoA.item.id]
      })
    });
    expect(mixedResponse.status).toBe(400);

    const multipleVideosResponse = await app.request(API_ROUTES.posts.create, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie
      },
      body: JSON.stringify({
        type: "moment",
        title: "Harbor double video",
        content: "This should also be rejected.",
        imageIds: [],
        videoIds: [videoA.item.id, videoB.item.id]
      })
    });
    expect(multipleVideosResponse.status).toBe(400);
  });

  it("returns 404 for dedicated official article endpoints when article author is not admin", async () => {
    const categoriesResponse = await app.request(API_ROUTES.content.categories, { method: "GET" });
    const categoriesPayload = (await categoriesResponse.json()) as {
      items: Array<{ id: string }>;
    };
    const articleCategoryId = categoriesPayload.items[0]?.id;
    expect(articleCategoryId).toBeTruthy();

    const userCookie = await loginWebUser("13800138101");
    const created = await createPost(userCookie, {
      type: "article",
      title: "User article",
      content: "This should not be treated as official.",
      contentCategoryId: articleCategoryId
    });

    const adminCookie = await loginAdmin();
    const detailResponse = await app.request(API_ROUTES.posts.adminOfficialDetail(created.item.id), {
      method: "GET",
      headers: {
        cookie: adminCookie
      }
    });
    expect(detailResponse.status).toBe(404);
  });

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

  it("keeps admin-created official articles pending when article moderation is enabled", async () => {
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
    expect(created.item.status).toBe("pending");
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
    expect(feedItem).toBeUndefined();
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

  it("keeps comments pending for authors only when comment moderation is enabled", async () => {
    const authorCookie = await loginWebUser("13800138090");
    const created = await createPost(authorCookie, {
      type: "moment",
      title: "Pending comment source",
      content: "Post used to verify comment moderation."
    });
    const adminCookie = await loginAdmin();
    await publishPost(adminCookie, created.item.id);
    await updateAllSiteSettings(adminCookie, {
      postModerationEnabled: true,
      commentModerationEnabled: true,
      reviewModerationEnabled: true,
      submissionModerationEnabled: true
    });

    const commenterCookie = await loginWebUser("13800138091");
    const commentResponse = await app.request(API_ROUTES.posts.comments(created.item.id), {
      method: "POST",
      headers: {
        cookie: commenterCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "This should stay pending."
      })
    });
    expect(commentResponse.status).toBe(200);
    const commentPayload = (await commentResponse.json()) as { item: { status: string; id: string } };
    expect(commentPayload.item.status).toBe("pending");

    const authorView = await app.request(API_ROUTES.posts.detail(created.item.id), {
      method: "GET",
      headers: { cookie: authorCookie }
    });
    const authorPayload = (await authorView.json()) as {
      item: { comments: Array<{ id: string }> };
    };
    expect(authorPayload.item.comments.some((item) => item.id === commentPayload.item.id)).toBe(false);

    const commenterView = await app.request(API_ROUTES.posts.detail(created.item.id), {
      method: "GET",
      headers: { cookie: commenterCookie }
    });
    const commenterPayload = (await commenterView.json()) as {
      item: { comments: Array<{ id: string; status: string }> };
    };
    expect(commenterPayload.item.comments.some((item) => item.id === commentPayload.item.id && item.status === "pending")).toBe(true);
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

  it("rejects report image upload when report-image env limit is exceeded", async () => {
    const previousValue = process.env.UPLOAD_MAX_REPORT_IMAGE_SIZE_MB;
    process.env.UPLOAD_MAX_REPORT_IMAGE_SIZE_MB = "0.000001";

    try {
      const cookie = await loginWebUser("13800138195");
      const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

      const response = await app.request(API_ROUTES.uploads.init, {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          bizType: "report-image",
          filename: "too-large-report.png",
          contentType: "image/png",
          size: bytes.byteLength
        })
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        code: "BAD_REQUEST",
        message: "File size exceeds limit. Current max allowed is 0.00 MB.",
        details: {
          reason: "file_too_large",
          bizType: "report-image",
          mediaKind: "image",
          limit: {
            mb: "0.00"
          }
        }
      });
    } finally {
      process.env.UPLOAD_MAX_REPORT_IMAGE_SIZE_MB = previousValue;
    }
  });

  it("rejects post video upload when post-video env limit is exceeded", async () => {
    const previousValue = process.env.UPLOAD_MAX_POST_VIDEO_SIZE_MB;
    process.env.UPLOAD_MAX_POST_VIDEO_SIZE_MB = "0.000001";

    try {
      const cookie = await loginWebUser("13800138196");
      const bytes = Uint8Array.from([0, 0, 0, 24, 102, 116, 121, 112]);

      const response = await app.request(API_ROUTES.uploads.init, {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          bizType: "post-video",
          filename: "too-large-post-video.mp4",
          contentType: "video/mp4",
          size: bytes.byteLength
        })
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        code: "BAD_REQUEST",
        message: "File size exceeds limit. Current max allowed is 0.00 MB.",
        details: {
          reason: "file_too_large",
          bizType: "post-video",
          mediaKind: "video",
          limit: {
            mb: "0.00"
          }
        }
      });
    } finally {
      process.env.UPLOAD_MAX_POST_VIDEO_SIZE_MB = previousValue;
    }
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

  it("marks a single notification as read", async () => {
    const cookie = await loginWebUser("13800138101");

    const beforeResponse = await app.request(API_ROUTES.social.notifications, {
      method: "GET",
      headers: { cookie }
    });
    expect(beforeResponse.status).toBe(200);
    const beforePayload = (await beforeResponse.json()) as {
      unreadCount: number;
      items: Array<{ id: string; isRead: boolean }>;
    };
    const target = beforePayload.items.find((item) => !item.isRead);
    expect(target?.id).toBeTruthy();

    const targetId = expectDefined(target?.id);
    const markOneResponse = await app.request(API_ROUTES.social.notificationRead(targetId), {
      method: "POST",
      headers: { cookie }
    });
    expect(markOneResponse.status).toBe(200);

    const afterResponse = await app.request(API_ROUTES.social.notifications, {
      method: "GET",
      headers: { cookie }
    });
    expect(afterResponse.status).toBe(200);
    const afterPayload = (await afterResponse.json()) as {
      unreadCount: number;
      items: Array<{ id: string; isRead: boolean }>;
    };

    const marked = afterPayload.items.find((item) => item.id === targetId);
    expect(marked?.isRead).toBe(true);
    expect(afterPayload.unreadCount).toBe(beforePayload.unreadCount - 1);
  });

  it("returns admin analytics overview with fixed series lengths", async () => {
    const adminCookie = await loginAdmin();

    const response = await app.request(API_ROUTES.admin.analyticsOverview, {
      method: "GET",
      headers: {
        cookie: adminCookie
      }
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      item: {
        registration: { total: number };
        activity: { activeUsers: number };
        content: {
          articles: number;
          moments: number;
          aircraftPublishedModels: number;
          aircraftPendingSubmissions: number;
          rankings: number;
        };
        moderation: {
          posts: { pending: number; approved: number; rejected: number; hidden: number };
          comments: { pending: number; approved: number; rejected: number; hidden: number };
          reviews: { pending: number; approved: number; rejected: number; hidden: number };
          submissions: { pending: number; approved: number; rejected: number; hidden: number };
          rankings: { pending: number; approved: number; rejected: number; hidden: number };
        };
        totals: {
          pendingRankings: number;
        };
        series: {
          registrationDaily: Array<{ periodStart: string; value: number }>;
          registrationMonthly: Array<{ periodStart: string; value: number }>;
          registrationYearly: Array<{ periodStart: string; value: number }>;
          activityDaily: Array<{ periodStart: string; value: number }>;
          activityMonthly: Array<{ periodStart: string; value: number }>;
          activityYearly: Array<{ periodStart: string; value: number }>;
        };
      };
    };

    expect(payload.item.registration.total).toBe(11);
    expect(payload.item.activity.activeUsers).toBeGreaterThanOrEqual(1);
    expect(payload.item.content.articles).toBe(6);
    expect(payload.item.content.moments).toBe(3);
    expect(payload.item.content.aircraftPublishedModels).toBe(6);
    expect(payload.item.content.aircraftPendingSubmissions).toBe(1);
    expect(payload.item.content.rankings).toBe(2);
    expect(payload.item.moderation.posts.pending).toBe(1);
    expect(payload.item.moderation.posts.approved).toBe(6);
    expect(payload.item.moderation.posts.rejected).toBe(1);
    expect(payload.item.moderation.posts.hidden).toBe(1);
    expect(payload.item.moderation.rankings.pending).toBe(0);
    expect(payload.item.totals.pendingRankings).toBe(0);
    expect(payload.item.series.registrationDaily).toHaveLength(30);
    expect(payload.item.series.registrationMonthly).toHaveLength(12);
    expect(payload.item.series.registrationYearly).toHaveLength(5);
    expect(payload.item.series.activityDaily).toHaveLength(30);
    expect(payload.item.series.activityMonthly).toHaveLength(12);
    expect(payload.item.series.activityYearly).toHaveLength(5);
  });

  it("backfills content category names by slug to Chinese labels", async () => {
    await db
      .update(contentCategoriesTable)
      .set({ name: "News" })
      .where(eq(contentCategoriesTable.slug, "news"));
    await db
      .update(contentCategoriesTable)
      .set({ name: "Review" })
      .where(eq(contentCategoriesTable.slug, "review"));
    await db
      .update(contentCategoriesTable)
      .set({ name: "Aerial" })
      .where(eq(contentCategoriesTable.slug, "aerial"));
    await db
      .update(contentCategoriesTable)
      .set({ name: "Tech" })
      .where(eq(contentCategoriesTable.slug, "tech"));
    await db
      .update(contentCategoriesTable)
      .set({ name: "Guide" })
      .where(eq(contentCategoriesTable.slug, "guide"));

    await seedDatabase({ reset: false });

    const categoriesResponse = await app.request(API_ROUTES.content.categories, { method: "GET" });
    expect(categoriesResponse.status).toBe(200);
    const categoriesPayload = (await categoriesResponse.json()) as {
      items: Array<{ slug: string; name: string }>;
    };

    const bySlug = new Map(categoriesPayload.items.map((item) => [item.slug, item.name]));
    expect(bySlug.get("news")).toBe("资讯");
    expect(bySlug.get("review")).toBe("评测");
    expect(bySlug.get("aerial")).toBe("航拍");
    expect(bySlug.get("tech")).toBe("技术");
    expect(bySlug.get("guide")).toBe("指南");
  });
});

