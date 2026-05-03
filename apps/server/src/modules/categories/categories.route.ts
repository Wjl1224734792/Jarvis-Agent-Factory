import {
  adminCategoryInputSchema,
  adminCategoryResponseSchema,
  aircraftCategorySchema
} from "@feijia/schemas";
import { Hono, type Context } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  type AuthVariables
} from "../auth/auth.middleware";
import { categoriesService } from "./categories.service";

export const categoriesRoute = new Hono<{ Variables: AuthVariables }>();

function getRequiredIdOrBadRequest(context: Context) {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  return id;
}

// 机型分类域：读取接口对外公开，变更接口只允许管理员调用。
categoriesRoute.use("*", attachCurrentUser);

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
  const id = getRequiredIdOrBadRequest(context);
  if (id instanceof Response) {
    return id;
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
