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
  findPostById: vi.fn(),
  findCommentById: vi.fn(),
  createPostReport: vi.fn(),
  createCommentReport: vi.fn(),
  createPost: vi.fn(),
  updatePostStatus: vi.fn(),
  updatePostHotScore: vi.fn(),
  createComment: vi.fn(),
  updateCommentStatus: vi.fn(),
};

const evaluateTextModerationMock = vi.fn();

const siteSettingsServiceMock = {
  getCirclePostModerationMode: vi.fn(),
  getCircleCommentModerationMode: vi.fn(),
};

const socialServiceMock = {
  recordNotification: vi.fn(),
  recordSystemNotification: vi.fn(),
};

vi.mock("../src/modules/circles/circles.repo", () => ({
  circlesRepo: circlesRepoMock,
}));

vi.mock("../src/modules/uploads/uploads.helpers", () => ({
  resolvePublicUploadedFileUrl: vi.fn().mockResolvedValue(null),
  resolveUploadedFileUrl: vi.fn().mockResolvedValue(null),
}));

vi.mock("../src/modules/audits/text-moderation.service", () => ({
  evaluateTextModeration: evaluateTextModerationMock,
}));

vi.mock("../src/modules/site-settings/site-settings.service", () => ({
  siteSettingsService: siteSettingsServiceMock,
}));

vi.mock("../src/modules/social/social.service", () => ({
  socialService: socialServiceMock,
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

// ── 帖子举报 ──

describe("circlesService.reportPost", () => {
  const postId = "cp_1";
  const reporterId = "user_reporter";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reportPost: creates report and returns ok with id", async () => {
    circlesRepoMock.findPostById.mockResolvedValue({
      id: postId,
      status: "published",
      title: "Test Post",
    });
    circlesRepoMock.createPostReport.mockResolvedValue("cpr_1");

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.reportPost(postId, reporterId, "违规内容", ["file_1"]);

    expect(result).toEqual({ kind: "ok", id: "cpr_1" });
    expect(circlesRepoMock.createPostReport).toHaveBeenCalledWith({
      postId,
      reporterId,
      reason: "违规内容",
      imageFileIds: ["file_1"],
    });
  });

  it("reportPost: returns not_found when post does not exist", async () => {
    circlesRepoMock.findPostById.mockResolvedValue(null);

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.reportPost(postId, reporterId, "违规内容");

    expect(result).toEqual({ kind: "not_found" });
    expect(circlesRepoMock.createPostReport).not.toHaveBeenCalled();
  });

  it("reportPost: returns not_found when post is deleted", async () => {
    circlesRepoMock.findPostById.mockResolvedValue({
      id: postId,
      status: "deleted",
      title: "Deleted Post",
    });

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.reportPost(postId, reporterId, "违规内容");

    expect(result).toEqual({ kind: "not_found" });
    expect(circlesRepoMock.createPostReport).not.toHaveBeenCalled();
  });

  it("reportPost: works without imageFileIds", async () => {
    circlesRepoMock.findPostById.mockResolvedValue({
      id: postId,
      status: "published",
      title: "Test Post",
    });
    circlesRepoMock.createPostReport.mockResolvedValue("cpr_2");

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.reportPost(postId, reporterId, "纯文字举报");

    expect(result).toEqual({ kind: "ok", id: "cpr_2" });
    expect(circlesRepoMock.createPostReport).toHaveBeenCalledWith({
      postId,
      reporterId,
      reason: "纯文字举报",
      imageFileIds: undefined,
    });
  });
});

// ── 评论举报 ──

describe("circlesService.reportComment", () => {
  const commentId = "cc_1";
  const reporterId = "user_reporter";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reportComment: creates report and returns ok with id", async () => {
    circlesRepoMock.findCommentById.mockResolvedValue({
      id: commentId,
      postId: "cp_1",
      authorId: "user_author",
      content: "违规评论",
      status: "visible",
    });
    circlesRepoMock.createCommentReport.mockResolvedValue("ccr_1");

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.reportComment(commentId, reporterId, "spam", ["file_1"]);

    expect(result).toEqual({ kind: "ok", id: "ccr_1" });
    expect(circlesRepoMock.createCommentReport).toHaveBeenCalledWith({
      commentId,
      reporterId,
      reason: "spam",
      imageFileIds: ["file_1"],
    });
  });

  it("reportComment: returns not_found when comment does not exist", async () => {
    circlesRepoMock.findCommentById.mockResolvedValue(null);

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const result = await circlesService.reportComment(commentId, reporterId, "spam");

    expect(result).toEqual({ kind: "not_found" });
    expect(circlesRepoMock.createCommentReport).not.toHaveBeenCalled();
  });
});

// ── createCirclePost 内容审核 ──

describe("circlesService.createCirclePost moderation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const basePostInput = {
    circleId: "circle_1",
    authorId: "user_1",
    title: "Test Post Title",
    content: "Test post content body",
    images: [] as string[],
    videos: [] as string[],
  };

  it("calls evaluateTextModeration with combined title and content", async () => {
    circlesRepoMock.createPost.mockResolvedValue("cp_1");
    siteSettingsServiceMock.getCirclePostModerationMode.mockResolvedValue("ai");
    evaluateTextModerationMock.mockResolvedValue({ action: "approve" });

    const { circlesService } = await import("../src/modules/circles/circles.service");
    await circlesService.createCirclePost(basePostInput);

    expect(evaluateTextModerationMock).toHaveBeenCalledWith({
      mode: "ai",
      domain: "circle_post",
      entityId: "cp_1",
      text: "Test Post Title\nTest post content body",
    });
  });

  it("sets post status to hidden when moderation rejects", async () => {
    circlesRepoMock.createPost.mockResolvedValue("cp_rejected");
    siteSettingsServiceMock.getCirclePostModerationMode.mockResolvedValue("automatic");
    evaluateTextModerationMock.mockResolvedValue({ action: "reject" });

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const id = await circlesService.createCirclePost(basePostInput);

    expect(id).toBe("cp_rejected");
    expect(circlesRepoMock.updatePostStatus).toHaveBeenCalledWith("cp_rejected", "hidden");
  });

  it("does not change post status when moderation approves", async () => {
    circlesRepoMock.createPost.mockResolvedValue("cp_approved");
    siteSettingsServiceMock.getCirclePostModerationMode.mockResolvedValue("ai");
    evaluateTextModerationMock.mockResolvedValue({ action: "approve" });

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const id = await circlesService.createCirclePost(basePostInput);

    expect(id).toBe("cp_approved");
    expect(circlesRepoMock.updatePostStatus).not.toHaveBeenCalled();
  });

  it("does not change post status when moderation requires manual review", async () => {
    circlesRepoMock.createPost.mockResolvedValue("cp_manual");
    siteSettingsServiceMock.getCirclePostModerationMode.mockResolvedValue("ai");
    evaluateTextModerationMock.mockResolvedValue({ action: "manual_review" });

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const id = await circlesService.createCirclePost(basePostInput);

    expect(id).toBe("cp_manual");
    expect(circlesRepoMock.updatePostStatus).not.toHaveBeenCalled();
  });

  it("passes null content as empty string in moderation text", async () => {
    circlesRepoMock.createPost.mockResolvedValue("cp_null");
    siteSettingsServiceMock.getCirclePostModerationMode.mockResolvedValue("ai");
    evaluateTextModerationMock.mockResolvedValue({ action: "approve" });

    const { circlesService } = await import("../src/modules/circles/circles.service");
    await circlesService.createCirclePost({ ...basePostInput, content: null });

    expect(evaluateTextModerationMock).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Test Post Title\n" })
    );
  });
});

// ── createComment 内容审核 ──

describe("circlesService.createComment moderation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseCommentInput = {
    postId: "cp_1",
    authorId: "user_1",
    content: "A comment on the post",
  };

  it("calls evaluateTextModeration with comment content", async () => {
    circlesRepoMock.createComment.mockResolvedValue("cc_1");
    circlesRepoMock.findPostById.mockResolvedValue({
      id: "cp_1",
      title: "Post Title",
      author: { id: "user_other" },
    });
    siteSettingsServiceMock.getCircleCommentModerationMode.mockResolvedValue("ai");
    evaluateTextModerationMock.mockResolvedValue({ action: "approve" });

    const { circlesService } = await import("../src/modules/circles/circles.service");
    await circlesService.createComment(baseCommentInput);

    expect(evaluateTextModerationMock).toHaveBeenCalledWith({
      mode: "ai",
      domain: "circle_comment",
      entityId: "cc_1",
      text: "A comment on the post",
    });
  });

  it("sets comment status to hidden when moderation rejects", async () => {
    circlesRepoMock.createComment.mockResolvedValue("cc_rejected");
    circlesRepoMock.findPostById.mockResolvedValue({
      id: "cp_1",
      title: "Post Title",
      author: { id: "user_other" },
    });
    siteSettingsServiceMock.getCircleCommentModerationMode.mockResolvedValue("automatic");
    evaluateTextModerationMock.mockResolvedValue({ action: "reject" });

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const id = await circlesService.createComment(baseCommentInput);

    expect(id).toBe("cc_rejected");
    expect(circlesRepoMock.updateCommentStatus).toHaveBeenCalledWith("cc_rejected", "hidden");
  });

  it("does not change comment status when moderation approves", async () => {
    circlesRepoMock.createComment.mockResolvedValue("cc_approved");
    circlesRepoMock.findPostById.mockResolvedValue({
      id: "cp_1",
      title: "Post Title",
      author: { id: "user_other" },
    });
    siteSettingsServiceMock.getCircleCommentModerationMode.mockResolvedValue("ai");
    evaluateTextModerationMock.mockResolvedValue({ action: "approve" });

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const id = await circlesService.createComment(baseCommentInput);

    expect(id).toBe("cc_approved");
    expect(circlesRepoMock.updateCommentStatus).not.toHaveBeenCalled();
  });

  it("does not change comment status when moderation requires manual review", async () => {
    circlesRepoMock.createComment.mockResolvedValue("cc_manual");
    circlesRepoMock.findPostById.mockResolvedValue({
      id: "cp_1",
      title: "Post Title",
      author: { id: "user_other" },
    });
    siteSettingsServiceMock.getCircleCommentModerationMode.mockResolvedValue("ai");
    evaluateTextModerationMock.mockResolvedValue({ action: "manual_review" });

    const { circlesService } = await import("../src/modules/circles/circles.service");
    const id = await circlesService.createComment(baseCommentInput);

    expect(id).toBe("cc_manual");
    expect(circlesRepoMock.updateCommentStatus).not.toHaveBeenCalled();
  });
});
