import { z } from "zod";
import { userSummarySchema } from "./auth";
import { aircraftCategorySchema, brandSchema, powerTypeSchema } from "./models";

export const aircraftSubmissionStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved",
  "rejected"
]);

export const aircraftSubmissionParametersSchema = z.object({
  maxFlightTimeMinutes: z.number().nonnegative().nullable(),
  maxRangeKilometers: z.number().nonnegative().nullable(),
  maxSpeedKph: z.number().nonnegative().nullable(),
  takeoffWeightGrams: z.number().nonnegative().nullable()
});

export const aircraftSubmissionVideoAssetSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  byteSize: z.number().int().positive()
});

export const aircraftSubmissionSchema = z.object({
  id: z.string().min(1),
  status: aircraftSubmissionStatusSchema,
  category: aircraftCategorySchema.pick({
    id: true,
    slug: true,
    name: true
  }),
  brand: brandSchema
    .pick({
      id: true,
      slug: true,
      name: true
    })
    .nullable(),
  proposedBrandName: z.string().nullable(),
  modelName: z.string().min(1),
  powerType: powerTypeSchema,
  summary: z.string().nullable(),
  description: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  galleryImageUrls: z.array(z.string().min(1)),
  videoAsset: aircraftSubmissionVideoAssetSchema.nullable(),
  approvedModelId: z.string().nullable(),
  approvedModelSlug: z.string().nullable(),
  author: userSummarySchema,
  parameters: aircraftSubmissionParametersSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const createAircraftSubmissionInputSchema = z.object({
  categoryId: z.string().trim().min(1),
  brandId: z.string().trim().min(1).nullable().optional().default(null),
  proposedBrandName: z.string().trim().min(1).max(80).nullable().optional().default(null),
  modelName: z.string().trim().min(1).max(120),
  powerType: powerTypeSchema,
  summary: z.string().trim().max(200).nullable(),
  description: z.string().trim().max(4000).nullable(),
  coverImageUrl: z.string().trim().min(1).nullable(),
  galleryImageUrls: z.array(z.string().trim().min(1)).max(6).default([]),
  videoAssetId: z.string().trim().min(1).nullable(),
  maxFlightTimeMinutes: z.number().nonnegative().nullable(),
  maxRangeKilometers: z.number().nonnegative().nullable(),
  maxSpeedKph: z.number().nonnegative().nullable(),
  takeoffWeightGrams: z.number().nonnegative().nullable()
});

export const updateAircraftSubmissionStatusInputSchema = z.object({
  status: z.enum(["approved", "rejected"])
});

export const aircraftSubmissionResponseSchema = z.object({
  item: aircraftSubmissionSchema
});

export const aircraftSubmissionsResponseSchema = z.object({
  items: z.array(aircraftSubmissionSchema)
});

export type AircraftSubmission = z.infer<typeof aircraftSubmissionSchema>;
export type AircraftSubmissionStatus = z.infer<typeof aircraftSubmissionStatusSchema>;
