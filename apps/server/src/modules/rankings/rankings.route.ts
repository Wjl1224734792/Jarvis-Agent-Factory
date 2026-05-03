import {
  actionSuccessResponseSchema,
  adminRankingCommentResponseSchema,
  adminRankingCommentsResponseSchema,
  adminRatingTargetsModerationResponseSchema,
  adminRatingTargetCommentResponseSchema,
  adminRatingTargetCommentsResponseSchema,
  adminRankingsResponseSchema,
  addRatingTargetInputSchema,
  createRankingCommentInputSchema,
  createRankingCommentResponseSchema,
  createRankingInputSchema,
  createRatingTargetCommentInputSchema,
  createRatingTargetCommentResponseSchema,
  reportContentInputSchema,
  ratingTargetDetailResponseSchema,
  ratingTargetResponseSchema,
  rankingResponseSchema,
  rankingsResponseSchema,
  submitRatingTargetRatingInputSchema,
  submitRatingTargetRatingResponseSchema,
  submitRatingTargetReviewInputSchema,
  submitRatingTargetReviewResponseSchema,
  updateRankingCommentStatusInputSchema,
  updateRatingTargetCommentStatusInputSchema,
  updateRatingTargetCommentInputSchema,
  updateRatingTargetStatusInputSchema,
  updateRankingStatusInputSchema,
  updateRankingInputSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  requireAuth,
  type AuthVariables
} from "../auth/auth.middleware";
import { rankingsService } from "./rankings.service";

export const rankingsRoute = new Hono<{ Variables: AuthVariables }>();

rankingsRoute.use("*", attachCurrentUser);

function parsePositiveInt(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

rankingsRoute.get(API_ROUTES.rankings.overview, async (context) => {
  const currentUser = context.get("currentUser");
  const payload = await rankingsService.listRankings(currentUser ?? undefined, {
    page: parsePositiveInt(context.req.query("page")),
    limit: parsePositiveInt(context.req.query("limit"))
  });
  return context.json(rankingsResponseSchema.parse(payload));
});

rankingsRoute.get(API_ROUTES.rankings.adminList, requireAdmin, async (context) => {
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const scope = context.req.query("scope");
  const status = context.req.query("status");
  const result = await rankingsService.listAdminRankings(currentUser, {
    scope: scope === "official" || scope === "community" ? scope : undefined,
    status:
      status === "pending" || status === "published" || status === "rejected" || status === "hidden"
        ? status
        : undefined
  });
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(adminRankingsResponseSchema.parse(result.payload));
});

rankingsRoute.get(API_ROUTES.rankings.adminItems, requireAdmin, async (context) => {
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const status = context.req.query("status");
  const result = await rankingsService.listAdminRatingTargets(
    currentUser,
    status === "pending" || status === "published" || status === "rejected" || status === "hidden"
      ? status
      : undefined
  );
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(adminRatingTargetsModerationResponseSchema.parse(result.payload));
});

rankingsRoute.post(API_ROUTES.rankings.create, requireAuth, async (context) => {
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = createRankingInputSchema.parse(await context.req.json());
  const result = await rankingsService.createRanking(currentUser, input);
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }
  if (result.kind !== "ok") {
    return context.json({ code: "INTERNAL_ERROR", message: "Failed to create ranking." }, 500);
  }

  return context.json(rankingResponseSchema.parse(result.payload));
});

rankingsRoute.put(API_ROUTES.rankings.update(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = updateRankingInputSchema.parse(await context.req.json());
  const result = await rankingsService.updateRanking(id, currentUser, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Ranking not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(rankingResponseSchema.parse(result.payload));
});

rankingsRoute.put(API_ROUTES.rankings.adminStatus(":id"), requireAdmin, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = updateRankingStatusInputSchema.parse(await context.req.json());
  const result = await rankingsService.updateRankingStatus(
    id,
    currentUser,
    input.status,
    input.rejectionReason ?? null
  );
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Ranking not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(rankingResponseSchema.parse(result.payload));
});

rankingsRoute.put(API_ROUTES.rankings.adminItemStatus(":id"), requireAdmin, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = updateRatingTargetStatusInputSchema.parse(await context.req.json());
  const result = await rankingsService.updateRatingTargetStatus(
    id,
    currentUser,
    input.status,
    input.rejectionReason ?? null
  );
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Ranking item not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(ratingTargetDetailResponseSchema.parse(result.payload));
});

rankingsRoute.get(API_ROUTES.rankings.adminRankingComments, requireAdmin, async (context) => {
  const status = context.req.query("status");
  const payload = await rankingsService.listAdminRankingComments(
    status === "pending" || status === "visible" || status === "hidden" ? status : undefined
  );
  return context.json(adminRankingCommentsResponseSchema.parse(payload));
});

rankingsRoute.put(API_ROUTES.rankings.adminRankingCommentDetail(":id"), requireAdmin, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const input = updateRankingCommentStatusInputSchema.parse(await context.req.json());
  const item = await rankingsService.updateRankingCommentStatus(id, input.status);
  if (!item) {
    return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  }

  return context.json(adminRankingCommentResponseSchema.parse({ item }));
});

rankingsRoute.get(API_ROUTES.rankings.adminRatingTargetComments, requireAdmin, async (context) => {
  const status = context.req.query("status");
  const payload = await rankingsService.listAdminRatingTargetComments(
    status === "pending" || status === "visible" || status === "hidden" ? status : undefined
  );
  return context.json(adminRatingTargetCommentsResponseSchema.parse(payload));
});

rankingsRoute.put(API_ROUTES.rankings.adminRatingTargetCommentDetail(":id"), requireAdmin, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const input = updateRatingTargetCommentStatusInputSchema.parse(await context.req.json());
  const item = await rankingsService.updateRatingTargetCommentStatus(id, input.status);
  if (!item) {
    return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  }

  return context.json(adminRatingTargetCommentResponseSchema.parse({ item }));
});

rankingsRoute.get(API_ROUTES.rankings.detail(":id"), async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const payload = await rankingsService.getRankingDetail(id, context.get("currentUser") ?? undefined);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Ranking not found." }, 404);
  }

  return context.json(rankingResponseSchema.parse(payload));
});

rankingsRoute.post(API_ROUTES.rankings.items(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = addRatingTargetInputSchema.parse(await context.req.json());
  const result = await rankingsService.addRatingTarget(id, currentUser, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Ranking not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(ratingTargetResponseSchema.parse(result.payload));
});

rankingsRoute.post(API_ROUTES.rankings.comments(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = createRankingCommentInputSchema.parse(await context.req.json());
  const payload = await rankingsService.createRankingComment(id, currentUser.id, input.content);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Ranking not found." }, 404);
  }

  return context.json(createRankingCommentResponseSchema.parse(payload));
});

rankingsRoute.get(API_ROUTES.rankings.itemDetail(":id"), async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const payload = await rankingsService.getRatingTargetDetail(id, context.get("currentUser") ?? undefined);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Ranking item not found." }, 404);
  }

  return context.json(ratingTargetDetailResponseSchema.parse(payload));
});

rankingsRoute.put(API_ROUTES.rankings.itemDetail(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = addRatingTargetInputSchema.parse(await context.req.json());
  const result = await rankingsService.updateRatingTarget(id, currentUser, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Ranking item not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(ratingTargetDetailResponseSchema.parse(result.payload));
});

rankingsRoute.delete(API_ROUTES.rankings.itemDetail(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const result = await rankingsService.deleteRatingTarget(id, currentUser);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Ranking item not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

rankingsRoute.post(API_ROUTES.rankings.report(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = reportContentInputSchema.parse(await context.req.json());
  const result = await rankingsService.reportRanking(id, currentUser, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Ranking not found." }, 404);
  }
  if (result.kind === "invalid_images") {
    return context.json({ code: "BAD_REQUEST", message: "Invalid report evidence images." }, 400);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

rankingsRoute.post(API_ROUTES.rankings.itemReport(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = reportContentInputSchema.parse(await context.req.json());
  const result = await rankingsService.reportRatingTarget(id, currentUser, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Ranking item not found." }, 404);
  }
  if (result.kind === "invalid_images") {
    return context.json({ code: "BAD_REQUEST", message: "Invalid report evidence images." }, 400);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

rankingsRoute.post(API_ROUTES.rankings.itemReview(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = submitRatingTargetReviewInputSchema.parse(await context.req.json());
  const payload = await rankingsService.submitRatingTargetReview(id, currentUser.id, input);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Ranking item not found." }, 404);
  }

  return context.json(submitRatingTargetReviewResponseSchema.parse(payload));
});

rankingsRoute.post(API_ROUTES.rankings.itemRatings(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = submitRatingTargetRatingInputSchema.parse(await context.req.json());
  const payload = await rankingsService.submitRatingTargetRating(id, currentUser.id, input.rating);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Ranking item not found." }, 404);
  }

  return context.json(submitRatingTargetRatingResponseSchema.parse(payload));
});

rankingsRoute.post(API_ROUTES.rankings.itemComments(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = createRatingTargetCommentInputSchema.parse(await context.req.json());
  const payload = await rankingsService.createRatingTargetComment(id, currentUser.id, input);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Ranking item not found." }, 404);
  }

  return context.json(createRatingTargetCommentResponseSchema.parse(payload));
});

rankingsRoute.put(
  API_ROUTES.rankings.itemCommentDetail(":itemId", ":commentId"),
  requireAuth,
  async (context) => {
    const itemId = context.req.param("itemId");
    const commentId = context.req.param("commentId");
    const currentUser = context.get("currentUser");
    if (!itemId || !commentId) {
      return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
    }
    if (!currentUser) {
      return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
    }

    const input = updateRatingTargetCommentInputSchema.parse(await context.req.json());
    const result = await rankingsService.updateRatingTargetComment(itemId, commentId, currentUser, input);
    if (result.kind === "not_found") {
      return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
    }
    if (result.kind === "forbidden") {
      return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
    }

    return context.json(createRatingTargetCommentResponseSchema.parse({ item: result.item }));
  }
);

rankingsRoute.delete(
  API_ROUTES.rankings.itemCommentDetail(":itemId", ":commentId"),
  requireAuth,
  async (context) => {
    const itemId = context.req.param("itemId");
    const commentId = context.req.param("commentId");
    const currentUser = context.get("currentUser");
    if (!itemId || !commentId) {
      return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
    }
    if (!currentUser) {
      return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
    }

    const result = await rankingsService.deleteRatingTargetComment(itemId, commentId, currentUser);
    if (result.kind === "not_found") {
      return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
    }
    if (result.kind === "forbidden") {
      return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
    }

    return context.json(actionSuccessResponseSchema.parse({ success: true }));
  }
);

rankingsRoute.post(
  API_ROUTES.rankings.itemCommentLike(":itemId", ":commentId"),
  requireAuth,
  async (context) => {
    const itemId = context.req.param("itemId");
    const commentId = context.req.param("commentId");
    const currentUser = context.get("currentUser");
    if (!itemId || !commentId) {
      return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
    }
    if (!currentUser) {
      return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
    }

    const result = await rankingsService.toggleRatingTargetCommentLike(itemId, commentId, currentUser);
    if (result.kind === "not_found") {
      return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
    }

    return context.json(actionSuccessResponseSchema.parse({ success: true }));
  }
);

rankingsRoute.post(
  API_ROUTES.rankings.itemCommentReport(":itemId", ":commentId"),
  requireAuth,
  async (context) => {
    const itemId = context.req.param("itemId");
    const commentId = context.req.param("commentId");
    const currentUser = context.get("currentUser");
    if (!itemId || !commentId) {
      return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
    }
    if (!currentUser) {
      return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
    }

    const input = reportContentInputSchema.parse(await context.req.json());
    const result = await rankingsService.reportRatingTargetComment(
      itemId,
      commentId,
      currentUser,
      input
    );
    if (result.kind === "not_found") {
      return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
    }
    if (result.kind === "invalid_images") {
      return context.json({ code: "BAD_REQUEST", message: "Invalid report evidence images." }, 400);
    }

    return context.json(actionSuccessResponseSchema.parse({ success: true }));
  }
);
