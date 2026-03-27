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

describe("rankings flows", () => {
  it("returns official rankings plus persisted community rankings", async () => {
    const response = await app.request(API_ROUTES.rankings.overview, { method: "GET" });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      official: {
        items: Array<{ id: string; averageScore: number; linkedModel: { slug: string } | null }>;
      };
      community: Array<{ id: string; items: Array<{ id: string; title: string }> }>;
    };

    expect(payload.official.items.length).toBeGreaterThanOrEqual(5);
    expect(payload.official.items[0]?.averageScore).toBeGreaterThanOrEqual(
      payload.official.items[1]?.averageScore ?? 0
    );
    expect(payload.community.length).toBeGreaterThanOrEqual(1);
    expect(payload.community[0]?.items.length).toBeGreaterThan(0);
  });

  it("creates rankings with itemAddPolicy, allows public add-item, supports editing and official detail", async () => {
    const ownerCookie = await loginUser("13800138000");
    const visitorCookie = await loginUser("13800138001");

    const createResponse = await app.request(API_ROUTES.rankings.create, {
      method: "POST",
      headers: {
        cookie: ownerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "城市试飞清单",
        description: "验证 mixed ranking item 与公开加项。",
        coverImageUrl: null,
        itemAddPolicy: "public",
        items: [
          {
            title: "DJI Mini 4 Pro",
            summary: "轻量化入门样本",
            imageUrl: null,
            brandName: "DJI",
            linkedModelSlug: "mini-4-pro"
          },
          {
            title: "自定义夜航套件",
            summary: "用户自定义条目",
            imageUrl: "https://images.example.com/night-kit.jpg",
            brandName: "社区",
            linkedModelSlug: null
          }
        ]
      })
    });
    expect(createResponse.status).toBe(200);

    const createdPayload = (await createResponse.json()) as {
      item: {
        id: string;
        itemAddPolicy: "public" | "owner";
        viewer: { canEdit: boolean; canAddItems: boolean };
        items: Array<{ id: string; title: string }>;
      };
    };

    expect(createdPayload.item.itemAddPolicy).toBe("public");
    expect(createdPayload.item.viewer.canEdit).toBe(true);
    expect(createdPayload.item.viewer.canAddItems).toBe(true);
    expect(createdPayload.item.items).toHaveLength(2);

    const rankingId = createdPayload.item.id;

    const addItemResponse = await app.request(API_ROUTES.rankings.items(rankingId), {
      method: "POST",
      headers: {
        cookie: visitorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "访客补充对象",
        summary: "public 榜单允许直接新增",
        imageUrl: "https://images.example.com/visitor-item.jpg",
        brandName: "访客",
        linkedModelSlug: null
      })
    });
    expect(addItemResponse.status).toBe(200);

    const addItemPayload = (await addItemResponse.json()) as {
      item: {
        items: Array<{ title: string }>;
      };
    };
    expect(addItemPayload.item.items.some((item) => item.title === "访客补充对象")).toBe(true);

    const updateResponse = await app.request(API_ROUTES.rankings.detail(rankingId), {
      method: "PUT",
      headers: {
        cookie: ownerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "城市试飞清单（已更新）",
        description: "改为仅作者可加项。",
        coverImageUrl: null,
        itemAddPolicy: "owner",
        items: [
          {
            title: "DJI Mini 4 Pro",
            summary: "轻量化入门样本",
            imageUrl: null,
            brandName: "DJI",
            linkedModelSlug: "mini-4-pro"
          }
        ]
      })
    });
    expect(updateResponse.status).toBe(200);

    const updatePayload = (await updateResponse.json()) as {
      item: {
        title: string;
        itemAddPolicy: "public" | "owner";
        viewer: { canEdit: boolean; canAddItems: boolean };
      };
    };
    expect(updatePayload.item.title).toContain("已更新");
    expect(updatePayload.item.itemAddPolicy).toBe("owner");
    expect(updatePayload.item.viewer.canEdit).toBe(true);
    expect(updatePayload.item.viewer.canAddItems).toBe(true);

    const forbiddenAddResponse = await app.request(API_ROUTES.rankings.items(rankingId), {
      method: "POST",
      headers: {
        cookie: visitorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "不应进入榜单",
        summary: "owner 榜单应拒绝访客新增",
        imageUrl: null,
        brandName: "访客",
        linkedModelSlug: null
      })
    });
    expect(forbiddenAddResponse.status).toBe(403);

    const officialDetailResponse = await app.request(API_ROUTES.rankings.detail("official-endurance"), {
      method: "GET",
      headers: { cookie: ownerCookie }
    });
    expect(officialDetailResponse.status).toBe(200);

    const officialDetailPayload = (await officialDetailResponse.json()) as {
      item: {
        id: string;
        type: "official" | "community";
        viewer: { canEdit: boolean; canAddItems: boolean };
        items: Array<{ id: string; averageScore: number }>;
      };
    };

    expect(officialDetailPayload.item.id).toBe("official-endurance");
    expect(officialDetailPayload.item.type).toBe("official");
    expect(officialDetailPayload.item.viewer.canEdit).toBe(false);
    expect(officialDetailPayload.item.viewer.canAddItems).toBe(false);
    expect(officialDetailPayload.item.items.length).toBeGreaterThan(0);
  });

  it("supports unified ranking item review upsert", async () => {
    const cookie = await loginUser("13800138000");

    const overviewResponse = await app.request(API_ROUTES.rankings.overview, {
      method: "GET",
      headers: { cookie }
    });
    const overviewPayload = (await overviewResponse.json()) as {
      community: Array<{ id: string; items: Array<{ id: string }> }>;
    };
    const rankingItemId = overviewPayload.community[0]?.items[0]?.id;

    expect(rankingItemId).toBeTruthy();

    const firstReviewResponse = await app.request(API_ROUTES.rankings.itemReview(rankingItemId!), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rating: 5,
        content: "第一次点评，给满分。"
      })
    });
    expect(firstReviewResponse.status).toBe(200);

    const secondReviewResponse = await app.request(API_ROUTES.rankings.itemReview(rankingItemId!), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rating: 4,
        content: "更新点评，调整为四星。"
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

    const itemDetailResponse = await app.request(API_ROUTES.rankings.itemDetail(rankingItemId!), {
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
        comments: Array<{ author: { id: string }; rating: number; content: string }>;
      };
    };

    expect(itemDetailPayload.item.ratingBreakdown).toHaveLength(5);
    expect(itemDetailPayload.item.ratingBreakdown.map((entry) => entry.score)).toEqual([5, 4, 3, 2, 1]);
    expect(itemDetailPayload.item.ratingBreakdown.find((entry) => entry.score === 4)?.count).toBeGreaterThan(0);
    expect(
      itemDetailPayload.item.ratingBreakdown.reduce((sum, entry) => sum + entry.count, 0)
    ).toBe(itemDetailPayload.item.totalRatings);
    expect(itemDetailPayload.item.myRating).toBe(4);
    expect(itemDetailPayload.item.myReview?.rating).toBe(4);
    expect(itemDetailPayload.item.myReview?.content).toContain("更新点评");
    expect(
      itemDetailPayload.item.comments.filter((item) => item.content.includes("更新点评"))
    ).toHaveLength(1);

    const overviewAfterReview = await app.request(API_ROUTES.rankings.overview, {
      method: "GET",
      headers: { cookie }
    });
    const overviewAfterReviewPayload = (await overviewAfterReview.json()) as {
      official: {
        items: Array<{ id: string }>;
      };
    };
    const officialItemId = overviewAfterReviewPayload.official.items[0]?.id;
    expect(officialItemId).toBeTruthy();

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
});
