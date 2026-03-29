import { z } from "zod";
import { userSummarySchema } from "./auth";

export const brandApplicationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "hidden"
]);

export const brandApplicationSchema = z.object({
  id: z.string().min(1),
  status: brandApplicationStatusSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  logoUrl: z.string().trim().min(1).nullable().default(null),
  description: z.string().nullable(),
  approvedBrandId: z.string().min(1).nullable(),
  applicant: userSummarySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const createBrandApplicationInputSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  logoUrl: z.string().trim().min(1).nullable().optional().default(null),
  description: z.string().trim().max(500).nullable().optional().default(null)
});

export const updateBrandApplicationStatusInputSchema = z.object({
  status: brandApplicationStatusSchema.exclude(["pending"])
});

export const brandApplicationResponseSchema = z.object({
  item: brandApplicationSchema
});

export const brandApplicationsResponseSchema = z.object({
  items: z.array(brandApplicationSchema)
});

export type BrandApplication = z.infer<typeof brandApplicationSchema>;
export type BrandApplicationStatus = z.infer<typeof brandApplicationStatusSchema>;
