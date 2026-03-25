import { z } from "zod";

export const contentCategorySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
  isEnabled: z.boolean()
});

export const contentCategoriesResponseSchema = z.object({
  items: z.array(contentCategorySchema)
});

export const adminContentCategoryInputSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number().int().nonnegative().default(0),
  isEnabled: z.boolean().default(true)
});

export const adminContentCategoryResponseSchema = z.object({
  item: contentCategorySchema
});

export type ContentCategory = z.infer<typeof contentCategorySchema>;
