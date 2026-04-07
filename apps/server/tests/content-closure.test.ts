import { dbPool, resetDatabaseState, runMigrations, seedDatabase } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authRepo } from "../src/modules/auth/auth.repo";
import { resetRedisForTesting } from "../src/modules/auth/redis-client";
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

describe.sequential("content closure flows", () => {
  it("handles brand applications separately from aircraft submission approval flows", async () => {
    const adminCookie = await loginAdmin();
    const brandApplicantCookie = await loginUser("13800138023");

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
    const approvedBrandId = expectDefined(approvedBrandApplication.item.approvedBrandId);
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

    const submissionAuthorCookie = await loginUser("13800138024");
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
        lifecycleStatus: "unreleased",
        summary: "submission sample",
        description: "submission should stay pending review",
        coverImageFileId: null,
        galleryImageFileIds: [],
        videoFileId: null,
        priceMin: 4999,
        priceMax: 6999,
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
        priceMin: number | null;
        priceMax: number | null;
      };
    };
    expect(created.item.status).toBe("submitted");
    expect(created.item.approvedModelId).toBeNull();
    expect(created.item.approvedModelSlug).toBeNull();
    expect(created.item.priceMin).toBe(4999);
    expect(created.item.priceMax).toBe(6999);

    const rejectResponse = await app.request(API_ROUTES.submissions.adminDetail(created.item.id), {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "rejected",
        rejectionReason: "缺少必要资料，请补充后重新提交"
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
        lifecycleStatus: "released",
        summary: "approval sample",
        description: "submission should produce a published model after approval",
        coverImageFileId: null,
        galleryImageFileIds: [],
        videoFileId: null,
        priceMin: 888000,
        priceMax: 999000,
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
        priceMin: number | null;
        priceMax: number | null;
        brand: { id: string; name: string } | null;
      };
    };
    expect(approved.item.status).toBe("approved");
    expect(approved.item.approvedModelId).toBeTruthy();
    expect(approved.item.approvedModelSlug).toBeTruthy();
    expect(approved.item.priceMin).toBe(888000);
    expect(approved.item.priceMax).toBe(999000);
    expect(approved.item.brand?.id).toBe(approvedBrandId);
    expect(approved.item.brand?.name).toBe("Sky Labs");

    const modelsAfterApprove = (await (await app.request(API_ROUTES.models.list, { method: "GET" })).json()) as {
      items: Array<{
        name: string;
        priceMin: number | null;
        priceMax: number | null;
        brand: { name: string };
      }>;
    };
    expect(
      modelsAfterApprove.items.some(
        (item) =>
          item.name === "Sky Weaver X2" &&
          item.brand.name === "Sky Labs" &&
          item.priceMin === 888000 &&
          item.priceMax === 999000
      )
    ).toBe(true);
  });

  it("requires rejection reasons and allows brand application resubmission after editing", async () => {
    const adminCookie = await loginAdmin();
    const applicantCookie = await loginUser("13800138025");

    const createResponse = await app.request(API_ROUTES.brandApplications.create, {
      method: "POST",
      headers: {
        cookie: applicantCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        slug: "aero-lab",
        name: "Aero Lab",
        logoUrl: null,
        description: "Original application"
      })
    });
    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as {
      item: { id: string; status: string };
    };
    expect(created.item.status).toBe("pending");

    const rejectReason = "品牌资料过于简单，请补充更清晰的品牌说明";
    const rejectResponse = await app.request(
      API_ROUTES.brandApplications.adminDetail(created.item.id),
      {
        method: "PUT",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          status: "rejected",
          rejectionReason: rejectReason
        })
      }
    );
    expect(rejectResponse.status).toBe(200);
    const rejected = (await rejectResponse.json()) as {
      item: { status: string; rejectionReason: string | null };
    };
    expect(rejected.item.status).toBe("rejected");
    expect(rejected.item.rejectionReason).toBe(rejectReason);

    const reviseResponse = await app.request(API_ROUTES.brandApplications.detail(created.item.id), {
      method: "PUT",
      headers: {
        cookie: applicantCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        slug: "aero-lab-updated",
        name: "Aero Lab Updated",
        logoUrl: null,
        description: "Updated application content"
      })
    });
    expect(reviseResponse.status).toBe(200);
    const revised = (await reviseResponse.json()) as {
      item: {
        status: string;
        name: string;
        rejectionReason: string | null;
      };
    };
    expect(revised.item.status).toBe("pending");
    expect(revised.item.name).toBe("Aero Lab Updated");
    expect(revised.item.rejectionReason).toBeNull();
  });

  it("hides approved user models after rejection and keeps the same model on resubmission approval", async () => {
    const adminCookie = await loginAdmin();
    const authorCookie = await loginUser("13800138026");

    const modelsBeforeResponse = await app.request(API_ROUTES.models.list, { method: "GET" });
    const modelsBefore = (await modelsBeforeResponse.json()) as {
      filters: {
        categories: Array<{ id: string; slug: string }>;
        brands: Array<{ id: string; slug: string }>;
      };
    };
    const categoryId =
      modelsBefore.filters.categories.find((item) => item.slug === "drone")?.id ??
      modelsBefore.filters.categories[0]?.id;
    const brandId =
      modelsBefore.filters.brands.find((item) => item.slug === "dji")?.id ??
      modelsBefore.filters.brands[0]?.id;
    expect(categoryId).toBeTruthy();
    expect(brandId).toBeTruthy();

    const createResponse = await app.request(API_ROUTES.submissions.create, {
      method: "POST",
      headers: {
        cookie: authorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        categoryId,
        brandId,
        proposedBrandName: null,
        modelName: "Returnable Falcon",
        powerType: "electric",
        lifecycleStatus: "unreleased",
        summary: "Initial summary",
        description: "Initial description",
        coverImageFileId: null,
        galleryImageFileIds: [],
        videoFileId: null,
        priceMin: 12000,
        priceMax: 15000,
        maxFlightTimeMinutes: 36,
        maxRangeKilometers: 18,
        maxSpeedKph: 58,
        takeoffWeightGrams: 860
      })
    });
    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as {
      item: {
        id: string;
        author: { id: string };
      };
    };

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
    const approved = (await approveResponse.json()) as {
      item: {
        status: string;
        approvedModelId: string | null;
        priceMin: number | null;
        priceMax: number | null;
      };
    };
    expect(approved.item.status).toBe("approved");
    expect(approved.item.approvedModelId).toBeTruthy();
    expect(approved.item.priceMin).toBe(12000);
    expect(approved.item.priceMax).toBe(15000);
    const firstApprovedModelId = expectDefined(approved.item.approvedModelId);

    const rejectReason = "参数信息需要补充后再重新提交";
    const rejectResponse = await app.request(API_ROUTES.submissions.adminDetail(created.item.id), {
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
    const rejected = (await rejectResponse.json()) as {
      item: { status: string; rejectionReason: string | null; approvedModelId: string | null };
    };
    expect(rejected.item.status).toBe("rejected");
    expect(rejected.item.rejectionReason).toBe(rejectReason);
    expect(rejected.item.approvedModelId).toBe(firstApprovedModelId);

    const modelsAfterRejectResponse = await app.request(API_ROUTES.models.list, { method: "GET" });
    const modelsAfterReject = (await modelsAfterRejectResponse.json()) as {
      items: Array<{ id: string; name: string }>;
    };
    expect(modelsAfterReject.items.some((item) => item.id === firstApprovedModelId)).toBe(false);

    const userContentAfterRejectResponse = await app.request(API_ROUTES.users.content(created.item.author.id), {
      method: "GET",
      headers: {
        cookie: authorCookie
      }
    });
    expect(userContentAfterRejectResponse.status).toBe(200);
    const userContentAfterReject = (await userContentAfterRejectResponse.json()) as {
      items: Array<{
        type: string;
        id: string;
        status?: string;
        rejectionReason?: string | null;
      }>;
    };
    expect(
      userContentAfterReject.items.find(
        (item) => item.type === "aircraft" && item.id === created.item.id
      )
    ).toMatchObject({
      status: "rejected",
      rejectionReason: rejectReason
    });

    const reviseResponse = await app.request(API_ROUTES.submissions.detail(created.item.id), {
      method: "PUT",
      headers: {
        cookie: authorCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        categoryId,
        brandId,
        proposedBrandName: null,
        modelName: "Returnable Falcon Mk II",
        powerType: "electric",
        lifecycleStatus: "released",
        summary: "Updated summary",
        description: "Updated description",
        coverImageFileId: null,
        galleryImageFileIds: [],
        videoFileId: null,
        priceMin: 18000,
        priceMax: 21000,
        maxFlightTimeMinutes: 40,
        maxRangeKilometers: 22,
        maxSpeedKph: 61,
        takeoffWeightGrams: 880
      })
    });
    expect(reviseResponse.status).toBe(200);
    const revised = (await reviseResponse.json()) as {
      item: { status: string; rejectionReason: string | null };
    };
    expect(revised.item.status).toBe("submitted");
    expect(revised.item.rejectionReason).toBeNull();

    const reapproveResponse = await app.request(API_ROUTES.submissions.adminDetail(created.item.id), {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "approved"
      })
    });
    expect(reapproveResponse.status).toBe(200);
    const reapproved = (await reapproveResponse.json()) as {
      item: {
        status: string;
        approvedModelId: string | null;
        approvedModelSlug: string | null;
        priceMin: number | null;
        priceMax: number | null;
      };
    };
    expect(reapproved.item.status).toBe("approved");
    expect(reapproved.item.approvedModelId).toBe(firstApprovedModelId);
    expect(reapproved.item.priceMin).toBe(18000);
    expect(reapproved.item.priceMax).toBe(21000);

    const reapprovedModelDetailResponse = await app.request(
      API_ROUTES.models.detail(expectDefined(reapproved.item.approvedModelSlug)),
      {
        method: "GET"
      }
    );
    expect(reapprovedModelDetailResponse.status).toBe(200);
    const reapprovedModelDetail = (await reapprovedModelDetailResponse.json()) as {
      item: { priceMin: number | null; priceMax: number | null };
    };
    expect(reapprovedModelDetail.item.priceMin).toBe(18000);
    expect(reapprovedModelDetail.item.priceMax).toBe(21000);
  });
});
