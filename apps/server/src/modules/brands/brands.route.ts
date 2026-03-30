import {
  adminBrandInputSchema,
  adminBrandResponseSchema,
  brandSchema
} from "@feijia/schemas";
import { Hono, type Context } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  type AuthVariables
} from "../auth/auth.middleware";
import { brandsService } from "./brands.service";

export const brandsRoute = new Hono<{ Variables: AuthVariables }>();

function getRequiredIdOrBadRequest(context: Context) {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  return id;
}

// 品牌域：公开查询可读，写接口仅管理员开放。
brandsRoute.use("*", attachCurrentUser);

brandsRoute.get("/", async (context) => {
  const items = await brandsService.listBrands();
  return context.json(items.map((item) => brandSchema.parse(item)));
});

brandsRoute.post("/", requireAdmin, async (context) => {
  const input = adminBrandInputSchema.parse(await context.req.json());
  const item = await brandsService.createBrand(input);
  return context.json(adminBrandResponseSchema.parse({ item }));
});

brandsRoute.put("/:id", requireAdmin, async (context) => {
  const id = getRequiredIdOrBadRequest(context);
  if (id instanceof Response) {
    return id;
  }
  const input = adminBrandInputSchema.parse(await context.req.json());
  const item = await brandsService.updateBrand(id, input);

  if (!item) {
    return context.json(
      {
        code: "NOT_FOUND",
        message: "Brand not found."
      },
      404
    );
  }

  return context.json(adminBrandResponseSchema.parse({ item }));
});
