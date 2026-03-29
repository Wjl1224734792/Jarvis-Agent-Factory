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
      avatarFileId: null
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

describe.sequential("content closure flows", () => {
  it("handles brand applications separately from aircraft submission approval flows", async () => {
    const adminCookie = await loginAdmin();
    const brandApplicantCookie = await loginUser("13800138166");

    const brandApplicationResponse = await app.request(API_ROUTES.brandApplications.create, {
      method: "POST",
      headers: {
        cookie: brandApplicantCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        slug: "sky-labs",
        name: "Sky Labs",
        logoUrl: null,
        description: "A multi-category aviation brand."
      })
    });
    expect(brandApplicationResponse.status).toBe(200);
    const brandApplicationPayload = (await brandApplicationResponse.json()) as {
      item: { id: string; status: string; approvedBrandId: string | null };
    };
    expect(brandApplicationPayload.item.status).toBe("pending");
    expect(brandApplicationPayload.item.approvedBrandId).toBeNull();

    const approveBrandApplicationResponse = await app.request(
      API_ROUTES.brandApplications.adminDetail(brandApplicationPayload.item.id),
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
    const approvedBrandApplication = (await approveBrandApplicationResponse.json()) as {
      item: { status: string; approvedBrandId: string | null };
    };
    expect(approvedBrandApplication.item.status).toBe("approved");
    expect(approvedBrandApplication.item.approvedBrandId).toBeTruthy();

    const brandsResponse = await app.request(API_ROUTES.models.brands, { method: "GET" });
    const brands = (await brandsResponse.json()) as Array<{ id: string; name: string }>;
    const approvedBrandId = approvedBrandApplication.item.approvedBrandId!;
    expect(brands.some((item) => item.id === approvedBrandId && item.name === "Sky Labs")).toBe(true);

    const modelsBeforeResponse = await app.request(API_ROUTES.models.list, { method: "GET" });
    const modelsBefore = (await modelsBeforeResponse.json()) as {
      items: Array<{ name: string }>;
      filters: {
        categories: Array<{ id: string; slug: string }>;
        brands: Array<{ id: string; slug: string }>;
      };
    };
    const droneCategoryId =
      modelsBefore.filters.categories.find((item) => item.slug === "drone")?.id ??
      modelsBefore.filters.categories[0]?.id;
    const djiBrandId =
      modelsBefore.filters.brands.find((item) => item.slug === "dji")?.id ??
      modelsBefore.filters.brands[0]?.id;
    expect(droneCategoryId).toBeTruthy();
    expect(djiBrandId).toBeTruthy();

    const submissionAuthorCookie = await loginUser("13800138167");
    const createResponse = await app.request(API_ROUTES.submissions.create, {
      method: "POST",
      headers: {
        cookie: submissionAuthorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        categoryId: droneCategoryId,
        brandId: djiBrandId,
        proposedBrandName: null,
        modelName: "Sky Weaver X1",
        powerType: "electric",
        summary: "submission sample",
        description: "submission should stay pending review",
        coverImageFileId: null,
        galleryImageFileIds: [],
        videoFileId: null,
        maxFlightTimeMinutes: 38,
        maxRangeKilometers: 22,
        maxSpeedKph: 64,
        takeoffWeightGrams: 920
      })
    });

    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as {
      item: {
        id: string;
        status: string;
        approvedModelId: string | null;
        approvedModelSlug: string | null;
      };
    };
    expect(created.item.status).toBe("submitted");
    expect(created.item.approvedModelId).toBeNull();
    expect(created.item.approvedModelSlug).toBeNull();

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
    const rejected = (await rejectResponse.json()) as {
      item: { status: string; approvedModelId: string | null };
    };
    expect(rejected.item.status).toBe("rejected");
    expect(rejected.item.approvedModelId).toBeNull();

    const modelsAfterReject = (await (await app.request(API_ROUTES.models.list, { method: "GET" })).json()) as {
      items: Array<{ name: string }>;
    };
    expect(modelsAfterReject.items.some((item) => item.name === "Sky Weaver X1")).toBe(false);

    const createApprovedResponse = await app.request(API_ROUTES.submissions.create, {
      method: "POST",
      headers: {
        cookie: submissionAuthorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        categoryId: droneCategoryId,
        brandId: approvedBrandId,
        proposedBrandName: null,
        modelName: "Sky Weaver X2",
        powerType: "electric",
        summary: "approval sample",
        description: "submission should produce a published model after approval",
        coverImageFileId: null,
        galleryImageFileIds: [],
        videoFileId: null,
        maxFlightTimeMinutes: 40,
        maxRangeKilometers: 28,
        maxSpeedKph: 70,
        takeoffWeightGrams: 980
      })
    });
    expect(createApprovedResponse.status).toBe(200);
    const createdForApproval = (await createApprovedResponse.json()) as {
      item: { id: string };
    };

    const approveResponse = await app.request(
      API_ROUTES.submissions.adminDetail(createdForApproval.item.id),
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
    expect(approveResponse.status).toBe(200);
    const approved = (await approveResponse.json()) as {
      item: {
        status: string;
        approvedModelId: string | null;
        approvedModelSlug: string | null;
        brand: { id: string; name: string } | null;
      };
    };
    expect(approved.item.status).toBe("approved");
    expect(approved.item.approvedModelId).toBeTruthy();
    expect(approved.item.approvedModelSlug).toBeTruthy();
    expect(approved.item.brand?.id).toBe(approvedBrandId);
    expect(approved.item.brand?.name).toBe("Sky Labs");

    const modelsAfterApprove = (await (await app.request(API_ROUTES.models.list, { method: "GET" })).json()) as {
      items: Array<{ name: string; brand: { name: string } }>;
    };
    expect(
      modelsAfterApprove.items.some(
        (item) => item.name === "Sky Weaver X2" && item.brand.name === "Sky Labs"
      )
    ).toBe(true);
  });
});
