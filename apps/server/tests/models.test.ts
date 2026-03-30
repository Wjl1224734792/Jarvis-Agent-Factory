import { dbPool, resetDatabaseState, runMigrations, seedDatabase } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authRepo } from "../src/modules/auth/auth.repo";
import { uploadsRepo } from "../src/modules/uploads/upload.repo";
import { app } from "../src/app";

function extractCookie(setCookie: string | null): string {
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
      avatarFileId: null
    })
  });

  return extractCookie(completeResponse.headers.get("set-cookie"));
}

async function loginUser(phone: string) {
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

async function uploadReportImage(cookie: string, name = "evidence.png") {
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
    byteSize: 128,
    visibility: "public"
  });
  expect(pending?.id).toBeTruthy();

  const uploaded = await uploadsRepo.markFileUploaded({
    fileId: pending!.id,
    etag: "report-image-etag"
  });

  return uploaded!.id;
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

describe("models flows", () => {
  it("returns models list with filters", async () => {
    const response = await app.request(`${API_ROUTES.models.list}?categorySlug=drone`, {
      method: "GET"
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      total: number;
      items: Array<{
        slug: string;
        reviewSummary: { totalReviews: number };
        ratingSummary?: unknown;
      }>;
    };

    expect(payload.total).toBeGreaterThan(0);
    expect(payload.items.some((item) => item.slug === "mini-4-pro")).toBe(true);
    expect(payload.items[0]?.reviewSummary.totalReviews).toBeGreaterThanOrEqual(0);
    expect(payload.items[0] && "ratingSummary" in payload.items[0]).toBe(false);
  });

  it("returns model detail", async () => {
    const response = await app.request(API_ROUTES.models.detail("mini-4-pro"), {
      method: "GET"
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      item: {
        slug: string;
        reviewSummary: { totalReviews: number };
        ratingSummary?: unknown;
        parameters: { maxFlightTimeMinutes: number | null };
        interactionSummary: {
          interestCount: number;
          favoriteCount: number;
          shareCount: number;
        };
        viewer: {
          isInterested: boolean;
          isFavorited: boolean;
          hasShared: boolean;
        };
      };
    };

    expect(payload.item.slug).toBe("mini-4-pro");
    expect(payload.item.parameters.maxFlightTimeMinutes).toBe(45);
    expect(payload.item.reviewSummary.totalReviews).toBeGreaterThanOrEqual(0);
    expect("ratingSummary" in payload.item).toBe(false);
    expect(payload.item.interactionSummary.interestCount).toBeGreaterThanOrEqual(0);
    expect(payload.item.interactionSummary.favoriteCount).toBeGreaterThanOrEqual(0);
    expect(payload.item.interactionSummary.shareCount).toBeGreaterThanOrEqual(0);
    expect(payload.item.viewer.isInterested).toBe(false);
    expect(payload.item.viewer.isFavorited).toBe(false);
    expect(payload.item.viewer.hasShared).toBe(false);
  });

  it("supports model interactions and records model favorites in user content", async () => {
    const cookie = await loginUser("13800138031");
    const targetSlug = "mini-4-pro";

    const favoriteOnResponse = await app.request(
      API_ROUTES.models.interactions(targetSlug, "favorite"),
      {
        method: "POST",
        headers: { cookie }
      }
    );
    expect(favoriteOnResponse.status).toBe(200);

    const interestedOnResponse = await app.request(
      API_ROUTES.models.interactions(targetSlug, "interested"),
      {
        method: "POST",
        headers: { cookie }
      }
    );
    expect(interestedOnResponse.status).toBe(200);

    const shareFirstResponse = await app.request(API_ROUTES.models.interactions(targetSlug, "share"), {
      method: "POST",
      headers: { cookie }
    });
    expect(shareFirstResponse.status).toBe(200);

    const shareSecondResponse = await app.request(
      API_ROUTES.models.interactions(targetSlug, "share"),
      {
        method: "POST",
        headers: { cookie }
      }
    );
    expect(shareSecondResponse.status).toBe(200);

    const detailResponse = await app.request(API_ROUTES.models.detail(targetSlug), {
      method: "GET",
      headers: { cookie }
    });
    expect(detailResponse.status).toBe(200);

    const detailPayload = (await detailResponse.json()) as {
      item: {
        interactionSummary: {
          interestCount: number;
          favoriteCount: number;
          shareCount: number;
        };
        viewer: {
          isInterested: boolean;
          isFavorited: boolean;
          hasShared: boolean;
        };
      };
    };
    expect(detailPayload.item.viewer.isInterested).toBe(true);
    expect(detailPayload.item.viewer.isFavorited).toBe(true);
    expect(detailPayload.item.viewer.hasShared).toBe(true);
    expect(detailPayload.item.interactionSummary.shareCount).toBe(1);

    const meResponse = await app.request(API_ROUTES.auth.currentUser, {
      method: "GET",
      headers: { cookie }
    });
    const mePayload = (await meResponse.json()) as { user: { id: string } | null };
    expect(mePayload.user?.id).toBeTruthy();

    const contentResponse = await app.request(API_ROUTES.users.content(mePayload.user!.id), {
      method: "GET",
      headers: { cookie }
    });
    expect(contentResponse.status).toBe(200);
    const contentPayload = (await contentResponse.json()) as {
      items: Array<{ type: string; model?: { slug: string } }>;
    };
    expect(
      contentPayload.items.some(
        (item) => item.type === "favorite-model" && item.model?.slug === targetSlug
      )
    ).toBe(true);
  });

  it("allows admin to create category, brand and model", async () => {
    const adminLoginResponse = await app.request(API_ROUTES.auth.adminLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        account: "admin",
        password: "Admin#123"
      })
    });

    const adminCookie = extractCookie(adminLoginResponse.headers.get("set-cookie"));

    const categoryResponse = await app.request(API_ROUTES.models.categories, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie
      },
      body: JSON.stringify({
        slug: "tiltrotor",
        name: "Tiltrotor",
        sortOrder: 2,
        isEnabled: true
      })
    });

    expect(categoryResponse.status).toBe(200);
    const categoryPayload = (await categoryResponse.json()) as {
      item: { id: string; sortOrder: number };
    };

    const brandResponse = await app.request(API_ROUTES.models.brands, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie
      },
      body: JSON.stringify({
        slug: "beta-technologies",
        name: "BETA",
        categoryId: categoryPayload.item.id,
        sortOrder: 1,
        isEnabled: true
      })
    });

    expect(brandResponse.status).toBe(200);
    const brandPayload = (await brandResponse.json()) as { item: { id: string } };

    const modelResponse = await app.request(API_ROUTES.models.adminList, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie
      },
      body: JSON.stringify({
        slug: "alia-250",
        name: "ALIA-250",
        categoryId: categoryPayload.item.id,
        brandId: brandPayload.item.id,
        powerType: "electric",
        summary: "Compact tiltrotor for logistics tests",
        description: "Used to validate admin model management flow",
        maxFlightTimeMinutes: 25,
        maxRangeKilometers: 35,
        maxSpeedKph: 130,
        takeoffWeightGrams: null,
        isPublished: true
      })
    });

    expect(modelResponse.status).toBe(200);
    const modelPayload = (await modelResponse.json()) as { item: { slug: string } };
    expect(modelPayload.item.slug).toBe("alia-250");
    expect(categoryPayload.item.sortOrder).toBe(5);
  });

  it("stores brand logo and auto-increments brand sort order", async () => {
    const adminLoginResponse = await app.request(API_ROUTES.auth.adminLogin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        account: "admin",
        password: "Admin#123"
      })
    });
    const adminCookie = extractCookie(adminLoginResponse.headers.get("set-cookie"));

    const categoriesResponse = await app.request(API_ROUTES.models.categories, {
      method: "GET"
    });
    const categoriesPayload = (await categoriesResponse.json()) as Array<{ id: string; slug: string }>;
    const droneCategoryId = categoriesPayload.find((item) => item.slug === "drone")?.id;
    expect(droneCategoryId).toBeTruthy();

    const createBrandResponse = await app.request(API_ROUTES.models.brands, {
      method: "POST",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        slug: "skymaker",
        name: "SkyMaker",
        categoryId: droneCategoryId,
        sortOrder: 1,
        isEnabled: true,
        logoUrl: "https://cdn.example.com/brands/skymaker.png"
      })
    });
    expect(createBrandResponse.status).toBe(200);

    const createBrandPayload = (await createBrandResponse.json()) as {
      item: {
        id: string;
        sortOrder: number;
        logoUrl: string | null;
      };
    };
    expect(createBrandPayload.item.logoUrl).toBe("https://cdn.example.com/brands/skymaker.png");
    expect(createBrandPayload.item.sortOrder).toBe(7);

    const listBrandsResponse = await app.request(API_ROUTES.models.brands, {
      method: "GET"
    });
    expect(listBrandsResponse.status).toBe(200);
    const listBrandsPayload = (await listBrandsResponse.json()) as Array<{
      id: string;
      logoUrl: string | null;
    }>;
    expect(
      listBrandsPayload.some(
        (item) =>
          item.id === createBrandPayload.item.id &&
          item.logoUrl === "https://cdn.example.com/brands/skymaker.png"
      )
    ).toBe(true);
  });

  it("supports multi-category, multi-brand and keyword model filtering", async () => {
    const response = await app.request(
      `${API_ROUTES.models.list}?categorySlug=drone&categorySlug=business-jet&brandSlug=dji&brandSlug=cirrus&keyword=pro`,
      {
        method: "GET"
      }
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      items: Array<{
        slug: string;
        brand: { slug: string; logoUrl?: string | null };
      }>;
    };

    expect(payload.items.some((item) => item.slug === "mavic-3-pro")).toBe(true);
    expect(payload.items.some((item) => item.slug === "mini-4-pro")).toBe(true);
    expect(payload.items.some((item) => item.slug === "vision-jet-g2-plus")).toBe(false);
    expect(payload.items.every((item) => ["dji", "cirrus"].includes(item.brand.slug))).toBe(true);
  });

  it("supports model comments with reply, like, report, edit, delete and admin hide", async () => {
    const authorCookie = await loginUser("13800138041");
    const responderCookie = await loginUser("13800138042");
    const adminCookie = extractCookie(
      (
        await app.request(API_ROUTES.auth.adminLogin, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            account: "admin",
            password: "Admin#123"
          })
        })
      ).headers.get("set-cookie")
    );

    const createResponse = await app.request("/models/mini-4-pro/comments", {
      method: "POST",
      headers: {
        cookie: authorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "鏈哄瀷鎬ц兘绋冲畾锛岄€傚悎鏃ュ父椋炶銆?"
      })
    });
    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as {
      item: { id: string; content: string };
    };

    const replyResponse = await app.request(`/models/mini-4-pro/comments`, {
      method: "POST",
      headers: {
        cookie: responderCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "鍚屾剰锛岀壒鍒槸鏅氫笂鎷嶆憚鏃躲€?",
        parentCommentId: created.item.id
      })
    });
    expect(replyResponse.status).toBe(200);
    const reply = (await replyResponse.json()) as {
      item: { id: string };
    };

    const likeResponse = await app.request(`/models/mini-4-pro/comments/${created.item.id}/like`, {
      method: "POST",
      headers: { cookie: responderCookie }
    });
    expect(likeResponse.status).toBe(200);

    const reportImageId = await uploadReportImage(responderCookie);
    const reportResponse = await app.request(`/models/mini-4-pro/comments/${reply.item.id}/report`, {
      method: "POST",
      headers: {
        cookie: responderCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        reason: "璇勮鍐呭涓嶅綋",
        imageIds: [reportImageId]
      })
    });
    expect(reportResponse.status).toBe(200);

    const updateResponse = await app.request(`/models/mini-4-pro/comments/${created.item.id}`, {
      method: "PUT",
      headers: {
        cookie: authorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "宸叉洿鏂帮細缁埅琛ㄧ幇绋冲畾銆?"
      })
    });
    expect(updateResponse.status).toBe(200);

    const listResponse = await app.request("/models/mini-4-pro/comments", {
      method: "GET",
      headers: { cookie: authorCookie }
    });
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      items: Array<{
        id: string;
        likeCount: number;
        replies: Array<{ id: string; reportCount: number }>;
      }>;
    };
    expect(listPayload.items[0]?.id).toBe(created.item.id);
    expect(listPayload.items[0]?.likeCount).toBe(1);
    expect(listPayload.items[0]?.replies[0]?.id).toBe(reply.item.id);
    expect(listPayload.items[0]?.replies[0]?.reportCount).toBe(1);

    const adminHideResponse = await app.request(`/admin/model-comments/${created.item.id}`, {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "hidden"
      })
    });
    expect(adminHideResponse.status).toBe(200);

    const hiddenListResponse = await app.request("/models/mini-4-pro/comments", {
      method: "GET",
      headers: { cookie: authorCookie }
    });
    expect(hiddenListResponse.status).toBe(200);
    const hiddenListPayload = (await hiddenListResponse.json()) as { items: Array<{ id: string }> };
    expect(hiddenListPayload.items.some((item) => item.id === created.item.id)).toBe(false);

    const deleteReplyResponse = await app.request(`/models/mini-4-pro/comments/${reply.item.id}`, {
      method: "DELETE",
      headers: { cookie: responderCookie }
    });
    expect(deleteReplyResponse.status).toBe(200);
  });
});
