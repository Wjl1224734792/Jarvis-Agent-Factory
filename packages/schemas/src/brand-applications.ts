import { z } from "zod";
import { userSummarySchema } from "./auth";

export const brandApplicationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected"
]);

export const brandApplicationSchema = z.object({
  id: z.string().min(1),
  status: brandApplicationStatusSchema,
  slug: z.string().min(1).nullable().default(null),
  name: z.string().min(1),
  logoUrl: z.string().trim().min(1).nullable().default(null),
  description: z.string().nullable(),
  rejectionReason: z.string().nullable().default(null),
  approvedBrandId: z.string().min(1).nullable(),
  applicant: userSummarySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const createBrandApplicationInputSchema = z.object({
  slug: z.string().trim().max(80).nullable().optional().default(null),
  name: z.string().trim().min(1).max(80),
  logoUrl: z.string().trim().min(1).nullable().optional().default(null),
  description: z.string().trim().max(500).nullable().optional().default(null)
});

export const updateBrandApplicationInputSchema = createBrandApplicationInputSchema;

export const updateBrandApplicationStatusInputSchema = z.object({
  status: brandApplicationStatusSchema.exclude(["pending"]),
  rejectionReason: z.string().trim().min(2).max(200).nullable().optional().default(null)
}).superRefine((input, context) => {
  if (input.status === "rejected" && !input.rejectionReason?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Rejection reason is required.",
      path: ["rejectionReason"]
    });
  }
});

export const brandApplicationResponseSchema = z.object({
  item: brandApplicationSchema
});

export const brandApplicationsResponseSchema = z.object({
  items: z.array(brandApplicationSchema)
});

export type BrandApplication = z.infer<typeof brandApplicationSchema>;
// Keep legacy type compatibility for call-sites outside the brand-applications module.
export type BrandApplicationStatus = z.infer<typeof brandApplicationStatusSchema> | "hidden";
