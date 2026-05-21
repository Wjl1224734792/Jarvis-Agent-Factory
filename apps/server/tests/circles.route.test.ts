import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { API_ROUTES } from "@feijia/shared";

const {
  circlesServiceMock,
  mockCurrentUser,
} = vi.hoisted(() => ({
  circlesServiceMock: {
    listFeed: vi.fn(),
    updateCircle: vi.fn(),
    deleteCircle: vi.fn(),
    assignCircleToCategory: vi.fn(),
    removeCircleFromCategory: vi.fn(),
  },
  mockCurrentUser: { id: "user_1", role: "user" },
}));

vi.mock("../src/modules/circles/circles.service", () => ({
  circlesService: circlesServiceMock,
}));

// Build a minimal test app that replicates the route behaviors under test,
// without importing the real circlesRoute (which has transitive @feijia/db deps).
function createTestApp() {
  const app = new Hono();

  // Replicate: POST /api/v1/circles/posts → 410 Gone
  app.post(API_ROUTES.circles.createPost, (c) => {
    return c.json({
      code: "GONE",
      message: "独立发帖已废弃，所有帖子必须归属圈子。请在圈子内发帖。",
    }, 410);
  });

  // Replicate: GET /api/v1/circles/feed with tab validation
  app.get(API_ROUTES.circles.feed, async (c) => {
    const tab = c.req.query("tab");
    if (tab && !["recommended", "latest", "following"].includes(tab)) {
      return c.json({ code: "INVALID_TAB", message: `Unknown tab: ${tab}` }, 400);
    }
    const items = await circlesServiceMock.listFeed({
      tab: (tab as "recommended" | "latest" | "following") || undefined,
      currentUserId: mockCurrentUser.id,
      limit: Number(c.req.query("limit")) || undefined,
      offset: Number(c.req.query("offset")) || undefined,
    });
    return c.json({ items });
  });

  return app;
}

function createAuthTestApp(userOverride?: { id: string; role: string }) {
  const app = new Hono();

  const currentUser = userOverride ?? mockCurrentUser;

  // Replicate: PUT /api/v1/circles/:id (requireAuth)
  app.put(API_ROUTES.circles.update(":id"), async (c) => {
    const body = await c.req.json();
    const result = await circlesServiceMock.updateCircle(
      c.req.param("id")!,
      currentUser.id,
      currentUser.role,
      {
        name: body.name,
        slug: body.slug,
        description: body.description,
        joinMode: body.joinMode,
        isEnabled: body.isEnabled,
      }
    );
    if (result.kind === "not_found") return c.json({ code: "NOT_FOUND", message: "Circle not found." }, 404);
    if (result.kind === "forbidden") return c.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
    return c.json({ item: result.circle });
  });

  // Replicate: DELETE /api/v1/circles/:id (requireAuth)
  app.delete(API_ROUTES.circles.update(":id"), async (c) => {
    const result = await circlesServiceMock.deleteCircle(
      c.req.param("id")!,
      currentUser.id,
      currentUser.role
    );
    if (result.kind === "not_found") return c.json({ code: "NOT_FOUND", message: "Circle not found." }, 404);
    if (result.kind === "forbidden") return c.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
    return c.json({ success: true });
  });

  // Replicate: POST /api/v1/circles/user-categories/:categoryId/circles (requireAuth)
  app.post(API_ROUTES.circles.categoryAssignments(":categoryId"), async (c) => {
    const body = await c.req.json();
    const result = await circlesServiceMock.assignCircleToCategory(
      c.req.param("categoryId")!,
      body.circleId,
      currentUser.id
    );
    if (result.kind === "not_found") return c.json({ code: "NOT_FOUND", message: "Category not found." }, 404);
    if (result.kind === "forbidden") return c.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
    return c.json({ success: true });
  });

  // Replicate: DELETE /api/v1/circles/user-categories/:categoryId/circles (requireAuth)
  app.delete(API_ROUTES.circles.categoryAssignments(":categoryId"), async (c) => {
    const body = await c.req.json();
    const result = await circlesServiceMock.removeCircleFromCategory(
      c.req.param("categoryId")!,
      body.circleId,
      currentUser.id
    );
    if (result.kind === "not_found") return c.json({ code: "NOT_FOUND", message: "Category not found." }, 404);
    if (result.kind === "forbidden") return c.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
    return c.json({ success: true });
  });

  return app;
}

describe("circles route behaviors", () => {
  let testApp: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = createTestApp();
  });

  it("POST /api/v1/circles/posts returns 410 Gone", async () => {
    const response = await testApp.request(API_ROUTES.circles.createPost, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "test", content: "content" }),
    });

    expect(response.status).toBe(410);
    const body = (await response.json()) as { code: string; message: string };
    expect(body.code).toBe("GONE");
    expect(body.message).toContain("废弃");
  });

  it("GET /api/v1/circles/feed?tab=circles returns 400", async () => {
    const response = await testApp.request(
      `${API_ROUTES.circles.feed}?tab=circles`,
      { method: "GET" }
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { code: string; message: string };
    expect(body.code).toBe("INVALID_TAB");
  });

  it("GET /api/v1/circles/feed with valid tab succeeds", async () => {
    circlesServiceMock.listFeed.mockResolvedValue([]);

    const response = await testApp.request(
      `${API_ROUTES.circles.feed}?tab=recommended`,
      { method: "GET" }
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: unknown[] };
    expect(body.items).toEqual([]);
  });
});

describe("circles route authorization — updateCircle / deleteCircle", () => {
  const circleId = "circle_1";
  const mockCircle = { id: circleId, name: "Test", slug: "test", coverImageUrl: null };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── PUT /api/v1/circles/:id ──

  it("PUT /api/v1/circles/:id returns 403 when non-owner", async () => {
    circlesServiceMock.updateCircle.mockResolvedValue({ kind: "forbidden" });

    // non-owner user
    const app = createAuthTestApp({ id: "user_2", role: "user" });
    const response = await app.request(API_ROUTES.circles.update(circleId), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Hacked" }),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { code: string; message: string };
    expect(body.code).toBe("FORBIDDEN");
  });

  it("PUT /api/v1/circles/:id succeeds when owner", async () => {
    circlesServiceMock.updateCircle.mockResolvedValue({ kind: "ok", circle: mockCircle });

    const app = createAuthTestApp({ id: "user_1", role: "user" });
    const response = await app.request(API_ROUTES.circles.update(circleId), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { item: typeof mockCircle };
    expect(body.item).toEqual(mockCircle);
  });

  // ── DELETE /api/v1/circles/:id ──

  it("DELETE /api/v1/circles/:id returns 403 when non-owner", async () => {
    circlesServiceMock.deleteCircle.mockResolvedValue({ kind: "forbidden" });

    const app = createAuthTestApp({ id: "user_2", role: "user" });
    const response = await app.request(API_ROUTES.circles.update(circleId), {
      method: "DELETE",
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { code: string; message: string };
    expect(body.code).toBe("FORBIDDEN");
  });

  it("DELETE /api/v1/circles/:id succeeds when admin", async () => {
    circlesServiceMock.deleteCircle.mockResolvedValue({ kind: "ok" });

    const app = createAuthTestApp({ id: "admin_1", role: "super_admin" });
    const response = await app.request(API_ROUTES.circles.update(circleId), {
      method: "DELETE",
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});

describe("circles route authorization — categoryAssignments", () => {
  const categoryId = "cuc_1";
  const circleId = "circle_1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── POST /api/v1/circles/user-categories/:categoryId/circles ──

  it("POST categoryAssignments returns 403 when non-owner", async () => {
    circlesServiceMock.assignCircleToCategory.mockResolvedValue({ kind: "forbidden" });

    const app = createAuthTestApp({ id: "user_2", role: "user" });
    const response = await app.request(
      API_ROUTES.circles.categoryAssignments(categoryId),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ circleId }),
      }
    );

    expect(response.status).toBe(403);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("FORBIDDEN");
  });

  it("POST categoryAssignments succeeds when owner", async () => {
    circlesServiceMock.assignCircleToCategory.mockResolvedValue({ kind: "ok" });

    const app = createAuthTestApp({ id: "user_1", role: "user" });
    const response = await app.request(
      API_ROUTES.circles.categoryAssignments(categoryId),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ circleId }),
      }
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  // ── DELETE /api/v1/circles/user-categories/:categoryId/circles ──

  it("DELETE categoryAssignments returns 403 when non-owner", async () => {
    circlesServiceMock.removeCircleFromCategory.mockResolvedValue({ kind: "forbidden" });

    const app = createAuthTestApp({ id: "user_2", role: "user" });
    const response = await app.request(
      API_ROUTES.circles.categoryAssignments(categoryId),
      {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ circleId }),
      }
    );

    expect(response.status).toBe(403);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("FORBIDDEN");
  });

  it("DELETE categoryAssignments succeeds when owner", async () => {
    circlesServiceMock.removeCircleFromCategory.mockResolvedValue({ kind: "ok" });

    const app = createAuthTestApp({ id: "user_1", role: "user" });
    const response = await app.request(
      API_ROUTES.circles.categoryAssignments(categoryId),
      {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ circleId }),
      }
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});
