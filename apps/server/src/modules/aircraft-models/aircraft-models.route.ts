import {
  adminModelInputSchema,
  adminModelResponseSchema,
  modelDetailResponseSchema,
  modelListQuerySchema,
  modelListResponseSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import { requireAdmin, type AuthVariables } from "../auth/auth.middleware";
import { aircraftModelsService } from "./aircraft-models.service";

export const aircraftModelsRoute = new Hono<{ Variables: AuthVariables }>();

aircraftModelsRoute.get(API_ROUTES.models.list, async (context) => {
  const query = modelListQuerySchema.parse({
    categorySlug: context.req.query("categorySlug") || undefined,
    brandSlug: context.req.query("brandSlug") || undefined,
    powerTypes: context.req.queries("powerType")
  });

  const payload = await aircraftModelsService.listModels(query);
  return context.json(modelListResponseSchema.parse(payload));
});

aircraftModelsRoute.get(API_ROUTES.models.detail(":slug"), async (context) => {
  const slug = context.req.param("slug");
  if (!slug) {
    return context.json({ code: "BAD_REQUEST", message: "Missing slug." }, 400);
  }
  const item = await aircraftModelsService.getModelDetail(slug);

  if (!item) {
    return context.json(
      {
        code: "NOT_FOUND",
        message: "Model not found."
      },
      404
    );
  }

  return context.json(
    modelDetailResponseSchema.parse({
      item: {
        ...item,
        parameters: {
          maxFlightTimeMinutes: item.maxFlightTimeMinutes,
          maxRangeKilometers: item.maxRangeKilometers,
          maxSpeedKph: item.maxSpeedKph,
          takeoffWeightGrams: item.takeoffWeightGrams
        }
      }
    })
  );
});

aircraftModelsRoute.post(API_ROUTES.models.adminList, requireAdmin, async (context) => {
  const input = adminModelInputSchema.parse(await context.req.json());
  const item = await aircraftModelsService.createModel(input);

  if (!item) {
    return context.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to create model."
      },
      500
    );
  }

  return context.json(
    adminModelResponseSchema.parse({
      item: {
        ...item,
        parameters: {
          maxFlightTimeMinutes: item.maxFlightTimeMinutes,
          maxRangeKilometers: item.maxRangeKilometers,
          maxSpeedKph: item.maxSpeedKph,
          takeoffWeightGrams: item.takeoffWeightGrams
        }
      }
    })
  );
});

aircraftModelsRoute.put(
  API_ROUTES.models.adminDetail(":id"),
  requireAdmin,
  async (context) => {
    const id = context.req.param("id");
    if (!id) {
      return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
    }
    const input = adminModelInputSchema.parse(await context.req.json());
    const item = await aircraftModelsService.updateModel(id, input);

    if (!item) {
      return context.json(
        {
          code: "NOT_FOUND",
          message: "Model not found."
        },
        404
      );
    }

    return context.json(
      adminModelResponseSchema.parse({
        item: {
          ...item,
          parameters: {
            maxFlightTimeMinutes: item.maxFlightTimeMinutes,
            maxRangeKilometers: item.maxRangeKilometers,
            maxSpeedKph: item.maxSpeedKph,
            takeoffWeightGrams: item.takeoffWeightGrams
          }
        }
      })
    );
  }
);
