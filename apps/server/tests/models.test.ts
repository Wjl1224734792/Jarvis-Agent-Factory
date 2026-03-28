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
      };
    };

    expect(payload.item.slug).toBe("mini-4-pro");
    expect(payload.item.parameters.maxFlightTimeMinutes).toBe(45);
    expect(payload.item.reviewSummary.totalReviews).toBeGreaterThanOrEqual(0);
    expect("ratingSummary" in payload.item).toBe(false);
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
    const categoryPayload = (await categoryResponse.json()) as { item: { id: string } };

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
  });
});
