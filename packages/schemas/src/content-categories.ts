import { z } from "zod";

export const contentCategorySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
  isEnabled: z.boolean(),
  createdAt: z.string().datetime()
});
