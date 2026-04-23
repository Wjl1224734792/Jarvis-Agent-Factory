import { beforeEach, describe, expect, it, vi } from "vitest";

const auditsRepoMock = {
  getById: vi.fn(),
  getLatestByEntity: vi.fn(),
  list: vi.fn(),
  update: vi.fn()
};

const brandApplicationsServiceMock = {
  updateStatus: vi.fn()
};

const aircraftSubmissionsServiceMock = {
  updateSubmissionStatus: vi.fn()
};

const postsServiceMock = {
  updateCommentStatus: vi.fn()
};

const aircraftModelsServiceMock = {
  updateModelCommentStatus: vi.fn()
};

const reviewsServiceMock = {
  updateReviewCommentStatus: vi.fn()
};

const rankingsServiceMock = {
  updateRankingCommentStatus: vi.fn(),
  updateRatingTargetCommentStatus: vi.fn()
};

vi.mock("../src/modules/audits/audits.repo", () => ({
  auditsRepo: auditsRepoMock
}));

vi.mock("../src/modules/brand-applications/brand-applications.service", () => ({
  brandApplicationsService: brandApplicationsServiceMock
}));

vi.mock("../src/modules/aircraft-submissions/aircraft-submissions.service", () => ({
  aircraftSubmissionsService: aircraftSubmissionsServiceMock
}));

vi.mock("../src/modules/posts/posts.service", () => ({
  postsService: postsServiceMock
}));

vi.mock("../src/modules/aircraft-models/aircraft-models.service", () => ({
  aircraftModelsService: aircraftModelsServiceMock
}));

vi.mock("../src/modules/reviews/reviews.service", () => ({
  reviewsService: reviewsServiceMock
}));

vi.mock("../src/modules/rankings/rankings.service", () => ({
  rankingsService: rankingsServiceMock
}));

describe("audits service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    brandApplicationsServiceMock.updateStatus.mockResolvedValue(null);
    aircraftSubmissionsServiceMock.updateSubmissionStatus.mockResolvedValue(null);
    postsServiceMock.updateCommentStatus.mockResolvedValue(null);
    aircraftModelsServiceMock.updateModelCommentStatus.mockResolvedValue(null);
    reviewsServiceMock.updateReviewCommentStatus.mockResolvedValue(null);
    rankingsServiceMock.updateRankingCommentStatus.mockResolvedValue(null);
    rankingsServiceMock.updateRatingTargetCommentStatus.mockResolvedValue(null);
  });

  function buildAudit(overrides: Record<string, unknown> = {}) {
    return {
      id: "audit_1",
      domain: "file",
      entityId: "entity_1",
      contentType: "video",
      provider: "qiniu",
      mode: "ai",
      status: "needs_manual_review",
      suggestion: "review",
      scene: "pulp",
      requestId: "req_1",
      taskId: "task_1",
      detailLabels: "[]",
      sceneSuggestions: "{}",
      rawPayload: "{}",
      errorMessage: null,
      callbackReceivedAt: null,
      resolvedAt: null,
      reviewedBy: null,
      reviewNote: null,
      createdAt: new Date("2026-04-23T00:00:00.000Z"),
      updatedAt: new Date("2026-04-23T00:00:00.000Z"),
      ...overrides
    };
  }

  function mockAuditUpdate(
    existing: ReturnType<typeof buildAudit>,
    status: "manual_passed" | "manual_rejected"
  ) {
    auditsRepoMock.update.mockResolvedValue({
      ...existing,
      status,
      reviewedBy: "admin_1",
      reviewNote:
        status === "manual_passed"
          ? "Manually approved after inspection."
          : "Rejected after manual review.",
      resolvedAt: new Date("2026-04-23T00:05:00.000Z"),
      updatedAt: new Date("2026-04-23T00:05:00.000Z")
    });
  }

  it("allows manual decisions for file audits", async () => {
    const existing = buildAudit({
      id: "audit_file_1",
      domain: "file",
      entityId: "file_1"
    });
    auditsRepoMock.getById.mockResolvedValue(existing);
    auditsRepoMock.getLatestByEntity.mockResolvedValue(existing);
    mockAuditUpdate(existing, "manual_passed");

    const { auditsService } = await import("../src/modules/audits/audits.service");
    const result = await auditsService.applyManualDecision({
      auditId: existing.id,
      reviewerId: "admin_1",
      status: "manual_passed",
      reviewNote: "Manually approved after inspection."
    });

    expect(result.kind).toBe("ok");
    expect(auditsRepoMock.getLatestByEntity).toHaveBeenCalledWith("file", "file_1");
    expect(auditsRepoMock.update).toHaveBeenCalled();
  });

  it("routes brand application decisions through the brand applications service", async () => {
    const existing = buildAudit({
      id: "audit_brand_apply_1",
      domain: "brand_application",
      entityId: "brand_apply_1",
      status: "queued"
    });
    auditsRepoMock.getById.mockResolvedValue(existing);
    auditsRepoMock.getLatestByEntity.mockResolvedValue(existing);
    mockAuditUpdate(existing, "manual_passed");
    brandApplicationsServiceMock.updateStatus.mockResolvedValue({
      item: { id: "brand_apply_1", status: "approved" }
    });

    const { auditsService } = await import("../src/modules/audits/audits.service");
    const result = await auditsService.applyManualDecision({
      auditId: existing.id,
      reviewerId: "admin_1",
      status: "manual_passed"
    });

    expect(result.kind).toBe("ok");
    expect(brandApplicationsServiceMock.updateStatus).toHaveBeenCalledWith(
      "brand_apply_1",
      "approved",
      null
    );
  });

  it("routes aircraft submission decisions through the submissions service", async () => {
    const existing = buildAudit({
      id: "audit_submission_1",
      domain: "aircraft_submission",
      entityId: "submit_1"
    });
    auditsRepoMock.getById.mockResolvedValue(existing);
    auditsRepoMock.getLatestByEntity.mockResolvedValue(existing);
    mockAuditUpdate(existing, "manual_rejected");
    aircraftSubmissionsServiceMock.updateSubmissionStatus.mockResolvedValue({
      item: { id: "submit_1", status: "rejected" }
    });

    const { auditsService } = await import("../src/modules/audits/audits.service");
    const result = await auditsService.applyManualDecision({
      auditId: existing.id,
      reviewerId: "admin_1",
      status: "manual_rejected",
      reviewNote: "Need more evidence."
    });

    expect(result.kind).toBe("ok");
    expect(aircraftSubmissionsServiceMock.updateSubmissionStatus).toHaveBeenCalledWith(
      "submit_1",
      "rejected",
      "Need more evidence."
    );
  });

  it("routes comment decisions to the first matching comment owner service", async () => {
    const existing = buildAudit({
      id: "audit_comment_1",
      domain: "comment",
      entityId: "rcomment_1"
    });
    auditsRepoMock.getById.mockResolvedValue(existing);
    auditsRepoMock.getLatestByEntity.mockResolvedValue(existing);
    mockAuditUpdate(existing, "manual_rejected");
    rankingsServiceMock.updateRatingTargetCommentStatus.mockResolvedValue({
      id: "rcomment_1",
      status: "hidden"
    });

    const { auditsService } = await import("../src/modules/audits/audits.service");
    const result = await auditsService.applyManualDecision({
      auditId: existing.id,
      reviewerId: "admin_1",
      status: "manual_rejected",
      reviewNote: "Hidden after manual review."
    });

    expect(result.kind).toBe("ok");
    expect(postsServiceMock.updateCommentStatus).toHaveBeenCalledWith("rcomment_1", "hidden");
    expect(aircraftModelsServiceMock.updateModelCommentStatus).toHaveBeenCalledWith(
      "rcomment_1",
      "hidden"
    );
    expect(reviewsServiceMock.updateReviewCommentStatus).toHaveBeenCalledWith("rcomment_1", "hidden");
    expect(rankingsServiceMock.updateRankingCommentStatus).toHaveBeenCalledWith(
      "rcomment_1",
      "hidden"
    );
    expect(rankingsServiceMock.updateRatingTargetCommentStatus).toHaveBeenCalledWith(
      "rcomment_1",
      "hidden"
    );
  });

  it("rejects manual decisions for unsupported domains", async () => {
    auditsRepoMock.getById.mockResolvedValue(
      buildAudit({
        id: "audit_post_1",
        domain: "post",
        entityId: "post_1"
      })
    );

    const { auditsService } = await import("../src/modules/audits/audits.service");
    const result = await auditsService.applyManualDecision({
      auditId: "audit_post_1",
      reviewerId: "admin_1",
      status: "manual_rejected",
      reviewNote: "Not supported here."
    });

    expect(result.kind).toBe("forbidden");
    expect(auditsRepoMock.update).not.toHaveBeenCalled();
  });

  it("rejects manual decisions when the audit is not in a pending manual-review status", async () => {
    const existing = buildAudit({
      id: "audit_brand_apply_done",
      domain: "brand_application",
      entityId: "brand_apply_1",
      status: "passed"
    });
    auditsRepoMock.getById.mockResolvedValue(existing);
    auditsRepoMock.getLatestByEntity.mockResolvedValue(existing);

    const { auditsService } = await import("../src/modules/audits/audits.service");
    const result = await auditsService.applyManualDecision({
      auditId: existing.id,
      reviewerId: "admin_1",
      status: "manual_passed"
    });

    expect(result.kind).toBe("forbidden");
    expect(brandApplicationsServiceMock.updateStatus).not.toHaveBeenCalled();
    expect(auditsRepoMock.update).not.toHaveBeenCalled();
  });

  it("rejects manual decisions on non-latest audits", async () => {
    const existing = buildAudit({
      id: "audit_comment_old",
      domain: "comment",
      entityId: "comment_1"
    });
    auditsRepoMock.getById.mockResolvedValue(existing);
    auditsRepoMock.getLatestByEntity.mockResolvedValue({
      id: "audit_comment_new",
      domain: "comment",
      entityId: "comment_1"
    });

    const { auditsService } = await import("../src/modules/audits/audits.service");
    const result = await auditsService.applyManualDecision({
      auditId: "audit_comment_old",
      reviewerId: "admin_1",
      status: "manual_passed"
    });

    expect(result.kind).toBe("forbidden");
    expect(auditsRepoMock.update).not.toHaveBeenCalled();
    expect(postsServiceMock.updateCommentStatus).not.toHaveBeenCalled();
  });
});
