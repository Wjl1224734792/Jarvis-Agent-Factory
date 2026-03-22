import {
  adminCategoryInputSchema,
  adminCategoryResponseSchema,
  aircraftCategorySchema
} from "@feijia/schemas";
import { Hono } from "hono";
import { requireAdmin, type AuthVariables } from "../auth/auth.middleware";
import { categoriesService } from "./categories.service";

export const categoriesRoute = new Hono<{ Variables: AuthVariables }>();

categoriesRoute.get("/", async (context) => {
  const items = await categoriesService.listCategories();
  return context.json(items.map((item) => aircraftCategorySchema.parse(item)));
});

categoriesRoute.post("/", requireAdmin, async (context) => {
  const input = adminCategoryInputSchema.parse(await context.req.json());
  const item = await categoriesService.createCategory(input);
  return context.json(adminCategoryResponseSchema.parse({ item }));
});

categoriesRoute.put("/:id", requireAdmin, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  const input = adminCategoryInputSchema.parse(await context.req.json());
  const item = await categoriesService.updateCategory(id, input);

  if (!item) {
    return context.json(
      {
        code: "NOT_FOUND",
        message: "Category not found."
      },
      404
    );
  }

  return context.json(adminCategoryResponseSchema.parse({ item }));
});
