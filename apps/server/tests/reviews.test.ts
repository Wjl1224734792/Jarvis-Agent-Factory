import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = {
  findModelBySlug: vi.fn(),
  listReviewsForViewer: vi.fn(),
  getReviewAggregate: vi.fn(),
  getUserReview: vi.fn(),
  listViewerReviewLikes: vi.fn(),
  listViewerReviewReports: vi.fn(),
  getReviewById: vi.fn(),
  toggleReviewLike: vi.fn(),
  reportReview: vi.fn(),
  listReviewComments: vi.fn(),
  listUsersByIds: vi.fn(),
  listViewerReviewCommentLikes: vi.fn(),
  listViewerReviewCommentReports: vi.fn(),
  getReviewCommentById: vi.fn(),
  updateReviewComment: vi.fn(),
  toggleReviewCommentLike: vi.fn(),
  reportReviewComment: vi.fn(),
  createReviewComment: vi.fn(),
  deleteReviewCommentThread: vi.fn(),
  upsertReview: vi.fn(),
  listAdminReviews: vi.fn(),
  updateReviewStatus: vi.fn(),
  listAdminComments: vi.fn(),
  updateReviewCommentStatus: vi.fn()
};

const siteSettingsServiceMock = {
  getResolvedSettings: vi.fn(),
  isAiReviewEnabledForComment: vi.fn(),
  getCommentModerationMode: vi.fn(),
  getReviewModerationMode: vi.fn()
};
const qiniuAuditServiceMock = {
  reviewText: vi.fn()
};
const socialServiceMock = {
  recordNotification: vi.fn(),
  recordSystemNotification: vi.fn()
};
const uploadsRepoMock = {
  listOwnedUploadedFiles: vi.fn()
};

vi.mock("../src/modules/reviews/reviews.repo", () => ({
  reviewsRepo: repo
}));

vi.mock("../src/modules/site-settings/site-settings.service", () => ({
  siteSettingsService: siteSettingsServiceMock
}));

vi.mock("../src/modules/audits/qiniu-audit.service", () => ({
  qiniuAuditService: qiniuAuditServiceMock
}));

vi.mock("../src/modules/social/social.service", () => ({
  socialService: socialServiceMock
}));

vi.mock("../src/modules/uploads/upload.repo", () => ({
  uploadsRepo: uploadsRepoMock
}));

vi.mock("../src/modules/uploads/uploads.helpers", () => ({
  resolveUploadedFileUrl: vi.fn(async () => "https://cdn.example.com/avatar.png"),
  resolvePublicUploadedFileUrl: vi.fn(async () => "https://cdn.example.com/avatar.png")
}));

describe("reviews service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadsRepoMock.listOwnedUploadedFiles.mockResolvedValue([{ id: "file_report_1" }]);
    repo.toggleReviewLike.mockResolvedValue({ active: false });
    repo.toggleReviewCommentLike.mockResolvedValue({ active: false });
    siteSettingsServiceMock.getResolvedSettings.mockResolvedValue({
      commentModerationEnabled: false
    });
    siteSettingsServiceMock.isAiReviewEnabledForComment.mockResolvedValue(false);
    siteSettingsServiceMock.getCommentModerationMode.mockResolvedValue("manual");
    siteSettingsServiceMock.getReviewModerationMode.mockResolvedValue("manual");
    qiniuAuditServiceMock.reviewText.mockResolvedValue({
      status: "needs_manual_review"
    });
    socialServiceMock.recordNotification.mockResolvedValue(undefined);
    socialServiceMock.recordSystemNotification.mockResolvedValue(undefined);
  });

  it("enriches top-level model reviews with like/report counts and viewer state", async () => {
    const { reviewsService } = await import("../src/modules/reviews/reviews.service");

    repo.findModelBySlug.mockResolvedValue({
      id: "model_1",
      slug: "joby-s4",
      name: "Joby S4"
    });
    repo.listReviewsForViewer.mockResolvedValue({
      items: [
        {
          id: "review_1",
          content: "Great review",
          status: "visible",
          likeCount: 2,
          reportCount: 1,
          createdAt: new Date("2026-03-29T00:00:00.000Z"),
          updatedAt: new Date("2026-03-29T00:00:00.000Z"),
          author: {
            id: "author_1",
            displayName: "Author",
            avatarFileId: null,
            role: "user"
          }
        }
      ],
      total: 1
    });
    repo.getReviewAggregate.mockResolvedValue({ totalReviews: 1 });
    repo.getUserReview.mockResolvedValue(null);
    repo.listViewerReviewLikes.mockResolvedValue([{ reviewId: "review_1" }]);
    repo.listViewerReviewReports.mockResolvedValue([{ reviewId: "review_1" }]);

    const payload = await reviewsService.listModelReviews("joby-s4", "viewer_1");

    expect(payload?.items[0]?.likeCount).toBe(2);
    expect(payload?.items[0]?.reportCount).toBe(1);
    expect(payload?.items[0]?.viewer.hasLiked).toBe(true);
    expect(payload?.items[0]?.viewer.hasReported).toBe(true);
    expect(payload?.items[0]?.viewer.canEdit).toBe(false);
  });

  it("toggles and reports top-level reviews only when review exists and is visible", async () => {
    const { reviewsService } = await import("../src/modules/reviews/reviews.service");

    repo.getReviewById.mockResolvedValue({
      id: "review_1",
      reviewId: "review_1",
      content: "Visible review",
      status: "visible",
      likeCount: 0,
      reportCount: 0,
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z"),
      author: {
        id: "author_1",
        displayName: "Author",
        avatarFileId: null,
        role: "user"
      },
      model: {
        id: "model_1",
        slug: "joby-s4",
        name: "Joby S4"
      }
    });

    const likeResult = await reviewsService.toggleReviewLike("review_1", {
      id: "viewer_1",
      role: "user"
    });
    const reportResult = await reviewsService.reportReview(
      "review_1",
      { id: "viewer_1", role: "user" },
      { reason: "Need moderation", imageIds: ["file_report_1"] }
    );

    expect(likeResult.kind).toBe("ok");
    expect(reportResult.kind).toBe("ok");
    expect(repo.toggleReviewLike).toHaveBeenCalledWith("review_1", "viewer_1");
    expect(repo.reportReview).toHaveBeenCalledWith({
      reviewId: "review_1",
      reporterId: "viewer_1",
      reason: "Need moderation",
      imageFileIds: JSON.stringify(["file_report_1"])
    });
  });

  it("returns refreshed review summary after automatic moderation updates the review status", async () => {
    const { reviewsService } = await import("../src/modules/reviews/reviews.service");
    let reviewStatus: "pending" | "visible" = "pending";
    const buildReview = (status: "pending" | "visible") => ({
      id: "review_1",
      content: "Fresh review",
      status,
      likeCount: 0,
      reportCount: 0,
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:05:00.000Z"),
      author: {
        id: "viewer_1",
        displayName: "Viewer",
        avatarFileId: null,
        role: "user"
      }
    });

    repo.findModelBySlug.mockResolvedValue({
      id: "model_1",
      slug: "joby-s4",
      name: "Joby S4",
      ownerId: "owner_1"
    });
    repo.upsertReview.mockResolvedValue(undefined);
    repo.getUserReview.mockImplementation(async () => buildReview(reviewStatus));
    repo.listReviewsForViewer.mockImplementation(async () => ({
      items: reviewStatus === "visible" ? [buildReview("visible")] : [],
      total: reviewStatus === "visible" ? 1 : 0
    }));
    repo.getReviewAggregate.mockImplementation(async () => ({
      totalReviews: reviewStatus === "visible" ? 1 : 0
    }));
    repo.listViewerReviewLikes.mockResolvedValue([]);
    repo.listViewerReviewReports.mockResolvedValue([]);
    repo.updateReviewStatus.mockImplementation(async () => {
      reviewStatus = "visible";
      return buildReview("visible");
    });
    siteSettingsServiceMock.getReviewModerationMode.mockResolvedValue("automatic");
    qiniuAuditServiceMock.reviewText.mockResolvedValue({
      status: "passed"
    });

    const result = await reviewsService.submitReview("joby-s4", "viewer_1", {
      content: "Fresh review"
    });

    expect(result?.item.status).toBe("visible");
    expect(result?.summary.totalReviews).toBe(1);
    expect(result?.summary.myReview?.status).toBe("visible");
    expect(repo.updateReviewStatus).toHaveBeenCalledWith("review_1", "visible");
  });

  it("enriches review comment threads with like/report counts and viewer state", async () => {
    const { reviewsService } = await import("../src/modules/reviews/reviews.service");

    repo.getReviewById.mockResolvedValue({
      id: "review_1",
      status: "visible"
    });
    repo.listReviewComments.mockResolvedValue([
      {
        id: "comment_root",
        reviewId: "review_1",
        authorId: "author_1",
        parentCommentId: null,
        replyToCommentId: null,
        replyToUserId: null,
        content: "Root comment",
        status: "visible",
        likeCount: 3,
        reportCount: 1,
        createdAt: new Date("2026-03-29T00:00:00.000Z"),
        updatedAt: new Date("2026-03-29T00:00:00.000Z"),
        author: {
          id: "author_1",
          displayName: "Author",
          avatarFileId: null,
          role: "user"
        }
      },
      {
        id: "comment_reply",
        reviewId: "review_1",
        authorId: "author_2",
        parentCommentId: "comment_root",
        replyToCommentId: "comment_root",
        replyToUserId: "author_1",
        content: "Reply comment",
        status: "visible",
        likeCount: 1,
        reportCount: 0,
        createdAt: new Date("2026-03-29T00:01:00.000Z"),
        updatedAt: new Date("2026-03-29T00:01:00.000Z"),
        author: {
          id: "author_2",
          displayName: "Responder",
          avatarFileId: null,
          role: "user"
        }
      }
    ]);
    repo.listUsersByIds.mockResolvedValue([
      {
        id: "author_1",
        displayName: "Author",
        avatarFileId: null,
        role: "user"
      }
    ]);
    repo.listViewerReviewCommentLikes.mockResolvedValue([{ commentId: "comment_root" }]);
    repo.listViewerReviewCommentReports.mockResolvedValue([{ commentId: "comment_root" }]);

    const payload = await reviewsService.listReviewComments("review_1", "viewer_1");

    expect(payload?.items).toHaveLength(1);
    expect(payload?.items[0]?.likeCount).toBe(3);
    expect(payload?.items[0]?.reportCount).toBe(1);
    expect(payload?.items[0]?.viewer.hasLiked).toBe(true);
    expect(payload?.items[0]?.viewer.hasReported).toBe(true);
    expect(payload?.items[0]?.replyCount).toBe(1);
    expect(payload?.items[0]?.replies[0]?.replyToUser?.displayName).toBe("Author");
  });

  it("updates, likes and reports review comments with author permission checks", async () => {
    const { reviewsService } = await import("../src/modules/reviews/reviews.service");

    repo.getReviewCommentById.mockResolvedValue({
      id: "comment_1",
      reviewId: "review_1",
      authorId: "author_1",
      parentCommentId: null,
      replyToCommentId: null,
      replyToUserId: null,
      content: "Before update",
      status: "visible",
      likeCount: 0,
      reportCount: 0,
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z"),
      author: {
        id: "author_1",
        displayName: "Author",
        avatarFileId: null,
        role: "user"
      }
    });
    repo.updateReviewComment.mockResolvedValue({
      id: "comment_1",
      reviewId: "review_1",
      authorId: "author_1",
      parentCommentId: null,
      replyToCommentId: null,
      replyToUserId: null,
      content: "After update",
      status: "visible",
      likeCount: 1,
      reportCount: 1,
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:05:00.000Z"),
      author: {
        id: "author_1",
        displayName: "Author",
        avatarFileId: null,
        role: "user"
      }
    });
    repo.listUsersByIds.mockResolvedValue([]);
    siteSettingsServiceMock.getResolvedSettings.mockResolvedValue({
      commentModerationEnabled: false
    });
    siteSettingsServiceMock.getCommentModerationMode.mockResolvedValue("manual");
    repo.updateReviewCommentStatus.mockResolvedValue({
      id: "comment_1",
      reviewId: "review_1",
      authorId: "author_1",
      parentCommentId: null,
      replyToCommentId: null,
      replyToUserId: null,
      content: "After update",
      status: "pending",
      likeCount: 1,
      reportCount: 1,
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:05:00.000Z"),
      author: {
        id: "author_1",
        displayName: "Author",
        avatarFileId: null,
        role: "user"
      }
    });

    const updateResult = await reviewsService.updateReviewComment(
      "review_1",
      "comment_1",
      { id: "author_1", role: "user" },
      { content: "After update" }
    );
    const likeResult = await reviewsService.toggleReviewCommentLike(
      "review_1",
      "comment_1",
      { id: "viewer_1", role: "user" }
    );
    const reportResult = await reviewsService.reportReviewComment(
      "review_1",
      "comment_1",
      { id: "viewer_1", role: "user" },
      { reason: "Need moderation", imageIds: ["file_report_1"] }
    );

    expect(updateResult.kind).toBe("ok");
    if (updateResult.kind === "ok") {
      expect(updateResult.item.content).toBe("After update");
      expect(updateResult.item.viewer.canEdit).toBe(true);
    }
    expect(likeResult.kind).toBe("ok");
    expect(reportResult.kind).toBe("ok");
    expect(repo.updateReviewCommentStatus).toHaveBeenCalledWith("comment_1", "pending");
    expect(qiniuAuditServiceMock.reviewText).not.toHaveBeenCalled();
    expect(repo.toggleReviewCommentLike).toHaveBeenCalledWith("comment_1", "viewer_1");
    expect(repo.reportReviewComment).toHaveBeenCalledWith({
      commentId: "comment_1",
      reporterId: "viewer_1",
      reason: "Need moderation",
      imageFileIds: JSON.stringify(["file_report_1"])
    });
  });

  it("filters hidden review comments for viewers and keeps new comments pending when AI review is disabled", async () => {
    const { reviewsService } = await import("../src/modules/reviews/reviews.service");

    repo.getReviewById.mockResolvedValue({
      id: "review_1",
      status: "visible",
      author: { id: "review_author", displayName: "Review Author" },
      model: { id: "model_1", slug: "joby-s4", name: "Joby S4" }
    });
    repo.listReviewComments.mockResolvedValue([
      {
        id: "comment_visible",
        reviewId: "review_1",
        authorId: "author_1",
        parentCommentId: null,
        replyToCommentId: null,
        replyToUserId: null,
        content: "Visible comment",
        status: "visible",
        likeCount: 0,
        reportCount: 0,
        createdAt: new Date("2026-03-29T00:00:00.000Z"),
        updatedAt: new Date("2026-03-29T00:00:00.000Z"),
        author: {
          id: "author_1",
          displayName: "Author",
          avatarFileId: null,
          role: "user"
        }
      },
      {
        id: "comment_hidden",
        reviewId: "review_1",
        authorId: "author_2",
        parentCommentId: null,
        replyToCommentId: null,
        replyToUserId: null,
        content: "Hidden comment",
        status: "hidden",
        likeCount: 0,
        reportCount: 1,
        createdAt: new Date("2026-03-29T00:01:00.000Z"),
        updatedAt: new Date("2026-03-29T00:01:00.000Z"),
        author: {
          id: "author_2",
          displayName: "Hidden Author",
          avatarFileId: null,
          role: "user"
        }
      }
    ]);
    repo.listUsersByIds.mockResolvedValue([]);
    repo.listViewerReviewCommentLikes.mockResolvedValue([]);
    repo.listViewerReviewCommentReports.mockResolvedValue([]);
    siteSettingsServiceMock.getResolvedSettings.mockResolvedValue({
      commentModerationEnabled: false
    });
    repo.createReviewComment.mockResolvedValue({
      id: "comment_pending",
      reviewId: "review_1",
      authorId: "author_3",
      parentCommentId: null,
      replyToCommentId: null,
      replyToUserId: null,
      content: "Pending comment",
      status: "pending",
      likeCount: 0,
      reportCount: 0,
      createdAt: new Date("2026-03-29T00:02:00.000Z"),
      updatedAt: new Date("2026-03-29T00:02:00.000Z"),
      author: {
        id: "author_3",
        displayName: "Pending Author",
        avatarFileId: null,
        role: "user"
      }
    });

    const viewerPayload = await reviewsService.listReviewComments("review_1", "viewer_1");
    expect(viewerPayload?.items).toHaveLength(1);
    expect(viewerPayload?.items[0]?.id).toBe("comment_visible");

    const createResult = await reviewsService.createReviewComment(
      "review_1",
      { id: "author_3", role: "user" },
      { content: "Pending comment" }
    );

    expect(createResult.kind).toBe("ok");
    expect(repo.createReviewComment).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewId: "review_1",
        authorId: "author_3",
        status: "pending"
      })
    );
    expect(qiniuAuditServiceMock.reviewText).not.toHaveBeenCalled();
    if (createResult.kind === "ok") {
      expect(createResult.item.status).toBe("pending");
    }
  });

  it("publishes review comments when AI text audit passes", async () => {
    const { reviewsService } = await import("../src/modules/reviews/reviews.service");

    repo.getReviewById.mockResolvedValue({
      id: "review_1",
      status: "visible",
      author: { id: "review_author", displayName: "Review Author" },
      model: { id: "model_1", slug: "joby-s4", name: "Joby S4" }
    });
    siteSettingsServiceMock.getResolvedSettings.mockResolvedValue({
      commentModerationEnabled: true
    });
    siteSettingsServiceMock.getCommentModerationMode.mockResolvedValue("ai");
    repo.createReviewComment.mockResolvedValue({
      id: "comment_ai",
      reviewId: "review_1",
      authorId: "author_3",
      parentCommentId: null,
      replyToCommentId: null,
      replyToUserId: null,
      content: "AI approved comment",
      status: "pending",
      likeCount: 0,
      reportCount: 0,
      createdAt: new Date("2026-03-29T00:02:00.000Z"),
      updatedAt: new Date("2026-03-29T00:02:00.000Z"),
      author: {
        id: "author_3",
        displayName: "Pending Author",
        avatarFileId: null,
        role: "user"
      }
    });
    repo.updateReviewCommentStatus.mockResolvedValue({
      id: "comment_ai",
      reviewId: "review_1",
      authorId: "author_3",
      parentCommentId: null,
      replyToCommentId: null,
      replyToUserId: null,
      content: "AI approved comment",
      status: "visible",
      likeCount: 0,
      reportCount: 0,
      createdAt: new Date("2026-03-29T00:02:00.000Z"),
      updatedAt: new Date("2026-03-29T00:02:00.000Z"),
      author: {
        id: "author_3",
        displayName: "Pending Author",
        avatarFileId: null,
        role: "user"
      }
    });
    repo.listUsersByIds.mockResolvedValue([]);
    qiniuAuditServiceMock.reviewText.mockResolvedValue({
      status: "passed"
    });

    const createResult = await reviewsService.createReviewComment(
      "review_1",
      { id: "author_3", role: "user" },
      { content: "AI approved comment" }
    );

    expect(createResult.kind).toBe("ok");
    expect(qiniuAuditServiceMock.reviewText).toHaveBeenCalledWith({
      domain: "comment",
      entityId: "comment_ai",
      text: "AI approved comment",
      mode: "ai"
    });
    expect(repo.updateReviewCommentStatus).toHaveBeenCalledWith("comment_ai", "visible");
    if (createResult.kind === "ok") {
      expect(createResult.item.status).toBe("visible");
    }
  });
});
