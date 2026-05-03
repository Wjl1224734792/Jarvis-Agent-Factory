import { z } from "zod";
import { userSummarySchema } from "./auth";
import { imageFileSchema } from "./files";

export const adminReportEvidenceImageSchema = imageFileSchema.pick({
  id: true,
  url: true,
  fileName: true,
  mimeType: true,
  byteSize: true
});

export const adminReportRecordSchema = z.object({
  id: z.string().min(1),
  reason: z.string().min(1),
  createdAt: z.string().datetime(),
  reporter: userSummarySchema,
  evidenceImages: z.array(adminReportEvidenceImageSchema)
});

export const adminReportRecordsResponseSchema = z.object({
  items: z.array(adminReportRecordSchema)
});

export const adminReportSummaryKindSchema = z.enum([
  "post",
  "model",
  "review",
  "rating-target",
  "post-comment",
  "review-comment",
  "model-comment",
  "ranking-comment",
  "rating-target-comment"
]);

export const adminReportSummaryItemSchema = z.object({
  kind: adminReportSummaryKindSchema,
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().nullable().default(null),
  preview: z.string().nullable().default(null),
  reportCount: z.number().int().nonnegative(),
  status: z.string().nullable().default(null)
});

export const adminReportSummaryResponseSchema = z.object({
  items: z.array(adminReportSummaryItemSchema)
});
