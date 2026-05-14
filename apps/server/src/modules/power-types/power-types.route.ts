import {
  adminPowerTypeCategoryInputSchema,
  adminPowerTypeCategoryResponseSchema,
  powerTypeCategorySchema,
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono, type Context } from "hono";
import {
  attachCurrentUser,
  requireRole,
  type AuthVariables,
} from "../auth/auth.middleware";
import { powerTypesService } from "./power-types.service";

export const powerTypesRoute = new Hono<{ Variables: AuthVariables }>();

function getRequiredIdOrBadRequest(context: Context) {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  return id;
}

powerTypesRoute.use("*", attachCurrentUser);

powerTypesRoute.get(API_ROUTES.powerTypes.list, async (context) => {
  const items = await powerTypesService.listPowerTypes();
  return context.json(items.map((item) => powerTypeCategorySchema.parse({
    ...item,
    createdAt: item.createdAt.toISOString(),
  })));
});

powerTypesRoute.get(
  API_ROUTES.powerTypes.adminList,
  requireRole('super_admin', 'editor'),
  async (context) => {
    const items = await powerTypesService.listPowerTypes();
    return context.json(
      items.map((item) => powerTypeCategorySchema.parse({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }))
    );
  }
);

powerTypesRoute.post(
  API_ROUTES.powerTypes.adminList,
  requireRole('super_admin', 'editor'),
  async (context) => {
    const input = adminPowerTypeCategoryInputSchema.parse(await context.req.json());
    const item = await powerTypesService.createPowerType(input);
    if (!item) {
      return context.json(
        { code: "INTERNAL_ERROR", message: "Failed to create power type." },
        500
      );
    }
    return context.json(
      adminPowerTypeCategoryResponseSchema.parse({
        item: { ...item, createdAt: item.createdAt.toISOString() },
      })
    );
  }
);

powerTypesRoute.put(
  API_ROUTES.powerTypes.adminDetail(":id"),
  requireRole('super_admin', 'editor'),
  async (context) => {
    const id = getRequiredIdOrBadRequest(context);
    if (id instanceof Response) return id;
    const input = adminPowerTypeCategoryInputSchema.parse(await context.req.json());
    const item = await powerTypesService.updatePowerType(id, input);
    if (!item) {
      return context.json(
        { code: "NOT_FOUND", message: "Power type not found." },
        404
      );
    }
    return context.json(
      adminPowerTypeCategoryResponseSchema.parse({
        item: { ...item, createdAt: item.createdAt.toISOString() },
      })
    );
  }
);
