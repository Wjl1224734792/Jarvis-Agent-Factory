import {
  actionSuccessResponseSchema,
  adminReportRecordsResponseSchema,
  adminModelInputSchema,
  adminModelCommentResponseSchema,
  adminModelCommentsResponseSchema,
  adminModelResponseSchema,
  createModelCommentInputSchema,
  createModelCommentResponseSchema,
  modelInteractionResponseSchema,
  modelInteractionTypeSchema,
  modelCommentsResponseSchema,
  modelDetailResponseSchema,
  modelListQuerySchema,
  modelListResponseSchema,
  modelCompareQuerySchema,
  modelCompareResponseSchema,
  reportContentInputSchema,
  updateModelCommentInputSchema,
  updateModelCommentStatusInputSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { type Context, Hono } from "hono";
import { VIEW_SESSION_HEADER } from "../../lib/view-tracking";
import {
  attachCurrentUser,
  requireAuth,
  requireRole,
  type AuthVariables
} from "../auth/auth.middleware";
import { aircraftModelsService } from "./aircraft-models.service";

export const aircraftModelsRoute = new Hono<{ Variables: AuthVariables }>();
aircraftModelsRoute.use("*", attachCurrentUser);

function buildViewerFingerprint(context: Context<{ Variables: AuthVariables }>) {
  const forwardedFor =
    context.req.header("x-forwarded-for") ??
    context.req.header("x-real-ip") ??
    "";
  const userAgent = context.req.header("user-agent") ?? "";
  const fingerprint = `${forwardedFor}|${userAgent}`.trim();
  return fingerprint.length > 1 ? fingerprint : null;
}

aircraftModelsRoute.get(API_ROUTES.models.list, async (context) => {
  const query = modelListQuerySchema.parse({
    categorySlugs: context.req.queries("categorySlug"),
    brandSlugs: context.req.queries("brandSlug"),
    powerTypes: context.req.queries("powerType"),
    keyword: context.req.query("keyword") || undefined,
    sort: context.req.query("sort") || undefined,
    tab: context.req.query("tab") || undefined,
    currentUserId: context.get("currentUser")?.id ?? undefined,
    limit: context.req.query("limit") || undefined,
    page: context.req.query("page") || undefined
  });

  const payload = await aircraftModelsService.listModels(query);
  return context.json(modelListResponseSchema.parse(payload));
});

aircraftModelsRoute.get(API_ROUTES.models.compare, async (context) => {
  const raw = (context.req.queries("slugs") ?? [context.req.query("slugs")])
    .filter(Boolean)
    .flatMap(s => s!.split(","))
    .filter(Boolean);
  const query = modelCompareQuerySchema.parse({ slugs: raw });
  const flatItems = await aircraftModelsService.compareModels(query.slugs);
  const items = flatItems.map((item: Record<string, unknown>) => {
    const { coverImageUrl, coverVideoUrl, ...rest } = item;
    const paramKeys = [
      "maxFlightTimeMinutes","maxRangeKilometers","maxSpeedKph","cruiseSpeedKph",
      "takeoffWeightGrams","wingspanMm","lengthMm","heightMm","maxAltitudeM",
      "climbRateMs","windResistance","motorType","batteryType","batteryCapacityMah",
      "batteryVoltage","batteryEnergyWh","chargeTimeMinutes","propellerSize",
      "obstacleAvoidance","gnssType","ipRating","operatingTemperature","cameraSensorSize",
      "cameraPixels","videoResolution","lensAperture","isoRange","transmissionSystem",
      "transmissionRangeM","certificationType","noiseLevelDb","materialType"
    ];
    const parameters = Object.fromEntries(paramKeys.map(k => [k, rest[k] ?? null]));
    const nonParam = Object.fromEntries(Object.entries(rest).filter(([k]) => !paramKeys.includes(k)));
    return { ...nonParam, coverImageUrl, coverVideoUrl, parameters };
  });
  return context.json(modelCompareResponseSchema.parse({ items }));
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
          cruiseSpeedKph: item.cruiseSpeedKph,
          takeoffWeightGrams: item.takeoffWeightGrams,
          wingspanMm: item.wingspanMm,
          lengthMm: item.lengthMm,
          heightMm: item.heightMm,
          maxAltitudeM: item.maxAltitudeM,
          climbRateMs: item.climbRateMs,
          windResistance: item.windResistance,
          motorType: item.motorType,
          batteryType: item.batteryType,
          batteryCapacityMah: item.batteryCapacityMah,
          batteryVoltage: item.batteryVoltage,
          batteryEnergyWh: item.batteryEnergyWh,
          chargeTimeMinutes: item.chargeTimeMinutes,
          propellerSize: item.propellerSize,
          obstacleAvoidance: item.obstacleAvoidance,
          gnssType: item.gnssType,
          ipRating: item.ipRating,
          operatingTemperature: item.operatingTemperature,
          cameraSensorSize: item.cameraSensorSize,
          cameraPixels: item.cameraPixels,
          videoResolution: item.videoResolution,
          lensAperture: item.lensAperture,
          isoRange: item.isoRange,
          transmissionSystem: item.transmissionSystem,
          transmissionRangeM: item.transmissionRangeM,
          certificationType: item.certificationType,
          noiseLevelDb: item.noiseLevelDb,
          materialType: item.materialType
        }
      }
    })
  );
});

aircraftModelsRoute.post(API_ROUTES.models.view(":slug"), async (context) => {
  const slug = context.req.param("slug");
  if (!slug) {
    return context.json({ code: "BAD_REQUEST", message: "Missing slug." }, 400);
  }

  const result = await aircraftModelsService.recordModelView(slug, {
    currentUserId: context.get("currentUser")?.id ?? null,
    sessionId: context.req.header(VIEW_SESSION_HEADER) ?? null,
    viewerFingerprint: buildViewerFingerprint(context)
  });
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Model not found." }, 404);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

aircraftModelsRoute.get(API_ROUTES.models.comments(":slug"), async (context) => {
  const slug = context.req.param("slug");
  if (!slug) {
    return context.json({ code: "BAD_REQUEST", message: "Missing slug." }, 400);
  }

  const payload = await aircraftModelsService.listModelComments(slug, context.get("currentUser")?.id);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Model not found." }, 404);
  }

  return context.json(modelCommentsResponseSchema.parse(payload));
});

aircraftModelsRoute.post(API_ROUTES.models.comments(":slug"), requireAuth, async (context) => {
  const slug = context.req.param("slug");
  const currentUser = context.get("currentUser");
  if (!slug) {
    return context.json({ code: "BAD_REQUEST", message: "Missing slug." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = createModelCommentInputSchema.parse(await context.req.json());
  const result = await aircraftModelsService.createModelComment(slug, currentUser, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Model or comment not found." }, 404);
  }

  return context.json(createModelCommentResponseSchema.parse({ item: result.item }));
});

aircraftModelsRoute.put(API_ROUTES.models.commentDetail(":slug", ":commentId"), requireAuth, async (context) => {
  const slug = context.req.param("slug");
  const commentId = context.req.param("commentId");
  const currentUser = context.get("currentUser");
  if (!slug || !commentId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = updateModelCommentInputSchema.parse(await context.req.json());
  const result = await aircraftModelsService.updateModelComment(slug, commentId, currentUser, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(createModelCommentResponseSchema.parse({ item: result.item }));
});

aircraftModelsRoute.delete(
  API_ROUTES.models.commentDetail(":slug", ":commentId"),
  requireAuth,
  async (context) => {
    const slug = context.req.param("slug");
    const commentId = context.req.param("commentId");
    const currentUser = context.get("currentUser");
    if (!slug || !commentId) {
      return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
    }
    if (!currentUser) {
      return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
    }

    const result = await aircraftModelsService.deleteModelComment(slug, commentId, currentUser);
    if (result.kind === "not_found") {
      return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
    }
    if (result.kind === "forbidden") {
      return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
    }

    return context.json({ success: true });
  }
);

aircraftModelsRoute.post(API_ROUTES.models.commentLike(":slug", ":commentId"), requireAuth, async (context) => {
  const slug = context.req.param("slug");
  const commentId = context.req.param("commentId");
  const currentUser = context.get("currentUser");
  if (!slug || !commentId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const result = await aircraftModelsService.toggleModelCommentLike(slug, commentId, currentUser);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  }

  return context.json({ success: true });
});

aircraftModelsRoute.post(API_ROUTES.models.commentReport(":slug", ":commentId"), requireAuth, async (context) => {
  const slug = context.req.param("slug");
  const commentId = context.req.param("commentId");
  const currentUser = context.get("currentUser");
  if (!slug || !commentId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = reportContentInputSchema.parse(await context.req.json());
  const result = await aircraftModelsService.reportModelComment(slug, commentId, currentUser, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  }
  if (result.kind === "invalid_images") {
    return context.json({ code: "BAD_REQUEST", message: "Invalid report evidence images." }, 400);
  }

  return context.json({ success: true });
});

aircraftModelsRoute.post(API_ROUTES.models.report(":slug"), requireAuth, async (context) => {
  const slug = context.req.param("slug");
  const currentUser = context.get("currentUser");
  if (!slug) {
    return context.json({ code: "BAD_REQUEST", message: "Missing slug." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = reportContentInputSchema.parse(await context.req.json());
  const result = await aircraftModelsService.reportModel(slug, currentUser, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Model not found." }, 404);
  }
  if (result.kind === "invalid_images") {
    return context.json({ code: "BAD_REQUEST", message: "Invalid report evidence images." }, 400);
  }

  return context.json({ success: true });
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

aircraftModelsRoute.post(API_ROUTES.models.adminList, requireRole('super_admin', 'editor'), async (context) => {
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

  const detailItem = await aircraftModelsService.buildAdminModelResponseItem(item);
  return context.json(adminModelResponseSchema.parse({ item: detailItem }));
});

aircraftModelsRoute.get(
  API_ROUTES.models.adminDetail(":id"),
  requireRole('super_admin', 'editor'),
  async (context) => {
    const id = context.req.param("id");
    if (!id) {
      return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
    }

    const item = await aircraftModelsService.getModelDetailById(id);
    if (!item) {
      return context.json({ code: "NOT_FOUND", message: "Model not found." }, 404);
    }

    const detailItem = await aircraftModelsService.buildAdminModelResponseItem(item);
    return context.json(adminModelResponseSchema.parse({ item: detailItem }));
  }
);

aircraftModelsRoute.put(
  API_ROUTES.models.adminDetail(":id"),
  requireRole('super_admin', 'editor'),
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

    const detailItem = await aircraftModelsService.buildAdminModelResponseItem(item);
    return context.json(adminModelResponseSchema.parse({ item: detailItem }));
  }
);

aircraftModelsRoute.get(API_ROUTES.models.adminComments, requireRole('super_admin', 'editor'), async (context) => {
  const status = context.req.query("status");
  const payload = await aircraftModelsService.listAdminModelComments(
    status === "pending" || status === "visible" || status === "hidden" ? status : undefined
  );
  return context.json(adminModelCommentsResponseSchema.parse(payload));
});

aircraftModelsRoute.get(API_ROUTES.models.adminReports(":id"), requireRole('super_admin', 'editor'), async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const payload = await aircraftModelsService.listModelReports(id);
  return context.json(adminReportRecordsResponseSchema.parse(payload));
});

aircraftModelsRoute.put(API_ROUTES.models.adminCommentDetail(":id"), requireRole('super_admin', 'editor'), async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const input = updateModelCommentStatusInputSchema.parse(await context.req.json());
  const item = await aircraftModelsService.updateModelCommentStatus(id, input.status);
  if (!item) {
    return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  }

  return context.json(adminModelCommentResponseSchema.parse({ item }));
});

aircraftModelsRoute.get(API_ROUTES.models.adminCommentReports(":id"), requireRole('super_admin', 'editor'), async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const payload = await aircraftModelsService.listModelCommentReports(id);
  return context.json(adminReportRecordsResponseSchema.parse(payload));
});
