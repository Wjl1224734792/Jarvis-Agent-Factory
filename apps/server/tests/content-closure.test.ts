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

describe("content closure flows", () => {
  it("creates aircraft submission as submitted and does not auto-create model", async () => {
    const categoriesResponse = await app.request(API_ROUTES.content.categories, { method: "GET" });
    expect(categoriesResponse.status).toBe(200);

    const categoriesPayload = (await categoriesResponse.json()) as {
      items: Array<{ slug: string }>;
    };
    expect(categoriesPayload.items.length).toBeGreaterThanOrEqual(5);

    const modelsBeforeResponse = await app.request(API_ROUTES.models.list, { method: "GET" });
    const modelsBefore = (await modelsBeforeResponse.json()) as {
      items: Array<{ name: string }>;
      filters: {
        categories: Array<{ id: string; slug: string }>;
      };
    };
    const droneCategoryId =
      modelsBefore.filters.categories.find((item) => item.slug === "drone")?.id ??
      modelsBefore.filters.categories[0]?.id;
    expect(droneCategoryId).toBeTruthy();

    const cookie = await loginUser("13800138199");
    const submissionResponse = await app.request(API_ROUTES.submissions.create, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        categoryId: droneCategoryId,
        brandId: null,
        proposedBrandName: "FeiJia Labs",
        modelName: "Sky Weaver X1",
        powerType: "electric",
        summary: "submission sample",
        description: "submission should stay pending review",
        coverImageUrl: null,
        galleryImageUrls: [],
        videoAssetId: null,
        maxFlightTimeMinutes: 38,
        maxRangeKilometers: 22,
        maxSpeedKph: 64,
        takeoffWeightGrams: 920
      })
    });

    expect(submissionResponse.status).toBe(200);
    const submissionPayload = (await submissionResponse.json()) as {
      item: {
        status: string;
        approvedModelId: string | null;
        approvedModelSlug: string | null;
        proposedBrandName: string | null;
      };
    };

    expect(submissionPayload.item.status).toBe("submitted");
    expect(submissionPayload.item.approvedModelId).toBeNull();
    expect(submissionPayload.item.approvedModelSlug).toBeNull();
    expect(submissionPayload.item.proposedBrandName).toBe("FeiJia Labs");

    const modelsResponse = await app.request(API_ROUTES.models.list, { method: "GET" });
    const modelsPayload = (await modelsResponse.json()) as {
      items: Array<{ name: string }>;
    };

    expect(modelsPayload.items.some((item) => item.name === "Sky Weaver X1")).toBe(false);
  });

  it("admin approve creates brand and model based on proposedBrandName", async () => {
    const modelsResponse = await app.request(API_ROUTES.models.list, { method: "GET" });
    const modelsPayload = (await modelsResponse.json()) as {
      filters: {
        categories: Array<{ id: string; slug: string }>;
      };
    };
    const categoryId =
      modelsPayload.filters.categories.find((item) => item.slug === "drone")?.id ??
      modelsPayload.filters.categories[0]?.id;
    expect(categoryId).toBeTruthy();

    const cookie = await loginUser("13800138198");
    const createResponse = await app.request(API_ROUTES.submissions.create, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        categoryId,
        brandId: null,
        proposedBrandName: "SkyMaker Labs",
        modelName: "Sky Weaver X2",
        powerType: "electric",
        summary: null,
        description: null,
        coverImageUrl: null,
        galleryImageUrls: [],
        videoAssetId: null,
        maxFlightTimeMinutes: 40,
        maxRangeKilometers: 28,
        maxSpeedKph: 70,
        takeoffWeightGrams: 980
      })
    });
    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as { item: { id: string } };

    const adminCookie = await loginAdmin();
    const approveResponse = await app.request(API_ROUTES.submissions.adminDetail(created.item.id), {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "approved"
      })
    });

    expect(approveResponse.status).toBe(200);
    const approvePayload = (await approveResponse.json()) as {
      item: {
        status: string;
        approvedModelId: string | null;
        approvedModelSlug: string | null;
        brand: { name: string } | null;
      };
    };

    expect(approvePayload.item.status).toBe("approved");
    expect(approvePayload.item.approvedModelId).toBeTruthy();
    expect(approvePayload.item.approvedModelSlug).toBeTruthy();
    expect(approvePayload.item.brand?.name).toBe("SkyMaker Labs");

    const modelsAfterResponse = await app.request(API_ROUTES.models.list, { method: "GET" });
    const modelsAfter = (await modelsAfterResponse.json()) as {
      items: Array<{ name: string; brand: { name: string } }>;
    };

    expect(
      modelsAfter.items.some(
        (item) => item.name === "Sky Weaver X2" && item.brand.name === "SkyMaker Labs"
      )
    ).toBe(true);
  });

  it("admin reject only updates status and does not create model", async () => {
    const modelsResponse = await app.request(API_ROUTES.models.list, { method: "GET" });
    const modelsPayload = (await modelsResponse.json()) as {
      filters: {
        categories: Array<{ id: string; slug: string }>;
        brands: Array<{ id: string; slug: string }>;
      };
    };
    const categoryId =
      modelsPayload.filters.categories.find((item) => item.slug === "drone")?.id ??
      modelsPayload.filters.categories[0]?.id;
    const brandId =
      modelsPayload.filters.brands.find((item) => item.slug === "dji")?.id ??
      modelsPayload.filters.brands[0]?.id;

    const cookie = await loginUser("13800138197");
    const createResponse = await app.request(API_ROUTES.submissions.create, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        categoryId,
        brandId,
        proposedBrandName: null,
        modelName: "Sky Weaver Reject",
        powerType: "electric",
        summary: null,
        description: null,
        coverImageUrl: null,
        galleryImageUrls: [],
        videoAssetId: null,
        maxFlightTimeMinutes: 30,
        maxRangeKilometers: 20,
        maxSpeedKph: 60,
        takeoffWeightGrams: 700
      })
    });
    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as { item: { id: string } };

    const adminCookie = await loginAdmin();
    const rejectResponse = await app.request(API_ROUTES.submissions.adminDetail(created.item.id), {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "rejected"
      })
    });

    expect(rejectResponse.status).toBe(200);
    const rejectPayload = (await rejectResponse.json()) as {
      item: {
        status: string;
        approvedModelId: string | null;
      };
    };
    expect(rejectPayload.item.status).toBe("rejected");
    expect(rejectPayload.item.approvedModelId).toBeNull();

    const modelsAfterResponse = await app.request(API_ROUTES.models.list, { method: "GET" });
    const modelsAfter = (await modelsAfterResponse.json()) as {
      items: Array<{ name: string }>;
    };
    expect(modelsAfter.items.some((item) => item.name === "Sky Weaver Reject")).toBe(false);
  });
});
