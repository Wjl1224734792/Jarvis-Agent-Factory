import { auditsRepo } from "./audits.repo";

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
  }
};
