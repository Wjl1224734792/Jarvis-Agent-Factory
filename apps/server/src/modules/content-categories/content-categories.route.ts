import {
  adminContentCategoryInputSchema,
  adminContentCategoryResponseSchema,
  contentCategoriesResponseSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono, type Context } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  type AuthVariables
} from "../auth/auth.middleware";
import { contentCategoriesService } from "./content-categories.service";

export const contentCategoriesRoute = new Hono<{ Variables: AuthVariables }>();

function getRequiredIdOrBadRequest(context: Context) {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  return id;
}

// 内容分类域：公开端只读取启用分类，管理端负责全量管理。
contentCategoriesRoute.use("*", attachCurrentUser);

contentCategoriesRoute.get(API_ROUTES.content.categories, async (context) => {
  const items = await contentCategoriesService.listEnabledCategories();
  return context.json(contentCategoriesResponseSchema.parse({ items }));
});

contentCategoriesRoute.get(API_ROUTES.content.adminCategories, requireAdmin, async (context) => {
  const items = await contentCategoriesService.listAllCategories();
  return context.json(contentCategoriesResponseSchema.parse({ items }));
});

contentCategoriesRoute.post(API_ROUTES.content.adminCategories, requireAdmin, async (context) => {
  const input = adminContentCategoryInputSchema.parse(await context.req.json());
  const item = await contentCategoriesService.createCategory(input);

  if (!item) {
    return context.json({ code: "INTERNAL_ERROR", message: "Failed to create content category." }, 500);
  }

  return context.json(adminContentCategoryResponseSchema.parse({ item }));
});

contentCategoriesRoute.put(
  API_ROUTES.content.adminCategoryDetail(":id"),
  requireAdmin,
  async (context) => {
    const id = getRequiredIdOrBadRequest(context);
    if (id instanceof Response) {
      return id;
    }

    const input = adminContentCategoryInputSchema.parse(await context.req.json());
    const item = await contentCategoriesService.updateCategory(id, input);

    if (!item) {
      return context.json({ code: "NOT_FOUND", message: "Content category not found." }, 404);
    }

    return context.json(adminContentCategoryResponseSchema.parse({ item }));
  }
);
