import { z } from "zod";

export const aircraftCategorySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
  isEnabled: z.boolean()
});

export const brandSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().min(1).nullable(),
  sortOrder: z.number().int().nonnegative(),
  isEnabled: z.boolean()
});

export const powerTypeSchema = z.enum(["electric", "fuel", "hybrid", "other"]);

export const modelListItemSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().nullable(),
  powerType: powerTypeSchema,
  reviewSummary: z.object({
    totalReviews: z.number().int().nonnegative()
  }),
  category: aircraftCategorySchema.pick({
    id: true,
    slug: true,
    name: true
  }),
  brand: brandSchema.pick({
    id: true,
    slug: true,
    name: true
  })
});

export const modelParameterSchema = z.object({
  maxFlightTimeMinutes: z.number().nonnegative().nullable(),
  maxRangeKilometers: z.number().nonnegative().nullable(),
  maxSpeedKph: z.number().nonnegative().nullable(),
  takeoffWeightGrams: z.number().nonnegative().nullable()
});

export const modelDetailSchema = modelListItemSchema.extend({
  description: z.string().nullable(),
  isPublished: z.boolean(),
  parameters: modelParameterSchema
});

export const modelListQuerySchema = z.object({
  categorySlug: z.string().min(1).optional(),
  brandSlug: z.string().min(1).optional(),
  powerTypes: z.array(powerTypeSchema).optional()
});

export const modelListResponseSchema = z.object({
  items: z.array(modelListItemSchema),
  total: z.number().int().nonnegative(),
  filters: z.object({
    categories: z.array(aircraftCategorySchema),
    brands: z.array(brandSchema),
    powerTypes: z.array(powerTypeSchema)
  })
});

export const modelDetailResponseSchema = z.object({
  item: modelDetailSchema
});

export const adminCategoryInputSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number().int().nonnegative().default(0),
  isEnabled: z.boolean().default(true)
});

export const adminCategoryResponseSchema = z.object({
  item: aircraftCategorySchema
});

export const adminBrandInputSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().min(1).nullable(),
  sortOrder: z.number().int().nonnegative().default(0),
  isEnabled: z.boolean().default(true)
});

export const adminBrandResponseSchema = z.object({
  item: brandSchema
});

export const adminModelInputSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().min(1),
  brandId: z.string().min(1),
  powerType: powerTypeSchema,
  summary: z.string().nullable(),
  description: z.string().nullable(),
  maxFlightTimeMinutes: z.number().nonnegative().nullable(),
  maxRangeKilometers: z.number().nonnegative().nullable(),
  maxSpeedKph: z.number().nonnegative().nullable(),
  takeoffWeightGrams: z.number().nonnegative().nullable(),
  isPublished: z.boolean().default(true)
});

export const adminModelResponseSchema = z.object({
  item: modelDetailSchema
});

export type AircraftCategory = z.infer<typeof aircraftCategorySchema>;
export type Brand = z.infer<typeof brandSchema>;
export type PowerType = z.infer<typeof powerTypeSchema>;
export type ModelListItem = z.infer<typeof modelListItemSchema>;
export type ModelDetail = z.infer<typeof modelDetailSchema>;
