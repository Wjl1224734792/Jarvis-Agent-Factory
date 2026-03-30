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
