import { dbPool, resetDatabaseState, runMigrations, seedDatabase } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authRepo } from "../src/modules/auth/auth.repo";
import { app } from "../src/app";

function extractCookie(setCookie: string | null) {
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

    const firstReviewResponse = await app.request(API_ROUTES.rankings.itemReview(communityItemId!), {
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

    const secondReviewResponse = await app.request(API_ROUTES.rankings.itemReview(communityItemId!), {
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

    const itemDetailResponse = await app.request(API_ROUTES.rankings.itemDetail(communityItemId!), {
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

    const officialRatingResponse = await app.request(API_ROUTES.rankings.itemRatings(officialItemId!), {
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

    const officialItemDetailResponse = await app.request(API_ROUTES.rankings.itemDetail(officialItemId!), {
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
});
