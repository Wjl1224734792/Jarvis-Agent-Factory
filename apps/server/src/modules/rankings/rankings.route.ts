import {
  addRankingItemInputSchema,
  createRankingCommentInputSchema,
  createRankingCommentResponseSchema,
  createRankingInputSchema,
  createRankingItemCommentInputSchema,
  createRankingItemCommentResponseSchema,
  rankingItemDetailResponseSchema,
  rankingItemResponseSchema,
  rankingResponseSchema,
  rankingsResponseSchema,
  submitRankingItemRatingInputSchema,
  submitRankingItemRatingResponseSchema,
  submitRankingItemReviewInputSchema,
  submitRankingItemReviewResponseSchema,
  updateRankingInputSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAuth,
  type AuthVariables
} from "../auth/auth.middleware";
import { rankingsService } from "./rankings.service";

export const rankingsRoute = new Hono<{ Variables: AuthVariables }>();

rankingsRoute.use("*", attachCurrentUser);

rankingsRoute.get(API_ROUTES.rankings.overview, async (context) => {
  const currentUser = context.get("currentUser");
  const payload = await rankingsService.listRankings(currentUser?.id);
  return context.json(rankingsResponseSchema.parse(payload));
});

rankingsRoute.post(API_ROUTES.rankings.create, requireAuth, async (context) => {
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = createRankingInputSchema.parse(await context.req.json());
  const payload = await rankingsService.createRanking(currentUser.id, input);
  if (!payload) {
    return context.json({ code: "INTERNAL_ERROR", message: "Failed to create ranking." }, 500);
  }

  return context.json(rankingResponseSchema.parse(payload));
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
  const result = await rankingsService.updateRanking(id, currentUser.id, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Ranking not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(rankingResponseSchema.parse(result.payload));
});

rankingsRoute.get(API_ROUTES.rankings.detail(":id"), async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const payload = await rankingsService.getRankingDetail(id, context.get("currentUser")?.id);
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

  const input = addRankingItemInputSchema.parse(await context.req.json());
  const result = await rankingsService.addRankingItem(id, currentUser.id, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Ranking not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(rankingItemResponseSchema.parse(result.payload));
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

  const payload = await rankingsService.getRankingItemDetail(id, context.get("currentUser")?.id);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Ranking item not found." }, 404);
  }

  return context.json(rankingItemDetailResponseSchema.parse(payload));
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

  const input = submitRankingItemReviewInputSchema.parse(await context.req.json());
  const payload = await rankingsService.submitRankingItemReview(id, currentUser.id, input);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Ranking item not found." }, 404);
  }

  return context.json(submitRankingItemReviewResponseSchema.parse(payload));
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

  const input = submitRankingItemRatingInputSchema.parse(await context.req.json());
  const payload = await rankingsService.submitRankingItemRating(id, currentUser.id, input.rating);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Ranking item not found." }, 404);
  }

  return context.json(submitRankingItemRatingResponseSchema.parse(payload));
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

  const input = createRankingItemCommentInputSchema.parse(await context.req.json());
  const payload = await rankingsService.createRankingItemComment(id, currentUser.id, input.content);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Ranking item not found." }, 404);
  }

  return context.json(createRankingItemCommentResponseSchema.parse(payload));
});
