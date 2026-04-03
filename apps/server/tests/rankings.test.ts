import { dbPool, resetDatabaseState, runMigrations, seedDatabase } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
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

async function uploadReportImage(cookie: string, name = "report-evidence.png") {
  const meResponse = await app.request(API_ROUTES.auth.currentUser, {
    method: "GET",
    headers: { cookie }
  });
  expect(meResponse.status).toBe(200);
  const mePayload = (await meResponse.json()) as { user: { id: string } | null };
  const ownerId = mePayload.user?.id;
  expect(ownerId).toBeTruthy();

  const pending = await uploadsRepo.createPendingFile({
    ownerId: ownerId!,
    bizType: "report-image",
    mediaKind: "image",
    provider: "minio",
    bucket: "feijia-media",
    region: "us-east-1",
    objectKey: `report-image/${ownerId}/${name}`,
    fileName: name,
    mimeType: "image/png",
    byteSize: 256,
    visibility: "public"
  });
  expect(pending?.id).toBeTruthy();

  const uploaded = await uploadsRepo.markFileUploaded({
    fileId: pending.id,
    etag: "report-evidence"
  });

  return uploaded.id;
}

async function updateSiteSettings(
  adminCookie: string,
  input: {
    postModerationEnabled: boolean;
    commentModerationEnabled: boolean;
    reviewModerationEnabled: boolean;
    submissionModerationEnabled: boolean;
    rankingModerationEnabled: boolean;
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

describe("rankings flows", () => {
  it("returns persisted official rankings and community rankings", async () => {
    const response = await app.request(API_ROUTES.rankings.overview, { method: "GET" });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      official: Array<{
        id: string;
        type: "official" | "community";
        itemAddPolicy: "public" | "owner";
        items: Array<{ id: string; averageScore: number }>;
      }>;
      community: Array<{ id: string; items: Array<{ id: string; title: string }> }>;
    };

    expect(payload.official.length).toBeGreaterThanOrEqual(1);
    expect(payload.official.every((item) => item.type === "official")).toBe(true);
    expect(payload.official.every((item) => item.itemAddPolicy === "owner")).toBe(true);
    expect(payload.official[0]?.items.length).toBeGreaterThan(0);
    expect(payload.community.length).toBeGreaterThanOrEqual(1);
    expect(payload.community[0]?.items.length).toBeGreaterThan(0);
  });

  it("enforces official ranking permissions and owner-only add policy", async () => {
    const ownerCookie = await loginUser("13800138000");
    const visitorCookie = await loginUser("13800138001");
    const adminCookie = await loginAdmin();

    const communityCreate = await app.request(API_ROUTES.rankings.create, {
      method: "POST",
      headers: {
        cookie: ownerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type: "community",
        title: "Community ranking",
        description: "community ranking sample",
        coverImageFileId: null,
        coverImageUrl: null,
        itemAddPolicy: "public",
        items: [
          {
            title: "DJI Mini 4 Pro",
            summary: "community linked model",
            imageFileId: null,
            imageUrl: null,
            brandName: "DJI",
            linkedModelSlug: "mini-4-pro"
          }
        ]
      })
    });
    expect(communityCreate.status).toBe(200);

    const ownerCreateOfficial = await app.request(API_ROUTES.rankings.create, {
      method: "POST",
      headers: {
        cookie: ownerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type: "official",
        title: "Owner official ranking",
        description: "should be forbidden",
        coverImageFileId: null,
        coverImageUrl: null,
        itemAddPolicy: "public",
        items: [
          {
            title: "item",
            summary: null,
            imageFileId: null,
            imageUrl: null,
            brandName: null,
            linkedModelSlug: "mini-4-pro"
          }
        ]
      })
    });
    expect(ownerCreateOfficial.status).toBe(403);

    const adminCreateOfficial = await app.request(API_ROUTES.rankings.create, {
      method: "POST",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type: "official",
        title: "Admin official ranking",
        description: "official ranking sample",
        coverImageFileId: null,
        coverImageUrl: null,
        itemAddPolicy: "public",
        items: [
          {
            title: "DJI Mini 4 Pro",
            summary: "official linked model",
            imageFileId: null,
            imageUrl: null,
            brandName: "DJI",
            linkedModelSlug: "mini-4-pro"
          }
        ]
      })
    });
    expect(adminCreateOfficial.status).toBe(200);

    const officialPayload = (await adminCreateOfficial.json()) as {
      item: {
        id: string;
        type: "official" | "community";
        itemAddPolicy: "public" | "owner";
      };
    };

    expect(officialPayload.item.type).toBe("official");
    expect(officialPayload.item.itemAddPolicy).toBe("owner");

    const officialRankingId = officialPayload.item.id;

    const visitorAddOfficial = await app.request(API_ROUTES.rankings.items(officialRankingId), {
      method: "POST",
      headers: {
        cookie: visitorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "visitor add",
        summary: "should be forbidden",
        imageFileId: null,
        imageUrl: null,
        brandName: null,
        linkedModelSlug: null
      })
    });
    expect(visitorAddOfficial.status).toBe(403);

    const adminAddOfficial = await app.request(API_ROUTES.rankings.items(officialRankingId), {
      method: "POST",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "admin add",
        summary: "owner add on official",
        imageFileId: null,
        imageUrl: null,
        brandName: null,
        linkedModelSlug: null
      })
    });
    expect(adminAddOfficial.status).toBe(200);

    const ownerUpdateOfficial = await app.request(API_ROUTES.rankings.update(officialRankingId), {
      method: "PUT",
      headers: {
        cookie: ownerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type: "official",
        title: "owner tries update official",
        description: "forbidden",
        coverImageFileId: null,
        coverImageUrl: null,
        itemAddPolicy: "public",
        items: [
          {
            title: "item",
            summary: null,
            imageFileId: null,
            imageUrl: null,
            brandName: null,
            linkedModelSlug: "mini-4-pro"
          }
        ]
      })
    });
    expect(ownerUpdateOfficial.status).toBe(403);

    const adminUpdateOfficial = await app.request(API_ROUTES.rankings.update(officialRankingId), {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type: "official",
        title: "admin updated official",
        description: "official still owner-only",
        coverImageFileId: null,
        coverImageUrl: null,
        itemAddPolicy: "public",
        items: [
          {
            title: "DJI Mini 4 Pro",
            summary: "official linked model",
            imageFileId: null,
            imageUrl: null,
            brandName: "DJI",
            linkedModelSlug: "mini-4-pro"
          }
        ]
      })
    });
    expect(adminUpdateOfficial.status).toBe(200);

    const updatedOfficial = (await adminUpdateOfficial.json()) as {
      item: {
        itemAddPolicy: "public" | "owner";
      };
    };
    expect(updatedOfficial.item.itemAddPolicy).toBe("owner");

    const visitorDetail = await app.request(API_ROUTES.rankings.detail(officialRankingId), {
      method: "GET",
      headers: { cookie: visitorCookie }
    });
    expect(visitorDetail.status).toBe(200);

    const visitorDetailPayload = (await visitorDetail.json()) as {
      item: {
        type: "official" | "community";
        itemAddPolicy: "public" | "owner";
        viewer: { canAddItems: boolean };
      };
    };

    expect(visitorDetailPayload.item.type).toBe("official");
    expect(visitorDetailPayload.item.itemAddPolicy).toBe("owner");
    expect(visitorDetailPayload.item.viewer.canAddItems).toBe(false);
  });

  it("supports ranking item review and ratingBreakdown for community and official items", async () => {
    const cookie = await loginUser("13800138000");

    const overviewResponse = await app.request(API_ROUTES.rankings.overview, {
      method: "GET",
      headers: { cookie }
    });
    const overviewPayload = (await overviewResponse.json()) as {
      official: Array<{ items: Array<{ id: string }> }>;
      community: Array<{ items: Array<{ id: string }> }>;
    };

    const communityItemId = overviewPayload.community[0]?.items[0]?.id;
    const officialItemId = overviewPayload.official[0]?.items[0]?.id;

    expect(communityItemId).toBeTruthy();
    expect(officialItemId).toBeTruthy();

    const firstReviewResponse = await app.request(API_ROUTES.rankings.itemReview(communityItemId), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rating: 5,
        content: "first review"
      })
    });
    expect(firstReviewResponse.status).toBe(200);

    const secondReviewResponse = await app.request(API_ROUTES.rankings.itemReview(communityItemId), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rating: 4,
        content: "updated review"
      })
    });
    expect(secondReviewResponse.status).toBe(200);

    const secondReviewPayload = (await secondReviewResponse.json()) as {
      item: {
        totalRatings: number;
        ratingBreakdown: Array<{ score: number; count: number }>;
      };
    };
    expect(secondReviewPayload.item.ratingBreakdown).toHaveLength(5);
    expect(secondReviewPayload.item.ratingBreakdown.map((entry) => entry.score)).toEqual([5, 4, 3, 2, 1]);
    expect(
      secondReviewPayload.item.ratingBreakdown.reduce((sum, entry) => sum + entry.count, 0)
    ).toBe(secondReviewPayload.item.totalRatings);

    const itemDetailResponse = await app.request(API_ROUTES.rankings.itemDetail(communityItemId), {
      method: "GET",
      headers: { cookie }
    });
    expect(itemDetailResponse.status).toBe(200);

    const itemDetailPayload = (await itemDetailResponse.json()) as {
      item: {
        totalRatings: number;
        ratingBreakdown: Array<{ score: number; count: number }>;
        myRating: number | null;
        myReview: { rating: number; content: string } | null;
      };
    };

    expect(itemDetailPayload.item.ratingBreakdown).toHaveLength(5);
    expect(itemDetailPayload.item.ratingBreakdown.map((entry) => entry.score)).toEqual([5, 4, 3, 2, 1]);
    expect(
      itemDetailPayload.item.ratingBreakdown.reduce((sum, entry) => sum + entry.count, 0)
    ).toBe(itemDetailPayload.item.totalRatings);
    expect(itemDetailPayload.item.myRating).toBe(4);
    expect(itemDetailPayload.item.myReview?.rating).toBe(4);
    expect(itemDetailPayload.item.myReview?.content).toContain("updated review");

    const officialRatingResponse = await app.request(API_ROUTES.rankings.itemRatings(officialItemId), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rating: 5
      })
    });
    expect(officialRatingResponse.status).toBe(200);

    const officialItemDetailResponse = await app.request(API_ROUTES.rankings.itemDetail(officialItemId), {
      method: "GET",
      headers: { cookie }
    });
    expect(officialItemDetailResponse.status).toBe(200);

    const officialItemDetailPayload = (await officialItemDetailResponse.json()) as {
      item: {
        totalRatings: number;
        ratingBreakdown: Array<{ score: number; count: number }>;
      };
    };
    expect(officialItemDetailPayload.item.ratingBreakdown).toHaveLength(5);
    expect(officialItemDetailPayload.item.ratingBreakdown.map((entry) => entry.score)).toEqual([5, 4, 3, 2, 1]);
    expect(
      officialItemDetailPayload.item.ratingBreakdown.reduce((sum, entry) => sum + entry.count, 0)
    ).toBe(officialItemDetailPayload.item.totalRatings);
  });

  it("puts new community rankings into pending when ranking moderation is enabled and only exposes published ones publicly", async () => {
    const ownerCookie = await loginUser("13800138071");
    const adminCookie = await loginAdmin();

    await updateSiteSettings(adminCookie, {
      postModerationEnabled: true,
      commentModerationEnabled: false,
      reviewModerationEnabled: false,
      submissionModerationEnabled: true,
      rankingModerationEnabled: true
    });

    const createResponse = await app.request(API_ROUTES.rankings.create, {
      method: "POST",
      headers: {
        cookie: ownerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type: "community",
        title: "Pending harbor ranking",
        description: "pending review",
        coverImageFileId: null,
        coverImageUrl: null,
        itemAddPolicy: "public",
        items: [
          {
            title: "DJI Mini 4 Pro",
            summary: "pending linked model",
            imageFileId: null,
            imageUrl: null,
            brandName: "DJI",
            linkedModelSlug: "mini-4-pro"
          }
        ]
      })
    });
    expect(createResponse.status).toBe(200);

    const createPayload = (await createResponse.json()) as {
      item: {
        id: string;
        status: "pending" | "published" | "rejected" | "hidden";
      };
    };
    expect(createPayload.item.status).toBe("pending");

    const publicOverviewResponse = await app.request(API_ROUTES.rankings.overview, {
      method: "GET"
    });
    const publicOverviewPayload = (await publicOverviewResponse.json()) as {
      community: Array<{ id: string }>;
    };
    expect(publicOverviewPayload.community.some((item) => item.id === createPayload.item.id)).toBe(false);

    const publishResponse = await app.request(`/admin/rankings/${createPayload.item.id}/status`, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "published"
      })
    });
    expect(publishResponse.status).toBe(200);

    const publishedOverviewResponse = await app.request(API_ROUTES.rankings.overview, {
      method: "GET"
    });
    const publishedOverviewPayload = (await publishedOverviewResponse.json()) as {
      community: Array<{ id: string; status: "pending" | "published" | "rejected" | "hidden" }>;
    };
    const publishedItem = publishedOverviewPayload.community.find(
      (item) => item.id === createPayload.item.id
    );
    expect(publishedItem?.status).toBe("published");
  });

  it("lets ranking owner manage all items while contributors only manage their own item", async () => {
    const ownerCookie = await loginUser("13800138081");
    const contributorCookie = await loginUser("13800138082");
    const outsiderCookie = await loginUser("13800138083");

    const createResponse = await app.request(API_ROUTES.rankings.create, {
      method: "POST",
      headers: {
        cookie: ownerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type: "community",
        title: "Owner managed ranking",
        description: "public add enabled",
        coverImageFileId: null,
        itemAddPolicy: "public",
        items: [
          {
            title: "Seed item",
            summary: "owner item",
            imageFileId: null,
            brandName: "DJI",
            linkedModelSlug: "mini-4-pro"
          }
        ]
      })
    });
    expect(createResponse.status).toBe(200);
    const createPayload = (await createResponse.json()) as {
      item: { id: string };
    };

    const addResponse = await app.request(API_ROUTES.rankings.items(createPayload.item.id), {
      method: "POST",
      headers: {
        cookie: contributorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "Contributor item",
        summary: "pending contributor item",
        imageFileId: null,
        brandName: "Autel",
        linkedModelSlug: "autel-evo-lite-plus"
      })
    });
    expect(addResponse.status).toBe(200);
    const addPayload = (await addResponse.json()) as {
      item: { items: Array<{ id: string; title: string; status: string; authorId?: string | null }> };
    };
    const contributorItem = addPayload.item.items.find((item) => item.title === "Contributor item");
    expect(contributorItem?.status).toBe("pending");
    expect(contributorItem?.authorId).toBeTruthy();

    const contributorItemId = contributorItem?.id;
    expect(contributorItemId).toBeTruthy();

    const contributorUpdate = await app.request(API_ROUTES.rankings.itemDetail(contributorItemId!), {
      method: "PUT",
      headers: {
        cookie: contributorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "Contributor item updated",
        summary: "updated by contributor",
        imageFileId: null,
        brandName: "Autel",
        linkedModelSlug: "autel-evo-lite-plus"
      })
    });
    expect(contributorUpdate.status).toBe(200);

    const outsiderUpdate = await app.request(API_ROUTES.rankings.itemDetail(contributorItemId!), {
      method: "PUT",
      headers: {
        cookie: outsiderCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "Outsider edit",
        summary: "should fail",
        imageFileId: null,
        brandName: "Autel",
        linkedModelSlug: "autel-evo-lite-plus"
      })
    });
    expect(outsiderUpdate.status).toBe(403);

    const ownerUpdate = await app.request(API_ROUTES.rankings.itemDetail(contributorItemId!), {
      method: "PUT",
      headers: {
        cookie: ownerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "Owner override item",
        summary: "updated by owner",
        imageFileId: null,
        brandName: "Autel",
        linkedModelSlug: "autel-evo-lite-plus"
      })
    });
    expect(ownerUpdate.status).toBe(200);

    const outsiderDelete = await app.request(API_ROUTES.rankings.itemDetail(contributorItemId!), {
      method: "DELETE",
      headers: {
        cookie: outsiderCookie
      }
    });
    expect(outsiderDelete.status).toBe(403);

    const ownerDelete = await app.request(API_ROUTES.rankings.itemDetail(contributorItemId!), {
      method: "DELETE",
      headers: {
        cookie: ownerCookie
      }
    });
    expect(ownerDelete.status).toBe(200);
  });

  it("supports ranking item reply threads plus comment like/report/edit/delete flow", async () => {
    const authorCookie = await loginUser("13800138084");
    const replierCookie = await loginUser("13800138085");
    const watcherCookie = await loginUser("13800138086");

    const overviewResponse = await app.request(API_ROUTES.rankings.overview, {
      method: "GET",
      headers: { cookie: authorCookie }
    });
    const overviewPayload = (await overviewResponse.json()) as {
      community: Array<{ items: Array<{ id: string }> }>;
    };
    const itemId = overviewPayload.community[0]?.items[0]?.id;
    expect(itemId).toBeTruthy();

    const reviewResponse = await app.request(API_ROUTES.rankings.itemReview(itemId), {
      method: "POST",
      headers: {
        cookie: authorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rating: 5,
        content: "Root review for reply thread."
      })
    });
    expect(reviewResponse.status).toBe(200);
    const reviewPayload = (await reviewResponse.json()) as {
      item: { myReview: { id: string } | null };
    };
    const rootCommentId = reviewPayload.item.myReview?.id;
    expect(rootCommentId).toBeTruthy();

    const replyResponse = await app.request(API_ROUTES.rankings.itemComments(itemId), {
      method: "POST",
      headers: {
        cookie: replierCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "Reply from another pilot.",
        parentCommentId: rootCommentId
      })
    });
    expect(replyResponse.status).toBe(200);
    const replyPayload = (await replyResponse.json()) as { item: { id: string } };
    const replyCommentId = replyPayload.item.id;

    const likeResponse = await app.request(
      API_ROUTES.rankings.itemCommentLike(itemId, replyCommentId),
      {
        method: "POST",
        headers: { cookie: watcherCookie }
      }
    );
    expect(likeResponse.status).toBe(200);

    const reportImageId = await uploadReportImage(watcherCookie);
    const commentReportResponse = await app.request(
      API_ROUTES.rankings.itemCommentReport(itemId, replyCommentId),
      {
        method: "POST",
        headers: {
          cookie: watcherCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          reason: "spam reply",
          imageIds: [reportImageId]
        })
      }
    );
    expect(commentReportResponse.status).toBe(200);

    const itemReportResponse = await app.request(API_ROUTES.rankings.itemReport(itemId), {
      method: "POST",
      headers: {
        cookie: watcherCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        reason: "test item report",
        imageIds: [reportImageId]
      })
    });
    expect(itemReportResponse.status).toBe(200);

    const detailResponse = await app.request(API_ROUTES.rankings.itemDetail(itemId), {
      method: "GET",
      headers: { cookie: watcherCookie }
    });
    expect(detailResponse.status).toBe(200);
    const detailPayload = (await detailResponse.json()) as {
      item: {
        reportCount: number;
        comments: Array<{
          id: string;
          replyCount: number;
          replies: Array<{
            id: string;
            likeCount: number;
            reportCount: number;
            replyToUser: { displayName: string } | null;
          }>;
        }>;
      };
    };
    expect(detailPayload.item.reportCount).toBeGreaterThanOrEqual(1);
    expect(detailPayload.item.comments[0]?.replyCount).toBe(1);
    expect(detailPayload.item.comments[0]?.replies[0]?.replyToUser?.displayName).toBeTruthy();
    expect(detailPayload.item.comments[0]?.replies[0]?.likeCount).toBe(1);
    expect(detailPayload.item.comments[0]?.replies[0]?.reportCount).toBe(1);

    const updateReplyResponse = await app.request(
      API_ROUTES.rankings.itemCommentDetail(itemId, replyCommentId),
      {
        method: "PUT",
        headers: {
          cookie: replierCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          content: "Reply updated by author."
        })
      }
    );
    expect(updateReplyResponse.status).toBe(200);

    const deleteReplyResponse = await app.request(
      API_ROUTES.rankings.itemCommentDetail(itemId, replyCommentId),
      {
        method: "DELETE",
        headers: {
          cookie: replierCookie
        }
      }
    );
    expect(deleteReplyResponse.status).toBe(200);

    const afterDeleteResponse = await app.request(API_ROUTES.rankings.itemDetail(itemId), {
      method: "GET",
      headers: { cookie: watcherCookie }
    });
    const afterDeletePayload = (await afterDeleteResponse.json()) as {
      item: {
        comments: Array<{ replyCount: number; replies: Array<{ id: string }> }>;
      };
    };
    expect(afterDeletePayload.item.comments[0]?.replyCount).toBe(0);
    expect(afterDeletePayload.item.comments[0]?.replies).toHaveLength(0);
  });

  it("allows admins to reject ranking items with a reason and authors to edit-resubmit them", async () => {
    const ownerCookie = await loginUser("13800138021");
    const contributorCookie = await loginUser("13800138022");
    const adminCookie = await loginAdmin();

    const createRankingResponse = await app.request(API_ROUTES.rankings.create, {
      method: "POST",
      headers: {
        cookie: ownerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type: "community",
        title: "Public ranking",
        description: "Community maintained ranking",
        coverImageFileId: null,
        itemAddPolicy: "public",
        items: [
          {
            title: "Seed item",
            summary: "seed",
            imageFileId: null,
            brandName: null,
            linkedModelSlug: "mini-4-pro"
          }
        ]
      })
    });
    expect(createRankingResponse.status).toBe(200);
    const createdRanking = (await createRankingResponse.json()) as {
      item: { id: string };
    };

    const addItemResponse = await app.request(API_ROUTES.rankings.items(createdRanking.item.id), {
      method: "POST",
      headers: {
        cookie: contributorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "Contributor item",
        summary: "awaiting moderation",
        imageFileId: null,
        brandName: "DJI",
        linkedModelSlug: "mini-4-pro"
      })
    });
    expect(addItemResponse.status).toBe(200);
    const addedItemPayload = (await addItemResponse.json()) as {
      item: {
        items: Array<{ id: string; title: string; authorId?: string | null }>;
      };
    };
    const contributedItem = addedItemPayload.item.items.find((item) => item.title === "Contributor item");
    expect(contributedItem?.id).toBeTruthy();

    const rejectReason = "条目信息不完整，请补充后重新提交";
    const rejectResponse = await app.request(API_ROUTES.rankings.adminItemStatus(contributedItem!.id), {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "rejected",
        rejectionReason: rejectReason
      })
    });
    expect(rejectResponse.status).toBe(200);
    const rejectedItem = (await rejectResponse.json()) as {
      item: { status: string; rejectionReason: string | null };
    };
    expect(rejectedItem.item.status).toBe("rejected");
    expect(rejectedItem.item.rejectionReason).toBe(rejectReason);

    const detailAfterRejectResponse = await app.request(API_ROUTES.rankings.itemDetail(contributedItem!.id), {
      method: "GET",
      headers: {
        cookie: contributorCookie
      }
    });
    expect(detailAfterRejectResponse.status).toBe(200);
    const detailAfterReject = (await detailAfterRejectResponse.json()) as {
      item: { status: string; rejectionReason: string | null };
    };
    expect(detailAfterReject.item.status).toBe("rejected");
    expect(detailAfterReject.item.rejectionReason).toBe(rejectReason);

    const contributorIdentityResponse = await app.request(API_ROUTES.auth.currentUser, {
      method: "GET",
      headers: {
        cookie: contributorCookie
      }
    });
    expect(contributorIdentityResponse.status).toBe(200);
    const contributorIdentity = (await contributorIdentityResponse.json()) as {
      user: { id: string } | null;
    };

    const userContentResponse = await app.request(API_ROUTES.users.content(contributorIdentity.user!.id), {
      method: "GET",
      headers: {
        cookie: contributorCookie
      }
    });
    expect(userContentResponse.status).toBe(200);
    const userContent = (await userContentResponse.json()) as {
      items: Array<{
        type: string;
        id: string;
        status?: string;
        rejectionReason?: string | null;
      }>;
    };
    expect(
      userContent.items.find((item) => item.type === "rating-target" && item.id === contributedItem!.id)
    ).toMatchObject({
      status: "rejected",
      rejectionReason: rejectReason
    });

    const updateResponse = await app.request(API_ROUTES.rankings.itemDetail(contributedItem!.id), {
      method: "PUT",
      headers: {
        cookie: contributorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "Contributor item v2",
        summary: "resubmitted",
        imageFileId: null,
        brandName: "DJI",
        linkedModelSlug: "mini-4-pro"
      })
    });
    expect(updateResponse.status).toBe(200);
    const updatedItem = (await updateResponse.json()) as {
      item: { status: string; rejectionReason: string | null; title: string };
    };
    expect(updatedItem.item.title).toBe("Contributor item v2");
    expect(updatedItem.item.status).toBe("pending");
    expect(updatedItem.item.rejectionReason).toBeNull();
  });

  it("requires rating for top-level ranking item comments and keeps multiple comments from the same user", async () => {
    const cookie = await loginUser("13800138032");

    const overviewResponse = await app.request(API_ROUTES.rankings.overview, {
      method: "GET",
      headers: { cookie }
    });
    const overviewPayload = (await overviewResponse.json()) as {
      community: Array<{ items: Array<{ id: string }> }>;
    };
    const itemId = overviewPayload.community[0]?.items[0]?.id;
    expect(itemId).toBeTruthy();

    const missingRatingResponse = await app.request(API_ROUTES.rankings.itemComments(itemId), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "No rating comment"
      })
    });
    expect(missingRatingResponse.status).toBe(400);

    const firstCommentResponse = await app.request(API_ROUTES.rankings.itemComments(itemId), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "First scored comment",
        rating: 5
      })
    });
    expect(firstCommentResponse.status).toBe(200);
    const firstComment = (await firstCommentResponse.json()) as {
      item: { id: string };
    };

    const secondCommentResponse = await app.request(API_ROUTES.rankings.itemComments(itemId), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "Second scored comment",
        rating: 4
      })
    });
    expect(secondCommentResponse.status).toBe(200);

    const invalidReplyResponse = await app.request(API_ROUTES.rankings.itemComments(itemId), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "Reply should not carry rating",
        parentCommentId: firstComment.item.id,
        rating: 3
      })
    });
    expect(invalidReplyResponse.status).toBe(400);

    const validReplyResponse = await app.request(API_ROUTES.rankings.itemComments(itemId), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "Reply without rating",
        parentCommentId: firstComment.item.id
      })
    });
    expect(validReplyResponse.status).toBe(200);

    const detailResponse = await app.request(API_ROUTES.rankings.itemDetail(itemId), {
      method: "GET",
      headers: { cookie }
    });
    expect(detailResponse.status).toBe(200);
    const detailPayload = (await detailResponse.json()) as {
      item: {
        comments: Array<{ id: string; rating: number | null; replies: Array<{ rating: number | null }> }>;
        ratingBreakdown: Array<{ score: number; count: number }>;
      };
    };

    expect(detailPayload.item.comments.length).toBeGreaterThanOrEqual(2);
    expect(detailPayload.item.comments.filter((comment) => comment.rating !== null).length).toBeGreaterThanOrEqual(2);
    expect(detailPayload.item.comments[0]?.replies[0]?.rating ?? null).toBeNull();
    expect(detailPayload.item.ratingBreakdown.reduce((sum, entry) => sum + entry.count, 0)).toBeGreaterThanOrEqual(2);
  });
});
