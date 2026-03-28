import {
  adminModelInputSchema,
  adminModelResponseSchema,
  modelInteractionResponseSchema,
  modelInteractionTypeSchema,
  modelDetailResponseSchema,
  modelListQuerySchema,
  modelListResponseSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  requireAuth,
  type AuthVariables
} from "../auth/auth.middleware";
import { aircraftModelsService } from "./aircraft-models.service";

export const aircraftModelsRoute = new Hono<{ Variables: AuthVariables }>();
aircraftModelsRoute.use("*", attachCurrentUser);

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
  const item = await aircraftModelsService.getModelDetail(slug, context.get("currentUser")?.id);

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

aircraftModelsRoute.post(
  API_ROUTES.models.interactions(":slug", ":type"),
  requireAuth,
  async (context) => {
    const slug = context.req.param("slug");
    const type = context.req.param("type");
    const currentUser = context.get("currentUser");

    if (!slug || !type) {
      return context.json({ code: "BAD_REQUEST", message: "Missing interaction params." }, 400);
    }
    if (!currentUser) {
      return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
    }

    const parsedType = modelInteractionTypeSchema.safeParse(type);
    if (!parsedType.success) {
      return context.json({ code: "BAD_REQUEST", message: "Invalid interaction type." }, 400);
    }

    const payload = await aircraftModelsService.interactModel(slug, currentUser.id, parsedType.data);
    if (!payload) {
      return context.json({ code: "NOT_FOUND", message: "Model not found." }, 404);
    }

    return context.json(modelInteractionResponseSchema.parse(payload));
  }
);

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
        },
        interactionSummary: {
          interestCount: 0,
          favoriteCount: 0,
          shareCount: 0
        },
        viewer: {
          isInterested: false,
          isFavorited: false,
          hasShared: false
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
          },
          interactionSummary: {
            interestCount: 0,
            favoriteCount: 0,
            shareCount: 0
          },
          viewer: {
            isInterested: false,
            isFavorited: false,
            hasShared: false
          }
        }
      })
    );
  }
);
