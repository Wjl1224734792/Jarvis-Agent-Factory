import { auditsRepo } from "./audits.repo";
import { brandApplicationsService } from "../brand-applications/brand-applications.service";
import { aircraftSubmissionsService } from "../aircraft-submissions/aircraft-submissions.service";
import { postsService } from "../posts/posts.service";
import { aircraftModelsService } from "../aircraft-models/aircraft-models.service";
import { reviewsService } from "../reviews/reviews.service";
import { rankingsService } from "../rankings/rankings.service";

function parseJsonRecord<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function serializeAuditRecord(item: Awaited<ReturnType<typeof auditsRepo.getById>>) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    domain: item.domain as
      | "post"
      | "review"
      | "file"
      | "brand_application"
      | "aircraft_submission"
      | "ranking"
      | "rating_target"
      | "comment",
    entityId: item.entityId,
    contentType: item.contentType as "text" | "image" | "video" | "mixed",
    provider: item.provider as "qiniu",
    mode: item.mode as "ai" | "manual" | "automatic",
    status: item.status as
      | "queued"
      | "running"
      | "passed"
      | "rejected"
      | "needs_manual_review"
      | "failed"
      | "manual_passed"
      | "manual_rejected",
    suggestion: item.suggestion ?? null,
    scene: item.scene ?? null,
    requestId: item.requestId ?? null,
    taskId: item.taskId ?? null,
    detailLabels: parseJsonRecord<string[]>(item.detailLabels, []),
    sceneSuggestions: parseJsonRecord<Record<string, string>>(item.sceneSuggestions, {}),
    rawPayload: parseJsonRecord<Record<string, unknown>>(item.rawPayload, {}),
    errorMessage: item.errorMessage ?? null,
    callbackReceivedAt: item.callbackReceivedAt?.toISOString() ?? null,
    resolvedAt: item.resolvedAt?.toISOString() ?? null,
    reviewedBy: item.reviewedBy ?? null,
    reviewNote: item.reviewNote ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

// Manual decisions must update the business entity first so status, counters and notifications
// stay aligned with the audit record across files, submissions, applications and comment threads.
async function applyManualDecisionToEntity(input: {
  domain: "file" | "brand_application" | "aircraft_submission" | "comment";
  entityId: string;
  status: "manual_passed" | "manual_rejected";
  reviewNote?: string | null;
}) {
  if (input.domain === "file") {
    return true;
  }

  if (input.domain === "brand_application") {
    const updated = await brandApplicationsService.updateStatus(
      input.entityId,
      input.status === "manual_passed" ? "approved" : "rejected",
      input.status === "manual_rejected" ? (input.reviewNote ?? null) : null
    );
    return updated !== null;
  }

  if (input.domain === "aircraft_submission") {
    const updated = await aircraftSubmissionsService.updateSubmissionStatus(
      input.entityId,
      input.status === "manual_passed" ? "approved" : "rejected",
      input.status === "manual_rejected" ? (input.reviewNote ?? null) : null
    );
    return updated !== null;
  }

  const nextCommentStatus = input.status === "manual_passed" ? "visible" : "hidden";
  const handlers = [
    () => postsService.updateCommentStatus(input.entityId, nextCommentStatus),
    () => aircraftModelsService.updateModelCommentStatus(input.entityId, nextCommentStatus),
    () => reviewsService.updateReviewCommentStatus(input.entityId, nextCommentStatus),
    () => rankingsService.updateRankingCommentStatus(input.entityId, nextCommentStatus),
    () => rankingsService.updateRatingTargetCommentStatus(input.entityId, nextCommentStatus)
  ];

  for (const handler of handlers) {
    const updated = await handler();
    if (updated) {
      return true;
    }
  }

  return false;
}

export const auditsService = {
  async listAdminAuditRecords(input?: {
    domain?:
      | "post"
      | "review"
      | "file"
      | "brand_application"
      | "aircraft_submission"
      | "ranking"
      | "rating_target"
      | "comment";
    entityId?: string;
    limit?: number;
  }) {
    const items = await auditsRepo.list({
      domain: input?.domain,
      entityId: input?.entityId,
      limit: input?.limit ?? 50
    });

    return {
      items: items
        .map((item) => serializeAuditRecord(item))
        .filter((item): item is NonNullable<typeof item> => item !== null)
    };
  },
  async applyManualDecision(input: {
    auditId: string;
    reviewerId: string;
    status: "manual_passed" | "manual_rejected";
    reviewNote?: string | null;
  }) {
    type SupportedManualAuditDomain =
      | "file"
      | "brand_application"
      | "aircraft_submission"
      | "comment";
    const supportedDomains = new Set([
      "file",
      "brand_application",
      "aircraft_submission",
      "comment"
    ]);
    const manualReviewPendingStatuses = new Set(["queued", "needs_manual_review"]);
    const existing = await auditsRepo.getById(input.auditId);
    if (!existing) {
      return { kind: "not_found" as const };
    }
    if (!supportedDomains.has(existing.domain)) {
      return { kind: "forbidden" as const };
    }
    if (!manualReviewPendingStatuses.has(existing.status)) {
      return { kind: "forbidden" as const };
    }
    const latest = await auditsRepo.getLatestByEntity(existing.domain, existing.entityId);
    if (!latest || latest.id !== existing.id) {
      return { kind: "forbidden" as const };
    }

    const entityUpdated = await applyManualDecisionToEntity({
      domain: existing.domain as SupportedManualAuditDomain,
      entityId: existing.entityId,
      status: input.status,
      reviewNote: input.reviewNote ?? null
    });
    if (!entityUpdated) {
      return { kind: "not_found" as const };
    }

    const updated = await auditsRepo.update(input.auditId, {
      status: input.status,
      reviewedBy: input.reviewerId,
      reviewNote: input.reviewNote ?? null,
      resolvedAt: new Date()
    });
    const item = updated ? serializeAuditRecord(updated) : null;
    if (!item) {
      return { kind: "not_found" as const };
    }

    return {
      kind: "ok" as const,
      payload: {
        item
      }
    };
  }
};
