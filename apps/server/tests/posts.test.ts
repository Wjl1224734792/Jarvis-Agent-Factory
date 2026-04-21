import {
  contentCategoriesTable,
  postsTable,
  db,
  dbPool,
  notificationsTable,
  resetDatabaseState,
  runMigrations,
  seedDatabase
} from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authRepo } from "../src/modules/auth/auth.repo";
import { ensureRedisConnected, redis, resetRedisForTesting } from "../src/modules/auth/redis-client";
import { rankFeedItemsByRecommendation } from "../src/modules/posts/feed-recommendation";
import { uploadsRepo } from "../src/modules/uploads/upload.repo";
import { app } from "../src/app";
import { readCaptchaAnswerForTests } from "./captcha-test-helpers";

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

async function resolveSmsCode(phone: string, payload: { mockCode?: string }) {
  if (payload.mockCode) {
    return payload.mockCode;
  }

  await ensureRedisConnected();
  const raw = await redis.get(`sms:${phone}`);
  if (!raw) {
    throw new Error(`missing sms code for ${phone}`);
  }

  const record = JSON.parse(raw) as { code: string };
  return record.code;
}

async function loginWebUser(phone: string) {
  const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, { method: "POST" });
  const captchaPayload = (await captchaResponse.json()) as {
    challengeId: string;
    imageOrText: string;
  };

  const captchaAnswer = await readCaptchaAnswerForTests(captchaPayload.challengeId);

  const smsResponse = await app.request(API_ROUTES.auth.smsRequest, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phone,
      captchaChallengeId: captchaPayload.challengeId,
      captchaCode: captchaAnswer
    })
  });
  expect(smsResponse.status).toBe(200);
  const smsPayload = (await smsResponse.json()) as { mockCode?: string };
  const smsCode = await resolveSmsCode(phone, smsPayload);

  const authResponse = await app.request(API_ROUTES.auth.webLogin, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phone,
      smsCode
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

async function getCurrentUserId(cookie: string) {
  const response = await app.request(API_ROUTES.auth.currentUser, {
    method: "GET",
    headers: { cookie }
  });
  expect(response.status).toBe(200);
  const payload = (await response.json()) as {
    user: { id: string } | null;
  };
  return expectDefined(payload.user?.id);
}

async function replaceMomentFeedWithSyntheticPosts(
  authorId: string,
  items: Array<{
    id: string;
    title: string;
    content: string;
    likeCount?: number;
    favoriteCount?: number;
    shareCount?: number;
    commentCount?: number;
    reportCount?: number;
    viewCount?: number;
    publishedAt: Date;
  }>
) {
  await db.delete(postsTable).where(eq(postsTable.type, "moment"));
  await db.insert(postsTable).values(
    items.map((item) => ({
      id: item.id,
      authorId,
      type: "moment" as const,
      title: item.title,
      content: item.content,
      contentHtml: null,
      contentPlainText: item.content,
      contentCategoryId: null,
      coverImageFileId: null,
      status: "published" as const,
      rejectionReason: null,
      commentCount: item.commentCount ?? 0,
      reportCount: item.reportCount ?? 0,
      likeCount: item.likeCount ?? 0,
      favoriteCount: item.favoriteCount ?? 0,
      shareCount: item.shareCount ?? 0,
      viewCount: item.viewCount ?? 0,
      publishedAt: item.publishedAt,
      createdAt: item.publishedAt,
      updatedAt: item.publishedAt
    }))
  );
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

async function resetAndSeedPostState() {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await resetRedisForTesting();
      authRepo.resetEphemeralState();
      await resetDatabaseState();
      await seedDatabase();
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  process.env.UPLOAD_MAX_REPORT_IMAGE_SIZE_MB =
    originalUploadMaxReportImageSizeMb;
  process.env.UPLOAD_MAX_POST_VIDEO_SIZE_MB =
    originalUploadMaxPostVideoSizeMb;
  await resetAndSeedPostState();
});

afterAll(async () => {
  process.env.UPLOAD_MAX_REPORT_IMAGE_SIZE_MB =
    originalUploadMaxReportImageSizeMb;
  process.env.UPLOAD_MAX_POST_VIDEO_SIZE_MB =
    originalUploadMaxPostVideoSizeMb;
  await dbPool.end();
});

describe.sequential("posts and social flows", () => {
  it("ranks recommended feed items with a freshness plus relationship aware score", () => {
    const ranked = rankFeedItemsByRecommendation(
      [
        {
          id: "older_hot",
          title: "Older but highly engaging article",
          contentPreview: "A detailed breakdown of a long route with practical takeaways.",
          viewCount: 420,
          reportCount: 0,
          commentCount: 10,
          engagement: {
            likeCount: 28,
            favoriteCount: 6,
            shareCount: 4,
            viewer: {
              isAuthor: false,
              isFollowingAuthor: false,
              hasLiked: false,
              hasFavorited: false,
              hasShared: false
            }
          },
          author: {
            role: "user"
          },
          images: [],
          videos: [],
          createdAt: "2026-04-06T08:00:00.000Z",
          updatedAt: "2026-04-06T08:00:00.000Z",
          publishedAt: "2026-04-06T08:00:00.000Z",
          contentCategory: null
        },
        {
          id: "fresh_following",
          title: "Fresh following update with balanced quality",
          contentPreview: "A concise post with clear context, updated numbers, and useful references.",
          viewCount: 220,
          reportCount: 0,
          commentCount: 5,
          engagement: {
            likeCount: 14,
            favoriteCount: 3,
            shareCount: 2,
            viewer: {
              isAuthor: false,
              isFollowingAuthor: true,
              hasLiked: false,
              hasFavorited: false,
              hasShared: false
            }
          },
          author: {
            role: "user"
          },
          images: [{ id: "img_1", url: "", fileName: "", mimeType: "image/png", byteSize: 1 }],
          videos: [],
          createdAt: "2026-04-08T07:20:00.000Z",
          updatedAt: "2026-04-08T07:20:00.000Z",
          publishedAt: "2026-04-08T07:20:00.000Z",
          contentCategory: {
            id: "cat_1",
            slug: "news",
            name: "璧勮"
          }
        },
        {
          id: "official_pick",
          title: "Official brief",
          contentPreview: "Tiny",
          viewCount: 40,
          reportCount: 0,
          commentCount: 3,
          engagement: {
            likeCount: 12,
            favoriteCount: 4,
            shareCount: 3,
            viewer: {
              isAuthor: false,
              isFollowingAuthor: false,
              hasLiked: false,
              hasFavorited: false,
              hasShared: false
            }
          },
          author: {
            role: "admin"
          },
          images: [],
          videos: [],
          createdAt: "2026-04-08T07:45:00.000Z",
          updatedAt: "2026-04-08T07:45:00.000Z",
          publishedAt: "2026-04-08T07:45:00.000Z",
          contentCategory: {
            id: "cat_2",
            slug: "guide",
            name: "鎸囧崡"
          }
        }
      ],
      {
        now: new Date("2026-04-08T08:00:00.000Z"),
        type: "article"
      }
    );

    expect(ranked.map((item) => item.id)).toEqual(["fresh_following", "older_hot", "official_pick"]);
  });

  it("suppresses already engaged content in recommended ranking", () => {
    const ranked = rankFeedItemsByRecommendation(
      [
        {
          id: "already_liked",
          title: "Already liked content",
          contentPreview: "A familiar post the viewer already interacted with.",
          viewCount: 220,
          reportCount: 0,
          commentCount: 6,
          engagement: {
            likeCount: 18,
            favoriteCount: 5,
            shareCount: 2,
            viewer: {
              isAuthor: false,
              isFollowingAuthor: true,
              hasLiked: true,
              hasFavorited: false,
              hasShared: false
            }
          },
          author: {
            role: "user"
          },
          images: [{ id: "img_1", url: "", fileName: "", mimeType: "image/png", byteSize: 1 }],
          videos: [],
          createdAt: "2026-04-08T07:40:00.000Z",
          updatedAt: "2026-04-08T07:40:00.000Z",
          publishedAt: "2026-04-08T07:40:00.000Z",
          contentCategory: null
        },
        {
          id: "fresh_unseen",
          title: "Fresh unseen content",
          contentPreview: "A similar but still unseen post should rank ahead for discovery.",
          viewCount: 180,
          reportCount: 0,
          commentCount: 6,
          engagement: {
            likeCount: 18,
            favoriteCount: 5,
            shareCount: 2,
            viewer: {
              isAuthor: false,
              isFollowingAuthor: true,
              hasLiked: false,
              hasFavorited: false,
              hasShared: false
            }
          },
          author: {
            role: "user"
          },
          images: [{ id: "img_2", url: "", fileName: "", mimeType: "image/png", byteSize: 1 }],
          videos: [],
          createdAt: "2026-04-08T07:42:00.000Z",
          updatedAt: "2026-04-08T07:42:00.000Z",
          publishedAt: "2026-04-08T07:42:00.000Z",
          contentCategory: null
        }
      ],
      {
        now: new Date("2026-04-08T08:00:00.000Z"),
        type: "moment"
      }
    );

    expect(ranked.map((item) => item.id)).toEqual(["fresh_unseen", "already_liked"]);
  });

  it("keeps high-share moments inside the recommended candidate pool", async () => {
    const authorCookie = await loginWebUser("13800138174");
    const authorId = await getCurrentUserId(authorCookie);
    const baseTime = new Date("2026-04-08T08:00:00.000Z");

    const fillerItems = Array.from({ length: 60 }, (_, index) => ({
      id: `moment_fill_${index + 1}`,
      title: `Filler moment ${index + 1}`,
      content: "Consistent filler copy that keeps content quality neutral across the candidate pool.",
      likeCount: 1,
      publishedAt: new Date(baseTime.getTime() - (index + 1) * 60_000)
    }));

    await replaceMomentFeedWithSyntheticPosts(authorId, [
      ...fillerItems,
      {
        id: "moment_share_heavy",
        title: "Share-heavy discovery moment",
        content: "A strong discovery candidate with enough detail to earn a healthy recommendation score.",
        shareCount: 20,
        publishedAt: new Date(baseTime.getTime() + 60_000)
      }
    ]);

    const response = await app.request(`${API_ROUTES.circleFeed}?tab=recommended&limit=10`, {
      method: "GET"
    });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      items: Array<{ id: string }>;
      pagination: { total: number };
    };

    expect(payload.items.some((item) => item.id === "moment_share_heavy")).toBe(true);
    expect(payload.pagination.total).toBe(60);
  });

  it("aligns recommended pagination with the ranked candidate window", async () => {
    const authorCookie = await loginWebUser("13800138175");
    const authorId = await getCurrentUserId(authorCookie);
    const baseTime = new Date("2026-04-08T10:00:00.000Z");

    await replaceMomentFeedWithSyntheticPosts(
      authorId,
      Array.from({ length: 70 }, (_, index) => ({
        id: `moment_window_${index + 1}`,
        title: `Window moment ${index + 1}`,
        content: "A stable synthetic feed item used to verify recommended pagination semantics.",
        likeCount: index % 3,
        shareCount: index % 2,
        publishedAt: new Date(baseTime.getTime() - index * 60_000)
      }))
    );

    const pageSixResponse = await app.request(`${API_ROUTES.circleFeed}?tab=recommended&limit=10&page=6`, {
      method: "GET"
    });
    expect(pageSixResponse.status).toBe(200);
    const pageSixPayload = (await pageSixResponse.json()) as {
      items: Array<{ id: string }>;
      pagination: { total: number; hasMore: boolean };
    };

    expect(pageSixPayload.items).toHaveLength(10);
    expect(pageSixPayload.pagination.total).toBe(60);
    expect(pageSixPayload.pagination.hasMore).toBe(false);

    const pageSevenResponse = await app.request(`${API_ROUTES.circleFeed}?tab=recommended&limit=10&page=7`, {
      method: "GET"
    });
    expect(pageSevenResponse.status).toBe(200);
    const pageSevenPayload = (await pageSevenResponse.json()) as {
      items: Array<{ id: string }>;
      pagination: { total: number; hasMore: boolean };
    };

    expect(pageSevenPayload.items).toHaveLength(0);
    expect(pageSevenPayload.pagination.total).toBe(60);
    expect(pageSevenPayload.pagination.hasMore).toBe(false);
  });

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

  it("returns generic admin report details with schema-complete evidence images", async () => {
    const authorCookie = await loginWebUser("13800138177");
    const created = await createPost(authorCookie, {
      type: "moment",
      title: "Admin report detail source",
      content: "A published post that will be reported."
    });
    const adminCookie = await loginAdmin();
    await publishPost(adminCookie, created.item.id);

    const reporterCookie = await loginWebUser("13800138178");
    const reportImage = await uploadReportImage(reporterCookie, "post-report.png");
    const reportResponse = await app.request(API_ROUTES.posts.report(created.item.id), {
      method: "POST",
      headers: {
        cookie: reporterCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        reason: "闇€瑕佺鐞嗗憳鏍告煡",
        imageIds: [reportImage.item.id]
      })
    });
    expect(reportResponse.status).toBe(200);

    const adminReportResponse = await app.request(
      API_ROUTES.admin.reportDetail("post", created.item.id),
      {
        method: "GET",
        headers: { cookie: adminCookie }
      }
    );
    expect(adminReportResponse.status).toBe(200);

    const adminReportPayload = (await adminReportResponse.json()) as {
      items: Array<{
        reason: string;
        evidenceImages: Array<{
          id: string;
          url: string;
          fileName: string | null;
          mimeType: string;
          byteSize: number;
        }>;
      }>;
    };

    expect(adminReportPayload.items[0]?.reason).toBe("闇€瑕佺鐞嗗憳鏍告煡");
    expect(adminReportPayload.items[0]?.evidenceImages[0]).toMatchObject({
      fileName: "report-1.png",
      mimeType: "image/png",
      byteSize: 0
    });
  });

  it("tracks real post views per session and keeps them decoupled from interactions", async () => {
    const categoriesResponse = await app.request(API_ROUTES.content.categories, { method: "GET" });
    const categoriesPayload = (await categoriesResponse.json()) as {
      items: Array<{ id: string }>;
    };
    const articleCategoryId = categoriesPayload.items[0]?.id;
    expect(articleCategoryId).toBeTruthy();

    const adminCookie = await loginAdmin();
    const authorCookie = await loginWebUser("13800138174");
    const viewerCookie = await loginWebUser("13800138175");
    const secondViewerCookie = await loginWebUser("13800138176");
    const created = await createPost(authorCookie, {
      type: "article",
      title: "Tracked article",
      content: "Track article views with a real counter.",
      contentCategoryId: articleCategoryId
    });
    await publishPost(adminCookie, created.item.id);

    const firstViewResponse = await app.request(`${API_ROUTES.posts.detail(created.item.id)}/view`, {
      method: "POST",
      headers: {
        cookie: viewerCookie,
        "x-feijia-view-session": "post-view-session-a"
      }
    });
    expect(firstViewResponse.status).toBe(200);

    const duplicateViewResponse = await app.request(`${API_ROUTES.posts.detail(created.item.id)}/view`, {
      method: "POST",
      headers: {
        cookie: viewerCookie,
        "x-feijia-view-session": "post-view-session-a"
      }
    });
    expect(duplicateViewResponse.status).toBe(200);

    const secondSessionViewResponse = await app.request(`${API_ROUTES.posts.detail(created.item.id)}/view`, {
      method: "POST",
      headers: {
        cookie: secondViewerCookie,
        "x-feijia-view-session": "post-view-session-b"
      }
    });
    expect(secondSessionViewResponse.status).toBe(200);

    const likeResponse = await app.request(API_ROUTES.posts.interaction(created.item.id, "like"), {
      method: "POST",
      headers: {
        cookie: viewerCookie
      }
    });
    expect(likeResponse.status).toBe(200);

    const detailResponse = await app.request(API_ROUTES.posts.detail(created.item.id), {
      method: "GET",
      headers: { cookie: viewerCookie }
    });
    expect(detailResponse.status).toBe(200);
    const detailPayload = (await detailResponse.json()) as {
      item: {
        id: string;
        viewCount: number;
        engagement: {
          likeCount: number;
        };
      };
    };
    expect(detailPayload.item.viewCount).toBe(2);
    expect(detailPayload.item.engagement.likeCount).toBe(1);

    const feedResponse = await app.request(`${API_ROUTES.feed}?tab=latest`, {
      method: "GET",
      headers: { cookie: viewerCookie }
    });
    expect(feedResponse.status).toBe(200);
    const feedPayload = (await feedResponse.json()) as {
      items: Array<{
        id: string;
        viewCount: number;
      }>;
    };
    expect(feedPayload.items.find((item) => item.id === created.item.id)?.viewCount).toBe(2);
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

  it("rejects sensitive content when creating a post", async () => {
    const cookie = await loginWebUser("13800138196");

    const response = await app.request(API_ROUTES.posts.create, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie
      },
      body: JSON.stringify({
        type: "moment",
        title: "forbiddenword in title",
        content: "Normal content.",
        imageIds: [],
        videoIds: []
      })
    });

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { code: string; message: string };
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.message).toBe("Post content contains blocked words.");
  });

  it("rejects sensitive content when updating a post", async () => {
    const categoriesResponse = await app.request(API_ROUTES.content.categories, { method: "GET" });
    const categoriesPayload = (await categoriesResponse.json()) as {
      items: Array<{ id: string }>;
    };
    const articleCategoryId = categoriesPayload.items[0]?.id;
    expect(articleCategoryId).toBeTruthy();

    const cookie = await loginWebUser("13800138197");
    const created = await createPost(cookie, {
      type: "article",
      title: "Safe title",
      content: "Safe article content.",
      contentCategoryId: articleCategoryId
    });

    const response = await app.request(API_ROUTES.posts.detail(created.item.id), {
      method: "PUT",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type: "article",
        title: "Updated safe title",
        content: "This article body has for bidden-word and should fail.",
        contentHtml: "<p>This article body has for bidden-word and should fail.</p>",
        contentCategoryId: articleCategoryId,
        imageIds: [],
        videoIds: []
      })
    });

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { code: string; message: string };
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.message).toBe("Post content contains blocked words.");
  });

  it("rejects sensitive content when updating an official article", async () => {
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
        title: "Official safe title",
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

    const response = await app.request(API_ROUTES.posts.adminOfficialDetail(created.item.id), {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "违 禁 词 测 试",
        content: "Safe update content.",
        contentHtml: "<p>Safe update content.</p>",
        contentCategoryId: articleCategoryId,
        imageIds: [],
        videoIds: []
      })
    });

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { code: string; message: string };
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.message).toBe("Post content contains blocked words.");
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

    expect(created.item.status).toBe("pending");

    const feedResponse = await app.request(`${API_ROUTES.feed}?tab=latest`, { method: "GET" });
    expect(feedResponse.status).toBe(200);
    const feedPayload = (await feedResponse.json()) as {
      items: Array<{ id: string; status: string }>;
    };
    expect(feedPayload.items.some((item) => item.id === created.item.id)).toBe(false);
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

  it("keeps latest and following feeds in descending published time order", async () => {
    const latestArticlesResponse = await app.request(`${API_ROUTES.feed}?tab=latest`, {
      method: "GET"
    });
    expect(latestArticlesResponse.status).toBe(200);
    const latestArticlesPayload = (await latestArticlesResponse.json()) as {
      items: Array<{ publishedAt: string | null; createdAt: string }>;
    };
    const articleTimes = latestArticlesPayload.items.map((item) =>
      new Date(item.publishedAt ?? item.createdAt).getTime()
    );
    expect(articleTimes).toEqual([...articleTimes].sort((left, right) => right - left));

    const adminCookie = await loginAdmin();
    const authorCookie = await loginWebUser("13800138180");
    const followerCookie = await loginWebUser("13800138181");

    const firstMoment = await createPost(authorCookie, {
      type: "moment",
      title: "Following order first",
      content: "First moment in following order check."
    });
    await publishPost(adminCookie, firstMoment.item.id);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const secondMoment = await createPost(authorCookie, {
      type: "moment",
      title: "Following order second",
      content: "Second moment in following order check."
    });
    await publishPost(adminCookie, secondMoment.item.id);

    const followResponse = await app.request(API_ROUTES.social.follow(firstMoment.item.author.id), {
      method: "POST",
      headers: {
        cookie: followerCookie
      }
    });
    expect(followResponse.status).toBe(200);

    const followingResponse = await app.request(`${API_ROUTES.circleFeed}?tab=following`, {
      method: "GET",
      headers: {
        cookie: followerCookie
      }
    });
    expect(followingResponse.status).toBe(200);
    const followingPayload = (await followingResponse.json()) as {
      items: Array<{ id: string; publishedAt: string | null; createdAt: string }>;
    };
    const focusedIds = followingPayload.items
      .filter((item) => item.id === firstMoment.item.id || item.id === secondMoment.item.id)
      .map((item) => item.id);
    expect(focusedIds.slice(0, 2)).toEqual([secondMoment.item.id, firstMoment.item.id]);

    const followingTimes = followingPayload.items.map((item) =>
      new Date(item.publishedAt ?? item.createdAt).getTime()
    );
    expect(followingTimes).toEqual([...followingTimes].sort((left, right) => right - left));
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
      items: Array<{ actor: { avatarUrl: string | null } | null }>;
    };
    expect(notificationsPayload.items.length).toBeGreaterThan(0);
    expect(
      notificationsPayload.items
        .filter((item) => item.actor !== null)
        .every((item) => item.actor?.avatarUrl === null)
    ).toBe(true);

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
        content: "@椋炲弸13800138008 Yes, I softened yaw to keep the arc clean.",
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
        content: "@椋炲弸8007 That makes sense for the tighter turns.",
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
    if (reviewItem?.type === "review") {
      expect("rating" in reviewItem).toBe(false);
    } else {
      expect(reviewItem).toBeUndefined();
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
      items: Array<{
        type: string;
        target: { type: string; id: string };
      }>;
    };
    expect(
      authorNotificationsAfterDisabledPayload.items.some(
        (item) =>
          item.type === "post_commented" &&
          item.target.type === "post" &&
          item.target.id === post.item.id
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
      items: Array<{
        type: string;
        target: { type: string; id: string };
      }>;
    };
    expect(
      authorNotificationsAfterEnabledPayload.items.some(
        (item) =>
          item.type === "post_commented" &&
          item.target.type === "post" &&
          item.target.id === post.item.id
      )
    ).toBe(true);
  });

  it("emits system notifications for moderation status changes across domains", async () => {
    const adminCookie = await loginAdmin();

    const momentAuthorCookie = await loginWebUser("13800138210");
    const createdMoment = await createPost(momentAuthorCookie, {
      type: "moment",
      title: "System notification source moment",
      content: "This moment should trigger moderation system notification."
    });

    const rejectMomentResponse = await app.request(
      API_ROUTES.posts.adminDetail(createdMoment.item.id),
      {
        method: "PUT",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          status: "rejected",
          rejectionReason: "Content does not meet publishing standards."
        })
      }
    );
    expect(rejectMomentResponse.status).toBe(200);

    const momentAuthorNotifications = await app.request(API_ROUTES.social.notifications, {
      method: "GET",
      headers: { cookie: momentAuthorCookie }
    });
    expect(momentAuthorNotifications.status).toBe(200);
    const momentAuthorPayload = (await momentAuthorNotifications.json()) as {
      unreadByCategory: { system: number };
      items: Array<{ type: string; target: { id: string } }>;
    };
    expect(momentAuthorPayload.unreadByCategory.system).toBeGreaterThan(0);
    expect(
      momentAuthorPayload.items.some(
        (item) => item.type === "post_status_changed" && item.target.id === createdMoment.item.id
      )
    ).toBe(true);

    const adminRankingsResponse = await app.request(API_ROUTES.rankings.adminList, {
      method: "GET",
      headers: { cookie: adminCookie }
    });
    expect(adminRankingsResponse.status).toBe(200);
    const adminRankingsPayload = (await adminRankingsResponse.json()) as {
      items: Array<{ id: string; type: "official" | "community"; status: string; items: Array<{ id: string }> }>;
    };
    const communityRanking = adminRankingsPayload.items.find((item) => item.type === "community");
    expect(communityRanking?.id).toBeTruthy();
    const rankingId = expectDefined(communityRanking?.id);

    const updateRankingStatusResponse = await app.request(API_ROUTES.rankings.adminStatus(rankingId), {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "hidden"
      })
    });
    expect(updateRankingStatusResponse.status).toBe(200);

    const rankingItemId = expectDefined(communityRanking?.items[0]?.id);
    const updateRatingTargetStatusResponse = await app.request(
      API_ROUTES.rankings.adminItemStatus(rankingItemId),
      {
        method: "PUT",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          status: "hidden"
        })
      }
    );
    expect(updateRatingTargetStatusResponse.status).toBe(200);

    const rankingOwnerCookie = await loginWebUser("13800138103");
    const rankingOwnerNotifications = await app.request(API_ROUTES.social.notifications, {
      method: "GET",
      headers: { cookie: rankingOwnerCookie }
    });
    expect(rankingOwnerNotifications.status).toBe(200);
    const rankingOwnerPayload = (await rankingOwnerNotifications.json()) as {
      items: Array<{ type: string; target: { id: string } }>;
    };
    expect(
      rankingOwnerPayload.items.some(
        (item) => item.type === "ranking_status_changed" && item.target.id === rankingId
      )
    ).toBe(true);
    expect(
      rankingOwnerPayload.items.some(
        (item) =>
          item.type === "rating_target_status_changed" && item.target.id === rankingItemId
      )
    ).toBe(true);

    const adminSubmissionsResponse = await app.request(API_ROUTES.submissions.adminList, {
      method: "GET",
      headers: { cookie: adminCookie }
    });
    expect(adminSubmissionsResponse.status).toBe(200);
    const adminSubmissionsPayload = (await adminSubmissionsResponse.json()) as {
      items: Array<{ id: string; status: string }>;
    };
    const submitted = adminSubmissionsPayload.items.find((item) => item.status === "submitted");
    expect(submitted?.id).toBeTruthy();
    const submissionId = expectDefined(submitted?.id);

    const approveSubmissionResponse = await app.request(
      API_ROUTES.submissions.adminDetail(submissionId),
      {
        method: "PUT",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          status: "approved"
        })
      }
    );
    expect(approveSubmissionResponse.status).toBe(200);

    const submitterNotifications = await app.request(API_ROUTES.social.notifications, {
      method: "GET",
      headers: { cookie: await loginWebUser("13800138109") }
    });
    expect(submitterNotifications.status).toBe(200);
    const submitterPayload = (await submitterNotifications.json()) as {
      items: Array<{ type: string; target: { id: string } }>;
    };
    expect(
      submitterPayload.items.some(
        (item) =>
          item.type === "aircraft_submission_status_changed" && item.target.id === submissionId
      )
    ).toBe(true);

    const applicantCookie = await loginWebUser("13800138211");
    const createBrandApplicationResponse = await app.request(API_ROUTES.brandApplications.create, {
      method: "POST",
      headers: {
        cookie: applicantCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        slug: "system-notify-brand",
        name: "System Notify Brand",
        logoUrl: null,
        description: "Brand application for system notification tests"
      })
    });
    expect(createBrandApplicationResponse.status).toBe(200);
    const createdBrandApplication = (await createBrandApplicationResponse.json()) as {
      item: { id: string };
    };

    const approveBrandApplicationResponse = await app.request(
      API_ROUTES.brandApplications.adminDetail(createdBrandApplication.item.id),
      {
        method: "PUT",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          status: "approved"
        })
      }
    );
    expect(approveBrandApplicationResponse.status).toBe(200);

    const applicantNotifications = await app.request(API_ROUTES.social.notifications, {
      method: "GET",
      headers: { cookie: applicantCookie }
    });
    expect(applicantNotifications.status).toBe(200);
    const applicantPayload = (await applicantNotifications.json()) as {
      items: Array<{ type: string; target: { id: string } }>;
    };
    expect(
      applicantPayload.items.some(
        (item) =>
          item.type === "brand_application_status_changed" &&
          item.target.id === createdBrandApplication.item.id
      )
    ).toBe(true);

    const reviewAuthorCookie = await loginWebUser("13800138212");
    const createReviewResponse = await app.request(API_ROUTES.models.reviews("joby-s4"), {
      method: "POST",
      headers: {
        cookie: reviewAuthorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "System notification review sample"
      })
    });
    expect(createReviewResponse.status).toBe(200);
    const createdReviewPayload = (await createReviewResponse.json()) as {
      item: { id: string };
    };

    const hideReviewResponse = await app.request(
      API_ROUTES.models.adminReviewDetail(createdReviewPayload.item.id),
      {
        method: "PUT",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          status: "hidden"
        })
      }
    );
    expect(hideReviewResponse.status).toBe(200);

    const reviewAuthorNotifications = await app.request(API_ROUTES.social.notifications, {
      method: "GET",
      headers: { cookie: reviewAuthorCookie }
    });
    expect(reviewAuthorNotifications.status).toBe(200);
    const reviewAuthorPayload = (await reviewAuthorNotifications.json()) as {
      items: Array<{ type: string; target: { id: string } }>;
    };
    expect(
      reviewAuthorPayload.items.some(
        (item) =>
          item.type === "review_status_changed" &&
          item.target.id === createdReviewPayload.item.id
      )
    ).toBe(true);
  });

  it("provides admin message center and keeps todo independent from read", async () => {
    const adminCookie = await loginAdmin();
    const adminMeResponse = await app.request(API_ROUTES.auth.adminCurrentUser, {
      method: "GET",
      headers: { cookie: adminCookie }
    });
    expect(adminMeResponse.status).toBe(200);
    const adminMePayload = (await adminMeResponse.json()) as {
      user: { id: string } | null;
    };
    const adminUserId = adminMePayload.user?.id ?? "";
    expect(adminUserId).toBeTruthy();

    const postAuthorCookie = await loginWebUser("13800138213");
    const createdMoment = await createPost(postAuthorCookie, {
      type: "moment",
      title: "Admin message center source moment",
      content: "Trigger moderation message for admin center assertions."
    });

    const rejectMomentResponse = await app.request(
      API_ROUTES.posts.adminDetail(createdMoment.item.id),
      {
        method: "PUT",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          status: "rejected",
          rejectionReason: "瑙﹀彂 admin 娑堟伅涓績娴嬭瘯"
        })
      }
    );
    expect(rejectMomentResponse.status).toBe(200);

    const beforeMessagesResponse = await app.request(API_ROUTES.admin.messages, {
      method: "GET",
      headers: { cookie: adminCookie }
    });
    expect(beforeMessagesResponse.status).toBe(200);
    const beforeMessagesPayload = (await beforeMessagesResponse.json()) as {
      unreadCount: number;
      items: Array<{ id: string; type: string; domain: string; isRead: boolean }>;
    };
    const unreadMessage = beforeMessagesPayload.items.find(
      (item) =>
        item.type === "post_status_changed" &&
        item.domain === "posts" &&
        item.isRead === false
    );
    expect(unreadMessage?.id).toBeTruthy();

    const beforeTodoResponse = await app.request(API_ROUTES.admin.messageTodos, {
      method: "GET",
      headers: { cookie: adminCookie }
    });
    expect(beforeTodoResponse.status).toBe(200);
    const beforeTodoPayload = (await beforeTodoResponse.json()) as {
      pendingCount: number;
      items: Array<{ domain: string; pendingCount: number }>;
    };
    expect(beforeTodoPayload.pendingCount).toBeGreaterThan(0);
    expect(beforeTodoPayload.items.some((item) => item.domain === "post_comments")).toBe(true);

    await db.insert(notificationsTable).values({
      id: "notice_admin_non_inbox",
      userId: adminUserId,
      actorId: null,
      category: "system",
      type: "post_status_changed",
      targetType: "status",
      targetId: "manual_notice",
      targetTitle: "Manual notice",
      targetStatus: "pending",
      title: "闈?admin inbox 閫氱煡",
      summary: "杩欐潯閫氱煡涓嶅簲琚?admin read-all 璇激",
      preview: null,
      metadata: JSON.stringify({
        adminInbox: false
      }),
      postId: null,
      commentId: null,
      isRead: false
    });

    const markReadResponse = await app.request(
      API_ROUTES.admin.messageRead(expectDefined(unreadMessage?.id)),
      {
        method: "POST",
        headers: { cookie: adminCookie }
      }
    );
    expect(markReadResponse.status).toBe(200);

    const afterMessagesResponse = await app.request(API_ROUTES.admin.messages, {
      method: "GET",
      headers: { cookie: adminCookie }
    });
    expect(afterMessagesResponse.status).toBe(200);
    const afterMessagesPayload = (await afterMessagesResponse.json()) as {
      unreadCount: number;
      items: Array<{ id: string; isRead: boolean }>;
    };
    expect(afterMessagesPayload.unreadCount).toBe(beforeMessagesPayload.unreadCount - 1);
    const markedMessage = afterMessagesPayload.items.find(
      (item) => item.id === unreadMessage?.id
    );
    expect(markedMessage?.isRead).toBe(true);

    const markAllResponse = await app.request(API_ROUTES.admin.messagesReadAll, {
      method: "POST",
      headers: { cookie: adminCookie }
    });
    expect(markAllResponse.status).toBe(200);

    const afterTodoResponse = await app.request(API_ROUTES.admin.messageTodos, {
      method: "GET",
      headers: { cookie: adminCookie }
    });
    expect(afterTodoResponse.status).toBe(200);
    const afterTodoPayload = (await afterTodoResponse.json()) as {
      pendingCount: number;
    };
    expect(afterTodoPayload.pendingCount).toBe(beforeTodoPayload.pendingCount);

    const untouchedNotification = await db
      .select({
        id: notificationsTable.id,
        isRead: notificationsTable.isRead
      })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, adminUserId),
          eq(notificationsTable.id, "notice_admin_non_inbox")
        )
      )
      .limit(1);
    expect(untouchedNotification[0]?.isRead).toBe(false);
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
    if (!bySlug.has("aerial")) {
      expect(bySlug.get("news")).toBe("资讯");
      expect(bySlug.get("review")).toBe("评测");
      expect(bySlug.get("tech")).toBe("技术");
      expect(bySlug.get("guide")).toBe("指南");
      return;
    }
    expect(bySlug.get("news")).toBe("资讯");
    expect(bySlug.get("review")).toBe("评测");
    expect(bySlug.get("aerial")).toBe("航拍");
    expect(bySlug.get("tech")).toBe("技术");
    expect(bySlug.get("guide")).toBe("指南");
  });
});


