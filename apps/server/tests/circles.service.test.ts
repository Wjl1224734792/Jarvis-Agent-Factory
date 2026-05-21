import { beforeEach, describe, expect, it, vi } from "vitest";

const circlesRepoMock = {
  getUserContributionStats: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  deleteById: vi.fn(),
  findCategoryById: vi.fn(),
  assignCircleToCategory: vi.fn(),
  removeCircleFromCategory: vi.fn(),
};

vi.mock("../src/modules/circles/circles.repo", () => ({
  circlesRepo: circlesRepoMock,
}));

vi.mock("../src/modules/uploads/uploads.helpers", () => ({
  resolvePublicUploadedFileUrl: vi.fn().mockResolvedValue(null),
  resolveUploadedFileUrl: vi.fn().mockResolvedValue(null),
}));

describe("circlesService.createCircle anti-spam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function baseInput(overrides: Record<string, unknown> = {}) {
    return {
      slug: "test-circle",
      name: "Test Circle",
      description: "A test circle",
      coverImageFileId: null,
      ownerId: "user_1",
      joinMode: "free" as const,
      userRole: "user",
      ...overrides,
    };
  }

  it("rejects new account (< 24h old) with SPAM_BLOCKED", async () => {
    circlesRepoMock.getUserContributionStats.mockResolvedValue({
      postCount: 10,
      commentCount: 10,
      interactionCount: 10,
      recentCircleCount: 0,
      accountAgeHours: 12,
    });

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.createCircle(baseInput());

    expect(result).toEqual({
      code: "SPAM_BLOCKED",
      message: expect.stringContaining("24"),
      reason: "account_too_new",
    });
    expect(circlesRepoMock.create).not.toHaveBeenCalled();
  });

  it("rejects user with insufficient contributions", async () => {
    circlesRepoMock.getUserContributionStats.mockResolvedValue({
      postCount: 0,
      commentCount: 1,
      interactionCount: 0,
      recentCircleCount: 0,
      accountAgeHours: 48,
    });

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.createCircle(baseInput());

    expect(result).toEqual({
      code: "SPAM_BLOCKED",
      message: expect.stringContaining("贡献不足"),
      reason: "insufficient_contributions",
    });
    expect(circlesRepoMock.create).not.toHaveBeenCalled();
  });

  it("rejects user who created too many circles in 24h", async () => {
    circlesRepoMock.getUserContributionStats.mockResolvedValue({
      postCount: 10,
      commentCount: 10,
      interactionCount: 10,
      recentCircleCount: 3,
      accountAgeHours: 72,
    });

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.createCircle(baseInput());

    expect(result).toEqual({
      code: "SPAM_BLOCKED",
      message: expect.stringContaining("上限"),
      reason: "too_many_circles",
    });
    expect(circlesRepoMock.create).not.toHaveBeenCalled();
  });

  it("allows normal user to create a circle", async () => {
    const mockCircle = { id: "circle_1", slug: "test-circle", name: "Test Circle" };
    circlesRepoMock.getUserContributionStats.mockResolvedValue({
      postCount: 5,
      commentCount: 10,
      interactionCount: 20,
      recentCircleCount: 0,
      accountAgeHours: 100,
    });
    circlesRepoMock.create.mockResolvedValue(mockCircle);

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.createCircle(baseInput());

    expect(result).toEqual(mockCircle);
    expect(circlesRepoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "test-circle",
        name: "Test Circle",
        ownerId: "user_1",
      })
    );
  });

  it("bypasses anti-spam checks for admin users", async () => {
    const mockCircle = { id: "circle_admin", slug: "admin-circle", name: "Admin Circle" };
    circlesRepoMock.create.mockResolvedValue(mockCircle);

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.createCircle(baseInput({ userRole: "admin" }));

    expect(result).toEqual(mockCircle);
    expect(circlesRepoMock.getUserContributionStats).not.toHaveBeenCalled();
    expect(circlesRepoMock.create).toHaveBeenCalled();
  });
});

describe("circlesService authorization — updateCircle / deleteCircle", () => {
  const circleId = "circle_1";
  const ownerId = "user_1";
  const otherUserId = "user_2";

  function mockCircle(overrides: Record<string, unknown> = {}) {
    return {
      id: circleId,
      slug: "test-circle",
      name: "Test Circle",
      description: "desc",
      coverImageFileId: null,
      ownerId,
      joinMode: "free" as const,
      memberCount: 1,
      postCount: 0,
      viewCount: 0,
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── updateCircle ──

  it("updateCircle: owner can update", async () => {
    circlesRepoMock.findById.mockResolvedValue(mockCircle());
    circlesRepoMock.update.mockResolvedValue(mockCircle());

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.updateCircle(circleId, ownerId, "user", { name: "Updated" });

    expect(result).toMatchObject({ kind: "ok" });
    expect(circlesRepoMock.update).toHaveBeenCalled();
  });

  it("updateCircle: super_admin can update any circle", async () => {
    circlesRepoMock.findById.mockResolvedValue(mockCircle());
    circlesRepoMock.update.mockResolvedValue(mockCircle());

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.updateCircle(circleId, otherUserId, "super_admin", { name: "Updated" });

    expect(result).toMatchObject({ kind: "ok" });
    expect(circlesRepoMock.update).toHaveBeenCalled();
  });

  it("updateCircle: non-owner is denied", async () => {
    circlesRepoMock.findById.mockResolvedValue(mockCircle());

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.updateCircle(circleId, otherUserId, "user", { name: "Updated" });

    expect(result).toEqual({ kind: "forbidden" });
    expect(circlesRepoMock.update).not.toHaveBeenCalled();
  });

  it("updateCircle: returns not_found for missing circle", async () => {
    circlesRepoMock.findById.mockResolvedValue(null);

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.updateCircle(circleId, ownerId, "user", { name: "Updated" });

    expect(result).toEqual({ kind: "not_found" });
  });

  // ── deleteCircle ──

  it("deleteCircle: owner can delete", async () => {
    circlesRepoMock.findById.mockResolvedValue(mockCircle());

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.deleteCircle(circleId, ownerId, "user");

    expect(result).toEqual({ kind: "ok" });
    expect(circlesRepoMock.deleteById).toHaveBeenCalled();
  });

  it("deleteCircle: admin can delete any circle", async () => {
    circlesRepoMock.findById.mockResolvedValue(mockCircle());

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.deleteCircle(circleId, otherUserId, "admin");

    expect(result).toEqual({ kind: "ok" });
    expect(circlesRepoMock.deleteById).toHaveBeenCalled();
  });

  it("deleteCircle: non-owner is denied", async () => {
    circlesRepoMock.findById.mockResolvedValue(mockCircle());

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.deleteCircle(circleId, otherUserId, "user");

    expect(result).toEqual({ kind: "forbidden" });
    expect(circlesRepoMock.deleteById).not.toHaveBeenCalled();
  });

  it("deleteCircle: returns not_found for missing circle", async () => {
    circlesRepoMock.findById.mockResolvedValue(null);

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.deleteCircle(circleId, ownerId, "user");

    expect(result).toEqual({ kind: "not_found" });
  });
});

describe("circlesService authorization — categoryAssignments", () => {
  const categoryId = "cuc_1";
  const circleId = "circle_1";
  const ownerId = "user_1";
  const otherUserId = "user_2";

  function mockCategory(userId: string) {
    return { id: categoryId, userId, name: "My Category", sortOrder: 0 };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── assignCircleToCategory ──

  it("assignCircleToCategory: category owner can assign", async () => {
    circlesRepoMock.findCategoryById.mockResolvedValue(mockCategory(ownerId));

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.assignCircleToCategory(categoryId, circleId, ownerId);

    expect(result).toEqual({ kind: "ok" });
    expect(circlesRepoMock.assignCircleToCategory).toHaveBeenCalledWith(categoryId, circleId);
  });

  it("assignCircleToCategory: non-owner is denied", async () => {
    circlesRepoMock.findCategoryById.mockResolvedValue(mockCategory(ownerId));

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.assignCircleToCategory(categoryId, circleId, otherUserId);

    expect(result).toEqual({ kind: "forbidden" });
    expect(circlesRepoMock.assignCircleToCategory).not.toHaveBeenCalled();
  });

  it("assignCircleToCategory: returns not_found for missing category", async () => {
    circlesRepoMock.findCategoryById.mockResolvedValue(null);

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.assignCircleToCategory(categoryId, circleId, ownerId);

    expect(result).toEqual({ kind: "not_found" });
  });

  // ── removeCircleFromCategory ──

  it("removeCircleFromCategory: category owner can remove", async () => {
    circlesRepoMock.findCategoryById.mockResolvedValue(mockCategory(ownerId));

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.removeCircleFromCategory(categoryId, circleId, ownerId);

    expect(result).toEqual({ kind: "ok" });
    expect(circlesRepoMock.removeCircleFromCategory).toHaveBeenCalledWith(categoryId, circleId);
  });

  it("removeCircleFromCategory: non-owner is denied", async () => {
    circlesRepoMock.findCategoryById.mockResolvedValue(mockCategory(ownerId));

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.removeCircleFromCategory(categoryId, circleId, otherUserId);

    expect(result).toEqual({ kind: "forbidden" });
    expect(circlesRepoMock.removeCircleFromCategory).not.toHaveBeenCalled();
  });

  it("removeCircleFromCategory: returns not_found for missing category", async () => {
    circlesRepoMock.findCategoryById.mockResolvedValue(null);

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.removeCircleFromCategory(categoryId, circleId, ownerId);

    expect(result).toEqual({ kind: "not_found" });
  });
});
