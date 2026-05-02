import { z } from "zod";

export const adminReportRecordsResponseSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1),
    domain: z.string().min(1),
    entityId: z.string().min(1),
    reason: z.string(),
    createdAt: z.string().datetime(),
  })),
});
