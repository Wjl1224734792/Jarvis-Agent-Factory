import { z } from "zod";

export const adminAuditRecordDomainSchema = z.enum([
  "post",
  "review",
  "file",
  "brand_application",
  "aircraft_submission",
  "ranking",
  "rating_target",
  "comment"
]);

export const adminAuditRecordContentTypeSchema = z.enum(["text", "image", "video", "mixed"]);
export const adminAuditRecordProviderSchema = z.enum(["qiniu"]);
export const adminAuditRecordModeSchema = z.enum(["ai", "manual", "automatic"]);
export const adminAuditRecordStatusSchema = z.enum([
  "queued",
  "running",
  "passed",
  "rejected",
  "needs_manual_review",
  "failed",
  "manual_passed",
  "manual_rejected"
]);

export const adminAuditRecordSchema = z.object({
  id: z.string().min(1),
  domain: adminAuditRecordDomainSchema,
  entityId: z.string().min(1),
  contentType: adminAuditRecordContentTypeSchema,
  provider: adminAuditRecordProviderSchema,
  mode: adminAuditRecordModeSchema,
  status: adminAuditRecordStatusSchema,
  suggestion: z.string().nullable().default(null),
  scene: z.string().nullable().default(null),
  requestId: z.string().nullable().default(null),
  taskId: z.string().nullable().default(null),
  detailLabels: z.array(z.string()).default([]),
  sceneSuggestions: z.record(z.string(), z.string()).default({}),
  rawPayload: z.record(z.string(), z.unknown()).default({}),
  errorMessage: z.string().nullable().default(null),
  callbackReceivedAt: z.string().datetime().nullable().default(null),
  resolvedAt: z.string().datetime().nullable().default(null),
  reviewedBy: z.string().nullable().default(null),
  reviewNote: z.string().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const adminAuditRecordListQuerySchema = z.object({
  domain: adminAuditRecordDomainSchema.optional(),
  entityId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const adminAuditRecordListResponseSchema = z.object({
  items: z.array(adminAuditRecordSchema)
});

export const adminAuditManualDecisionStatusSchema = z.enum([
  "manual_passed",
  "manual_rejected"
]);

export const adminAuditManualDecisionInputSchema = z.object({
  status: adminAuditManualDecisionStatusSchema,
  reviewNote: z.string().trim().min(2).max(500).nullable().optional().default(null)
}).superRefine((input, context) => {
  if (input.status === "manual_rejected" && !input.reviewNote?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Review note is required when manually rejecting an audit.",
      path: ["reviewNote"]
    });
  }
});

export const adminAuditRecordResponseSchema = z.object({
  item: adminAuditRecordSchema
});

export type AdminAuditRecord = z.infer<typeof adminAuditRecordSchema>;
