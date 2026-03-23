import {
  adminReviewResponseSchema,
  adminReviewsResponseSchema,
  modelReviewsResponseSchema,
  submitModelReviewInputSchema,
  submitModelReviewResponseSchema,
  updateReviewStatusInputSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  requireAuth,
  type AuthVariables
} from "../auth/auth.middleware";
import { reviewsService } from "./reviews.service";

export const reviewsRoute = new Hono<{ Variables: AuthVariables }>();

reviewsRoute.use("*", attachCurrentUser);

reviewsRoute.get(API_ROUTES.models.reviews(":slug"), async (context) => {
  const slug = context.req.param("slug");

  if (!slug) {
    return context.json({ code: "BAD_REQUEST", message: "Missing slug." }, 400);
  }

  const currentUser = context.get("currentUser");
  const payload = await reviewsService.listModelReviews(slug, currentUser?.id);

  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Model not found." }, 404);
  }

  return context.json(modelReviewsResponseSchema.parse(payload));
});

reviewsRoute.post(API_ROUTES.models.reviews(":slug"), requireAuth, async (context) => {
  const slug = context.req.param("slug");

  if (!slug) {
    return context.json({ code: "BAD_REQUEST", message: "Missing slug." }, 400);
  }

  const currentUser = context.get("currentUser");

  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = submitModelReviewInputSchema.parse(await context.req.json());
  const payload = await reviewsService.submitReview(slug, currentUser.id, input);

  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Model not found." }, 404);
  }

  return context.json(submitModelReviewResponseSchema.parse(payload));
});

reviewsRoute.get(API_ROUTES.models.adminReviews, requireAdmin, async (context) => {
  const payload = await reviewsService.listAdminReviews();
  return context.json(adminReviewsResponseSchema.parse(payload));
});

reviewsRoute.put(API_ROUTES.models.adminReviewDetail(":id"), requireAdmin, async (context) => {
  const id = context.req.param("id");

  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const input = updateReviewStatusInputSchema.parse(await context.req.json());
  const item = await reviewsService.updateReviewStatus(id, input.status);

  if (!item) {
    return context.json({ code: "NOT_FOUND", message: "Review not found." }, 404);
  }

  return context.json(adminReviewResponseSchema.parse({ item }));
});
