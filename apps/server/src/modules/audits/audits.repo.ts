import { auditRecordsTable, createId, db, filesTable } from "@feijia/db";
import { and, desc, eq, inArray } from "drizzle-orm";

async function syncFileAuditSnapshot(input: {
  auditId: string;
  domain: string;
  entityId: string;
  status:
    | "queued"
    | "running"
    | "passed"
    | "rejected"
    | "needs_manual_review"
    | "failed"
    | "manual_passed"
    | "manual_rejected";
  updatedAt?: Date;
}) {
  if (input.domain !== "file") {
    return;
  }

  await db
    .update(filesTable)
    .set({
      currentAuditRecordId: input.auditId,
      currentAuditStatus: input.status,
      currentAuditUpdatedAt: input.updatedAt ?? new Date()
    })
    .where(eq(filesTable.id, input.entityId));
}

export const auditsRepo = {
  async create(input: {
    domain: string;
    entityId: string;
    contentType: "text" | "image" | "video" | "mixed";
    provider?: "qiniu";
    mode: "ai" | "manual" | "automatic";
    status:
      | "queued"
      | "running"
      | "passed"
      | "rejected"
      | "needs_manual_review"
      | "failed"
      | "manual_passed"
      | "manual_rejected";
    suggestion?: string | null;
    scene?: string | null;
    requestId?: string | null;
    taskId?: string | null;
    detailLabels?: string[];
    sceneSuggestions?: Record<string, string>;
    rawPayload?: Record<string, unknown>;
    errorMessage?: string | null;
    callbackReceivedAt?: Date | null;
    resolvedAt?: Date | null;
    reviewedBy?: string | null;
    reviewNote?: string | null;
  }) {
    const id = createId("audit");
    await db.insert(auditRecordsTable).values({
      id,
      domain: input.domain,
      entityId: input.entityId,
      contentType: input.contentType,
      provider: input.provider ?? "qiniu",
      mode: input.mode,
      status: input.status,
      suggestion: input.suggestion ?? null,
      scene: input.scene ?? null,
      requestId: input.requestId ?? null,
      taskId: input.taskId ?? null,
      detailLabels: JSON.stringify(input.detailLabels ?? []),
      sceneSuggestions: JSON.stringify(input.sceneSuggestions ?? {}),
      rawPayload: JSON.stringify(input.rawPayload ?? {}),
      errorMessage: input.errorMessage ?? null,
      callbackReceivedAt: input.callbackReceivedAt ?? null,
      resolvedAt: input.resolvedAt ?? null,
      reviewedBy: input.reviewedBy ?? null,
      reviewNote: input.reviewNote ?? null
    });
    await syncFileAuditSnapshot({
      auditId: id,
      domain: input.domain,
      entityId: input.entityId,
      status: input.status
    });

    return this.getById(id);
  },
  async getById(id: string) {
    const rows = await db
      .select()
      .from(auditRecordsTable)
      .where(eq(auditRecordsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async getLatestByEntity(domain: string, entityId: string) {
    const rows = await db
      .select()
      .from(auditRecordsTable)
      .where(and(eq(auditRecordsTable.domain, domain), eq(auditRecordsTable.entityId, entityId)))
      .orderBy(desc(auditRecordsTable.createdAt))
      .limit(1);

    return rows[0] ?? null;
  },
  async getByTaskId(taskId: string) {
    const rows = await db
      .select()
      .from(auditRecordsTable)
      .where(eq(auditRecordsTable.taskId, taskId))
      .orderBy(desc(auditRecordsTable.createdAt))
      .limit(1);

    return rows[0] ?? null;
  },
  async listLatestByEntities(domain: string, entityIds: string[]) {
    if (entityIds.length === 0) {
      return [];
    }

    const rows = await db
      .select()
      .from(auditRecordsTable)
      .where(
        and(
          eq(auditRecordsTable.domain, domain),
          inArray(auditRecordsTable.entityId, entityIds)
        )
      )
      .orderBy(desc(auditRecordsTable.createdAt));

    const latestByEntityId = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latestByEntityId.has(row.entityId)) {
        latestByEntityId.set(row.entityId, row);
      }
    }

    return entityIds
      .map((entityId) => latestByEntityId.get(entityId) ?? null)
      .filter((item): item is NonNullable<typeof item> => item !== null);
  },
  async list(input?: {
    domain?: string;
    entityId?: string;
    limit?: number;
  }) {
    return db
      .select()
      .from(auditRecordsTable)
      .where(
        and(
          input?.domain ? eq(auditRecordsTable.domain, input.domain) : undefined,
          input?.entityId ? eq(auditRecordsTable.entityId, input.entityId) : undefined
        )
      )
      .orderBy(desc(auditRecordsTable.createdAt))
      .limit(input?.limit ?? 50);
  },
  async update(id: string, input: Partial<{
    status:
      | "queued"
      | "running"
      | "passed"
      | "rejected"
      | "needs_manual_review"
      | "failed"
      | "manual_passed"
      | "manual_rejected";
    suggestion: string | null;
    scene: string | null;
    requestId: string | null;
    taskId: string | null;
    detailLabels: string[];
    sceneSuggestions: Record<string, string>;
    rawPayload: Record<string, unknown>;
    errorMessage: string | null;
    callbackReceivedAt: Date | null;
    resolvedAt: Date | null;
    reviewedBy: string | null;
    reviewNote: string | null;
  }>) {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    await db
      .update(auditRecordsTable)
      .set({
        status: input.status,
        suggestion: input.suggestion,
        scene: input.scene,
        requestId: input.requestId,
        taskId: input.taskId,
        detailLabels: input.detailLabels ? JSON.stringify(input.detailLabels) : undefined,
        sceneSuggestions: input.sceneSuggestions ? JSON.stringify(input.sceneSuggestions) : undefined,
        rawPayload: input.rawPayload ? JSON.stringify(input.rawPayload) : undefined,
        errorMessage: input.errorMessage,
        callbackReceivedAt: input.callbackReceivedAt,
        resolvedAt: input.resolvedAt,
        reviewedBy: input.reviewedBy,
        reviewNote: input.reviewNote,
        updatedAt: new Date()
      })
      .where(eq(auditRecordsTable.id, id));

    if (input.status) {
      await syncFileAuditSnapshot({
        auditId: id,
        domain: existing.domain,
        entityId: existing.entityId,
        status: input.status,
        updatedAt: input.resolvedAt ?? input.callbackReceivedAt ?? new Date()
      });
    }

    return this.getById(id);
  }
};
